//! Atomic migration execution engine.

use super::consolidator::canonical_gaugeblock_gitignore;
use super::types::{MigrationItemKind, MigrationPlan, MigrationReceipt};
use crate::error::{BenchworkError, Result};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// Executes the migration plan.
pub fn execute_migration(plan: &MigrationPlan, dry_run: bool, force: bool) -> Result<MigrationReceipt> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| BenchworkError::Workspace(e.to_string()))?
        .as_millis() as u64;

    let mut details = Vec::new();
    let mut backup_paths = Vec::new();
    let mut migrated_count = 0;
    let mut skipped_count = 0;

    let gb_root = plan.workspace_root.join(".gaugeblock");

    if !dry_run {
        fs::create_dir_all(&gb_root)?;
    }

    for item in &plan.items {
        let full_src = plan.workspace_root.join(&item.source);
        let full_dst = plan.workspace_root.join(&item.destination);

        match item.kind {
            MigrationItemKind::DirectoryMove => {
                if !full_src.exists() {
                    skipped_count += 1;
                    details.push(format!("Skipped {}: source does not exist", item.source.display()));
                    continue;
                }

                if full_dst.exists() {
                    if force {
                        let bak = full_dst.with_extension(format!("bak.{}", now));
                        if !dry_run {
                            fs::rename(&full_dst, &bak)?;
                        }
                        backup_paths.push(bak);
                    } else {
                        skipped_count += 1;
                        details.push(format!("Skipped {}: destination already exists", item.destination.display()));
                        continue;
                    }
                }

                if dry_run {
                    details.push(format!("[DRY RUN] Would move {} -> {}", item.source.display(), item.destination.display()));
                    migrated_count += 1;
                } else {
                    if let Some(parent) = full_dst.parent() {
                        fs::create_dir_all(parent)?;
                    }
                    if fs::rename(&full_src, &full_dst).is_err() {
                        copy_dir_recursive(&full_src, &full_dst)?;
                        let _ = fs::remove_dir_all(&full_src);
                    }
                    details.push(format!("Moved {} -> {}", item.source.display(), item.destination.display()));
                    migrated_count += 1;
                }
            }
            MigrationItemKind::FileArchive | MigrationItemKind::ConfigMerge => {
                if !full_src.exists() {
                    continue;
                }
                let bak = full_src.with_extension(format!("bak.{}", now));
                if dry_run {
                    details.push(format!("[DRY RUN] Would archive {} -> {}", item.source.display(), bak.display()));
                } else {
                    fs::rename(&full_src, &bak)?;
                    backup_paths.push(bak);
                    details.push(format!("Archived {} to backup", item.source.display()));
                }
                migrated_count += 1;
            }
        }
    }

    if !dry_run {
        if let Some(cfg) = &plan.consolidated_config_preview {
            let config_path = gb_root.join("config.toml");
            fs::write(&config_path, cfg)?;
            details.push("Wrote consolidated .gaugeblock/config.toml".into());
        }

        let gitignore_path = gb_root.join(".gitignore");
        if !gitignore_path.exists() {
            let _ = fs::write(&gitignore_path, canonical_gaugeblock_gitignore());
            details.push("Scaffolded .gaugeblock/.gitignore".into());
        }
    }

    Ok(MigrationReceipt {
        executed_at_epoch_ms: now,
        migrated_count,
        skipped_count,
        dry_run,
        details,
        backup_paths,
    })
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_type = entry.file_type()?;
        let dst_child = dst.join(entry.file_name());
        if entry_type.is_dir() {
            copy_dir_recursive(&entry.path(), &dst_child)?;
        } else {
            fs::copy(entry.path(), &dst_child)?;
        }
    }
    Ok(())
}
