# Classroom / CRUD canonical audit

Audit date: 2026-11-04. Status: **source audit complete; Flutter implementation blocked by foundation gate**.
No Flutter scaffold, shared interface, backend write, deployment or push was performed.

## Provenance and scope

| Item | Evidence |
|---|---|
| Audited instruction/source tree | `app` SHA `38f061af963256528d5060ff076bae9ee05eafc3`; source paths/line numbers below refer to this immutable tree |
| Worker | `app-cloud-game-worker-2-7395917`, worktree `/workspace/scratch/7395917c0f68/worktrees/worker-2`; clean before audit |
| Current remote refs, verified by lead | `main` `25836eb1a6f24459aace8a3980ae880a13e3b488` / firmware v2.0.2; `main-digitalized` `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` / Digital 2.9.1 |
| Implementation gate | Lead read `app-foundation`/`app-learning` refs as 404; canonical marker is `apps/geomath_flutter/docs/FOUNDATION_READY.json`. No app/freeze files existed here. Prompt 3 lines 9–11 require audit only until READY; Prompt 2/3 must share its exact SHA |
| Scope | SOR C02–C04/N01–N02; native teacher/student classrooms, online game projection and CRUD, without changing firmware or Digital |

The remote-head facts above are lead readbacks, not a claim this worker re-audited every byte of newer Digital 2.9.1.
The pinned app tree contains the integrated CRUD/scaling/offline source; older branch handoff counts are historical evidence only.

## Source key

Every key names a repository-root path at the audited SHA; `key:Lx–Ly` is an exact source-line reference.

| Key | Canonical source |
|---|---|
| C | `digital/dist/cloud.mjs` |
| M | `supabase/migrations/20261104014958_geodecoder_classroom_crud.sql` |
| B | `supabase/migrations/20261026050330_geodecoder_profile_and_module_progress_v2_6.sql` |
| S | `supabase/migrations/20261025172311_geodecoder_classroom_v2_01.sql` |
| T | `supabase/migrations/20261025172740_geodecoder_classroom_v2_02.sql` |
| P | `digital/dist/portal.mjs` |
| G | `digital/dist/app.mjs` |
| R | `digital/backend/classroom-crud/README.md` |
| H | `digital/docs/classroom-crud/HANDOFF.md` |
| O | `digital/docs/integration-sync/SQL_ORDER.md` |
| D | `docs/geomath-app/DATA_BACKEND_CONTRACT.md` |
| SOR | `docs/geomath-app/SOR.md` |
| SCREEN_CATALOG | `docs/geomath-app/SCREEN_CATALOG.md` |
| Prompt3 | `docs/geomath-app-prompts/03-flutter-cloud-game.md` |
| COMMON_RULES | `docs/geomath-app-prompts/COMMON_RULES.md` |
| X | `digital/tests/classroom-crud-backend.test.mjs` |

## Exact transport and payloads

Authenticated RPC remains `public.geo_action(action,payload)`; the client sends `{action,payload}`, preserving structured error codes (C:L159–192; M:L266–273).
There is no new endpoint, client-supplied owner, service-role credential, or client-written official score.
The following are the canonical caller payloads, not proposed Dart signatures (P:L1052–1076,L1226–1235; G:L503,L588–610,L763–784; B:L102–241).

| Action | Payload keys and values |
|---|---|
| `snapshot`, `heartbeat` | `{}` or `{room_id}` for selected room |
| `create_class` | `{name}` |
| `create_room` | `{class_id,name}` |
| `invite` | `{class_id,username}` |
| `accept_invite` | `{invite_id}` |
| `rotate_pin` | `{kind,id}`; kind `class` or `room` |
| `join_pin` | `{pin}`; six ASCII digits as a string, preserving leading zeroes |
| `join_room`, `start_attempt` | `{room_id}` |
| `set_room` | `{room_id,status}`; status `open`, `playing` or `closed` subject to server lifecycle |
| `answer` | `{attempt_id,index,event_id,kind,shape,target}`; kind `solid`/`net`, target `r1`/`r2`, shape `cube`/`cuboid`/`pyramid`/`cylinder`/`cone` |
| `hint`, `skip`, `advance` | `{attempt_id,index,event_id}` |

Game caller uses numeric question index 0–9, server-issued attempt UUID and one immutable event UUID per command; the server validates the current stage/index rather than trusting the UI (B:L225–241,L269–282).

New controls require snapshot **`classroom_crud === 1`**, plus trusted server role/ownership; absence means unavailable controls, not assumed compatibility (M:L27–53; P:L137–138; D:L53–72).
Strict exact-key rejection below applies to the new management actions; do not infer equivalent validation for every older action.

| CRUD action | Exact payload | Revision owner |
|---|---|---|
| `rename_class` | `{class_id,expected_revision,name}` | Class |
| `rename_room` | `{room_id,expected_revision,name}` | Room |
| `archive_class`, `restore_class`, `delete_class` | `{class_id,expected_revision}` | Class |
| `archive_room`, `restore_room`, `delete_room` | `{room_id,expected_revision}` | Room |
| `remove_member` | `{class_id,user_id,expected_revision}` | Class, not member |
| `cancel_invite` | `{invite_id}` | **No revision** |
| `decline_invite` | `{invite_id}` | **No revision** |

