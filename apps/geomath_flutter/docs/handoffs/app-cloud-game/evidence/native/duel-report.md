# Native Duel resume review

Completed on 2026-11-05. Owner scope remained `lib/features/duel/**` and matching tests.

## Private commit and integration

- Worktree: `/workspace/scratch/7395917c0f68/native-worktrees/worker-4`
- Branch: `app-cloud-game-native-worker-4`
- Input commit: `6ee865218ce4b6a1e1c3850f181a7d630ee5adb4`
- New commit: **`ac16896b0886aa1ad8340185e3ba0e24cd519992`**
- Subject: `Preserve native Duel retry recovery and verify real Edge projections`
- Worktree clean after commit; no push, remote mutation, backend call, deployment or firmware edit.
- Ordinary `git commit` could not build this synthetic sparse repository's tree because the unchanged `.gitattributes` blob `fd11837d262923f85a366e699b1caf83188b1fb3` is absent. Committed the staged scoped changes with `git write-tree --missing-ok`, `git commit-tree`, then an expected-old-SHA `git update-ref` on this private branch. Every changed file has its real local Git blob; untouched tree pointers were preserved.

Parent can cherry-pick `ac16896b0886aa1ad8340185e3ba0e24cd519992` after the existing `6ee8652` Duel implementation.

## Findings fixed

All five regressions were first reproduced against the unchanged implementation. Their failing output is `duel-retry-regressions-before.log` beside this report.

1. A 502/other upstream HTTP error with HTML or an empty body was classified as invalid protocol JSON and permanently stopped recovery. HTTP error status is now handled before successful-projection validation; transient retries retain exactly the original immutable command and sequence.
2. A non-JSON 429 ignored its status and Retry-After. It now preserves the pending command, records the cooldown and permits an identical retry only after the cooldown.
3. A 429 from an older overlapping state poll was discarded after a newer scan succeeded. Its shared capability cooldown now applies while retaining the newer acknowledged stage/score snapshot.
4. A later, shorter overlapping Retry-After could shorten an existing longer cooldown. The deadline now only moves later.
5. A retired room's delayed transport failure returned a network error under the next capability. Both success and failure paths now validate actor, epoch, capability token and requested room; obsolete requests return stale without touching the new room.

Malformed successful projections still fail closed and stop protocol traffic.

## Real source parity

Read the pinned canonical source through the GitHub connector at `752ce908d16d13acc9cc7510797e8363d182c3f5`:

- `digital/backend/duel/functions/geodecoder-duel/handler.mjs`, Git blob `c8b0e4636b6613d9e3d29af491e7bccb1b3ee23f`
- `digital/backend/duel/functions/geodecoder-duel/questions.mjs`, Git blob `801fa44fbe7b260466de762d52c7ce4bfa61b498`
- `digital/backend/duel/supabase/migrations/20261026091324_duel_durable_review_v2.sql`, Git blob `626b4ad3861738c6b4335333bd1a0e8b539dd192`
- `digital/docs/DUEL_V2.md` and `digital/dist/duel.mjs`

Added `test/features/duel/fixtures/generate_source_projection.mjs`, which validates the exact source Git blob hashes before importing the **real** `projectDuelSnapshot` and question content. The committed JSON contains 28 actual Edge projector outputs over synthetic SQL-shaped inputs: all 15 active bilingual questions, net stage, confirmed hint, correct/wrong-R1/wrong-R2/skipped review, complete final review, complete advance, deadline completion and waiting/countdown/cancelled/expired states. These are source parity fixtures, not hosted SQL or two-client deployment receipts. Regeneration uses no credentials or network calls.

Corpus SHA-256: `aeb684341035dc423f257a08acef674102cf106aec4ab451d1c1e363bab38c70`.

Reviewed invariants retained:

