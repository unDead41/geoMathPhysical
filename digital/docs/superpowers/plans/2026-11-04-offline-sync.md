# GeoMath Offline Sync Implementation Plan

> Execute inline, task by task, with test-first verification and one final review.

**Goal:** Make GeoMath learning available offline and deliver owned formative
records when the application reconnects.

**Architecture:** Native IndexedDB outbox plus a bounded sync coordinator. A
versioned service worker caches public assets only. A separate additive RPC owns
idempotency and private practice history; existing gameplay remains authoritative.

**Tech Stack:** Existing ES modules, IndexedDB, service workers, Supabase RPC,
node:test, PGlite, Chromium/Playwright.

**Spec:** `digital/docs/OFFLINE_SYNC.md` (approved conversation scope).

## Global constraints

- Work only in `digitalized-utility-offline-sync` from base `391df985...`.
- No module source/math, Duel, shared schema/dispatcher or design-token changes.
- No credential persistence in the outbox. Guest data stays local.
- No source branch push counts as hosted deployment or Pages publication.
- Preserve existing save formats and standalone HTML compatibility.

## Review focus

- A delayed response after an account switch cannot mark the new owner's work saved.
- Server commit followed by connection loss creates exactly one history record.
- Offline cold start must preserve the previously signed-in owner's pending data.
- Quota/blocked storage must never display a durable-save success.
- Service-worker updates and callback URLs cannot expose credentials or reset games.

### Task 1: Durable outbox and sync engine

Files: new `digital/dist/offline-records.mjs`, `offline-db.mjs`,
`offline-sync.mjs`; tests `digital/tests/offline-sync.test.mjs`.

Interfaces: normalize records; `OfflineDB.enqueue/list/ack`; `OfflineSync` owns
actor, pending count, bounded flush, session/error classification and scheduling.

- [x] Write failing tests for missing ack, retry identity, changed accounts,
      permanent failures, bounded batches and temporary storage failure.
- [x] Run the focused suite and observe the missing feature failure.
- [x] Implement the validator, transactional IndexedDB adapter and sync controller.
- [x] Pass focused tests; real IndexedDB is exercised in Task 4's Chromium suite.

### Task 2: Idempotent formative backend

Files: new `digital/backend/offline-sync.sql` and
`digital/tests/offline-backend.test.mjs`; narrow `cloud.mjs` RPC method.

Interface: `geo_offline_sync(action,payload)` with `push` bounded events and
`history` bounded own formative history, plus individual ack IDs/module records.

- [x] Write and run failing real PostgreSQL tests for duplicate event replay,
      changed duplicate payloads, authorization, invalid records and module merge.
- [x] Implement private RLS tables, private definer and public invoker wrapper;
      derive account from Auth; never touch room/duel scores or shared dispatcher.
- [x] Pass SQL tests and the existing cloud/session binding tests.

### Task 3: App lifecycle and feedback

Files: new `digital/dist/offline-runtime.mjs`, `offline-view.mjs`; narrow hooks in
`app.mjs` and `module-progress.mjs`; tests for production app composition.

Interfaces: runtime enqueues module snapshots and completed solo records; existing
module sync accepts a managed adapter while legacy callers retain existing behavior.

- [x] Write/run failing integration tests for owner isolation, local save failure,
      reconnect/reopen and guest/room/Duel exclusion.
- [x] Add remembered offline owner, visible BM/English status/retry and lifecycle
      triggers without a second game engine or a new module protocol.
- [x] Pass new and existing integration tests.

### Task 4: Offline website packaging and end-to-end proof

Files: new `digital/tools/offline-package.mjs`, `digital/pwa/` source and
`digital/tests/offline.browser.mjs`; narrow `standalone.mjs` hook.

Interfaces: builder emits same-origin PWA deployment assets and manifest; worker
reports readiness only after the complete required application set is cached.

- [x] Write/run failing worker and browser tests for offline reload, durable queue
      reopen and partial install rejection without false readiness.
- [x] Implement scoped allowlisted caching and deferred updates; retain single HTML.
- [x] Run digital and module suites, build/check, Chromium cases and capture evidence.
- [x] Record final hashes, commands, limitations and rollout in branch handoff.
- [x] Review, commit and push only the isolated feature branch; verify remote SHA.
