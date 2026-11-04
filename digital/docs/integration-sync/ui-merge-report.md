# GeoMath UI integration report

Integration base: `391df985eea4fee15d9859e678068b1a3f613cba` (`main-digitalized`).
Working directory: `/workspace/scratch/8354d9072f14/geodecoder-integration`.
No commit, push, index operation, backend deployment or generated release build was performed by this agent.

## Sources reconciled

| Branch | Source head | Integrated UI contribution |
|---|---|---|
| digitalized-ux-ui-upgrade | fc50b3ed51c14774f3f75e8098df3988f4c6a07f | GeoMath header/Home, mode cards, native guide/resume pages, entry scenes, hash navigation and save metadata |
| digitalized-game-duel-ui-refresh | 02f7614b0b28b7b867836bb2f83fbfc4437888cb | PIN/lobby presentation, pending controls, live player board, progress, result presentation and BM/English copy |
| digitalized-utility-offline-sync | b1125588ade0c18168f2fd0116d3e9084dfdd3ed | Offline runtime composition, module ownership/sync hooks, completed solo capture and PWA builder hook |
| digitalized-classroom-crud | 1f0dedca55fd8d1291f5ea5c0b2fc74c059d4324 | Classroom catalog import and UX lifecycle contract |

## Resolutions and behavior

- Merged app composition rather than replacing it with an old branch snapshot. Game, ClassroomCloud, portal, DuelClient, SoloStore and ModuleProgress remain the real controllers.
- Kept the new GeoMath header in every mode. Removed Duel's assumption that the old `.brand-blue` element exists; localized its accessible label and retained Duel-specific document titles.
- Kept entry guide/resume routing, real actor-scoped unfinished saves, discard confirmation and hash/Auth-callback boundaries. The skip link focuses/scrolls the current main area without changing `#main`, which is also the new Play route; its regression proves no unintended leave dialog.
- Retained the live server Duel clock, protocol 2 snapshots, operation retry, countdown, accepted-answer restoration, pending review and winner authority.
- Bound ModuleProgress to OfflineRuntime's owner, durable record callback and managed sync adapter. Completion passes the existing result ID once; classroom and Duel results are excluded by the existing offline capture contract.
- Duel header routes run through the existing leave/forget lifecycle before entering the selected destination. In particular Classes reaches the portal instead of stopping at Home.
- Classroom departure retains the existing immediate return to its room portal, and clears the pending entry destination so a later Home action cannot unexpectedly open Learn/Play.
- Standalone build includes entry CSS and calls the offline package builder for the website. Root owns final version labels, module pin and release outputs.
- Updated UX contract to retain both classroom lifecycle and entry-page behavior, with the offline ownership boundary explicit.

## Browser harness maintenance

Updated mode selection to the visible native radio cards; updated first-play guide and resume selectors to their new pages while retaining actual gameplay and recovery assertions. Active-play tutorials keep their original modal tests. Tests can direct their evidence outside historical receipt folders with `EASE_EVIDENCE_DIR`, `DUEL_UI_EVIDENCE_DIR`, `DUEL_V2_EVIDENCE_DIR` and `OFFLINE_EVIDENCE_DIR`. Duel full-page captures now scroll to the top first, avoiding an off-viewport fixed skip-link artifact in Chromium full-page screenshots.

Changed test sources: `solo-ui.test.mjs`, `ease-browser-helpers.mjs`, `duel-ui-refresh.browser.mjs`, `duel-v2.browser.mjs`, `usability.browser.mjs`, `offline.browser.mjs`, `solo.browser.mjs`.

## Verification completed

