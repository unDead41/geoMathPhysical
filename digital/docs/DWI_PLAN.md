# GeoDecoder Digital BM/BI implementation plan

User-approved specification: the nine requirements in the 25 October 2026 request; final branch is `digital-dwi`.

Base: `digitalize` at `cd47ebd7dbcbab709b9f61a2122f7492f2b74113`, digital v1.0.0.
Firmware reference: `main` at `a059979d97926b82cafd4aa5cf3fe59da04a55bb`, v1.1.3.
Work is in an independent pinned source checkout. GitHub connector handles the branch and publication against the original remote tree; the local bootstrap commit is not remote project history.

Architecture: keep `Game`, the source BM question bank and stored score IDs unchanged. Add local BM/English dictionaries and a presentation-only refresh. One movable language selector remains usable inside modal dialogs. Preserve formula symbols in both languages and explain them in that language.

## Task 1: translation data and preference

- [x] Write failing tests for locale persistence, denied storage, unsupported locales, question coverage/formula fidelity and translated CSV with stable category values.
- [x] Add `dist/i18n.mjs`: `createI18n(storage)`, `translate(language,key,params)`, `localizeQuestion(question,language)`, shape copy and bilingual messages.
- [x] Extend CSV presentation only; retain old v1.0.0 records and score key when advancing digital feature version to v1.1.0.
- [x] Run `npm test`; no changed score, round selection, timer or scan behavior.

## Task 2: presentation and standalone delivery

- [x] Add browser regressions for welcome, validation, R1/R2, wrong feedback, hint, pause/help/scores/erase/leave dialogs, result/review, reload and mobile overflow.
- [x] Translate static markup, dynamic app text, ARIA, SVG descriptions and exports. Separate question/result refresh from state changes and saving.
- [x] Add one locale selector and persist selection without restarting the round. Refresh open dialog content without pausing/resuming or resetting focus.
- [x] Extend standalone bundler/checker to include dictionaries and ship identical modular/generated sources.
- [x] Verify desktop and 390px phone layouts and fully local HTML without network requests.

## Task 3: references, contract and publication

- [x] Record KPM-authored DSKP/textbook references, page/standard locators, verified terms, mirror provenance and unresolved source limitations.
- [x] Document glossary, language API for the module branch, unavailable speech audio and retained baseline rules.
- [x] Store browser screenshots and test results; run version checker and all digital checks.
- [x] Review diff, verify protected refs, publish only `digital-dwi`, verify full remote commit SHA.

## Review focus

Changing language must not reset accepted/selected cards or reroll the order; hint use cannot increase; feedback deadlines and pause state cannot move; results cannot be saved twice; legacy scores and formula symbols must survive; no player text may enter HTML without escaping.
