//! Axum route handlers for unified `.gaugeblock/` migration.

use std::sync::Arc;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::Json;
use benchwork_core::{
    MigrationPlan, MigrationReceipt, discover_migration, execute_migration,
};
use serde::Deserialize;

use super::routes_state::DaemonContext;

/// Request payload for `/api/v1/migration/execute`.
#[derive(Debug, Deserialize)]
pub struct ExecuteMigrationRequest {
    /// Perform a dry run without modifying the filesystem.
    #[serde(default)]
    pub dry_run: bool,
    /// Force overwrite or backup of colliding destination paths.
    #[serde(default)]
    pub force: bool,
}

/// Returns the current migration plan and detected legacy state.
pub async fn get_migration_plan(
    State(ctx): State<Arc<DaemonContext>>,
) -> Result<Json<MigrationPlan>, (StatusCode, String)> {
    discover_migration(&ctx.state.root_path)
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

/// Executes migration and returns receipt.
pub async fn post_execute_migration(
    State(ctx): State<Arc<DaemonContext>>,
    Json(payload): Json<ExecuteMigrationRequest>,
) -> Result<Json<MigrationReceipt>, (StatusCode, String)> {
    let plan = discover_migration(&ctx.state.root_path)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    execute_migration(&plan, payload.dry_run, payload.force)
        .map(Json)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))
}

