//! Config reconciliation: merging per-tool configs into the canonical one (`GB-267`).
//!
//! Split from migration execution when the file passed the 250-line limit (`GB-291`). The boundary is the
//! one GB-267 already drew in behaviour: reconciliation must be runnable on a workspace that has nothing to
//! migrate, so it cannot live inside the path that only runs when legacy work exists.

use super::*;

pub fn reconcile_tool_configs(gb_root: &Path, dry_run: bool) -> Vec<String> {
    let mut notes = Vec::new();
    let entries = match fs::read_dir(gb_root) {
        Ok(entries) => entries,
        // A repository with no `.gaugeblock` has nothing to reconcile. Reporting it as unreadable would
        // make fleet mode noisy about repositories that are not adopted yet (`GB-263`).
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Vec::new(),
        Err(error) => return vec![format!("cannot read {}: {error}", gb_root.display())],
    };

    for entry in entries.flatten() {
        let tool_dir = entry.path();
        if !tool_dir.is_dir() {
            continue;
        }
        let Some(section) = tool_dir.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        match reconcile_tool_config(&tool_dir, section, gb_root, dry_run) {
            Ok(Some(note)) => notes.push(format!("{}{note}", tool_dir.display())),
            Ok(None) => {}
            // Reported, never swallowed: an unreadable or invalid config must not be indistinguishable
            // from "there was nothing to do", which is what five `?`-to-`None` paths produced.
            Err(reason) => notes.push(format!("{}: {reason}", tool_dir.display())),
        }
    }
    notes
}

/// The first thing the per-tool file would lose if it were removed, or `None` when it is redundant.
///
/// `None` means: every key in `candidate` is present in `canonical` with the same value, so deleting the
/// candidate destroys no information. Anything else - a differing value, or a key the unified file never
/// heard of - must be surfaced rather than resolved by guesswork.
pub(super) fn first_lost_key(candidate: &toml::Value, canonical: &toml::Value) -> Option<String> {
    let candidate = candidate.as_table()?;
    let canonical = canonical.as_table()?;

    for (key, value) in candidate {
        match canonical.get(key) {
            Some(existing) if existing == value => {}
            Some(_) => return Some(format!("`{key}` (differs from the unified value)")),
            None => return Some(format!("`{key}` (absent from the unified section)")),
        }
    }
    None
}

pub(super) fn reconcile_tool_config(
    tool_dir: &Path,
    section: &str,
    gb_root: &Path,
    dry_run: bool,
) -> std::result::Result<Option<String>, String> {
    let per_tool = tool_dir.join("config.toml");
    if !per_tool.is_file() {
        return Ok(None);
    }

    let unified_path = gb_root.join("config.toml");
    let unified_text = fs::read_to_string(&unified_path)
        .map_err(|error| format!("cannot read {}: {error}", unified_path.display()))?;
    // `toml::from_str` parses a *document*; `Value`'s FromStr parses a single *value*, which reads
    // `[storypole]` as an array and then chokes on the next line. That is the whole reason this compare
    // silently found nothing, and the error it produces ("unexpected content, expected nothing" after the
    // closing bracket) names the parser's confusion rather than the file's contents.
    let unified: toml::Value = toml::from_str(&unified_text)
        .map_err(|error| format!("{} is not valid TOML: {error}", unified_path.display()))?;
    let Some(canonical) = unified.get(section) else {
        return Ok(None);
    };

    let candidate_text = fs::read_to_string(&per_tool)
        .map_err(|error| format!("cannot read {}: {error}", per_tool.display()))?;
    let candidate: toml::Value = toml::from_str(&candidate_text)
        .map_err(|error| format!("{} is not valid TOML: {error}", per_tool.display()))?;

    // Equality is too strict a test. The per-tool file is usually a stale *subset* - same prefix, same
    // TTL, but predating `verification_commands` - so demanding identical tables leaves the duplicate in
    // place forever. A file is redundant when every key it holds already exists upstream with the same
    // value; it becomes informative the moment one key differs or is missing upstream.
    match first_lost_key(&candidate, canonical) {
        None => {
            if !dry_run {
                let _ = fs::remove_file(&per_tool);
            }
            let verb = if dry_run { "would remove" } else { "removed" };
            Ok(Some(format!(
                " ({verb} redundant config.toml; unified [{section}] already carries every key)"
            )))
        }
        Some(reason) => Ok(Some(format!(
            " (CONFLICT: config.toml would lose {reason}; kept both, resolve by hand)"
        ))),
    }
}

/// Files inside a migrated directory that are derived caches and must never travel (`GB-262`).
///
/// A stale index arriving in `.gaugeblock/storypole/` is worse than no index: it will be opened and it
/// will answer from a ledger position that no longer exists. Discarding is lossless because the index
/// rebuilds from the ledger, whereas copying it is lossless-looking and wrong.
const DERIVED_CACHE_FILES: [&str; 3] = ["index.sqlite", "index.sqlite-shm", "index.sqlite-wal"];

/// Cache files present in `dir`, by name.
pub(super) fn derived_caches(dir: &Path) -> Vec<&'static str> {
    DERIVED_CACHE_FILES
        .iter()
        .copied()
        .filter(|name| dir.join(name).is_file())
        .collect()
}

/// Removes derived caches from `dir`, returning how many were discarded.
pub(super) fn discard_caches(dir: &Path) -> Result<usize> {
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
pub(super) fn cache_note(count: usize, dry_run: bool) -> String {
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
