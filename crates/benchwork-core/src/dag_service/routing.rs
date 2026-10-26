//! Multi-repo workspace and standalone store routing helpers.

use std::path::Path;

use storypole_core::index::query::resolve_task_id;
use storypole_core::model::task::EdgeKind;
use storypole_core::ops::graph::link_tasks as storypole_link;
use storypole_core::{StorypoleStore, StorypoleWorkspaceStore};
use uuid::Uuid;

use crate::error::{BenchworkError, Result};

/// Resolves the governing store and executes a mutating operation on it.
pub fn with_governing_store<F, R>(
    root_path: &Path,
    task_id_or_key: &str,
    mutate_fn: F,
) -> Result<R>
where
    F: FnOnce(&mut StorypoleStore, Uuid) -> Result<R>,
{
    if let Ok(mut ws) = StorypoleWorkspaceStore::open(root_path) {
        let task_id = resolve_task_id(ws.conn(), task_id_or_key)
            .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

        let governing_repo = ws.resolve_governing_store_name(task_id_or_key);
        let res = if let Some(repo) = governing_repo {
            if let Some(store) = ws.member_store_mut(&repo) {
                mutate_fn(store, task_id)?
            } else {
                return Err(BenchworkError::Storypole(format!(
                    "Governing store '{repo}' not found in workspace"
                )));
            }
        } else if let Some(root_store) = ws.root_store_mut() {
            mutate_fn(root_store, task_id)?
        } else {
            return Err(BenchworkError::TaskNotFound(format!(
                "Task '{task_id_or_key}' not found in any store"
            )));
        };

        ws.sync_all_members()
            .map_err(|e| BenchworkError::Storypole(e.to_string()))?;
        return Ok(res);
    }

    let mut store =
        StorypoleStore::open(root_path).map_err(|e| BenchworkError::Storypole(e.to_string()))?;
    let task_id = resolve_task_id(store.conn(), task_id_or_key)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;
    mutate_fn(&mut store, task_id)
}

/// Routes task linking between tasks across member stores or within a standalone store.
pub fn route_link_tasks(
    root_path: &Path,
    source_key: &str,
    target_key: &str,
    kind_str: &str,
) -> Result<()> {
    let kind = match kind_str.to_lowercase().as_str() {
        "related_to" => EdgeKind::RelatedTo,
        "parent_epic" => EdgeKind::ParentEpic,
        "discovered_from" => EdgeKind::DiscoveredFrom,
        _ => EdgeKind::BlockedBy,
    };

    if let Ok(mut ws) = StorypoleWorkspaceStore::open(root_path) {
        let source_id = resolve_task_id(ws.conn(), source_key)
            .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;
        let target_id = resolve_task_id(ws.conn(), target_key)
            .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;
        let target_node = storypole_core::index::query::get_task_by_id(ws.conn(), target_id)
            .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

        let governing_repo = ws.resolve_governing_store_name(source_key);
        let store = if let Some(repo) = governing_repo {
            ws.member_store_mut(&repo).ok_or_else(|| {
                BenchworkError::Storypole(format!("Governing store '{repo}' not found"))
            })?
        } else if let Some(root_store) = ws.root_store_mut() {
            root_store
        } else {
            return Err(BenchworkError::TaskNotFound(format!(
                "Task '{source_key}' not found"
            )));
        };

        if storypole_core::index::query::get_task_by_id(store.conn(), target_id).is_err() {
            storypole_core::index::insert_task_record(store.conn(), &target_node)
                .map_err(|e| BenchworkError::Storypole(e.to_string()))?;
        }

        storypole_link(store, source_id, target_id, kind)
            .map_err(|e| BenchworkError::Storypole(e.to_string()))?;

        ws.sync_all_members()
            .map_err(|e| BenchworkError::Storypole(e.to_string()))?;
        return Ok(());
    }

    let mut store =
        StorypoleStore::open(root_path).map_err(|e| BenchworkError::Storypole(e.to_string()))?;
    let source_id = resolve_task_id(store.conn(), source_key)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;
    let target_id = resolve_task_id(store.conn(), target_key)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

    storypole_link(&mut store, source_id, target_id, kind)
        .map_err(|e| BenchworkError::Storypole(e.to_string()))
}

