# GeoDecoder Digital V2 UX contract

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

## Home and guest navigation

Home presents the geometry illustration and two actions: account/classroom access and **Play as a Guest**. It does not display the local player form. Guest opens a separate screen with name, category and class fields, without account credentials. Starting this local practice path requires no Auth session or cloud initialization. Back returns to Home and focuses the Guest action. Leaving an unfinished practice round keeps the existing confirmation. Results link back to Home; replay preserves the current practice player. Portal exit returns to Home. Both themes apply to Home and Guest.

## Practice behavior
Entry validates trimmed name and class, category required. Practice creates no account. All five solids and five net cards are available every question; each shelf independently deranged so every shape changes position. Colours change per shape each question, independently across solid/net shelves. Click/tap/Enter selects; click/Enter on the active scanner scans; pointer dragging drops directly. Incorrect type/target is routing feedback and consumes no attempt. R1 correct locks R1 green; matching R2 gives +1 exactly once. A wrong shape at either stage ends the only attempt with +0. Wrong/skipped answers show an animated correct pair plus explanation; inputs/hints/skips remain blocked, time freezes, and Continue becomes available after 1800ms. Success advances after 900ms. Hint counts once per question without mark penalty. No retry on a settled question.

Round: ten unique question IDs, two per shape, max 10 points. Stopwatch runs during decisions; paused for success, correction/skip review, dialogs, hidden tabs and results. Backgrounding pauses with an explicit resume. Reload starts entry; incomplete rounds do not enter high scores. Completed result written once by unique session ID. Ranking: score descending, mistakes ascending, elapsed milliseconds ascending, completion date ascending. Display and explain this order. Each scoreboard contains at most 50 records; stored and displayed results scope: same browser only. No cross-device claims.

Storage failure leaves play working with a persistent message and session-only scores. Malformed/incompatible records are ignored rather than crashing. Merge by round ID and re-read on save; refresh boards on storage events. The single-attempt board uses its own storage key and ruleset, retains per-question results, and accepts future semantic app versions with the same ruleset. Original retry scores remain under the old key and are readable in a separately labelled disclosure. They never enter the new ranking. Erasing all scores confirms and removes both groups. CSV exports the current board, quotes names, neutralizes spreadsheet formulas and handles Unicode BOM. Practice does not send results to the server. No profile prefill persisted by app.

Final learning analysis: two questions per shape; correctness, wrong, skipped, hints, real stage attempts, and topic categories derived from actual prompt content. Unreached R2 is not a wrong R2; no attempts means no percentage. Hint use does not make an answer wrong. Explain weakness only from actual wrong answers; skipped-only rounds prompt the player to attempt questions. Show denominators, suggested practice and all ten question/choice/correct-answer records.

Dialogs remember trigger focus, use native showModal inertness and Escape, pause active play and restore after close. Leave requires confirmation; default focus on continue. Keyboard arrows not overridden. Reduced motion removes decorative motion/flashing. Labels + text accompany colour. Non-drag equivalent is always printed. At narrow widths use document scrolling and keep every action available.

## Account and classroom behavior

The account entry is distinct from the practice form. Teacher/student roles are server provisioned and immutable. Username/password login requires no personal email. A one-time recovery code remains visible until acknowledged. No credentials or recovery codes are logged. Display names and usernames are escaped before HTML rendering. Session changes clear account/room caches; old-account and old-room responses cannot overwrite current cached context.

Teachers create only their own classes and rooms, see roster presence, and invite a registered student by exact username. The student accepts invitations. A six-digit class PIN enrolls in the class; a room PIN enrolls in its class and room. Codes are server generated, unique, expire after 24 hours and can be regenerated even when no active code remains. Owners alone see PINs. Repeated invalid guesses are rate limited. Presence is an estimate based on a heartbeat within the last 45 seconds, not proof that the game tab has focus.

Room lifecycle is open → playing → closed. Joining during play is supported. There is one resumable attempt per student per room. The server owns the ten question IDs, scoring, progression and cumulative answering time. A pending action locks input; retry retains its UUID. Every returned state is authoritative. View epochs discard late responses after leaving/reopening a game, including the same attempt; background snapshots cannot navigate a newer screen. Restoring review/feedback/net/finished states renders the corresponding controls. Hint visibility resets per question and never reveals the next hint without server accounting.

The server timer continues during dialogs, UI pause, hidden tabs and disconnection; waiting and settled-answer review are excluded. Local UI time is an estimate between server snapshots. Classroom ranking is score descending, answering time ascending, username for deterministic ties. Waiting students have no fabricated zero-score rank; incomplete closed attempts retain partial marks. Complete attempts retain final results. Closing is confirmed inline and cannot be reversed. Room results never enter the local practice leaderboard.

The teacher board subscribes to authorized room_progress changes. Only a confirmed SUBSCRIBED status is labelled live; fallback refresh is 15 seconds. Student/dashboard polling is 15 seconds, heartbeat 20 seconds. Polls do not overlap or overwrite edited form drafts. Search/pagination bound roster/board display to 20 rows. Read failures preserve labelled last-known data with retry.

The theme button applies light/dark across entry, game, dialogs, results and portal, persists the preference and respects the system choice before an explicit selection. Both themes preserve visible text, focus outlines and non-colour state labels.
