# `benchwork` — Modular Visual Workbench & Local Aggregator Daemon

[![Version](https://img.shields.io/badge/version-0.1.0--beta.4-blue.svg)](https://gaugeblock.dev)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![gaugeblock](https://img.shields.io/badge/suite-gaugeblock-orange.svg)](https://github.com/gaugeblock)
[![Documentation](https://img.shields.io/badge/docs-9--doc%20topology-green.svg)](ARCHITECTURE.md)

Part of the **[`gaugeblock`](https://gaugeblock.dev)** neurosymbolic code synthesis ecosystem.

> In fine woodworking, a **workbench** is the sturdy, flat, multi-functional foundation of the shop—fitted with vises, bench dogs, holdfasts, and tool rails—where all joinery, planing, and assembly are visually inspected, held rock-steady, and shaped. In the `gaugeblock` suite, `benchwork` is the single-binary visual control center (`benchwork up`): an industrial dark-mode CAD workbench uniting `SPEC.md`, live Storypole DAGs, Dado pattern X-Rays, Batten CFG rules, and the Benji AI engineer sidebar.

---

## 1. Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Workspace Files & Stores                                               │
│ SPEC.md  •  PRODUCT/ARCH/DESIGN.md  •  .storypole/  •  sawhorse.toml   │
│ .gaugeblock/dado/  •  .gaugeblock/spool/outbox.jsonl                   │
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
│ │ Panel 1: Docs & /grill-me│          │ Panel 2: Live Backlog & DAG  │ │
│ │ - 9-doc studio & viewer  │          │ - Interactive SVG CAD DAG    │ │
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

## 2. Workspace Crate Layout

* **`benchwork`**: Facade crate re-exporting `benchwork-core`.
* **`crates/benchwork-core`**: Pure domain types, capability scanner (`capabilities.rs`), `SPEC.md` studio, Storypole DAG service, Dado/Batten/Joiner X-Ray service, and Sawhorse/Rabbet hub.
* **`crates/benchwork-cli`**: Clap binary (`benchwork`) embedding Axum REST, WebSocket, SSE routes, and `rust-embed` static frontend bundle.
* **`crates/benchwork-mcp`**: JSON-RPC 2.0 stdio Model Context Protocol (MCP) server.
* **`web/`**: Precision dark CAD frontend in React 19, TypeScript, and Tailwind CSS (100% of `.ts`/`.tsx` files strictly <= 250 LOC).

---

## 3. Installation & CLI Quickstart

```bash
# Install globally via cargo
cargo install --path crates/benchwork-cli

# 1. Launch visual workbench on http://127.0.0.1:4242 and open the browser
benchwork up

# 2. Specify custom port and host
benchwork up --port 8080 --host 0.0.0.0

# 3. Frontend development mode (proxies static UI requests to Vite dev server)
benchwork up --dev 127.0.0.1:5173

# 4. Scan workspace capabilities and detected tools
benchwork capabilities --json

# 5. Export complete unified state snapshot across all panels
benchwork snapshot --json
```

---

## 4. Model Context Protocol (MCP) Reference

| Tool | Parameters | Description |
|---|---|---|
| `benchwork_capabilities` | `None` | Query detected ecosystem components and available feature panels. |
| `benchwork_snapshot` | `None` | Retrieve full multi-panel state bundle (spec, DAG, X-Ray, hub). |
| `benchwork_resolve_decision` | `decision_id, choice, rationale` | Resolve pending architectural decision from AI agent or UI. |
| `benchwork_trigger_synthesis` | `task_key, in_place?` | Trigger neurosymbolic hole synthesis through Joiner daemon. |

---

## 5. Repository Documentation

`benchwork` adheres strictly to the canonical **9-Document Architecture**:
* **[`CONTRIBUTING.md`](./CONTRIBUTING.md):** Local toolchain prerequisites, frontend build (`pnpm build`), and test execution.
* **[`ARCHITECTURE.md`](./ARCHITECTURE.md):** Daemon architecture, WebSocket hub, and React 19 component hierarchy.
* **[`SPEC.md`](./SPEC.md):** REST and WebSocket wire schemas, state synchronizers, and error contracts.
* **[`AGENTS.md`](./AGENTS.md):** Autonomous systems directives, <=250 LOC limits, and zero-unwrap rules.
* **[`CHANGELOG.md`](./CHANGELOG.md):** Chronological historical release entries and unreleased changes.

---

## 6. Verification & Development Directives

* **File Size Ceiling:** All `.rs`, `.ts`, and `.tsx` source files must strictly remain under 250 LOC.
* **Tiered Verification Matrix:**
  * Tier 1: `cargo check -p benchwork-core` (<2s).
  * Tier 2: `cargo fmt --check -p benchwork-core && cargo clippy -p benchwork-core && cargo test -p benchwork-core`.
  * Tier 3: `chalkline docs check -d .` before task verification.

---

## 7. License

Licensed under the [Apache License, Version 2.0](LICENSE).
Part of the [`gaugeblock`](https://gaugeblock.dev) suite.
