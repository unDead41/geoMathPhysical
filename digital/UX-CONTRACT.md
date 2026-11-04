# GeoDecoder Digital V2 UX contract

Review candidate: Digital v2.9.1 / module v1.6.2, on
`digitalized-ux-mockup-completion` only. Base integration remains v2.9.0. Firmware is maintained
on its separate branch. The existing game/account contracts remain in force
alongside the shared design system, animated entry pages, refreshed Duel/module
views, offline outbox, classroom CRUD and bounded network policy.
See docs/integration-sync/README.md for combined verification and source receipts.
Hosted SQL/Edge and public PWA publication are separate rollout operations.
Original ease-of-use reference design:
[approved specification](../docs/superpowers/specs/2026-10-26-ease-of-use-design.md).
Firmware rounds remain a separate contract.

## Canonical UI map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Entry shell/cards/guide | index.html shell + entry-components.mjs + entry-ui.mjs | approved GeoMath reference; docs/ENTRY_UI.md | Home, mode radio cards, real resume, guide page | solo-ui.test.mjs + entry browser QA |
| Entry 3D presentation | entry-models.mjs + entry-scenes.mjs | DESIGN.md; existing PALETTES and preferences | shared hero/mode/resume/guide assets; static SVG fallback | entry-scenes.test.mjs + live Pages visual checks |
| Design tokens | design-system/tokens.mjs → tools/design-tokens.mjs | DESIGN.md / docs/DESIGN_SYSTEM.md | light/dark, standard/strong; generated module adapter | design:check; design-tokens.test.mjs |
| Button / field / panel | dist/foundation.css + dist/module-foundation.css | DESIGN.md | brand, neutral, danger, icon; legacy class adapters | tests/design-system.browser.mjs; reference gallery |
| Form | core validators + portal form owner; support-report.mjs for reports | account/game validation and report contract | guest, login/signup/recovery, profile/security, local report | core, portal-auth-validation, support integration/browser |
| Select/Listbox | native select + shared field recipe | DESIGN.md; fixed choices and native popup | game mode, preferences, report category; browser/OS popup | keyboard and open native popup |
| Scrollbar | design-system/tokens.mjs + global style.css | DESIGN.md runtime mapping | normal/forced colors; dialog/textarea geometry | token checker + browser computed style/reflow |
| Toast | app announcer, portal notice and report role=status | actual action outcome and feedback contract | polite routine, persistent actionable error, local export | usability/integration/browser |
| CRUD | portal.mjs + cloud.mjs; storage.mjs for local scores | backend contracts and SOR | existing accounts/classes/rooms, local score erase | cloud/auth/profile/security/storage + portal integration |
| Guest form | index.html + validateGuest/validatePlayer | core.mjs and storage contract | nickname-only guest; legacy/classroom profiles | core/storage/browser |
| Dialog/settings/tutorial | usability-ui.mjs + app dialog owner; help-visuals.mjs for demonstration | app openDialog/closeDialog and settings/gameplay contract | settings, visual guide, pause, scores, leave, help/report | browser focus/state; help-visuals browser |
| Help and support | help-support.mjs + support-report.mjs | HELP_SUPPORT_PLAN.md + HELP_SUPPORT_AUDIT.md + HELP_VISUAL_UPDATE.md | visual guide, report draft, read-only preview, copy/download | privacy/integration/browser |
| Text and math | i18n.mjs + local copy modules + format.mjs | docs/DWI_GLOSSARY.md; stable question IDs | BM/English, SVG/MathML | catalog/bank/browser |
| Direct manipulation | app Pointer Events controller | core.mjs and gameplay contract | pointer, touch, click, keyboard | browser stage/selection |
| Offline progress | offline-runtime.mjs + offline-sync.mjs + OfflineDB | docs/OFFLINE_SYNC.md; owner-scoped formative records | module reflections, completed solo records, local status/retry | offline-runtime, offline-sync and real app completion tests |
| Scores and solo resume | storage.mjs and actor-scoped SoloStore | single-attempt ruleset; docs/SAVE_RESUME.md | save, list, CSV, erase, legacy, explicit local resume | storage/solo tests + browser |
| Modes | one Game engine | core.mjs | quiz10, practice15, review subset, Duel10 | core/browser |
| Classroom | cloud.mjs + portal.mjs | backend/schema.sql; server state/RLS | accounts, roster, rooms | cloud/auth tests + portal UI |
| Duel | duel.mjs + isolated service | docs/DUEL_V2.md; protocol 2 server | PIN, ready, live/result, reconnect | isolated transport/live suites; two browser contexts |
| Module learning tools | module projection/calculation source owners | module/UX-CONTRACT.md; canonical measures | three-view drafts, four calculation steps; existing four reflections | module unit/DOM/browser + host integration |

