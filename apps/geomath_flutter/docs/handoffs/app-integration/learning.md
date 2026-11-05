# Learning integration audit

Audit source: `app-learning` at `8a5527438ee828a306afba36a337a3ca3bbedb83`.
Foundation: `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`, contract `1.0.0`.
Canonical module: `1.6.2`, source `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`.
No feature runtime or shared runtime file was edited by this worker.

## Actual checks

| Command | Exit | Result |
| --- | --- | --- |
| `node --test test/features/learning/bundle/*.test.mjs test/features/learning/surface/*.test.mjs test/features/learning/studio/*.test.mjs` | 0 | 34 tests passed |
| `flutter test --no-pub test/features/learning test/learning` | 0 | 57 tests passed |
| `flutter analyze --no-pub integration_test/learning_navigation_test.dart` | 0 | No issues |
| `dart format integration_test/learning_navigation_test.dart` | 0 | Formatted new test |

Flutter `3.47.9`, Dart `3.13.7`, Node `24.22.1` were used. Logs are in
[evidence/learning](evidence/learning/). The first Node attempt lacked `dart`
in PATH and was rerun with the installed SDK. Initial `flutter pub get
--offline` resolved dependencies but failed writing Pub active-roots on the
full shared filesystem; its failure is not reported as PASS. The generated
package configuration was usable by the explicit `--no-pub` checks above.

Node checks exercise actual exported source geometry for eleven models, physical
face/constituent/cavity identity, analytic surface sums, container/lab variants,
workflow phase gates, projection/Undo checkpoint validation, DOM draft retention,
and Dart/JavaScript private checkpoint schema parity. Host Flutter checks cover
catalogue/routes, bilingual responsive native controls, durable checkpoints and
actor-bound reflection presentation. They do not prove a running Android WebView.

## Navigation regression target

`integration_test/learning_navigation_test.dart` adds two tests for the root
integration fix. It is importable through `main()` in a combined Android suite.
It keeps the real `LearningModulePage`, canonical WebView and SQLite adapters:

1. Change a canonical calculation draft and select Home immediately, without
   waiting for periodic autosave. Home may become current only after the latest
   checkpoint is durable. Reopening must restore that dimension.
2. A SQLite trigger rejects checkpoint inserts. Selecting Home must show the
   actual unsaved-draft dialog. Stay preserves the route and live draft; Leave
   changes destination while the durable value remains unchanged.

This new target has passed analysis but has **not run on Android in this worker**.
The integrated Android job must execute it after the shared destination guard fix.
No screenshot, device PASS, native gesture or TalkBack evidence is inferred from
host tests. The root full-suite/Android receipts supersede this premerge audit.

## Integration decisions

- Register `learningFeature()` once in production with the cloud/game
  contributions and reuse `FoundationServices.recordsWriter/recordsReader`.
- Keep only `learning_checkpoints:1` as the feature migration; no second
  reflection table or outbox owner is needed.
- Resolve the current `assets/module/manifest.json` submanifest; foundation
  snapshot hashes must not replace the feature bundle hashes.
- The outstanding proven shared defect is destination reset bypassing the active
  leave guard. Root owns its runtime fix. Platform SVG print/file and URL opening
  remain explicitly labelled preview/copy capabilities.
