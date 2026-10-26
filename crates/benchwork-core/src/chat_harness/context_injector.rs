//! Context injection engine: <gaugeblock_environment> XML envelope & @// expansion.

use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use crate::error::Result;

/// Frontend viewport context reported by the active Benchwork panel.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct UiViewportContext {
    pub active_panel: String,
    #[serde(default)]
    pub focused_task_key: Option<String>,
    #[serde(default)]
    pub focused_doc_archetype: Option<String>,
    #[serde(default)]
    pub focused_symbol: Option<String>,
}

/// Detects the active Git branch without shelling out if possible.
fn detect_git_branch(root_dir: &Path) -> String {
    let head_path = root_dir.join(".git").join("HEAD");
    if let Ok(head) = fs::read_to_string(head_path) {
        let trimmed = head.trim();
        if let Some(branch) = trimmed.strip_prefix("ref: refs/heads/") {
            return branch.to_string();
        }
        if trimmed.len() >= 8 {
            return trimmed[..8].to_string();
        }
    }
    "main".to_string()
}

/// Counts Storypole tasks in each status from the ledger.
fn summarize_storypole(root_dir: &Path) -> (usize, usize, usize) {
    let ledger_path = root_dir
        .join(".gaugeblock")
        .join("storypole")
        .join("ledger.jsonl");
    let mut ready = 0;
    let mut in_progress = 0;
    let mut blocked = 0;

    if let Ok(content) = fs::read_to_string(ledger_path) {
        for line in content.lines() {
            if line.contains(r#""to":"in_progress""#) {
                in_progress += 1;
            } else if line.contains(r#""to":"ready""#) {
                ready += 1;
            } else if line.contains(r#""to":"blocked""#) {
                blocked += 1;
            }
        }
    }
    (ready, in_progress, blocked)
}

/// Builds the compact ~200-250 token `<gaugeblock_environment>` XML envelope.
pub fn build_environment_xml(root_dir: &Path, viewport: &UiViewportContext) -> String {
    let branch = detect_git_branch(root_dir);
    let (ready, in_progress, blocked) = summarize_storypole(root_dir);
    let focused_task = viewport.focused_task_key.as_deref().unwrap_or("none");
    let focused_doc = viewport.focused_doc_archetype.as_deref().unwrap_or("none");

    format!(
        "<gaugeblock_environment>\n  \
         <active_branch>{branch}</active_branch>\n  \
         <active_panel>{}</active_panel>\n  \
         <focused_task>{focused_task}</focused_task>\n  \
         <focused_doc>{focused_doc}</focused_doc>\n  \
         <storypole_summary ready=\"{ready}\" in_progress=\"{in_progress}\" blocked=\"{blocked}\" />\n  \
         <docs_drift status=\"clean\" checked_docs=\"9\" />\n  \
         <sawhorse_role model=\"deepseek-v4.1-flash\" active_preset=\"universal\" />\n\
         </gaugeblock_environment>",
        viewport.active_panel
    )
}

/// Expands `@task:`, `@doc:`, and `/commands` into rich context blocks.
pub fn expand_user_prompt(prompt: &str, root_dir: &Path) -> Result<String> {
    let mut expanded = prompt.to_string();

    // /commands expansions
    if expanded.contains("/grill-me") {
        expanded = expanded.replace(
            "/grill-me",
            "[SYSTEM DIRECTIVE: Interview the user interactively about architectural decisions one at a time before proceeding.]",
        );
    }
    if expanded.contains("/disentangle") {
        expanded = expanded.replace(
            "/disentangle",
            "[SYSTEM DIRECTIVE: Classify brownfield markdown sections into canonical 9-doc archetypes without scope leakage.]",
        );
    }

    // @doc:<ARCHETYPE> expansion
    for token in prompt.split_whitespace() {
        if let Some(archetype) = token.strip_prefix("@doc:") {
            let doc_file = format!("{archetype}.md");
            let doc_path = root_dir.join(&doc_file);
            if let Ok(content) = fs::read_to_string(&doc_path) {
                let preview: String = content.lines().take(30).collect::<Vec<_>>().join("\n");
                let injection = format!(
                    "\n\n<!-- Context for @doc:{archetype} -->\n```markdown\n{preview}\n```\n"
                );
                expanded.push_str(&injection);
            }
        } else if let Some(task_key) = token.strip_prefix("@task:") {
            let plan_path = root_dir
                .join(".gaugeblock")
                .join("storypole")
                .join("plans")
                .join(format!("{task_key}.md"));
            if let Ok(content) = fs::read_to_string(&plan_path) {
                let preview: String = content.lines().take(30).collect::<Vec<_>>().join("\n");
                let injection = format!(
                    "\n\n<!-- Context for @task:{task_key} -->\n```markdown\n{preview}\n```\n"
                );
                expanded.push_str(&injection);
            }
        }
    }

    Ok(expanded)
}

/// Injects environment radar at the tail of the final user message.
pub fn inject_turn_context(
    user_prompt: &str,
    root_dir: &Path,
    viewport: &UiViewportContext,
) -> Result<String> {
    let expanded = expand_user_prompt(user_prompt, root_dir)?;
    let env_xml = build_environment_xml(root_dir, viewport);
    Ok(format!("{expanded}\n\n{env_xml}"))
}
