# Central design-system verification — 26 October 2026

Branch: `digitalized-ux-design-system`.
Base: `main-digitalized` **790d989d666e64f3beabb507cd4140b832696367**.
Base versions: Digital **v2.6.0**, module **v1.5.0**, firmware **v1.1.3**.
Firmware main inspected at **a059979d97926b82cafd4aa5cf3fe59da04a55bb**.
The output branch was absent at initial remote inspection. Work used an isolated
worktree and two bounded helpers. No other branch or public repository was updated.
This foundation remains a branch candidate; release numbering is left to integration.

## Results

| Verification | Actual result |
|---|---|
| Existing baseline `npm test` | 248 passed, 0 failed |
| Final application `npm test` | **252 passed, 0 failed** |
| Module `npm test` | **244 passed, 0 failed** |
| Application `npm run build` | PASS: offline aliases + website + reference |
| Module `npm run build` / `npm run check` | PASS: self-contained HTML, generated tokens, syntax, contrast |
| `npm run design:check` / `npm run check` | PASS: exact CSS/JS adapters, protected module pin, aliases, ARIA, source bank |
| `npm run prepare:pages` | Local artifact preparation only; no public deployment |
| `npm run test:design` in real headless Chromium | **26 scenarios passed**: 15 product + 11 reference |
| Root premium static audit, strict | **0 errors, 0 warnings** |
| Official `designmd lint DESIGN.md` | **0 errors**, 6 orphan-document-token warnings |
| Official `designmd lint module/DESIGN.md` | **0 errors**, 5 orphan-document-token warnings |
| `python tools/check_version.py` | PASS: firmware remains v1.1.3 |

The lint warnings concern frontmatter references from documentation components;
runtime values are checked independently by the exact generator and contrast tests.
Read [app unit evidence](design-system-evidence/app-unit-tests.txt),
[module unit evidence](design-system-evidence/module-unit-tests.txt),
[product browser cases](design-system-evidence/product-browser-results.json) and
[reference browser cases](design-system-evidence/reference-browser-results.json).

## Browser coverage

Home, sign in, signup and forgot-password forms; profile, security and reset with
controlled account responses; shared Settings and iframe preferences; source/pinned
learning presentation; downloaded HTML offline. BM/English, light/dark, 320px at
150% text, both contrast modes in the reference and system reduced motion.

Label activation, visible keyboard focus, native select popup/keyboard, checkbox,
switch, range, tabs, selected/disabled/busy/error states, stable pending button size,
native modal background isolation, Tab/Shift+Tab, Escape and focus restoration were
exercised. The reference generated no network requests or storage access. Changing
module preferences preserved an entered 7.5cm side and its 337.5cm² result.

An exhaustive pass through all 15 English questions found a long exact formula
that overflowed at 320px/150%. Its new bounded, focusable presentation container
scrolls with arrow keys; the formula, formatter, speech text and scoring remain
unchanged. All 15 open hints/corrections and the final result now fit the page.

Screenshots are in [design-system-evidence](design-system-evidence/). Baseline Home,
signin and Settings were captured before foundation edits. The before/after formula
pair records the additional responsive correction. The self-contained review page
is [GeoDecoder_Design_System.html](design-system-evidence/GeoDecoder_Design_System.html).

## Actual limitations

- Browser coverage uses Linux headless Chromium and simulated phone viewports.
  Physical touch devices, Safari/Firefox and screen-reader speech were not tested.
- Account profile/security/reset cases use the actual portal with controlled
  responses. No production Auth mutation, SMTP email or database operation ran.
- The module premium static auditor reports **86 pre-existing actionless-button
  findings** because it recognizes inline HTML handlers rather than this module's
  external ID/event bindings. The same 86 findings exist at the exact base; its
  two textarea findings were repaired. The baseline audit had 88 findings and the
  final has 86. These findings are retained in the evidence, not relabelled PASS;
  module runtime tests/checks pass independently.
- Feature-specific scanner illustration/geometry styling remains with its feature
  owner; central shared recipes and generated tokens own the reusable foundation.
  No new motion/audio assets are included; the next branch consumes the documented
  timing/easing and preference owners.
- The original vendored v1.5.0 module remains byte-identical. The portal applies
  generated presentation CSS at its existing frame boundary; publishing changed
  educational module source requires the normal explicit pin/integration process.

## Reproduction and handoff

From `digital/`: `npm test`, `npm run build`, `npm run design:check`,
`npm run prepare:pages`, `npm run check`, `npm run test:design`.
From `digital/module/`: `npm run build`, `npm test`, `npm run check`.
The browser runner accepts `PLAYWRIGHT_MODULE_PATH` and `PLAYWRIGHT_CHROMIUM_PATH`
when Playwright/Chromium are not installed at their standard local paths. No new
production dependency is required.

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the component API, ownership map,
module-layout adoption, motion/audio adoption and rollback guidance. Use the final
remote commit SHA in the completion handoff; the base SHA above stays immutable.

## Concurrent integration update

The final remote recheck found `main-digitalized` advanced independently to
**2e5c70cf4176f99a82376697081c0b6ed4b1368a** (Digital v2.7 publication record).
This branch deliberately retains the tested v2.6 parent above; it does not rewrite
that newer main or import unrelated backend/utility work. Integrate by a real merge
and resolve composition/build/version conflicts against the latest main. Do not
copy these older app/portal files wholesale over the v2.7 integration.
