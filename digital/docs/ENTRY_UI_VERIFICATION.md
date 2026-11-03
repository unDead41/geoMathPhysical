# GeoMath entry preview verification

Date: 4 November 2026 (Asia/Kuala_Lumpur).
Source base: `unDead41/geodecoder@391df985eea4fee15d9859e678068b1a3f613cba`.
Work branch: `digitalized-ux-ui-upgrade`. Digital base remains v2.8.0;
this is a UI preview, not a new integration release.

## Automated checks

- Full existing application suite: `npm test`, **350 passed, 0 failed**.
- Final focused entry/settings suite after new cases:
  `node --test tests/solo-ui.test.mjs tests/game-settings-integration.test.mjs`,
  **11 passed, 0 failed**. Includes three additional cases for the first-play
  page/demo, native mode cards/empty resume, and header language/theme ownership.
- `npm run build`, `npm run prepare:pages`, `npm run check` and
  `npm run design:check`: passed. Preparation here writes local artifacts only;
  it does not publish or update a Git branch.
- Static UI audit: strict mode, 0 errors, 0 warnings.
- DESIGN.md lint: 0 errors; 6 existing optional-token warnings.
- Vendored module v1.6.0 and both complete original audio tracks retain their
  original Git blob hashes. Downloaded HTML aliases are regenerated locally.

## Real browser checks

Used managed Chrome against the separate local preview:

- Home, mode selection, guide and resume render. Shared navigation marks the
  active section. Name validation associates the error with the field.
- First-play guide appears before the clock starts. Its slider can seek to
  00:24; replay/pause and changing pages do not mutate a game.
- A correct pyramid R1/R2 pair earned exactly +1. Leaving used the existing
  confirmation. Resume displayed the real Ijamm session, 1/10 and save date;
  continuing restored question 2 and score 1.
- 390px and 320px frames exercised actual narrow browser viewports. Mode cards
  and guide steps stack with no horizontal page overflow.
- BM/English and light/dark work through the existing owners. Settings reflected
  the header theme choice. English/dark at text150 and reduced motion remained
  usable at 390px without horizontal overflow.
- Home evidence: `entry-ui-evidence/home-desktop.jpg`.

Existing Playwright browser runners were not executed in this managed
environment; changed-flow browser checks used the supported browser interface.
No hosted Auth email delivery, live Duel/backend, classroom, physical ESP32
or hardware verification is claimed. Those services were not changed.

## Handoff and publication boundary

Repeated markup is centralized in entry-components.mjs, layout in entry.css,
copy in entry-copy.mjs and bindings in entry-ui.mjs. Shared tokens, preferences,
Game, account guards and SoloStore retain their canonical owners.

Only source/tests/docs are committed to the UI work branch. Generated standalone
release artifacts remain an integration build step; run the documented build and
checks before any later integration. The separate private review Site packages
the tested external bundle, CSS and original audio assets. Its source/version
provides the built preview without publishing to existing GitHub Pages.

Do not merge/push `main` or `main-digitalized`, or change existing Pages,
unless Ijamm provides a later instruction. No branch is force-pushed.
