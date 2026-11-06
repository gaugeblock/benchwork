//! Atomic migration execution engine.

use super::consolidator::canonical_gaugeblock_gitignore;
use super::types::{MigrationItemKind, MigrationPlan, MigrationReceipt};
use crate::error::{BenchworkError, Result};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// Executes the migration plan.
pub fn execute_migration(
    plan: &MigrationPlan,
    dry_run: bool,
    force: bool,
) -> Result<MigrationReceipt> {
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
                    details.push(format!(
                        "Skipped {}: source does not exist",
                        item.source.display()
                    ));
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
                        details.push(format!(
                            "Skipped {}: destination already exists",
                            item.destination.display()
                        ));
                        continue;
                    }
                }

                let caches = derived_caches(&full_src);
                if dry_run {
                    details.push(format!(
                        "[DRY RUN] Would move {} -> {}{}",
                        item.source.display(),
                        item.destination.display(),
                        cache_note(caches.len(), true)
                    ));
                    migrated_count += 1;
                } else {
                    if let Some(parent) = full_dst.parent() {
                        fs::create_dir_all(parent)?;
                    }
                    if fs::rename(&full_src, &full_dst).is_err() {
                        copy_dir_recursive(&full_src, &full_dst)?;
                        let _ = fs::remove_dir_all(&full_src);
                    }
                    let discarded = discard_caches(&full_dst)?;
                    details.push(format!(
                        "Moved {} -> {}{}",
                        item.source.display(),
                        item.destination.display(),
                        cache_note(discarded, false)
                    ));
                    migrated_count += 1;
                }
            }
            MigrationItemKind::FileArchive | MigrationItemKind::ConfigMerge => {
                if !full_src.exists() {
                    continue;
                }
                let bak = full_src.with_extension(format!("bak.{}", now));
                if dry_run {
                    details.push(format!(
                        "[DRY RUN] Would archive {} -> {}",
                        item.source.display(),
                        bak.display()
                    ));
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

    // Reconcile duplicate per-tool configs (`GB-261` D8, `GB-267`). Kept as a call into a standalone
    // function so it can also run when there is nothing to migrate - see `benchwork tidy`.
    details.extend(reconcile_tool_configs(&gb_root, dry_run));

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

/// Resolves the duplicate storypole config that migration would otherwise leave behind (`GB-261` D8).
///
/// A `DirectoryMove` puts the repo's per-tool `config.toml` at `.gaugeblock/storypole/config.toml` while
/// consolidation writes the same settings into `.gaugeblock/config.toml` under `[storypole]`. Two files
/// meaning one thing at the same level is the config-drift failure mode: they agree today and diverge the
/// day someone edits the loser, with no precedence story to say which won.
///
/// The unified file is canonical, matching what the loaders already do (`.gaugeblock/config.toml` is tried
/// first, legacy per-tool files are fallbacks). So: identical values -> the duplicate goes; different
/// values -> nothing is deleted and the conflict is named, because guessing which the user meant is worse
/// than asking.
/// Reconciles duplicate per-tool configs against the unified file (`GB-261` D8, `GB-267`).
///
/// A migrated repository can carry both `.gaugeblock/config.toml` (with a `[storypole]` section) and
/// `.gaugeblock/storypole/config.toml`. Two files meaning one thing is the config-drift failure mode: they
/// agree today and diverge the day someone edits the loser.
///
/// **This is not migration.** It is a tidy operation over an already-unified workspace, so it must be
/// callable when there is nothing to move. That distinction is why it lives in its own function: driven by
/// migration plan items it was unreachable for exactly the repositories that needed it, and living inside
/// `execute_migration` it was unreachable whenever the CLI short-circuited on "already unified". Both
/// were observed before this function existed.
///
/// Identical values remove the duplicate; differing values delete nothing and name the conflict, because
/// guessing which the user meant is worse than asking. Returns one line per finding.
pub fn reconcile_tool_configs(gb_root: &Path, dry_run: bool) -> Vec<String> {
    let mut notes = Vec::new();
    let Ok(entries) = fs::read_dir(gb_root) else {
        return notes;
    };

    for entry in entries.flatten() {
        let tool_dir = entry.path();
        if !tool_dir.is_dir() {
            continue;
        }
        let Some(section) = tool_dir.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if let Some(note) = reconcile_tool_config(&tool_dir, section, gb_root, dry_run) {
            notes.push(format!("{}{note}", tool_dir.display()));
        }
    }
    notes
}

fn reconcile_tool_config(
    tool_dir: &Path,
    section: &str,
    gb_root: &Path,
    dry_run: bool,
) -> Option<String> {
    let per_tool = tool_dir.join("config.toml");
    if !per_tool.is_file() {
        return None;
    }

    let unified: toml::Value = fs::read_to_string(gb_root.join("config.toml"))
        .ok()?
        .parse()
        .ok()?;
    let canonical = unified.get(section)?;
    let candidate: toml::Value = fs::read_to_string(&per_tool).ok()?.parse().ok()?;

    if &candidate == canonical {
        if !dry_run {
            let _ = fs::remove_file(&per_tool);
        }
        let verb = if dry_run { "would remove" } else { "removed" };
        Some(format!(
            " ({verb} duplicate config.toml; unified [{section}] already carries it)"
        ))
    } else {
        Some(format!(
            " (CONFLICT: config.toml differs from unified [{section}]; kept both, resolve by hand)"
        ))
    }
}

/// Files inside a migrated directory that are derived caches and must never travel (`GB-262`).
///
/// A stale index arriving in `.gaugeblock/storypole/` is worse than no index: it will be opened and it
/// will answer from a ledger position that no longer exists. Discarding is lossless because the index
/// rebuilds from the ledger, whereas copying it is lossless-looking and wrong.
const DERIVED_CACHE_FILES: [&str; 3] = ["index.sqlite", "index.sqlite-shm", "index.sqlite-wal"];

/// Cache files present in `dir`, by name.
fn derived_caches(dir: &Path) -> Vec<&'static str> {
    DERIVED_CACHE_FILES
        .iter()
        .copied()
        .filter(|name| dir.join(name).is_file())
        .collect()
}

/// Removes derived caches from `dir`, returning how many were discarded.
fn discard_caches(dir: &Path) -> Result<usize> {
    let mut discarded = 0;
    for name in DERIVED_CACHE_FILES {
        let path = dir.join(name);
        if path.is_file() {
            fs::remove_file(&path)?;
            discarded += 1;
        }
    }
    Ok(discarded)
}

/// Tail for a detail line, so the report states what happened to caches instead of implying they moved.
fn cache_note(count: usize, dry_run: bool) -> String {
    if count == 0 {
        return String::new();
    }
    let verb = if dry_run {
        "would discard"
    } else {
        "discarded"
    };
    let plural = if count == 1 { "" } else { "s" };
    format!(" ({verb} {count} derived cache file{plural})")
}
