//! Reader operations for Sawhorse and Gaugeblock configuration.

use std::path::Path;

use sawhorse_core::config::schema::SawhorseConfig;
use sawhorse_core::types::{ExecutionMode, ModelRole};

use crate::config_types::{RoleOverrideConfig, UniversalModelConfig};
use crate::error::Result;

/// Reads the active Sawhorse configuration from the workspace root or returns defaults.
pub fn read_sawhorse_config(root_path: &Path) -> Result<UniversalModelConfig> {
    crate::credentials::load_credentials(root_path);
    let parsed = match load_raw_sawhorse_config(root_path) {
        Some(cfg) => cfg,
        None => return Ok(UniversalModelConfig::default()),
    };

    let mut universal = UniversalModelConfig::default();

    if let Some(prov) = parsed
        .providers
        .get("universal")
        .or_else(|| parsed.providers.values().next())
    {
        extract_provider_mode(&prov.mode, &mut universal);
    }

    if let Some(ref env_var) = universal.api_key_env {
        universal.api_key = crate::credentials::resolve_credential(root_path, env_var);
    }

    for (role_enum, role_cfg) in &parsed.roles {
        if role_cfg.provider != "universal"
            && let Some(prov_cfg) = parsed.providers.get(&role_cfg.provider)
        {
            let role_str = match role_enum {
                ModelRole::Planner => "planner",
                ModelRole::System1Router => "system1_router",
                ModelRole::HoleFiller => "hole_filler",
                ModelRole::Oracle => "oracle",
            };
            let (mode, prov_name, model_name, base_url, api_key_env) =
                parse_prov_mode(&prov_cfg.mode);
            let api_key = api_key_env
                .as_ref()
                .and_then(|k| crate::credentials::resolve_credential(root_path, k));
            universal.role_overrides.insert(
                role_str.to_string(),
                RoleOverrideConfig {
                    enabled: true,
                    provider: prov_name,
                    model_name,
                    base_url,
                    api_key,
                    api_key_env,
                    mode,
                },
            );
        }
    }

    Ok(universal)
}

fn load_raw_sawhorse_config(root_path: &Path) -> Option<SawhorseConfig> {
    let gb_path = root_path.join(".gaugeblock").join("config.toml");
    if gb_path.is_file()
        && let Ok(cfg) = SawhorseConfig::load_from_path(&gb_path)
    {
        return Some(cfg);
    }

    let local_path = root_path.join("sawhorse.toml");
    if local_path.is_file()
        && let Ok(cfg) = SawhorseConfig::load_from_path(&local_path)
    {
        return Some(cfg);
    }

    None
}

fn extract_provider_mode(mode: &ExecutionMode, universal: &mut UniversalModelConfig) {
    match mode {
        ExecutionMode::OpenAiCompatible {
            base_url,
            api_key_env,
            model_name,
        } => {
            universal.provider = "Remote API".to_string();
            universal.model_name = model_name.clone();
            universal.base_url = Some(base_url.clone());
            universal.api_key_env = Some(api_key_env.clone());
            universal.mode = "openai_compatible".to_string();
        }
        ExecutionMode::LocalRuntime {
            model_id,
            endpoint_or_path,
        } => {
            universal.provider = "Local GGUF".to_string();
            universal.model_name = model_id.clone();
            universal.base_url = Some(endpoint_or_path.clone());
            universal.api_key_env = None;
            universal.mode = "local_runtime".to_string();
        }
        ExecutionMode::InHouseCandle {
            model_id,
            weights_path,
        } => {
            universal.provider = "Candle Micro-Weights".to_string();
            universal.model_name = model_id.clone();
            universal.base_url = Some(weights_path.clone());
            universal.api_key_env = None;
            universal.mode = "in_house_candle".to_string();
        }
    }
}

fn parse_prov_mode(
    mode: &ExecutionMode,
) -> (String, String, String, Option<String>, Option<String>) {
    match mode {
        ExecutionMode::OpenAiCompatible {
            base_url,
            api_key_env,
            model_name,
        } => (
            "openai_compatible".to_string(),
            "Remote API".to_string(),
            model_name.clone(),
            Some(base_url.clone()),
            Some(api_key_env.clone()),
        ),
        ExecutionMode::LocalRuntime {
            model_id,
            endpoint_or_path,
        } => (
            "local_runtime".to_string(),
            "Local GGUF".to_string(),
            model_id.clone(),
            Some(endpoint_or_path.clone()),
            None,
        ),
        ExecutionMode::InHouseCandle {
            model_id,
            weights_path,
        } => (
            "in_house_candle".to_string(),
            "Candle Micro-Weights".to_string(),
            model_id.clone(),
            Some(weights_path.clone()),
            None,
        ),
    }
}
