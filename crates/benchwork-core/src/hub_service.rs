//! Model router hub, test inference ping, and Rabbet telemetry spool services.

use std::collections::BTreeMap;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::time::Instant;

use joiner_core::AnonymizedSynthesisTrace;
use sawhorse_core::config::schema::SawhorseConfig;
use sawhorse_core::router::RoleRouter;
use sawhorse_core::types::{ExecutionMode, InferenceRequest, ModelRole};
use uuid::Uuid;

use crate::error::{BenchworkError, Result};
use crate::model::{InferencePingRequest, InferencePingResponse, ModelHubStatus};

/// Retrieves active Sawhorse model role bindings and all pending traces in Rabbet spool.
pub fn get_model_hub_status(root_path: &Path) -> Result<ModelHubStatus> {
    let sawhorse_path = root_path.join("sawhorse.toml");
    let config = if sawhorse_path.is_file() {
        SawhorseConfig::load_from_path(&sawhorse_path).unwrap_or_default()
    } else {
        SawhorseConfig::discover().unwrap_or_default()
    };

    let mut roles = BTreeMap::new();
    let known_roles = [
        ("planner", ModelRole::Planner),
        ("system1_router", ModelRole::System1Router),
        ("hole_filler", ModelRole::HoleFiller),
        ("oracle", ModelRole::Oracle),
    ];

    for (role_str, role_enum) in known_roles {
        if let Some(r_cfg) = config.roles.get(&role_enum) {
            if let Some(p_cfg) = config.providers.get(&r_cfg.provider) {
                let desc = match &p_cfg.mode {
                    ExecutionMode::InHouseCandle { model_id, .. } => {
                        format!("Mode 1 (Candle): {}", model_id)
                    }
                    ExecutionMode::LocalRuntime {
                        model_id,
                        endpoint_or_path,
                    } => {
                        format!("Mode 2 (Local GGUF): {} @ {}", model_id, endpoint_or_path)
                    }
                    ExecutionMode::OpenAiCompatible {
                        base_url,
                        model_name,
                        ..
                    } => {
                        format!("Mode 3 (OpenAI-Compat): {} @ {}", model_name, base_url)
                    }
                };
                roles.insert(role_str.to_string(), desc);
            }
        } else {
            roles.insert(
                role_str.to_string(),
                "Unconfigured (default fallback)".to_string(),
            );
        }
    }

    let spool_path = root_path.join(".rabbet").join("spool").join("outbox.jsonl");
    let mut spool_traces = Vec::new();
    let mut spool_counts_by_tier = BTreeMap::new();

    if spool_path.is_file()
        && let Ok(file) = File::open(&spool_path)
    {
        for line in BufReader::new(file)
            .lines()
            .map_while(std::result::Result::ok)
        {
            if let Ok(trace) = serde_json::from_str::<AnonymizedSynthesisTrace>(&line) {
                let tier_name = format!("{:?}", trace.tier).to_lowercase();
                *spool_counts_by_tier.entry(tier_name).or_insert(0) += 1;
                spool_traces.push(trace);
            }
        }
    }

    Ok(ModelHubStatus {
        roles,
        spool_traces,
        spool_counts_by_tier,
    })
}

/// Deletes a specific trace from `.rabbet/spool/outbox.jsonl` by trace ID.
pub fn delete_spool_trace(root_path: &Path, trace_id: &str) -> Result<bool> {
    let target_uuid = Uuid::parse_str(trace_id)
        .map_err(|e| BenchworkError::InvalidRequest(format!("Invalid trace UUID: {e}")))?;

    let spool_path = root_path.join(".rabbet").join("spool").join("outbox.jsonl");
    if !spool_path.is_file() {
        return Ok(false);
    }

    let file = File::open(&spool_path)?;
    let mut kept_lines = Vec::new();
    let mut deleted = false;

    for line in BufReader::new(file)
        .lines()
        .map_while(std::result::Result::ok)
    {
        if let Ok(trace) = serde_json::from_str::<AnonymizedSynthesisTrace>(&line)
            && trace.trace_id == target_uuid
        {
            deleted = true;
            continue;
        }
        kept_lines.push(line);
    }

    if deleted {
        let mut out = OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(&spool_path)?;
        for line in kept_lines {
            writeln!(out, "{}", line)?;
        }
    }

    Ok(deleted)
}

/// Executes a test inference ping against a specified model role.
pub async fn ping_inference(
    root_path: &Path,
    req: &InferencePingRequest,
) -> Result<InferencePingResponse> {
    crate::credentials::load_credentials(root_path);

    let role_enum = match req.role.to_lowercase().as_str() {
        "planner" => ModelRole::Planner,
        "system1_router" => ModelRole::System1Router,
        "hole_filler" => ModelRole::HoleFiller,
        "oracle" => ModelRole::Oracle,
        _ => ModelRole::Planner,
    };

    let start = Instant::now();
    let sawhorse_path = root_path.join("sawhorse.toml");
    let gb_config_path = root_path.join(".gaugeblock").join("config.toml");
    let config = if sawhorse_path.is_file() {
        SawhorseConfig::load_from_path(&sawhorse_path).unwrap_or_else(|_| SawhorseConfig::discover().unwrap_or_default())
    } else if gb_config_path.is_file() {
        SawhorseConfig::load_from_path(&gb_config_path).unwrap_or_else(|_| SawhorseConfig::discover().unwrap_or_default())
    } else {
        SawhorseConfig::discover().unwrap_or_default()
    };

    if let Ok(router) = RoleRouter::from_config(config) {
        let infer_req = InferenceRequest {
            role: role_enum,
            prompt: req.prompt.clone(),
            system_prompt: Some("You are a helpful software architecture and systems engineer.".to_string()),
            grammar_constraint: None,
            grammar_format: None,
            max_tokens: 1024,
            temperature: 0.2,
        };

        if let Ok(resp) = router.complete(&infer_req).await {
            return Ok(InferencePingResponse {
                role: req.role.clone(),
                text: resp.text,
                latency_ms: resp.latency_ms,
                model_used: resp.model_used,
            });
        }
    }

    // Fallback: simulated echo if provider is offline or credentials unconfigured
    let latency_ms = start.elapsed().as_millis() as u64;
    Ok(InferencePingResponse {
        role: req.role.clone(),
        text: format!("[diagnostic-echo] Received: {}", req.prompt),
        latency_ms,
        model_used: "benchwork-mock-ping".to_string(),
    })
}