Management rejects missing/extra keys and malformed IDs; payload must be an object ≤8192 bytes.
`expected_revision` is a nonnegative JSON integer; string, negative, fractional/overflow representations fail. Mismatched revision returns `conflict` (M:L86–88,L113–157,L262–263).
Rename uses server `btrim`/`char_length`, 2–60 Unicode characters, no control characters; Dart validation must count Unicode code points rather than UTF-16 code units and preserve server authority (M:L159–166; P:L906–908).
Creation also validates 2–60 Unicode code points without controls in the portal; legacy server creation checks trimmed 2–60 characters. Rendered `maxlength=120` is a UTF-16 field bound, not the accepted name limit (P:L487,L523,L906–908; B:L102–105,L127–131).
Successful rename/archive/restore/member removal increments the entity revision. Do not add revisions to baseline PIN, enrollment, game or `set_room` payloads.
Management normally returns a fresh snapshot; room actions include selected room. Deletes return `deleted_class_id` or `{deleted_room_id,class_id}` for navigation (M:L165–215).

## Lifecycle, PIN and attempt identity

- PIN issuance replaces the target's current code, avoids immediately reissuing that old code, and expires after **24 hours**. Expired/rotated codes are checked again after lock acquisition. Eight invalid PIN attempts per 15 minutes trigger rate limiting (S:L210–233; B:L139–183).
- Class PIN enrolls the class only; room PIN enrolls both class and room. A current class member may use `join_room` without another PIN. Closed rooms reject new joins; room PIN rotation is unavailable when closed (B:L139–192).
- Lifecycle allows open→playing→closed and open→closed; playing→open and closed→open/playing are rejected. Closing finalizes active attempts without reopening finished results (B:L194–212).
- Archive retains members/invites, attempts, answers, event IDs, scores and module reflections. Class archive deletes class and all child room codes; room archive deletes its code. New enrollment/PIN/game activity fails `archived` (R:L25–31; M:L168–183,L218–248).
- Class archive/remove-member is blocked while any child room plays; room archive is blocked while that room plays. Room archive/restore requires active parent. Restore preserves status and history, creates no PIN, and never reopens closed rooms (M:L168–183,L204–213; H:L40–42).
- Delete is permanent and server-checked: class must have no members, rooms or invitations; room must have no room members, attempts or progress and must not be playing. Failure is `not_empty`/`room_playing`; archive remains the retention path (M:L185–202).
- Exactly one attempt exists per `(room_id,user_id)`. `start_attempt` returns that same existing attempt before checking whether the room is still playing; a new attempt requires playing status. Reopen/resume reads `room.my_attempt`, preserving `attemptId` (S:L94–126; B:L214–223; M:L55–65).
- Server state owns stage, score, elapsed, hints/answers and `readyInMs`; running elapsed continues on the server. Waiting/review are distinct projections, not final zero scores. Ranking orders score descending, elapsed ascending, then display name (T:L54–85; M:L60–62).
- A completed pair alone adds +1; R1 then R2, wrong/skip +0, server feedback 900 ms/review 1800 ms. Reuse solo visual components only; keep official class results out of solo leaderboard and formative outbox (B:L243–306; SOR:L68–70,L83–85; SCREEN_CATALOG:L90–91).

## Authorization, revocation and stale invitations

Owner checks precede disclosure of management revision/archive/member state. Teacher ownership comes from stored class rows; a different teacher and a student receive `forbidden`. Only the named student may decline; only owning teacher may cancel a pending invite (M:L123–148).
The public wrapper is security invoker, privileged implementation stays private, and direct frontend execution of the old dispatcher is revoked. Native route guards never replace these checks (M:L266–273; R:L31).

Removing a member deletes current `class_members` and that class invitation only, increments class revision, and intentionally retains `room_members` because its FK would cascade attempts/progress.
Room snapshot, game writes and Realtime SELECT RLS require current class membership as well as retained room membership; removed users cannot refresh old presence. It is access removal, not an account ban (M:L9–17,L96–104,L204–213,L236–244; S:L175–177).
A valid PIN/new accepted invitation can re-enroll the learner and restore access to the original attempt. Rotate PIN if further enrollment should be limited (R:L27–29; X:L28–52).
On explicit room `forbidden`, clear the scoped room data/subscription, return to dashboard and refresh. Cached success cannot hide denial (P:L741–775; H:L10–13).

Each `invite` issuance/resend changes the UUID, even while pending. Capture that issuance ID in confirmation; never substitute the current invite ID into an old dialog.
Old accept/cancel/decline cannot consume a newer issuance. Cancel/decline delete pending only; accepted invite yields `conflict`, missing old UUID can yield `forbidden` (M:L123–144,L250–259; X:L87–115).

## Conflicts, unknown outcomes and request ownership

