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
