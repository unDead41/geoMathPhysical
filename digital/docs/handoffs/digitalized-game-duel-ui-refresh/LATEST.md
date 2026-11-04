# GeoMath — Duel UI/UX handoff

Branch: `digitalized-game-duel-ui-refresh` in `unDead41/geodecoder`.
Digital source version: **2.8.0**; module **1.6.0**. This is an unpublished UI
candidate. The integration/release owner assigns a release version later.

## Source provenance

| Reference | Full SHA |
|---|---|
| Remote `main-digitalized` base | `391df985eea4fee15d9859e678068b1a3f613cba` |
| Concept `ui/ux-redesign-concept` | `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd` |
| Firmware `main` observed | `25836eb1a6f24459aace8a3980ae880a13e3b488` |

The final tested implementation SHA is recorded in the receipt update below
after the remote commit is created. A follow-up documentation commit records
that SHA; a document cannot contain its own commit hash.

The private repository was read through the GitHub connection into an isolated
linked worktree: `/workspace/scratch/b03317301a24/duel-ui-refresh`. The original
base commit and retrieved blobs were reconstructed and verified by Git SHA.
The upload uses the original base tree, preserving all untouched paths.
The work branch did not exist at the initial remote read. No concept branch
merge, force push, source replacement from an older branch or history rewrite.

## Implemented screens

| Screen | Result | Actual code screenshot |
|---|---|---|
| 10 — Create/join | Two action cards, one labelled six-digit input, inline errors and pending/retry | [Desktop](screenshots/10-entry-desktop.png), [390px English/dark/150%](screenshots/10-entry-mobile-en-dark-150.png) |
| 11 — Lobby | Server PIN/copy, two slots, empty/ready/away states, real countdown | [Desktop](screenshots/11-lobby-desktop.png), [390px English/dark/150%](screenshots/11-lobby-mobile-en-dark-150.png) |
| 12 — Play | Opponent/score/time/question board, R1/R2, five solids and five nets | [Desktop](screenshots/12-duel-desktop.png), [390px English/dark/150%](screenshots/12-duel-mobile-en-dark-150.png) |
| 13 — Result | Actual verdict, both scores and server elapsed times, review and supported actions | [Winner](screenshots/13-winner-desktop.png), [Draw](screenshots/13-draw-desktop.png), [Forfeit](screenshots/13-forfeit-desktop.png), [390px draw](screenshots/13-draw-mobile-en-dark-150.png) |

[Waiting result](screenshots/13-waiting-result-desktop.png) shows own completion
while the opponent still plays. The heading becomes Duel complete only after
the server finalizes the room; no winner is declared early.

Additional screenshots capture pending create, invalid/expired PIN, waiting for
a friend, countdown, offline R1 and restored answer review. These are real
screenshots from disposable localhost matches, not concept raster mockups.
PINs, names and results in them are fixtures only.

## Files and integration hooks

- `digital/dist/index.html`: Duel entry, lobby and live-board regions only.
- `digital/dist/app.mjs`: Duel player/result presentation, busy/error semantics,
  snapshot-derived question progress and minimal existing-shell hooks. The
  existing brand/title becomes GeoMath in Duel and restores its original value
  outside Duel. Shared game/result roots gain `data-mode` for scoped styling.
- `digital/dist/i18n.mjs`: Duel-only BM/English copy and titles.
- `digital/dist/style.css`: marked `UX-REDESIGN:DUEL` block; every shared
  workbench/result selector requires `data-mode="duel"`. Existing token owner,
  foundation, theme/preferences, geometry palettes and renderers are consumed.
- `digital/tests/duel-v2.browser.mjs`: checks live question progress against the
  accepted snapshot on each question in the maintained full-match suite.
- `digital/tests/duel-ui-refresh.browser.mjs`: dedicated two-context UI/recovery
  and responsive suite, including screenshots and structured results.
- `digital/tests/usability.browser.mjs`: minimal verification-only fixture repair.
  The practice→quiz regression explicitly chooses Start new and confirms discarding
  its abandoned practice checkpoint. Its old direct-start expectation conflicted
  with the already accepted solo-save flow. No solo-save product behavior changes.
- This handoff directory contains the plan, screenshots, source hashes and
  verification receipts. No backend, module, bridge or token source is changed.

This branch delivers source and review evidence. Generated parent HTML aliases,
root publication HTML, bundle and shared design-reference HTML are built and
checked locally, but deliberately left to the integrator to regenerate once
all UI/module source branches are combined. No old generated HTML should be
selected as a conflict resolution. Run the existing build/prepare/check after
combining source changes. `prepare:pages` below prepares local files only.

