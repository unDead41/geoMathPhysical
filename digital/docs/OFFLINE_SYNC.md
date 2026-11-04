# GeoMath offline and deferred sync

Accepted scope: the 4 November 2026 conversation approved an offline website,
durable device saves and automatic delivery when a signed-in owner returns online.
This is additive work from `main-digitalized` at
`391df985eea4fee15d9859e678068b1a3f613cba`. Current firmware main is
`25836eb1a6f24459aace8a3980ae880a13e3b488` (v2.0.2); no firmware changes.

## Contract

- Cache the public built application and its complete music files using a scoped,
  versioned service worker. Mark offline ready only after all required assets exist.
  Never cache Auth callbacks, authenticated API responses or arbitrary network URLs.
- Store queued learning records in IndexedDB, partitioned by owner. Store the record
  and its pending state atomically. No credentials in the queue. Guest records remain
  local. Do not silently transfer guest or other-account records.
- Sync module reflections and completed solo quiz/practice/review histories. Solo
  records are self-reported practice, never classroom/Duel marks or verified mastery.
  Existing solo checkpoints and studio drafts retain their existing local scope.
- Bind a send to the authenticated owner; require reauthentication for an expired
  session. Offline account labels are remembered ownership, not authorization.
- Send bounded batches, acknowledge individual IDs, retain records after a missing
  response, deduplicate retries on the server, stop on permanent validation/auth
  errors, retry transient errors with exponential backoff and jitter. An account
  switch must not apply a previous response to a new account.
- Reconcile existing module records without lowering achievements. Do not replay
  classroom actions, Duel actions, account/security mutations or support reports.
- Primary automatic delivery happens in an open/reopened app. Do not promise work
  after a browser is closed. A visible retry action remains available.
- On a failed device write retain the canonical event in memory while the page
  lives. Retry persistence before delivery; keep the storage warning if it fails.
  An offline INITIAL_SESSION refresh failure preserves the remembered owner;
  explicit signout and owner/session changes remain authoritative boundaries.
- BM/English status, storage failure, pending count, session-required and service-not-
  installed messages. Browser data deletion can remove unsent work.
- Service-worker updates wait until the user can reload; never force an active
  game to reload. Keep legacy standalone HTML working without service workers.

## Implementation choices

Use native IndexedDB and a small independent sync controller, avoiding a new
framework or sync vendor. Keep the existing module protocol and mathematics.
Create a separate additive `geo_offline_sync` RPC and private tables; leave the
shared classroom dispatcher, existing SQL files and scaling work untouched.
The RPC derives ownership from Auth and accepts only bounded formative data.
Idempotent receipt IDs protect retries; content mismatches under the same ID fail.

Alternative: replay arbitrary HTTP requests from a service worker. Rejected because
that would replay stale Auth and live-game operations. Alternative: replace the
backend with a full replication product. Unnecessary for these bounded records.

## Ownership and rollout

Branch: `digitalized-utility-offline-sync`. New offline utility files, narrow
composition hooks in `app.mjs`, `cloud.mjs`, `module-progress.mjs`, a builder hook,
dedicated SQL/tests and this documentation. Do not edit module source, geometry,
design tokens, Duel implementation, scaling files or UI refresh branches.

Push the isolated source branch. Installing the new additive SQL and publishing
the PWA assets are explicit rollout steps, separately recorded from code tests.
When the new RPC is absent, retain pending data and display service unavailable;
never report it as synced or fall back to uploading practice as official scores.

## Verification

Node tests for validation, ack/retry/ownership and SQL in PGlite. Real Chromium
tests for IndexedDB reopen, offline page reload, partial cache failures, real
application module/solo hooks and localized status. Existing digital/module suites
and build/check remain required. Hosted tests and physical devices are separate.

Primary references checked: MDN IndexedDB, service workers and Background Sync;
web.dev PWA caching/offline data; Supabase sessions and row-level security.
