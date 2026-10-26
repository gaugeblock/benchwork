//! Integration tests for Benchwork multi-repository workspace rollups and store routing.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::fs;

use benchwork_core::chat_harness::context_injector::expand_user_prompt;
use benchwork_core::{
    DagQuery, claim_task_lease, get_dag_view, get_task_briefing, link_tasks_service,
    scan_capabilities,
};
use storypole_core::StorypoleConfig;
use storypole_core::model::task::{TaskScope, TaskStatus};
use storypole_core::ops::mutations::{CreateTaskParams, add_task};
use storypole_core::store::StorypoleStore;

#[test]
fn test_benchwork_workspace_rollup_and_mutation_routing() {
    let tmp = tempfile::tempdir().expect("tempdir");
    let ws_root = tmp.path();

    // 1. Initialize root store (GB)
    let root_cfg = StorypoleConfig {
        ticket_prefix: "GB".into(),
        claim_ttl_minutes: 60,
        ..Default::default()
    };
    let mut root_store = StorypoleStore::init(ws_root, root_cfg).expect("init root");
    let gb_task = add_task(
        &mut root_store,
        CreateTaskParams {
            title: "Meta Workspace Task".into(),
            scope: TaskScope {
                repo: Some("workspace".into()),
                ..Default::default()
            },
            ..Default::default()
        },
    )
    .expect("gb task");
    assert_eq!(gb_task.ticket_key, "GB-1");

    // 2. Member 1: benchwork (BW)
    let bw_dir = ws_root.join("benchwork");
    fs::create_dir_all(&bw_dir).expect("bw dir");
    let bw_cfg = StorypoleConfig {
        ticket_prefix: "BW".into(),
        claim_ttl_minutes: 60,
        ..Default::default()
    };
    let mut bw_store = StorypoleStore::init(&bw_dir, bw_cfg).expect("init bw");
    let bw_task = add_task(
        &mut bw_store,
        CreateTaskParams {
            title: "Workbench UI Panel".into(),
            scope: TaskScope {
                repo: Some("benchwork".into()),
                ..Default::default()
            },
            ..Default::default()
        },
    )
    .expect("bw task");
    assert_eq!(bw_task.ticket_key, "BW-1");

    // 3. Member 2: miter (MTR)
    let mtr_dir = ws_root.join("miter");
    fs::create_dir_all(&mtr_dir).expect("mtr dir");
    let mtr_cfg = StorypoleConfig {
        ticket_prefix: "MTR".into(),
        claim_ttl_minutes: 60,
        ..Default::default()
    };
    let mut mtr_store = StorypoleStore::init(&mtr_dir, mtr_cfg).expect("init mtr");
    let mtr_task = add_task(
        &mut mtr_store,
        CreateTaskParams {
            title: "AST Slicer".into(),
            scope: TaskScope {
                repo: Some("miter".into()),
                ..Default::default()
            },
            ..Default::default()
        },
    )
    .expect("mtr task");
    assert_eq!(mtr_task.ticket_key, "MTR-1");

    // 4. Test DAG view rollups across workspace
    let full_dag = get_dag_view(ws_root, &DagQuery::default()).expect("full dag");
    assert_eq!(full_dag.nodes.len(), 3);
    assert_eq!(full_dag.stats.total, 3);
    assert_eq!(full_dag.stats.ready, 3);

    // Filter by repo
    let bw_dag = get_dag_view(
        ws_root,
        &DagQuery {
            repo: Some("benchwork".into()),
            ..Default::default()
        },
    )
    .expect("bw dag");
    assert_eq!(bw_dag.nodes.len(), 1);
    assert_eq!(bw_dag.nodes[0].ticket_key, "BW-1");

    // 5. Test mutation routing: claim member task
    let briefing = claim_task_lease(ws_root, "BW-1", "agent-test", Some("feat/test-branch"))
        .expect("claim lease");
    assert_eq!(briefing.task.ticket_key, "BW-1");
    assert_eq!(briefing.task.status, TaskStatus::InProgress);

    // Verify task briefing resolves
    let fetched = get_task_briefing(ws_root, "BW-1").expect("get briefing");
    assert_eq!(fetched.task.ticket_key, "BW-1");
    assert_eq!(fetched.task.status, TaskStatus::InProgress);

    // 6. Test cross-store link: BW-1 blocked by MTR-1
    link_tasks_service(ws_root, "BW-1", "MTR-1", "blocked_by").expect("link tasks");
    let updated_dag = get_dag_view(ws_root, &DagQuery::default()).expect("updated dag");
    let bw_node = updated_dag
        .nodes
        .iter()
        .find(|t| t.ticket_key == "BW-1")
        .expect("find bw");
    assert_eq!(bw_node.status, TaskStatus::Blocked);
    assert_eq!(bw_node.edges.len(), 1);

    // 7. Test capabilities scanner workspace rollup
    let caps = scan_capabilities(ws_root).expect("scan capabilities");
    assert!(caps.storypole_active);
    assert_eq!(caps.task_counts.get("ready"), Some(&2));
    assert_eq!(caps.task_counts.get("blocked"), Some(&1));

    // 8. Test chat harness plan resolution in member dot_dir
    let plans_dir = bw_dir.join(".storypole").join("plans");
    fs::create_dir_all(&plans_dir).expect("create plans dir");
    fs::write(
        plans_dir.join("BW-1.md"),
        "# Plan for BW-1\nExecution steps:\n1. Build panel",
    )
    .expect("write plan");

    let prompt = "Please review @task:BW-1 before execution";
    let expanded = expand_user_prompt(prompt, ws_root).expect("expand prompt");
    assert!(expanded.contains("<!-- Context for @task:BW-1 -->"));
    assert!(expanded.contains("Build panel"));
}
