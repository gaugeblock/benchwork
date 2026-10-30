//! Regression tests for benchwork reading the canonical telemetry outbox (`GB-209`).
//!
//! Three read sites pointed at `.rabbet/spool/outbox.jsonl`, a location nothing has written since the
//! outbox moved to `.gaugeblock/spool/outbox.jsonl`, and two of them also parsed the pre-`GB-182` bare
//! trace shape. The result was a panel that always said zero while the store held records.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use benchwork_core::capabilities::scan_capabilities;
use benchwork_core::hub_service::{delete_spool_trace, get_model_hub_status};
use joiner_core::gaugeblock_contracts::{
    AnonymizedSynthesisTrace, Language, SpoolEntry, TelemetryTier, VerificationReport,
};
use std::fs;
use std::path::Path;
use uuid::Uuid;

fn trace(trace_id: Uuid, task: &str) -> AnonymizedSynthesisTrace {
    AnonymizedSynthesisTrace {
        trace_id,
        language: Language::Rust,
        tier: TelemetryTier::Silver,
        selected_pattern_id: None,
        anonymized_scope_signature: format!("{task} · scope-level verification"),
        filled_holes: Vec::new(),
        rejected_attempt: None,
        verification: VerificationReport {
            ast_valid: true,
            typecheck_passed: true,
            tests_passed: Some(true),
            diagnostics: Vec::new(),
            duration_ms: 0,
        },
        task_key: Some(task.to_string()),
        head_commit_sha: Some("abc123".to_string()),
    }
}

/// Writes two envelope records where every writer puts them, and nothing at the legacy location.
fn seed(root: &Path) -> (Uuid, Uuid) {
    let outbox = root.join(".gaugeblock").join("spool").join("outbox.jsonl");
    fs::create_dir_all(outbox.parent().expect("parent")).expect("spool dir");
    let first = Uuid::from_u128(11);
    let second = Uuid::from_u128(22);
    let mut lines = String::new();
    for (id, key, ts) in [(first, "GB-209", 1_u64), (second, "GB-206", 2_u64)] {
        let entry = SpoolEntry::from_trace(trace(id, key), ts).expect("entry");
        lines.push_str(&serde_json::to_string(&entry).expect("line"));
        lines.push('\n');
    }
    fs::write(&outbox, lines).expect("seed");
    (first, second)
}

#[test]
fn test_the_hub_panel_reads_the_canonical_outbox() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path().to_path_buf();
    seed(&root);

    let status = get_model_hub_status(&root).expect("hub status");

    assert_eq!(
        status.spool_traces.len(),
        2,
        "both envelope records are read"
    );
    assert_eq!(
        status.spool_counts_by_tier.get("silver"),
        Some(&2),
        "tiers are counted from the envelope payload"
    );
    assert_eq!(status.spool_traces[0].task_key.as_deref(), Some("GB-209"));
}

#[test]
fn test_capabilities_counts_the_same_outbox() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path().to_path_buf();
    seed(&root);

    let capabilities = scan_capabilities(&root).expect("capabilities");
    assert_eq!(
        capabilities.pending_telemetry_count, 2,
        "the capability counter and the panel must agree (GB-209)"
    );
}

#[test]
fn test_deleting_by_trace_id_removes_one_envelope_and_keeps_the_rest() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path().to_path_buf();
    let (first, _second) = seed(&root);

    assert!(delete_spool_trace(&root, &first.to_string()).expect("delete"));

    let outbox = root.join(".gaugeblock").join("spool").join("outbox.jsonl");
    let remaining = fs::read_to_string(&outbox).expect("read");
    assert_eq!(remaining.lines().count(), 1, "one record removed");
    let survivor: SpoolEntry =
        serde_json::from_str(remaining.lines().next().expect("line")).expect("envelope");
    assert_eq!(survivor.trace.task_key.as_deref(), Some("GB-206"));
}

#[test]
fn test_deleting_an_unknown_id_is_a_no_op() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let root = tmp.path().to_path_buf();
    seed(&root);

    assert!(
        !delete_spool_trace(&root, &Uuid::from_u128(999).to_string()).expect("delete"),
        "nothing matches, nothing changes"
    );
    let outbox = root.join(".gaugeblock").join("spool").join("outbox.jsonl");
    assert_eq!(
        fs::read_to_string(&outbox).expect("read").lines().count(),
        2
    );
}
