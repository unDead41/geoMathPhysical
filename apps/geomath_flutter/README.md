# GeoMath Flutter

GeoMath is an Android Flutter foundation with a native shell, shared settings,
help and local reports, plus a bundled canonical geometry module. App version
is **0.1.0+1**. The development application ID is **`com.geomath.dev`**;
it is not the final store identity.

The foundation owns Utama/Home, Panduan/Guide, settings including the dark
variant, help, and the local report form. Belajar/Learn, Main/Play, Kelas/Classes
and Profil/Profile explicitly identify features still under development. The
learning destination opens the real offline module spike. Account, classroom,
native solo game and Duel feature implementations are separate follow-on work.

The canonical module contains eleven learning models. The exported game bank
contains fifteen questions for cube, cuboid, pyramid, cylinder and **cone**.
Bundled HTML/JavaScript and neutral game-card geometry come from pinned source,
not mockup images. See [SOURCE_LOCK.md](docs/SOURCE_LOCK.md).

## Set up Android development

Use **Flutter 3.47.9 stable**, **Dart 3.13.7** and **Java 17**. The Android
runner targets API 36 and supports Android API 24+. Keep `pubspec.lock` committed
and use `flutter pub get` to reproduce its selected package versions.

On Windows:

1. Install Flutter outside a protected system folder and add its `bin` directory
   to PATH. Open a new terminal and run `flutter --version`.
2. Install Android Studio with its Flutter/Dart plugins. In SDK Manager install
   API 36, Build Tools 36.0.0, Command-line Tools, Platform Tools, Emulator and
   NDK 28.2.13676358. Select Java 17 for this project.
3. Run `flutter doctor --android-licenses`, review the licenses, then
   `flutter doctor -v`. If necessary, set the actual SDK/JDK paths with
   `flutter config --android-sdk="C:\Users\you\AppData\Local\Android\Sdk"`
   and `flutter config --jdk-dir="C:\path\to\jdk-17"`.
4. Start an API 36 Google APIs emulator in Android Studio Device Manager, or
   connect an Android API 24+ phone with USB debugging enabled. Authorize the
   computer and confirm it appears in `flutter devices`.
5. Open `apps/geomath_flutter` as the Flutter project in Android Studio or VS
   Code. In VS Code install the Flutter extension, select the Android device,
   and launch `lib/main.dart`.

The selected device needs a functioning Android System WebView provider.
[TOOLCHAIN.md](docs/TOOLCHAIN.md) records the build stack and dependency choices.
Android is the implemented platform runner; other platforms require their own
adapters and verification.

## Run and verify

Run these commands from `apps/geomath_flutter`:

```text
flutter --version
flutter doctor -v
flutter pub get
dart format --output=none --set-exit-if-changed lib test integration_test
flutter analyze
flutter test
node --test tools/contracts/verify_exports.test.mjs
flutter build apk --debug
flutter devices
flutter run -d DEVICE_ID
flutter test integration_test/module_spike_test.dart -d DEVICE_ID
flutter test integration_test/app_flow_test.dart -d DEVICE_ID
```

Replace `DEVICE_ID` with the actual Android ID shown by `flutter devices`.
The APK is `build/app/outputs/flutter-apk/app-debug.apk`.
Record the device/emulator, OS and WebView version alongside integration results:

```text
adb -s DEVICE_ID shell dumpsys webviewupdate
```

The integration smoke uses a real Android WebView. It checks canonical rotation
and unfolding, preference changes without resetting the model, stale actor
messages, reopen, and failure for missing/corrupt local assets. To record an
offline cold start, disable connectivity on the emulator before launching the
app and restore its previous settings afterward. Host SQLite tests use real
temporary on-disk databases for transaction rollback, reopen, owner separation
and failed-save behavior. Protected-storage unit mocks are not an Android
Keystore round-trip.

Current command receipts, device evidence and the READY/blocked decision belong
in `docs/FOUNDATION_READY.json` and
`docs/handoffs/app-foundation/LATEST.md`. Follow those receipts when deciding
whether the foundation is ready for the next feature branch; an APK build alone
does not establish a successful device smoke test. CI is scoped to this app in
`.github/workflows/geomath-flutter.yml` at the repository root.

## Feature previews and shared owners

The production root accepts `FeatureContribution` objects for routes,
localisations, service factories and migrations. Feature work consumes the
single preferences, actor/session, database, formative reader/writer, lifecycle,
audio, clock/RNG and geometry-card owners. See
[FOUNDATION_CONTRACT.md](docs/FOUNDATION_CONTRACT.md),
[STORAGE_CONTRACT.md](docs/STORAGE_CONTRACT.md) and the core feature/module README
files for the frozen interfaces and table ownership.

`lib/app/feature_previews.dart` exposes `runLearningPreview` and
`runCloudGamePreview`. Their `contributions` and `initialRoute` parameters use
the same root as production. Once each feature supplies its owned entry point:

```text
flutter run -d DEVICE_ID -t lib/dev/learning_main.dart
flutter run -d DEVICE_ID -t lib/dev/cloud_game_main.dart
```

Those feature entry files are owned by the learning and cloud/game branches.
Their absence in the foundation does not mean the unfinished feature is ready.
Features register contributions rather than editing the root router or creating
another preferences/session/database owner.

Guest startup, settings and the bundled module require no cloud configuration.
`config/public.example.json` is the empty public configuration example. When the
cloud/game adapter is installed, copy it to `config/public.local.json`, fill only
the public URL/key, and run with `--dart-define-from-file=config/public.local.json`.
`PublicBackendConfiguration.connection()` returns a typed unavailable result for
empty configuration and rejects secret/service-role credentials. Configuration
alone never proves hosted capability or a working Auth callback.
Absent backend, provider or native callback configuration leaves those
capabilities unavailable. Supplying a public backend URL or publishable key
alone does not install an account/classroom implementation. Protected native
sessions belong in `SessionStore`; never put tokens, passwords, client secrets
or service-role keys in assets, WebView messages, outbox payloads or reports.
Guest study remains local; signed-in saves require the contributed queue adapter
and cannot claim a synced result without valid server acceptance.

Settings support BM/English, light/dark/system, contrast, text 100/125/150%,
reduced motion and audio. Reports remain on the device: preview, select/copy,
and explicit TXT export through Android's document picker. TXT export opens the
Storage Access Framework save location chooser and reports cancellation or
failure honestly. It does not send a message, create a support ticket or add an
upload event.

## Rebuild source exports

The committed bundle is sufficient to run the app. Regeneration requires an
exact canonical source checkout at
`37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` and its complete recursive Git tree
JSON. Replace the quoted placeholders below with actual paths:

```text
node tools/contracts/export_contracts.mjs "CANONICAL_ROOT" "RECURSIVE_TREE_JSON"
node tools/module/build_module.mjs "CANONICAL_ROOT" "RECURSIVE_TREE_JSON"
node tools/design/export_tokens.mjs "CANONICAL_ROOT/digital/design-system/tokens.mjs" 37bc2cd262cc0a54e8ee31339ea37471c1ecfda5
dart format lib/core/design/design_tokens.g.dart
node --test tools/contracts/verify_exports.test.mjs
```

The module builder uses an isolated scratch snapshot for generated Digital
output and verifies the pinned input blobs before building. Keep generated
`digital/**` out of app commits. Feature asset submanifests own their internal
hashes; changing a bundle requires its manifest and source evidence to agree.
