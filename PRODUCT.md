# `benchwork` — Product Vision & Strategy

> **Domain:** Modular Visual Workbench & Local Aggregator | **Suite:** `gaugeblock`

`benchwork` is the visual command center and local state aggregator for the `gaugeblock` neurosymbolic suite, providing a precision industrial dark-mode CAD interface for code synthesis, architectural contracts, and task DAGs.

---

## 1. Personas & Problems

| Persona | Pain Points | How `benchwork` Solves It |
|:---|:---|:---|
| **Systems Architect** | Architectural decisions and type contracts drift across disjointed markdown files and commit messages. | Provides the interactive Spec Studio with live polyglot type previews and atomic dual-write decision recording. |
| **Autonomous Agent Operator** | Cannot visualize background agent execution, active task leases, or pending synthesis repair bottlenecks. | Offers an interactive SVG CAD DAG with real-time agent lease tracking, heartbeats, and handoff controls. |
| **Neurosymbolic Engineer** | Hard to inspect why a Dado pattern or Batten grammar failed hole synthesis. | Delivers the Synthesis X-Ray panel with side-by-side template holes, AST token spans, and live Joiner execution. |
| **Engineering Lead** | Developers resist adopting multi-tool CLI suites due to disjointed terminal workflows and scattered config files. | Unifies the entire suite under a single command (`benchwork up`) and automated dotfile consolidator (`benchwork migrate`). |

---

## 2. Jobs to Be Done (JTBD)

1. **Visual State Aggregation:** When developing with the `gaugeblock` suite, unify docs, backlog tasks, pattern synthesis, and model providers into a single responsive local UI without running multiple processes.
2. **Interactive Architectural Decisions:** When resolving open architectural questions (`/grill-me`), record the chosen design and rationale simultaneously in markdown documentation and immutable task ledgers.
3. **Synthesis X-Ray Inspection:** When diagnosing a failed code generation run, inspect the exact lexical scope, typed holes, and grammar constraints in a visual IDE with live compilation feedback.
4. **Agent Collaboration & Oversight:** When supervising autonomous agents, track active claims, inspect staged tool proposals, and review execution diffs before code modifications hit the repository.

---

## 3. Product Success Metrics

* **Zero Subprocess Overhead:** 100% of internal state reads link directly to Rust member libraries with zero shell spawns.
* **Real-Time Responsiveness:** State updates broadcast over WebSocket/SSE under 16 milliseconds (60 FPS UI budget).
* **Code Modularization Compliance:** 100% of `.rs`, `.ts`, and `.tsx` source files strictly adhere to the $\le 250$ LOC limit.
* **Migration Safety:** 0% data loss during dotfile migration into `.gaugeblock/`, backed by automated backups.
