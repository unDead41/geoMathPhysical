# SOLO resume audit — 2026-11-05

Private worktree: `/workspace/scratch/7395917c0f68/native-worktrees/worker-3`.
Branch: `app-cloud-game-native-worker-3`; clean after commits. No push.
Base: `709374702674b0ecaeaf2d665204241461bc3a60`; existing implementation
`cb350bd` and route reentry fix retained. Foundation contract 1.0.0;
app 0.1.0+1, firmware unchanged.

## New commits

- `9fd942a99fbb6fb3914c47622c8fc0d4f7f1fcf4` — finalized answer analysis now
  prevents a completed quiz being written/enqueued again after shared newest-50
  retention prunes its aggregate. Its immutable content is still checked before
  returning a durable receipt. Regression uses signed-in SQLite, 53 completed
  quizzes, database reopen and exact outbox comparison.
- `655697ffddc13f6ce5691067370eb770865ce514` — Play has accessible shared buttons
  for Duel and pending formative records, with BM/English copy. Keys:
  `solo-duel`, `solo-sync`; targets: `cloud-game-duel`, `sync.pending`. Buttons
  appear only when each corresponding route is installed.

The first commit also binds finish coalescing to the captured actor and game.
An old actor's delayed writer no longer suppresses a new actor's finalization;
an outdated resume action returns false. Regression holds the guest writer,
switches actor, resumes another completed attempt, then releases the writer and
checks that only the current actor's receipt is adopted.

## Audit and verification

- Existing native engine remains unchanged: two approved canonical JS action
  scenarios consume identical explicit RNG draws, outcomes and states. No claim
  that Dart numeric seeds match JavaScript. Bank15 identity, quiz2/shape,
  practice3/shape, cone, wrongR1/R2, premature R2, double tap, hint and skip
  behavior remain covered by prior engine receipts.
- Correct feedback is 900ms; wrong/skip never auto-advance and require Continue
  after at least 1800ms. Existing engine checkpoint tests cover both input stages,
  feedback and wrong/skip review, fractional elapsed time and frozen remaining
  gates. Actor partitions and schema/ruleset/exact bank validation remain intact.
- `flutter test --no-pub test/features/solo/solo_persistence_test.dart
  test/features/solo/solo_pages_test.dart --reporter expanded`: PASS 13/13.
  Log: `evidence/solo-native/resume-tests.log`.
- `flutter analyze --no-pub lib/features/solo test/features/solo
  integration_test/solo_reopen_test.dart`: PASS, no issues.
  Log: `evidence/solo-native/resume-analyze.log`.
- `dart format --output=none --set-exit-if-changed lib/features/solo
  test/features/solo integration_test/solo_reopen_test.dart`: PASS 11 files,
  zero changes. Log: `evidence/solo-native/resume-format.log`.
- `node --test --test-name-pattern='explicit RNG/clock'
  tools/contracts/verify_exports.test.mjs`: PASS real byte-identical JS replay.
  Log: `evidence/solo-native/resume-js-parity.log`.
- `git diff --check`: PASS before commits. Prior whole SOLO test receipts already
  exist (`native-tests.log` 26/26, `reentry-tests.log` 28/28), so unchanged engine
  and the entire app suite were not repeated during this resume pass.

## Integration and remaining wiring

- Import the two new private commits above after the existing SOLO commits.
  Keep `soloFeature()` contributed in the cloud-game preview. It owns the solo
  namespace, migration1, routes and repository/controller service factories.
- Resolve the shared `FoundationServices.recordsWriter` to the sync writer
  override for signed-in finalization. Sync worker confirmed its immutable
  `sync_solo_receipts` ledger dedupes attempt IDs across ack/retention/reopen and
  the crash window after writer commit but before SOLO's finalized marker.
- QA worker is independently testing the two new Play button tap paths in the
  fully composed preview. Standalone SOLO still boots without Duel/sync routes.
- `integration_test/solo_reopen_test.dart` remains available for real Android
  SQLite reopen. This resume pass did not run an emulator/device, APK build,
  force-stop, hosted sync, physical phone or iOS test; the integrator owns those
  combined gates. No new platform/shared-contract changes are requested.
