//! Environment credential persistence and secure lookup.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use crate::error::Result;

/// Resolves a credential value first from the process environment, then `.gaugeblock/.env`.
pub fn resolve_credential(root_path: &Path, key: &str) -> Option<String> {
    if let Ok(val) = std::env::var(key)
        && !val.trim().is_empty()
    {
        return Some(val);
    }
    let env_path = root_path.join(".gaugeblock").join(".env");
    if let Ok(content) = fs::read_to_string(&env_path) {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = line.split_once('=')
                && k.trim() == key
            {
                let val = v.trim().trim_matches('"').trim_matches('\'');
                if !val.is_empty() {
                    return Some(val.to_string());
                }
            }
        }
    }
    None
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

    let gb_dir = root_path.join(".gaugeblock");
    if !gb_dir.exists() {
        let _ = fs::create_dir_all(&gb_dir);
    }
    let env_path = gb_dir.join(".env");
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
