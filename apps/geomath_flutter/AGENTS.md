# GeoMath Flutter contributor guidance

This directory is the runnable native GeoMath application. The consolidated development baseline is branch `app`. Begin with [AI_HANDOFF.md](AI_HANDOFF.md), the actual `pubspec.yaml`/lockfile and the latest `docs/handoffs/app/LATEST.md`. Older branch handoffs describe their named snapshots and are not a replacement for current source verification. Root firmware rules apply when touching firmware; app-only work does not bump firmware versions.

## One installed application

- Production starts at `lib/main.dart` and `lib/app/production_features.dart`. Learning and the cloud/game set register once. `soloFeature()` already includes the AI services, strings, route and migration; do not register AI a second time at the root.
- Keep launcher **GeoMath**, application ID **com.geomath.dev**, and the existing callback contract. Lawan AI is a feature at **Main → Lawan AI**, not another application. Do not change package identity to work around an update/signing failure.
- `lib/dev/` entry points are previews, not the combined production application. Reuse the existing typed feature/service registry, Result/AppFailure, ActorBinding and shared lifecycle/audio/navigation owners.

## Game, geometry and mathematics

- Preserve all eleven learning models and the five canonical game shapes: cube, cuboid, pyramid, cylinder and cone. Keep canonical geometry/parser/question provenance and stable physical face IDs/colors. Curved rendering patches are not extra physical faces. Sphere/hemisphere do not have invented nets.
- Browse, select and scan are distinct actions. Swipe/arrows browse; tap/guarded drag selects; explicit R1/R2 actions submit. Online Duel/class correctness, roles and scores remain server-owned. Do not import the local answer bank into online Duel presentation.
- Reuse `GameCardCarousel`, guarded drag/reader widgets and `GameQuestionContent`. Preserve typeset formulas, accessible semantics and BM/English variable meanings. Both languages, large text, keyboard reachability and reduced-motion policies apply to changes.
- AI is an offline simulated opponent. Preserve difficulty probability/time caps, separate saved random streams, fixed per-question plans, next-question-only adaptation, hidden answers until both contestants finish, and independent score/storage. Probabilities are not human win rates. Read `lib/features/ai_battle/domain/ai_policy.dart` and `lib/features/ai_battle/domain/ai_battle_game.dart` before changing these rules.
- For AI setup/question/results, preserve the explicit `GeoMathScaffold.scrollKey` scopes. A scaffold widget key alone does not isolate the shared shell's persisted scroll offsets. R1→R2, pause and ordinary language/theme changes keep the current question's position; a new question starts at its prompt.

## Durable data and boundaries

- All delayed work must validate the captured actor/session/epoch/scope and relevant attempt/question/stage/route identity. Preserve save failure and uncertain-response barriers; a late callback cannot publish into a different account or activity.
- Use the existing database/migration owners. Only signed-in canonical module reflections and completed Solo records enter the formative outbox atomically with their local record. Guest data does not auto-upload. AI uses `ai_battle_slots` and never writes official Solo/class/Duel/formative scores.
- Keep protected credentials out of Git, WebView, outbox, logs, screenshots and handoffs. Public client configuration uses the existing ignored local-defines mechanism. Never commit signing keys or invent credentials/capabilities.
- Treat SDK build, host tests, Android/emulator/device execution, hosted acceptance and measured performance as separate evidence. Preserve the documented Google callback gate and backend acknowledgement requirements. Do not deploy backend/providers/Pages/store as an incidental game edit.
- An in-place update requires the matching original signing key and an increasing Android version code. Same name/package alone is insufficient. Do not uninstall, clear data, bypass signing, or promise retention without an established update path.

## Verification and delivery

- Make the smallest scoped change from current source and inspect existing tests first. Format changed Dart, run the full analyzer and affected meaningful tests; use the broader checks required by the actual change. For native/configuration changes verify the affected build. New snapshot formats require real migration/reopen/actor-isolation checks.
- `AI_HANDOFF.md` gives exact commands and the source map. Default tests intentionally skip the opt-in capture profiles; report them explicitly and do not present historical captures as a new run.
- Distinguish app, module and firmware versions. Check remote heads before push, preserve concurrent work, and use normal fast-forward publication to the user-authorized branch. Leave firmware/Digital/backend/planning archives and unrelated refs untouched unless separately requested.
