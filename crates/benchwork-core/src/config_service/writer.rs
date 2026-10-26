//! Writer operations for Sawhorse and Gaugeblock configuration.

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use sawhorse_core::config::schema::{
    OpenAiDialect, ProviderConfig, RoleConfig, SawhorseConfig, TimeoutConfig,
};
use sawhorse_core::types::{ExecutionMode, ModelRole};

use crate::config_types::UniversalModelConfig;
use crate::error::{BenchworkError, Result};

/// Safely writes updated `UniversalModelConfig` to `sawhorse.toml` and `.gaugeblock/config.toml`.
pub fn write_sawhorse_config(root_path: &Path, config: &UniversalModelConfig) -> Result<()> {
    let mut providers = HashMap::new();
    let mut roles = HashMap::new();

    let primary_mode = build_provider_mode(
        &config.mode,
        &config.model_name,
        config.base_url.as_deref(),
        config.api_key_env.as_deref(),
    );

    providers.insert(
        "universal".to_string(),
        ProviderConfig {
            mode: primary_mode,
            dialect: Some(OpenAiDialect::StandardOpenAi),
            headers: None,
            timeout_ms: None,
        },
    );

    let all_roles = [
        ("planner", ModelRole::Planner),
        ("system1_router", ModelRole::System1Router),
        ("hole_filler", ModelRole::HoleFiller),
        ("oracle", ModelRole::Oracle),
    ];

    for (role_str, role_enum) in all_roles {
        let mut target_provider = "universal".to_string();

        if let Some(override_cfg) = config.role_overrides.get(role_str)
            && override_cfg.enabled
        {
            let prov_name = format!("role_{role_str}");
            let prov_mode = build_provider_mode(
                &override_cfg.mode,
                &override_cfg.model_name,
                override_cfg.base_url.as_deref(),
                override_cfg.api_key_env.as_deref(),
            );

            providers.insert(
                prov_name.clone(),
                ProviderConfig {
                    mode: prov_mode,
                    dialect: Some(OpenAiDialect::StandardOpenAi),
                    headers: None,
                    timeout_ms: None,
                },
            );
            target_provider = prov_name;
        }

        roles.insert(
            role_enum,
            RoleConfig {
                provider: target_provider,
                fallback: vec!["universal".to_string()],
            },
        );
    }

    let toml_struct = SawhorseConfig {
        providers,
        roles,
        timeouts: TimeoutConfig::default(),
    };

    let serialized = toml::to_string_pretty(&toml_struct)
        .map_err(|e| BenchworkError::InvalidRequest(format!("Failed to serialize TOML: {e}")))?;

    // Update .gaugeblock/config.toml if present
    let gb_config_path = root_path.join(".gaugeblock").join("config.toml");
    if gb_config_path.is_file()
        && let Ok(raw) = fs::read_to_string(&gb_config_path)
        && let Ok(mut val) = toml::from_str::<toml::Value>(&raw)
        && let Ok(sawhorse_val) = toml::Value::try_from(&toml_struct)
        && let Some(table) = val.as_table_mut()
    {
        table.insert("sawhorse".to_string(), sawhorse_val);
        if let Ok(new_toml) = toml::to_string_pretty(&val) {
            let _ = fs::write(&gb_config_path, new_toml);
        }
    }

    let out_path = root_path.join("sawhorse.toml");
    let _ = fs::write(&out_path, serialized);

    if let Some(ref key) = config.api_key
        && !key.trim().is_empty()
    {
        let env_var = config.api_key_env.as_deref().unwrap_or("OPENAI_API_KEY");
        crate::credentials::persist_credential(root_path, env_var, key)?;
    }

    for override_cfg in config.role_overrides.values() {
        if override_cfg.enabled
            && let Some(ref key) = override_cfg.api_key
            && !key.trim().is_empty()
            && let Some(ref env_var) = override_cfg.api_key_env
        {
            let _ = crate::credentials::persist_credential(root_path, env_var, key);
        }
    }

    Ok(())
}

fn build_provider_mode(
    mode: &str,
    model_name: &str,
    base_url: Option<&str>,
    api_key_env: Option<&str>,
) -> ExecutionMode {
    match mode {
        "local_runtime" => ExecutionMode::LocalRuntime {
            model_id: model_name.to_string(),
            endpoint_or_path: base_url.unwrap_or("http://127.0.0.1:8080").to_string(),
        },
        "in_house_candle" => ExecutionMode::InHouseCandle {
            model_id: model_name.to_string(),
            weights_path: base_url.unwrap_or("weights.safetensors").to_string(),
        },
        _ => ExecutionMode::OpenAiCompatible {
            base_url: base_url.unwrap_or("https://api.openai.com/v1").to_string(),
            api_key_env: api_key_env.unwrap_or("OPENAI_API_KEY").to_string(),
            model_name: model_name.to_string(),
        },
    }
}
