# Transport integration report

Status: complete. No Git index/ref changes, commits, pushes, hosted migrations or deployments performed.

Integration worktree: ``

Base: `main-digitalized` at `391df985eea4fee15d9859e678068b1a3f613cba`, Digital v2.8.0 before the root release update. Read `AGENTS.md`, `docs/SOR_VERSIONING.md` and `digital/docs/BRANCH_ARCHITECTURE.md`. Firmware version was not changed; this is Digital-only work.

## Sources

Used `integration-tools/source.py` to read original blobs and verify Git blob hashes against the frozen manifest, then three-way merged against the exact integration base.

| Source branch | Frozen source head |
| --- | --- |
| digitalized-classroom-crud | 1f0dedca55fd8d1291f5ea5c0b2fc74c059d4324 |
| digitalized-core-backend-scaling | 5904e4856c0fbab86224cd0a4f63ced77e707018 |
| digitalized-utility-offline-sync | b1125588ade0c18168f2fd0116d3e9084dfdd3ed |

## Files and resolutions

- `digital/dist/cloud.mjs`: composed snapshot request coalescing, bounded memory cache, revision invalidation, room/session rejection, jittered heartbeat/backoff and Realtime invalidation from scaling with the offline RPC, owner-only SDK session recovery, Auth event forwarding and transient SDK refresh classification from offline. Preserved the CRUD structured error code and its `request_failed` fallback.
- `digital/dist/module-progress.mjs`: kept local persistence immediate, direct RPC saves debounced with bounded retry/backoff and account-scoped timers. When the offline owner is attached, every teaching event enters its durable outbox immediately through `onRecord`; explicit sync delegates to `syncAdapter`, without scheduling a second direct RPC save path. Kept account/iframe/session isolation and `applyOfflineState` ownership checks.
- `digital/tests/cloud.test.mjs`: combined scaling's stale room response rejection with CRUD's permission error regression.
- `digital/tests/transport-integration.test.mjs`: added four combined regressions covering transient SDK errors before/after cache hits, changed account/session rejection despite retryable errors, coalesced CRUD error propagation/recovery, and immediate durable module queueing across account switches without direct debounce requests.
- `digital/dist/duel.mjs` and `digital/dist/network-policy.mjs`: already copied by root and retained unchanged. Reverified exact scaling blobs: `2d9ba80cc89b09de7daba106daa3961d6c6409f2` and `e84c4a4327143028a40f4b3a1a2f04a65edb160d` respectively.

Semantic correction beyond mechanical conflict resolution: scaling's `_checkSnapshotSession` classified every SDK error as `session-changed`. Combined with offline refresh recovery, a temporary Auth fetch failure could incorrectly demand login. It now preserves `network` for retryable failures belonging to the same cached owner, while verifying changed identities before that classification and never serving cached data on a failed check.

## Exact verification

All commands below ran in `geodecoder-integration/digital`, sequential test concurrency only.

```sh
node --test --test-concurrency=1 tests/cloud.test.mjs tests/network-scaling.test.mjs tests/network-policy.test.mjs tests/progress-scaling.test.mjs tests/module-progress.test.mjs tests/module-cloud.test.mjs tests/offline-cloud.test.mjs tests/offline-runtime.test.mjs
```

PASS: 58 tests, 0 failures, 0 skipped; duration 2273.731951 ms.

```sh
node --test --test-concurrency=1 tests/transport-integration.test.mjs tests/cloud-session-binding.test.mjs tests/active-sessions-cloud.test.mjs tests/email-cloud.test.mjs tests/security-cloud.test.mjs tests/duel-client-lifecycle.test.mjs tests/duel-client.test.mjs
```

PASS: 55 tests, 0 failures, 0 skipped; duration 7492.530532 ms. This includes the installed Supabase SDK session/JWT checks, account-security regressions and Duel retry/lifecycle tests.

Additional checks: `node --check digital/dist/cloud.mjs`, `node --check digital/dist/module-progress.mjs`, conflict marker scan and scoped `git diff --check` all passed. The first draft of the new outbox test incorrectly expected an owner field on outbound events; corrected the assertion to check the bound Authorization header and confirm ownership is not supplied in the client payload, then the complete second command passed.

Total final focused evidence: 113 tests passed across the two commands.

## Remaining integration concerns

- Root still owns final source/build integration, complete suite, release version, actual commit SHA and push verification.
- These focused tests use local transport/database fixtures and the installed SDK; they do not establish hosted SQL installation, real server load, browser service worker behavior or a production Auth flow.
- No known unresolved transport conflict. Existing offline runtime owns durable queue backoff; ModuleProgress's direct RPC retry timer is only used without that adapter.
