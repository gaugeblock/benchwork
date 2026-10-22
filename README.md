# `gaugeblock/benchwork`

Modular visual workbench UI and local aggregator daemon for the [gaugeblock](https://gaugeblock.dev) neurosymbolic synthesis ecosystem.

`benchwork` is the single-binary visual control center (`benchwork up`) and state aggregator across `storypole`, `chalkline`, `dado`, `batten`, `sawhorse`, `joiner`, and `rabbet`. It operates strictly under the **Unix Standalone Law**: running `benchwork up` in any directory works immediately out of the box even if only `SPEC.md` or `.storypole/` exists, while dynamically illuminating live synthesis, grammar inspection, and telemetry panels as project capabilities are detected.

---

## Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Workspace Files & Stores                                               │
│ SPEC.md  •  PRODUCT/ARCH/DESIGN.md  •  .storypole/  •  sawhorse.toml   │
│ .dado/  •  .rabbet/spool/outbox.jsonl                                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ benchwork Daemon (benchwork-core + benchwork-cli)                      │
│ - Zero-subprocess direct Rust library linkage                          │
│ - Axum HTTP/REST API (/api/v1/...)                                     │
│ - WebSocket (/api/v1/ws) & SSE (/api/v1/events) broadcast hub          │
│ - rust-embed static bundle server with Vite --dev proxy support        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Web Workbench (web/ — Industrial Dark CAD UI: React 19 + TS + Tailwind)│
│                                                                        │
│ ┌──────────────────────────┐          ┌──────────────────────────────┐ │
│ │ Panel 1: Spec & /grill-me│          │ Panel 2: Live Backlog & DAG  │ │
│ │ - SPEC.md parser         │          │ - Interactive SVG CAD DAG    │ │
│ │ - Dual-write decisions   │          │ - Status & role filtering    │ │
│ │ - Polyglot types preview │          │ - Agent claim & handoff      │ │
│ └──────────────────────────┘          └──────────────────────────────┘ │
│ ┌──────────────────────────┐          ┌──────────────────────────────┐ │
│ │ Panel 3: Synthesis X-Ray │          │ Panel 4: Model & Spool Hub   │ │
│ │ - Dado pattern holes     │          │ - Sawhorse 3-mode provider   │ │
│ │ - Batten CFG rules       │          │ - Ping latency diagnostics   │ │
│ │ - Live Joiner synthesis  │          │ - Rabbet DPO trace diffs     │ │
│ └──────────────────────────┘          └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Workspace Crate Structure

`benchwork` is modularized into focused sub-crates under Rust 2024 (`resolver = "3"`):

- **`crates/benchwork-core`**: Pure domain types, capability scanner (`capabilities.rs`), `SPEC.md` and decision resolution studio (`spec_studio.rs`), Storypole DAG management (`dag_service.rs`), Dado/Batten/Joiner X-Ray (`xray_service.rs`), and Sawhorse/Rabbet hub (`hub_service.rs`). Zero `.unwrap()` / `.expect()` in production library code.
- **`crates/benchwork-cli`**: Clap CLI binary (`benchwork up`, `snapshot`, `capabilities`, `mcp`), embedding Axum REST, WebSocket, SSE routes, and `rust-embed` static frontend assets.
- **`crates/benchwork-mcp`**: Stdio Model Context Protocol (MCP) server exposing tools: `benchwork_capabilities`, `benchwork_snapshot`, `benchwork_resolve_decision`, and `benchwork_trigger_synthesis`.
- **`web/`**: Vite + React 19 + TypeScript + Tailwind CSS precision dark CAD workbench. 100% of `.ts` / `.tsx` files strictly obey the **≤ 250 LOC** engineering limit.

---

## Quickstart & CLI Commands

### 1. Launch Visual Workbench
```bash
# Launch daemon on http://127.0.0.1:4242 and open the browser
benchwork up

# Specify custom port and host
benchwork up --port 8080 --host 0.0.0.0

# Frontend development mode (proxies static UI requests to Vite dev server)
benchwork up --dev 127.0.0.1:5173
```

### 2. Inspect Capabilities & Workspace Snapshot
```bash
# Detect detected workspace components
benchwork capabilities --json

# Export complete unified state snapshot (spec, DAG, X-ray, hub)
benchwork snapshot --json
```

### 3. Stdio Model Context Protocol (MCP) Server
```bash
benchwork mcp
```

---

## API Endpoints

### REST API (`/api/v1`)
- `GET /api/v1/capabilities` — Scan workspace capabilities (`SPEC.md`, Storypole, Dado, Sawhorse, Rabbet, etc.).
- `GET /api/v1/snapshot` — Full state bundle across all 4 panels.
- `GET /api/v1/spec` — Parsed `SPEC.md`, contextual docs, and pending `DecisionHole` items.
- `POST /api/v1/spec/resolve` — Resolve a decision with rationale and optional follow-up questions.
- `GET /api/v1/spec/preview-contract?contract_name=<name>` — Dado polyglot preview (Rust, TS, Zod).
- `GET /api/v1/dag` — Storypole task graph, topological layers, and bottlenecks.
- `POST /api/v1/dag/claim` — Claim a task for an agent.
- `POST /api/v1/dag/handoff` — Handoff a task with briefing notes.
- `GET /api/v1/xray/patterns` — Dado pattern definitions and holes.
- `GET /api/v1/xray/grammar?pattern_name=<name>` — Batten compiled CFG rules for pattern holes.
- `POST /api/v1/xray/synthesize` — Trigger Joiner synthesis (in-process or external daemon).
- `GET /api/v1/hub/models` — Active Sawhorse provider roles and health status.
- `POST /api/v1/hub/ping` — Run live ping diagnostic on a model role.
- `GET /api/v1/hub/spool` — Rabbet DPO training telemetry traces.
- `DELETE /api/v1/hub/spool` — Purge outbox telemetry spool.

### Streaming Endpoints
- `GET /api/v1/ws` — WebSocket bi-directional link for live task updates and synthesis logs.
- `GET /api/v1/events` — Server-Sent Events (SSE) stream broadcasting live workspace events.

---

## License

Apache-2.0
