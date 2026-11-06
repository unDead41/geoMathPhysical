# GeoMath — offline adaptive AI battle

**Packaging correction:** the preferred artifact now uses the original **GeoMath** application identity. [Original-app APK and signing compatibility](ORIGINAL_APP_APK.md). The separate GeoMath AI preview described below is historical.

Implemented and verified on 6 November 2026. Main → **Lawan AI / Play AI** opens a separate local ten-question game with Easy, Medium and Hard opponents. More completed correct player pairs increase the next question's target accuracy and reduce its response-time bounds, up to the selected level's caps. The new ARM64 preview APK is built and signature-verified; physical-phone acceptance is pending.

## Exact source

- Remote runtime commit: `ec578641a3e33e167c23aab85780550d7575f6e0`.
- Parent: `1d7c8f7e4a6b980b1a911729e73818f79476302f` on `app-cloud-game`.
- Exact runtime/test tree: `d903bbf78a8caa62f2cc6edcf087fbcd49732608`; 18 scoped files.
- Local combined source: `c50b539f47744ce1ff21070be38141db9868b429`. Its final change is tests only; `lib` and `assets` are byte-identical to APK build input `baa7bdf8a0cb6ec0dc13a43cca4131bcbcc00722`.
- Shared production composition, core, platform, pubspec/lock, canonical question bank/Solo engine, assets, firmware and digital sources remain unchanged. App version remains `0.1.0+1`; foundation contract remains `1.0.0`.
- Publication is only to `app-cloud-game`. No hosted migration, provider, SMTP, Edge, Pages or store deployment is performed.

## Rules and adaptation

| Level | Initial → capped correct-pair probability | Initial → capped answer-time range |
| --- | --- | --- |
| Easy | 40% → 65% | 10–16 s → 7–11 s |
| Medium | 60% → 82% | 7–11 s → 4–7 s |
| Hard | 78% → 96% | 4.5–7.5 s → 1.8–4 s |

Pressure is `min(completedCorrectPairs, 8) / 8`. Probability and both delay bounds interpolate linearly. Adaptation resets for each match and is applied only when starting the next question. A current question's committed plan cannot change or reroll after a tap, hint, scan, pause or reopen. These probabilities describe the simulated opponent's whole correct pair; they are not empirical human win rates or a guarantee of any individual answer. Sampled outcomes and times vary within the improving probability/bounds.

Both contestants receive the same ten canonical questions. The human uses existing single-attempt Solo rules: browse/select a solid, explicitly scan R1, then browse/select a net and explicitly scan R2. A complete correct pair scores +1; wrong/skip scores 0. Browsing does not select or consume a scan. The two contestants finish the current question before answer review and manual Continue. AI answer shapes and correctness are hidden until both finish. Highest score wins, then shortest total active answering time; an exact tie is a draw.

Independent persisted random streams keep AI sampling from changing the player's question order/cards. One bounded, pre-sampled AI plan per question selects a genuinely correct or incorrect pair and its completion time. Wrong R1 outcomes also retain the profile's bounded total answer delay.

## Native behavior

- Offline SQLite save is owned by `ai_battle:1` / `ai_battle_slots`, with one slot per actor. Paused R1/R2 selection, plan, remaining active time, progress and random state survive reopen. Malformed saves are retained and require explicit replacement.
- Both clocks stop on pause, background and route cover; returning requires Resume. Back pauses and saves, and a save failure keeps the user on the route.
- Initial plan is durably committed before the active clock starts. Actor epochs and serialized immutable saves prevent delayed operations from publishing into another account or attempt.
- Existing typeset formulas, BM/English variable legends and horizontal solid/net carousel are reused. Language/theme preferences retain the current match and ordinary scroll position. Setup/start, next-question and result transitions reset the relevant vertical position.
- AI results use their own local slot. No AI match is written to Solo leaderboard/analysis, formative history/outbox, classroom or online Duel scores.
- `soloFeature()` composes AI service/migration/localization/route contributions exactly once, preserving the frozen root production factory. The new route is `ai-battle` at `/play/ai`, with guarded back behavior and no destination navigation during play.

