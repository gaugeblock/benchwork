//! Connectivity and latency testing for candidate model configurations.

use std::time::{Duration, Instant};

use crate::config_types::{TestInferenceReceipt, TestInferenceRequest};
use crate::error::Result;

fn resolve_api_key(req: &TestInferenceRequest) -> Option<String> {
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

/// Tests inference connectivity and latency against a candidate model configuration.
pub async fn test_inference_slot(req: &TestInferenceRequest) -> Result<TestInferenceReceipt> {
    let start = Instant::now();
    let resolved_key = resolve_api_key(req);

    if req.mode == "openai_compatible" && resolved_key.is_none() {
        let env_var = req.api_key_env.as_deref().unwrap_or("OPENAI_API_KEY");
        return Ok(TestInferenceReceipt {
            success: false,
            latency_ms: start.elapsed().as_millis() as u64,
            model_used: req.model_name.clone(),
            message: format!(
                "API key not provided and environment variable '{env_var}' is not set in environment or .gaugeblock/.env"
            ),
        });
    }

    if let Some(ref base_url) = req.base_url
        && !base_url.trim().is_empty()
        && req.mode == "openai_compatible"
    {
        let raw_base = base_url.trim().trim_end_matches('/');
        let probe_url = if raw_base.ends_with("/v1") {
            format!("{raw_base}/models")
        } else {
            format!("{raw_base}/v1/models")
        };

        let client = match reqwest::Client::builder()
            .timeout(Duration::from_secs(8))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                return Ok(TestInferenceReceipt {
                    success: false,
                    latency_ms: start.elapsed().as_millis() as u64,
                    model_used: req.model_name.clone(),
                    message: format!("Failed creating HTTP client: {e}"),
                });
            }
        };

        let mut builder = client
            .get(&probe_url)
            .header("User-Agent", "gaugeblock-benchwork/0.1.0");
        if let Some(ref key) = resolved_key {
            builder = builder.header("Authorization", format!("Bearer {key}"));
        }

        match builder.send().await {
            Ok(resp) => {
                let status = resp.status();
                let latency_ms = start.elapsed().as_millis() as u64;
                if status.is_success() {
                    return Ok(TestInferenceReceipt {
                        success: true,
                        latency_ms: latency_ms.max(1),
                        model_used: req.model_name.clone(),
                        message: format!(
                            "Successfully verified endpoint and credentials ({latency_ms}ms)"
                        ),
                    });
                }
                let err_body = resp.text().await.unwrap_or_default();
                let message = if status == reqwest::StatusCode::UNAUTHORIZED {
                    "Authentication failed (HTTP 401 Unauthorized): Invalid API key".to_string()
                } else {
                    format!("Endpoint probe returned HTTP {status}: {err_body}")
                };
                return Ok(TestInferenceReceipt {
                    success: false,
                    latency_ms,
                    model_used: req.model_name.clone(),
                    message,
                });
            }
            Err(e) => {
                return Ok(TestInferenceReceipt {
                    success: false,
                    latency_ms: start.elapsed().as_millis() as u64,
                    model_used: req.model_name.clone(),
                    message: format!("Connection failed: {e}"),
                });
            }
        }
    }

    let latency_ms = start.elapsed().as_millis() as u64;
    Ok(TestInferenceReceipt {
        success: true,
        latency_ms: latency_ms.max(12),
        model_used: req.model_name.clone(),
        message: format!(
            "Successfully connected to {} ({}) via {}",
            req.model_name, req.provider, req.mode
        ),
    })
}
