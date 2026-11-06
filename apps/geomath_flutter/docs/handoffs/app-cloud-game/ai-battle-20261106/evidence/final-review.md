# Independent final AI battle review

Reviewed on 6 November 2026. Reviewer: QA worker, read-only production review.

- Repository: `/workspace/scratch/7395917c0f68/ai-battle/repo`
- Exact HEAD: `baa7bdf8a0cb6ec0dc13a43cca4131bcbcc00722`
- Exact tree: `c3f607f616f27cef925d95c3651e7ea67969ec8e`
- Comparison base: `e9fd03ce3533865640907c25bf91961f21b6b291`
- Scope: 18 files, 5,429 insertions and 3 deletions. Working tree was clean. `git diff --check` passed.

## Verdict

**Approved for source integration. No unresolved Critical or Important finding identified.** This is a source review and host-test assessment, not a claim of physical Android acceptance or a substitute for the parent's final full-suite/build verification.

## Reviewed invariants

1. **Difficulty and adaptation.** Easy, Medium and Hard implement the agreed probability and completion-time ranges. Cumulative completed human correct pairs raise the next question's probability and lower both delay bounds, with pressure capped at eight correct answers. One complete-pair draw avoids squaring the probability. Every incorrect plan actually has a wrong R1 or R2 choice; wrong R1 completes at the full bounded answer delay. These are simulation parameters, not measured player win rates. Individual sampled times and outcomes can vary even while their bounds and probability improve.
2. **Fixed plans and independent randomness.** The human round has its own saved seeded stream; opponent draws are separate. A question's plan uses only earlier completed human answers. Human taps, R1 success, hints, current R2 success and reopening cannot reroll or retroactively change that plan. Saved seed, stream position, draw tape and plans are validated against the canonical player replay and reconstructed plans.
3. **Canonical gameplay and scoring.** The human uses the existing SoloGame and question bank, with ten balanced questions. Browse and select remain separate from explicit R1/R2 scans. Complete correct pairs score one; wrong/skip score zero. Both contestants settle before review and manual Continue. The winner compares score first and active answering time second, with an exact draw supported. AI result records and timing remain separate from human records.
4. **Pause, restore and ownership.** Pause/background/route cover stops both contestants; foreground return requires Resume. Reopening reconstructs elapsed active time, remaining AI delay, stage, review gate, selected card and original attempt. Validation rejects malformed bank/ruleset/policy, timers, shapes, plans, answer counts and RNG state. Actor epochs guard asynchronous work; switching accounts clears the old live game and cannot publish its delayed writes into the new actor. Serialized bounded SQLite operations preserve actor partitions and reject obsolete attempt updates.
5. **Persistence failures and navigation.** The initial paused plan is committed before active play. Immutable checkpoints are captured before queued writes. Save failures remain visible and prevent leaving; the last durable slot survives rejected inserts/updates. Corrupt slots are retained and require explicit replacement. Late initial-save completion after a background or back intent cannot silently start an active match.
6. **Presentation.** The real route exposes the three levels, honest probability/cap explanations, shared mathematical formula/variable presenter and shared horizontal solid/net carousel. Active UI reads target accuracy and stage, without reading sampled answer shapes or correctness. Choice and correct-answer review is gated until both contestants settle. Stale callbacks verify actor, attempt, question, stage and live game. Distinct setup/match-question/result scaffold keys reset question scroll position while ordinary preference rebuilds retain it.
7. **Integration and isolation.** Solo composes the feature's services, localizations, migration and one hidden-navigation route exactly once, with a Main play entry and durable back policy. AI writes only its own `ai_battle_slots` table. No AI path writes Solo leaderboard/analysis/history, class or live Duel scores, receipts or formative outbox. Existing Duel, classroom and profile implementations are outside this change.
8. **Frozen scope.** The comparison contains only new AI files, the three scoped Solo integration files and tests. Shared/core/root composition, platform files, pubspec/lock files, workflows, canonical bank/Solo engine, digital and firmware files are unchanged.

## Exact fixes verified in the final tree

- `AiBattleGame.restore` validates a saved non-null selection against canonical `SoloStatus.running`, allowing paused pending R1 and R2 selections. The regression test explicitly covers both stages and rejects a settled selection.
- `AiBattleScreen` keys the match scaffold by attempt and question index. Its ninth widget case checks first-question and next-question scroll reset, plus scroll retention across language/theme updates.

## Evidence and limits

My earlier independent production-composition/SQLite flow suite passed **7/7**, and its scoped analyzer reported no issues. It covers all three full ten-question matches, R1/R2 scan and browsing invariants, both AI-stage disk reopen checkpoints, storage rejection, actor isolation and exclusion from official/Solo/formative records. Those tests are integrated unchanged in this exact HEAD. Details and logs are in `qa.md`, `qa-flow-tests.log` and `qa-flow-analyze.log`.

This final pass reread the combined production implementation and relevant regression tests and checked the exact Git scope. It did not rerun the broad suite; the parent is doing that on this tree. No real-phone install, real-time device timing, hosted service or empirical win-rate claim is made.

The agreed Android deliverable is a separately labelled preview built from an isolated copy: package `com.geomath.ai.preview`, launcher `GeoMath AI`, with the authentication VIEW filter removed in that build copy. Those identity changes are not in the reviewed production Git diff. The preview must be described as a side-by-side installation, not an in-place update of an APK signed with a different key; signing and physical-device acceptance remain separate release evidence.

## Tests-only follow-up

Read-only review also approved HEAD `c50b539f47744ce1ff21070be38141db9868b429`, tree `d903bbf78a8caa62f2cc6edcf087fbcd49732608`, against the previously reviewed `baa7bdf8` snapshot. The only tracked change is `test/features/ai_battle/presentation/ai_battle_screen_test.dart` (140 insertions, 16 deletions); diff checks pass. Production `lib` and `assets` subtree hashes match exactly. No new production or release-identity change is introduced.

The fixture now polls actual readiness/save/disposal state with a ten-second wall-clock deadline while advancing both real I/O and widget frames. Cleanup tracks and rethrows disposal errors rather than leaving an unobserved future. A test-only wrapper delays the second real SQLite read by 800 ms and delegates all real database operations. `ui-slow-before.log` demonstrates that the earlier fixed300ms pump budget returned while `c.loading` remained true. `ui-harness-final.log` records **10/10 passing** in 13 seconds, and `ui-harness-analyze.log` records no issues. Existing behavioral assertions remain in place, with one additional delayed-read/cleanup regression.

No Critical or Important follow-up finding was identified. The original concurrent full-suite cleanup stall's exact cause remains an inference, not a proven stack diagnosis; the reproduced readiness defect and the passing focused suite are narrower evidence. This reviewer did not rerun the broad suite, and its final result remains the parent's separate verification. The unchanged runtime source means this tests-only follow-up does not require a different production APK.
