# GeoDecoder Digital V2 UX contract

Current candidate: v2.5.0, digitalize-ease-of-use. Source of change: the eight
ease-of-use recommendations and shared game/module settings accepted on 26 October 2026. Reference design:
[approved specification](../docs/superpowers/specs/2026-10-26-ease-of-use-design.md).
Firmware rounds remain a separate contract.

## Canonical UI map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | index.html, core validators, portal form owner; support-report.mjs for reports | domain validation + this contract | nickname, account, local report | core, portal, support integration/browser |
| Select/Listbox | native select + shared field CSS | DESIGN.md; platform-owned popup | game mode, preferences, report category | keyboard and open native popup |
| Scrollbar | style.css global scrollbar tokens | DESIGN.md runtime mapping | dialog/textarea geometry only | check.mjs + browser reflow |
| Toast | app announcer, portal notice, report role=status | actual action outcome | status, error, local export | integration/browser |
| CRUD | portal.mjs + cloud.mjs; storage.mjs for local scores | backend contracts; SOR | accounts/classes/rooms, local score erase | cloud/auth/storage + portal integration |
| Guest form | index.html + validateGuest/validatePlayer | core.mjs | nickname-only guest, old/classroom profiles | core/storage/browser |
| Dialog/settings/tutorial | usability-ui.mjs + app dialog owner | app.mjs openDialog/closeDialog | Settings, three-step guide, pause, scores, leave, help/report | browser/focus/state |
| Help and support | help-support.mjs + support-report.mjs | HELP_SUPPORT_PLAN.md + HELP_SUPPORT_AUDIT.md | guide, report draft, read-only preview, copy/download | privacy/integration/browser |
| Text and math | i18n.mjs + local copy modules + format.mjs | language catalog and stable IDs | BM/English, SVG/MathML | catalog/bank/browser |
| Direct manipulation | app Pointer Events controller | core.mjs | pointer, touch, click, keyboard | browser stage/selection |
| Scores | storage.mjs | single-attempt ruleset | save, list, CSV, erase, legacy | storage tests/browser |
| Modes | one Game engine | core.mjs | quiz10, practice15, review subset, Duel10 | core/browser |
| Classroom | existing cloud.mjs + portal.mjs | server state/RLS | accounts, roster, rooms | existing cloud/auth tests + portal UI |
| Duel | duel.mjs + isolated existing service | Duel contract/server | PIN, ready, live/result, reconnect | isolated transport + existing live suite |

## Home, guest and settings

Home groups Main, Belajar and Akaun/Kelas. Main opens nickname and mode
selection: quiz10, practice15, Duel. A guest has category Tetamu and an empty
class. Old Murid/Pelajar profiles still require a class and remain valid.
Solo play does not initialize Auth or call Duel. Back/Home focuses Main;
unfinished solo play still confirms leaving. Account role and class fields
are unchanged.

The first guest start offers a skippable three-step illustrated guide before
the solo clock starts. Cara main reopens it. Native dialog Escape/close and
focus restoration remain available. Settings groups the single language
selector, light/dark/system theme, music, scan sounds, text100/125/150% and
motion. Existing language/theme/music keys remain; the versioned device-only
preferences key stores no profile, credential or answer. Denied storage keeps
preferences working in memory and does not block play.

## Gameplay and input

Guest nicknames are trimmed, 2–60 characters. All five solids and five net
cards remain visible. Each shelf is independently deranged and recoloured;
colour/position never becomes an answer key. The prominent step label changes
R1→R2. Touch instructions prioritize tap-card then tap-scanner; pointer drag,
Tab, Enter and Space remain. Selecting a card submits nothing. The selected
state and active scanner identify the next scan action. Wrong type/target
consumes no attempt. Correct R1 locks green; a matching R2 earns +1 once.
Wrong R1 or R2 ends the single attempt at +0. Wrong/skip shows a correct pair
and explanation; review input locks for at least1800ms. Correct feedback is
900ms. Hints count once per question without a score penalty.

Quiz: ten unique IDs, two per shape, max10. Practice: all15 IDs, three per
shape, max15. Latih soalan salah selects only original wrong/skipped IDs once,
producing a validated local review subset of1–15 IDs. All-correct results do
not expose an empty review. The original result is never mutated. Practice,
review, Duel and classroom results cannot enter the ten-question quiz board.

Solo time pauses for feedback, answer review, dialogs, hidden tabs and results.
Backgrounding offers explicit resume; reload returns Home. Incomplete solo
rounds do not save. Completed quizzes save once per ID; ranking remains score,
fewer mistakes, elapsed time and completion date, capped at50. Old retry scores
stay separate. CSV localizes labels, quotes fields and neutralizes formulas.
Malformed records are ignored; unavailable storage provides session-only play.

## Results, language and errors

Results lead with score and actions, followed by a native details disclosure
for analysis and all question records. Analysis uses actual session totals,
including subset denominators in review. Unreached R2 is not wrong; no attempts
means no percentage. Hints do not count as mistakes. Advice uses real outcomes.

Changing language/settings keeps card order, selection, attempts, hint use,
score, progress and disclosure state. Authored portal literals are translated
before rendering. Dynamic user names/usernames/class names/PINs remain literal.
No translated text determines correctness or analytics keys. Display errors
give a next action. Pending server actions remain unconfirmed and locked;
retry preserves the same operation ID/sequence. Internal SQL details and raw
machine keys must not be shown to learners.

## Account and classroom behavior

