//! Fleet operations over a suite of repositories (`GB-263`, `GB-293`).
//!
//! Split from `handlers` when the resolution fix pushed that file past the 250-line limit - by a
//! reformat, not an edit, which is the boundary hazard `GB-305` recorded. Both functions share one
//! question: which repositories does this command walk?

use std::path::{Path, PathBuf};

use crate::args::TidyArgs;

/// The suite root a fleet command should walk, resolved from wherever it was launched (`GB-293`, `GB-305`).
///
/// `tidy --workspace` used to discover members of the directory it was run in. At a suite root that is the
/// suite; inside a member it is the member, whose only child directories are target/ and worktrees - so the
/// command walked nothing, found nothing, and reported success. A fleet operation that runs over zero
/// repositories and exits zero is indistinguishable from one that ran over twelve and found them clean.
///
/// Falls back to `start` when no declared suite contains it, because a lone repository is its own fleet of one
/// and must still be tidied.
#[must_use]
pub fn fleet_root(start: &Path) -> PathBuf {
    let canonical = std::fs::canonicalize(start).unwrap_or_else(|_| start.to_path_buf());
    gaugeblock_workspace::Membership::containing(&canonical)
        .map(|membership| membership.suite_root)
        .unwrap_or(canonical)
}

/// Separate from `migrate` on purpose: this is a tidy operation over an already-unified workspace, so it
/// has to run when there is nothing to migrate. Attached to migration it was unreachable twice over -
/// driven by plan items, then living inside an engine the CLI never called.
pub fn handle_tidy(
    root_path: PathBuf,
    args: TidyArgs,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Fleet mode (`GB-263`): membership comes from WorkspaceTopology, never a glob, so target/, worktrees/
    // and nested non-member repositories are excluded by construction. Each repository is isolated - a
    // finding is recorded and the run continues - because a fleet command that stops at the first problem
    // leaves the operator guessing how far it got.
    if args.workspace {
        let topology = gaugeblock_workspace::WorkspaceTopology::discover(&fleet_root(&root_path));
        let mut conflicts = 0usize;
        let mut with_findings = 0usize;

        for member in topology.members() {
            let gb_root = member.path.join(".gaugeblock");
            let findings =
                benchwork_core::migration::engine::reconcile_tool_configs(&gb_root, args.dry_run);
            if findings.is_empty() {
                continue;
            }
            with_findings += 1;
            if findings.iter().any(|finding| finding.contains("CONFLICT")) {
                conflicts += 1;
            }
            println!("  {}:", member.name);
            for finding in &findings {
                println!("    - {finding}");
            }
        }

        let total = topology.members().len();
        if !args.json {
            println!(
                "--- Tidy {} (workspace) ---\n  {total} repositories, {} already tidy, {with_findings} with findings",
                if args.dry_run { "Dry Run" } else { "Receipt" },
                total - with_findings
            );
        }
        if conflicts > 0 {
            return Err(
                format!("{conflicts} repository(ies) reported conflicts; see above").into(),
            );
        }
        return Ok(());
    }

    let gb_root = root_path.join(".gaugeblock");
    let findings =
        benchwork_core::migration::engine::reconcile_tool_configs(&gb_root, args.dry_run);

    if args.json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({
                "dry_run": args.dry_run,
                "findings": findings,
            }))?
        );
    } else if findings.is_empty() {
        println!("Nothing to reconcile: no duplicate per-tool configs found.");
    } else {
        println!(
            "--- Tidy {} ---",
            if args.dry_run { "Dry Run" } else { "Receipt" }
        );
        for finding in &findings {
            println!("  - {finding}");
        }
    }

    Ok(())
}
