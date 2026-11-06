# GeoMath UI/UX Implementation Plan

**Goal:** Apply the eighteen approved UI/UX improvements to the real combined Flutter app.

**Architecture:** Keep the native composition, actor-bound controllers and bundled canonical learning geometry. Shared widgets own presentation; feature controllers remain owners of commands and durable state.

**Tech Stack:** Flutter 3.47.9, Dart 3.13.7, SQLite, existing plugins and offline JavaScript module.

**Spec:** SPEC.md in this directory.

## Global constraints

- Publication parent 1d7c8f7e4a6b980b1a911729e73818f79476302f; publish only app-uiux-refinement.
- Six private worker worktrees; each worker commits only its owned files, lead integrates and publishes.
- No changes to digital/firmware/backend or secret/config values.
- Keep all existing meaningful tests, canonical geometry and domain behavior.

## Review focus

1. Large system text and 320dp widths must retain controls and readable formulas.
2. Swipe/drag must never accidentally submit, bypass R1/R2 or cross a new question/actor.
3. Native sheets, theme and layout switches must preserve the mounted WebView and draft.
4. Local saved data is not a server acknowledgement; pending data remains pending.
5. Face selection/folding must preserve physical surface IDs, including no-net shapes.

## Tasks and exact ownership

- [ ] Shared UI: `lib/app/app.dart`, `app_router.dart`, `lib/core/design/**`, `lib/core/widgets/**`, `lib/core/preferences/**`, `features/preferences/**`; shared responsive/semantics/preference tests. Preserve callers. Add adaptive navigation, text scaling and motion/haptic policy with compatibility defaults.
- [ ] Native learning: `features/learning/presentation/**`, learning catalogue/strings/application only where necessary; relevant feature tests. Add eleven-shape swipe selector, fold slider, view controls and real note/calculator sheets while preserving current controller and platform-view key.
- [ ] Module adapter: `tools/module/**`, `assets/module/**`, JS bundle/surface tests. Preserve canonical source, rebuild hashes; add meaningful face/preset/notes/gesture refinements. No Flutter controller changes without coordination.
- [ ] Classes/profile: presentation and local strings in auth/profile/classroom plus feature tests. Improve PIN paste/copy and invite clarity, forms, validation and responsive hierarchy without repository changes except a demonstrated regression.
- [ ] Games: duel/solo presentation and strings plus feature tests. Reuse game carousel/math; add snap and guarded drag/tap alternatives plus lobby/reconnect clarity without changing engine or protocol.
- [ ] Runtime/verification: audit toolchain/dependencies, baseline checks, independent review; own only scratch tooling and `test/uiux/**` if needed. Do not mutate another worker's source or runtime cache.
- [ ] Lead: home actual resume/progress, sync presentation, source audit, version/changelog, CI branch filter, integration, full verification, reviewed captures/build, handoff and remote publication.

Each owner first reads the existing implementation/tests, writes a focused regression for meaningful behavior, demonstrates the relevant failure where feasible, implements, formats and runs scoped tests. Report exact commands/results and commit SHA. Lead cherry-picks each bounded commit, inspects the final diff, runs the combined checks, resolves integration failures and publishes with a non-forced update to the dedicated branch.
