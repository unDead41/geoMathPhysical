# GeoMath app handoff for the next AI

Verified consolidated baseline on 6 November 2026: app **0.3.0+4**, branch **app**, runtime merge commit `888f6ec23d66678182825e3d3ab50ba69413d62e`. The final branch head may additionally contain handoff-only documentation; verify `origin/app` before starting.

## Start here

Use repository `unDead41/geodecoder`, branch **`app`**, and project **`apps/geomath_flutter/`**. The installed app uses **`lib/main.dart`**, original Android application ID **`com.geomath.dev`**, launcher **GeoMath**, and callback **`com.geomath.dev://auth/callback`**. Lawan AI is inside the same application at Main → Lawan AI. Development preview entry points are not the combined user application.

Read root `AGENTS.md`, `docs/SOR_VERSIONING.md`, `docs/geomath-app-prompts/COMMON_RULES.md`, the app's local guidance, `docs/FOUNDATION_CONTRACT.md`, `docs/STORAGE_CONTRACT.md`, `docs/SOURCE_LOCK.md`, and this handoff before changing the game. Inspect `git status`, the branch and the actual remote head. App versioning is independent of firmware; app-only work does not bump `main/firmware_version.h`.

## Sources combined

All six app branches are represented. Live GitHub readback during this review identified:

| Source | Exact branch head | Included responsibility |
|---|---|---|
| `app-foundation` | `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e` | Frozen foundation 1.0.0, typed services/storage/session/bridge and initial native shell |
| `app-learning` | `8a5527438ee828a306afba36a337a3ca3bbedb83` | Eleven-model learning, labs, studio, checkpoints and shared reflections |
| `app` / `app-integration` before this consolidation | `20eed848cc015d6253accd6cf72fcf127bf72827` | Production composition, guarded navigation, native WebView bootstrap and integration fixes |
| Common latest cloud/game base | `1d7c8f7e4a6b980b1a911729e73818f79476302f` | Solo/Duel carousel and math, classroom ownership and profile reconciliation fixes |
| `app-cloud-game` | `288dc703d61479cb89a22d4f2416d71d9b8294ac` | Offline adaptive AI and original-app APK packaging correction |
| `app-uiux-refinement` | `67c1e1bf76064d5df2787bef90ec789d1a21a975` | Eighteen UI improvements, adaptive navigation, system text, learning controls, guarded drag, PIN clipboard and progress/resume |

GitHub compare proves the listed foundation, learning and integration heads are ancestors of the cloud/game head. Both final feature branches descend from the listed common base. Historical branch handoffs remain under `docs/handoffs/`; their test counts and screenshots describe their named sources, not the new combined app.

## Source map

Paths below are relative to `apps/geomath_flutter/`.

| Area | Actual owner / entry |
|---|---|
| Production wiring | `lib/main.dart` → `lib/app/production_features.dart` → learning plus `lib/app/cloud_game_features.dart` |
| Startup and shared ownership | `lib/app/app_dependencies.dart`; one database, session, preference, audio, geometry and formative reader/writer owner; production awaits session/sync startup before Home |
| Routes and leave behavior | `lib/app/app_router.dart`, `lib/core/navigation/app_navigation.dart`; contribution back policies must complete before route replacement |
| Canonical learning | `lib/features/learning/`; offline `assets/module/`; `tools/module/README.md` describes adapter regeneration |
| Shared geometry and game fixtures | `lib/core/geometry/geometry_card_provider.dart`; `assets/contracts/{learning_catalogue,geometry_cards,bank15,ruleset,engine_golden}.json` |
| Solo | Base `lib/features/solo/`: `domain/solo_game.dart`, `domain/solo_bank.dart`, `solo_controller.dart`, `data/solo_repository.dart`, `presentation/solo_pages.dart` |
| Offline AI | Base `lib/features/ai_battle/`: `domain/{ai_battle_game,ai_policy}.dart`, `application/ai_battle_controller.dart`, `data/ai_battle_repository.dart`, `presentation/ai_battle_screen.dart` |
| Shared game presentation | `lib/features/duel/presentation/{game_card_carousel,game_card_drag,game_question_content}.dart` |
| Online Duel | `lib/features/duel/duel_{controller,projection,transport,protected_store,screen}.dart`; protocol and scores remain server-owned |
| Accounts/profile/classes | `lib/features/{auth,profile,classroom}/`; verified native auth repository is the shared cloud gateway |
| Formative sync | `lib/core/records/`, `lib/core/storage/formative_schema.dart`, `lib/features/sync/`; signed-in reflection/completed-Solo records and outbox share a transaction |
| Shared presentation | `lib/core/design/`, `lib/core/widgets/`, `lib/features/preferences/`; tokens and stable face palette have existing owners |
| Checks and device tooling | `test/`, `integration_test/`, `tools/android/`, repository workflow `../../.github/workflows/geomath-flutter.yml` |

