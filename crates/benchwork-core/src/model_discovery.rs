//! Dynamic model discovery for OpenAI-compatible endpoints (/v1/models).

use crate::config_types::{DiscoverModelsRequest, DiscoverModelsResponse};
use crate::error::Result;
use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use serde::Deserialize;
use std::time::Duration;

const CLINE_PASS_MODELS: &[&str] = &[
    "cline-pass/deepseek-v4-pro",
    "cline-pass/deepseek-v4.1-flash",
    "cline-pass/glm-5.3",
    "cline-pass/glm-5.3-flash",
    "cline-pass/kimi-k3",
    "cline-pass/qwen3.8-max",
    "cline-pass/qwen3.7-max",
    "cline-pass/qwen3.7-plus",
    "cline-pass/mimo-v2.5",
    "cline-pass/mimo-v2.5-pro",
    "cline-pass/minimax-m3",
    "cline-pass/muse-spark-1.3-contributor",
];

#[derive(Debug, Deserialize)]
struct OpenAiModelItem {
    id: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiModelsPayload {
    data: Option<Vec<OpenAiModelItem>>,
}

fn resolve_discovery_key(req: &DiscoverModelsRequest) -> Option<String> {
    if let Some(ref k) = req.api_key
        && !k.trim().is_empty()
    {
        return Some(k.clone());
    }

    if let Some(ref env_name) = req.api_key_env
        && !env_name.trim().is_empty()
    {
        if let Ok(val) = std::env::var(env_name)
            && !val.trim().is_empty()
        {
            return Some(val);
        }
        return sawhorse_core::config::resolve_secret_from_env_file(env_name);
    }

    for fallback in &["CLINE_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"] {
        if let Some(val) = sawhorse_core::config::resolve_secret_from_env_file(fallback) {
            return Some(val);
        }
    }

    None
}

/// Dynamically discovers available models from an OpenAI-compatible `/models` endpoint.
pub async fn discover_remote_models(req: &DiscoverModelsRequest) -> Result<DiscoverModelsResponse> {
    let raw_base = req.base_url.trim().trim_end_matches('/');
    if raw_base.is_empty() {
        return Ok(DiscoverModelsResponse {
            success: false,
            models: Vec::new(),
            message: "Base URL cannot be empty".to_string(),
        });
    }

    let candidate_urls = if raw_base.ends_with("/v1") {
        vec![format!("{raw_base}/models")]
    } else {
        vec![
            format!("{raw_base}/v1/models"),
            format!("{raw_base}/models"),
        ]
    };

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return Ok(DiscoverModelsResponse {
                success: false,
                models: Vec::new(),
                message: format!("Failed building HTTP client: {e}"),
            });
        }
    };

    let api_key = resolve_discovery_key(req);
    let mut last_error = "No response from candidate endpoints".to_string();

    for url in candidate_urls {
        let mut builder = client
            .get(&url)
            .header(ACCEPT, "application/json")
            .header(USER_AGENT, "gaugeblock-benchwork/0.1.0");

        if let Some(ref key) = api_key {
            builder = builder.header(AUTHORIZATION, format!("Bearer {key}"));
        }

        match builder.send().await {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    if let Ok(payload) = resp.json::<OpenAiModelsPayload>().await {
                        let mut models: Vec<String> = payload
                            .data
                            .unwrap_or_default()
                            .into_iter()
                            .map(|m| m.id)
                            .filter(|id| !id.trim().is_empty())
                            .collect();

                        if raw_base.contains("cline.bot") {
                            for &cm in CLINE_PASS_MODELS {
                                if !models.iter().any(|m| m == cm) {
                                    models.push(cm.to_string());
                                }
                            }
                        }

                        models.sort();
                        models.dedup();

                        let count = models.len();
                        return Ok(DiscoverModelsResponse {
                            success: true,
                            models,
                            message: format!("Successfully discovered {count} model(s) from {url}"),
                        });
                    }
                } else {
                    let err_text = resp.text().await.unwrap_or_default();
                    last_error = format!("HTTP {status}: {err_text}");
                }
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }
    }

    // Fallback for ClinePass if endpoint failed or was unreachable
    if raw_base.contains("cline.bot") {
        let models: Vec<String> = CLINE_PASS_MODELS.iter().map(|s| s.to_string()).collect();
        return Ok(DiscoverModelsResponse {
            success: true,
            models,
            message: "Using curated ClinePass models catalog".to_string(),
        });
    }

    Ok(DiscoverModelsResponse {
        success: false,
        models: Vec::new(),
        message: format!("Model discovery failed: {last_error}"),
    })
}
