# Behavioral Specifications & Invariants

## Formal Type Contracts

- **`orchestrator::ApplyProposalRequest`** (`struct`): Request payload to approve, reject, or edit a staged tool proposal.
- **`error::BenchworkError`** (`enum`): Strongly-typed error enum for `benchwork-core`.
- **`lib::BenchworkState`** (`struct`): Primary facade for accessing and mutating workspace state across crates.
- **`types::BulkArchiveRequest`** (`struct`): Request payload for archiving multiple tasks in a batch.
- **`types::BulkArchiveResponse`** (`struct`): Response payload from a bulk archiving operation.
- **`mutations::BulkArchiveResult`** (`struct`): Result summary of a bulk archive operation.
- **`mod::ChatLedgerEvent`** (`enum`): Event recorded in `.gaugeblock/chat/threads.jsonl`.
- **`mod::ChatMessage`** (`struct`): Single conversational message in a chat thread.
- **`mod::ChatRole`** (`enum`): Chat participant role.
- **`orchestrator::ChatStreamEvent`** (`enum`): Typed event emitted across the Server-Sent Events (SSE) stream.
- **`mod::ChatThread`** (`struct`): Complete in-memory view of a conversation thread.
- **`orchestrator::ChatTurnRequest`** (`struct`): Request payload for streaming a chat turn.
- **`types::ClaimTaskPayload`** (`struct`): Request payload for claiming an agent lease on a task.
- **`args::Cli`** (`struct`): Modular visual workbench UI and local aggregator daemon.
- **`args::Commands`** (`enum`): Available CLI subcommands.
- **`spec::ContractPreviewRequest`** (`struct`): Request to generate polyglot contracts from a `SharedTypeContract`.
- **`spec::ContractPreviewResponse`** (`struct`): Generated polyglot code preview.
- **`routes_state::DaemonContext`** (`struct`): Shared daemon state passed to Axum route handlers.
- **`dag::DagQuery`** (`struct`): Filter parameters for DAG board queries.
- **`dag::DagStats`** (`struct`): Task state distribution counters.
