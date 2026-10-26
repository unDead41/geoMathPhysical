# GeoDecoder Ease of Use Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Deliver the eight accepted usability improvements on digitalize-ease-of-use.

**Architecture:** Keep one Game engine and centralized BM/English dictionary.
Preserve the v2.3 classroom/Auth/music/module platform and merge the v1.5
language/rich-text/practice/Duel features into its frontend. Leave both backend
namespaces and the vendored module unchanged.

**Tech Stack:** Native JavaScript modules, CSS, SVG/MathML, esbuild, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-ease-of-use-design.md`.

## Global Constraints

- All publication only digitalize-ease-of-use; base adc51627eaaace5d9543c7e033d2994986c8715d.
- Candidate digital v2.4.0; firmware v1.1.3 unchanged.
- Preserve stable question IDs, mathematical content, answer rules and existing score keys.
- No database/Auth deployment, new privileged key, module-content change or Pages publication.
- BM default, English available without restarting any session.

## Review Focus

- A language/settings change while a network acknowledgement is pending must not lose or repeat the accepted answer.
- Guest simplification must keep old scored profiles/CSV valid and teacher/student class data intact.
- Wrong-question practice from a remote result must leave the original result unchanged and remain local.
- Closing/replaying the tutorial must not spend the first attempt or falsely pause server-owned time.
- Narrow screens, 125/150% text, dark mode and denied storage must keep navigation/actions usable.

### Task 1: Integrate platform and modes

**Files:** dist/app.mjs, core.mjs, storage.mjs, i18n.mjs, format.mjs, art.mjs,
duel.mjs, index.html; preserve cloud.mjs, portal.mjs and vendor.
**Interfaces:** Game(bank,player,now,rng,{mode,questionIds}); DuelClient existing API;
ClassroomCloud/createPortal retain their v2.3 signatures.

- [x] Run pinned v2.3 tests as baseline, then add integration assertions:
  `new Game(bank,p,0,Math.random,{mode:'practice'}).round.length === 15`;
  classroom state restoration and Duel accepted-R1 restoration keep stable IDs.
- [x] Observe missing integration failures before restoring/merging the existing implementation.
- [x] Integrate the single engine and rendering while retaining v2.3 room action pipeline.
- [x] Run unit suite; commit the integrated frontend with reference SHAs recorded.

### Task 2: Guest navigation, tutorial and settings

**Files:** dist/usability.mjs (new), app.mjs, index.html, style.css, i18n.mjs,
theme.mjs; tests/usability.test.mjs (new), tests/usability.browser.mjs (new).
**Interfaces:** validateGuest(input) -> validation result; loadPreferences(storage),
savePreferences(storage,prefs); tutorial state uses a versioned local preference.

- [x] Write/run failing assertions for guest name-only validity, malformed/denied
  preference storage defaults, and language change retaining typed form values.
- [x] Add guest profile validation, grouped Main modes, three-step tutorial and
  one Settings dialog for language/theme/music/sound/text size/motion.
- [x] Browser-check tutorial start/skip/reopen and no score/time reset on settings.
- [x] Run unit suite; commit this cohesive navigation change.

### Task 3: Active steps, result actions and helpful errors

**Files:** core.mjs, usability.mjs, app.mjs, index.html, style.css, i18n.mjs,
portal.mjs; tests/usability.test.mjs, tests/usability.browser.mjs.
**Interfaces:** reviewQuestionIds(result,bank) -> unique valid wrong/skipped IDs;
Game mode review accepts that nonempty 1..15 subset and never enters quiz storage.

- [x] Write/run failures: mixed result selects exact wrong/skipped IDs; all-correct
  selects none; invalid/duplicate IDs cannot enter a review round; review saving
  cannot change the original quiz score.
- [x] Implement prominent R1/R2 stage text, selected-card scan guidance, result
  disclosure/actions and review mode. Add plain localized status/error actions.
- [x] Verify keyboard/touch equivalent, wrong-R1/R2 corrections, review subset
  from solo and a remote result, and unchanged legacy score/CSV compatibility.
- [x] Run full unit suite and browser scenarios; commit.

### Task 4: Evidence and branch delivery

**Files:** digital README/UX/DESIGN docs, docs/EASE_OF_USE.md, evidence screenshots,
package.json/lock, generated bundle and canonical HTML artifacts.
**Interfaces:** Existing esbuild single-file/site-index outputs remain usable.

- [x] Run complete unit/build/check/version and source-diff checks.
- [x] Test BM/English at desktop/320/390 px, both themes and large text; verify
  guest, modes, tutorial, settings during play, result/review and offline play.
- [x] Run real two-player Duel after UI integration; inspect classroom UI with
  its existing test fixtures and distinguish fixture checks from live backend evidence.
- [x] Request one independent whole-branch review and fix material findings with regressions.
- [x] Build identical V1/V2 compatibility HTML, document evidence/limits, commit
  and push only digitalize-ease-of-use using actual remote base/tree and verify SHA.
