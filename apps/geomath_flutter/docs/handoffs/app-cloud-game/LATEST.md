# GeoMath Flutter — Akaun, Kelas, Permainan dan Sync

**Native implementation and local verification complete; Android: blocked.**
App **0.1.0+1**, foundation contract **1.0.0**, 5 November 2026 (Malaysia).
Code source commit: `6cc470e32f790c1c49e14f0fa0173f0818e3fbfb`. Publication head is confirmed after push; this file does not embed its own commit SHA.

Foundation READY: `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`, the same SHA used by Belajar.
All **101** frozen runtime hashes, shared contracts and lockfile remain unchanged.
Game bank/geometry are pinned to Digital `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`; current auth/backend audit uses `752ce908d16d13acc9cc7510797e8363d182c3f5` (Digital2.10.0). SMS was removed from current source and is absent here.

## Implemented

- Native email/username access, signup/confirmation, recovery including the canonical legacy flow, profile completion/drafts/security/recorded sessions, protected restore and guarded callbacks. Server verification owns role and identity; old asynchronous responses cannot adopt or clear a newer account.
- Teacher/student classes, room PINs, memberships/invitations, monitor/results, same-attempt room play, revision-aware CRUD, archived/closed retention and uncertain-outcome reconciliation. Invitation cancel/decline payloads contain `invite_id` only.
- Native Solo with real JavaScript golden/RNG parity, five game shapes including cone, R1→R2 single attempt, timing/review/pause, durable resume, analysis and local best50 quiz scores. Finalization remains idempotent across retention, account switch and reopen.
- Protocol2 Duel using real transport/server projection and protected guest capability tokens. Unknown commands replay the same sequence/payload; polling, retry cooldown, lifecycle, final review and forfeit preserve server authority. Active Duel does not import Solo answers or locally assign marks.
- One shared SQLite record writer/outbox transaction, account partitions, immutable receipts/events, batch20/cap2000, partial/missing/invalid acknowledgments, bounded retry/Retry-After, needs-auth/unavailable and foreground wake. Guest records remain local.
- Real `lib/dev/cloud_game_main.dart` preview, 19 route entries, shared components and BM/English strings. Play opens Solo, Duel and sync; native features borrow the original preferences/session/database/geometry/audio owners.

## Verification

| Check | Actual result |
| --- | --- |
| Format / analyzer | PASS;157 Dart files unchanged, no analyzer issues |
| Final full Flutter suite | **420/420 PASS** |
| Canonical export/adapter Node suite | **12/12 PASS** |
| Native route layout sweep | 19 guest/unconfigured entries ×16 profiles =304 combinations;320/390/430/768dp, BM/English, light/dark,150%text |
| Normal debug preview APK | PASS;174735340 bytes;SHA256 `74a8a688617abea4639c8d0737690703ac0919df85a699e2caa54d9029a5b6ad` |
| Separate Android integration APK | Build PASS; actual execution status below |
| Independent cross-feature review | PASS after three meaningful integration fixes |

The local software emulator booted, but Android commands stalled/timed out. Device integration and actual app screenshots remain blocked; no device PASS is claimed.

Host-rendered Flutter widget previews, when listed in `VERIFICATION.json`, are actual native widget code rendered by the host test engine. They are labelled separately and do not replace Android screenshots or device acceptance.

The layout sweep is not full populated-state, TalkBack, keyboard, hosted or device acceptance. The [29-screen/16-state matrix](screen-coverage.json) records exact implementations, fixture coverage and gaps. [VERIFICATION.json](VERIFICATION.json) and [native receipts](evidence/native/) preserve results and earlier failures. The earlier audit-only BLOCKED_FOUNDATION state is superseded by this implementation.

## Run and integrate

From `apps/geomath_flutter`, use the frozen Flutter3.47.9/Dart3.13.7, Java17 JDK and Android SDK:

```text
flutter pub get
flutter run -d DEVICE_ID -t lib/dev/cloud_game_main.dart
flutter build apk --debug -t lib/dev/cloud_game_main.dart
flutter test integration_test/cloud_game_smoke_test.dart -d DEVICE_ID
```

For the prebuilt x64 test route:

```text
flutter build apk --debug --target-platform android-x64 -t integration_test/cloud_game_smoke_test.dart
flutter drive --no-pub --driver=test_driver/integration_driver.dart --target=integration_test/cloud_game_smoke_test.dart --use-application-binary=build/app/outputs/flutter-apk/app-debug.apk -d DEVICE_ID --timeout=900
```

The integration target contains explicitly labelled server fixtures and real Android plugins; it does not establish hosted Auth, permissions or two-client Duel. Rebuild the normal dev target after integration packaging. The delivered APK is the normal preview, built without cloud defines; guest Solo is available and online features explain unavailable configuration.

[Integration request](../../integration_requests/app-cloud-game.json) lists registrations, migrations (`solo:1`, `sync:1`), platform/config/capability needs and exact limits. Install `cloudGameFeatures()` once beside learning. Await its startup once when normal Home is initial, keep one sync controller, and pass `FoundationServices.recordsWriter` to learning. No dependency, core schema, router, platform runner or global workflow was modified.

## Remaining integration gates

- Keep `nativeCallbackReady:false` until Android VIEW/BROWSABLE/DEFAULT handling for `com.geomath.dev://auth/callback` and the matching hosted redirect allowlist are verified on cold/warm/replayed/expired flows. Google consent and native recovery callback are not claimed working from local fixtures. Email signup uses the canonical web confirmation followed by native login.
- Frozen destination `select()` bypasses feature back confirmations. Integrator must add the shared tab-exit guard. Profile drafts/uncertain saves survive tab reentry in actor-bound memory; classroom retains its controller/attempt; Duel hides destination navigation and guards back/forfeit.
- Verify hosted Auth/profile/session RPCs, `classroom_crud:1`, `geo_offline_sync` and protocol2 Duel using real authorized staging actors. Pending rows remain when unavailable. No provider/SMTP/secret/migration/Edge deployment was performed.
- The inherited CI runs the default foundation target. Integrator must explicitly run this preview and its Android smoke; a default foundation CI success is not evidence for these features. Physical phone, iOS and capacity tests remain separate.

Six initial workers used private worktrees; scoped commits were combined by the lead and an independent reviewer checked cross-feature behavior. Only `app-cloud-game` is authorized for publication. Firmware, `main`, `main-digitalized`, Pages, backend and store remain outside this publication.
