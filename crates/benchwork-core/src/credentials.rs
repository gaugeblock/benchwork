//! Environment credential persistence and process environment loading.

use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

use crate::error::Result;

/// Loads KEY=VALUE pairs from `.gaugeblock/.env` into the process environment.
pub fn load_credentials(root_path: &Path) {
    let env_path = root_path.join(".gaugeblock").join(".env");
    if let Ok(content) = fs::read_to_string(&env_path) {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = line.split_once('=') {
                let key = k.trim();
                let val = v.trim().trim_matches('"').trim_matches('\'');
                if !key.is_empty() && std::env::var(key).is_err() {
                    std::env::set_var(key, val);
                }
            }
        }
    }
}

/// Persists a credential key-value pair to `.gaugeblock/.env` and sets it in `std::env`.
pub fn persist_credential(root_path: &Path, key: &str, val: &str) -> Result<()> {
    let k = key.trim();
    let v = val.trim();
    if k.is_empty() || v.is_empty() {
        return Ok(());
    }
    std::env::set_var(k, v);

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

    let mut out = String::from("# Gaugeblock local process environment credentials (DO NOT COMMIT)\n");
    for (ek, ev) in entries {
        out.push_str(&format!("{ek}={ev}\n"));
    }
    fs::write(&env_path, out)?;
    Ok(())
}
