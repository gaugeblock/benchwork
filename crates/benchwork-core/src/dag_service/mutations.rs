//! Task mutation services: claim, handoff, update, link, split, archive.

use std::path::Path;

use storypole_core::model::decision::HandoffPacket;
use storypole_core::model::events::{LedgerEvent, TaskContextBriefing};
use storypole_core::model::task::{TaskNode, TaskStatus};
use storypole_core::ops::archive::{
    archive_task as storypole_archive, unarchive_task as storypole_unarchive,
};
use storypole_core::ops::graph::split_task as storypole_split;
use storypole_core::ops::mutations::{UpdateTaskParams, update_task};
use storypole_core::ops::workflow::claim_task;

use super::query::get_task_briefing;
use super::routing::{route_link_tasks, with_governing_store};
use crate::error::{BenchworkError, Result};

/// Claims an agent lease on a task, transitioning state to `InProgress`.
pub fn claim_task_lease(
    root_path: &Path,
    task_id_or_key: &str,
    agent_id: &str,
    branch: Option<&str>,
) -> Result<TaskContextBriefing> {
    with_governing_store(root_path, task_id_or_key, |store, task_id| {
        claim_task(store, task_id, agent_id, branch)
            .map_err(|e| BenchworkError::Storypole(e.to_string()))
    })
}

/// Records an agent handoff packet when pausing or yielding a task.
pub fn record_task_handoff(
    root_path: &Path,
    task_id_or_key: &str,
    handoff: HandoffPacket,
    new_status: TaskStatus,
) -> Result<()> {
    with_governing_store(root_path, task_id_or_key, |store, task_id| {
        store
            .record_event(&LedgerEvent::HandoffRecorded {
                task_id,
                handoff,
                new_status,
            })
            .map_err(|e| BenchworkError::Storypole(e.to_string()))
    })
}

/// Mutates an existing task's fields and scope.
pub fn update_task_details(
    root_path: &Path,
    task_id_or_key: &str,
    params: UpdateTaskParams,
) -> Result<TaskContextBriefing> {
    with_governing_store(root_path, task_id_or_key, |store, task_id| {
        update_task(store, task_id, params).map_err(|e| BenchworkError::Storypole(e.to_string()))
    })?;

    get_task_briefing(root_path, task_id_or_key)
}

/// Connect two tasks with a directed edge (BlockedBy, RelatedTo, ParentEpic).
pub fn link_tasks_service(
    root_path: &Path,
    source_key: &str,
    target_key: &str,
    kind_str: &str,
) -> Result<()> {
    route_link_tasks(root_path, source_key, target_key, kind_str)
}

/// Split an oversized task into a parent Epic and child subtasks.
pub fn split_task_service(
    root_path: &Path,
    parent_key: &str,
    subtasks: Vec<String>,
    sequential: bool,
) -> Result<Vec<TaskNode>> {
    with_governing_store(root_path, parent_key, |store, parent_id| {
        storypole_split(store, parent_id, subtasks, sequential)
            .map_err(|e| BenchworkError::Storypole(e.to_string()))
    })
}

/// Archives a task (typically completed or verified), hiding it from the active DAG view.
pub fn archive_task_service(root_path: &Path, task_id_or_key: &str) -> Result<()> {
    with_governing_store(root_path, task_id_or_key, |store, task_id| {
        storypole_archive(store, task_id).map_err(|e| BenchworkError::Storypole(e.to_string()))
    })
}

/// Result summary of a bulk archive operation.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default, PartialEq, Eq)]
pub struct BulkArchiveResult {
    pub archived_count: usize,
    pub errors: Vec<String>,
}

/// Archives multiple tasks in a batch across governing stores.
pub fn bulk_archive_tasks_service(
    root_path: &Path,
    task_ids: &[String],
) -> Result<BulkArchiveResult> {
    let mut result = BulkArchiveResult::default();
    for id in task_ids {
        match archive_task_service(root_path, id) {
            Ok(()) => result.archived_count += 1,
            Err(e) => result.errors.push(format!("{id}: {e}")),
        }
    }
    Ok(result)
}

/// Unarchives an archived task, restoring it to its previous state (or Verified).
pub fn unarchive_task_service(root_path: &Path, task_id_or_key: &str) -> Result<()> {
    with_governing_store(root_path, task_id_or_key, |store, task_id| {
        storypole_unarchive(store, task_id)
            .map(|_| ())
            .map_err(|e| BenchworkError::Storypole(e.to_string()))
    })
}
