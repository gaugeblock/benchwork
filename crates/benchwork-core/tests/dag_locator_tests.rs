//! A cross-repository edge is nameable even when its target is not in this checkout (`SP-38`).
//!
//! The defect these pin: the board's layout dropped every edge whose target was missing from the task map,
//! so a member clone showing twelve edges to a root epic looked complete. Naming the state is the first
//! half of the fix - `DagView::unresolved_edges` with the locator, and a count in `DagStats` so an
//! operator knows the graph is short rather than assuming it is whole.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use benchwork_core::dag_service::query::get_dag_view;
use benchwork_core::model::{DagQuery, UnresolvedEdge};
use storypole_core::StorypoleConfig;
use storypole_core::model::task::EdgeKind;
use storypole_core::ops::graph::{EdgeTarget, link_tasks, link_to_target};
use storypole_core::ops::mutations::{CreateTaskParams, add_task};
use storypole_core::store::StorypoleStore;
use tempfile::tempdir;
use uuid::Uuid;

fn store(root: &std::path::Path) -> StorypoleStore {
    std::fs::create_dir_all(root.join(".gaugeblock").join("storypole").join("tickets"))
        .expect("store dir");
    let store = StorypoleStore::init(
        root,
        StorypoleConfig {
            ticket_prefix: "BW".to_string(),
            ..StorypoleConfig::default()
        },
    )
    .expect("init");
    std::fs::remove_dir_all(root.join(".storypole")).ok();
    store
}

fn add(store: &mut StorypoleStore, title: &str) -> storypole_core::model::TaskNode {
    add_task(
        store,
        CreateTaskParams {
            title: title.to_string(),
            ..Default::default()
        },
    )
    .expect("add task")
}

#[test]
fn an_edge_to_another_repository_is_named_rather_than_dropped() {
    let tmp = tempdir().expect("tempdir");
    let mut store = store(tmp.path());
    let local = add(&mut store, "Work in this checkout");

    // A target that lives in another repository: identity plus locator, no node here to read.
    let foreign = EdgeTarget {
        id: Uuid::new_v4(),
        key: "MTR-1".to_string(),
        repo: Some("miter".to_string()),
        verified: false,
    };
    link_to_target(&mut store, local.id, &foreign, EdgeKind::BlockedBy).expect("cross-store link");

    let view = get_dag_view(tmp.path(), &DagQuery::default()).expect("view");

    assert_eq!(view.stats.unresolved_edges, 1, "the count is reported");
    assert_eq!(view.unresolved_edges.len(), 1);
    let edge = &view.unresolved_edges[0];
    assert_eq!(edge.source, "BW-1");
    assert_eq!(edge.kind, EdgeKind::BlockedBy);
    assert_eq!(
        edge.label(),
        "MTR-1 (miter)",
        "a reader sees the key and its repository, not a uuid"
    );
}

#[test]
fn an_edge_inside_the_checkout_is_resolved_and_not_counted() {
    let tmp = tempdir().expect("tempdir");
    let mut store = store(tmp.path());
    let first = add(&mut store, "First");
    let second = add(&mut store, "Second");
    link_tasks(&mut store, first.id, second.id, EdgeKind::BlockedBy).expect("local link");

    let view = get_dag_view(tmp.path(), &DagQuery::default()).expect("view");
    assert_eq!(
        view.stats.unresolved_edges, 0,
        "an edge whose target is here is not unresolved"
    );
}

#[test]
fn an_edge_with_no_locator_still_renders_something_findable() {
    let edge = UnresolvedEdge {
        source: "BW-1".to_string(),
        kind: EdgeKind::RelatedTo,
        target_id: "9f2b9c8c-676d-43f7-a0eb-57e8d62e5453".to_string(),
        target_key: None,
        target_repo: None,
    };
    assert_eq!(edge.label(), "9f2b9c8c", "a uuid prefix is searchable");

    let keyed = UnresolvedEdge {
        target_key: Some("SP-29".to_string()),
        target_repo: None,
        ..edge
    };
    assert_eq!(
        keyed.label(),
        "SP-29",
        "a key without a repository is enough"
    );
}
