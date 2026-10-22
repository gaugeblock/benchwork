//! Tests for `benchwork-mcp`.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use benchwork_mcp::{handle_message, list_tools};
use serde_json::json;

#[tokio::test]
async fn test_mcp_initialize() {
    let req = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {}
    });

    let resp = handle_message(&req).await.expect("response");
    assert_eq!(resp["id"], 1);
    assert_eq!(resp["result"]["serverInfo"]["name"], "benchwork-mcp");
}

#[tokio::test]
async fn test_mcp_tools_list() {
    let tools = list_tools();
    assert!(tools.as_array().expect("array").len() >= 4);

    let req = json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    });

    let resp = handle_message(&req).await.expect("response");
    assert_eq!(resp["id"], 2);
    let tools_list = resp["result"]["tools"].as_array().expect("tools array");
    assert!(
        tools_list
            .iter()
            .any(|t| t["name"] == "benchwork_capabilities")
    );
    assert!(tools_list.iter().any(|t| t["name"] == "benchwork_snapshot"));
}

#[tokio::test]
async fn test_mcp_tool_call_capabilities() {
    let req = json!({
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "benchwork_capabilities",
            "arguments": {
                "root_path": "."
            }
        }
    });

    let resp = handle_message(&req).await.expect("response");
    assert_eq!(resp["id"], 3);
    assert!(resp["result"]["content"][0]["text"].as_str().is_some());
}
