# Contributing to `benchwork`

Thank you for contributing to `benchwork`! We welcome contributions across our Rust backend aggregation services, Axum daemon, MCP server, and React 19 industrial dark CAD frontend.

---

## 1. Prerequisites

* **Rust Toolchain:** Rust 2024 edition (stable 1.85+ / nightly for bleeding-edge checks).
* **Node.js Toolchain:** Node.js 20+ and `pnpm` (or `npm`) for frontend development in `web/`.
* **Testing Runners:** `cargo-nextest` (recommended) or native `cargo test`.
* **Suite Tooling:** Installed `storypole`, `chalkline`, and `miter` available on `PATH`.

---

## 2. Development Workflow

1. **Claim a Task:**
   ```bash
   storypole claim <KEY> <YOUR_ID> --branch feat/<slug>
   ```
2. **Dedicated Branch:**
   Always develop non-trivial tickets on dedicated feature branches (`feat/<slug>` or `fix/<slug>`).
3. **Inner-Loop Iteration (Tier 1):**
   * **Backend:**
     ```bash
     cargo check -p benchwork-core -p benchwork-cli
     cargo nextest run -p benchwork-core
     ```
   * **Frontend:**
     ```bash
     cd web && pnpm install && pnpm dev
     ```
     Run the daemon with dev proxy:
     ```bash
     benchwork up --dev
     ```
4. **Pre-Commit Verification Gate (Tier 2):**
   Before committing, verify code formatting, clippy lints, tests, and documentation drift:
   ```bash
   cargo fmt --check -p benchwork-core -p benchwork-cli -p benchwork-mcp
   cargo clippy -p benchwork-core -p benchwork-cli -p benchwork-mcp --all-targets -- -D warnings
   cargo test -p benchwork-core -p benchwork-cli
   chalkline docs check -d .
   ```
5. **Commit with Conventional Commits:**
   ```bash
   git commit -m "feat(benchwork-cli): add realtime WebSocket push for task claims"
   ```

---

## 3. Engineering Invariants & Coding Standards

* **Hard 250-Line File Limit:** No `.rs`, `.ts`, or `.tsx` source file may exceed 250 lines. Keep components modular and extract submodules cleanly.
* **Strict Error Handling:** Production library code (`benchwork-core`) must use strongly typed `BenchworkError` via `thiserror`. Never use `.unwrap()` or `.expect()`.
* **Zero Subprocess Aggregation:** Do not spawn shell commands to query suite state; link against member crate libraries directly.
* **9-Document Compliance:** Maintain 100% compliance across all 9 canonical documents with zero drift. Run `chalkline docs check -d .` to certify.
