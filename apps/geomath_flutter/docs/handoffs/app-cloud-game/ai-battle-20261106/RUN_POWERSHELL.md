# Run the AI source from VS Code

Run these commands in a PowerShell terminal at your existing GeoDecoder repository. The new worktree path must not already exist. No reset, clean or uninstall is performed.

```powershell
git fetch origin app-cloud-game
git worktree add --detach ..\geomath-ai-local origin/app-cloud-game
Set-Location ..\geomath-ai-local\apps\geomath_flutter
flutter pub get
flutter run
```

Select **Main → Lawan AI**. The AI mode itself works offline without public backend configuration. For existing cloud features, provide the ignored local public configuration using the existing documented mechanism; never put account credentials or secret keys in source.

The inherited native source package is `com.geomath.dev`. The downloadable **GeoMath AI** APK is a separately identified preview (`com.geomath.ai.preview`) built from an isolated copy to avoid the user's observed mismatched-signature update error. Its package/label/auth-filter deltas are recorded in the build receipt. Do not uninstall an existing app to test this preview. Records are not transferred automatically between the two package identities.

Verified toolchain: Flutter 3.47.9 / Dart 3.13.7, JDK 17 and Android SDK 36. Production pubspec remains 0.1.0+1. The preview uses build-name 0.1.0-ai.1 and build-number 2; Flutter's ARM64 split APK emits Android versionCode 2002. It is release mode with development signing, not a Play Store release.

A clean release build should allow Flutter to regenerate release plugin registration:

```powershell
flutter pub get
flutter build apk --release --split-per-abi --target-platform android-arm64
```

Do not use `--no-pub` after debug/test registration when switching to release: on this pinned Flutter version it skips release-specific platform-tool regeneration and can leave the dev-only integration_test plugin in GeneratedPluginRegistrant.java. The successful preview used normal release regeneration.
