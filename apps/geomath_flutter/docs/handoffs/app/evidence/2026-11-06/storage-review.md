# GeoMath combined-app storage audit

Audit date: 6 November 2026. App version: **0.3.0+4**.

**No production storage defect was reproduced in this audit.** Existing local
learning, Solo and signed-in formative data survive the combined migrations and
reopen tests. AI uses a separate local slot and does not create Solo/formative
scores. No production source was changed.

## Source and scope

- Candidate audited: `d4a71ee5690bf6f94c358b857fa59eff828a9d99`.
- Common integration baseline inspected: `e9fd03ce3533865640907c25bf91961f21b6b291`.
- Private worktree: `/workspace/scratch/7395917c0f68/app-handoff/worker-5`.
- Private branch: `app-unified-worker-5`.
- Test-only commit: **`c2b5917897b4aa96524d5158f3bf8c021054ad8c`**.
- Only committed path:
  `apps/geomath_flutter/test/integration/handoff_storage_upgrade_test.dart`.
- Root AGENTS, `docs/SOR_VERSIONING.md`, shared app rules and the storage/foundation
  contracts were read. No firmware, root/core, package, lock, platform, backend or
  hosted-service changes were made. No push was performed.

## Source findings

| Area | Finding |
|---|---|
| Schema ownership | Existing foundation, learning, Solo and sync migration definitions are unchanged from the common baseline. The combined production list adds `ai_battle:1`. Solo composes the AI contribution once; no second foundation record migration or reflection model is registered. |
| Home resume | Home uses the existing checkpoint repository, shared record reader and Solo repository. `readLatest` selects by native partition/scope and rechecks the complete binding after the read. Home keys its state by actor and passes that actor with the resume seed; the learning page accepts a seed only for the current actor. Reads do not promote drafts to completed reflections. |
| Solo presence | New `hasLocalSlot` is a guarded presence query only. Full bank/ruleset validation stays in the existing resume owner. The added Home read does not replace a slot or finalize a result. |
| AI isolation | AI owns `ai_battle_slots`, keyed by native owner partition. It has no formative writer or cloud gateway dependency. Its ordinary checkpoint update requires the existing attempt ID; explicit confirmed creation is required to replace another attempt. Payloads are captured before entering its serialized queue. |
| Current actor | Repository guards check the full actor binding before work, around transaction writes and after the durable transaction completes. Actor changes inside a transaction throw and roll back; post-commit actor changes suppress a receipt to the new actor while preserving the committed old-owner row. |
| AI lifecycle | Background/inactive handling pauses both clocks and checkpoints. Returning to foreground leaves the match paused for explicit resume. Operation/generation/revision guards prevent old save acknowledgements from marking a replacement match as saved. |
| Learning durability boundary | Learning captures on a two-second foreground timer, route cover/leave and return to foreground. Its lifecycle callback does **not** itself flush a new checkpoint on background. Already acknowledged SQLite drafts are protected; this audit does not establish persistence of edits typed after the last acknowledged checkpoint when Android kills the process. |

Relevant source locations are Home `home_study_summary.dart:79`, learning
`learning_checkpoint_repository.dart:87`, learning
`learning_module_page.dart:93`, learning
`learning_module_controller.dart:179,223,634`, Solo
`solo_repository.dart:126`, AI `ai_battle_repository.dart:31,161` and AI
`ai_battle_controller.dart:342,386,453` (relative to the corresponding feature
directories in `apps/geomath_flutter/lib/features/`).

## Real host SQLite evidence

The new integration test uses **actual `productionFeatures()` migration
contributions**, real on-disk `SqliteAppDatabase` / `sqflite_common_ffi`, the real
repositories, the real formative outbox adapter and the actual exported question
bank. A seeded `SessionController` provides explicit local guest/account fixture
bindings; no authentication or hosted request is simulated as a server success.

Its single scenario verifies:

1. A database opened with all pre-AI production migrations has exactly the four
   existing migration identities: foundation records, learning checkpoints,
   Solo and sync.
2. A stable guest plus two account partitions each retain an R2 Solo selection,
   a finalized Solo result/analysis, a completed reflection and a learning
   checkpoint. Signed-in aggregate/outbox/receipt writes use the actual adapters.
3. Upgrading that file with the full combined production migration list adds
   exactly `ai_battle:1`. All row values and serialized payload strings in the
   seven existing data tables remain exactly equal to the pre-upgrade snapshot.
4. Home's checkpoint/latest and Solo presence/read paths can read the retained
   per-owner data after fresh native sessions without changing stored rows.
5. Three actor partitions get independent AI slots. R2 stage, selected net and
   the saved plan survive database close/reopen. Advancing the test clock by
   90 seconds through background/foreground does not advance either paused game.
6. Completing all ten signed-in AI questions changes only that AI slot. Original
   Solo analysis/results, reflections, learning checkpoints, outbox and sync
   receipts stay equal to the pre-upgrade snapshot.
7. A third database open restores the completed AI domain state with score 10;
   the ledger still has five entries and the AI table still has three owner rows.

The existing narrow repository suites additionally exercise real transaction
rollback after INSERT/UPDATE/DELETE, stale actor writes and reads, guest/account
isolation, corrupt/incompatible saved data, replace confirmation, queued deletion,
immutable completed results, aggregate/outbox rollback, retained Solo finalization
receipts, and lifecycle save/leave behavior.

## Commands and outcomes

Commands ran from
`/workspace/scratch/7395917c0f68/app-handoff/worker-5/apps/geomath_flutter` with
`PUB_CACHE=/workspace/scratch/459484a16739/pub-cache` and Flutter executable
`/workspace/scratch/459484a16739/toolchains/flutter/bin/flutter`.

```text
flutter test --no-pub \
  test/integration/handoff_storage_upgrade_test.dart \
  test/features/learning/studio/learning_checkpoint_repository_test.dart \
  test/features/solo/solo_persistence_test.dart \
  test/features/ai_battle/data/ai_battle_repository_test.dart \
  --reporter expanded
```

**Exit 0, 36 tests passed.** Log: `reports/storage-tests.log`.

The final test was then extended to restore the completed AI state after a third
open and verified again:

```text
dart format test/integration/handoff_storage_upgrade_test.dart
flutter test --no-pub test/integration/handoff_storage_upgrade_test.dart --reporter expanded
flutter analyze --no-pub test/integration/handoff_storage_upgrade_test.dart
git diff --cached --check
```

**All exit 0.** Final test: 1 passed. Analyzer: no issues found. Format check:
no remaining change. Logs: `reports/storage-upgrade.log`,
`reports/storage-analyze.log`. Commit metadata: `reports/storage-commit.json`.

## Device and installation limits

No Android/emulator/physical-device execution, OS force-stop test, installed-data
inspection, native secure-store round-trip or in-place APK update was performed
by this worker. Host SQLite success does not establish those outcomes.

The source retains application ID `com.geomath.dev`. The installed old signing
certificate/private key remains unknown here. Keeping that package ID is
necessary for an in-place update but does not establish a matching signature.
Creating a new package/key cannot repair an old package's update compatibility
or copy its existing private app data. The matching original signing key must be
used before a data-preserving update can be promised. The existing handoff
`docs/handoffs/app-cloud-game/ai-battle-20261106/ORIGINAL_APP_APK.md` documents the
same unresolved compatibility boundary. No uninstall, data clear, signing bypass
or alternate-package workaround was performed or requested by this audit.
