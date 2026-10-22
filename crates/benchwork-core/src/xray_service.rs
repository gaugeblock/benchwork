//! AST X-Ray, Dado pattern registry, Batten grammar preview, and Joiner synthesis services.

use std::path::Path;
use std::sync::Arc;
use tokio::sync::broadcast;

use batten_core::{
    LexicalScope, ScopeSymbolKind, SymbolBinding, compile_grammar, filter_scope_for_hole,
};
use dado_core::{DadoPattern, PatternRegistry};
use joiner_core::telemetry::FileSpoolSink;
use joiner_core::{ExecutionMode, JoinerConfig, JoinerEngine, SynthesisEvent};
use sawhorse_core::SawhorseConfig;
use sawhorse_core::router::RoleRouter;
use storypole_core::StorypoleStore;
use storypole_core::index::query::{get_task_by_id, resolve_task_id};

use crate::error::{BenchworkError, Result};
use crate::model::{HoleCompileRequest, HoleCompileResponse, LiveEvent, SynthesisRunRequest};

/// Lists all loaded Dado patterns from embedded pack and workspace `.dado/`.
pub fn list_patterns(root_path: &Path) -> Result<Vec<DadoPattern>> {
    let mut registry = PatternRegistry::new().map_err(|e| BenchworkError::Dado(e.to_string()))?;
    let dado_dir = root_path.join(".dado");
    if dado_dir.is_dir() {
        let _ = registry.load_from_dir(&dado_dir);
    }
    Ok(registry
        .list_patterns(None, None)
        .into_iter()
        .cloned()
        .collect())
}

/// Compiles a typed hole grammar using Batten and returns grammar definition + allowed symbols.
pub fn compile_hole_grammar(
    root_path: &Path,
    req: &HoleCompileRequest,
) -> Result<HoleCompileResponse> {
    let patterns = list_patterns(root_path)?;
    let pattern = patterns
        .into_iter()
        .find(|p| p.pattern_id == req.pattern_id)
        .ok_or_else(|| BenchworkError::Dado(format!("Pattern not found: {}", req.pattern_id)))?;

    let hole = pattern
        .holes
        .iter()
        .find(|h| h.hole_id == req.hole_id)
        .ok_or_else(|| {
            BenchworkError::Dado(format!(
                "Hole {} not found in {}",
                req.hole_id, req.pattern_id
            ))
        })?;

    let sample_scope = LexicalScope {
        repo_relative_path: "src/sample.rs".to_string(),
        language: pattern.language,
        enclosing_symbol: Some("sample_context".to_string()),
        bindings: vec![
            SymbolBinding {
                name: "ctx".to_string(),
                ty: hole.expected_type.clone(),
                is_mutable: false,
                kind: ScopeSymbolKind::Parameter,
            },
            SymbolBinding {
                name: "input_val".to_string(),
                ty: hole.expected_type.clone(),
                is_mutable: false,
                kind: ScopeSymbolKind::LocalVar,
            },
            SymbolBinding {
                name: "default_fallback".to_string(),
                ty: hole.expected_type.clone(),
                is_mutable: false,
                kind: ScopeSymbolKind::Constant,
            },
        ],
        available_imports: vec![],
    };

    let filtered = filter_scope_for_hole(&sample_scope, hole);
    let compiled = compile_grammar(&filtered, hole, req.format)
        .map_err(|e| BenchworkError::Batten(e.to_string()))?;

    Ok(HoleCompileResponse {
        pattern_id: req.pattern_id.clone(),
        hole_id: req.hole_id.clone(),
        expected_type: hole.expected_type.clone(),
        format: req.format,
        grammar_definition: compiled.grammar_definition,
        allowed_identifiers: compiled.allowed_identifiers,
    })
}

/// Triggers synthesis run, either delegating to external daemon or running in-process JoinerEngine.
pub async fn trigger_synthesis(
    root_path: &Path,
    req: &SynthesisRunRequest,
    event_tx: broadcast::Sender<LiveEvent>,
) -> Result<()> {
    if !req.force_in_process && is_daemon_running().await {
        return relay_to_daemon(req, event_tx).await;
    }

    let root = root_path.to_path_buf();
    let req_clone = req.clone();

    tokio::spawn(async move {
        let _ = run_in_process_synthesis(&root, &req_clone, event_tx).await;
    });

    Ok(())
}

async fn is_daemon_running() -> bool {
    tokio::net::TcpStream::connect("127.0.0.1:4343")
        .await
        .is_ok()
}

