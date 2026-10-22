//! Model modules for `benchwork-core`.

pub mod dag;
pub mod hub;
pub mod spec;
pub mod synthesis;

pub use dag::{DagQuery, DagStats, DagView};
pub use hub::{
    InferencePingRequest, InferencePingResponse, ModelHubStatus, UiSnapshot, WorkspaceCapabilities,
};
pub use spec::{
    ContractPreviewRequest, ContractPreviewResponse, DecisionResolutionReceipt, PendingDecision,
    ResolveDecisionRequest, SpecBundle, SpecDocsStatus,
};
pub use synthesis::{HoleCompileRequest, HoleCompileResponse, LiveEvent, SynthesisRunRequest};
