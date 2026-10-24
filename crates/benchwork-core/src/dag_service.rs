//! Backlog query, DAG topology, task context briefing, and handoff services.

use std::path::Path;

use storypole_core::StorypoleStore;
use storypole_core::dag::briefing::build_task_briefing;
use storypole_core::dag::topological_sort;
use storypole_core::index::query::{get_all_tasks, get_task_by_id, resolve_task_id};
use storypole_core::model::decision::HandoffPacket;
use storypole_core::model::events::{LedgerEvent, TaskContextBriefing};
use storypole_core::model::task::TaskStatus;
use storypole_core::ops::mutations::{UpdateTaskParams, update_task};
use storypole_core::ops::workflow::claim_task;

use crate::error::{BenchworkError, Result};
use crate::model::{DagQuery, DagStats, DagView};

/// Queries tasks according to `DagQuery` and computes topological order and summary stats.
pub fn get_dag_view(root_path: &Path, query: &DagQuery) -> Result<DagView> {
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

        if matches_repo && matches_crate && matches_status && matches_kind && matches_decision {
            stats.total += 1;
            match task.status {
                TaskStatus::Ready => stats.ready += 1,
                TaskStatus::InProgress | TaskStatus::Synthesizing | TaskStatus::Verifying => {
                    stats.in_progress += 1;
                }
                TaskStatus::Verified => stats.verified += 1,
                TaskStatus::Blocked => stats.blocked += 1,
                _ => {}
            }
            filtered_nodes.push(task.clone());
        }
    }

    // Compute topological order over all tasks
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

    Ok(DagView {
        nodes: filtered_nodes,
        topological_order,
        stats,
    })
}

/// Resolves task context briefing including inherited decisions, handoffs, and verification commands.
pub fn get_task_briefing(root_path: &Path, task_id_or_key: &str) -> Result<TaskContextBriefing> {
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

/// Claims an agent lease on a task, transitioning state to `InProgress`.
pub fn claim_task_lease(
    root_path: &Path,
    task_id_or_key: &str,
    agent_id: &str,
    branch: Option<&str>,
) -> Result<TaskContextBriefing> {
    let mut store =
        StorypoleStore::open(root_path).map_err(|e| BenchworkError::Storypole(e.to_string()))?;

    let task_id = resolve_task_id(store.conn(), task_id_or_key)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

    claim_task(&mut store, task_id, agent_id, branch)
        .map_err(|e| BenchworkError::Storypole(e.to_string()))
}

/// Records an agent handoff packet when pausing or yielding a task.
pub fn record_task_handoff(
    root_path: &Path,
    task_id_or_key: &str,
    handoff: HandoffPacket,
    new_status: TaskStatus,
) -> Result<()> {
    let mut store =
        StorypoleStore::open(root_path).map_err(|e| BenchworkError::Storypole(e.to_string()))?;

    let task_id = resolve_task_id(store.conn(), task_id_or_key)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

    store
        .record_event(&LedgerEvent::HandoffRecorded {
            task_id,
            handoff,
            new_status,
        })
        .map_err(|e| BenchworkError::Storypole(e.to_string()))
}

/// Mutates an existing task's fields and scope.
pub fn update_task_details(
    root_path: &Path,
    task_id_or_key: &str,
    params: UpdateTaskParams,
) -> Result<TaskContextBriefing> {
    let mut store =
        StorypoleStore::open(root_path).map_err(|e| BenchworkError::Storypole(e.to_string()))?;

    let task_id = resolve_task_id(store.conn(), task_id_or_key)
        .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;

    update_task(&mut store, task_id, params)
        .map_err(|e| BenchworkError::Storypole(e.to_string()))?;

    get_task_briefing(root_path, task_id_or_key)
}