## Home, guest and settings

The GeoMath entry preview provides `#utama`, `#main`, `#sambung` and
`#cara-bermain` as direct entry routes. Header links use the single application
navigation owner and retain existing game/account leave guards. Mode cards use
native radio semantics and update the existing play-mode value; Game remains
the only rules owner. The first-play guide is now a page before the solo clock
starts. During active play, help still opens a modal without replacing the game.
Resume is a page rather than the former summary modal. It shows only validated
unfinished progress for the current browser/account. Missing/corrupt/blocked
storage has an explicit state; no sample progress is inserted. Optional savedAt
metadata localizes the save date but never determines elapsed game time.
Starting over retains the existing destructive confirmation and focus owner.
The new fixed cube demo is 24 seconds, supports seeking, replay and pause, and
never reads a live answer or starts a round. It pauses on navigation/background.

Home groups Main, Belajar and Akaun/Kelas. Main opens nickname and mode
selection: quiz10, practice15, Duel. A guest has category Tetamu and an empty
class. Old Murid/Pelajar profiles still require a class and remain valid.
Fresh guest solo play does not initialize Auth or call Duel. A persisted account
reuses the Auth SDK lifecycle for its own offline queue. Back/Home focuses Main;
unfinished solo play still confirms leaving. Account role and class fields
are unchanged.

The first guest start opens the three-step illustrated guide page before
the solo clock starts. Back returns to the form; the explicit start action
marks the guide seen and begins the selected mode. Cara main opens the guide
page from entry and the existing tutorial modal during active play. Native
dialog Escape/close and focus restoration remain available for game dialogs. Settings groups the single language
selector, light/dark/system theme, music, scan sounds, text100/125/150% and
motion. Existing language/theme/music keys remain; the versioned device-only
preferences key stores no profile, credential or answer. Denied storage keeps
preferences working in memory and does not block play.

### Classroom management candidate (4 November 2026)

Lifecycle, permissions, retention and API authority: [classroom management contract](backend/classroom-crud/README.md). `portal.mjs` reuses the existing field/button/notice/validation owners for all class and room edits. A single portal management dialog variant is attached only while a management action is open, uses the native modal focus boundary and restores the originating control on Cancel/Escape. It is removed on close or session change and never replaces the game's help/settings owner. Native dialogs for game/help/settings remain unchanged.

Teacher archive filters are explicit and reversible. Delete is reserved for empty records; archive preserves results. Successful mutations return to the owning list or current room and clamp pages. Conflicts preserve drafts and require an explicit refresh of the captured revision. Pending saves block duplicate submit and dismissal; user names remain literal escaped text. Capability `classroom_crud:1` gates the new controls against older backends. Roster and invitations page at 20, room cards at 6. BM/English uses `classroom-copy.mjs` through the existing catalog. Verification: `classroom-crud-backend.test.mjs`, `classroom-crud-portal.test.mjs` and `classroom-crud.browser.mjs`.

## Offline progress and capture

`offline-runtime.mjs` owns the account-scoped durable queue through the existing
ModuleProgress hooks and completed solo result capture. Re-rendering results
keeps the same attempt ID. Guest records remain local; classroom and Duel
results retain server authority and never enter the solo outbox. Session changes
select the matching owner before rebuilding the embedded module, so the prior
account draft cannot cross into the new session. Boot, retry and reconnection
reuse the existing Auth owner and never attach credentials to progress payloads.

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
rounds now checkpoint locally using the versioned actor-scoped SoloStore; Home
offers a progress summary and explicit resume. See docs/SAVE_RESUME.md. Completed quizzes save once per ID; ranking remains score,
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

## Account email presentation v1.1.0

Confirm sign up and reset emails use the same GeoDecoder wordmark, palette,
large action and BM/English message. `ConfirmationURL` remains the destination
of both the action and labelled alternative link. Reauthentication shows the Auth OTP;
security notifications link to `SiteURL`. No template claims a fixed expiry
or exposes passwords, tokens in subjects, roles or class membership. Additional
templates do not enable application capabilities or notification toggles.
The export contains subject/body keys only. It never changes auth settings.
SMTP activation, hosted template saves and actual mailbox delivery need their
own evidence. The current Free/default-SMTP restriction blocks template editing.

## Classroom timing and authorization

