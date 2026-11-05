# GeoMath / GeoDecoder — Android app

**Integrated implementation; Android verification in progress.** App **0.1.0+1**,
foundation contract **1.0.0**. Work branch `app-integration`; `app` is advanced
only after integrated checks pass. This status supersedes the planning-only
entry; the original `docs/geomath-app/` archive remains unchanged.

Production code is in `apps/geomath_flutter/`. Its default `lib/main.dart`
registers learning, native Auth/profile/classroom/Solo/Duel and one sync owner.
The offline canonical module retains11models, stable face colors, labs and studio;
Solo retains5game shapes including cone and single-attempt R1/R2 rules.

Start with [the app README](apps/geomath_flutter/README.md) and
[Android commands](apps/geomath_flutter/docs/RUN_ANDROID.md).
[Acceptance64items](apps/geomath_flutter/docs/SCREEN_ACCEPTANCE.md) and
[integration handoff](apps/geomath_flutter/docs/handoffs/app-integration/LATEST.md)
separate local/device evidence from hosted and manual acceptance.

The source branches use the same foundation READY commit
`9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`. Frozen source locks and dependency
lockfile are preserved. Native callback handling is reserved in the Android
manifest, but Google/recovery capability remains disabled until its hosted and
actual callback gate passes. SMS is absent. Missing cloud capabilities remain
visible; an offline fixture result does not prove hosted Auth or two-client Duel.

Firmware, Digital sources, backend/Auth/SMTP settings, Pages and store deployment
are unchanged. App version is independent of the inherited firmware version.
The12mockup boards and48screen/16state planning catalogue remain available in
[the original development package](docs/geomath-app/README.md).
