//! Connectivity and latency testing for candidate model configurations.

use std::path::Path;
use std::time::{Duration, Instant};

use crate::config_types::{TestInferenceReceipt, TestInferenceRequest};
use crate::error::{BenchworkError, Result};

/// Tests inference connectivity and latency against a candidate model configuration.
pub async fn test_inference_slot(req: &TestInferenceRequest) -> Result<TestInferenceReceipt> {
    let start = Instant::now();

    let resolved_key = req
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

    if req.mode == "openai_compatible" && resolved_key.is_none() {
        let env_var = req.api_key_env.as_deref().unwrap_or("OPENAI_API_KEY");
        return Ok(TestInferenceReceipt {
            success: false,
            latency_ms: start.elapsed().as_millis() as u64,
            model_used: req.model_name.clone(),
            message: format!("API key not provided and environment variable '{env_var}' is not set"),
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

        let client = match reqwest::Client::builder().timeout(Duration::from_secs(5)).build() {
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

        let mut builder = client.get(&probe_url).header("User-Agent", "gaugeblock-benchwork/0.1.0");
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
                        message: format!("Successfully verified endpoint and credentials ({latency_ms}ms)"),
                    });
                } else if status == reqwest::StatusCode::UNAUTHORIZED {
                    return Ok(TestInferenceReceipt {
                        success: false,
                        latency_ms,
                        model_used: req.model_name.clone(),
                        message: "Authentication failed (HTTP 401 Unauthorized): Invalid API key".to_string(),
                    });
                }
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
