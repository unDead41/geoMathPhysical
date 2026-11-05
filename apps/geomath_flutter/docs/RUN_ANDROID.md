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
