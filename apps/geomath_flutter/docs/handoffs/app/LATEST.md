# GeoMath app — consolidated AI development handoff

6 November 2026. **Branch `app`**, app **0.3.0+4**, foundation contract **1.0.0**. The completed Flutter application is consolidated for the next AI to continue game development. Start with [AI_HANDOFF.md](../../../AI_HANDOFF.md) and [app AGENTS.md](../../../AGENTS.md).

## Exact source and contents

Runtime merge commit: `888f6ec23d66678182825e3d3ab50ba69413d62e`. Exact tree: `498d62ae455b7087663d6e26ffb0e40d1f0a7936`. Actual remote parents are cloud/game `288dc703d61479cb89a22d4f2416d71d9b8294ac` and UI refinement `67c1e1bf76064d5df2787bef90ec789d1a21a975`. The prior `app`/integration head `20eed848cc015d6253accd6cf72fcf127bf72827`, learning `8a5527438ee828a306afba36a337a3ca3bbedb83` and foundation `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e` are included ancestors. Final branch HEAD may add handoff-only documentation; inspect the remote ref rather than inferring it from a file's own commit.

The same production application includes native accounts/profile/classes, Solo/practice/resume/scores, online Duel, formative synchronization, eleven-model canonical learning/labs/studio, the eighteen UI refinements, horizontal solid/net cards with math/variable meanings, and offline adaptive Easy/Medium/Hard AI. Production starts at `lib/main.dart`; package `com.geomath.dev`, launcher **GeoMath**. AI is composed once through Solo at Main → Lawan AI.

The two overlapping Solo presentation files were merged with both feature additions retained. A reproduced integration defect restored setup/review offsets into a new AI question; three explicit existing scaffold scroll identifiers fix setup, question(attempt,index) and results while preserving ordinary preference/R1→R2 position. New regressions cover popup-first navigation with retained activity/controllers and real SQLite legacy-data upgrade/reopen with separate AI slots.

## Executed combined checks

| Check | Result |
| --- | --- |
| Dart formatter | 235 files, 0 changed |
| Full analyzer | No issues |
| Full Flutter suite | **676 passed**, 18 opt-in visual profiles skipped, 0 failed |
| Canonical/module/native-wrapper Node checks | 60 passed |
| Android tooling Python checks | 36 passed: discovery groups 7 + 29 |
| Offline adapter rebuild | Two runs reproduce all four shipped files byte for byte |
| Independent source/production review | Approved; no unresolved important finding |
| ARM64 release APK | Build, v2 signature, original manifest/launcher, CRC and 20 packaged asset checks passed |
| Compiled/source mapping | 186 fingerprints; 19 tracked Android files and dependencies unchanged by the isolated build |

The APK build used local source `d79b9bf8d82246bf48f33d0d6e443de08200d7ca`; final tests used `f9255a660a421b6656928fc5eb8c199f46b66b19`. Their compiled Dart/assets/platform/pubspec/lock inputs are byte-identical; the later two commits add tests only. The remote runtime tree matches the tested local tree exactly. The APK is validation evidence, not a committed binary or a claim of phone execution. SHA256 `ff6ad3a93d8987d780d1fccc21bbbf9bbe92b1ba171aa4f549f27691d6acb3ae`, 21588239 bytes, version 0.3.0 / ARM64 split versionCode 2004.

[Machine verification](VERIFICATION.json) and [source/build/test/review evidence](evidence/2026-11-06/) identify exact inputs, commands and limits. Copied terminal text logs trim trailing whitespace only. Prior branch screenshots and test receipts remain historical; no new capture profile, Android/emulator/phone, TalkBack, hosted Auth/class/Duel or store acceptance is claimed here.

## Continue safely

Read [the source map, runnable PowerShell commands, invariants and remaining gates](../../../AI_HANDOFF.md). The original production identity is retained. Matching original signing keys and increasing Android version codes are required before promising an update that preserves installed app data. The code still gates native Google callbacks and requires real hosted capabilities/server acknowledgements.

One low-priority AI loading-only reduced-motion note and existing checkpoint/process-death limits are recorded in AI_HANDOFF.md. No additional product features, backend/provider/SMTP/Edge migrations, firmware/Digital edits, Pages/store publication or unrelated branch changes are part of this consolidation.
