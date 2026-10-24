//! DAG and task query models.

use serde::{Deserialize, Serialize};
use storypole_core::TaskNode;

/// Filter parameters for DAG board queries.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct DagQuery {
    /// Filter by repo name.
    pub repo: Option<String>,
    /// Filter by crate name.
    pub crate_name: Option<String>,
    /// Filter by status string.
    pub status: Option<String>,
    /// Filter by task kind.
    pub kind: Option<String>,
    /// Filter for tasks having unresolved decisions.
    pub needs_decision: Option<bool>,
    /// Include archived tasks in response (default: false).
    #[serde(default)]
    pub include_archived: bool,
}

/// Topological DAG response structure.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DagView {
    /// Filtered task nodes.
    pub nodes: Vec<TaskNode>,
    /// Topologically sorted task keys or IDs.
    pub topological_order: Vec<String>,
    /// Summary counters.
    pub stats: DagStats,
}

/// Task state distribution counters.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct DagStats {
    /// Total matching tasks.
    pub total: usize,
    /// Tasks in ready state.
    pub ready: usize,
    /// Tasks in progress.
    pub in_progress: usize,
    /// Verified completed tasks.
    pub verified: usize,
    /// Blocked tasks.
    pub blocked: usize,
    /// Archived tasks.
    pub archived: usize,
}