## Preserved domain contract

Protocol **2**, transport/token and sequence/idempotency, fail-closed version
gate, current-question-only projection and durable review are unchanged.
Scoring and time still come from the server; the UI does not evaluate scans.
Two players receive ten common questions. R1 solid → R2 net, one attempt,
one correct pair = +1; all five choices remain independently shuffled/coloured.
Hints, correction and local missed-question practice use existing controllers.
Lobby PIN remains 10 minutes; match 15 minutes; the clock continues in menus,
hidden tabs and disconnection. Accepted feedback keeps 900/1800ms server pacing.

The concept's return-to-lobby/rematch example is implemented as the supported
**New duel** action, which leaves the completed session and opens entry for a
fresh PIN. No same-room rematch, automatic report sending or fake navigation.
The single PIN field deliberately supports pasting, numeric keyboards and
screen-reader labelling without six competing focus stops.

## Verification

The final sequential run and exact exit codes are in
[verification-results.json](verification-results.json). Commands run from
`digital/`; logs share this directory:

```sh
npm run design:check
npm test
npm run test:duel
node tests/duel-ui-refresh.browser.mjs
npm run build
npm run prepare:pages
npm run check
npm run test:design
npm run test:practice
```

Browser environment variables used for this executor:

```sh
PLAYWRIGHT_MODULE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES/playwright"
PLAYWRIGHT_CHROMIUM_PATH=/workspace/scratch/b03317301a24/browser-runtime/chromium
```

The dedicated suite covers 18 entry locale/theme/text layouts (BM/English,
light/dark/system, 100/125/150%), strong contrast, keyboard/label activation,
PIN sanitation and actual server PIN rejection/expiry, duplicate create, stable
pending-button geometry, copy/fallback, waiting slots, ready/countdown, all ten
cards, selection/order/hint retention, offline R1 retry, R2 reload, durable review,
server-determined draw and transition to local missed-question practice.
The maintained Duel suite covers full 10–9 completion, escaped aliases, third
player rejection, lost/delayed ACKs, offline R2, R1/R2/review refresh, fresh-PIN
replay, forfeit, deadline and late ACK after the deadline.
Shared design/practice suites verify unaffected solo/module/account controls.

Strict UI audit: see [premium-audit.json](premium-audit.json). DESIGN.md lint
has zero errors; six pre-existing documentation-only orphan-token warnings
remain, since runtime tokens are owned by `design-system/tokens.mjs`.
The existing design document and token system were not redefined for this UI.

Original concept assets were verified before implementation:

| Asset | SHA-256 |
|---|---|
| `03-scoreboard-and-duel.png` | `df47c25729e032b5ce3b30773f963d50af0b068a6d86509e0911bf92edc2e07a` |
| `04-account-and-duel-result.png` | `5dc4d4ee4a4fd370c7a7b12535f5a0681ec60519a82a5f371bb2de94df14d147` |

## Limits and next integration step

PGlite runs the actual Edge handler and SQL in isolation but serializes requests;
this is not proof of multi-connection PostgreSQL contention. Browser offline,
touch and reduced motion are emulated. Physical phones, assistive technologies
and school networks were not tested. Initial concurrent browser runs timed out
under executor load; the final receipt records a sequential rerun. The practice
runner initially stopped at the legitimate solo resume dialog; its corrected
fixture now exercises the two explicit Start new/discard actions. Earlier failed
attempts remain identified in the verification receipt.

No production match, account, database migration, Edge deployment, Auth/SMTP
change or Pages/Sites publication was performed. No push to `main`,
`main-digitalized`, `sharing`, another work branch or the public mirror.
Integrator: apply only these source regions to the current integration, retain
other chats' shared-file changes, then regenerate combined artifacts and rerun
the checks. Publication needs a separate instruction.

### Final checked results

| Check | Result |
|---|---|
| Unit suite | 350/350 passed |
| Maintained Duel suite | 15 checks passed, including full two-player match and waiting-result status |
| Additional Duel UI | 5 groups passed; 18 entry layout combinations |
| Shared design browser | 15 product cases + 11 reference scenarios passed |
| Practice browser | 2/2 passed; all 15 IDs, 90 bilingual rich-text views, offline and mixed outcomes |
| Design check, build, local prepare, check | All exit 0 |
| Strict UI audit | 0 findings |
| DESIGN.md lint | 0 errors; 6 pre-existing warnings |

The verification receipt retains the initial practice failure and describes the
separation of an aborted older runner's NUL-separated log tail. The final
successful practice log and its exit-0 receipt agree.
