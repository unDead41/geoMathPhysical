# Host-rendered GeoMath previews

These PNGs render actual Flutter widgets on the host engine. They are not Android screenshots. Production controllers, routes, real on-disk SQLite and canonical geometry are used. A capture-only Roboto font override replaces Ahem glyphs; no production file or APK is modified.

The opt-in capture script is outside CI discovery. Run it from apps/geomath_flutter with `flutter test --no-pub /absolute/path/capture_host_previews.dart`. Output/font locations can be supplied using HOST_PREVIEW_OUTPUT and HOST_PREVIEW_FONTS Dart defines. See RECEIPT.json for exact source, output and scope.
