# GeoMath Flutter — Duel, Kelas dan Profil

Implemented and locally verified, 6 November 2026 (Malaysia). Configured production debug APK built. **Hosted authenticated/two-client acceptance and execution of this new APK remain pending.**

App `0.1.0+1`. Runtime source: `c3f115bc06a985f6de0b2fc901d4788fd327b451`. Baseline: completed `app`/`app-integration` `20eed848cc015d6253accd6cf72fcf127bf72827`. This branch preserves that exact integrated shared runtime, learning modules, startup, navigation guards and Android fixes. No shared/root/platform/pubspec/lockfile edit is introduced by this follow-up. Publication is only to `app-cloud-game`.

## Result

- Duel creation/join/lobby/match/review/results use the real protocol2 controller and transport. Solid/net choices now browse left/right with a next-card peek, 48dp arrow controls and a position counter. Browsing never selects or scans. Explicit taps and scan retain server authority, command identity, scoring, retries and elapsed-time rules.
- One reusable presentation is applied to Duel, Solo and classroom attempts. Formula prompts use ×, π, italic variables, superscripts and stacked fractions. Context remains intact; BM/English legends explain V, L, a, p, l, t, j and s. Example: `V = p × l × t`, with V=isi padu, p=panjang, l=lebar and t=tinggi. Accessible equation semantics and a safe unsupported-text fallback are included. Duel renders public copy only, without importing a local answer bank.
- Kelas retains real teacher/student repositories: classes, PIN membership/invitations, rooms, monitor/results and guarded CRUD. Room controls require verified room ownership. The same attempt uses the new carousel and math; no server decision is replaced by client logic.
- Profil retains the real native auth/gateway repository, field validation, avatar/name edits, settings/security/sessions navigation, actor-bound drafts and guarded exits. Initial loading/retry is explicit. A lost or malformed save acknowledgement blocks another write until a verified refresh; a 200 response omitting `profile` cannot clear that barrier. Explicit `profile: null` still allows genuine completion.
- Modern public project configuration is included in the APK through the existing ignored local defines mechanism. A legacy public anon-key compatibility header is supported; account/service-role tokens are not used for guest gateway authorization.

## Verified

| Check | Result |
| --- | --- |
| Formatting / analyzer | 207 files unchanged; no issues |
| Combined Flutter suite | 536 passed before final profile-envelope fix |
| Affected profile / route / lifecycle suite after fix | 49 passed; includes 304 guest route/layout combinations |
| Canonical export / native adapter | 12 passed |
| Independent review | Approved; no unresolved Critical/Important findings |
| Production APK | Build and signature passed; 174962464 bytes |
| Opt-in host render | 7 actual widget captures, separately labelled fixtures/host |
| Read-only hosted probe | Active project; modern key reaches protocol2 validation; email enabled, phone disabled |

The APK is `GeoMath-Duel-Class-Profile-Debug.apk`, SHA256 `c9d7d74e64956aa59dec3fc22f8eb692519054453a243919f56e2ae357d85181`. It targets `lib/main.dart` and includes learning plus cloud/game features. Install this build in place of the earlier unconfigured preview. Android minimum API24, package `com.geomath.dev`, debug signature. No device execution of this new artifact is claimed.

[Verification receipt](https://github.com/unDead41/geodecoder/blob/1d7c8f7e4a6b980b1a911729e73818f79476302f/apps/geomath_flutter/docs/handoffs/app-cloud-game/VERIFICATION.json) identifies exact commands, runtime hashes and limits. [Host previews](https://github.com/unDead41/geodecoder/blob/1d7c8f7e4a6b980b1a911729e73818f79476302f/apps/geomath_flutter/docs/handoffs/app-cloud-game/HOST_PREVIEWS.md) show real Flutter widgets. [Review](https://github.com/unDead41/geodecoder/blob/1d7c8f7e4a6b980b1a911729e73818f79476302f/apps/geomath_flutter/docs/handoffs/app-cloud-game/updates/2026-11-06/evidence/review.md) includes the resolved malformed-profile-response regression. [Previous handoff](https://github.com/unDead41/geodecoder/blob/1d7c8f7e4a6b980b1a911729e73818f79476302f/apps/geomath_flutter/docs/handoffs/app-cloud-game/history/2026-11-05/LATEST.md) remains historical.

## Run

Use the pinned Flutter3.47.9/Dart3.13.7, JDK17 and Android SDK. Configure only project URL, public publishable key and `com.geomath.dev://auth/callback` via ignored `config/public.local.json`; do not add credentials to source control.

```text
flutter pub get
flutter run --dart-define-from-file=config/public.local.json
flutter build apk --debug --no-pub --dart-define-from-file=config/public.local.json
```

The production factory already registers cloud/game and learning once. Its shared startup, writer and tab-exit guards come from the integration baseline. `lib/dev/cloud_game_features.dart` re-exports the production factory.

The public read-only probe intentionally rejected an unknown action before any room/RPC mutation. It confirms gateway reachability, not a real two-player match. Real authenticated class/profile writes, email delivery and Google callback require separate hosted acceptance. Google native activation stays gated. No provider/SMTP/schema/Edge/Pages/store deployment was performed.
