//! Universal API and sawhorse.toml model configuration service.

pub mod reader;
pub mod writer;

pub use reader::read_sawhorse_config;
pub use writer::write_sawhorse_config;

pub use crate::test_inference::test_inference_slot;

