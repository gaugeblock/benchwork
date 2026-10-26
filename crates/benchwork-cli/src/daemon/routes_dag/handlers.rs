//! Route handlers for DAG queries and task mutations.

use std::sync::Arc;

use axum::Json;
use axum::extract::{Path as AxumPath, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use benchwork_core::model::*;
use benchwork_core::*;
use serde_json::json;

use super::types::*;
use crate::daemon::routes_state::DaemonContext;

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

/// POST /api/v1/dag/:id/update
pub async fn post_update_task_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
    Json(payload): Json<UpdateTaskPayload>,
) -> impl IntoResponse {
    let has_scope = payload.repo.is_some()
        || payload.crate_name.is_some()
        || payload.module_path.is_some()
        || payload.target_files.is_some()
        || payload.target_symbols.is_some()
        || payload.labels.is_some();

    let scope = if has_scope {
        Some(TaskScope {
            repo: payload.repo,
            crate_name: payload.crate_name,
            module_path: payload.module_path,
            target_files: payload.target_files.unwrap_or_default(),
            target_symbols: payload.target_symbols.unwrap_or_default(),
            labels: payload.labels.unwrap_or_default(),
        })
    } else {
        None
    };

    let params = UpdateTaskParams {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        scope,
        acceptance_criteria: payload.acceptance_criteria,
    };

    match update_task_details(&ctx.state.root_path, &task_id, params) {
        Ok(briefing) => (StatusCode::OK, Json(json!(briefing))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/dag/:id/link
pub async fn post_link_tasks_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
    Json(payload): Json<LinkTasksPayload>,
) -> impl IntoResponse {
    let kind = payload.kind.as_deref().unwrap_or("blocked_by");
    match link_tasks_service(&ctx.state.root_path, &task_id, &payload.target_id, kind) {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/dag/:id/split
pub async fn post_split_task_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
    Json(payload): Json<SplitTaskPayload>,
) -> impl IntoResponse {
    let seq = payload.sequential.unwrap_or(false);
    match split_task_service(&ctx.state.root_path, &task_id, payload.subtasks, seq) {
        Ok(children) => (StatusCode::OK, Json(json!(children))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/dag/:id/archive
pub async fn post_archive_task_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
) -> impl IntoResponse {
    match archive_task_service(&ctx.state.root_path, &task_id) {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/dag/:id/unarchive
pub async fn post_unarchive_task_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(task_id): AxumPath<String>,
) -> impl IntoResponse {
    match unarchive_task_service(&ctx.state.root_path, &task_id) {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/dag/bulk-archive
pub async fn post_bulk_archive_handler(
    State(ctx): State<Arc<DaemonContext>>,
    Json(payload): Json<BulkArchiveRequest>,
) -> impl IntoResponse {
    match bulk_archive_tasks_service(&ctx.state.root_path, &payload.task_ids) {
        Ok(res) => (
            StatusCode::OK,
            Json(json!(BulkArchiveResponse {
                archived_count: res.archived_count,
                errors: res.errors,
            })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}
