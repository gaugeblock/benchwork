# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## [v0.1.0-beta.4] - 2026-10-26

### Added
- `web`: add CopilotRail, assistant-ui external store runtime, X-Ray inspector, and HITL tool cards (GB-46)
- `benchwork-cli`: implement chat orchestrator, SSE streaming, and proposal resolution endpoints (GB-46)
- `benchwork-core`: implement chat harness, context injector, tool registry, and telemetry spool (GB-46)
- `benchwork-core`: support ClinePass models, secret fallback, and provider filtering in model configurator (GB-44)

### Fixed
- `benchwork-core`: increase reasoning token limit to 4096 and surface inference errors in chat (GB-45)
- `benchwork`: resolve Panel 1 hook crash and synchronize config with .gaugeblock (GB-43)
- `benchwork-core`: support multi-repo doc inspection and dynamic doc tabs (GB-42)

