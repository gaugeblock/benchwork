//! Configuration consolidator merging legacy configs into `.gaugeblock/config.toml`.

use crate::error::{BenchworkError, Result};
use std::fs;
use std::path::Path;
use toml::Table;

/// Consolidates configuration from legacy files into a unified TOML document.
pub fn consolidate_configs(workspace_root: &Path) -> Result<String> {
    let mut unified = Table::new();

    let paths = gaugeblock_workspace::GaugeblockPaths::at(workspace_root);
    let unified_path = paths.config();
    if unified_path.is_file() {
        let content = fs::read_to_string(&unified_path)?;
        if let Ok(parsed) = content.parse::<Table>() {
            unified = parsed;
        }
    }

    let docs_legacy = paths.root().join("docs.toml");
    if docs_legacy.is_file()
        && let Ok(content) = fs::read_to_string(&docs_legacy)
        && let Ok(table) = content.parse::<Table>()
    {
        // `docs.toml` is already shaped as part of the suite document: its root holds `[docs.*]` and
        // `[policies]`. Inserting the whole file under the key "docs" produced `[docs.docs.readme]`,
        // one level too deep, so every reader looking for `[docs.readme]` silently fell back to
        // defaults and the policy in `config.toml` was inert (`GB-256`). Merging its top-level tables
        // in place keeps each at the depth it declared.
        merge_tables(&mut unified, table);
    }

    let sawhorse_legacy = workspace_root.join("sawhorse.toml");
    if sawhorse_legacy.is_file()
        && !unified.contains_key("sawhorse")
        && let Ok(content) = fs::read_to_string(&sawhorse_legacy)
        && let Ok(table) = content.parse::<Table>()
    {
        unified.insert("sawhorse".into(), toml::Value::Table(table));
    }

    let storypole_legacy = workspace_root.join(".storypole").join("config.toml");
    if storypole_legacy.is_file()
        && !unified.contains_key("storypole")
        && let Ok(content) = fs::read_to_string(&storypole_legacy)
        && let Ok(table) = content.parse::<Table>()
    {
        unified.insert("storypole".into(), toml::Value::Table(table));
    }

    toml::to_string_pretty(&unified).map_err(|e| BenchworkError::Workspace(e.to_string()))
}

/// Merges `source` into `target`, with `target` winning on every conflict.
///
/// The destination wins because `config.toml` may have been curated by hand while the legacy file is
/// what a migration is trying to retire: re-running a consolidation must never overwrite a value
/// someone chose deliberately.
fn merge_tables(target: &mut Table, source: Table) {
    for (key, value) in source {
        match (target.get_mut(&key), value) {
            (Some(toml::Value::Table(existing)), toml::Value::Table(incoming)) => {
                merge_tables(existing, incoming);
            }
            // Present already: keep the destination's value.
            (Some(_), _) => {}
            (None, value) => {
                target.insert(key, value);
            }
        }
    }
}

/// Generates the canonical `.gaugeblock/.gitignore` contents.
pub fn canonical_gaugeblock_gitignore() -> &'static str {
    r#"# Ignore runtime database and ephemeral index files
storypole/index.sqlite*
miter/*.redb
miter/*.redb.lock
spool/
worktrees/
datasets/
*.bak*
"#
}
