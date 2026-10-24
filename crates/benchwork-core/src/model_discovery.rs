//! Dynamic model discovery for OpenAI-compatible endpoints (/v1/models).

use crate::config_types::{DiscoverModelsRequest, DiscoverModelsResponse};
use crate::error::Result;
use reqwest::header::{ACCEPT, AUTHORIZATION, USER_AGENT};
use serde::Deserialize;
use std::time::Duration;

#[derive(Debug, Deserialize)]
struct OpenAiModelItem {
    id: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiModelsPayload {
    data: Option<Vec<OpenAiModelItem>>,
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
        vec![format!("{raw_base}/v1/models"), format!("{raw_base}/models")]
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

    let api_key = req
        .api_key
        .as_ref()
        .filter(|k| !k.trim().is_empty())
        .cloned()
        .or_else(|| {
            req.api_key_env
                .as_ref()
                .filter(|e| !e.trim().is_empty())
                .and_then(|env_name| std::env::var(env_name).ok())
        });

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

    Ok(DiscoverModelsResponse {
        success: false,
        models: Vec::new(),
        message: format!("Model discovery failed: {last_error}"),
    })
}