`productionFeatures()` registers learning once and the cloud/game set once. **`soloFeature()` already flattens the AI services, route, strings and migration. Do not register `aiBattleFeature()` a second time in the production root.** `lib/dev/cloud_game_features.dart` is only a compatibility re-export.

## Run and check

Use Flutter **3.47.9**, Dart **3.13.7**, Java **17**, Android SDK and accepted SDK licences. Minimum Android API is 24; compile/target API 36. Dependencies are pinned by the committed lockfile. Run these **VS Code PowerShell** commands from an existing GeoDecoder repository; the new worktree path must not already exist:

```powershell
git fetch origin app
git worktree add --detach ..\geomath-ai-next origin/app
Set-Location ..\geomath-ai-next\apps\geomath_flutter
flutter --version
flutter pub get
code .
flutter run
```

Guest learning, Solo and AI work without cloud configuration. Production uses `lib/main.dart`. To use the existing backend, supply only public project definitions through the ignored `config/public.local.json` mechanism and run:

```powershell
flutter run --dart-define-from-file=config/public.local.json
```

The public example/schema and validation are in `config/public.example.json` and `lib/app/public_backend_configuration.dart`. A valid client connection does not prove hosted capabilities. Never commit account credentials, service-role/client secrets, tokens or signing keys.

From the app directory, routine Dart/build checks are:

```powershell
dart format --output=none --set-exit-if-changed lib test integration_test
flutter analyze
flutter test
flutter test test/features/ai_battle test/integration/ai_battle_flow_test.dart
flutter build apk --release --split-per-abi --target-platform android-arm64
```

The final command builds the original application. Normal release regeneration is intentional: on this pinned SDK, `--no-pub` after debug/test platform generation can leave the dev-only integration_test plugin in release registration. With configured public definitions, append `--dart-define-from-file=config/public.local.json`.

The CI also runs the exact Node/Python checks below (shell glob expansion is shown in Bash; for PowerShell expand the same file lists with Get-ChildItem):

```sh
node --test tools/contracts/verify_exports.test.mjs test/foundation/native_adapter_contract.test.mjs test/features/learning/bundle/*.test.mjs test/features/learning/surface/*.test.mjs test/features/learning/studio/checkpoint_schema_parity.test.mjs
python3 -m unittest discover -s tools/android -p 'test_*.py'
python3 -m unittest discover -s tools/android/tests -p 'test_*.py'
```

Production Android integration is `integration_test/integration_smoke_test.dart`; use a real available device selected from `flutter devices` and the existing tools/android workflow. Device checks were not executed for this consolidation. `test/uiux/README.md` documents the opt-in host capture matrix; this combined default run skipped its 18 profiles.

## Game and data invariants

