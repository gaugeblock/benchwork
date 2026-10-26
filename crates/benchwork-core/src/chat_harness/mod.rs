//! Chat harness types, thread persistence, and session management.

pub mod context_injector;
pub mod telemetry_spool;
pub mod tool_registry;

#[cfg(test)]
mod tests;

use std::fs::{File, OpenOptions, create_dir_all};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::Result;

/// Chat participant role.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChatRole {
    User,
    Assistant,
    System,
}

/// Single conversational message in a chat thread.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub role: ChatRole,
    pub content: String,
    pub timestamp_ms: u64,
    #[serde(default)]
    pub token_count: Option<u32>,
}

/// Event recorded in `.gaugeblock/chat/threads.jsonl`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "event", rename_all = "snake_case")]
pub enum ChatLedgerEvent {
    ThreadCreated {
        thread_id: String,
        title: String,
        created_at_ms: u64,
    },
    MessageAppended {
        thread_id: String,
        message: ChatMessage,
    },
    ProposalCreated {
        thread_id: String,
        proposal_id: String,
        tool_name: String,
        payload_json: String,
        created_at_ms: u64,
    },
    ProposalResolved {
        thread_id: String,
        proposal_id: String,
        approved: bool,
        resolution_notes: Option<String>,
        resolved_at_ms: u64,
    },
}

/// Complete in-memory view of a conversation thread.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatThread {
    pub thread_id: String,
    pub title: String,
    pub created_at_ms: u64,
    pub updated_at_ms: u64,
    pub messages: Vec<ChatMessage>,
}

/// Returns the path to `.gaugeblock/chat/threads.jsonl`.
pub fn chat_threads_path(root_dir: &Path) -> PathBuf {
    root_dir
        .join(".gaugeblock")
        .join("chat")
        .join("threads.jsonl")
}

/// Appends a single event to `.gaugeblock/chat/threads.jsonl`.
pub fn append_chat_event(root_dir: &Path, event: &ChatLedgerEvent) -> Result<()> {
    let path = chat_threads_path(root_dir);
    if let Some(parent) = path.parent() {
        create_dir_all(parent)?;
    }
    let mut file = OpenOptions::new().create(true).append(true).open(&path)?;
    let line = serde_json::to_string(event)?;
    writeln!(file, "{line}")?;
    Ok(())
}

/// Reconstructs all conversation threads from `.gaugeblock/chat/threads.jsonl`.
pub fn load_threads(root_dir: &Path) -> Result<Vec<ChatThread>> {
    let path = chat_threads_path(root_dir);
    if !path.exists() {
        return Ok(Vec::new());
    }
    let file = File::open(&path)?;
    let reader = BufReader::new(file);
    let mut thread_map = std::collections::BTreeMap::<String, ChatThread>::new();

    for line_res in reader.lines() {
        let line = line_res?;
        if line.trim().is_empty() {
            continue;
        }
        let event: ChatLedgerEvent = serde_json::from_str(&line)?;
        match event {
            ChatLedgerEvent::ThreadCreated {
                thread_id,
                title,
                created_at_ms,
            } => {
                thread_map.insert(
                    thread_id.clone(),
                    ChatThread {
                        thread_id,
                        title,
                        created_at_ms,
                        updated_at_ms: created_at_ms,
                        messages: Vec::new(),
                    },
                );
            }
            ChatLedgerEvent::MessageAppended { thread_id, message } => {
                if let Some(thread) = thread_map.get_mut(&thread_id) {
                    thread.updated_at_ms = message.timestamp_ms;
                    thread.messages.push(message);
                }
            }
            ChatLedgerEvent::ProposalCreated { .. } | ChatLedgerEvent::ProposalResolved { .. } => {}
        }
    }

    Ok(thread_map.into_values().collect())
}