- Serialize UI mutations. On `conflict`, retain the user's draft, show the server state after an explicit refresh, and capture its revision only then. Failed refresh preserves draft and focuses error; do not overwrite silently (P:L187–245,L1001–1069).
- A timeout is not proof of rollback. Refresh/reconcile the target before retrying delete/archive/remove/PIN/create operations; inspect missing/deleted IDs, status, current PIN, membership or invite UUID as applicable. Never blind-replay a create or silently retry with a newly fetched revision (R:L21; D:L84–87; Prompt3:L97–103).
- A live game retry keeps the same action, `attempt_id`, `index`, `event_id` and payload. Server `(attempt_id,event_id)` receipts reject content reuse as `event_conflict`; duplicate returns current state plus saved result. Too-early blocked `advance` is deliberately not cached (B:L225–241,L300–306; G:L763–784).
- Keep pending live commands separate from the formative outbox. After process death, recover the server attempt and reconcile state; source pending commands are in memory, so no durable replay guarantee is established (G:L54,L661,L763–784; SOR:L70,L85).
- Bind every request/result to user, session, epoch and room scope. Verify SDK ownership before/after await, bind the verified actor's token to the request, and reject late account/room responses. Same-session token refresh remains valid (C:L159–225,L248).
- Use one scoped cache/refresh/presence owner, invalidate reads around mutations, stop obsolete subscriptions, and reconcile foreground state. Existing JS heartbeat uses single-flight jitter/backoff; SQL presence writes coalesce at 15 seconds and never reproject scores (C:L196–216,L248–263; M:L90–106).

## Proposed ownership after READY

Worker 2 owns only future `lib/features/classroom/**` and classroom feature tests: teacher/student dashboards 17–22, forms 42–44, EX01–EX08 and scoped access/capability states EX15–EX16.
Classroom gateway/repository/controller, validation, invitations, room monitor/results and server-game adapter remain feature-local; solo owner supplies game visuals, Auth owner supplies current actor, sync owner supplies shared network policy through frozen ports.
Required foundation capabilities, **not fabricated signatures**: typed failures preserving conflict/unauthorized/unavailable/retry information; credential-free actor/session/epoch/scope binding; protected session/verified-token transport adoption; lifecycle/cancellation and single refresh ownership; route/service/l10n contributions and preview bootstrap; shared form/dialog/notice/loading widgets and preferences/audio ownership.
Any persisted classroom cache needs explicit owner partition and approved migration contribution; classroom mutations/PIN/gameplay must never become queued offline writes. Shared router/core/schema/theme remain foundation/integrator-owned (COMMON_RULES:L45–120; Prompt3:L13–23).

## Verification and blockers

Executed with Node **v24.22.1**, pinned dependencies via `npm ci --offline --ignore-scripts --no-audit --no-fund` in `digital` (exit 0; 49 packages; no tracked dependency edits): Supabase 2.118.0, jsdom 30.1.3, PGlite 0.5.11.
Initial suite invocation failed at import time because PGlite/jsdom/Supabase were absent; dependency installation resolved this environment blocker. The exact command below passed **38/38**, 0 failed/skipped, exit 0 (67.234 seconds); a raw-log evidence rerun also passed **38/38**, exit 0 (64.587 seconds):

```sh
node --test --test-concurrency=1 digital/tests/classroom-crud-backend.test.mjs digital/tests/classroom-crud-portal.test.mjs digital/tests/cloud-session-binding.test.mjs digital/tests/integration-sync-backend.test.mjs digital/tests/backend-history.test.mjs
```

The suites execute real local PGlite SQL, immutable history and both candidate orders, verify owner/outsider/revision/archive guards, retained attempts/RLS after removal, stale invite UUIDs, heartbeat scoping, portal drafts/focus/access denial and installed SDK account-switch/token-refresh behavior.
Tests (all under `digital/tests/`): `classroom-crud-backend.test.mjs:L8–131`, `classroom-crud-portal.test.mjs:L37–139`, `cloud-session-binding.test.mjs:L49–160`, `integration-sync-backend.test.mjs:L133–247`, `backend-history.test.mjs:L6–35`.
`python tools/check_version.py` also passed (exit 0) for this pinned app tree's inherited firmware **v1.1.3**; that is separate from lead-verified current remote main **v2.0.2**, and no firmware version was changed.
Synthetic Auth/local RLS is not hosted GoTrue/Realtime delivery, multi-session PostgreSQL race/load, Android, APK or physical-device evidence.

Foundation READY remains the implementation blocker: no Flutter code/build/device/screenshot claim is possible. Reconfirm exact shared SHA/hashes and actual extension points before resuming.
Hosted activation is separately unverified: operator order is 11 immutable history entries → scaling candidate → CRUD → offline. Scaling/offline still need canonical registration; root push currently contains only pending CRUD. Never replay historical schema/dispatcher files over candidates (O:L11–29,L58–65).
Future native acceptance must cover two actors/two classes, expired/rotated PIN, Unicode names at 60/61 code points, archived/closed/nonempty/remove-member, missing capability, stale invite, draft conflict/failed refresh, timeout reconciliation, same-attempt reopen, duplicate event, access revocation during open screen, actor/room switch and BM/English/light/dark/text150%.
No hosted mutation, credentials, firmware change, APK success, production capacity or remote push is claimed.
