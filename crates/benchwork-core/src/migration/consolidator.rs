//! Configuration consolidator merging legacy configs into `.gaugeblock/config.toml`.

use crate::error::{BenchworkError, Result};
use std::fs;
use std::path::Path;
use toml::Table;

/// Consolidates configuration from legacy files into a unified TOML document.
pub fn consolidate_configs(workspace_root: &Path) -> Result<String> {
    let mut unified = Table::new();

    let unified_path = workspace_root.join(".gaugeblock").join("config.toml");
    if unified_path.is_file() {
        let content = fs::read_to_string(&unified_path)?;
        if let Ok(parsed) = content.parse::<Table>() {
            unified = parsed;
        }
    }

    let docs_legacy = workspace_root.join(".gaugeblock").join("docs.toml");
    if docs_legacy.is_file()
        && !unified.contains_key("docs")
        && let Ok(content) = fs::read_to_string(&docs_legacy)
        && let Ok(table) = content.parse::<Table>()
    {
        unified.insert("docs".into(), toml::Value::Table(table));
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
