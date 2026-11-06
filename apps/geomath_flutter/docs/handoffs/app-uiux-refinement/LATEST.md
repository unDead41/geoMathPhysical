# GeoMath 0.2.0 UI/UX refinement

6 November 2026 (Malaysia). Dedicated publication branch: `app-uiux-refinement`.
All eighteen approved improvements are applied to the existing combined app.
Hosted acceptance and physical-device acceptance remain separate.

## Sources

Publication parent: `app-cloud-game` **1d7c8f7e4a6b980b1a911729e73818f79476302f**,
which already descends from `app`/`app-integration` **20eed848cc015d6253accd6cf72fcf127bf72827**.
This preserves the latest carousel/math/profile follow-up as well as the integrated learning/runtime fixes.

The locally materialized, byte-verified worktree was tested at **212712dcf6ea603af9251846e4c4a1a49a29c16f**.
That is a local snapshot identifier, not a claim that the selective import's local Git history was published.
The GitHub publication applies only the verified changed files over the complete parent tree.
[Runtime input hashes](runtime-inputs.json) identify every compiled/bundled input; remote tree hashes are read back after publication.
No document embeds its own future publication SHA.

Flutter **3.47.9**, Dart **3.13.7**; app **0.2.0+2**; dependency lock unchanged.
Canonical module remains **1.6.2**, Digital **2.9.1**, source **37bc2cd262cc0a54e8ee31339ea37471c1ecfda5**.
The canonical HTML SHA256 remains `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`.
The app-only adapter advances to **4**, with reproducible offline generation and pinned reference checks.

## Eighteen-item coverage

| Item | Result |
|---|---|
| 1. Swipeable solids/cards | All eleven learning shapes have snapping browse, arrows, counter and explicit selection; five neutral game choices keep browse/select/scan distinct. |
| 2. Rotation/zoom/reset | Actual canonical pointer orbit and pinch, plus native accessible button alternatives. |
| 3. Unfold slider | Coalesced bounded slider uses real canonical folding; old-shape queued gestures are rejected; no invented sphere/hemisphere net. |
| 4. Face selection | Physical IDs and selection highlights link actual 3D, net and orthographic renderers. |
| 5. Stable face colors | Existing approved surface palette/labels remain attached to physical surfaces and curved patches. |
| 6. View presets | Front/back/left/right/top/bottom/isometric use real canonical camera commands. |
| 7. Drag and drop | Long-press drag selects only for the active scoped reader; explicit scan remains required and tap alternatives remain. |
| 8. Mathematics | Existing safe math renderer, fractions, superscripts, variable meanings and canonical step workflows are reused. |
| 9. Learning panel | Real notes/calculator content moves into a retained resizable panel; measurements, raw input and child instance persist. |
| 10. Shared design | One token/theme/widget system; clearer controls, status headings and grouped preferences. |
| 11. Adaptive navigation | Phone bar and scrollable tablet rail preserve selected destination, activity element and separately stored scroll offset. |
| 12. Responsive layouts | Two-pane module from 640 dp available space; narrow/short screens and large-text headers/controls remain reachable. |
| 13. Text/theme/accessibility | System nonlinear text scaling composes with app scale; effective body scaling reaches the trusted child; actual headers no longer clamp at 134%. |
| 14. Motion/feedback | Optional compatible haptic preference; shared feedback respects motion policy; system reduced motion reaches canonical animation settings. |
| 15. Loading/empty/error/retry | Existing domain states are retained and account/class forms get clearer validation, retry and preserved drafts. |
| 16. Offline/sync clarity | Home displays actual local/pending/sending/acknowledged state; no guest upload or optimistic acknowledgement is introduced. |
| 17. Class/Duel entry | Clipboard paste/copy/invitations preserve zeroes and newer edits; readiness/reconnect copy follows real controllers. |
| 18. Continue/progress | Home reads actor/scope-bound latest validated drafts and real completed reflections/solo records; no invented mastery/XP. |

## Executed verification