## Verification

| Check | Result |
| --- | --- |
| Full Flutter suite | **598 passed**, including 61 new AI cases |
| Formatter | 207 files; 0 changes |
| Full analyzer | No issues |
| Canonical exporter / native adapter | 12 passed |
| Difficulty/engine | 17 passed |
| Real SQLite storage | 12 passed |
| Controller/storage/lifecycle | 12 passed |
| Main entry / existing Solo isolation | 3 passed |
| Independent composed flow | 7 passed; full matches at all 3 levels and both AI-stage disk reopen |
| AI widgets | 10 passed; includes 320dp/150%, language/theme, hidden answers, scrolling and delayed real reads |
| Existing guest route matrix | 20 routes × 16 profiles = 320 combinations |
| Opt-in host captures | 1 scenario passed; 5 real Flutter widget images |
| Independent final review | Approved; no unresolved Critical/Important finding |
| ARM64 release APK | Build, ZIP CRC, v2 signature, package/launcher/manifest and 158 runtime/asset fingerprints passed |

Copied text logs normalize terminal trailing whitespace only. The final full run is [final-tests.log](evidence/final-tests.log). The first full attempt reached 588 completed cases but stalled in the first widget fixture; it was interrupted. An 800 ms delayed real SQLite route read reproduced the fixture's premature 300 ms readiness assumption. The fix waits for actual state with a bounded wall deadline and pumps frames plus real I/O during cleanup. The exact cleanup cause of the original stall remains an inference. [Review](evidence/final-review.md) preserves this distinction. Production code was not changed for that fixture fix.

## APK and preview identity

`GeoMath-AI-Preview-arm64.apk` is 21255875 bytes; SHA256 `e7d2e249c9738170b0753b5f116707797431236e5be8dc88f668e50043c4ecab`. The ZIP backup contains that exact APK, instructions and its hash. The public backend configuration follows the inherited ignored local define mechanism; no credentials or signing key are included in this handoff.

The isolated build copy uses package `com.geomath.ai.preview` and launcher **GeoMath AI**, with its authentication VIEW filter removed so it does not intercept the original app's callback. Product Dart/assets and dependencies are unchanged. Native production platform files in Git are unchanged. It installs alongside the original package, avoiding the user's observed mismatched-signature update conflict. Existing app records are not copied between the two package identities.

Minimum Android API 24, ARM64 only, release mode with development signing. Build-name is `0.1.0-ai.1`; configured build-number 2 becomes ARM64 split Android versionCode 2002. This is a preview, not a production store signature or a completed phone-install acceptance. No physical Android/emulator execution of this new APK is claimed.

Build and identity evidence: [receipt](evidence/preview-build-inputs.json), [APK verification](evidence/apk-verification.json), [successful build](evidence/preview-build.log). A first `--no-pub` release attempt retained debug registration of the dev-only integration_test plugin; the successful build allows Flutter's release-specific tooling regeneration. ARM64 splitting excludes other plugin ABIs. These were isolated build steps, with no production dependency/platform edit.

## Handoff

- [PowerShell run commands](RUN_POWERSHELL.md).
- [Host previews](HOST_PREVIEWS.md), explicitly host-rendered fixtures with controlled clock/seed; they are not phone screenshots or measured player results.
- [Prior cloud/game handoff](../history/2026-11-06-before-ai/LATEST.md), retained as historical evidence with links pinned to the original commit. Existing Duel/Kelas/Profil, swipe cards and formula presentation are preserved.
- Hosted authenticated/two-client class/Duel/profile acceptance and the existing native Google callback gate remain inherited limits. They do not block the offline AI mode and are not claimed as completed by this change.
