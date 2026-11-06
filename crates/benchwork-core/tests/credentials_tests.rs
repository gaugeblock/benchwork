//! Credential resolution and persistence (`GB-189`).
//!
//! These pin the behaviour that moved when the dotenv reader and the `.gaugeblock` join were replaced
//! by `gaugeblock-workspace`: the file lives at the canonical path, quotes are stripped, a set-but-empty
//! value is not a credential, and a write merges rather than replaces.
//!
//! Process-environment precedence is deliberately not tested here: `std::env::set_var` is unsafe in
//! edition 2024 and `unsafe_code` is denied workspace-wide, so the tests use keys that are certainly
//! absent from the environment and exercise the file path.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::fs;

use benchwork_core::credentials::{persist_credential, resolve_credential};
use tempfile::TempDir;

fn write_env(root: &std::path::Path, body: &str) {
    let dir = root.join(".gaugeblock");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join(".env"), body).unwrap();
}

#[test]
fn resolve_credential_reads_the_canonical_env_file() {
    let temp = TempDir::new().unwrap();
    write_env(temp.path(), "GAUGEBLOCK_TEST_ALPHA=secret-value\n");

    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_ALPHA").as_deref(),
        Some("secret-value")
    );
}

#[test]
fn resolve_credential_strips_surrounding_quotes() {
    let temp = TempDir::new().unwrap();
    write_env(
        temp.path(),
        "GAUGEBLOCK_TEST_QUOTED=\"double\"\nGAUGEBLOCK_TEST_SINGLE='single'\n",
    );

    // persist_credential writes quoted values, so the reader has to strip them or a value written by
    // benchwork would come back with its quotes attached.
    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_QUOTED").as_deref(),
        Some("double")
    );
    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_SINGLE").as_deref(),
        Some("single")
    );
}

#[test]
fn resolve_credential_treats_empty_as_absent() {
    let temp = TempDir::new().unwrap();
    write_env(
        temp.path(),
        "GAUGEBLOCK_TEST_EMPTY=\nGAUGEBLOCK_TEST_BLANK=\"\"\n",
    );

    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_EMPTY"),
        None
    );
    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_BLANK"),
        None
    );
}

#[test]
fn resolve_credential_ignores_comments_and_unknown_keys() {
    let temp = TempDir::new().unwrap();
    write_env(
        temp.path(),
        "# a comment = with an equals sign\nGAUGEBLOCK_TEST_PRESENT=yes\n",
    );

    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_PRESENT").as_deref(),
        Some("yes")
    );
    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_MISSING"),
        None
    );
}

#[test]
fn resolve_credential_is_none_when_no_env_file_exists() {
    let temp = TempDir::new().unwrap();
    assert_eq!(resolve_credential(temp.path(), "GAUGEBLOCK_TEST_ANY"), None);
}

#[test]
fn persist_credential_writes_the_canonical_path_and_round_trips() {
    let temp = TempDir::new().unwrap();

    persist_credential(temp.path(), "GAUGEBLOCK_TEST_WRITTEN", "written-value").unwrap();

    let env_path = temp.path().join(".gaugeblock").join(".env");
    assert!(
        env_path.is_file(),
        "the credential must land in .gaugeblock/.env"
    );
    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_WRITTEN").as_deref(),
        Some("written-value"),
        "a value written with quotes must read back without them"
    );
}

#[test]
fn persist_credential_merges_rather_than_replaces() {
    let temp = TempDir::new().unwrap();
    write_env(temp.path(), "GAUGEBLOCK_TEST_EXISTING=kept\n");

    persist_credential(temp.path(), "GAUGEBLOCK_TEST_NEW", "added").unwrap();

    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_EXISTING").as_deref(),
        Some("kept")
    );
    assert_eq!(
        resolve_credential(temp.path(), "GAUGEBLOCK_TEST_NEW").as_deref(),
        Some("added")
    );
}

#[test]
fn persist_credential_ignores_an_empty_key_or_value() {
    let temp = TempDir::new().unwrap();

    persist_credential(temp.path(), "", "value").unwrap();
    persist_credential(temp.path(), "GAUGEBLOCK_TEST_KEY", "  ").unwrap();

    assert!(!temp.path().join(".gaugeblock").join(".env").exists());
}
