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

Home presents the geometry illustration, account/classroom access, **Play as a Guest**, and a secondary learning-module action. Guest opens a separate screen with name, category and class fields. Starting local practice requires no Auth session or cloud initialization. Back returns to Home and focuses the Guest action. Leaving an unfinished practice round keeps the existing confirmation. Results link back to Home; replay preserves the current practice player. Portal exit returns to Home. Both themes apply to Home and Guest.

## Practice behavior
Entry validates trimmed name and class, category required. Practice creates no account. All five solids and five net cards are available every question; each shelf independently deranged so every shape changes position. Colours change per shape each question, independently across solid/net shelves. Click/tap/Enter selects; click/Enter on the active scanner scans; pointer dragging drops directly. Incorrect type/target is routing feedback and consumes no attempt. R1 correct locks R1 green; matching R2 gives +1 exactly once. A wrong shape at either stage ends the only attempt with +0. Wrong/skipped answers show an animated correct pair plus explanation; inputs/hints/skips remain blocked, time freezes, and Continue becomes available after 1800ms. Success advances after 900ms. Hint counts once per question without mark penalty. No retry on a settled question.

Round: ten unique question IDs, two per shape, max 10 points. Stopwatch runs during decisions; paused for success, correction/skip review, dialogs, hidden tabs and results. Backgrounding pauses with an explicit resume. Reload starts entry; incomplete rounds do not enter high scores. Completed result written once by unique session ID. Ranking: score descending, mistakes ascending, elapsed milliseconds ascending, completion date ascending. Display and explain this order. Each scoreboard contains at most 50 records; stored and displayed results scope: same browser only. No cross-device claims.

Storage failure leaves play working with a persistent message and session-only scores. Malformed/incompatible records are ignored rather than crashing. Merge by round ID and re-read on save; refresh boards on storage events. The single-attempt board uses its own storage key and ruleset, retains per-question results, and accepts future semantic app versions with the same ruleset. Original retry scores remain under the old key and are readable in a separately labelled disclosure. They never enter the new ranking. Erasing all scores confirms and removes both groups. CSV exports the current board, quotes names, neutralizes spreadsheet formulas and handles Unicode BOM. Practice does not send results to the server. No profile prefill persisted by app.

Final learning analysis: two questions per shape; correctness, wrong, skipped, hints, real stage attempts, and topic categories derived from actual prompt content. Unreached R2 is not a wrong R2; no attempts means no percentage. Hint use does not make an answer wrong. Explain weakness only from actual wrong answers; skipped-only rounds prompt the player to attempt questions. Show denominators, suggested practice and all ten question/choice/correct-answer records.

Dialogs remember trigger focus, use native showModal inertness and Escape, pause active play and restore after close. Leave requires confirmation; default focus on continue. Keyboard arrows not overridden. Reduced motion removes decorative motion/flashing. Labels + text accompany colour. Non-drag equivalent is always printed. At narrow widths use document scrolling and keep every action available.

## Account and classroom behavior

The account entry is distinct from practice. Signup requires email, username, display name, password and teacher/student role; Auth verifies the email before login. A scoped Auth insert trigger validates and copies the initial role into an immutable private profile. Later metadata edits cannot change authorization. Login accepts email or username. Forgotten password requests an email link; reset takes priority over account dashboards only after an SDK-validated recovery session. Two matching 10–128-character passwords are required; successful reset signs out globally. Invalid/expired links offer a new request. Resend has a 60-second UI cooldown and provider errors remain visible. Request success uses generic copy and does not assert inbox delivery. Public delivery depends on configured SMTP and redirect URLs. Legacy username-only accounts retain secondary code recovery; email accounts cannot use legacy codes. No credentials or recovery codes are logged. Names are escaped. Session changes clear account/room caches; stale responses cannot overwrite current context. Recovery screens stop dashboard polling.

## Music and learning module

