//! State, specification, and DAG board REST route handlers.

use axum::Json;
use axum::extract::{Path as AxumPath, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use benchwork_core::model::*;
use benchwork_core::*;
use serde_json::json;
use std::sync::Arc;

/// Shared daemon state passed to Axum route handlers.
#[derive(Debug, Clone)]
pub struct DaemonContext {
    pub state: BenchworkState,
}

/// GET /api/v1/capabilities
pub async fn get_capabilities(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match ctx.state.capabilities() {
        Ok(caps) => (StatusCode::OK, Json(json!(caps))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/snapshot
pub async fn get_snapshot(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match ctx.state.snapshot() {
        Ok(snap) => (StatusCode::OK, Json(json!(snap))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/spec
pub async fn get_spec(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match load_spec_bundle(&ctx.state.root_path) {
        Ok(bundle) => (StatusCode::OK, Json(json!(bundle))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/spec/decide
pub async fn post_decide(
    State(ctx): State<Arc<DaemonContext>>,
    Json(req): Json<ResolveDecisionRequest>,
) -> impl IntoResponse {
    match resolve_decision(&ctx.state.root_path, &req) {
        Ok(receipt) => {
            let _ = ctx.state.event_tx.send(LiveEvent::DecisionResolved {
                decision_id: req.decision_id.clone(),
            });
            (StatusCode::OK, Json(json!(receipt)))
        }
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/spec/contract-preview
pub async fn post_contract_preview(Json(req): Json<ContractPreviewRequest>) -> impl IntoResponse {
    match preview_contract(&req) {
        Ok(preview) => (StatusCode::OK, Json(json!(preview))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/dag
pub async fn get_dag(
    State(ctx): State<Arc<DaemonContext>>,
    Query(query): Query<DagQuery>,
) -> impl IntoResponse {
    match get_dag_view(&ctx.state.root_path, &query) {
        Ok(dag) => (StatusCode::OK, Json(json!(dag))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/dag/:id/briefing
pub async fn get_task_briefing_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
) -> impl IntoResponse {
    match get_task_briefing(&ctx.state.root_path, &task_id) {
        Ok(briefing) => (StatusCode::OK, Json(json!(briefing))),
        Err(e) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}
