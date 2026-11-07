//! Resolving a pending decision and writing the answer back into the specification.
//!
//! Split from the bundle loader when the file passed the 250-line limit (`GB-291`). Reading a specification
//! and editing one are different jobs with different failure modes: a read cannot corrupt the document.

use super::*;

pub(super) fn map_chalkline_decision(d: &DecisionHole) -> PendingDecision {
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
    let spec_path = resolve_doc(root_path, "SPEC.md");
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

fn epoch_now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
