//! Unit tests for migration discovery, consolidation, and execution.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use super::*;
use std::fs;
use tempfile::tempdir;

#[test]
fn test_discover_and_execute_migration() {
    let dir = tempdir().expect("tempdir");
    let root = dir.path();

    // Create mock legacy state: .storypole, sawhorse.toml
    let legacy_storypole = root.join(".storypole");
    fs::create_dir_all(&legacy_storypole).expect("create .storypole");
    fs::write(
        legacy_storypole.join("config.toml"),
        "task_prefix = \"GB\"\n",
    )
    .expect("write storypole config");
    fs::write(legacy_storypole.join("ledger.jsonl"), "{}\n").expect("write ledger");

    fs::write(
        root.join("sawhorse.toml"),
        "[default_model]\nprovider = \"openai\"\nmodel_name = \"gpt-4o\"\n",
    )
    .expect("write sawhorse.toml");

    // 1. Discovery
    let plan = discover_migration(root).expect("discover");
    assert!(plan.has_legacy_items);
    assert_eq!(plan.items.len(), 2);
    assert!(plan.consolidated_config_preview.is_some());

    let preview = plan.consolidated_config_preview.as_ref().unwrap();
    assert!(preview.contains("[storypole]"));
    assert!(preview.contains("[sawhorse"));

    // 2. Dry run
    let dry_receipt = execute_migration(&plan, true, false).expect("dry run");
    assert_eq!(dry_receipt.migrated_count, 2);
    assert!(legacy_storypole.exists());
    assert!(!root.join(".gaugeblock").join("storypole").exists());

    // 3. Execution
    let receipt = execute_migration(&plan, false, false).expect("execute");
    assert_eq!(receipt.migrated_count, 2);
    assert!(!legacy_storypole.exists());
    assert!(root.join(".gaugeblock").join("storypole").is_dir());
    assert!(root.join(".gaugeblock").join("storypole").join("ledger.jsonl").is_file());
    assert!(root.join(".gaugeblock").join("config.toml").is_file());
    assert!(root.join(".gaugeblock").join(".gitignore").is_file());
}

