//! Integration tests for DAG REST endpoints and bulk operations.

#![allow(clippy::unwrap_used)]

use std::sync::Arc;
use tempfile::TempDir;

use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use benchwork_cli::daemon::routes_dag::{BulkArchiveRequest, get_dag, post_bulk_archive_handler};
use benchwork_cli::daemon::routes_state::DaemonContext;
use benchwork_core::{BenchworkState, DagQuery};
use storypole_core::StorypoleConfig;
use storypole_core::model::task::TaskScope;
use storypole_core::ops::mutations::{CreateTaskParams, add_task};
use storypole_core::store::StorypoleStore;

#[tokio::test]
async fn test_bulk_archive_endpoint() {
    let temp = TempDir::new().unwrap();
    let root = temp.path();

    let cfg = StorypoleConfig {
        ticket_prefix: "GB".into(),
        ..Default::default()
    };
    let mut store = StorypoleStore::init(root, cfg).unwrap();

    let t1 = add_task(
        &mut store,
        CreateTaskParams {
            title: "Task 1".into(),
            scope: TaskScope::default(),
            ..Default::default()
        },
    )
    .unwrap();
    let t2 = add_task(
        &mut store,
        CreateTaskParams {
            title: "Task 2".into(),
            scope: TaskScope::default(),
            ..Default::default()
        },
    )
    .unwrap();

    let state = BenchworkState::new(root.to_path_buf());
    let ctx = Arc::new(DaemonContext { state });

    // Initial DAG has 2 tasks
    let res = get_dag(State(ctx.clone()), Query(DagQuery::default()))
        .await
        .into_response();
    assert_eq!(res.status(), StatusCode::OK);

    // Call bulk archive
    let bulk_req = BulkArchiveRequest {
        task_ids: vec![t1.ticket_key.clone(), t2.ticket_key.clone()],
    };
    let archive_res = post_bulk_archive_handler(State(ctx.clone()), axum::Json(bulk_req))
        .await
        .into_response();
    assert_eq!(archive_res.status(), StatusCode::OK);

    let bytes = axum::body::to_bytes(archive_res.into_body(), usize::MAX)
        .await
        .unwrap();
    let body: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(body.get("archived_count").unwrap(), 2);
    assert_eq!(body.get("errors").unwrap().as_array().unwrap().len(), 0);

    // Active DAG now has 0 tasks
    let res_after = get_dag(State(ctx.clone()), Query(DagQuery::default()))
        .await
        .into_response();
    let bytes_after = axum::body::to_bytes(res_after.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_after: serde_json::Value = serde_json::from_slice(&bytes_after).unwrap();
    assert_eq!(
        body_after.get("nodes").unwrap().as_array().unwrap().len(),
        0
    );

    // Including archived returns 2 tasks
    let res_inc = get_dag(
        State(ctx.clone()),
        Query(DagQuery {
            include_archived: true,
            ..Default::default()
        }),
    )
    .await
    .into_response();
    let bytes_inc = axum::body::to_bytes(res_inc.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_inc: serde_json::Value = serde_json::from_slice(&bytes_inc).unwrap();
    assert_eq!(body_inc.get("nodes").unwrap().as_array().unwrap().len(), 2);
}
