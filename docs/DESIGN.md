# `benchwork` — Architectural Design & Decisions

> **Domain:** Modular Visual Workbench & Local Aggregator | **Suite:** `gaugeblock`

This document captures the key Architectural Decision Records (ADRs) governing `benchwork`.

---

## Architectural Decision Records (ADRs)

### ADR-001: Zero-Subprocess Direct Rust Library Linkage
* **Status:** Accepted
* **Context:** `benchwork` must query, inspect, and mutate state managed by sibling crates (`storypole`, `sawhorse`, `miter`, `dado`). Spawning CLI subprocesses creates heavy OS process overhead, fragile text parsing, and latency.
* **Decision:** Link `benchwork-core` directly against `storypole-core`, `sawhorse-core`, and `miter-engine` using shared Rust domain types and function calls.
* **Consequences:** Reduces query latency from $50\text{--}100\text{ms}$ (shell spawn) to $<1\text{ms}$ (in-process memory), guarantees type safety across boundaries, and prevents shell injection risks.

### ADR-002: Dual-Channel Realtime Updates (WebSocket + SSE)
* **Status:** Accepted
* **Context:** The visual workbench requires real-time bidirectional state updates for UI interactions while also streaming token deltas during AI chat completions.
* **Decision:** Implement a dual-channel architecture using Axum:
  * `/api/v1/ws` (WebSocket) for bidirectional state synchronization, task board drags, and real-time broadcasts.
  * `/api/v1/events` (Server-Sent Events) for unidirectional LLM token streaming and progress logs.
* **Consequences:** Maximizes efficiency and protocol ergonomics—allowing low-overhead push notifications without polling while keeping LLM token streaming simple and resilient.

### ADR-003: Unified Dotfile Migration into `.gaugeblock/` Canonical Root
* **Status:** Accepted
* **Context:** Early beta versions of suite tools placed independent dotfiles and directories (`.storypole/`, `.miter/`, `sawhorse.toml`, `.dado/`) in repository roots, cluttering the workspace.
* **Decision:** Introduce `benchwork migrate` and a dedicated migration engine to idempotently discover, backup, and relocate all configuration files into a clean `.gaugeblock/` directory hierarchy (`.gaugeblock/storypole/`, `.gaugeblock/sawhorse.toml`, etc.).
* **Consequences:** Delivers a clean, professional workspace layout while providing automated backward-compatible migration for existing repositories.

### ADR-004: Industrial Dark-Mode CAD UI Architecture in React 19
* **Status:** Accepted
* **Context:** Systems engineers and autonomous agents need dense, high-information-density visualization of code ASTs, DAGs, and type contracts without decorative whitespace bloat.
* **Decision:** Build the frontend using React 19, TypeScript, and Tailwind CSS styled with an industrial CAD dark palette (high contrast, monospace telemetry, SVG DAG nodes, zero decorative clutter). Enforce a hard 250 LOC limit on every `.ts`/`.tsx` source file.
* **Consequences:** Creates an ultra-responsive, highly technical visual interface that feels like precision engineering CAD software rather than a generic SaaS website.

### ADR-005: Staged Tool Proposal & Approval Workflow in Benji Chat
* **Status:** Accepted
* **Context:** Allowing the Benji AI engineer to execute file modifications or git commands immediately upon tool call generation risks destructive unintended edits.
* **Decision:** Enforce a staged proposal workflow where tool calls yield an in-memory `ToolProposal` displaying a visual diff and execution summary in the UI. The user or orchestrating agent must explicitly approve the proposal before the mutation is written to disk.
* **Consequences:** Guarantees human-in-the-loop safety and verification, prevents catastrophic code overwrite accidents, and provides clear audit trails in `.gaugeblock/chat/`.
