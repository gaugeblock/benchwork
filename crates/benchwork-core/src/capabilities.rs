//! Workspace capability scanner and health detector.

use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use dado_core::PatternRegistry;
use storypole_core::index::query::get_all_tasks;
use storypole_core::model::task::TaskNode;
use storypole_core::{StorypoleStore, StorypoleWorkspaceStore};

use crate::error::Result;
use crate::model::{SpecDocsStatus, WorkspaceCapabilities};

/// Technical markdown filenames inspected by the scanner.
const SPEC_CANDIDATES: &[&str] = &[
    "SPEC.md",
    "README.md",
    "CONTRACTS.md",
    "PRODUCT.md",
    "ARCHITECTURE.md",
    "DESIGN.md",
    "ROADMAP.md",
    "CHANGELOG.md",
    "AGENTS.md",
    "CONTRIBUTING.md",
];

/// Scans the given workspace root directory and returns detected capabilities.
pub fn scan_capabilities(root_path: &Path) -> Result<WorkspaceCapabilities> {
    let spec_docs = scan_spec_docs(root_path);
    let (storypole_active, task_counts, pending_decisions_count) = scan_storypole(root_path);
    let dado_patterns_count = scan_dado(root_path);
    let sawhorse_configured = scan_sawhorse(root_path);
    let pending_telemetry_count = scan_telemetry(root_path);

    Ok(WorkspaceCapabilities {
        root_path: root_path.display().to_string(),
        spec_docs,
        storypole_active,
        task_counts,
        pending_decisions_count,
        dado_patterns_count,
        sawhorse_configured,
        pending_telemetry_count,
    })
}

fn scan_spec_docs(root_path: &Path) -> SpecDocsStatus {
    let primary_spec_present = root_path.join("SPEC.md").is_file();
    let mut detected_files = Vec::new();

    for candidate in SPEC_CANDIDATES {
        if root_path.join(candidate).is_file() {
            detected_files.push((*candidate).to_string());
        }
    }

    if let Ok(entries) = std::fs::read_dir(root_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file()
                && path.extension().and_then(|e| e.to_str()) == Some("md")
                && let Some(name) = path.file_name().and_then(|n| n.to_str())
                && !detected_files.iter().any(|d| d == name)
            {
                detected_files.push(name.to_string());
            }
        }
    }

    SpecDocsStatus {
        primary_spec_present,
        detected_files,
    }
}

fn scan_storypole(root_path: &Path) -> (bool, BTreeMap<String, usize>, usize) {
    let mut task_counts = BTreeMap::new();
    let pending_decisions = 0;

    if let Ok(ws) = StorypoleWorkspaceStore::open(root_path)
        && let Ok(tasks) = get_all_tasks(ws.conn())
    {
        let pending_decisions = tally_tasks(tasks.values(), &mut task_counts);
        return (true, task_counts, pending_decisions);
    }

    if let Ok(store) = StorypoleStore::open(root_path)
        && let Ok(tasks) = get_all_tasks(store.conn())
    {
        let pending_decisions = tally_tasks(tasks.values(), &mut task_counts);
        return (true, task_counts, pending_decisions);
    }

    let dot_dir = StorypoleStore::resolve_dot_dir(root_path);
    let ledger_path = dot_dir.join("ledger.jsonl");
    let active = ledger_path.is_file() || dot_dir.join("config.toml").is_file();
    (active, task_counts, pending_decisions)
}

/// Tally tasks by status, folding archived tasks into their own bucket.
///
/// An archived task keeps the status it earned (`GB-179`), so counting `task.status` without checking
/// the archive timestamp reported 222 verified when only 163 were live - the workbench claimed 59 more
/// finished tickets than existed (`GB-211`). Archived tasks are counted under `archived`, and their
/// pending decisions are not counted at all: an archived task cannot be worked, so surfacing its
/// decision as actionable would send an operator to a ticket that is already closed.
fn tally_tasks<'a>(
    tasks: impl Iterator<Item = &'a TaskNode>,
    task_counts: &mut BTreeMap<String, usize>,
) -> usize {
    let mut pending_decisions = 0;
    for task in tasks {
        if task.archived_at_epoch_ms.is_some() {
            *task_counts.entry("archived".to_string()).or_insert(0) += 1;
            continue;
        }
        let status_name = format!("{:?}", task.status).to_lowercase();
        *task_counts.entry(status_name).or_insert(0) += 1;

        for decision in &task.decisions {
            if decision.chosen_option.is_none() {
                pending_decisions += 1;
            }
        }
    }
    pending_decisions
}

fn scan_dado(root_path: &Path) -> usize {
    if let Ok(mut registry) = PatternRegistry::new() {
        let dado_dir = root_path.join(".dado");
        if dado_dir.is_dir() {
            let _ = registry.load_from_dir(&dado_dir);
        }
        registry.list_patterns(None, None).len()
    } else {
        0
    }
}

fn scan_sawhorse(root_path: &Path) -> bool {
    root_path.join(".gaugeblock").join("config.toml").is_file()
        || root_path.join("sawhorse.toml").is_file()
        || root_path.join(".sawhorse").join("config.toml").is_file()
}

fn scan_telemetry(root_path: &Path) -> usize {
    // Same canonical outbox the writers use, not the pre-GB-182 location (GB-209).
    let spool_path = crate::chat_harness::telemetry_spool::spool_outbox_path(root_path);
    if !spool_path.is_file() {
        return 0;
    }

    if let Ok(file) = File::open(&spool_path) {
        BufReader::new(file)
            .lines()
            .map_while(std::result::Result::ok)
            .count()
    } else {
        0
    }
}
