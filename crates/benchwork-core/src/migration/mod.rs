//! Unified `.gaugeblock/` migration engine and configuration consolidation.

pub mod consolidator;
pub mod discovery;
pub mod engine;
pub mod types;

#[cfg(test)]
mod tests;

pub use consolidator::{canonical_gaugeblock_gitignore, consolidate_configs};
pub use discovery::discover_migration;
pub use engine::execute_migration;
pub use types::{
    MigrationItem, MigrationItemKind, MigrationItemStatus, MigrationPlan, MigrationReceipt,
};

