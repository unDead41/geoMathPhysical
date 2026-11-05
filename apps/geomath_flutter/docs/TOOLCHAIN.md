# GeoMath Android development

The foundation uses Flutter **3.47.9 stable**, Dart **3.13.7** and Java **17**.
The Android runner was generated with that SDK. Its development application ID
is `com.geomath.dev`, its display name is **GeoMath**, and its initial app
version is `0.1.0+1`. This is not the final store identity or a store-signed build.
See [the toolchain decision](adr/toolchain.md).

## Windows, Android Studio and VS Code

1. Install the Flutter 3.47.9 stable SDK outside a protected system folder and
   add its `bin` directory to PATH. Start a new terminal and run
   `flutter --version`.
2. Install current stable Android Studio. In SDK Manager install Android API
   36, Build Tools 36.0.0, Command-line Tools, Platform Tools, Emulator and NDK
   28.2.13676358 and CMake 3.22.1 (selected by the current native plugin build).
   Use a full Java 17 JDK for this project and confirm
   `javac -version` works. A runtime-only Java installation cannot compile the
   Android runner. If Android Studio's bundled JDK
   differs, point Flutter at a Java 17 installation with
   `flutter config --jdk-dir="C:\path\to\jdk-17"`.
3. Run `flutter doctor --android-licenses`, review the licenses, then
   `flutter doctor -v`. If needed, select the actual installed SDK with
   `flutter config --android-sdk="C:\Users\you\AppData\Local\Android\Sdk"`.
4. In Android Studio Device Manager create an API 36 Google APIs emulator and
   start it. Hardware acceleration must be available. Alternatively connect an
   Android API 24+ phone with USB debugging enabled and authorize the computer.
5. Open `apps/geomath_flutter` as the Flutter project. Android Studio needs the
   Flutter/Dart plugins; VS Code needs the Flutter extension. Select the
   Android device and run `lib/main.dart`. Do not open a mockup PNG as the app.

An emulator image or physical device must include a functioning Android System
WebView provider. Record its actual version using
`adb -s DEVICE_ID shell dumpsys webviewupdate` when reporting device evidence.

## CLI

Run from `apps/geomath_flutter` after adding Flutter to PATH:

```text
flutter --version
flutter doctor -v
flutter pub get
dart format --output=none --set-exit-if-changed lib test integration_test
flutter analyze
flutter test
flutter build apk --debug
flutter devices
flutter run -d DEVICE_ID
flutter test integration_test -d DEVICE_ID
```

Replace `DEVICE_ID` with a real ID reported by `flutter devices`; do not leave
the placeholder in an evidence receipt. The output APK is
`build/app/outputs/flutter-apk/app-debug.apk`. A debug APK is an installation
artifact and does not prove a successful Android device smoke test.

On Linux/macOS set `ANDROID_HOME` to the installed SDK directory and add
`$ANDROID_HOME/platform-tools`, `$ANDROID_HOME/emulator` and
`$ANDROID_HOME/cmdline-tools/latest/bin` to PATH. For command-line setup the
installed `sdkmanager` compatibility command can install:

```text
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;28.2.13676358" "emulator" "system-images;android-36;google_apis;x86_64"
```

Command-line Tools 22 also supplies the newer Android CLI. Prefer Android
Studio's SDK Manager or the current Android CLI for future setup; keep package
IDs consistent with this pinned Flutter SDK.

Guest startup and local module use do not require cloud configuration. Use only
public configuration values supplied by the app's config example. Never place
service-role keys, passwords or access/refresh tokens in `--dart-define`, app
assets, committed configuration or a WebView. Native Auth callbacks remain
unavailable until the actual provider and callback identity are configured.

## Dependency inventory

The following stable releases were checked on publisher pages on 4 November
2026. `pubspec.yaml` and `pubspec.lock` are the authoritative selected versions;
this inventory is not a claim that every capability is configured or tested.