The account entry is distinct from practice. Signup requires email, username, display name, password and teacher/student role; Auth verifies the email before login. A scoped Auth insert trigger validates and copies the initial role into an immutable private profile. Later metadata edits cannot change authorization. Login accepts email or username. Forgotten password requests an email link; reset takes priority over account dashboards only after an SDK-validated recovery session. Two matching 10–128-character passwords are required; successful reset signs out globally. Invalid/expired links offer a new request. Resend has a 60-second UI cooldown and provider errors remain visible. Request success uses generic copy and does not assert inbox delivery. Public delivery depends on configured SMTP and redirect URLs. Legacy username-only accounts retain secondary code recovery; email accounts cannot use legacy codes. No credentials or recovery codes are logged. Names are escaped. Session changes clear account/room caches; stale responses cannot overwrite current context. Recovery screens stop dashboard polling.

## Classroom timing and authorization

Teachers create only their own classes and rooms, see roster presence, and invite a registered student by exact username. The student accepts invitations. A six-digit class PIN enrolls in the class; a room PIN enrolls in its class and room. Codes are server generated, unique, expire after 24 hours and can be regenerated even when no active code remains. Owners alone see PINs. Repeated invalid guesses are rate limited. Presence is an estimate based on a heartbeat within the last 45 seconds, not proof that the game tab has focus.

Room lifecycle is open → playing → closed. Joining during play is supported. There is one resumable attempt per student per room. The server owns the ten question IDs, scoring, progression and cumulative answering time. A pending action locks input; retry retains its UUID. Every returned state is authoritative. View epochs discard late responses after leaving/reopening a game, including the same attempt; background snapshots cannot navigate a newer screen. Restoring review/feedback/net/finished states renders the corresponding controls. Hint visibility resets per question and never reveals the next hint without server accounting.

The server timer continues during dialogs, UI pause, hidden tabs and disconnection; waiting and settled-answer review are excluded. Local UI time is an estimate between server snapshots. Classroom ranking is score descending, answering time ascending, username for deterministic ties. Waiting students have no fabricated zero-score rank; incomplete closed attempts retain partial marks. Complete attempts retain final results. Closing is confirmed inline and cannot be reversed. Room results never enter the local practice leaderboard.

The teacher board subscribes to authorized room_progress changes. Only a confirmed SUBSCRIBED status is labelled live; fallback refresh is 15 seconds. Student/dashboard polling is 15 seconds, heartbeat 20 seconds. Polls do not overlap or overwrite edited form drafts. Search/pagination bound roster/board display to 20 rows. Read failures preserve labelled last-known data with retry.

## Duel boundary

Duel retains ten common ordered IDs, two slots, an opaque sessionStorage token,
server-authoritative scores and idempotent retry. Higher score wins, then server
wall-clock finish time. Its clock includes menus, corrections, hidden tabs and
disconnection; classroom answering time excludes settled-answer review. PIN10min,
match15min; leaving incomplete play forfeits. A complete Duel can start local
wrong-question practice: the token is forgotten, polling stops and neither
the original server result nor local quiz board changes. API access expires24h;
physical cleanup is bounded/lazy. Existing backend deployment is reused.

## Music, theme and pinned module

One looping background Audio element plays the supplied menu track on Home,
Guest, accounts and results; the map track plays during games, Duel lobby and
the module. A trusted gesture unlocks playback. Changes pause the old source
first; hidden tabs pause music. The labelled Settings music toggle persists its
preference; scan sounds are independent. Audio failures cannot block play.
Website music loads on demand; downloaded HTML embeds both complete tracks.
No new spoken BM/English audio is claimed.

Settings applies light/dark/system and scaled text across the parent UI while
leaving mathematical SVG geometry unchanged. Focus and text state labels remain.
The same persisted language, text100/125/150 and effective reduced motion now
reach the pinned module before it starts and update it without reloading.
A module Settings button opens the one parent dialog. Language changes preserve
measurements, active section/lab, camera and unfold progress; canvas text redraws.
Device reduced motion always wins. Turning reduction on stops automatic/current
motion; turning it off does not silently resume it. Sliders and explicitly
requested educational animations remain available, matching the existing module
accessibility behavior. Settings do not change game or server clocks/rules.

The source pin stays byte-identical1.2.0. Its original content was BM-only;
a local canonical DOM/attribute/canvas adapter supplies reversible BM/English
for Explore, Notes and all four Labs. This corrects the earlier documentation
claim that this pin already owned a language selector. The parent remains the
only owner of language/text/motion storage. Source/opaque-origin/instance-checked
messages carry exactly three presentation values, never tokens or answers.
See docs/MODULE_SETTINGS.md for the versioned integration contract and limits.

## Integrated release v2.6.0 / module v1.5.0

main-digitalized is the integration destination. Keep the full ease-of-use
quiz/practice/review/Duel and BM/English contract above. Profile and Security
are exclusive portal states; abort and erase password fields on exit or identity
change. Profile edits use the authenticated owner and an explicit field allowlist.

Shared settings control language, text size, contrast, motion, independent audio
levels/mute and learning defaults through one owner. The embedded module accepts
validated host settings through its native startup interface, without replacing
source-code strings or reloading its activity. Progress protocol1 uses the current
iframe and unpredictable session, isolates guest/account storage and rejects late
responses after account changes. Teacher reads are limited to owned-class members.

Completed achievements survive retries and edits, while current observations and
checks are invalidated as needed. Restored practice is formative self-report, not
verified mastery or TP. Root index and all standalone aliases share one build.
See docs/RELEASE_V2_6.md for source SHAs, tests and deployment limits.

## Help and support candidate v2.7.0

One native app-dialog owns help, report, tutorial and Settings. Opening these
views never replaces a game or iframe. Solo pauses; classroom/Duel retain their
server clocks. Report drafts remain memory-only; explicit preview is the exact
copy/download content. Automatic diagnostics use an allowlist; no remote report
transport exists. Reuse existing module guide through the validated bridge.
