//! Documentation architecture and AST grounding services for Benchwork.

use std::fs;
use std::path::{Path, PathBuf};

pub use chalkline_core::docs::{
    DocAuditItem, DocAuditReport, DocStatus, DocsConfig as CoreDocsConfig,
};
use chalkline_core::docs::{
    DocMigrationPlan, DocType, DocsConfig, render_template, verify_docs_drift,
};
use miter_engine::inspect_workspace;

use crate::error::{BenchworkError, Result};

/// Audits the workspace repository documentation against .gaugeblock/docs.toml and code AST.
pub fn audit_docs(root_path: &Path) -> Result<DocAuditReport> {
    let config = DocsConfig::load_or_default(root_path)
        .map_err(|e| BenchworkError::Workspace(format!("Failed to load docs.toml: {e}")))?;
    let inventory = safe_inventory(root_path);
    Ok(verify_docs_drift(root_path, &config, &inventory))
}

fn safe_inventory(root_path: &Path) -> miter_engine::WorkspaceInventory {
    inspect_workspace(root_path).unwrap_or_else(|_| miter_engine::WorkspaceInventory {
        root_dir: root_path.to_path_buf(),
        workspace_name: root_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string()),
        crates: Vec::new(),
        cli_commands: Vec::new(),
        public_types: Vec::new(),
        git: None,
        toolchain: miter_engine::ToolchainInventory::default(),
    })
}

/// Loads `.gaugeblock/docs.toml` or returns defaults if absent.
pub fn get_docs_config(root_path: &Path) -> Result<DocsConfig> {
    DocsConfig::load_or_default(root_path)
        .map_err(|e| BenchworkError::Workspace(format!("Failed to load docs.toml: {e}")))
}

/// Saves the updated `.gaugeblock/docs.toml` to disk.
pub fn save_docs_config(root_path: &Path, config: &DocsConfig) -> Result<PathBuf> {
    config
        .save(root_path)
        .map_err(|e| BenchworkError::Workspace(format!("Failed to save docs.toml: {e}")))
}

/// Scaffolds missing or requested documentation files.
pub fn scaffold_docs(
    root_path: &Path,
    doc_filter: Option<String>,
    force: bool,
) -> Result<Vec<String>> {
    let config = DocsConfig::load_or_default(root_path)
        .map_err(|e| BenchworkError::Workspace(format!("Failed to load docs.toml: {e}")))?;
    let inventory = safe_inventory(root_path);

    let mut created = Vec::new();
    for doc_type in DocType::ALL {
        let entry = config.entry_for(doc_type);
        let path = root_path.join(&entry.path);

        if let Some(ref filter) = doc_filter {
            let name = format!("{:?}", doc_type).to_lowercase();
            if !name.contains(&filter.to_lowercase()) {
                continue;
            }
        }

        if path.is_file() && !force {
            continue;
        }

        let content = render_template(doc_type, &inventory);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&path, content)?;
        created.push(entry.path.clone());
    }

    Ok(created)
}

/// Generates or applies a brownfield document migration plan.
pub fn migrate_docs(root_path: &Path, source_path: &Path, apply: bool) -> Result<DocMigrationPlan> {
    let config = DocsConfig::load_or_default(root_path)
        .map_err(|e| BenchworkError::Workspace(format!("Failed to load docs.toml: {e}")))?;
    let plan = DocMigrationPlan::plan_from_file(source_path, &config)
        .map_err(|e| BenchworkError::Workspace(format!("Failed to plan migration: {e}")))?;

    if apply {
        plan.execute(root_path, &config)
            .map_err(|e| BenchworkError::Workspace(format!("Failed to execute migration: {e}")))?;
    }

    Ok(plan)
}
