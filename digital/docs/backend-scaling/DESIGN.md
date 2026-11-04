# GeoMath backend scaling candidate

Approved direction: user request on 4 November 2026 to implement the preceding
audit recommendation. Upstream base: `391df985eea4fee15d9859e678068b1a3f613cba`
(`main-digitalized`, Digital 2.8.0 / module 1.6.0). Work branch only:
`digitalized-core-backend-scaling`. Main observed: `25836eb1a6f24459aace8a3980ae880a13e3b488`.

## Outcome and boundaries

Reduce avoidable requests and database writes while preserving protocol 2,
server scoring/clocks, private-schema gateways, account isolation and module
progress protocol 1. Target 5,000 concurrent mixed users and an all-Duel stress
scenario. This is a capacity target, not a claim of measured hosted capacity.

Keep managed Supabase/PostgreSQL. A separate custom server/Redis fleet would
add unmeasured costs and operational work. Realtime Broadcast for guest Duel
requires a reviewed authorization design; it is a later option, not a public
room channel added to this patch. No paid plan, hosted migration, deployment,
main merge, Pages publication or production load generation is performed.

## Changes

- Reusable retry policy: bounded exponential delay with jitter, Retry-After,
  retriable network/5xx/429 classification; no retry of rejected game actions.
- Duel: preserve pending sequence/payload across transient failures, single
  polling chain, state-aware delay, slower background/failure polls, stop
  finished polling. Server deadlines continue regardless of visibility.
- Classroom: bounded account/session-scoped in-flight snapshot coalescing and
  short memory cache with invalidation on mutation, subscription event, room
  or session change. Heartbeat stays inside the existing 45-second presence
  window and spreads requests across time.
- Module progress: persist locally first, coalesce successive edits, serialize
  saves, retry with a bounded delay, reject stale account/frame work. Existing
  explicit sync remains immediate. Do not implement the separate offline/PWA
  workstream or change mathematical/UI sources.
- Candidate SQL: guarded migration preserves every shared dispatcher action;
  snapshot reads do not write presence, repeated heartbeat writes are bounded,
  Duel state refresh avoids shared-IP quota contention while retaining valid
  token checks, per-token quotas, create/join brute-force protection and expiry.
  Capacity policy is configurable with conservative defaults, not unlimited.
- Staging-only load runner and read-only diagnostics: mixed/Duel scenarios,
  staged concurrency and user-paced actions; explicit endpoint allowlist,
  result/error thresholds, no secrets in reports. Include rollback instructions.

## Ownership and release

Change transport `dist/duel.mjs`, `dist/cloud.mjs`, `dist/module-progress.mjs`,
new network helper and backend/scaling/tests/docs only. No app/index/CSS/module
UI edits. Integrator rebuilds generated distributions after combining branches.
Candidate SQL is outside archived hosted history until actually deployed.

Sources were materialized through the connected GitHub API into an isolated
local worktree because the shell has no private Git credential. Local snapshot
commits are not upstream commits; publication uses the exact upstream parent
and base tree through the GitHub API, preserving all untouched files.

## Acceptance

Existing suite remains green. New tests exercise retry identity, account change,
hidden tabs, mutation invalidation, failed persistence, concurrent newer edits,
SQL grants/ownership/scoring and shared school NAT. Build/check the actual app.
Run only local load smoke here. Document staging/paid-capacity prerequisites,
backup/restore drill and remaining load evidence separately.
