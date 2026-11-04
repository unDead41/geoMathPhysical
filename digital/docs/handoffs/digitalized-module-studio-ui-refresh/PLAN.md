# GeoMath Modul 3 implementation plan

Goal: implement concept screens 34–36 using the existing projection, calculation and four-reflection owners.

Base: `391df985eea4fee15d9859e678068b1a3f613cba` (Digital 2.8.0, module 1.6.0).
Concept: `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd`.
Board 09 SHA-256: `a4d30c7c3249c1463f661bc6b453e7ac9576f175e1b04e7f324a358c912e6b4e` (verified).

Product direction: white/blue geometry workbench, existing navy/primary tokens, system display/body/mono fonts. Exact projection sheet is the signature; its Method 1 arrangement takes precedence over the mockup's row of three grids. No additional header, palette, storage or router.

- [x] Studio: group model and guide beside the existing fixed-scale combined sheet; provide labelled line/circle/select shortcuts, Undo and an active-view check. Keep all native selects, coordinates and geometry unchanged. Limit edits to projection-studio view/CSS.
- [x] Calculation: one visible step with a four-button sequence indicator, explicit previous/next controls and preserved checks/drafts. Put canonical model/givens beside the active answer, and disclose problem setup/syntax. Limit edits to calculation-workshop view/CSS.
- [x] Records: upgrade existing progress-summary disclosure into four rows with real stages, predictions/observations/reflections and continue/revisit through existing learn-labs/lab-* buttons. Change only ModuleAccess summary presentation and its existing presentation refresh; no bridge/storage changes.
- [x] Add meaningful regressions for wizard invalidation/revisiting, toolbar undo and records/session isolation. Reuse all geometry/parser/protocol suites.
- [x] Build standalone through original builder. Test module build/test/check, parent design:check and affected host suites. Exercise learning-tools browser fixture at 1440/390, BM/EN, light/dark, 150%, keyboard and reduced motion. Capture actual UI.
- [x] Review allowed-file diff, save evidence and handoff, commit and publish only digitalized-module-studio-ui-refresh via the connected GitHub account. Verify remote SHA and untouched protected refs.

Ownership: index.html only progress-summary and panel mounts; style.css only UX-REDESIGN:PROGRESS; accessibility.mjs only summary presentation and its existing locale refresh. No app.mjs/build hooks are planned. Generated module standalone is built for review, parent vendor/pin remains for integrator.

Source access: direct Git authentication is unavailable. Exact commit/tree and 171 required blobs were read through GitHub, verified against object hashes, and placed in an isolated linked worktree. Unneeded paths remain skip-worktree entries. Remote publication will use create_blob/create_tree/create_commit and the named branch ref only.
