//! Workspace capability scanner and health detector.

use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

use dado_core::PatternRegistry;
use storypole_core::StorypoleStore;
use storypole_core::index::query::get_all_tasks;

use crate::error::Result;
use crate::model::{SpecDocsStatus, WorkspaceCapabilities};

/// Technical markdown filenames inspected by the scanner.
const SPEC_CANDIDATES: &[&str] = &["SPEC.md", "PRODUCT.md", "ARCHITECTURE.md", "DESIGN.md"];

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

    SpecDocsStatus {
        primary_spec_present,
        detected_files,
    }
}

fn scan_storypole(root_path: &Path) -> (bool, BTreeMap<String, usize>, usize) {
    let dot_dir = root_path.join(".storypole");
    if !dot_dir.join("config.toml").is_file() {
        return (false, BTreeMap::new(), 0);
    }

    let mut task_counts = BTreeMap::new();
    let mut pending_decisions = 0;

    if let Ok(store) = StorypoleStore::open(root_path)
        && let Ok(tasks) = get_all_tasks(store.conn())
    {
        for task in tasks.values() {
            let status_name = format!("{:?}", task.status).to_lowercase();
            *task_counts.entry(status_name).or_insert(0) += 1;

            for dec in &task.decisions {
                if dec.chosen_option.is_none() {
                    pending_decisions += 1;
                }
            }
        }
        return (true, task_counts, pending_decisions);
    }

    // Fallback: check ledger.jsonl line count if sqlite wasn't ready
    let ledger_path = dot_dir.join("ledger.jsonl");
    let active = ledger_path.is_file();
    (active, task_counts, pending_decisions)
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
    root_path.join("sawhorse.toml").is_file()
        || root_path.join(".sawhorse").join("config.toml").is_file()
}

fn scan_telemetry(root_path: &Path) -> usize {
    let spool_path = root_path.join(".rabbet").join("spool").join("outbox.jsonl");
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
