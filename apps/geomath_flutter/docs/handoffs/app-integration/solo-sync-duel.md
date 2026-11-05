# Solo, shared records, sync and Duel integration audit

Status: **host verified; device and hosted gates separate**.

Source merge: `fb40af0d85c7bce12034d85b768a8efeb72afe5d`, incorporating learning `8a5527438ee828a306afba36a337a3ca3bbedb83` and cloud/game `33e6734a27db789f04a9a048bf7f69ebd046e016` on foundation `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`.

The final cross-feature test uses the integrator's actual `productionFeatures()` factory. At test time the lead's production wiring was uncommitted and was copied read-only to this private worker for validation. SHA256: `lib/app/production_features.dart` = `dac9543a757b9fc02ca78e3b195aeb50b4cb1c68d66009869a59ecbd79f0fbf3`; `lib/app/cloud_game_features.dart` = `c7aecb5eed6b7476449b299d29c7319a72d6b923b949163637fb32a2c72b6c86`. Only worker-owned test/evidence files are committed by this worker. The lead must run the integrated full suite on its final source before publication.

## New cross-feature checks

`test/integration/solo_sync_learning_test.dart` adds three tests against real SQLite, actual feature contributions, controllers and record repositories:

1. Learning and Solo resolve the exact same `FoundationServices.recordsWriter` / `SyncServices.writer`. The outbox extension resolves one appender, startup is coalesced, and the sync controller is one service owner. Unique learning/solo/sync migrations are installed and only one reflection table exists.
2. A SQLite trigger rejects queue insertion. A failed learning save rolls back its shared reflection; a failed Solo finalization rolls back its shared aggregate/event/receipt and leaves detailed analysis unfinalized and absent from the scoreboard. Explicit retry commits both record kinds to the same queue. Close/reopen and repeated finalization retain one Solo receipt and exactly two pending events.
3. Guest learning and Solo stay local. Binding test actors A then B exposes neither guest nor A history to B, rejects stale A saves, keeps A's pending rows and returns to guest records on logout. These bindings are explicit storage test identities; they do not prove server authentication or roles.

## Commands and results

Commands ran in the worker app with Flutter 3.47.9/Dart 3.13.7, cached dependencies and `TMPDIR` pointing to this worker's scratch directory.

| Command | Result |
| --- | --- |
| `flutter pub get --offline` | Exit 0 |
| `flutter test --no-pub test/features/solo test/features/sync/native_outbox_test.dart test/features/duel --reporter expanded` before merge | Exit 0, 156/156 |
| `flutter test --no-pub test/integration/solo_sync_learning_test.dart --reporter expanded` after source merge | Exit 0, 3/3 |
| `flutter test --no-pub test/integration/solo_sync_learning_test.dart test/features/solo test/features/sync/native_outbox_test.dart test/features/duel --reporter expanded` with actual production contribution factory | Exit 0, 159/159 |
| `flutter analyze --no-pub test/integration/solo_sync_learning_test.dart` | Exit 0, no issues |
| `dart format --output=none --set-exit-if-changed test/integration/solo_sync_learning_test.dart` | Exit 0 |

Logs: [worker-5 evidence](evidence/worker-5/).

## Audit conclusions and limits

No additional runtime defect was found within the audited Solo/sync/Duel scope. Existing tests exercise canonical RNG/time parity, R1/R2 single attempts, process-style checkpoint reopen, feedback/review timing, actor changes, aggregate retention and idempotence, queue capacity 2000 without eviction, invalid/partial/missing acknowledgement, Retry-After, old-flight invalidation, lifecycle and read-only history. Duel tests cover lost acknowledgement with identical protected sequence replay, late poll/mutation ordering, rate limits, background deadlines, actor/room changes, protected store failures and acknowledged forfeit. Official marks remain projections of server responses.

Host transport fixtures are not a real two-client Duel or hosted authorization proof. Real Android execution/screenshots, process killing on a device, native gestures/TalkBack and hosted staging Auth/classroom/sync/Duel remain the integrator's separate gates. No backend, Auth configuration, migration, Pages or store deployment was performed.
