# Native design and preferences foundation

App version: `0.1.0+1`. Worker base: `origin/app` at
`38f061af963256528d5060ff076bae9ee05eafc3`. This work does not change the inherited firmware
version or publish a main release.

## Canonical tokens and face identity

`lib/core/design/design_tokens.g.dart` is generated from
`digital/design-system/tokens.mjs` at Digital commit
`37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Git blob
`94a77935bf3b9c67cf6c5cd5766bc677858b58b4`. The generated header records SHA-256.
The exporter checks that exact blob and resolves aliases in light, dark, strong
and dark-strong maps. It accepts a single appended transport newline only when
removing it yields the approved Git blob. It does not modify canonical source.

Regenerate from the Flutter app directory:

```sh
node tools/design/export_tokens.mjs /path/to/canonical/digital/design-system/tokens.mjs 37bc2cd262cc0a54e8ee31339ea37471c1ecfda5
dart format lib/core/design/design_tokens.g.dart
```

`GeoMathTheme.light/dark({strongContrast})`, `GeoMathColors` and
`GeoMathSpacing` are the only native token adapters. System fonts work offline.
The native 48 dp target intentionally supersedes the web 44 dp control token.
Native spacing converts source rem units at 16 dp. Material controls use the
source semantic colours; destructive fills use `danger-fill`, rather than the
dark theme's lighter error-text colour. Automated contrast checks cover body,
muted text, statuses and primary/destructive fills in all four theme variants.

`FacePalette.forFace(shape, stableFaceId)` maps only cube/cuboid physical face
IDs 0–5 to the approved `docs/geomath-app/face_colors.json` colours. It returns
null for unsupported shapes/IDs; each canonical shape adapter must describe its
actual surfaces. Rotation/folding/camera do not occur in this API.
`GeoCubeIllustration` is a native decorative illustration of the approved top,
front and right faces. It is not a game card, mathematical mesh or answer asset.

## Public UI and localization entry points

- `core/design/design.dart`: theme, semantic colours, spacing, motion and palette.
- `core/widgets/widgets.dart`: scaffold/card, headers, buttons, labeled fields,
  choice chips, notices, empty/retry states, sync badge, confirmation/unsaved
  choices, shape picker, model toolbar, face legend and decorative brand/cube.
- `core/l10n/app_strings.dart`: `AppStrings(AppLanguage, {contributions})`,
  `.text(key, {fallback, parameters})`, `.locale`, `.delegate`, `.supportedLocales`
  and `AppStringsScope(strings:, child:)`.
- `features/preferences/preferences_screen.dart`:
  `PreferencesScreen(repository:, onBack:, bottomNavigationBar:)`.

Widgets receive localized labels, real state and typed callbacks. They do not
write business records or call a backend. Shape choices and legend entries come
from the consuming feature; no widget infers the game or model catalogue.

Contributions have type `Map<String, Map<String, String>>`: outer keys `ms` and
`en`, inner keys fully qualified `feature.key`. Composition owns namespace
collision checks. Lookup is current language, English, Malay, supplied fallback,
then key. Root supplies Global Material/Widgets/Cupertino localization delegates,
so native selection and back controls also use the selected language.

The root listens to the single preferences repository and applies theme,
language, text scaling and reduced motion without keying or recreating feature
controllers, a model WebView, camera state or active drafts. Combine the OS
disable-animations setting with `reducedMotion` in MediaQuery, and set
MaterialApp's theme animation duration to zero for reduced motion. Busy controls
render a static progress indication when animations are disabled.

Screen 37 follows board 10's white outlined row groups and navy/blue hierarchy.
Language/theme/size open native sheets; music, sound, reduced motion and contrast
are single-owner switches. Narrow/large-text rows stack their value under their
label and the complete page scrolls. Screen 38 is the same app's dark theme,
not a separate stateful page. Audio toggles grant permission to the single
activity audio owner; settings do not claim to play bundled music themselves.

## Persistence contract

`AppPreferences` is immutable: `AppLanguage.ms/en`, `AppTheme.light/dark/system`,
textScale `1.0/1.25/1.5`, `strongContrast`, `reducedMotion`, `musicEnabled` and
`soundEnabled`. JSON schema version 1 validates every field and rejects future
versions, invalid scales and non-boolean flags.

`PreferencesRepository extends ChangeNotifier` exposes `value` and
`Future<Result<void>> save(AppPreferences)`. Production bootstrap awaits
`SharedPreferencesRepository.open()` and handles failure explicitly.

`SharedPreferencesStore` uses shared_preferences 2.5.5's uncached
`SharedPreferencesAsync` API with Android's default DataStore backend. A single
`geomath.preferences.v1` JSON value prevents partial preference combinations.
Save calls are serialized. The adapter awaits `setString` and verifies read-back
before publishing a new snapshot. A denied write leaves the old controls and
theme active; the settings screen offers retry of the same intent. A failed
read/corrupt document is never silently overwritten with defaults.

The plugin does not promise an fsync guarantee on every supported platform.
These are non-critical device preferences; formative records and sessions use
their separate storage contracts. Android process restart/device persistence
must be verified in the integrated device smoke, independently of unit tests.
`UnavailablePreferencesRepository` is an honest bootstrap fallback whose saves
fail; `MemoryPreferencesRepository` is for preview injection only.

## Verification

Executed with Flutter 3.47.9 stable, Dart 3.13.7 in the worker app harness:

```text
flutter pub get --offline
dart format lib test
flutter analyze
flutter test test/design test/preferences
```

The initial targeted suite passed 23 tests. Tests cover actual flushed temp-file
reopen, a denied replacement preserving the previous disk value, delayed writes,
no pre-ack notifications, serialized saves/retry, corrupt/future JSON, localized
feature fallback, physical face IDs, contrast, button single-flight semantics,
every settings control, and a widget save failure/retry. The UI matrix checks
320/390/430/768 dp, BM/English, dark/strong contrast/150% text, Android 48 dp tap
guidelines and a reachable confirmation with keyboard insets at 320 dp.

These are native Flutter unit/widget tests, not Android device or WebView
evidence. The lead's integrated run/build/smoke receipt supplies those results.
