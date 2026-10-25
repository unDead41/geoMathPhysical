# GeoDecoder Digital V1 UX contract

Business sources: user request (25 October 2026), docs/SOURCE.md and docs/UPGRADE_V1_1.md. User requested name, category, class, drag to R1/R2 and ten-mark high score, followed by single-attempt questions, animated corrections, changing colours/order and final learning analytics. Digital game is independent from the firmware five-question round.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | registration markup + validatePlayer in core.mjs | user request | new player | core tests, browser empty/valid submit |
| Scrollbar | style.css global baseline | DESIGN.md | native forced colours | narrow screen inspection |
| Toast | app.mjs announce() and inline #game-status | this contract | info/success/error | browser wrong/stage/skip |
| Dialog | app.mjs openDialog/closeDialog, native dialog | this contract | help/pause/scores/leave/erase | Escape/focus/browser |
| Direct manipulation | app.mjs Pointer Events controller | user request | pointer/touch/tap/keyboard | browser drag + keyboard |
| CRUD | storage.mjs score repository | local-only decision | save/list/export/erase | storage tests, browser persistence |
| Duel | duel.mjs + geodecoder-duel Edge/RPC | docs/DUEL.md | create/join/ready/play/result/resume | two real browser contexts, SQL/Edge tests |

## Shared behavior

Reinforcement practice (26 October 2026): entry mode selection defaults to quiz
(10 unique IDs, two per shape); practice uses all 15 unique IDs, three per shape.
Both use the same single-attempt rules and feedback below. Counts, score totals,
results and analysis use the session's actual total. Practice results remain in
the current result screen and do not enter the 10-question quiz leaderboard.
Replay preserves the current mode. Language changes preserve mode and game state.
See `docs/PRACTICE.md` for the current mode contract and verification.
Entry validates trimmed name and class, category required. No account created. All five solids and five net cards are available every question; each shelf independently deranged so every shape changes position. Colours change per shape each question, independently across solid/net shelves. Click/tap/Enter selects; click/Enter on the active scanner scans; pointer dragging drops directly. Incorrect type/target is routing feedback and consumes no attempt. R1 correct locks R1 green; matching R2 gives +1 exactly once. A wrong shape at either stage ends the only attempt with +0. Wrong/skipped answers show an animated correct pair plus explanation; inputs/hints/skips remain blocked, time freezes, and Continue becomes available after 1800ms. Success advances after 900ms. Hint counts once per question without mark penalty. No retry on a settled question.

Quiz round: ten unique question IDs, two per shape, max 10 points. Practice round: all fifteen unique IDs, three per shape, max 15 points. Stopwatch runs during decisions; paused for success, correction/skip review, dialogs, hidden tabs and results. Backgrounding pauses with an explicit resume. Reload starts entry; incomplete rounds do not enter high scores. Completed quiz result written once by unique session ID. Practice results stay in the current result screen and are not saved to the quiz board. Ranking: score descending, mistakes ascending, elapsed milliseconds ascending, completion date ascending. Display and explain this order. Each scoreboard contains at most 50 records; stored and displayed results scope: same browser only. No cross-device claims.

Storage failure leaves play working with a persistent message and session-only scores. Malformed/incompatible records are ignored rather than crashing. Merge by round ID and re-read on save; refresh boards on storage events. The single-attempt board uses its own storage key and ruleset, retains per-question results, and accepts future semantic app versions with the same ruleset. Original retry scores remain under the old key and are readable in a separately labelled disclosure. They never enter the new ranking. Erasing all scores confirms and removes both groups. CSV exports the current board, quotes names, neutralizes spreadsheet formulas and handles Unicode BOM. No network calls or identity-bearing remote analytics. No profile prefill persisted by app.

Final learning analysis: two questions per shape in quiz, three in practice; correctness, wrong, skipped, hints, real stage attempts, and topic categories derived from actual prompt content. Unreached R2 is not a wrong R2; no attempts means no percentage. Hint use does not make an answer wrong. Explain weakness only from actual wrong answers; skipped-only rounds prompt the player to attempt questions. Show denominators, suggested practice and all question/choice/correct-answer records (10 in quiz, 15 in practice).

Dialogs remember trigger focus, use native showModal inertness and Escape, pause active play and restore after close. Leave requires confirmation; default focus on continue. Keyboard arrows not overridden. Reduced motion removes decorative motion/flashing. Labels + text accompany colour. Non-drag equivalent is always printed. At narrow widths use document scrolling and keep every action available.

## Duel exceptions (v1.5.0)

The solo clock, reload, persistence and no-network rules above apply to quiz and
practice. Duel shares the same rendering, question bank, single-attempt R1→R2
rules and corrections, with these explicit differences:

- Two players join by a generated six-digit PIN. Both ready starts a common
  three-second server countdown. The server chooses ten identical question IDs
  in one order, two per shape; each player controls their language independently.
- The server validates scans, score, hints, sequence and question stage. A retry
  repeats the same operation sequence. Delayed acknowledgement must update the
  accepted action even when a dialog is open, preserving dialog state.
- The server wall clock continues during corrections, menus, hidden tabs and
  disconnection. UI interaction can pause behind a dialog; match time cannot.
  Higher score wins, then earlier server finish time. Match deadline: 15 minutes.
- A sessionStorage token allows reload to recover the same room, accepted R1,
  answers and score. Quiz/practice still restart on reload. Denied sessionStorage
  allows the current Duel to work in memory, without promising reload recovery.
- Alias and gameplay state go to the Duel service. Class/category remain local.
  No Duel result enters the quiz board or its CSV. Opening quiz/practice sends
  no Duel requests. Lobbies support two players and PINs expire after ten minutes.
- Leaving an incomplete match forfeits. Leaving a waiting lobby cancels it.
  Leaving after completing all questions cannot forfeit. Forfeit/deadline settle
  remaining answers as skipped so final analysis still contains ten records.

The full API, deployed boundaries, evidence and retention limits are in
`docs/DUEL.md`; this does not alter the separate classroom/account contract.
