# AGENTS.md — Operational Directives for `benchwork`

> **Organization:** `gaugeblock` (`https://github.com/gaugeblock` | `https://gaugeblock.dev`)  
> **Crate Domain:** `benchwork` (Modular Visual Workbench & Local Aggregator Daemon)  
> **Active Suite Lifecycle:** `0.1.0-beta.X` | Git tag format: `v<version>`

You are an autonomous systems engineering agent operating inside the **`benchwork`** repository, the visual command center and local state aggregator for the `gaugeblock` neurosymbolic suite.

---

## 1. Non-Negotiable Engineering Laws

1. **Hard 250-Line File Limit:**
   * No `.rs`, `.ts`, or `.tsx` source file may exceed **250 lines of code** (including comments and tests).
   * This applies strictly to both Rust backend crates (`benchwork-core`, `benchwork-cli`, `benchwork-mcp`) and the React 19 frontend (`web/src/**`).
   * If a file approaches 200 lines, split it immediately into clean submodules or components. Move tests into a sibling `tests.rs` or `tests/` directory.
2. **Unix Philosophy & Standalone Value:**
   * `benchwork` MUST compile, pass tests, and provide a genuinely useful visual CAD workbench and CLI experience completely on its own without requiring external suite daemons.
   * Cross-project coupling happens strictly through the shared schemas and traits defined in `CONTRACTS.md`.
3. **Zero Inline Scope Creep (Mandatory Deferral to `storypole`):**
   * While executing a task, if you discover an unrelated bug, edge case, missing AST pattern, or refactoring opportunity outside your immediate file scope, **DO NOT fix it inline**.
   * Record the item immediately via `storypole defer --kind <tech-debt|bug|enhancement> --symbol "<crate::path>" --title "..."`. Stay locked on your active task.
4. **Tiered Verification Matrix (`cargo-nextest` preferred runner):**
   * **Tier 1 (Inner Loop):** `cargo check -p <crate>` or `cargo test -p <crate> --lib <module>`
   * **Tier 2 (Atomic Commit Gate):** `cargo fmt --check -p <crate>`, `cargo clippy -p <crate> --all-targets -- -D warnings`, `cargo test -p <crate>`, and `chalkline docs check -d .`
   * **Tier 3 (Task Completion Gate):** Full workspace verification before closing a task: `cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, and `chalkline docs check --workspace`.
   * **Tier 4 (Release & Wire Gate):** Full cross-repo suite, wire contract validation (`miter contracts`), and `chalkline docs check --workspace`.
5. **Strict Error Handling & Observability:**
   * Library crate (`benchwork-core`) MUST use `thiserror` with strongly typed `BenchworkError`. `.unwrap()` and `.expect()` are forbidden in production library paths (enforced at compile time via `[workspace.lints.clippy]`).
   * CLI crate (`benchwork-cli`) may use `anyhow::Result` at the top-level command boundary.
   * Use `tracing` for structured instrumentation. All logs must route to `stderr` or a file sink; never pollute `stdout` in `--mcp` mode.
6. **Atomic Commits & Bisect Invariance:**
   * Every commit MUST represent a single logical unit of work and pass Tier 2 verification. Never commit broken intermediate states that break `git bisect`.
7. **Conventional Commits Specification:**
   * Commit messages MUST follow Conventional Commits v1.0.0: `<type>(<scope>): <summary>`
   * Allowed types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `chore`, `ci`, `build`.
   * Scopes: `benchwork-core`, `benchwork-cli`, `benchwork-mcp`, `web`, `daemon`, `deps`.
   * Subject line: imperative mood, lowercase, no trailing period, $\le 72$ chars.
8. **Semantic Versioning & Git Tagging:**
   * Member crates lockstep together via repository root `Cargo.toml`.
   * Releases tagged with annotated Git tags `v<version>`.
9. **Mandatory Dogfooding & Target Directory Prohibition:**
   * Execute installed binaries (`benchwork`, `chalkline`, `storypole`, `miter`) from `PATH`. Never run binaries directly from `target/` directories for operational workflows.
10. **Branch Isolation & Feature Branching:**
   * All non-trivial tickets MUST be developed on dedicated Git branches (`feat/<ticket-or-slug>`, `fix/<ticket-or-slug>`).
11. **Plan Persistence & Specification Fidelity:**
   * Non-trivial tasks require an attached `TaskPlan` in `storypole` before executing code modifications.
