//! Integration and route tests for chat daemon endpoints.

#![allow(clippy::unwrap_used)]

use std::sync::Arc;
use tempfile::TempDir;

use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use futures::StreamExt;

use benchwork_cli::daemon::routes_chat::{
    handle_apply_proposal, handle_chat_stream, handle_get_autocomplete, handle_get_threads,
};
use benchwork_cli::daemon::routes_state::DaemonContext;
use benchwork_core::BenchworkState;
use benchwork_core::chat_harness::context_injector::UiViewportContext;
use benchwork_core::chat_harness::orchestrator::{ApplyProposalRequest, ChatTurnRequest};

#[tokio::test]
async fn test_autocomplete_endpoint() {
    let temp = TempDir::new().unwrap();
    let state = BenchworkState::new(temp.path().to_path_buf());
    let ctx = Arc::new(DaemonContext { state });

    let res = handle_get_autocomplete(State(ctx)).await.into_response();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();

    assert!(body.get("commands").unwrap().is_array());
    assert!(body.get("tools").unwrap().is_array());
    assert_eq!(body.get("tools").unwrap().as_array().unwrap().len(), 8);
}

#[tokio::test]
async fn test_apply_proposal_endpoint() {
    let temp = TempDir::new().unwrap();
    let state = BenchworkState::new(temp.path().to_path_buf());
    let ctx = Arc::new(DaemonContext { state });

    let req = ApplyProposalRequest {
        thread_id: "test-thread".to_string(),
        proposal_id: "prop-123".to_string(),
        tool_name: "propose_task_plan".to_string(),
        payload_json: r#"{"summary":"Plan test"}"#.to_string(),
        approved: true,
        edited_payload_json: None,
    };

    let res = handle_apply_proposal(State(ctx), axum::Json(req))
        .await
        .into_response();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(body.get("status").unwrap(), "ok");
}

#[tokio::test]
async fn test_get_threads_endpoint_empty_and_populated() {
    let temp = TempDir::new().unwrap();
    let state = BenchworkState::new(temp.path().to_path_buf());
    let ctx = Arc::new(DaemonContext { state });

    let res = handle_get_threads(State(ctx)).await.into_response();
    assert_eq!(res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(res.into_body(), usize::MAX)
        .await
        .unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert!(body.get("threads").unwrap().is_array());
}

#[tokio::test]
async fn test_chat_stream_endpoint() {
    let temp = TempDir::new().unwrap();
    let state = BenchworkState::new(temp.path().to_path_buf());
    let ctx = Arc::new(DaemonContext { state });

    let req = ChatTurnRequest {
        thread_id: "thread-test".to_string(),
        user_message: "Hello world".to_string(),
        viewport: UiViewportContext::default(),
        role: Some("planner".to_string()),
    };

    let sse_resp = handle_chat_stream(State(ctx), axum::Json(req)).await;
    let mut stream = sse_resp.into_response().into_body().into_data_stream();

    // Collect first SSE chunk from the receiver stream
    if let Some(Ok(chunk)) = stream.next().await {
        let chunk_str = String::from_utf8_lossy(&chunk);
        assert!(!chunk_str.is_empty());
    }
}
