# Production widget capture evidence

`production_widget_capture_test.dart` is an opt-in host capture harness. It mounts
`GeoMathApp` with `productionFeatures()` and the normal repositories, migrations,
controllers, asset readers, and SQLite transactions. Only the installation and
preference stores use the existing test seams. It uses a local guest and no
configured backend.

Run from `apps/geomath_flutter` after the locked dependencies are resolved:

```sh
flutter test --no-pub test/uiux/production_widget_capture_test.dart \
  --dart-define=UIUX_CAPTURE_DIRECTORY=/absolute/path/to/output \
  --dart-define=UIUX_FONT_DIRECTORY=/absolute/flutter/bin/cache/artifacts/material_fonts
```

The harness loads the SDK's real Roboto and Material Icons fonts. For host
rasterization it resolves implicit paragraph font families to Roboto, matching
Android's default instead of the host engine's block-shaped test glyphs. Explicit
font families, production widgets, state, sizes, spacing and colors are preserved.
It renders 320, 390, 430 and 768 logical widths in BM/English and light/dark at
150% app text, plus two 800×600 short-tablet profiles at 225% composed text
(150% app × 150% system, BM/light and English/dark).
It checks for layout exceptions, labeled 48 dp tap targets and actor continuity,
and saves the initial viewport plus the bottom of vertically scrolling pages.
Each profile has a JSON inventory with source SHA, tracked runtime differences,
app/Dart versions and PNG hashes beside its images. The default test suite skips
these captures unless an output directory is explicitly supplied.

These are actual production native-widget renders on the Flutter host test
engine. They do not contain an Android system surface or a native WebView and
cannot establish Android startup, module gestures, hosted service behavior,
emulator acceptance, TalkBack behavior or physical-device performance. The
capture routes deliberately exclude the native learning WebView. Review the
images themselves before describing the visual result.
