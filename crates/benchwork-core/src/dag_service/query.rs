//! DAG query, task context briefing, and topological sort services.

use std::collections::BTreeMap;
use std::path::Path;

use storypole_core::dag::briefing::build_task_briefing;
use storypole_core::dag::topological_sort;
use storypole_core::index::query::{get_all_tasks, get_task_by_id, resolve_task_id};
use storypole_core::model::events::TaskContextBriefing;
use storypole_core::model::task::{TaskNode, TaskStatus};
use storypole_core::{StorypoleStore, StorypoleWorkspaceStore};
use uuid::Uuid;

use crate::error::{BenchworkError, Result};
use crate::model::{DagQuery, DagStats, DagView};

/// Queries tasks according to `DagQuery` and computes topological order and summary stats.
pub fn get_dag_view(root_path: &Path, query: &DagQuery) -> Result<DagView> {
    if let Ok(ws) = StorypoleWorkspaceStore::open(root_path) {
        let all_tasks =
            get_all_tasks(ws.conn()).map_err(|e| BenchworkError::Storypole(e.to_string()))?;
        return Ok(build_dag_view_from_tasks(all_tasks, query));
    }

    let store = match StorypoleStore::open(root_path) {
        Ok(s) => s,
        Err(_) => {
            return Ok(DagView {
                nodes: Vec::new(),
                topological_order: Vec::new(),
                stats: DagStats::default(),
            });
        }
    };

    let all_tasks =
        get_all_tasks(store.conn()).map_err(|e| BenchworkError::Storypole(e.to_string()))?;
    Ok(build_dag_view_from_tasks(all_tasks, query))
}

fn build_dag_view_from_tasks(all_tasks: BTreeMap<Uuid, TaskNode>, query: &DagQuery) -> DagView {
    let mut stats = DagStats::default();
    let mut filtered_nodes = Vec::new();

    for task in all_tasks.values() {
        let status_str = format!("{:?}", task.status).to_lowercase();
        let kind_str = format!("{:?}", task.kind).to_lowercase();

        let matches_repo = query
            .repo
            .as_ref()
            .is_none_or(|r| task.scope.repo.as_ref() == Some(r));
        let matches_crate = query
            .crate_name
            .as_ref()
            .is_none_or(|c| task.scope.crate_name.as_ref() == Some(c));
        let matches_status = query.status.as_ref().is_none_or(|s| &status_str == s);
        let matches_kind = query.kind.as_ref().is_none_or(|k| &kind_str == k);
        let has_pending = task.decisions.iter().any(|d| d.chosen_option.is_none());
        let matches_decision = query.needs_decision.is_none_or(|nd| nd == has_pending);

        let is_archived = task.status == TaskStatus::Archived;
        let allow_archived = query.include_archived || query.status.as_deref() == Some("archived");
        if is_archived && !allow_archived {
            continue;
        }

        if matches_repo && matches_crate && matches_status && matches_kind && matches_decision {
            stats.total += 1;
            match task.status {
                TaskStatus::Ready => stats.ready += 1,
                TaskStatus::InProgress | TaskStatus::Synthesizing | TaskStatus::Verifying => {
                    stats.in_progress += 1;
                }
                TaskStatus::Verified => stats.verified += 1,
                TaskStatus::Blocked => stats.blocked += 1,
                TaskStatus::Deferred => stats.deferred += 1,
                TaskStatus::Archived => stats.archived += 1,
                _ => {}
            }
            filtered_nodes.push(task.clone());
        }
    }

    let topological_order = if let Ok(order) = topological_sort(&all_tasks) {
        order
            .into_iter()
            .filter_map(|uid| all_tasks.get(&uid).map(|t| t.ticket_key.clone()))
            .collect()
    } else {
        let mut keys: Vec<String> = all_tasks.values().map(|t| t.ticket_key.clone()).collect();
        keys.sort();
        keys
    };

    DagView {
        nodes: filtered_nodes,
        topological_order,
        stats,
    }
}

/// Resolves task context briefing including inherited decisions, handoffs, and verification commands.
pub fn get_task_briefing(root_path: &Path, task_id_or_key: &str) -> Result<TaskContextBriefing> {
    if let Ok(mut ws) = StorypoleWorkspaceStore::open(root_path)
        && let Ok(task_id) = resolve_task_id(ws.conn(), task_id_or_key)
        && let Ok(task) = get_task_by_id(ws.conn(), task_id)
    {
        let all_tasks =
            get_all_tasks(ws.conn()).map_err(|e| BenchworkError::Storypole(e.to_string()))?;
        let now = StorypoleStore::now_ms();
        let governing = ws.resolve_governing_store_name(task_id_or_key);
        let cfg = if let Some(ref g) = governing
            && let Some(store) = ws.member_store_mut(g)
        {
            Some(store.config().clone())
        } else {
            ws.root_store_mut().map(|s| s.config().clone())
        };
        let config = cfg.unwrap_or_default();
        return Ok(build_task_briefing(&task, &all_tasks, &config, now));
    }

    let store =
        StorypoleStore::open(root_path).map_err(|e| BenchworkError::Storypole(e.to_string()))?;

    let task_id = resolve_task_id(store.conn(), task_id_or_key)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

    let task = get_task_by_id(store.conn(), task_id)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

    let all_tasks =
        get_all_tasks(store.conn()).map_err(|e| BenchworkError::Storypole(e.to_string()))?;

    let now = StorypoleStore::now_ms();
    Ok(build_task_briefing(&task, &all_tasks, store.config(), now))
}
