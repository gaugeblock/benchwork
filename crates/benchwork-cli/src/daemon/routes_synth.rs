//! Synthesis X-Ray, Dado patterns, and telemetry hub route handlers.

use axum::Json;
use axum::extract::{Path as AxumPath, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use benchwork_core::model::*;
use benchwork_core::*;
use serde_json::json;
use std::sync::Arc;

use super::routes_state::DaemonContext;

/// GET /api/v1/xray/patterns
pub async fn get_patterns(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match list_patterns(&ctx.state.root_path) {
        Ok(patterns) => (StatusCode::OK, Json(json!(patterns))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/xray/compile-hole
pub async fn post_compile_hole(
    State(ctx): State<Arc<DaemonContext>>,
    Json(req): Json<HoleCompileRequest>,
) -> impl IntoResponse {
    match compile_hole_grammar(&ctx.state.root_path, &req) {
        Ok(compiled) => (StatusCode::OK, Json(json!(compiled))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/synthesis/run
pub async fn post_synthesis_run(
    State(ctx): State<Arc<DaemonContext>>,
    Json(req): Json<SynthesisRunRequest>,
) -> impl IntoResponse {
    match trigger_synthesis(&ctx.state.root_path, &req, ctx.state.event_tx.clone()).await {
        Ok(()) => (
            StatusCode::ACCEPTED,
            Json(json!({ "status": "triggered", "task_id": req.task_id })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/hub/models
pub async fn get_hub_status(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match get_model_hub_status(&ctx.state.root_path) {
        Ok(status) => (StatusCode::OK, Json(json!(status))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/hub/spool
pub async fn get_hub_spool(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match get_model_hub_status(&ctx.state.root_path) {
        Ok(status) => (StatusCode::OK, Json(json!(status.spool_traces))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// DELETE /api/v1/hub/spool/:trace_id
pub async fn delete_spool_trace_handler(
    State(ctx): State<Arc<DaemonContext>>,
    AxumPath(trace_id): AxumPath<String>,
) -> impl IntoResponse {
    match delete_spool_trace(&ctx.state.root_path, &trace_id) {
        Ok(true) => (
            StatusCode::OK,
            Json(json!({ "deleted": true, "trace_id": trace_id })),
        ),
        Ok(false) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Trace not found" })),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/hub/ping
pub async fn post_hub_ping(Json(req): Json<InferencePingRequest>) -> impl IntoResponse {
    match ping_inference(&req).await {
        Ok(res) => (StatusCode::OK, Json(json!(res))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/hub/config
pub async fn get_hub_config(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match read_sawhorse_config(&ctx.state.root_path) {
        Ok(config) => (StatusCode::OK, Json(json!(config))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/hub/config
pub async fn post_hub_config(
    State(ctx): State<Arc<DaemonContext>>,
    Json(config): Json<UniversalModelConfig>,
) -> impl IntoResponse {
    match write_sawhorse_config(&ctx.state.root_path, &config) {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/hub/test-inference
pub async fn post_test_inference(Json(req): Json<TestInferenceRequest>) -> impl IntoResponse {
    match test_inference_slot(&req).await {
        Ok(receipt) => (StatusCode::OK, Json(json!(receipt))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// POST /api/v1/hub/models/discover
pub async fn post_discover_models(Json(req): Json<DiscoverModelsRequest>) -> impl IntoResponse {
    match discover_remote_models(&req).await {
        Ok(res) => (StatusCode::OK, Json(json!(res))),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(json!({ "success": false, "models": [], "message": e.to_string() })),
        ),
    }
}
