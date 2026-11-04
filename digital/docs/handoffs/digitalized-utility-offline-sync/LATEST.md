# Offline utility handoff

Date: 4 November 2026 (Malaysia). Branch `digitalized-utility-offline-sync`.
Base `main-digitalized`: `391df985eea4fee15d9859e678068b1a3f613cba`.
Base Digital v2.8.0 / pinned module v1.6.0. Firmware untouched; current firmware
main was inspected at `25836eb1a6f24459aace8a3980ae880a13e3b488` (v2.0.2).

## Delivered behavior

- Versioned scoped public app cache, both complete music tracks, manifest and icon.
- Native IndexedDB transactional owner-partitioned outbox, bounded batches,
  acknowledged IDs, backoff/jitter, account/session binding and visible BM/English
  status. No credentials in offline records.
- Existing module protocol and monotonic achievements; dedicated managed queue.
- Completed solo quiz/practice/review histories queue once per attempt. These are
  unverified formative records. Guest data, classroom and Duel are excluded.
- Own authenticated practice history can be read through the new utility panel.
- Updates wait for an explicit reload action. Standalone HTML remains supported.

## Integration ownership

New files are `dist/offline-*.mjs`, `backend/offline-sync.sql`, `pwa/`,
`tools/offline-package.mjs` and dedicated offline tests/docs. Shared changes:

| File | Hook |
|---|---|
| `dist/app.mjs` | Construct utility, preserve remembered solo owner, attach managed module sync, capture finished solo result |
| `dist/module-progress.mjs` | Optional adapter/callback and guarded incoming sync status; legacy mode retained |
| `dist/cloud.mjs` | Owner-bound RPC, optional Auth event, guarded SDK recovery and structured failure codes |
| `tools/standalone.mjs` | Emit complete PWA package while retaining legacy single-file HTML |

Integrators should apply these small hooks to the latest composition files,
preserving work from UI and backend scaling branches. No module source, geometry,
shared design tokens, Duel files, shared dispatcher or existing migration edited.

## Validation

- Existing Digital baseline: **350/350** after dependency availability was corrected.
- Digital with utility after all review fixes: **396/396**, including dedicated
  real PostgreSQL/PGlite authorization, idempotency and validation cases.
- Existing module: **328/328**.
- Chromium: **7 scenarios passed**, listed in `evidence/browser-results.json`.
  Native IndexedDB reopen, real app offline reload/module open, partial install,
  callback/Auth cache bypass, completion/reconnect, deferred update/reload.
- Account-switch browser coverage removes A's private draft, records B's new
  reflection and clears B's draft on logout. Review fixes are recorded in [REVIEW.md](REVIEW.md).
- Signed-in browser transport is a controlled fixture. SQL runs real PostgreSQL
  in PGlite with synthetic Auth session fixtures. No hosted login, physical phone,
  production scale or browser-closed background delivery is claimed.

[Desktop offline screenshot](evidence/offline-module-desktop.png) ·
[Mobile offline result screenshot](evidence/offline-result-mobile-en.png) ·
[Final command receipts and hashes](evidence/verification.json)

## Rollout

1. Integrate this isolated feature with current UI/scaling branches and run checks.
2. Apply **only** additive `digital/backend/offline-sync.sql` after the existing
   canonical schema. A fresh installation runs schema.sql then this additive file.
   It derives the owner and live session from Auth; private tables have no direct
   frontend grants. Do not replay historical dispatcher migrations.
3. Build with `cd digital && npm run build`. Publish the complete contents of
   `digital/artifacts/pwa/` to the frontend mirror's existing directory, including
   `sw.js`, manifest, icons and audio. The legacy mirror's index/audio-only copying
   procedure must include these additional resources to enable offline readiness.
4. Check HTTPS registration, pending/ack behavior, own hosted history and the
   actual active Auth session before reporting live activation.

No main/main-digitalized push, frontend mirror push, Pages publication or hosted
database migration is part of this source-branch handoff. Missing RPC installation
is shown as unavailable and keeps the outbox intact. Root publication and generated
standalone aliases are rebuilt during validation and excluded from the source patch.

## Limits

Offline assets must first finish downloading. Sync runs with the app open/reopened;
no guaranteed background work after browser closure. Device/browser data deletion
can remove unsent records; failed storage never claims success. Queue limit is
2,000 pending events per owner, with an explicit failure instead of silent eviction.
Studio session drafts and solo checkpoints retain existing local-only semantics.