- Preserve all eleven learning model IDs: cube, cuboid, pyramid, cylinder, cone, triangular-prism, tetrahedron, pentagonal-prism, hexagonal-prism, sphere and hemisphere. The five game shapes remain cube, cuboid, pyramid, cylinder and **cone**. The 15-question bank has exactly three questions per game shape.
- Canonical math, parser, mesh, formulae, projection and question fixtures remain pinned to source `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital `2.9.1`, module `1.6.2`. `a=4 cm` for a cube gives 96 cm² and 64 cm³. Preserve stable physical face IDs, approved face colors/legend, true curved surfaces and neutral game cards. Sphere/hemisphere do not gain invented nets.
- Solo uses `single-attempt-v1`: correct solid scan R1, then matching net scan R2, earns +1 only for the full pair. Wrong or skip earns zero. Browsing and dragging select at most; scanning stays explicit. Retain bounded blink/review timing and pause rules. Quiz has 10 questions; practice has 15; review and completed formative DTOs retain their existing validators.
- Bind interactions and async results to the full actor/session/epoch/scope plus attempt/question/stage/route instance as applicable. A late tap, drag, database result, server reply or bridge message cannot modify a newer actor/activity. Preserve one owner and current back/lifecycle/audio policies.
- AI is a local ten-question mode inside the same app, with its own match state. Easy probability 40→65%, delay 10–16→7–11 s; Medium 60→82%, 7–11→4–7 s; Hard 78→96%, 4.5–7.5→1.8–4 s. Pressure is `min(completedCorrectPairs,8)/8`; adaptation is applied at the next question only. The initial match plan is durably saved before its active clock starts. Each question's pre-sampled plan stays fixed and is checkpointed; it never rerolls on scan/hint/pause/reopen. Opponent answers/correctness stay hidden until both finish. AI randomness must not consume the player's question/card stream. Highest score wins, then shortest active answering time; exact tie draws.
- AI pause/background/route cover stops both clocks and requires Resume. Save failure keeps the current activity. Keep AI checkpoint/results separate from Solo scores/analysis, formative history/outbox and online/class marks. Preserve scroll on presentation changes within an activity; reset it explicitly for setup/new question/results via the existing scaffold API.
- Guest records remain in their stable local partition and never auto-upload. Only canonical module reflections and completed Solo records enter the signed-in formative outbox, atomically with the local record. Auth/profile/classroom/PIN/live Duel/help reports are not formative queue events. Pending is not server acknowledgement; force-stop does not guarantee background delivery.
- Online authorization, roles, membership, room state, correctness and scores remain server-owned. Preserve profile's uncertain-write barrier until a valid refresh; malformed `{}` is not verified `profile:null`. Never import the local answer bank into online Duel presentation.
- Freeze shared interfaces and schema ownership: `Result`/`AppFailure`, `ActorBinding`, protected session store, transactional `AppDatabase`, formative DTO/writer/reader/outbox, typed feature/service registries and bridge guards. New schema work needs its own namespace/version and real migration; do not create another shared reflection/score model.

Current local migrations have one owner each:

| Namespace/version | Owned data |
|---|---|
| `foundation_records:1` | Shared reflections, completed Solo records and formative outbox; installed internally before feature migrations |
| `learning_checkpoints:1` | Actor/scope/slot-bound learning drafts |
| `solo:1` | Solo checkpoint and detailed analysis |
| `sync:1` | Durable signed-in Solo finalization receipts |
| `ai_battle:1` | Separate bounded actor-partitioned AI slot |

## Remaining gates and release limits

- New combined source verification must be recorded against its actual final SHA. Earlier foundation/integration Android receipts and feature/UI/AI host or APK receipts remain valid evidence for their named sources only. The combined source now has its own successful ARM64 release build and static APK verification; Android/emulator/physical-device execution remains unperformed. A build is packaging evidence.
- Hosted authenticated email/recovery/Google delivery/callback, class/profile CRUD with real role/membership/RLS, formative acknowledgement and two-client Duel remain independent acceptance gates. The reserved callback and a public configuration do not prove provider activation. SMS is absent. Do not deploy backend/schema/Auth/SMTP/Edge settings as an incidental game edit.
- Complete manual TalkBack, real touch/drag/keyboard/back/lifecycle checks, high-contrast/large-text state coverage, process-death acceptance and measured device performance remain explicit open work. iOS and 5,000-user capacity have no acceptance claim.
- The release Gradle configuration still signs with a development debug key. Same package/name alone cannot update a differently signed installation. The private key matching one historically inspected 0.1.0 APK was not available in the prior scoped build workspace, and the installed phone's signer is unverified. Preserve the original package and user data; establish the matching signing key before promising an in-place update. Production signing/store publication is a separate release gate.
- Keep firmware `main/`, `src/`, Digital `digital/`, backend `supabase/`, original planning archive `docs/geomath-app/` and unrelated branch refs unchanged for app game work unless separately authorized. Push normal commits only to the requested app branch. Do not force-push, publish Pages/store, or bump inherited firmware for an app-only change.

## Current verification and remaining small UI note

- **676 Flutter tests passed**, 18 opt-in visual profiles skipped. No failures.
- Formatter: 235 Dart files, 0 changes. Full analyzer: no issues.
- Node canonical/native/module checks: 60 passed. Python tooling: 36 passed. Two isolated offline module rebuilds reproduce all four shipped files exactly.
- Combined tests include the repaired AI setup→question scroll regression, popup-first back/navigation with retained controllers/drafts, and real SQLite legacy-data upgrade/reopen/AI isolation.
- ARM64 release build and static signature/manifest/CRC/source/asset checks pass. The validation APK uses GeoMath/com.geomath.dev, version 0.3.0 and split code 2004. Its development signing key is not a store release or proof of the phone's installed signer.
- Current full evidence and exact parent/source mapping: [app handoff](docs/handoffs/app/LATEST.md). Previous branch receipts are historical. No new visual profile, manual TalkBack, actual phone/WebView, or hosted acceptance is inferred.

One nonblocking UI follow-up was observed: AI setup's raw indeterminate CircularProgressIndicator can still animate while initial SQLite loading is pending under reduced motion. Reuse the shared loading policy in a future targeted accessibility change. This consolidation fixes the consequential phase/question scroll regression and leaves that loading-only motion note explicit.

Learning drafts are captured on the periodic foreground timer and guarded navigation/foreground paths; acknowledged checkpoints survive reopen. Arbitrary OS-kill of input typed since the last successful checkpoint is not a confirmed retention guarantee. Profile drafts remain actor-bound in memory with the previously documented process-death limitation.

Inspect Android versionCode as well as signing before installation: source build-number 4 emits split APK code 2004; a plain debug code 4 is lower and is not an update over that split artifact. Use a consistent artifact variant and increasing version code, rather than resetting application identity or deleting user data.