| Check | Result |
|---|---|
| Formatter |220 Dart files, 0 changes |
| Analyzer |No issues |
| Full Flutter unit/widget suite |**613 passed**,18 opt-in visual profiles skipped in this default invocation |
| Opt-in production host matrix |**18 profiles passed**, 256 unedited PNGs; real production widgets, SQLite and readable SDK fonts |
| Canonical/native-wrapper/adapter Node suite |**60 passed** |
| Android tooling Python suite |**29 passed** |
| Independent regressions/review |Delayed PIN edit and full title scale repros now pass; no remaining important code findings |
| Real offline module browser checks |**48 passed**, 48 unedited captures; actual Canvas2D, pointer/touch gestures and canonical inputs |

Command logs are alongside this handoff. The default suite's 18 skips are the deliberately opt-in capture profiles, separately executed successfully.
The native matrix covers 320/390/430/768 dp in BM/English, light/dark and 150% app text,
plus 800×600 BM/light and English/dark at 225% composed text. Some large navigation labels wrap.
The four selected [native widget renders](screenshot-provenance.json) are host evidence with explicit provenance, not Android screenshots.
Host-only font fallback is resolved to SDK Roboto; production widgets, sizes, state and colors are unchanged.

The [browser receipt](module-browser-receipt.json) uses a minimal native-message receiver with the actual trusted bundle in desktop Chromium 151.
It verifies orbit, real two-finger pinch, stable selection/folding, six views, cone surfaces, truthful sphere rejection,
keyboard panel 48→53 resize, and raw `4.00` retention without replacing the mounted child.
Browser assets are byte-identical to the final native bundle; native-only presentation changes after that capture do not change them.

## Review corrections and limits

Meaningful regressions found and fixed include ExpansionTile/scroll storage collisions, AppBar scale clamping,
short-tablet rail overflow, stale queued fold commands, late clipboard overwrites, and panel range rounding.
The proposed invitation-newline defect was disproved by byte checks and stronger passing tests; production copy was already correct.
Reopen presentation settings are applied before every new controller initializes; that lifecycle correction was source-reviewed.
An exploratory host Reopen test hung at the fake/real asset boundary and is not counted as runtime proof.

No Android emulator/physical phone, full manual TalkBack, hosted authenticated class/profile write,
Google callback, email delivery, two-client Duel or production performance acceptance is inferred from host/browser tests.
No firmware, digital source, backend, Auth/SMTP, Pages, main/main-digitalized, store, scoring/parser or server authorization was changed.

## Windows PowerShell

From the existing repository root:

```powershell
git fetch origin app-uiux-refinement
git switch app-uiux-refinement
git pull --ff-only origin app-uiux-refinement
Set-Location apps/geomath_flutter
flutter pub get
flutter run
```

Guest learning and Solo need no cloud config. Existing public connection configuration remains external to source control.
See `docs/RUN_ANDROID.md` for the existing public-defines flow. The configured ARM64 debug APK is built and statically verified; see the receipt below.


## Verified Android APK

`GeoMath-0.2.0-arm64-debug.apk` — **98,315,390 bytes** (about 93.8 MiB).
SHA256: `7104f929be85b08e4a324207a61c501702e449cc6683436ffe535468137bdea4`.

Normal `lib/main.dart`, package `com.geomath.dev`, version 0.2.0/code 2, minimum API 24/target API 36.
The ARM64 Flutter engine is present; tiny ARMv7/x86_64 helper libraries do not make this an APK for those devices.
APK v2 Android Debug signature and ZIP CRC passed. All 20 bundled runtime assets match source, both hash manifests verify,
and the 15-question bank is intact. The existing public configuration defines are compiled in; their values are omitted from logs.
All 180 runtime input blobs match local tested snapshot 212712d and published code commit b44f48b.
See [static APK inspection](apk-verification.json) for exact commands, hashes, ABI and signature evidence.

The successful retry completed Gradle in 532.6 seconds after repairing a nested scratch Build Tools installation.
An earlier baseline attempt exceeded environment memory; neither failed attempt is counted as a passing build.
This binary has not been executed on Android or a physical phone. Hosted account/class/Duel acceptance remains unverified.
The independent GitHub workflow 42162256465 was still building at handoff; local results above are the executed evidence, not a CI pass claim.
