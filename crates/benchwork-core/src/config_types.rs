//! Data structures for Universal API and sawhorse.toml model configuration.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Wire format for universal model fallback and per-role overrides.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UniversalModelConfig {
    pub use_universal_fallback: bool,
    pub provider: String,
    pub model_name: String,
    pub base_url: Option<String>,
    pub api_key_env: Option<String>,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default = "default_mode")]
    pub mode: String,
    #[serde(default)]
    pub role_overrides: BTreeMap<String, RoleOverrideConfig>,
}

fn default_mode() -> String {
    "openai_compatible".to_string()
}

/// Override configuration for a specific semantic role.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RoleOverrideConfig {
    pub enabled: bool,
    pub provider: String,
    pub model_name: String,
    pub base_url: Option<String>,
    #[serde(default)]
    pub api_key: Option<String>,
    pub api_key_env: Option<String>,
    pub mode: String,
}

/// Request payload to test model inference connectivity and latency.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TestInferenceRequest {
    pub provider: String,
    pub model_name: String,
    pub base_url: Option<String>,
    #[serde(default)]
    pub api_key: Option<String>,
    pub api_key_env: Option<String>,
    pub mode: String,
}

/// Response receipt with latency and status.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TestInferenceReceipt {
    pub success: bool,
    pub latency_ms: u64,
    pub model_used: String,
    pub message: String,
}

/// Request to discover available models from an OpenAI-compatible endpoint.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoverModelsRequest {
    pub base_url: String,
    pub api_key: Option<String>,
    pub api_key_env: Option<String>,
}

/// Response containing discovered model identifiers.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiscoverModelsResponse {
    pub success: bool,
    pub models: Vec<String>,
    pub message: String,
}

impl Default for UniversalModelConfig {
    fn default() -> Self {
        Self {
            use_universal_fallback: true,
            provider: "DeepSeek".to_string(),
            model_name: "deepseek-coder".to_string(),
            base_url: Some("https://api.deepseek.com/v1".to_string()),
            api_key_env: Some("DEEPSEEK_API_KEY".to_string()),
            mode: "openai_compatible".to_string(),
            role_overrides: BTreeMap::new(),
        }
    }
}
