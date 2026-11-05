# GeoMath Flutter integration

Status: **integrated; Android gate pending**. App0.1.0+1, contract1.0.0.

## Sources

|Ref|Verified remote SHA|
|---|---|
|app|38f061af963256528d5060ff076bae9ee05eafc3|
|app-foundation|9a1f49a7c92d13bb70b7fd1420c34629a7785f9e|
|app-learning|8a5527438ee828a306afba36a337a3ca3bbedb83|
|app-cloud-game|33e6734a27db789f04a9a048bf7f69ebd046e016|
|main inspected|25836eb1a6f24459aace8a3980ae880a13e3b488|
|main-digitalized inspected|752ce908d16d13acc9cc7510797e8363d182c3f5|

Both features retain the same frozen contract/source-lock/pubspec-lock hashes.
The original feature ancestry is preserved; unknown unrelated source blobs were
left by hash, never replaced by a feature snapshot. See ancestry.md.

## Integration decisions

- Register productionFeatures() in lib/main.dart and await existing session/sync
  startup before Home. Move real cloud wiring to app/, retain a dev re-export.
- One database/migration registry, one session/audio owner, one shared formative
  writer and sync controller. Learning and Solo consume the same writer; guest
  stays local and signed-in records+events commit atomically.
- Bottom destinations now await leave policies for every discarded stack entry.
  Stay preserves a live draft, a stale confirmation cannot reset newer routes,
  and concurrent resets/back share one pending operation.
- Home reaches the real learning route and displays current guest/account state.
- Android reserves one app_links callback filter and disables competing Flutter
  deep-link dispatch. nativeCallbackReady remains false pending hosted proof.
- The workflow runs all feature host tests and one combined real-plugin/WebView
  Android APK, then runs/captures the preserved normal production APK offline.

## Evidence

Four destination regression tests failed before the fix and pass after it;
production Home composition likewise failed on development copy before repair.
Full combined host and Android results are updated after actual execution.
Worker audit receipts preserve exact tested source and label fixture scope.
SCREEN_ACCEPTANCE.md/.json cover all48IDs and16EXstates without claiming every
item device/hosted accepted. Android screenshots and APK receipts will link the
verified runtime source; this file never embeds its own commit SHA.

## Limits

No hosted Auth/profile/classroom/offline-sync/two-client Duel acceptance is
inferred from fixtures. No native Google/recovery success, physical phone,
TalkBack/manual gestures, iOS,5,000-user capacity or production signing claim.
No backend/Pages/store deployment or main/main-digitalized/sharing push.
APK source, mode, bytes and SHA256 are recorded only after a real build.