One looping background Audio element plays the supplied rest-site track on Home, Guest, accounts and results, and the supplied map track during games and the module. Initial playback waits for a trusted user gesture. Track changes pause the old source before playing the new one. A dedicated, labelled header toggle persists the preference; game sound effects are independent. Hidden tabs pause music. Playback failure does not block learning or scoring. Website assets load on demand; downloadable HTML embeds both full tracks.

Home opens the pinned module v1.3.0 in an opaque-origin iframe with scripts and optional popups. Its source is maintained under module/ on this feature branch; the embedding adapter rewrites fragment links to about:srcdoc so Guide/Skip stay within the module. A labelled parent Back button unloads the frame, stopping its animation, and restores menu music. The module keeps its independent layout and learning controls.

Teachers create only their own classes and rooms, see roster presence, and invite a registered student by exact username. The student accepts invitations. A six-digit class PIN enrolls in the class; a room PIN enrolls in its class and room. Codes are server generated, unique, expire after 24 hours and can be regenerated even when no active code remains. Owners alone see PINs. Repeated invalid guesses are rate limited. Presence is an estimate based on a heartbeat within the last 45 seconds, not proof that the game tab has focus.

Room lifecycle is open → playing → closed. Joining during play is supported. There is one resumable attempt per student per room. The server owns the ten question IDs, scoring, progression and cumulative answering time. A pending action locks input; retry retains its UUID. Every returned state is authoritative. View epochs discard late responses after leaving/reopening a game, including the same attempt; background snapshots cannot navigate a newer screen. Restoring review/feedback/net/finished states renders the corresponding controls. Hint visibility resets per question and never reveals the next hint without server accounting.

The server timer continues during dialogs, UI pause, hidden tabs and disconnection; waiting and settled-answer review are excluded. Local UI time is an estimate between server snapshots. Classroom ranking is score descending, answering time ascending, username for deterministic ties. Waiting students have no fabricated zero-score rank; incomplete closed attempts retain partial marks. Complete attempts retain final results. Closing is confirmed inline and cannot be reversed. Room results never enter the local practice leaderboard.

The teacher board subscribes to authorized room_progress changes. Only a confirmed SUBSCRIBED status is labelled live; fallback refresh is 15 seconds. Student/dashboard polling is 15 seconds, heartbeat 20 seconds. Polls do not overlap or overwrite edited form drafts. Search/pagination bound roster/board display to 20 rows. Read failures preserve labelled last-known data with retry.

The theme button applies light/dark across entry, game, dialogs, results and portal, persists the preference and respects the system choice before an explicit selection. Both themes preserve visible text, focus outlines and non-colour state labels.

The v1.3.0 module includes four guided interactive labs reachable from its own Makmal interaktif tab. Parent navigation still owns the iframe lifetime and the map music; classroom Auth and scoring remain in the parent application.


## Module practice records (v2.4.0)

Parent ModuleProgress owns bounded, validated records for net/volume/area/composite. Each guest or authenticated ID has a separate key. Only the active iframe window and current CSPRNG nonce may send protocol-1 records. The child has no network/storage access. Restoration updates earned achievements without unlocking a fresh experiment. Account changes clear ownership, drafts and pending queues; async results check identity/epoch before application.

The parent merges milestones monotonically; completed local achievements survive retries, delayed saves and unavailable storage (session memory). Students synchronize through the dedicated authenticated geo_module_progress RPC. Private role/class ownership determines access; teachers see only student members of their own classes. Practice reports are self-reported reflections and never verified assessment/TP. Portal polling refreshes the records and preserves expanded disclosures. Deployment requires the v2.4 migration; the feature branch does not apply it to production.

Embedded theme follows the parent. Focus enlarges the model and keeps nearby motion/camera controls. Browser-local Malay speech is explicit, optional and paired with persistent transcript text. Hidden tabs/navigation stop speech and animation. All generated offline aliases come from the same builder artifact.
