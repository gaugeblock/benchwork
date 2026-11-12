//! multi-repo: a declared suite with two members, and both fleet resolutions asked from inside one of them.
//!
//! `benchwork` held two instances of one defect, and neither could fail with a single repository in scope.
//!
//! * The daemon resolved its telemetry log through `GaugeblockPaths::discover`, which reports the checkout it
//!   runs in. Telemetry centralises at the suite root (`GB-338`), so a daemon started inside a member tailed a
//!   file nothing writes - the panel said "nothing yet" while the suite log filled.
//! * `tidy --workspace` discovered members of the directory it was launched in, so from a member it walked
//!   that member's target/ and worktrees, found no repositories, and exited zero.
//!
//! Both are the same premise - "the workspace is the repository I was launched in" - and both are invisible
//! unless two repositories are in scope at once.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::fs;
use std::path::{Path, PathBuf};

use benchwork_cli::daemon::routes_telemetry::events_path_in;
use benchwork_cli::fleet::fleet_root;

/// Both sides canonicalised: the resolvers canonicalise before walking ancestors, the target files do not
/// exist, and on macOS a tempdir is reached through the `/var` symlink.
fn canon(path: PathBuf) -> PathBuf {
    match (path.parent(), path.file_name()) {
        (Some(parent), Some(name)) => match std::fs::canonicalize(parent) {
            Ok(dir) => dir.join(name),
            Err(_) => path,
        },
        _ => path,
    }
}

/// A member checkout. A real `git init` rather than a `.git` marker directory, because the lone-repository
/// fallback resolves through the git common dir and a marker is not a checkout.
fn member(root: &Path, name: &str) -> PathBuf {
    let dir = root.join(name);
    fs::create_dir_all(dir.join(".gaugeblock").join("telemetry")).expect("member telemetry dir");
    let output = std::process::Command::new("git")
        .args(["init", "--quiet"])
        .current_dir(&dir)
        .output()
        .expect("git spawns");
    assert!(
        output.status.success(),
        "git init failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    dir
}

fn suite(members: &[&str]) -> tempfile::TempDir {
    let root = tempfile::tempdir().expect("tempdir");
    fs::create_dir_all(root.path().join(".gaugeblock").join("telemetry")).expect("suite telemetry");
    let declared: Vec<String> = members.iter().map(|name| format!("\"{name}\"")).collect();
    fs::write(
        root.path().join(".gaugeblock").join("config.toml"),
        format!("[suite]\nmembers = [{}]\n", declared.join(", ")),
    )
    .expect("suite declaration");
    for name in members {
        member(root.path(), name);
    }
    root
}

#[test]
fn the_daemon_tails_the_suite_log_from_a_member() {
    let root = suite(&["alpha", "beta"]);
    let alpha = root.path().join("alpha");

    let suite_log = root
        .path()
        .join(".gaugeblock")
        .join("telemetry")
        .join("events.jsonl");
    assert_eq!(
        canon(events_path_in(&alpha)),
        canon(suite_log),
        "a daemon started in a member must tail the suite's telemetry, which is where spans are written"
    );
    assert_ne!(
        canon(events_path_in(&alpha)),
        canon(
            alpha
                .join(".gaugeblock")
                .join("telemetry")
                .join("events.jsonl")
        ),
        "the member's own log is empty by design, so tailing it is the bug this test exists for"
    );
}

#[test]
fn a_fleet_command_walks_the_suite_from_a_member() {
    let root = suite(&["alpha", "beta"]);
    let alpha = root.path().join("alpha");
    assert_eq!(
        canon(fleet_root(&alpha)),
        canon(root.path().to_path_buf()),
        "launched in a member, --workspace must walk the suite rather than the member's children"
    );
}

#[test]
fn a_repository_with_no_suite_is_its_own_fleet_and_its_own_log() {
    let lone = tempfile::tempdir().expect("tempdir");
    let repo = member(lone.path(), "solo");
    assert_eq!(
        canon(fleet_root(&repo)),
        canon(repo.clone()),
        "nothing to widen to: a lone repository is a fleet of one"
    );
    assert_eq!(
        canon(events_path_in(&repo)),
        canon(
            repo.join(".gaugeblock")
                .join("telemetry")
                .join("events.jsonl")
        ),
        "and it records and tails its own log"
    );
}