Teachers create only their own classes and rooms, see roster presence, and invite a registered student by exact username. The student accepts invitations. A six-digit class PIN enrolls in the class; a room PIN enrolls in its class and room. Codes are server generated, unique, expire after 24 hours and can be regenerated even when no active code remains. Owners alone see PINs. Repeated invalid guesses are rate limited. Presence is an estimate based on a heartbeat within the last 45 seconds, not proof that the game tab has focus.

Room lifecycle is open → playing → closed. Joining during play is supported. There is one resumable attempt per student per room. The server owns the ten question IDs, scoring, progression and cumulative answering time. A pending action locks input; retry retains its UUID. Every returned state is authoritative. View epochs discard late responses after leaving/reopening a game, including the same attempt; background snapshots cannot navigate a newer screen. Restoring review/feedback/net/finished states renders the corresponding controls. Hint visibility resets per question and never reveals the next hint without server accounting.

The server timer continues during dialogs, UI pause, hidden tabs and disconnection; waiting and settled-answer review are excluded. Local UI time is an estimate between server snapshots. Classroom ranking is score descending, answering time ascending, username for deterministic ties. Waiting students have no fabricated zero-score rank; incomplete closed attempts retain partial marks. Complete attempts retain final results. Closing is confirmed inline and cannot be reversed. Room results never enter the local practice leaderboard.

The teacher board subscribes to authorized room_progress changes. Only a confirmed SUBSCRIBED status is labelled live; fallback refresh is 15 seconds. Student/dashboard polling is 15 seconds, heartbeat 20 seconds. Polls do not overlap or overwrite edited form drafts. Search/pagination bound roster/board display to 20 rows. Read failures preserve labelled last-known data with retry.

## Duel boundary

Duel retains ten common ordered questions on the server, two slots, an opaque sessionStorage token,
server-authoritative scores and idempotent retry. Higher score wins, then server
wall-clock finish time. Its clock includes menus, corrections, hidden tabs and
disconnection; classroom answering time excludes settled-answer review. PIN10min,
match15min; leaving incomplete play forfeits. A complete Duel can start local
wrong-question practice: the token is forgotten, polling stops and neither
the original server result nor local quiz board changes. API access expires24h;
physical cleanup is bounded/lazy. Protocol 2 requires its matching backend and Edge Function; deployment evidence is recorded separately.

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

The original v1.2.0 pin was BM-only; its local canonical DOM/attribute/canvas
adapter supplied reversible BM/English for Explore, Notes and all four Labs.
The current module pin advances to v1.6.0 with the integrated native startup
interface. New learning-tool roots declare data-module-native-language so the
legacy translation adapter does not overwrite their own BM/English rendering.
The parent remains the only owner of language/text/motion storage. The existing
source/opaque-origin/instance-checked settings channel never carries credentials
or game answers; progress remains a separate session-scoped channel.
See docs/MODULE_SETTINGS.md for the versioned integration contract and limits.

## Integrated release v2.7.0 / module v1.5.0

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
See docs/RELEASE_V2_6.md for historical v2.6.0 source SHAs, tests and deployment limits; docs/RELEASE_V2_7.md records the subsequent v2.7.0 integration and deployment. Neither record verifies the v2.8.0 candidate.

## Duel protocol 2 — integration v2.7.0

The Duel branch sends only the current bilingual prompt without an answer or
future selection IDs. Requested hints and completed-answer corrections are
server projections. The one Game engine renders accepted backend state rather
than evaluating a Duel scan locally. Durable review survives refresh; an
idempotent server-paced advance acknowledges the existing 900/1800ms feedback.
Scores, single attempt, common start and server wall-clock tiebreaker are unchanged.
Lobby/match remaining time, finished/forfeited/estimated-away labels, Home resume,
live errors and a short teacher guide use the existing settings and visual system.
Protocol 1 clients fail closed after the coordinated backend update. Deployment is verified separately; the branch handoff is historical evidence, see docs/DUEL_V2.md and DUEL_V2_HANDOFF.md.

## Profil v2.7.0

Draf nama/avatar tidak menukar pengepala akaun sebelum simpan disahkan. Pratonton setempat dikemas kini melalui input/change tanpa panggilan rangkaian dan mengekalkan draf semasa refresh/bahasa. Keluar ke Home, kelas, keselamatan atau log keluar menawarkan Simpan dan teruskan, Buang perubahan atau Teruskan menyunting. Escape membatalkan pilihan keluar. Gagal simpan tidak meneruskan navigasi. Tukar akaun membatalkan draf dan destinasi lama. Tutup/reload tab menggunakan amaran native browser, tertakluk kepada polisi interaksi browser. Tetapan membuka dialog bersama dan mengekalkan profil/draf di belakangnya. Kelas dan nama guru menggunakan data backend yang dibenarkan; nilai yang belum disediakan tidak direka.