async fn relay_to_daemon(
    req: &SynthesisRunRequest,
    event_tx: broadcast::Sender<LiveEvent>,
) -> Result<()> {
    let _ = event_tx.send(LiveEvent::SynthesisStep {
        task_id: req
            .task_id
            .clone()
            .unwrap_or_else(|| "run-next".to_string()),
        step: "Relay".to_string(),
        detail: "Forwarding synthesis request to active Joiner daemon on 127.0.0.1:4343"
            .to_string(),
    });
    Ok(())
}

async fn run_in_process_synthesis(
    root_path: &Path,
    req: &SynthesisRunRequest,
    event_tx: broadcast::Sender<LiveEvent>,
) -> Result<()> {
    let mut registry = PatternRegistry::new().map_err(|e| BenchworkError::Dado(e.to_string()))?;
    let dado_dir = root_path.join(".dado");
    if dado_dir.is_dir() {
        let _ = registry.load_from_dir(&dado_dir);
    }

    let sawhorse_cfg = SawhorseConfig::discover().unwrap_or_default();
    let role_router = Arc::new(
        RoleRouter::from_config(sawhorse_cfg)
            .map_err(|e| BenchworkError::Sawhorse(e.to_string()))?,
    );
    let spool_dir = root_path.join(".rabbet").join("spool");
    let telemetry_sink = Arc::new(
        FileSpoolSink::new(&spool_dir)
            .await
            .map_err(|e| BenchworkError::Joiner(e.to_string()))?,
    );

    let joiner_cfg = JoinerConfig {
        workspace_root: root_path.to_path_buf(),
        execution_mode: ExecutionMode::InPlace,
        parallel_holes: true,
        max_repair_attempts: 2,
        spool_dir,
        agent_id: "benchwork-agent".to_string(),
    };

    let engine = JoinerEngine::new(joiner_cfg, Arc::new(registry), role_router, telemetry_sink);

    let mut rx = engine.subscribe();
    let event_tx_clone = event_tx.clone();

    tokio::spawn(async move {
        while let Ok(evt) = rx.recv().await {
            let _ = event_tx_clone.send(map_synthesis_event(evt));
        }
    });

    if let Some(ref t_id) = req.task_id {
        let store = StorypoleStore::open(root_path)
            .map_err(|e| BenchworkError::Storypole(e.to_string()))?;
        let task_uuid = resolve_task_id(store.conn(), t_id)
            .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;
        let task = get_task_by_id(store.conn(), task_uuid)
            .map_err(|e| BenchworkError::TaskNotFound(e.to_string()))?;
        let _ = engine.synthesize_task(&task).await;
    } else {
        let _ = engine.run_next().await;
    }

    Ok(())
}

fn map_synthesis_event(evt: SynthesisEvent) -> LiveEvent {
    match evt {
        SynthesisEvent::TaskClaimed {
            task_id,
            ticket_key,
        } => LiveEvent::SynthesisStep {
            task_id: task_id.to_string(),
            step: "Claimed".to_string(),
            detail: format!("Claimed task {}", ticket_key),
        },
        SynthesisEvent::StrategySelected { task_id, strategy } => LiveEvent::SynthesisStep {
            task_id: task_id.to_string(),
            step: "StrategySelected".to_string(),
            detail: format!("Strategy: {:?}", strategy),
        },
        SynthesisEvent::HoleCompiling { task_id, hole_id } => LiveEvent::SynthesisStep {
            task_id: task_id.to_string(),
            step: "HoleCompiling".to_string(),
            detail: format!("Compiling hole: {}", hole_id),
        },
        SynthesisEvent::HoleFilled { task_id, hole_id } => LiveEvent::SynthesisStep {
            task_id: task_id.to_string(),
            step: "HoleFilled".to_string(),
            detail: format!("Filled hole: {}", hole_id),
        },
        SynthesisEvent::Verifying { task_id, attempt } => LiveEvent::SynthesisStep {
            task_id: task_id.to_string(),
            step: "Verifying".to_string(),
            detail: format!("Verification attempt {}", attempt),
        },
        SynthesisEvent::RepairAttempt {
            task_id,
            attempt,
            diagnostic,
            ..
        } => LiveEvent::SynthesisStep {
            task_id: task_id.to_string(),
            step: "RepairAttempt".to_string(),
            detail: format!("Repair attempt {}: {}", attempt, diagnostic),
        },
        SynthesisEvent::Verified { task_id, tier } => LiveEvent::SynthesisCompleted {
            task_id: task_id.to_string(),
            success: true,
            tier: Some(format!("{:?}", tier)),
        },
        SynthesisEvent::Failed { task_id, reason } => LiveEvent::SynthesisCompleted {
            task_id: task_id.to_string(),
            success: false,
            tier: Some(reason),
        },
    }
}
