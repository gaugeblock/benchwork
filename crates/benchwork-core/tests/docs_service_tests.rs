#![allow(clippy::unwrap_used)]

use benchwork_core::audit_docs;
use std::path::PathBuf;

#[test]
fn test_audit_docs_workspace() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..");
    let report = audit_docs(&root).unwrap();
    assert!(!report.items.is_empty(), "expected audited doc items");
}