- Real wire keys: protocol/action/token; roomId for room operations; seq for mutations; questionIndex for hint/scan/skip/advance; kind/shape/target for scan. Same pending JSON and sequence survive loss, storage recovery and restart.
- Separate protected capability/pending store by actor partition; no SQLite, WebView, Auth SessionStore or formative outbox storage for Duel credentials/actions.
- Full actor/session/epoch/scope guards plus capability token and room identity; old dialog generation cannot leave a later room.
- Server-owned question, attempts, outcomes, scores, deadlines and review state. No Solo engine or bank import exists anywhere in Duel. Active DTOs reject shape/original bank ID/hint before acknowledgment and opponent token/seq/answers/attempts/hint details.
- Correct auto-advance after the server 900 ms gate, wrong/skipped explicit Continue after the server 1800 ms gate, and advance of question 9 after room complete are covered. Background/dialog time continues; expiry is reconciled from the server, never locally scored.
- Single polling owner and coalesced refresh; lifecycle suspension/resume; terminal/protocol/access/storage stops; Retry-After seconds and HTTP-date handling.

## Checks and receipts

Executed from `apps/geomath_flutter` with `/workspace/scratch/7395917c0f68/toolchains/flutter/bin/flutter` (and sibling `dart`):

| Check | Result | Evidence |
| --- | --- | --- |
| Five new focused regressions before fix | Expected failure, all 5 reproduced | `duel-retry-regressions-before.log` |
| Changed controller suite | PASS 29/29 | `duel-controller-resume.log` |
| Pinned real projector fixture generation | PASS, 28 outputs; exact Git blobs verified | `node test/features/duel/fixtures/generate_source_projection.mjs /workspace/scratch/7395917c0f68/evidence/duel-source` |
| `flutter test --no-pub test/features/duel --reporter expanded` | PASS 80/80 | `duel-resume-tests.log` |
| `flutter analyze --no-pub lib/features/duel test/features/duel` | PASS, no issues | `duel-resume-analyze.log` |
| `dart format --output=none --set-exit-if-changed apps/geomath_flutter/lib/features/duel apps/geomath_flutter/test/features/duel` from repository root | PASS, 14 files unchanged | Command exit 0 |
| `git diff HEAD^ HEAD --check` | PASS | Command exit 0 |

Existing passing 44-test/analyzer receipts were inspected first. The scoped suite was rerun after actual controller and fixture changes. Its native widget coverage includes entry/match/review/result at 320 dp and 150% text in BM/English and light/dark, real shared geometry rendering, unavailable configuration, native controller actions and all back-confirmation boundaries.

## Foundation and wiring

- Common verified READY commit: `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`; local adoption: `41b5774694c83b9d2464df4bbc3bc55046a79dd8`.
- Contract 1.0.0 / app 0.1.0+1. Frozen contract SHA-256 remains `0a31f7aef121a151ee91a4ae92250fd893ad62108f27a9389b5fa5ed9a918356`; source-lock SHA-256 remains `cf7d5e6a54c6da65d70f97caae26cff059de558f3fd56db97245252358220452`; pubspec.lock SHA-256 remains `9ba313c3af1f80193c6c0a61c2e38fcee51f1b5aabb8404ebdccfd04210f542c`.
- `duelFeature()` registers the one controller, namespace, four routes and guarded back handlers. Production defaults are `IoDuelTransport` and `SecureDuelProtectedStore`, borrowing foundation actor, clock, RNG and lifecycle. The injected fake seam is used only by tests. Empty public backend configuration displays unavailable without fake create/join.
- The parent preview's `lib/dev/cloud_game_features.dart` already includes `duelFeature()` and wraps it with shared startup.
- **Integration action for Solo/assembly owner:** current `/play` `SoloPlayPage` has no Duel entry. Add a native entry opening route **`cloud-game-duel`**; no Duel source changes are needed. Existing alternative entry routes are `cloud-game-duel-lobby`, `cloud-game-duel-match`, `cloud-game-duel-result` and all resolve the same controller/session.
- No new dependency, migration, asset registration, platform change or frozen API request is required.

## Limits

No feature-local source/compile blocker remains. This review did not run an Android APK/device/Keystore round-trip or a hosted two-client Duel match; parent owns the combined preview build/device validation. Public URL/key configuration is required for real requests. Confirm deployed protocol 2 migration/Edge capability and guest reachability on an authorized staging endpoint, including its gateway JWT/public-key policy; source and local tests do not prove hosted activation. No SMS, Google consent, backend deployment, production capacity, iOS or physical-device claim is made.
