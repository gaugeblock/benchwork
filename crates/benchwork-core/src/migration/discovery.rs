//! Legacy directory and configuration discovery.

use super::consolidator::consolidate_configs;
use super::types::{MigrationItem, MigrationItemKind, MigrationItemStatus, MigrationPlan};
use crate::error::Result;
use std::path::{Path, PathBuf};

/// Discovers all legacy files and directories needing migration to `.gaugeblock/`.
pub fn discover_migration(workspace_root: &Path) -> Result<MigrationPlan> {
    let mut items = Vec::new();

    let legacy_dirs = [
        (
            PathBuf::from(".storypole"),
            PathBuf::from(".gaugeblock").join("storypole"),
            "Move Storypole task ledger, plans, and SQLite index into .gaugeblock/storypole",
        ),
        (
            PathBuf::from(".miter"),
            PathBuf::from(".gaugeblock").join("miter"),
            "Move Miter Redb AST symbol database into .gaugeblock/miter",
        ),
        (
            PathBuf::from(".dado"),
            PathBuf::from(".gaugeblock").join("dado"),
            "Move Dado custom patterns and mixins into .gaugeblock/dado",
        ),
        (
            PathBuf::from(".rabbet").join("spool"),
            PathBuf::from(".gaugeblock").join("spool"),
            "Move Rabbet telemetry spool outbox into .gaugeblock/spool",
        ),
    ];

    for (src, dst, desc) in legacy_dirs {
        let full_src = workspace_root.join(&src);
        if full_src.is_dir() {
            items.push(MigrationItem {
                source: src,
                destination: dst,
                kind: MigrationItemKind::DirectoryMove,
                description: desc.to_string(),
                status: MigrationItemStatus::Pending,
            });
        }
    }

    let legacy_files = [
        (
            PathBuf::from("sawhorse.toml"),
            PathBuf::from("sawhorse.toml.bak"),
            "Consolidate sawhorse.toml into .gaugeblock/config.toml [sawhorse]",
        ),
        (
            PathBuf::from(".gaugeblock").join("docs.toml"),
            PathBuf::from(".gaugeblock").join("docs.toml.bak"),
            "Consolidate .gaugeblock/docs.toml into .gaugeblock/config.toml [docs]",
        ),
    ];

    for (src, dst, desc) in legacy_files {
        let full_src = workspace_root.join(&src);
        if full_src.is_file() {
            items.push(MigrationItem {
                source: src,
                destination: dst,
                kind: MigrationItemKind::ConfigMerge,
                description: desc.to_string(),
                status: MigrationItemStatus::Pending,
            });
        }
    }

    let has_legacy_items = !items.is_empty();
    let consolidated_config_preview = if has_legacy_items
        || workspace_root
            .join(".gaugeblock")
            .join("config.toml")
            .is_file()
    {
        consolidate_configs(workspace_root).ok()
    } else {
        None
    };

    Ok(MigrationPlan {
        workspace_root: workspace_root.to_path_buf(),
        items,
        consolidated_config_preview,
        has_legacy_items,
    })
}
