# Module V1.3 upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver all accepted module improvements and isolated student/teacher practice progress on `digitalize-module-upgrade`.

**Architecture:** Preserve canonical pure geometry and renderer. Extend module with guided activities and a small event bridge; parent owns persistence and the authenticated classroom RPC. Keep source and generated standalone in the same feature branch.

**Tech Stack:** Vanilla JavaScript modules, Canvas, Node tests, Supabase PostgreSQL, current esbuild dependency.

**Spec:** `digital/docs/specs/MODULE_UPGRADE.md`

## Global Constraints

- Push only `digitalize-module-upgrade`; no merge, Pages publish, production migration or firmware edits.
- Module v1.3.0; app v2.4.0; no dependency upgrades or runtime network/storage inside module.
- Exact bridge protocol and text limits are specified in MODULE_UPGRADE.md.
- Maximum two subagents for this task. Root handles integration and final verification; first agent implements module, second reviews the final branch. Agents must not spawn agents.

## Review Focus

- Paused pours must resume/step once without duplicating completion or losing liquid.
- Reset/edit/Undo must not award completion without a fresh observed and checked activity.
- Messages from stale frames or accounts must never overwrite another user's record.
- Narrow layout, dark canvas and no speech support must retain usable text/controls.
- Teacher reads must be limited to owned classes; payload errors cannot persist unbounded or forged identity data.

### Task 1: Guided module and controls

**Files:** `digital/module/src/{app,labs,renderer,style,content,index,lab-geometry}.*`, new focused helper(s), `digital/module/tests/`, build/check scripts and module docs.

**Interfaces:** Produces canonical v1.3 standalone HTML and child side of bridge from spec. Consumes parent context with saved records and theme; works session-only standalone.

- [x] Write failing tests for guided gates, edit invalidation/history and animation step/resume completion.
- [x] Implement all student experience requirements from spec and bridge emitter/listener.
- [x] Run module tests, build, check and self-review; report changed files, evidence and limitations.

### Task 2: Persistence, teacher view and integration (root)

**Files:** new `digital/dist/module-progress.mjs`; `dist/{app,portal,cloud,module-frame,style,portal.css}`; `backend/module_progress_v2_4.sql` and rollback verification; parent tests, manifest, builder and release docs.

**Interfaces:** Consumes Task 1 protocol; exports small validation/reducer/controller functions with dependency injection for tests. RPC interface is `geo_module_progress(action,payload)`.

- [x] Write failing tests for bridge/account isolation, storage failure and out-of-order monotonic merging.
- [x] Implement parent bridge, per-user local save, cloud merge/sync and portal entry/progress view.
- [x] Implement permission-scoped RPC, migration and transaction-only security tests; do not apply persistently.
- [x] Vendor generated module, update versions and source manifest, run parent tests/build/check.

### Task 3: Review, browser validation and push

**Files:** release/verification docs, source pin manifest, generated HTML/bundle.

**Interfaces:** One final review receives spec, implementation reports and diff package. Root resolves findings with the original agent where appropriate.

- [x] Test actual browser student flows through all four labs, theme/focus, restoration and 320px layout; inspect screenshots.
- [x] Review complete source diff and teacher SQL boundaries; fix material findings and run relevant checks again.
- [x] Record actual evidence and remaining environment limitations. Build final artifacts.
- [x] Create remote feature branch from the verified source base, upload only intended `digital/` files, update with expected-SHA lease and read back exact remote commit/tree.
