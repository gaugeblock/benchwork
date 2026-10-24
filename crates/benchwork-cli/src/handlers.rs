//! CLI command dispatch handlers.

use std::path::PathBuf;

use benchwork_core::{
    BenchworkState, discover_migration, execute_migration, scan_capabilities,
};
use benchwork_mcp::run_stdio_server;

use crate::args::{FormatArgs, MigrateArgs, UpArgs};
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
            println!("{}", serde_json::to_string_pretty(&serde_json::json!({
                "status": "already_unified",
                "message": "Workspace is already using unified .gaugeblock/ configuration"
            }))?);
        } else {
            println!("Workspace is already unified under .gaugeblock/ (no legacy items found).");
        }
        return Ok(());
    }

    let receipt = execute_migration(&plan, args.dry_run, args.force)?;
    if args.json {
        println!("{}", serde_json::to_string_pretty(&receipt)?);
    } else {
        println!("--- Migration {} ---", if args.dry_run { "Dry Run" } else { "Receipt" });
        println!("Migrated items: {}", receipt.migrated_count);
        println!("Skipped items:  {}", receipt.skipped_count);
        for detail in &receipt.details {
            println!("  - {detail}");
        }
    }
    Ok(())
}
