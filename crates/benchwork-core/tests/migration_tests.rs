//! Consolidation of legacy config files into `.gaugeblock/config.toml` (`GB-256`).
//!
//! The regression these pin: `docs.toml` already has `docs` at its root, so inserting the whole file
//! under the key "docs" produced `[docs.docs.readme]`. Every reader looking for `[docs.readme]` found
//! nothing and fell back to defaults, silently, while the audit still passed on the legacy file.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::fs;

use benchwork_core::migration::consolidator::consolidate_configs;
use tempfile::TempDir;

fn write(root: &std::path::Path, name: &str, body: &str) {
    let path = root.join(name);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, body).unwrap();
}

#[test]
fn docs_tables_keep_the_depth_they_declared() {
    let temp = TempDir::new().unwrap();
    write(
        temp.path(),
        ".gaugeblock/config.toml",
        "[storypole]\nclaim_ttl_minutes = 60\n",
    );
    write(
        temp.path(),
        ".gaugeblock/docs.toml",
        "[docs.readme]\npath = \"README.md\"\nrequired = true\n\n[policies]\nenforce_file_loc_limits = true\n",
    );

    let merged = consolidate_configs(temp.path()).unwrap();
    let parsed: toml::Table = merged.parse().unwrap();

    let docs = parsed.get("docs").expect("a docs table must exist");
    assert!(
        docs.get("readme").is_some(),
        "docs.readme must survive at its declared depth, not one level deeper"
    );
    assert!(
        docs.get("docs").is_none(),
        "the docs table must not be nested under itself"
    );
    assert!(
        parsed.get("policies").is_some(),
        "policies is a top-level table in the source and must stay top-level"
    );
    assert!(
        parsed.get("storypole").is_some(),
        "sections already in config.toml must survive"
    );
}

#[test]
fn an_existing_value_is_never_overwritten() {
    let temp = TempDir::new().unwrap();
    write(
        temp.path(),
        ".gaugeblock/config.toml",
        "[docs.readme]\npath = \"README.md\"\nrequired = true\n",
    );
    write(
        temp.path(),
        ".gaugeblock/docs.toml",
        "[docs.readme]\npath = \"CHANGED.md\"\n",
    );

    let merged = consolidate_configs(temp.path()).unwrap();
    let parsed: toml::Table = merged.parse().unwrap();

    assert_eq!(
        parsed["docs"]["readme"]["path"].as_str(),
        Some("README.md"),
        "a hand-curated value wins over the legacy file"
    );
}

#[test]
fn a_tool_local_file_is_still_namespaced_under_its_tool() {
    // sawhorse.toml is a tool-local document whose root is provider/role tables, so it is nested under
    // `[sawhorse]` on purpose - that is where sawhorse reads it from. Only docs.toml is already
    // shaped like part of the suite document.
    let temp = TempDir::new().unwrap();
    write(temp.path(), ".gaugeblock/config.toml", "[storypole]\n");
    write(
        temp.path(),
        "sawhorse.toml",
        "[timeouts]\nconnect_ms = 10\n",
    );

    let merged = consolidate_configs(temp.path()).unwrap();
    let parsed: toml::Table = merged.parse().unwrap();

    assert_eq!(
        parsed["sawhorse"]["timeouts"]["connect_ms"].as_integer(),
        Some(10)
    );
}