- Syntax checks of app/catalog/builder and all adapted browser scripts: PASS.
- Focused initial node suite, concurrency 1: 39 passed, 0 failed (`solo-ui`, `entry-scenes`, `i18n`, `offline-runtime`, `duel-client`, `duel-protocol`).
- Final solo UI regression suite, concurrency 1: 13 passed, 0 failed, including first-play gating, actor isolation, entry cancellation/resume/help, Duel to Classes, real signed-in 10/10 result queued once, no resume for finished saves, classroom pending-route cleanup and keyboard skip-link routing.
- Focused Duel UI browser run against real protocol 2 Edge + isolated PGlite: 5 grouped checks PASS, including 18 BM/English × theme × text layouts, pending double-click protection, real PIN errors/expiry, copy fallback, ready/countdown, accepted R1 retry/R2 reload, durable review, server draw and local review with forgotten Duel token. No runtime errors; external origins blocked. Receipt: `/workspace/scratch/8354d9072f14/ui-browser-evidence/ui-browser-results.json`.

Root's combined Digital 2.9.0 / module 1.6.1 package under final browser verification (before the planned EOF-only rebuild):

| Artifact | SHA-256 |
|---|---|
| artifacts/GeoDecoder_Digital_V2.html (7,674,373 bytes) | 207aeb396faaa863671487780a3273bc259a0dd6758ff17a0742726ec689a7bb |
| dist/app.bundle.js | 85fc49967704396d5336f79b3569bdeb6b17327a2661f62c445c5360102e5e8c |
| artifacts/site-index.html and artifacts/pwa/index.html | 5135faf64e612993c4e9a82d5454726943d1221d993c8e803239e4ee5e686627 |

The first full combined offline run passed 7/7 on the preceding 833cc1dad561d5d7706a41091814ae6332774e9864db7d583695ff722708c816 artifact. Receipt: `/workspace/scratch/8354d9072f14/ui-offline-evidence/browser-results.json`. Final browser runs on the 207aeb… package:

- Offline browser: 7/7 PASS, receipt `/workspace/scratch/8354d9072f14/ui-offline-final/browser-results.json`.
- Solo browser: all seven distinct cases PASS across the initial run (BM desktop/mobile and English desktop) and isolated retry (English mobile, offline standalone, denied storage and damaged-save cancellation). Cold R1/R2, exact visual order/tone, hint, wrong/skip restoration, review lock and paused closed time remain asserted.
- Usability quiz-review: PASS, including real 7/10 score, collapsed/expanded analysis, original wrong/skipped subset, translated 320 px/150% views and unchanged original quiz record.
- Focused usability navigation retry: 1/1 PASS. It verifies the first-play page gate/back/start, actual touch mode selection, keyboard skip-link focus without routing, Settings/help solo pause, selection preservation, R1/R2 scoring and reload resume. Evidence: `/workspace/scratch/8354d9072f14/ui-usability-nav-retry`.

A first-run coordinate click in English-mobile solo and a practice-radio check in navigation each timed out after the target was already visible/enabled/stable and scrolled into view. No runtime error was reported. Solo passed in isolation with original assertions; navigation passed using native touch activation for its emulated touch device. No product change was required for these timeouts. Failed attempts and scopes remain recorded in `/workspace/scratch/8354d9072f14/ui-browser-attempts.json` and the first navigation failure screenshot is preserved.

Root subsequently performed an EOF-only rebuild: final standalone is **7,674,372 bytes**, SHA-256 `36cad7cd883f92478dff6fa623341140122f7691da7733162338bd5b0cfae924`. Runtime bundle SHA-256 remains `85fc49967704396d5336f79b3569bdeb6b17327a2661f62c445c5360102e5e8c`; site/PWA SHA-256 is `ae95868f160c5865ab4dafa6af764454413a963f963c28ee9139be2aa762c77b`. Root owns final PWA verification of the one-byte packaging change. No unresolved product issue remains in this UI scope. All browser processes started by this agent have exited.

## Limits

These tests are local Chromium/DOM and disposable SQL emulation. They do not establish hosted Auth delivery, backend deployment, Pages publication, physical device behavior or independent PostgreSQL contention. Root owns the actual release commit, version report, publication and final remote verification.
