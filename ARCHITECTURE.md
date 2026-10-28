# `benchwork` — System Architecture

> **Domain:** Modular Visual Workbench & Local Aggregator | **Suite:** `gaugeblock`

This document details the software architecture, subsystem topology, dataflow, and real-time event distribution of `benchwork`.

---

## 1. System Decomposition

```mermaid
graph TD
    subgraph Frontend["Industrial Dark CAD Frontend (web/)"]
        UI[React 19 + TypeScript + Tailwind UI]
        WSClient[WebSocket Realtime Client]
        SSEClient[SSE Token Stream Client]
    end

    subgraph Daemon["benchwork-cli Local Daemon"]
        AxumRouter[Axum HTTP & WS Router]
        StaticServer[rust-embed Static Bundle Server]
        EventBus[In-Memory Broadcast Hub]
    end

    subgraph Core["benchwork-core Local Aggregator Engine"]
        DocsService[Spec Studio & 9-Doc Service]
        DagService[Storypole DAG Service]
        XRayService[Dado / Batten / Joiner X-Ray]
        HubService[Sawhorse / Rabbet Hub Service]
        MigrationEngine[Dotfile Migration Engine]
        BenjiOrchestrator[Benji AI Chat Orchestrator]
    end

    subgraph Filesystem["Local Workspace Files & Stores"]
        DocsFiles[SPEC.md • PRODUCT.md • ARCHITECTURE.md]
        StorypoleStore[.storypole/ / .gaugeblock/storypole/]
        SawhorseConfig[sawhorse.toml / .gaugeblock/sawhorse/]
        SpoolStore[.gaugeblock/spool/outbox.jsonl]
    end

    UI --> WSClient & SSEClient
    WSClient <-->|/api/v1/ws| AxumRouter
    SSEClient <-->|/api/v1/events| AxumRouter
    StaticServer --> UI
    
    AxumRouter --> DocsService & DagService & XRayService & HubService & MigrationEngine & BenjiOrchestrator
    EventBus <--> AxumRouter
    
    DocsService <--> DocsFiles
    DagService <--> StorypoleStore
    HubService <--> SawhorseConfig & SpoolStore
    MigrationEngine <--> Filesystem
```

---

## 2. Real-Time Interaction & Dual-Write Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Engineer / Agent
    participant UI as React CAD Workbench
    participant Daemon as benchwork Axum Server
    participant Core as benchwork-core Service
    participant Disk as Local Filesystem (.storypole / SPEC.md)
    participant WS as WebSocket Broadcast Hub

    User->>UI: Resolve Decision / Claim Task / Run Synthesis
    UI->>Daemon: POST /api/v1/spec/decisions/resolve
    Daemon->>Core: Execute Atomic Dual-Write
    Core->>Disk: Append to .storypole/events.jsonl
    Core->>Disk: Update Section in DESIGN.md / SPEC.md
    Core-->>Daemon: DecisionResolutionReceipt
    Daemon->>WS: Broadcast DecisionUpdated Event
    WS-->>UI: Live State Push (< 16ms)
    Daemon-->>UI: HTTP 200 (Success)
```

---

## 3. Storage & Aggregation Topology

`benchwork` acts as a zero-subprocess aggregator over all ecosystem state files:
* **Documentation & Contracts:** Monitored and parsed via `pulldown-cmark` and Tree-sitter in `benchwork-core::docs_service`.
* **Task Ledger & Backlog DAG:** Sourced directly via `storypole-core` event-sourced ledger queries and topological sort algorithms in `benchwork-core::dag_service`.
* **Synthesis & Hole Inspection:** Directly interrogates `dado-core` pattern templates and `batten-core` grammar constraints in `benchwork-core::xray_service`.
* **Model Inference Routing:** Direct reads and writes to `sawhorse.toml` through `sawhorse-core::config` in `benchwork-core::hub_service`.

---

## 4. Crate & Package Topology

| Crate | Path | Responsibility |
|:---|:---|:---|
| [`benchwork`](./src/lib.rs) | `.` | Root facade re-exporting `benchwork_core` domain APIs |
| [`benchwork-core`](./crates/benchwork-core) | `crates/benchwork-core` | State aggregation, DAG service, Spec studio, X-Ray, Benji orchestrator |
| [`benchwork-cli`](./crates/benchwork-cli) | `crates/benchwork-cli` | Axum HTTP/WS/SSE daemon, Clap CLI, static bundle embedder |
| [`benchwork-mcp`](./crates/benchwork-mcp) | `crates/benchwork-mcp` | Stdio Model Context Protocol (MCP) JSON-RPC 2.0 server |
| **`web/`** | `web/` | Industrial dark CAD UI (React 19, TypeScript, Tailwind, strictly $\le 250$ LOC/file) |
