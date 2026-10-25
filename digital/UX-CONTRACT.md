# GeoDecoder Digital V1 UX contract

Business sources: user request (25 October 2026), docs/SOURCE.md and the referenced bank/flow snapshot. User requested name, category, class, drag to R1/R2 and ten-mark high score. Digital game is independent from the firmware five-question round.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | registration markup + validatePlayer in core.mjs | user request | new player | core tests, browser empty/valid submit |
| Scrollbar | style.css global baseline | DESIGN.md | native forced colours | narrow screen inspection |
| Toast | app.mjs announce() and inline #game-status | this contract | info/success/error | browser wrong/stage/skip |
| Dialog | app.mjs openDialog/closeDialog, native dialog | this contract | help/pause/scores/leave/erase | Escape/focus/browser |
| Direct manipulation | app.mjs Pointer Events controller | user request | pointer/touch/tap/keyboard | browser drag + keyboard |
| CRUD | storage.mjs score repository | local-only decision | save/list/export/erase | storage tests, browser persistence |

## Shared behavior
Entry validates trimmed name and class, category required. No account created. All five solids and five net cards are available every question; each shelf shuffled independently. Click/tap/Enter selects; click/Enter on the active scanner scans; pointer dragging drops directly. Incorrect type/shape/stage does not progress or award a mark. R1 correct locks R1 green; matching R2 gives +1 exactly once. Wrong attempts allow retry and increase mistakes. Hint toggles and counts once per question, no mark penalty. Skip forfeits the current question, +0. Answers/hints/skips disabled throughout feedback.

Round: ten unique question IDs, two per shape, max 10 points. Stopwatch runs during decisions and wrong feedback; paused for success/skip, paused dialogs, hidden tabs and results. Backgrounding pauses with an explicit resume. Reload starts entry; incomplete rounds do not enter high scores. Completed result written once by unique session ID. Ranking: score descending, mistakes ascending, elapsed milliseconds ascending, completion date ascending. Display and explain this order. All score rows visible at most 50; stored and displayed results scope: same browser only. No cross-device claims.

Storage failure leaves play working with a persistent message and session-only scores. Malformed/incompatible records are ignored rather than crashing. Merge by round ID and re-read on save; refresh boards on storage events. Erasing all scores uses an explicit app dialog; empty table has a start instruction. CSV quote names, neutralize spreadsheet formulas and handle Unicode BOM. No network calls or analytics with identity. No profile prefill persisted by app.

Dialogs remember trigger focus, use native showModal inertness and Escape, pause active play and restore after close. Leave requires confirmation; default focus on continue. Keyboard arrows not overridden. Reduced motion removes decorative motion/flashing. Labels + text accompany colour. Non-drag equivalent is always printed. At narrow widths use document scrolling and keep every action available.
