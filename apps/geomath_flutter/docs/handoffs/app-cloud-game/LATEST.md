# GeoMath Flutter — Lawan AI

**Original-app packaging corrected:** `GeoMath-0.2.1-Lengkap-arm64.apk` uses **GeoMath / com.geomath.dev** and includes AI in the same app. [Artifact and signing compatibility](ai-battle-20261106/ORIGINAL_APP_APK.md). An in-place update still requires the installed app's matching signing key, which is not available here for the inspected 0.1.0 APK.

Implemented and verified, 6 November 2026. **Main → Lawan AI** adds an offline adaptive opponent with Easy, Medium and Hard levels. Completed correct player pairs raise the next question's accuracy target and lower its answer-time bounds, within the chosen level's fixed caps.

Runtime source: `ec578641a3e33e167c23aab85780550d7575f6e0`; parent `1d7c8f7e4a6b980b1a911729e73818f79476302f`. Published only to `app-cloud-game`. Production core/root/platform/dependencies and existing modes are unchanged.

**598 Flutter tests passed**, formatter unchanged, analyzer clean, 12 canonical checks passed and independent final review approved. The original-identity ARM64 **GeoMath** release artifact is built and signature-verified; the earlier separately identified preview is historical. Physical-phone acceptance remains pending.

[Complete AI handoff](ai-battle-20261106/README.md) gives exact caps, save/pause/randomness rules, tests, build identity/receipt, host previews and limits. [PowerShell run commands](ai-battle-20261106/RUN_POWERSHELL.md).

Existing Duel/Kelas/Profil, horizontally browsable solid/net cards, typeset math and variable legends are retained. [Previous cloud/game handoff](history/2026-11-06-before-ai/LATEST.md) is historical; its hosted acceptance/Google callback limits remain explicit. No hosted/backend/Pages/store deployment was performed.
