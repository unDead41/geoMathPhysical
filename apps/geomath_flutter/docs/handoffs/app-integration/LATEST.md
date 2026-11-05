# GeoMath Flutter integration handoff

Status: **offline Android milestone verified; full catalogue/hosted/manual
acceptance partial**. App **0.1.0+1**, foundation contract **1.0.0**.
Receipt date: 2026-11-06T03:10:29+08:00. This replaces earlier pending notes. The final published
branch head is reported after remote readback; no file embeds its own future SHA.

## Exact sources

| Source | SHA |
|---|---|
| Initial app base | 38f061af963256528d5060ff076bae9ee05eafc3 |
| Foundation READY | 9a1f49a7c92d13bb70b7fd1420c34629a7785f9e |
| Learning | 8a5527438ee828a306afba36a337a3ca3bbedb83 |
| Cloud/game | 33e6734a27db789f04a9a048bf7f69ebd046e016 |
| Exact feature merge | e95af04783b791181dfa11249a6606ededd72115 |
| Functional Android baseline | 245f9ee5a2cd7c9148b92003c1a082eb735d90c1 |
| Corrected Solo Android case | 2daa2802ffea0ac0ddbde65ac2d9c7b0d261a939 |
| Corrected native runtime, builds, host suite and latest Android run | 377a444b7ff6956de8f40b617a40dcbcb9a4a837 |

Both exact feature parents and the same READY foundation remain ancestors.
The native startup owner is the only runtime file changed after baseline245;
169 other tracked product files match. The new local/CI builds use the same170
corrected source inputs. Final receipt edits do not alter runtime sources.
Root firmware remains1.1.3. Digital, firmware and planning archives are preserved.

Frozen contract/source-lock/pubspec-lock SHA256 respectively:
`0a31f7aef121a151ee91a4ae92250fd893ad62108f27a9389b5fa5ed9a918356`,
`cf7d5e6a54c6da65d70f97caae26cff059de558f3fd56db97245252358220452`,
`9ba313c3af1f80193c6c0a61c2e38fcee51f1b5aabb8404ebdccfd04210f542c`.
Canonical module stays pinned37bc2cd262cc0a54e8ee31339ea37471c1ecfda5,
module1.6.2/Digital2.9.1; HTML SHA256
`7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`.

## Integration request dispositions

The original learning/cloud-game handoffs and JSON requests are preserved.
Both contribution sets are registered once in production `lib/main.dart`, with
the existing session/sync startup awaited before Home. Real shared wiring lives
in `lib/app`; preview compatibility remains a development re-export.

One database/migration registry includes learning_checkpoints1,solo1,sync1.
One session,preferences,audio,formative writer/reader and sync owner is shared.
Guest records remain local; signed-in record/outbox writes are atomic. Existing
dependency lock and canonical asset registrations remain unchanged.

Home reaches real learning and displays actor state. Destination reset/Back await
leave policies; stale sheets and concurrent navigation cannot erase newer routes.
Bounded WebView operations cannot block the shared action queue forever. Missing
classroom/Duel capabilities show explicit guest/unavailable states.

Android reserves `com.geomath.dev://auth/callback` through the existing app_links
adapter and disables competing Flutter dispatch. Native provider capability stays
disabled pending hosted cold/warm/replay/recovery proof. SMS is absent. No backend,
Auth/SMTP,Pages,main/main-digitalized/sharing or store deployment was performed.

## Blockers resolved and failures retained

- Solo's test read game immediately after Start while native SQLite was pending.
  The corrected case waits for enabled controls and durable state, preserving
  all original attempt,card,R1/R2,score and database-reopen assertions.
- The combined learning fixture now uses the production action queue with
  autosave; it cannot bypass sequence ordering. Projection Undo uses the actual
  exercise mode. Quick-edit Back and storage-failure Stay/Leave are covered.
- Actual cold-child breadcrumbs showed a valid bootstrap taking32.911seconds,
  beyond the old30second budget. The trusted document keeps30seconds; the child
  gets60foreground seconds beginning before configure IPC. A delayed IPC reply
  no longer spends child parsing time in the parent document budget. Ready,
  nonce/source/origin/actor checks and terminal/pause guards are unchanged.
- The35second valid-child regression failed before the fix and passes afterward.
  Ten deadline tests cover expiry,pause/remainder,duplicate and late callbacks.
- Production capture requires real screen labels,painted/stable pixels and a
  canonical Image node at least128x200px. Margin scrolling stays within fresh
  WebView bounds. No placeholder,automatic failed-app retry or image editing is
  used. Current unavailable copy causes immediate failure.
- Restricted diagnostic output persists fixed stages/CSP/sandbox codes only;
  shareable evidence excludes raw VM/logcat/session diagnostics.

Earlier runs42066617435,42075633834 and42079929595 remain failed. The latter
actually completed320dp then reproduced unavailable at390dp; it is not blamed on
Flutter CLI. The native timing correction above was rebuilt and revalidated.
See [bootstrap regression](bootstrap-deadline-regression.json) and Git/CI history.

## Executed verification

