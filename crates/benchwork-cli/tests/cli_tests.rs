//! CLI and daemon integration tests for `benchwork-cli`.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::fs;
use std::path::PathBuf;
use tempfile::tempdir;

use benchwork_core::model::WorkspaceCapabilities;
use benchwork_core::scan_capabilities;

#[test]
fn test_cli_capabilities_and_snapshot() {
    let tmp = tempdir().expect("tempdir");
    let root = tmp.path();

    fs::write(root.join("SPEC.md"), "# System Spec\n").expect("write spec");

    let caps: WorkspaceCapabilities = scan_capabilities(root).expect("scan capabilities");
    assert!(caps.spec_docs.primary_spec_present);
    assert_eq!(caps.spec_docs.detected_files, vec!["SPEC.md"]);
}

#[tokio::test]
async fn test_daemon_client_endpoint_mock() {
    let tmp = tempdir().expect("tempdir");
    let root: PathBuf = tmp.path().to_path_buf();
    fs::write(root.join("SPEC.md"), "# Spec\n").expect("write spec");

    let state = benchwork_core::BenchworkState::new(root);
    let snap = state.snapshot().expect("snapshot");
    assert!(snap.capabilities.spec_docs.primary_spec_present);
}

#[test]
fn test_cli_migration_flow() {
    let tmp = tempdir().expect("tempdir");
    let root = tmp.path();

    fs::create_dir_all(root.join(".storypole")).expect("create .storypole");
    fs::write(root.join(".storypole").join("ledger.jsonl"), "{}\n").expect("write ledger");

    let plan = benchwork_core::discover_migration(root).expect("discover");
    assert!(plan.has_legacy_items);
    assert_eq!(plan.items.len(), 1);

    let receipt = benchwork_core::execute_migration(&plan, false, false).expect("migrate");
    assert_eq!(receipt.migrated_count, 1);
    assert!(root.join(".gaugeblock").join("storypole").exists());
}
