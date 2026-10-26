//! Request and response payloads for DAG and task mutation endpoints.

use serde::{Deserialize, Serialize};

/// Request payload for claiming an agent lease on a task.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ClaimTaskPayload {
    pub agent_id: String,
    pub branch: Option<String>,
}

/// Request payload for recording an agent handoff packet.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct HandoffTaskPayload {
    pub recorded_by_agent: String,
    pub completed_items: Vec<String>,
    pub remaining_items: Vec<String>,
    pub last_error_or_blocker: Option<String>,
    pub dirty_files: Option<Vec<String>>,
    pub status: Option<String>,
}

/// Request payload for mutating a task's details and scope.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateTaskPayload {
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<u8>,
    pub repo: Option<String>,
    pub crate_name: Option<String>,
    pub module_path: Option<String>,
    pub target_files: Option<Vec<String>>,
    pub target_symbols: Option<Vec<String>>,
    pub labels: Option<Vec<String>>,
    pub acceptance_criteria: Option<Vec<String>>,
}

/// Request payload for connecting tasks with a directed edge.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct LinkTasksPayload {
    pub target_id: String,
    pub kind: Option<String>,
}

/// Request payload for splitting an oversized task into subtasks.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SplitTaskPayload {
    pub subtasks: Vec<String>,
    pub sequential: Option<bool>,
}

/// Request payload for archiving multiple tasks in a batch.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BulkArchiveRequest {
    pub task_ids: Vec<String>,
}

/// Response payload from a bulk archiving operation.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BulkArchiveResponse {
    pub archived_count: usize,
    pub errors: Vec<String>,
}
