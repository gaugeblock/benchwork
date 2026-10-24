//! HTTP handlers for 9-Document repository architecture auditing and scaffolding.

use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Json};
use benchwork_core::{
    DocAuditReport, DocsConfig, audit_docs, get_docs_config, migrate_docs, save_docs_config,
    scaffold_docs,
};
use serde::Deserialize;

use super::routes_state::DaemonContext;

/// Request payload for scaffolding documentation files.
#[derive(Debug, Deserialize)]
pub struct ScaffoldRequest {
    /// Specific document type filter (e.g. `readme`, `agents`).
    pub doc: Option<String>,
    /// Force overwrite existing files.
    #[serde(default)]
    pub force: bool,
}

/// Request payload for brownfield document migration.
#[derive(Debug, Deserialize)]
pub struct MigrateRequest {
    /// Source document path relative to workspace root.
    pub source: String,
    /// Apply changes to disk instead of dry run.
    #[serde(default)]
    pub apply: bool,
}

/// GET /api/v1/docs/audit — Audits workspace documentation against code AST and .gaugeblock/docs.toml.
pub async fn get_docs_audit(
    State(ctx): State<Arc<DaemonContext>>,
) -> Result<Json<DocAuditReport>, StatusCode> {
    audit_docs(&ctx.state.root_path)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// GET /api/v1/docs/config — Retrieves current .gaugeblock/docs.toml configuration.
pub async fn get_docs_config_handler(
    State(ctx): State<Arc<DaemonContext>>,
) -> Result<Json<DocsConfig>, StatusCode> {
    get_docs_config(&ctx.state.root_path)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// POST /api/v1/docs/config — Updates and saves .gaugeblock/docs.toml configuration.
pub async fn post_docs_config_handler(
    State(ctx): State<Arc<DaemonContext>>,
    Json(config): Json<DocsConfig>,
) -> Result<Json<PathBuf>, StatusCode> {
    save_docs_config(&ctx.state.root_path, &config)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// POST /api/v1/docs/scaffold — Scaffolds missing documentation files with AST-grounded templates.
pub async fn post_docs_scaffold_handler(
    State(ctx): State<Arc<DaemonContext>>,
    Json(payload): Json<ScaffoldRequest>,
) -> Result<Json<Vec<String>>, StatusCode> {
    scaffold_docs(&ctx.state.root_path, payload.doc, payload.force)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// POST /api/v1/docs/migrate — Plans or applies brownfield section disentangling into 9 docs.
pub async fn post_docs_migrate_handler(
    State(ctx): State<Arc<DaemonContext>>,
    Json(payload): Json<MigrateRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let source_path = ctx.state.root_path.join(payload.source);
    migrate_docs(&ctx.state.root_path, &source_path, payload.apply)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
