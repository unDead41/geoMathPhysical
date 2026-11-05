# Run GeoMath on Android

## Checkout and toolchain

```sh
git clone https://github.com/unDead41/geodecoder.git
cd geodecoder
git switch app
cd apps/geomath_flutter
flutter --version
flutter doctor -v
flutter pub get
flutter devices
flutter run -d DEVICE_ID
```

Flutter3.47.9 / Dart3.13.7, Java17, Android SDK, accepted SDK licences and an
Android device are required. Enable USB debugging on a phone and authorize that
computer, or boot an Android Studio emulator. Tested CI uses API35 x86_64/KVM;
physical phone, iOS and manual TalkBack acceptance are separate.

Default target is `lib/main.dart`; do not select a `lib/dev/` preview to test the
installed combined application. Storage failures show a retry screen. Session
restore and the one sync owner start before Home.

## VS Code PowerShell

For a new checkout, these commands use the production branch and entry point:

```powershell
git clone --branch app --single-branch https://github.com/unDead41/geodecoder.git
Set-Location geodecoder/apps/geomath_flutter
flutter pub get
flutter devices
flutter run
flutter build apk --debug
```

With one Android emulator/USB device connected, Flutter selects it. With several
devices, choose the Android device from Flutter's displayed list. For an existing
clean checkout, run `git switch app` and `git pull --ff-only origin app` from the
repository root, then enter `apps/geomath_flutter`. No manual Dart edits are needed.

## Optional public cloud configuration

Guest learning and Solo work without these definitions:

```sh
flutter run -d DEVICE_ID \
  --dart-define=GEOMATH_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=GEOMATH_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Use only the existing authorized project's public URL/key. Never include a
service-role key, OAuth client secret or user token. Missing capabilities show
unavailable/online-required states; they do not pretend a request succeeded.
Google native callbacks remain disabled until the hosted redirect allowlist and
cold/warm/replay/expired callbacks are verified. The manifest reserves
`com.geomath.dev://auth/callback` for the single app_links dispatcher. SMS is absent.
No backend/Auth/SMTP migration or deployment is performed by this app checkout.

## Build, install and verify

```sh
flutter build apk --debug
adb -s DEVICE_ID install -r build/app/outputs/flutter-apk/app-debug.apk
flutter test
flutter test integration_test/integration_smoke_test.dart -d DEVICE_ID
flutter build apk --release
```

The existing release build uses the development debug keystore. It is a release
mode test APK, not production-signed/store-ready. Debug and release outputs are
separate; neither APK nor a keystore belongs in Git. CI publishes normal APKs and
Android evidence as workflow artifacts. The integration test APK contains test
fixtures and is not a user installation deliverable.

## Offline and data

Eleven learning models, labs/studio, neutral game cards and Solo are bundled.
The app verifies bundle hashes; corrupt/missing assets cannot report ready.
Drafts are saved on activity exit, including bottom tabs. A failed write offers
Stay/Leave; Leave never claims durability. Guest records remain in their local
partition and never auto-upload. Signed-in reflections/completed Solo records
and pending outbox events share one SQLite transaction; foreground retries
require the existing backend capability and valid verified session. No delivery
is guaranteed after force-stop. Account, classroom/PIN/live Duel and help reports
are not queued as formative events. Classes/Duel require connectivity.

## Evidence and safe logs

```sh
flutter analyze
flutter test
flutter devices
adb -s DEVICE_ID shell dumpsys webviewupdate
```

Record exact source SHA, SDK and device details with failures. Do not attach
credentials, account tokens, raw auth deep links or unrestricted logcat dumps.
The CI scripts capture selected Android runtime warnings and UI evidence only.
Screenshots may contain user-entered information; use guest/test data.


## Integrated Android gate

The workflow builds a combined test APK and preserves a separate normal
`lib/main.dart` APK. It runs all real-plugin/canonical WebView cases with
`LEARNING_SCREENSHOTS=false`, keeping the normal platform-view surface lifetime.
SDK image-surface conversion is optional diagnostics, not the capture mechanism
for this gate. The driver shares the page's production action queue with autosave.

After functional tests, the runner clears test data, installs/launches the normal
APK offline and uses actual Android UI controls to save presentation preferences.
ADB captures require current screen labels and stable painted pixels; a splash,
empty hierarchy or blank model cannot count as a loaded screen. The four profiles
represent320/390/430/768dp, BM/English, light/dark/high contrast,100/125/150%text and
reduced motion. They do not exhaust every screen/state/visual combination.

A failed integration exit stays failed even if later normal-app capture succeeds.
An explicitly named diagnostic workflow never authorizes fast-forwarding `app`.


A targeted follow-up can complete a corrected test/capture fixture against an
unchanged runtime. It checks all170runtime hashes and the exact reused normal
APK hash before running. Its receipt is combined with the baseline's unaffected
checks under `handoffs/app-integration/GATE_POLICY.md`; it never turns an earlier
failed workflow into a successful workflow or publishes the app by itself.
