//! DAG and task query models.

use serde::{Deserialize, Serialize};
use storypole_core::TaskNode;
use storypole_core::model::task::EdgeKind;

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

/// An edge whose target this checkout cannot resolve, named by its locator (`SP-38`).
///
/// The edge itself is never dropped: since `SP-48` a cross-repository dependency is recorded with the
/// target's uuid plus a `repo:key` locator, and a checkout that does not contain the target repository can
/// still say *which* ticket the arrow points at. Before this the layout silently omitted those arrows,
/// which is how twelve edges from a member to a root epic went missing without a single warning.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UnresolvedEdge {
    /// Ticket key of the task the edge belongs to.
    pub source: String,
    /// What the edge means.
    pub kind: EdgeKind,
    /// The target's uuid, which is its identity even when it cannot be read.
    pub target_id: String,
    /// The locator's ticket key, when the edge carries one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_key: Option<String>,
    /// The repository that owns the target, when the edge carries one.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_repo: Option<String>,
}

impl UnresolvedEdge {
    /// How to render this edge to a reader who cannot open the target.
    ///
    /// The locator when there is one (`SP-29 (gaugeblock)`), the key alone when it lacks a repository, and
    /// a uuid prefix as the last resort - a truncated uuid is still better than an unexplained blank,
    /// because it is enough to search for.
    #[must_use]
    pub fn label(&self) -> String {
        match (&self.target_key, &self.target_repo) {
            (Some(key), Some(repo)) => format!("{key} ({repo})"),
            (Some(key), None) => key.clone(),
            (None, _) => self.target_id.chars().take(8).collect(),
        }
    }
}

/// Topological DAG response structure.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DagView {
    /// Filtered task nodes.
    pub nodes: Vec<TaskNode>,
    /// Topologically sorted task keys or IDs.
    pub topological_order: Vec<String>,
    /// Edges among these nodes whose target is not in this checkout, with their locators.
    #[serde(default)]
    pub unresolved_edges: Vec<UnresolvedEdge>,
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
    /// Deferred tasks.
    pub deferred: usize,
    /// Archived tasks.
    pub archived: usize,
    /// Edges in this view whose target is not in this checkout (`SP-38`).
    ///
    /// A count rather than a warning: an operator looking at a graph that is missing twelve arrows needs
    /// the number to know that it is missing them.
    pub unresolved_edges: usize,
}
