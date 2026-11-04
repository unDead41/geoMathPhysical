# GeoMath — backend scaling candidate handoff

Date: 4 November 2026 (Asia/Kuala_Lumpur).
Work branch: `digitalized-core-backend-scaling` only.
Upstream base: `391df985eea4fee15d9859e678068b1a3f613cba` on
`main-digitalized`; observed `main`: `25836eb1a6f24459aace8a3980ae880a13e3b488`.
Source versions remain Digital 2.8.0 / module 1.6.0; candidate, not a release.

## Delivered

- Shared network policy, state-aware Duel polling/backoff, Retry-After CORS,
  exact pending-command retention, protocol-error handling and terminal stop.
- Bounded one-second account/session snapshot cache with SDK checks, request
  coalescing, generation invalidation and stale-response prevention. Expired
  sessions fail closed; legitimate refreshed JWTs keep their session binding.
- Immediate local persistence with coalesced module sync, bounded retries,
  account separation and preservation of newer edits during in-flight saves.
- Guarded candidate SQL and exact rollback, operator-only capacity policy,
  snapshot reads without presence writes, bounded heartbeat/player writes,
  per-token state budgets and separate rejected-capability fingerprint budgets.
- Staging-only k6 workload, shared fixtures/global IDs, authoritative preflight,
  redirect/production guards, paced errors and load-only acceptance metrics.
- Read-only diagnostics, release order and capacity/budget prerequisites in
  [operator README](../../../backend/scaling/README.md).

## Verification

The complete Digital unit suite was checked across all 61 test files: **394
passed**, 0 failed in the accepted evidence set. Bounded batches and isolated
repeats were necessary after contention affected a 25 ms HTTP fixture and an
SQL worker; one batch runner also exceeded its 180-second timeout. Those failed
attempts are recorded and are not presented as passing runs. All affected
files subsequently passed separately without weakening their assertions.

The localhost HTTP smoke passed using the real Edge handler, candidate SQL on
PGlite and ten actual clients: four complete ten-question matches plus a fifth
match waking after the actual 900000 ms deadline. It checked 100 stored answers,
unchanged deadline scores/sequences and exactly one deliberately lost
acknowledgement. This is a local correctness check, not hosted capacity evidence.

`npm run build`, `npm run prepare:pages` (local files only), `npm run check`,
syntax checks and `git diff --check` passed. Accepted source build HTML SHA256:
`4f202ea09f8272fb16d551705f993635f3056406d38cc6855230d327ebdb6f72`.

Real browser verification is **blocked**, not passed: no Chromium binary was
installed, `/tmp/chromium` was empty, and the official headless-shell download
returned a truncated/empty archive. No browser screenshots are claimed.
Detailed machine-readable evidence: [verification.json](../../backend-scaling/verification.json).

## Independent review and assistance

One independent reviewer identified seven important issues. Reproductions and
fixes cover incompatible HTTP503 handling, late-poll cooldown clearing, cache
invalidation races, staging-host/redirect escape, per-VU fixture duplication,
failure retry storms and terminal-capability/deadline behavior. Expired SDK
cache hits, legitimate SDK token refresh and exact dropped-ack count are also
covered. Two implementation subagents then worked only on database and load
harness files. Root reviewed their changes and ran the combined verification.

## Decisions and limits

- Treat 5,000 mixed users and 5,000 Duel players as separate target scenarios;
  neither target is certified by local tests.
- Keep managed Supabase and existing API/protocol/storage identities. No Redis
  fleet, public guest-Duel channel or new Auth model is introduced. Realtime
  Broadcast needs a reviewed authorization design and measured fan-out.
- Keep conservative admission defaults until staging measurements and budget
  permit adjustment. The operator policy is private; raising limits does not
  create extra compute. Preserve the existing score, deadline and retry rules.
- The mixed k6 scenario models HTTP reads/heartbeats and one static cold entry.
  Separate teacher Realtime subscriptions and student answer/progress writes
  are required before making full classroom-capacity claims. Auth/SMTP bursts,
  backup/restore, soak, reconnect spikes and real phones remain separate checks.
- No production migration, Edge deployment, Auth/SMTP edit, paid-plan change,
  main/main-digitalized merge, public-mirror push or Pages publication occurred.

## Integration ownership

UI app/index/CSS, geometry, mathematical parser, settings bridge and module
protocol1 were not edited. Transport owners changed `dist/cloud.mjs`,
`dist/duel.mjs`, `dist/module-progress.mjs` and added `network-policy.mjs`.
Shared UI controllers keep their public methods; stale room reads can reject
with `stale-response` instead of returning obsolete account/room data.

Use source-level merge; do not copy an old app/index or generated standalone
over the UI branches. Rebuild generated distributions after combined sources
are integrated. Existing archived hosted migrations were not edited. The new
candidate stays in `backend/scaling/supabase/migrations/` until the backend owner
records a real, separately authorized deployment. Review guards against the
then-current routine hashes before applying; a mismatch must abort transaction.

Publication preserves the exact upstream Git tree using GitHub API commits;
local synthetic snapshot commits are not upstream history. The branch URL is
the review destination; the final remote head is reported in the chat receipt.
