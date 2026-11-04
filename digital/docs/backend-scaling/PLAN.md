# GeoMath backend scaling implementation plan

**Goal:** reduce repeated traffic and provide a verifiable path to 5,000 users.
**Architecture:** retain existing managed Supabase and API boundaries; isolate
client reliability policy, test candidate SQL locally, and gate hosted load.
**Stack:** ES modules, node:test, Supabase JS 2.118.0, PostgreSQL 17, PGlite, k6.
**Spec:** `DESIGN.md` in this directory, based on the approved audit direction.

## Constraints

- Work/push only `digitalized-core-backend-scaling`; no production deployment.
- Keep Duel protocol 2, token/sequence, score/time and module protocol 1.
- No account data in a shared/global persistent cache; no service-role client key.
- No source/UI edits belonging to the concurrent redesign branches.
- Tests prove local behavior; 5,000-user hosted capacity requires staging evidence.

## Review focus

Account changes during retry; expired authorization during cache reuse; a newer
progress edit during save; invalid tokens behind a shared school IP; long-running
deadlines during background tabs. Tests must cover these before completion.

## Tasks

1. [x] Write failing transport/cache tests. Implement `retryDelay`,
   `parseRetryAfter`, `duelPollDelay` and bounded `ScopedRequestCache` in
   `dist/network-policy.mjs`; integrate Duel and Classroom with preserved public
   methods. Test with fake clocks/deferred requests, then run the existing suite.
2. [x] Write failing coalescing/account-switch/retry tests. Implement scheduling
   inside `ModuleProgress` without changing record/storage/iframe contracts.
   Verify pending local records survive failure and newer edits are not lost.
3. [x] Create the candidate migration with the Supabase CLI. Guard replacements
   against known base definitions; test real SQL roles, read/write behavior,
   Duel idempotency/expiry, NAT and configured quota behavior in PGlite. Provide
   rollback and read-only operational diagnostics.
4. [ ] Add staging-only load scenarios and local smoke, document budget/quotas,
   cache scope, UI handoff and release order. Run full suite, build and check,
   review the whole diff, commit and publish only the work branch; verify SHA.

Execution: implement inline in this session. Baseline: `npm test`, 350 passed,
0 failed. Progress and actual results are recorded in the branch handoff.
