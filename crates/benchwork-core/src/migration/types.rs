//! Core types and receipts for the unified `.gaugeblock/` migration engine.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Kind of filesystem or configuration migration action.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MigrationItemKind {
    /// Moving a legacy directory (e.g. `.storypole` -> `.gaugeblock/storypole`).
    DirectoryMove,
    /// Archiving a legacy configuration file after merging.
    FileArchive,
    /// Merging legacy configuration into `.gaugeblock/config.toml`.
    ConfigMerge,
}

/// Execution status of a migration item.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MigrationItemStatus {
    /// Detected and planned for migration.
    Pending,
    /// Successfully executed.
    Completed,
    /// Skipped because target already exists or source is empty.
    Skipped,
    /// Migration failed.
    Failed,
}

/// A discrete unit of migration work.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MigrationItem {
    /// Original legacy path relative to workspace root.
    pub source: PathBuf,
    /// Destination path within `.gaugeblock/`.
    pub destination: PathBuf,
    /// Classification of migration action.
    pub kind: MigrationItemKind,
    /// Human-readable explanation of the action.
    pub description: String,
    /// Current status.
    pub status: MigrationItemStatus,
}

/// Full migration plan containing all discovered legacy items and preview config.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MigrationPlan {
    /// Workspace root directory.
    pub workspace_root: PathBuf,
    /// Discovered migration items.
    pub items: Vec<MigrationItem>,
    /// Consolidated configuration TOML content preview.
    pub consolidated_config_preview: Option<String>,
    /// Whether any legacy items were found.
    pub has_legacy_items: bool,
}

/// Execution receipt returned after performing migration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MigrationReceipt {
    /// Unix timestamp in epoch milliseconds when executed.
    pub executed_at_epoch_ms: u64,
    /// Total items successfully migrated.
    pub migrated_count: usize,
    /// Total items skipped.
    pub skipped_count: usize,
    /// Whether this was a dry-run without mutating disk.
    pub dry_run: bool,
    /// Log details of actions taken.
    pub details: Vec<String>,
    /// Created backup file or directory paths.
    pub backup_paths: Vec<PathBuf>,
}

