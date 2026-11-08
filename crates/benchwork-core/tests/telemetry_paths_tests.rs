//! Telemetry is suite-wide, and the suite is several repositories (`GB-293`, `GB-305`).
//!
//! The daemon resolved one path from its own working directory, so it tailed the suite root's log. Nothing
//! writes there: a tool writes into the `.gaugeblock` of the repository it ran in. The panel showed nothing,
//! and with a single repository in scope that behaviour is indistinguishable from correct.

//! multi-repo: two repositories in scope, which is the only way to see cross-repository behaviour.
#![allow(clippy::unwrap_used, clippy::expect_used)]

use benchwork_core::telemetry_paths::telemetry_event_paths;
use std::fs;
use std::path::Path;
use std::process::Command;
use tempfile::tempdir;

/// Makes `path` a git repository, which is what the topology looks for.
fn git_init(path: &Path) {
    fs::create_dir_all(path).expect("create dir");
    let output = Command::new("git")
        .args(["init", "-b", "main"])
        .current_dir(path)
        .output()
        .expect("git spawns");
    assert!(
        output.status.success(),
        "git init failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn every_member_repository_contributes_its_own_log() {
    let tmp = tempdir().expect("tempdir");
    let root = tmp.path();
    git_init(root);

    // Two members, each with a span of its own - the shape the defect needed.
    for member in ["alpha", "beta"] {
        let repo = root.join(member);
        git_init(&repo);
        let telemetry = repo.join(".gaugeblock").join("telemetry");
        fs::create_dir_all(&telemetry).expect("create telemetry dir");
        fs::write(telemetry.join("events.jsonl"), "{\n}").expect("write a span");
    }

    let paths = telemetry_event_paths(root);

    assert!(
        paths.iter().any(|path| path.starts_with(root.join("alpha"))),
        "alpha's log must be read: {paths:?}"
    );
    assert!(
        paths.iter().any(|path| path.starts_with(root.join("beta"))),
        "beta's log must be read: {paths:?}"
    );
    assert!(
        paths.iter().any(|path| path.starts_with(root.join(".gaugeblock"))),
        "the suite root's own log stays in the set: tools run from the root would write there"
    );
}

#[test]
fn a_member_without_telemetry_still_appears_in_the_set() {
    let tmp = tempdir().expect("tempdir");
    let root = tmp.path();
    git_init(root);
    git_init(&root.join("gamma"));

    let paths = telemetry_event_paths(root);

    // Present but empty is different from absent: a caller can report "no spans yet from gamma" only if it
    // knows gamma is supposed to have a log.
    assert!(
        paths.iter().any(|path| path.starts_with(root.join("gamma"))),
        "gamma is a member and must be in the set: {paths:?}"
    );
}
