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

/// Request payload for claiming an agent lease on a task.
#[derive(Debug, serde::Deserialize)]
pub struct ClaimTaskPayload {
    pub agent_id: String,
    pub branch: Option<String>,
}

/// POST /api/v1/dag/:id/claim
pub async fn post_claim_task_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
    Json(payload): Json<ClaimTaskPayload>,
) -> impl IntoResponse {
    match claim_task_lease(
        &ctx.state.root_path,
        &task_id,
        &payload.agent_id,
        payload.branch.as_deref(),
    ) {
        Ok(briefing) => (StatusCode::OK, Json(json!(briefing))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// Request payload for recording an agent handoff packet.
#[derive(Debug, serde::Deserialize)]
pub struct HandoffTaskPayload {
    pub recorded_by_agent: String,
    pub completed_items: Vec<String>,
    pub remaining_items: Vec<String>,
    pub last_error_or_blocker: Option<String>,
    pub dirty_files: Option<Vec<String>>,
    pub status: Option<String>,
}

/// POST /api/v1/dag/:id/handoff
pub async fn post_record_handoff_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
    Json(payload): Json<HandoffTaskPayload>,
) -> impl IntoResponse {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let handoff = HandoffPacket {
        recorded_by_agent: payload.recorded_by_agent,
        timestamp_ms: now,
        completed_items: payload.completed_items,
        remaining_items: payload.remaining_items,
        last_error_or_blocker: payload.last_error_or_blocker,
        git_ref: None,
        dirty_files: payload.dirty_files.unwrap_or_default(),
    };
    let new_status = match payload.status.as_deref() {
        Some("ready") => TaskStatus::Ready,
        Some("blocked") => TaskStatus::Blocked,
        Some("deferred") => TaskStatus::Deferred,
        _ => TaskStatus::Ready,
    };
    match record_task_handoff(&ctx.state.root_path, &task_id, handoff, new_status) {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}
