# AI/Solo integration audit — worker 1

- Date: 2026-11-06 (UTC).
- App version under audit: `0.3.0+4`; foundation contract `1.0.0`.
- Worktree: `/workspace/scratch/7395917c0f68/app-handoff/worker-1`.
- Branch: `app-unified-worker-1`.
- Combined input commit: `d4a71ee5690bf6f94c358b857fa59eff828a9d99`.
- Fix commit: `c63ff836c8ada5efbf25271e91ea681e8862dc8c`.
- Fix tree: `7d28a9d3bf88fbb5ada879eac3ffb7b5af01b5ae`.
- Final private worktree status: clean. No remote push.

Read root `AGENTS.md`, `docs/SOR_VERSIONING.md`, common Flutter rules, app README,
foundation contract and current AI handoff. Remote/main baseline audit remains
the lead's responsibility; this sparse clone has private local heads only.

## Confirmed integration regression and fix

At the combined input commit, starting an AI match from the scrolled setup screen
restored its vertical offset into the first question. The existing test
`question transitions reset vertical position while preferences retain it` failed
at `ai_battle_screen_test.dart:571`: expected `0`, actual `1369.0`.
The same failure reproduced in an isolated run.

The UI refinement's shared scaffold persists an explicit scroll identifier.
The AI screen's existing widget keys were insufficient because setup, every
question and results all inherited the same default scroll identifier.

After lead authorization, changed only
`apps/geomath_flutter/lib/features/ai_battle/presentation/ai_battle_screen.dart`
(three insertions): explicit setup scroll key, match key scoped by attempt and
question index, and result key scoped by attempt. No shared/core, platform,
pubspec/lock, asset, bank, Solo engine or test changes. The existing regression
test now passes, including next-question reset and ordinary preference retention.

## Audit findings

- Production `soloFeature()` includes one AI route, controller, repository,
  localization contribution and `ai_battle:1` migration. Main's AI entry reaches
  `/play/ai` while the saved Solo R2 attempt remains intact.
- AI plan sampling stays fixed during the current question; only prior completed
  correct pairs influence the next question. The selected difficulty caps at
  eight correct pairs. Easy 40–65% / 10–16s to 7–11s, Medium 60–82% / 7–11s to
  4–7s, Hard 78–96% / 4.5–7.5s to 1.8–4s. Wrong R1 completion obeys the same
  bounded total answer time.
- AI answers and canonical answer review remain hidden while the player can
  answer, including when AI finishes first. R1/R2 submission remains explicit;
  browsing does not select, score or consume attempts/random draws.
- AI and Solo reuse `GameQuestionContent` and `GameCardCarousel`. Solo's merged
  formula/variable rendering passes at BM 320dp and English 390dp, both 150%.
  AI setup/match/pause/review passes at 320dp/150% in both languages and themes.
- Saved AI plans, independent random state, paused clocks and R2 selection survive
  replay; actor/epoch changes and late acknowledgements remain guarded.
- Real SQLite tests verify actor partitioning, transaction rollback, bounded JSON,
  immutable queued saves, explicit replacement and ordered deletion. AI's separate
  slot does not write Solo scores, analysis, completed formative records or outbox.
- No remaining finding in this scoped host audit after the fix.

## Commands and results

Environment: Flutter `3.47.9`, Dart `3.13.7`,
`PUB_CACHE=/workspace/scratch/459484a16739/pub-cache`;
toolchain `/workspace/scratch/459484a16739/toolchains/flutter`.
Commands ran from `apps/geomath_flutter/` using the provided package configuration
and real cached SQLite library; no dependency or configuration edits.

| Check | Result |
| --- | --- |
| Initial `flutter test --no-pub test/features/ai_battle test/features/solo/solo_pages_test.dart --reporter compact` | Exit 1; 61 pass, 1 fail (scroll regression above) |
| Isolated failing scroll test with `--plain-name 'question transitions reset vertical position while preferences retain it' --reporter expanded` | Exit 1; same 1369px failure; `game-scroll-isolated.log` |
| `dart format --output=none --set-exit-if-changed lib/features/ai_battle/presentation/ai_battle_screen.dart` | Exit 0; 1 file, 0 changes |
| After fix: `flutter test --no-pub test/features/ai_battle/presentation/ai_battle_screen_test.dart --reporter expanded` | Exit 0; 10 passed; `game-widgets-fixed.log` |
| After fix: `flutter test --no-pub test/features/ai_battle test/features/solo/solo_pages_test.dart --reporter expanded` | Exit 0; 62 passed; `game-scoped-fixed.log` |
| `dart analyze lib/features/ai_battle/presentation/ai_battle_screen.dart` | Exit 0; no issues; `game-analyze-fixed.log` |

Logs reside alongside this report. The AI directory contains 54 cases; its
historical handoff's 61-case count includes seven separate
`test/integration/ai_battle_flow_test.dart` cases, reserved for the lead's full run.
The other eight cases in this worker's combined run are Solo page tests.

## Limits and continuation

This is exact-source host unit/widget/real-SQLite verification. No APK, emulator,
physical Android, hosted Auth/classroom/Duel, store, backend migration or production
deployment acceptance is claimed. The lead should merge the single-file commit
and run the full combined suite because the fix resolves an actual integration
regression. Parent owns final documentation, version/publication and remote SHA.
