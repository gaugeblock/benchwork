//! Integration test for task archive and unarchive lifecycle in benchwork-core.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use tempfile::tempdir;
use uuid::Uuid;

use benchwork_core::model::*;
use benchwork_core::*;
use storypole_core::StorypoleConfig;
use storypole_core::model::events::LedgerEvent;
use storypole_core::model::task::{TaskKind, TaskNode, TaskScope, TaskStatus};
use storypole_core::store::StorypoleStore;

#[test]
fn test_task_archive_and_filtering() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let tmp = tempdir()?;
    let root = tmp.path();

    let mut store = StorypoleStore::init(
        root,
        StorypoleConfig {
            ticket_prefix: "TEST".to_string(),
            allowed_repos: vec![],
            allowed_crates: vec![],
            claim_ttl_minutes: 30,
            verification_commands: vec![],
        },
    )?;

    let task_id = Uuid::new_v4();
    let task = TaskNode {
        id: task_id,
        ticket_key: "TEST-1".to_string(),
        slug: "task-one".to_string(),
        title: "Task One".to_string(),
        description: "Test task".to_string(),
        kind: TaskKind::Feature,
        status: TaskStatus::Verified,
        priority: 1,
        scope: TaskScope::default(),
        edges: vec![],
        decisions: vec![],
        acceptance_criteria: vec![],
        plan: None,
        active_claim: None,
        latest_handoff: None,
        verification_receipt: Some(storypole_core::model::decision::VerificationReceipt {
            verifier: "miter".to_string(),
            command: "cargo test".to_string(),
            exit_code: Some(0),
            diagnostic_count: Some(0),
            summary: "passed".to_string(),
            verified_at_epoch_ms: 0,
            git_branch: None,
            base_commit_sha: None,
            head_commit_sha: None,
            commit_shas: vec![],
        }),
        created_at_epoch_ms: 0,
        updated_at_epoch_ms: 0,
    };
    store.record_event(&LedgerEvent::TaskCreated { task })?;
    drop(store);

    let query_default = DagQuery::default();
    let view = get_dag_view(root, &query_default)?;
    assert_eq!(view.nodes.len(), 1);
    assert_eq!(view.stats.verified, 1);
    assert_eq!(view.stats.archived, 0);

    archive_task_service(root, "TEST-1")?;

    let view_after_archive = get_dag_view(root, &query_default)?;
    assert_eq!(view_after_archive.nodes.len(), 0);

    let query_with_archived = DagQuery {
        include_archived: true,
        ..Default::default()
    };
    let view_with_archived = get_dag_view(root, &query_with_archived)?;
    assert_eq!(view_with_archived.nodes.len(), 1);
    assert_eq!(view_with_archived.stats.archived, 1);
    assert_eq!(view_with_archived.nodes[0].status, TaskStatus::Archived);

    unarchive_task_service(root, "TEST-1")?;
    let view_after_unarchive = get_dag_view(root, &query_default)?;
    assert_eq!(view_after_unarchive.nodes.len(), 1);
    assert_eq!(view_after_unarchive.stats.verified, 1);

    Ok(())
}