## Help and support v2.7.0

One native app-dialog owns help, report, tutorial and Settings. Opening these
views never replaces a game or iframe. Solo pauses; classroom/Duel retain their
server clocks. Report drafts remain memory-only; explicit preview is the exact
copy/download content. Automatic diagnostics use an allowlist; no remote report
transport exists. Reuse existing module guide through the validated bridge.

## Shared visual foundation (design system v1)

The component recipes adapt existing markup and do not own Auth, validation, role,
account state, timing, scoring, storage or announcements. Existing semantic button,
field and native dialog controllers remain authoritative. Styling never adds an
activation handler to a disabled control. Busy semantics and duplicate protection
stay with the owning action. Use `data-block-while-busy` before starting an action
to reserve spinner space; do not replace a native button with a clickable container.

The component reference has temporary preview controls only. It creates no second
preferences record and makes no Auth/database calls. Production preferences retain
the single language/theme/device owner above. Native select popup geometry remains
platform-owned. Gallery tabs follow roving Tab, arrows and Home/End; production
auth mode buttons retain their current aria-pressed model.

## Visual help integration v2.8.0

The three-step tutorial and seven help guides use one exact-SVG demonstration
renderer. Its fixed cube example reads no live question or answer. CSS plays
once for 4.8 seconds; Pause/Resume and Replay affect only the demonstration,
without new gameplay timers, storage or service calls. OS or application reduced
motion produces static labelled content. Detailed text and keyboard guidance
remain available through native disclosures. Existing dialog focus restoration,
solo pause, classroom/Duel server clocks and local report export remain intact.

## Learning module v1.6.0 integration

Studio Pelan & Dongakan provides front +Z, plan +Y and right +X views in Kaedah 1
arrangement, with consistent length scales. Its five project solids and two unit
cube compositions use canonical meshes; this is not a free-object builder.
Coordinates/line/circle tools, selection, delete and Undo complement pointer
input. Equivalent geometric coverage accepts reversed or split/joined collinear
segments. Inclusive tolerance is 0.06 cm in the drawing; construction lines do
not substitute for an answer, and visible edges win over coincident hidden ones.

Semakan Langkah Pengiraan gates formula, substitution, calculation and unit for
22 shape/quantity pairs across 11 solids, selected open containers and two
compositions. Measures come from the shared calculation functions. A bounded
expression parser evaluates mathematical input without executing learner code;
formula equivalence and substitution provenance have explicit limits. Hints,
retry, guided examples and worked solutions do not fill the learner's answers.

Both tools follow the same host settings and keep drafts across ordinary
navigation and language changes. A new account session clears those drafts;
standalone drafts have no added persistence. The four existing protocol 1
reflections remain formative self-report, with no new score, TP or verified
mastery claim. Pin the tested v1.6.0 HTML and rebuild the parent aliases before
combined checks. Source-level branch evidence and limitations are in
module/docs/HANDOFF_PELAN_PENGIRAAN_V1_6.md; it does not establish v2.8.0 Pages
publication or completed integration tests.


## Approved mockup completion

All 40 screens use concept commit `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd`.
See `docs/mockup-completion/SPEC.md` and its coverage/evidence. Real domain rules
override raster mistakes: 10–128 character account passwords, canonical Kaedah1
projection layout, finite4.8s tutorial and Tab/Enter/Space controls. Classroom
workspace uses its actual anchor/controller; unsupported rematch/CSV/TP/XP actions
are not invented. Settings/help remain app-owned dialogs with wide content.
Auth composition lives in auth-view.mjs; profile/security/session views retain
their owners. Workspace identity/nav extend portal.mjs; tokens remain centralized.


## Google Auth v2.10.0

- Log masuk dan daftar menawarkan Google bersama kaedah e-mel sedia ada. Tiada pilihan atau borang SMS.
- Navigasi Google hanya melalui endpoint Auth projek yang dikonfigurasi dan callback canonical.
- Sesi Google yang belum mempunyai profil membuka borang profil dahulu. Identiti dan pemilikan ditentukan pelayan; peranan sedia ada tidak berubah melalui retry.
- Akaun Google sahaja tidak diminta memberikan kata laluan aplikasi; kawalan log keluar dan sesi kekal tersedia.
