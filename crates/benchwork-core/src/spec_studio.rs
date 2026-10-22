//! Specification studio, decision resolution, and contract preview services.

use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use chalkline_core::{DecisionHole, SpecParser};
use dado_core::polyglot::{generate_rust_struct, generate_ts_interface, generate_zod_schema};
use storypole_core::StorypoleStore;
use storypole_core::index::query::{get_all_tasks, resolve_task_id};
use storypole_core::model::decision::TaskDecision;
use storypole_core::ops::decisions::decide;
use uuid::Uuid;

use crate::error::{BenchworkError, Result};
use crate::model::{
    ContractPreviewRequest, ContractPreviewResponse, DecisionResolutionReceipt, PendingDecision,
    ResolveDecisionRequest, SpecBundle,
};

/// Candidate supporting document filenames.
const SUPPORTING_CANDIDATES: &[&str] = &["PRODUCT.md", "ARCHITECTURE.md", "DESIGN.md"];

/// Loads the specification bundle, including primary spec, supporting docs, decisions, and contracts.
pub fn load_spec_bundle(root_path: &Path) -> Result<SpecBundle> {
    let spec_path = root_path.join("SPEC.md");
    let primary_spec = if spec_path.is_file() {
        fs::read_to_string(&spec_path).ok()
    } else {
        None
    };

    let mut supporting_docs = BTreeMap::new();
    for name in SUPPORTING_CANDIDATES {
        let path = root_path.join(name);
        if path.is_file()
            && let Ok(content) = fs::read_to_string(&path)
        {
            supporting_docs.insert((*name).to_string(), content);
        }
    }

    let mut contracts = Vec::new();
    let mut pending_decisions = Vec::new();
    let parser = SpecParser::new();

    if let Some(ref content) = primary_spec
        && let Ok(doc) = parser.parse_str("SPEC.md", content)
    {
        contracts.extend(doc.contracts);
        for d in doc.decisions {
            if !d.is_resolved() {
                pending_decisions.push(map_chalkline_decision(&d));
            }
        }
    }

    for (name, content) in &supporting_docs {
        if let Ok(doc) = parser.parse_str(name, content) {
            for c in doc.contracts {
                if !contracts.iter().any(|existing| existing.name == c.name) {
                    contracts.push(c);
                }
            }
            for d in doc.decisions {
                if !d.is_resolved()
                    && !pending_decisions
                        .iter()
                        .any(|p| p.decision_id == d.id.to_string())
                {
                    pending_decisions.push(map_chalkline_decision(&d));
                }
            }
        }
    }

    // Load pending decisions from storypole if available
    if let Ok(store) = StorypoleStore::open(root_path)
        && let Ok(tasks) = get_all_tasks(store.conn())
    {
        for task in tasks.values() {
            for dec in &task.decisions {
                if dec.chosen_option.is_none() {
                    let id_str = dec.decision_id.to_string();
                    if !pending_decisions.iter().any(|p| p.decision_id == id_str) {
                        pending_decisions.push(PendingDecision {
                            task_id: Some(task.id.to_string()),
                            decision_id: id_str,
                            prompt: dec.question.clone(),
                            options: dec.proposed_options.clone(),
                            rationale: dec.rationale.clone(),
                            source: "storypole".to_string(),
                        });
                    }
                }
            }
        }
    }

    Ok(SpecBundle {
        primary_spec,
        supporting_docs,
        pending_decisions,
        contracts,
    })
}

fn map_chalkline_decision(d: &DecisionHole) -> PendingDecision {
    PendingDecision {
        task_id: None,
        decision_id: d.id.to_string(),
        prompt: d.question.clone(),
        options: d.options.iter().map(|o| o.label.clone()).collect(),
        rationale: None,
        source: "spec".to_string(),
    }
}

/// Resolves a decision and persists to Storypole and SPEC.md.
pub fn resolve_decision(
    root_path: &Path,
    req: &ResolveDecisionRequest,
) -> Result<DecisionResolutionReceipt> {
    let mut applied_to_storypole = false;
    let mut spawned_task_id = None;

    let dec_uuid = Uuid::parse_str(&req.decision_id)
        .map_err(|e| BenchworkError::InvalidRequest(format!("Invalid decision UUID: {e}")))?;

    if let Ok(mut store) = StorypoleStore::open(root_path) {
        let target_task_id = if let Some(ref t_id) = req.task_id {
            resolve_task_id(store.conn(), t_id).ok()
        } else {
            // Find task that owns this decision
            if let Ok(tasks) = get_all_tasks(store.conn()) {
                tasks
                    .values()
                    .find(|t| t.decisions.iter().any(|d| d.decision_id == dec_uuid))
                    .map(|t| t.id)
            } else {
                None
            }
        };

        if let Some(task_id) = target_task_id {
            let followup = if req.spawn_followup {
                let f_id = Uuid::new_v4();
                spawned_task_id = Some(f_id.to_string());
                Some(TaskDecision {
                    decision_id: f_id,
                    parent_decision_id: Some(dec_uuid),
                    status: storypole_core::model::decision::DecisionStatus::Pending,
                    category: "followup".to_string(),
                    question: format!("Follow-up investigation from decision {}", req.decision_id),
                    proposed_options: vec!["Accept".to_string(), "Modify".to_string()],
                    chosen_option: None,
                    rationale: None,
                    resolved_by: None,
                    updated_at_epoch_ms: epoch_now(),
                })
            } else {
                None
            };

            decide(
                &mut store,
                task_id,
                dec_uuid,
                req.chosen_option.clone(),
                req.rationale.clone(),
                "benchwork-agent".to_string(),
                followup,
                None,
            )
            .map_err(|e| BenchworkError::Storypole(e.to_string()))?;
            applied_to_storypole = true;
        }
    }

    let applied_to_spec = append_decision_to_spec(root_path, req)?;

    Ok(DecisionResolutionReceipt {
        decision_id: req.decision_id.clone(),
        applied_to_storypole,
        applied_to_spec,
        spawned_task_id,
    })
}

fn append_decision_to_spec(root_path: &Path, req: &ResolveDecisionRequest) -> Result<bool> {
    let spec_path = root_path.join("SPEC.md");
    if !spec_path.exists() {
        return Ok(false);
    }

    let timestamp = epoch_now();
    let entry = format!(
        "\n\n### Decision: {}\n- **Chosen Option:** {}\n- **Rationale:** {}\n- **Timestamp:** {}\n",
        req.decision_id, req.chosen_option, req.rationale, timestamp
    );

    let content = fs::read_to_string(&spec_path)?;
    let mut file = OpenOptions::new().append(true).open(&spec_path)?;

    if !content.contains("## Architectural Decisions Log") {
        file.write_all(b"\n\n## Architectural Decisions Log")?;
    }
    file.write_all(entry.as_bytes())?;
    Ok(true)
}

/// Generates polyglot code previews from a `SharedTypeContract`.
pub fn preview_contract(req: &ContractPreviewRequest) -> Result<ContractPreviewResponse> {
    let rust_code = generate_rust_struct(&req.contract);
    let typescript_code = generate_ts_interface(&req.contract);
    let zod_code = generate_zod_schema(&req.contract);

    Ok(ContractPreviewResponse {
        rust_code,
        typescript_code,
        zod_code,
    })
}

fn epoch_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
