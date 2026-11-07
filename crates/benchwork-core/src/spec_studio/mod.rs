//! Specification studio, decision resolution, and contract preview services.

use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use chalkline_core::{DecisionHole, SpecParser};
use storypole_core::StorypoleStore;
use storypole_core::index::query::{get_all_tasks, resolve_task_id};
use storypole_core::model::decision::TaskDecision;
use storypole_core::ops::decisions::decide;
use uuid::Uuid;

use crate::error::{BenchworkError, Result};
use crate::model::{
    DecisionResolutionReceipt, PendingDecision, ResolveDecisionRequest, SpecBundle,
};
pub use crate::spec_preview::preview_contract;

/// Resolves a document that may sit at the repository root or under `docs/` (`GB-275`).
///
/// Six of the nine documents moved into `docs/`; README, CHANGELOG and AGENTS stayed at the root. Checking
/// both is deliberate rather than reading `.gaugeblock/docs.toml`: benchwork has to work in a repository with
/// no configuration yet, and a wrong guess here degrades to "not found" rather than to an error - which is
/// exactly how this broke silently when the documents moved.
pub(crate) fn resolve_doc(root: &Path, name: &str) -> PathBuf {
    let at_root = root.join(name);
    if at_root.is_file() {
        return at_root;
    }
    let in_docs = root.join("docs").join(name);
    if in_docs.is_file() {
        return in_docs;
    }
    at_root
}

/// Candidate supporting document filenames.
const SUPPORTING_CANDIDATES: &[&str] = &[
    "README.md",
    "CONTRACTS.md",
    "PRODUCT.md",
    "ARCHITECTURE.md",
    "DESIGN.md",
    "ROADMAP.md",
    "CHANGELOG.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
];

/// Loads the specification bundle, including primary spec, supporting docs, decisions, and contracts.
pub fn load_spec_bundle(root_path: &Path) -> Result<SpecBundle> {
    let spec_path = resolve_doc(root_path, "SPEC.md");
    let primary_spec = if spec_path.is_file() {
        fs::read_to_string(&spec_path).ok()
    } else {
        None
    };

    let supporting_docs = collect_supporting_docs(root_path);

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

fn collect_supporting_docs(root_path: &Path) -> BTreeMap<String, String> {
    let mut docs = BTreeMap::new();
    for name in SUPPORTING_CANDIDATES {
        let p = resolve_doc(root_path, name);
        if p.is_file()
            && let Ok(content) = fs::read_to_string(&p)
        {
            docs.insert((*name).to_string(), content);
        }
    }
    if let Ok(entries) = fs::read_dir(root_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file()
                && path.extension().and_then(|e| e.to_str()) == Some("md")
                && let Some(file_name) = path.file_name().and_then(|n| n.to_str())
                && file_name != "SPEC.md"
                && !docs.contains_key(file_name)
                && let Ok(content) = fs::read_to_string(&path)
            {
                docs.insert(file_name.to_string(), content);
            }
        }
    }
    docs
}

mod decisions;
use decisions::map_chalkline_decision;
pub use decisions::resolve_decision;
