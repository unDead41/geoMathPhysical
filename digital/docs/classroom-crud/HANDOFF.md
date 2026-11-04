# GeoMath classroom CRUD handoff

Work branch: `digitalized-classroom-crud`. Base: `main-digitalized` at `391df985eea4fee15d9859e678068b1a3f613cba` (Digital v2.8.0). Firmware, learning-module geometry, scoring rules and Duel protocol are unchanged.

## Delivered

- Teacher class/room rename, archive/restore and permanent deletion of empty records only.
- Remove a learner from a class without cascading deletion into their room attempts, event IDs, answers, scores or module reflections.
- Teacher pending-invitation list/cancellation and student invitation decline. Every issuance gets a new ID so an old confirmation cannot delete or accept a newer invitation.
- Stored owner authorization, current membership checks for room read/write/Realtime RLS, revision-based stale-edit rejection, and validated name/payload boundaries.
- Portal capability gating, active/archive navigation, BM/English, shared forms/notices, native modal confirmations, keyboard focus restoration, failed-save/failed-refresh recovery, single-flight saves and account/session guards.
- Structured backend errors now retain their code in `cloud.mjs`. Explicit room-access denial clears the old cached results/subscription and reloads the class dashboard.
- Presence heartbeats retain the selected-room boundary, exclude former class members and never rewrite the game projection.

API/retention authority and deployment order: [backend contract](../../backend/classroom-crud/README.md).

## Review and evidence

An independent whole-branch reviewer and the two helpers requested by the user checked authorization/retention and UI recovery. Reproduced findings were corrected with regression tests: removed-learner presence/cached data, stale invitation confirmations, scoped heartbeat/projection updates, archived Profile navigation, and modal refresh failure/focus behavior. Conflict refresh also shows the current server name while preserving the draft. Name fields allow surrogate pairs while the client/server enforce 60 Unicode characters.

The browser integration uses the real portal, `ClassroomCloud` RPC/session binding and PostgreSQL via PGlite with synthetic Auth. It makes no production account/email/database calls. Seeded names, PINs and the displayed score are test fixtures.

- [Desktop teacher management](evidence/teacher-management-desktop.png)
- [English dark mobile conflict](evidence/edit-conflict-mobile-dark-en.png)
- [Student-removal confirmation](evidence/remove-student-confirmation.png)
- [Four browser integration cases](evidence/browser-results.json)
- [Static UI contract audit](evidence/premium-audit.json)

## Verification

Final command receipts and source hashes are in `evidence/verification.json`.
The focused SQL/DOM/transport suite passed 20/20; the four CRUD browser integration cases passed, including network retry, stale edits, keyboard/mobile/dark/English and a 40-character supplementary-Unicode name. All 15 existing design-system product browser cases passed. Build, local publication preparation, token checks, standalone/ARIA/bank checks and strict UI audit passed.

One high-concurrency full run hit the existing `profile-backend.test.mjs` wall-clock assertion “review time gate bypassed” (the historical verifier expects another SQL call within 1.8 seconds). The complete suite then passed **367/367** with concurrency 2. The unchanged component-reference browser gallery timed out at its 8-second interaction limit in three runs, including a quieter rerun (which passed the light and dark desktop cases before a later viewport/stability timeout). This reference-gallery check remains unresolved and separate from the passing 15 product cases and four CRUD browser cases.

## Integration boundary

No production database migration, main/main-digitalized merge or Pages publication was performed. `prepare:pages` above writes a local test artifact only. Generated distribution HTML/bundles are deliberately excluded from this source branch; rebuild the combined source during integration so parallel UI work is included.

Apply the additive `supabase/migrations/20261104014958_geodecoder_classroom_crud.sql` after checking the actual hosted history. Do not rerun historical schema/profile dispatcher SQL after it. Reconcile any scaling/offline branch that also changes gateway grants or `cloud.mjs`; do not overwrite their changes. Historical migration files and `supabase/hosted-history.json` retain their original bytes.

Before releasing to real classes, run approved hosted rollback/permission checks plus real teacher/student Auth and Realtime delivery/reconnect verification. No multi-session PostgreSQL race, load test, production Auth flow or live Realtime revocation was executed here. Removing membership is not a ban: a valid PIN or a new accepted invitation can re-enroll the learner and restore their original attempt. Closing a room remains irreversible; restoring an archive never reopens it.
