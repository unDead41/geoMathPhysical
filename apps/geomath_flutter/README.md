# GeoMath Android

App **0.3.0+4**, foundation contract **1.0.0**. Production `lib/main.dart` combines
native account/classroom/Solo/Duel/sync with the bundled canonical learning WebView.

The UI refinement follows the [eighteen-item scope](docs/uiux-refinement/SPEC.md):
adaptive navigation, accessible system text, optional haptics, swipeable learning
and game choices, real model controls, contextual learning panels, PIN clipboard
actions and actor-scoped local resume/progress. Domain geometry, calculation,
game timing and server authority retain their existing owners.

## Run

Use Flutter **3.47.9**, Dart **3.13.7**, Java **17**, Android SDK and a running
Android emulator or USB-debugging phone. From the repository root:

```sh
cd apps/geomath_flutter
flutter pub get
flutter devices
flutter run -d DEVICE_ID
flutter build apk --debug
```

Replace `DEVICE_ID` with the ID printed by `flutter devices`. No cloud config is
needed for guest learning or Solo. See [RUN_ANDROID.md](docs/RUN_ANDROID.md) for
configuration, installation, tests and lifecycle limits.

[Screen acceptance](docs/SCREEN_ACCEPTANCE.md) distinguishes implemented routes,
actual evidence and remaining hosted/device/manual checks. Integration evidence
is recorded in [the handoff](docs/handoffs/app-integration/LATEST.md).

The original plan/mockup archive remains at `../../docs/geomath-app/`.
