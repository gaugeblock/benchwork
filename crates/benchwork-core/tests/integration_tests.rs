//! Integration tests for `benchwork-core`.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::fs;
use tempfile::tempdir;

use batten_core::GrammarFormat;
use benchwork_core::model::*;
use benchwork_core::*;
use chalkline_core::{ContractField, SharedTypeContract};
use storypole_core::StorypoleConfig;
use storypole_core::model::events::LedgerEvent;
use storypole_core::model::task::{TaskKind, TaskNode, TaskScope, TaskStatus};
use storypole_core::store::StorypoleStore;
use uuid::Uuid;

#[test]
fn test_capabilities_scanner() {
    let tmp = tempdir().expect("tempdir");
    let root = tmp.path();

    // Create SPEC.md
    fs::write(root.join("SPEC.md"), "# Test Spec\n").expect("write spec");

    // Init Storypole
    let store = StorypoleStore::init(
        root,
        StorypoleConfig {
            ticket_prefix: "TEST".to_string(),
            allowed_repos: vec![],
            allowed_crates: vec![],
            claim_ttl_minutes: 30,
            verification_commands: vec![],
        },
    )
    .expect("init store");
    drop(store);

    let caps = scan_capabilities(root).expect("scan capabilities");
    assert!(caps.spec_docs.primary_spec_present);
    assert_eq!(caps.spec_docs.detected_files, vec!["SPEC.md"]);
    assert!(caps.storypole_active);
    assert!(caps.dado_patterns_count > 0);
}

#[tokio::test]
async fn test_spec_studio_and_decision_resolution() {
    let tmp = tempdir().expect("tempdir");
    let root = tmp.path();

    fs::write(
        root.join("SPEC.md"),
        "# System Specification\n\nSome overview.\n",
    )
    .expect("write spec");

    let mut store = StorypoleStore::init(
        root,
        StorypoleConfig {
            ticket_prefix: "TEST".to_string(),
            allowed_repos: vec![],
            allowed_crates: vec![],
            claim_ttl_minutes: 30,
            verification_commands: vec![],
        },
    )
    .expect("init store");

    let task_id = Uuid::new_v4();
    let dec_id = Uuid::new_v4();
    let task = TaskNode {
        id: task_id,
        ticket_key: "TEST-1".to_string(),
        slug: "test-task".to_string(),
        title: "Test task".to_string(),
        description: "Task description".to_string(),
        kind: TaskKind::Feature,
        status: TaskStatus::Ready,
        priority: 1,
        scope: TaskScope {
            repo: Some("gaugeblock".to_string()),
            crate_name: Some("test-core".to_string()),
            module_path: None,
            target_files: vec![],
            target_symbols: vec![],
            labels: vec![],
        },
        edges: vec![],
        decisions: vec![storypole_core::model::decision::TaskDecision {
            decision_id: dec_id,
            parent_decision_id: None,
            status: storypole_core::model::decision::DecisionStatus::Pending,
            category: "architecture".to_string(),
            question: "Choose protocol?".to_string(),
            proposed_options: vec!["REST".to_string(), "gRPC".to_string()],
            chosen_option: None,
            rationale: None,
            resolved_by: None,
            updated_at_epoch_ms: 0,
        }],
        acceptance_criteria: vec![],
        active_claim: None,
        latest_handoff: None,
        verification_receipt: None,
        created_at_epoch_ms: 0,
        updated_at_epoch_ms: 0,
    };

    store
        .record_event(&LedgerEvent::TaskCreated { task })
        .expect("create task");
    drop(store);

    let bundle = load_spec_bundle(root).expect("load spec bundle");
    assert_eq!(bundle.pending_decisions.len(), 1);
    assert_eq!(bundle.pending_decisions[0].decision_id, dec_id.to_string());

    let resolve_req = ResolveDecisionRequest {
        task_id: Some(task_id.to_string()),
        decision_id: dec_id.to_string(),
        chosen_option: "REST".to_string(),
        rationale: "Simple and robust".to_string(),
        spawn_followup: true,
    };

    let receipt = resolve_decision(root, &resolve_req).expect("resolve decision");
    assert!(receipt.applied_to_storypole);
    assert!(receipt.applied_to_spec);
    assert!(receipt.spawned_task_id.is_some());

    let updated_spec = fs::read_to_string(root.join("SPEC.md")).expect("read spec");
    assert!(updated_spec.contains("## Architectural Decisions Log"));
    assert!(updated_spec.contains("Chosen Option:** REST"));
}

#[test]
fn test_polyglot_contract_preview() {
    let contract = SharedTypeContract {
        name: "UserSession".to_string(),
        fields: vec![
            ContractField {
                name: "session_id".to_string(),
                canonical_type: "uuid".to_string(),
                required: true,
            },
            ContractField {
                name: "username".to_string(),
                canonical_type: "string".to_string(),
                required: true,
            },
        ],
    };

    let preview = preview_contract(&ContractPreviewRequest { contract }).expect("preview");
    assert!(preview.rust_code.contains("pub struct UserSession"));
    assert!(
        preview
            .typescript_code
            .contains("export interface UserSession")
    );
    assert!(preview.zod_code.contains("export const UserSessionSchema"));
}

#[tokio::test]
async fn test_xray_pattern_and_grammar_compilation() {
    let tmp = tempdir().expect("tempdir");
    let root = tmp.path();

    let patterns = list_patterns(root).expect("list patterns");
    assert!(!patterns.is_empty());

    let pat = &patterns[0];
    assert!(!pat.holes.is_empty());

    let compile_req = HoleCompileRequest {
        pattern_id: pat.pattern_id.clone(),
        hole_id: pat.holes[0].hole_id.clone(),
        format: GrammarFormat::Gbnf,
    };

    let res = compile_hole_grammar(root, &compile_req).expect("compile hole");
    assert!(!res.grammar_definition.is_empty());
    assert!(!res.allowed_identifiers.is_empty());
}
