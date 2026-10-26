# Central design system implementation plan

Goal: one GeoDecoder visual foundation across existing portal, play, settings and offline learning surfaces. The user supplied the implementation scope and authorized completion/push on `digitalized-ux-design-system`.

Base fetched through GitHub connector: `main-digitalized` **790d989d666e64f3beabb507cd4140b832696367**, Digital **v2.6.0**, module **v1.5.0**, firmware **v1.1.3**. Firmware main inspected at `a059979d97926b82cafd4aa5cf3fe59da04a55bb`. The output branch was absent remotely. Own isolated worktree; no existing user changes.

## Approach

A CSS-only overlay would retain competing token owners. Rebuilding all pages would increase logic risk and overlap the requested module-layout branch. Chosen implementation: central JavaScript token owner → deterministic portal CSS/module adapter; shared CSS recipes adapt existing class names, with a standalone interactive reference. Keep legacy source module pin byte-identical and inject presentation tokens through its existing frame preparation boundary.

## Tasks

- [x] Audit AGENTS, SOR, source/UX/design contracts, portal/account/security/preferences and module owners; capture baseline and run existing tests.
- [x] Central token generation, semantic themes/contrast and deterministic drift checks, contrast tests.
- [x] Shared component recipes and existing-screen adapters; integrate both builds and pinned-module frame without domain changes.
- [x] BM/English interactive reference with temporary preview controls and offline artifact.
- [x] Browser matrix: keyboard, dialog, field validation, both themes/locales, large text, 320px and offline module; capture after screenshots.
- [x] Build/check/test, premium static audit, document limitations and handoff; commit and push only work branch, verify remote SHA (completion receipt accompanies the final handoff).

## Review focus

1. Dark text primary and filled-action primary have separate roles and readable contrast.
2. Module preferences scale type once, preserve activity and remain session/source scoped.
3. Keyboard focus and native semantics survive visual adapters; busy/disabled controls keep dimensions.
4. 320px and 150% text wrap rather than hide actions or clip dialogs.
5. Generated outputs and built offline aliases remain in sync; no new network/font/CDN or backend changes.
