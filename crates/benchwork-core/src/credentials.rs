//! Environment credential persistence and secure lookup.
//!
//! Both the path and the parsing come from `gaugeblock-workspace` (`GB-189`). This module used to
//! carry its own dotenv reader and its own `.gaugeblock` join, which agreed with the foundation
//! crate's rules only by coincidence - the exact duplicate-parser hazard the crate was extracted to
//! remove. Replacing them changes no behaviour: both implementations skip blanks and `#` comments,
//! trim the key, strip surrounding quotes and treat a set-but-empty value as absent.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use gaugeblock_workspace::{GaugeblockPaths, env_credentials};

use crate::error::Result;

/// Resolves a credential value first from the process environment, then `.gaugeblock/.env`.
///
/// The process environment wins because it is the operator's explicit override. A set-but-empty
/// variable is not a credential in either source, so an empty environment value falls through to the
/// file rather than blanking it.
pub fn resolve_credential(root_path: &Path, key: &str) -> Option<String> {
    if let Ok(value) = std::env::var(key)
        && !value.trim().is_empty()
    {
        return Some(value);
    }
    env_credentials(root_path)
        .remove(key)
        .filter(|value| !value.trim().is_empty())
}

/// Compatibility no-op or pre-flight reader for credentials.
pub fn load_credentials(_root_path: &Path) {
    // Process env loading without unsafe set_var
}

/// Persists a credential key-value pair to `.gaugeblock/.env`.
pub fn persist_credential(root_path: &Path, key: &str, val: &str) -> Result<()> {
    let k = key.trim();
    let v = val.trim();
    if k.is_empty() || v.is_empty() {
        return Ok(());
    }

    let paths = GaugeblockPaths::at(root_path);
    let env_path = paths.env_file();
    if let Some(parent) = env_path.parent()
        && !parent.exists()
    {
        let _ = fs::create_dir_all(parent);
    }
    let mut entries = BTreeMap::new();

    if let Ok(content) = fs::read_to_string(&env_path) {
        for line in content.lines() {
            let trimmed = line.trim();
            if let Some((ek, ev)) = trimmed.split_once('=') {
                let ek_trim = ek.trim().to_string();
                let ev_trim = ev.trim().to_string();
                if !ek_trim.is_empty() && !ek_trim.starts_with('#') {
                    entries.insert(ek_trim, ev_trim);
                }
            }
        }
    }

    entries.insert(k.to_string(), format!("\"{v}\""));

    let mut out = String::from("# Gaugeblock local credentials (DO NOT COMMIT)\n");
    for (ek, ev) in entries {
        out.push_str(&format!("{ek}={ev}\n"));
    }
    fs::write(&env_path, out)?;
    Ok(())
}
