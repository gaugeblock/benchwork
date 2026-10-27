# Changelog

All notable changes to `benchwork` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v0.1.0-beta.6] - 2026-05-09

### Maintenance

- Embed static web assets inside the crate directory for crates.io packaging.

## [v0.1.0-beta.5] - 2026-05-09

### Added
- Add bulk task multi-select and batch archiving in `benchwork-ui`/`benchwork-store` ([GB-66]).
- Add localStorage and URL hash persistence for panels and views in `benchwork-ui` ([GB-65]).
- Add resizable left/right dockable Benji sidebar with dynamic role selector in `benji` ([GB-62]).
- Wire real Sawhorse SSE streaming inference and context injection in `sawnhorse` ([GB-63]).
- Support multi-repository workspace rollups and store routing in `benchwork-store` ([GB-59]).
- Initialize local backlog store with prefix BW in `benchwork-store`.

### Fixed
- Initialize `reasoning_effort` in `InferenceRequest` callsites in `sawnhorse`.

### Changed
- Realign Panel 1 to Docs & Specs and remove duplicate EngineerChat in `benchwork-ui` ([GB-61]).
- Migrate scoped tasks and design plans in `benchwork-store`.

### Maintenance
- Configure Playwright E2E test suite for persistence, Benji chat, and bulk archiving in `benchwork-e2e` ([GB-67]).
- Standardize README and establish 9-doc architecture in `benchwork-docs`.
- Update release history with alpha and beta milestones in `benchwork-docs`.

### Documentation
- Standardize README to 9-section template and establish AST-grounded 9-document architecture

## [v0.1.0-beta.4] - 2026-10-26

### Added
- `web`: add CopilotRail, assistant-ui external store runtime, X-Ray inspector, and HITL tool cards (GB-46).
- `benchwork-cli`: implement chat orchestrator, SSE streaming, and proposal resolution endpoints (GB-46).
- `benchwork-core`: implement chat harness, context injector, tool registry, and telemetry spool (GB-46).
- `benchwork-core`: support ClinePass models, secret fallback, and provider filtering in model configurator (GB-44).

### Fixed
- `benchwork-core`: increase reasoning token limit to 4096 and surface inference errors in chat (GB-45).
- `benchwork`: resolve Panel 1 hook crash and synchronize config with `.gaugeblock` (GB-43).
- `benchwork-core`: support multi-repo doc inspection and dynamic doc tabs (GB-42).

## [v0.1.0-beta.3] - 2026-10-24

### Added
- `web`: persistent multi-conversation AI Engineer Chat Studio with unmount resilience (GB-40).
- `benchwork-core`: secure credential persistence to `.gaugeblock/.env` and API key propagation (GB-39).
- `benchwork-core`: 2-step dynamic model discovery and OpenAI-compatible custom preset in UniversalConfigModal (GB-37).
- `benchwork-cli`: unified `.gaugeblock/` migration engine and banner (GB-36).
- `web`: 9-document architecture manager panel and audit endpoints in Panel 1 (GB-18).
- `web`: render TaskPlan blueprint, design markdown, and step checklist in inspector (GB-30).
- `web`: interactive task claim with branch isolation and handoff workflow (GB-31).
- `web`: interactive task mutation and scope editing in inspector (GB-32).
- `web`: task archiving endpoints and UI filters (GB-34).
- `web`: interactive link and split DAG operations in drawer (GB-33).

## [v0.1.0-beta.2] - 2026-10-22

### Added
- `benchwork-cli`: backlog Kanban board, tabular issue lists, and task detail inspector drawer (GB-15).
- `web`: neurosymbolic X-ray realignment and backlog synthesis triggers (GB-16).
- `web`: interactive `sawhorse.toml` provider configuration manager in Panel 4 (GB-17).

## [v0.1.0-beta.1] - 2026-10-22

### Added
- `benchwork-core`: workspace capability scanner detecting active artifacts (`SPEC.md`, `PRODUCT.md`, `.storypole`, `.dado`, `sawhorse.toml`, `.rabbet`).
- `benchwork-cli`: Axum REST/WebSocket/SSE aggregator daemon serving bundled frontend static assets via `rust-embed` (`benchwork up`).
- `benchwork-mcp`: stdio JSON-RPC 2.0 MCP server exposing `benchwork_capabilities`, `benchwork_snapshot`, `benchwork_resolve_decision`, `benchwork_trigger_synthesis`.
- `web`: industrial CAD shell in Vite, React 19, TypeScript, and Tailwind with four reactive panels (GB-6).

## [0.0.1-alpha.1] - 2026-10-21

### Added
- Initial namespace reservation on crates.io and GitHub repository scaffold.
