//! CLI command dispatch handlers.

use std::path::{Path, PathBuf};

use benchwork_core::{BenchworkState, discover_migration, execute_migration, scan_capabilities};
use benchwork_mcp::run_stdio_server;

use crate::args::{FormatArgs, MigrateArgs, TidyArgs, UpArgs};
use crate::daemon::start_daemon;

/// Executes the `benchwork capabilities` command.
pub fn handle_capabilities(
    root_path: PathBuf,
    args: FormatArgs,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let caps = scan_capabilities(&root_path)?;

    if args.json {
        println!("{}", serde_json::to_string_pretty(&caps)?);
    } else {
        println!("Workspace Root: {}", caps.root_path);
        println!(
            "Primary SPEC.md present: {}",
            caps.spec_docs.primary_spec_present
        );
        println!(
            "Detected Technical Docs: {:?}",
            caps.spec_docs.detected_files
        );
        println!("Storypole Active: {}", caps.storypole_active);
        println!("Task Counts: {:?}", caps.task_counts);
        println!("Pending Decisions: {}", caps.pending_decisions_count);
        println!("Registered Dado Patterns: {}", caps.dado_patterns_count);
        println!("Sawhorse Configured: {}", caps.sawhorse_configured);
        println!("Pending Telemetry Traces: {}", caps.pending_telemetry_count);
    }
    Ok(())
}

/// Executes the `benchwork snapshot` command.
pub fn handle_snapshot(
    root_path: PathBuf,
    args: FormatArgs,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let state = BenchworkState::new(root_path);
    let snap = state.snapshot()?;

    if args.json {
        println!("{}", serde_json::to_string_pretty(&snap)?);
    } else {
        println!("--- Benchwork Snapshot ---");
        println!("Timestamp: {}", snap.timestamp_ms);
        println!("Tasks Total: {}", snap.dag.stats.total);
        println!("Tasks Ready: {}", snap.dag.stats.ready);
        println!("Tasks InProgress: {}", snap.dag.stats.in_progress);
        println!("Tasks Verified: {}", snap.dag.stats.verified);
        println!("Tasks Blocked: {}", snap.dag.stats.blocked);
        println!(
            "Pending Decisions: {}",
            snap.spec_summary.pending_decisions.len()
        );
        println!(
            "Shared Type Contracts: {}",
            snap.spec_summary.contracts.len()
        );
        println!("Pending Telemetry Traces: {}", snap.spool_traces_count);
    }
    Ok(())
}

/// Executes the `benchwork up` command.
pub async fn handle_up(
    root_path: PathBuf,
    args: UpArgs,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    start_daemon(root_path, args).await
}

/// Executes the `benchwork mcp` command.
pub async fn handle_mcp() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    run_stdio_server().await
}

/// Executes the `benchwork migrate` command.
pub fn handle_migrate(
    root_path: PathBuf,
    args: MigrateArgs,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let plan = discover_migration(&root_path)?;
    if !plan.has_legacy_items {
        if args.json {
            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!({
                    "status": "already_unified",
                    "message": "Workspace is already using unified .gaugeblock/ configuration"
                }))?
            );
        } else {
            println!("Workspace is already unified under .gaugeblock/ (no legacy items found).");
        }
        return Ok(());
    }

    let receipt = execute_migration(&plan, args.dry_run, args.force)?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&receipt)?);
    } else {
        println!(
            "--- Migration {} ---",
            if args.dry_run { "Dry Run" } else { "Receipt" }
        );
        println!("Migrated items: {}", receipt.migrated_count);
        println!("Skipped items:  {}", receipt.skipped_count);
        for detail in &receipt.details {
            println!("  - {detail}");
        }
    }
    Ok(())
}

/// Archives every task matching a status, reporting progress and surfacing per-task errors.
pub fn handle_archive_all(
    root_path: PathBuf,
    args: crate::args::ArchiveAllArgs,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let query = benchwork_core::model::dag::DagQuery {
        status: Some(args.status.clone()),
        ..Default::default()
    };
    let selected = benchwork_core::get_dag_view(&root_path, &query)?
        .nodes
        .len();

    if !args.apply {
        if args.json {
            println!(
                "{}",
                serde_json::json!({"status": args.status, "would_archive": selected})
            );
        } else {
            println!(
                "would archive {selected} task(s) with status '{}' - re-run with --apply",
                args.status
            );
        }
        return Ok(());
    }

    let result = benchwork_core::archive_tasks_by_filter(&root_path, &query)?;
    if args.json {
        println!(
            "{}",
            serde_json::json!({
                "status": args.status,
                "selected": selected,
                "archived_count": result.archived_count,
                "errors": result.errors,
            })
        );
    } else {
        println!(
            "archived {}/{} task(s) with status '{}'",
            result.archived_count, selected, args.status
        );
        for error in &result.errors {
            eprintln!("  failed: {error}");
        }
    }
    Ok(())
}

/// Reconciles duplicate per-tool configs against the unified `.gaugeblock/config.toml` (`GB-267`).
///
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
