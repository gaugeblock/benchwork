//! Where the suite's telemetry lives: one log per repository (`GB-293`).
//!
//! The flight recorder writes into the canonical `.gaugeblock` of whichever repository the tool ran in, so a
//! suite of twelve repositories has twelve logs. The daemon used to resolve a single path from its own working
//! directory, which meant it tailed the suite root's log - and nothing writes there, because no tool is run
//! from the root. The panel therefore showed nothing and looked broken, which is how it was reported.
//!
//! This module owns the answer to "which logs should be read". It is deliberately separate from tailing and
//! from serving: the set is a property of the workspace, not of a request, and a caller that cannot read it
//! should say so rather than silently falling back to one file.

use gaugeblock_workspace::{GaugeblockPaths, WorkspaceTopology};
use std::path::PathBuf;

/// Every telemetry log the workspace owns, root first, members after.
///
/// Paths are returned whether or not they exist: a caller distinguishes "no telemetry yet" from "a repository
/// the topology says exists but has not been initialised", and collapsing those two into an empty vector is how
/// a missing member becomes invisible.
#[must_use]
pub fn telemetry_event_paths(suite_root: &std::path::Path) -> Vec<PathBuf> {
    let mut paths = vec![GaugeblockPaths::at(suite_root).telemetry_events()];
    for member in WorkspaceTopology::discover(suite_root).members() {
        let member_path = GaugeblockPaths::at(&member.path).telemetry_events();
        if !paths.contains(&member_path) {
            paths.push(member_path);
        }
    }
    paths
}