| Verification | Exact scope/result |
|---|---|
| Current formatter and analyzer | pass, corrected source |
| Full host unit/widget suite | 494 passed; local `flutter test --no-pub`,119seconds |
| Canonical Node checks | 50 passed, corrected source |
| Python tooling/privacy checks | 26 passed, corrected source |
| Local normal debug build | exit0;35.7seconds;20assets/CRC/manifest/v2/threeABIs verified |
| Local release-mode validation | exit0;124.6seconds;20assets/CRC/manifest/v2/threeABIs/AOT verified; debug key |
| Latest real-Android native-host cases | 3 passed plus runner teardown, rebuilt source |
| Accepted normal-main offline captures | 30 reviewed originals +2 corrected cube originals; same exact APK; four profiles |
| Capture-only completion | 33 tooling checks and2 strict native-ready/full-canvas frames passed |
| Inherited full functional Android baseline | 25 cases passed,1Solo failure; teardown passed; source245 |
| Corrected Solo case | 1 passed plus teardown; source2daa; its workflow still failed later during capture |
| Final root version/scope/diff/ancestry | pass; no firmware bump |

[Latest CI](https://github.com/unDead41/geodecoder/actions/runs/42082666643) is a focused native-host revalidation followed by
normal production APK operation. It is explicitly not a claim that the entire
combined Android suite was rerun green on the final runtime. The sole changed
native owner is exercised by real offline load/rotate/fold/preferences/actor
switch and missing/corrupt asset rejection, then four normal module cold opens.
Independent review found no reason to repeat unchanged classroom/Solo behavior.

That run's original32-image review remains [blocked](android-visual-blocked-377a444.md):
390dp was photographed before native readiness and430dp cropped the cube.
[Capture-only completion](https://github.com/unDead41/geodecoder/actions/runs/42089442055) reuses the exact
same normal APK and170 runtime inputs, takes only those two replacements, and
requires an enabled/clickable native picker, final canonical Image semantics,
two fresh ready XML samples and the full canvas inside the WebView. Thirty
already valid originals are retained. The combined32-image review is a new
receipt; the rejected original report is never relabelled success.

[GATE_POLICY.md](GATE_POLICY.md) and exact [host](evidence/local/host-result.json),
[release](evidence/local/release-result.json),[Android](evidence/local/android-result.json)
and [APK](evidence/local/apk-receipt.json) receipts preserve source and limits.

Device: KVM API35 x86_64 emulator, WebView124.0.6367.219, default
Impeller/OpenGLES; Flutter3.47.9,Dart3.13.7,Java17. Tests retain normal platform-view
lifetimes; production pictures use actual ADB screencap of a separate normal APK.

## Screenshots and APK

The32 PNGs show Settings,Home,Learning hub,Cube,Solo setup,Duel unavailable,
Classes guest and Profile guest across320/BM/light/100%,390/English/dark/125%,
430/BM/dark/high-contrast/150%,768/English/light/high-contrast/150%; reduced motion is enabled.
The selected four model frames demonstrate ready modules after cold process
restart across two runs.32 images are not32 boots; only the two inadequate
frames were explicitly recaptured, with no pixel editing.
Every capture has an original byte/hash receipt and independent visual review.
See [visual review](android-visual-review.md),[JSON](android-visual-review.json)
and the original [source artifact](https://github.com/unDead41/geodecoder/actions/runs/42082666643/artifacts/13443621646) plus
[two replacements](https://github.com/unDead41/geodecoder/actions/runs/42089442055/artifacts/13445750722). Per-image source
and run provenance identify which original supplied each accepted frame.

`GeoMath-Integrated-0.1.0-debug.apk`: **174,925,408 bytes**.
SHA256: `177e584378e735b78c576850937c008eb0f261fb532c9b7482857f47f9de8844`.
Normal `lib/main.dart`, no cloud defines, debug key; packagecom.geomath.dev,
minSDK24/targetSDK36, ARMv7/ARM64/x86_64. The locally delivered binary was not
itself installed in CI; CI built/installed a separate binary from identical170
inputs. CI binary SHA256: `d2a7ab8253b3e85dca5455f556338431e350206b85f327211338928c3c5bda09`.
Current runtime manifest SHA256: `fa3f79360f26172f4bc4a3bace6fbc571ac59dee304f6263c1f9892c7d1c7ebc`.

## Run in VS Code PowerShell

From the repository root, with Flutter3.47.9/Java17/Android tooling installed:

```powershell
git switch app
git pull --ff-only origin app
Set-Location apps/geomath_flutter
flutter pub get
flutter devices
flutter run
```

See [RUN_ANDROID.md](../../RUN_ANDROID.md) for USB/emulator selection, APK install,
public config, logs and cold-start limits. Guest learning/Solo need no cloud config.

## Remaining acceptance

All48screen/16EX IDs have real route/owner/path mappings; the full64-item matrix
remains partial where hosted,manual or additional visual-state proof is absent.
Screenshots cover named states only. Profile draft EX13 is not credited from a
learning draft test; guest images do not prove populated dashboards.

Hosted email/Google/recovery,role/membership/RLS/CRUD acknowledgements,online sync
and two-client Duel remain unverified. No physical-phone,complete manual TalkBack,
gestures,keyboard/contrast audit,active-Solo OS-process-death-at-every-stage,
performance/FPS or5,000-user result is claimed. Slow emulator bootstrap is bounded,
not a measured performance pass. iOS/store and production signing remain outside
this milestone. Optional first-use guide/CSV/Duel practice-shortcut concept
differences remain in the limited reference review.