| Package | Stable release observed | Purpose |
| --- | --- | --- |
| [webview_flutter](https://pub.dev/packages/webview_flutter) | 4.14.1 | Bundled Android module |
| [supabase_flutter](https://pub.dev/packages/supabase_flutter) | 2.18.3 | Future native cloud/Auth adapter |
| [sqflite](https://pub.dev/packages/sqflite) | 2.4.5 | Transactional local records |
| [flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage) | 11.2.0 | Protected session storage |
| [shared_preferences](https://pub.dev/packages/shared_preferences) | 2.5.6 | Noncritical preference API reservation |
| [crypto](https://pub.dev/packages/crypto) | 3.0.8 | Asset/source SHA-256 |
| [path_provider](https://pub.dev/packages/path_provider) | 2.1.6 | Platform app document paths |
| [sqflite_common_ffi](https://pub.dev/packages/sqflite_common_ffi) | 2.4.5 | SQLite host tests |
| [flutter_lints](https://pub.dev/packages/flutter_lints) | 6.0.0 | Static analysis |
| flutter_test / integration_test | Flutter SDK | Widget and Android smoke tests |

New preferences API users should use `SharedPreferencesAsync` or
`SharedPreferencesWithCache`. Plugin documentation does not guarantee critical
data is durable when a preference write returns. The foundation's record
durability contract therefore belongs to SQLite, not this plugin.

## Evidence and CI

[The app workflow](../../../.github/workflows/geomath-flutter.yml) uses app path
filters, a pinned Flutter SDK, Java 17, format/analyze/tests/debug build and an
API 36 Google APIs emulator job. It does not deploy the app or a backend.

The initial worker environment is Ubuntu 24.04.3, x86-64, Java 17.0.20. Its
first `flutter doctor -v` exited 0 but reported no Android SDK and only a Linux
device. It also reported an environment-specific proxy/interface check error
(`Bad value for ai_flags`). Command-line Tools 22.0 were then installed from
Google's archive after verifying SHA-256
`4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583`.
The host exposes neither `/dev/kvm` nor a USB device tree. Android package
installation and final build/device outcomes are recorded in the foundation
handoff and `FOUNDATION_READY.json`; this document does not mark them passed.

Routine provisioning then completed with the following actual toolchain:

| Component | Installed version |
| --- | --- |
| Full JDK | Eclipse Temurin 17.0.21+9; `javac 17.0.21` |
| Android command-line tools | 22.0 |
| Android platforms | API 36 for the app; API 35 installed for a plugin build |
| Android build tools | 36.0.0 |
| Android NDK | 28.2.13676358 |
| CMake | 3.22.1, selected by the native plugin build |
| Platform tools | 37.0.1; ADB 1.0.41 |
| Android emulator | 37.2.13.0, build 16740729 |
| System image | API 36 Google APIs x86-64, revision 7 |
| Gradle | 9.3.1, distribution checksum verified |

The JDK archive was selected through the official
[Adoptium API](https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&jvm_impl=hotspot&os=linux&vendor=eclipse),
with SHA-256
`8b9b611d917e3dfd8419d3566b5949226f69b052fed7e109c1368add1dfe8711`.
Android SDK installation exited 0, and the subsequent doctor check reported
the Android toolchain and licenses available. The proxy/interface warning is
separate from those checks. Native Java downloads needed the execution
environment's HTTPS proxy; those transient proxy settings are not committed.

An initial scaffold debug build failed first on direct Gradle network access,
then on the original Java runtime's missing compiler. Those failures prompted
the verified Gradle download and full-JDK installation above. They must not be
reported as a successful APK build or a final-app test result.

The integrated foundation's subsequent `flutter build apk --debug` completed
successfully with exit 0 (Gradle 579.7 seconds) using bounded build resources.
An incremental build against the final production source also exited 0
(Gradle 72.7 seconds). APK inspection confirmed `com.geomath.dev`, GeoMath,
`0.1.0+1`, minimum API 24, target/compile API 36, and ARMv7/ARM64/x86-64
native libraries. Its SHA-256 was
`86fcddbfe50a8736210792bfda3fe0abe17a1cc7c1c85bcfef35c6398c545b06`.
The environment has an 8 GB memory limit and no KVM; concurrent software
emulator startup suffered a SIGKILL while the cgroup recorded out-of-memory
kills. Build success therefore remains separate from Android app/device smoke
and screenshots. The final handoff records the tested app source and the final
device outcome.


### Hosted Android runner resources

The workflow pins `ubuntu-24.04` instead of the moving `ubuntu-latest` label.
Run41864207926 selected Ubuntu26.04.1 and exhausted space while SDKmanager
installed the API36 system image, before emulator boot. The Android job now
reclaims only unused .NET, Haskell, Swift and Docker image storage on its
disposable hosted runner, prints filesystem bytes/inodes, and reserves20GiB
for the image, AVD and second native build. This is a project budget, not an
Android minimum. Java/Flutter toolcaches and Android SDK components are retained.

The emulator action receives disk-backed `TMPDIR` and Java `java.io.tmpdir`,
2cores,3072MiB RAM and4096MiB userdata. Ubuntu26.04 can mount `/tmp` as tmpfs;
bytes and inodes are therefore logged for both root and temporary filesystems.
The original ENOSPC log did not identify which filesystem filled. The runner
pin and temp setting avoid depending on that changing image layout.

Sources: [runner migration](https://github.com/actions/runner-images/issues/14748),
[official Swift installer temp handling](https://github.com/actions/runner-images/blob/main/images/ubuntu/scripts/build/install-swift.sh),
[emulator action inputs](https://github.com/ReactiveCircus/android-emulator-runner/blob/v2/action.yml).
