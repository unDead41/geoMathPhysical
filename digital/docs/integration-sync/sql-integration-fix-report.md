# GeoMath integrated SQL compatibility fix

Status: **complete locally, 30/30 focused SQL tests passed.** No hosted calls,
deployment, push, commit, Git index operation or helper-agent spawn was performed.
Worktree: ``.
Read-only HEAD inspection: `main-digitalized` at
`391df985eea4fee15d9859e678068b1a3f613cba` (Digital 2.8.0 base).
The source checkout has no `origin/main` ref; no firmware branch was updated.

## Changes within assigned scope

1. `supabase/migrations/20261104014958_geodecoder_classroom_crud.sql`
   - Handles snapshot and heartbeat before the account `FOR UPDATE` mutation lock.
   - Reads the caller's profile and checks selected-room access before returning
     snapshots or writing heartbeat presence. Invalid payload/UUID, missing
     profile and unauthenticated behavior remains guarded.
   - Uses one server timestamp and writes profile/room presence only if older
     than 15 seconds. The selected-room filter and current-class-membership
     predicate remain on every room-progress heartbeat write.
   - Returns directly from that wrapper path rather than invoking the guarded
     legacy dispatcher. Management/game mutation locking, owner/archive checks,
     and authenticated direct-dispatcher revocation remain in place.
   - This presence behavior is deliberately independent of installation order:
     CRUD alone is correct before scaling is installed.
2. `digital/tests/integration-sync-backend.test.mjs` (new)
   - Uses actual PGlite PostgreSQL with pgcrypto and synthetic Auth, roles and JWT
     claims; replays all 11 files in `supabase/hosted-history.json` and validates
     each archived file's SHA-256 before replay.
   - Exercises scaling → CRUD → offline and CRUD → offline → scaling, executing
     the scaling source inside one transaction without altering its guards.
   - Verifies both guarded routine fingerprints and final gateway/private/anon
     permissions plus private capacity-policy isolation.
   - Runs public snapshots inside `BEGIN READ ONLY`, with a control query proving
     PGlite rejects `SELECT FOR UPDATE` in that mode. Profile and progress tuples
     also remain unchanged after snapshots.
   - Checks first stale heartbeat writes, immediate second calls preserving both
     profile and progress ctid, refresh after a backdated 16-second interval,
     selected/unscoped-room behavior and unchanged score/projection fields.
   - Checks owner, stale revision, exact-field, archive/restore and live-room
     guards, nonempty deletion rejection, retained attempt/progress rows, removed
     membership heartbeat filtering, attempt denial, SELECT RLS exclusion and
     deliberate re-enrollment restoring the same authoritative attempt.
   - Checks offline lost-response replay, ID conflict, monotonic module completion,
     owner-only history/table permissions, unverified self-study labeling, zero
     writes to authoritative attempts/progress, cross-account/malformed/expired/
     revoked sessions, preserved archived session-security expiry behavior and
     anonymous RPC denial.
   - Separately replays the baseline with CRUD alone and repeats presence checks.
3. `digital/docs/integration-sync/SQL_ORDER.md` (new)
   - Records the complete archived-history-plus-candidates bootstrap, one operator
     order, scaling transaction requirements, wrapper contract, test command,
     current canonical-registration gap, and separate hosted deployment gates.
   - Explicitly notes that `schema.sql` alone lacks these candidate contracts and
     old full gateway replacements must not be replayed after the candidates.

## Exact verification evidence

Executed from `geodecoder-integration/digital`, both with exit code 0:

```sh
node --test --test-concurrency=1 tests/integration-sync-backend.test.mjs
```

**11 tests, 11 passed, 0 failed; duration 13,679.364616 ms.** Both combined install
orders and standalone CRUD passed. For each combined order, the PostgreSQL routine
hashes were exactly:

| Routine | MD5 after scaling |
|---|---|
| `private.geo_action(text,jsonb)` | `9325760e12030b1a9f16b9f55bf90180` |
| `public.geodecoder_duel_gateway(jsonb)` | `bbe21cbd9ef66ea8f0e2a04ab6c84968` |

```sh
node --test --test-concurrency=1 tests/classroom-crud-backend.test.mjs tests/offline-backend.test.mjs tests/scaling-database.test.mjs tests/backend-history.test.mjs
```

**19 tests, 19 passed, 0 failed; duration 48,413.164547 ms.** Includes standalone
CRUD retention/archive/invitation behavior, offline ownership/replay checks,
immutable-history replay, scaling admission/security/scoring/deadline contracts
and exact guarded rollback.

An additional file-hash check found all **11 archived migrations unchanged**
against `file_sha256`. `supabase/hosted-history.json` SHA-256 is
`a97e6c58932b93f5daf82660b91d924c5d84fa19f5e2a123cd492d37d2e11910`.

| File | SHA-256 at handoff |
|---|---|
| Pending CRUD migration | `ff5ee7c01869334e8521322988dc1a92449d9e53db3d7e4a301fb296bf7d3ffe` |
| Scaling source candidate (untouched) | `c034feddfa4e51e4af9edc95112a859ab2cd3dce13b7e2d6d77859f17952259a` |
| Offline SQL source (untouched) | `63480beadd07a15533a2b39e681bde69df30a034462120ce39de99b6582b157a` |
| New combined test | `93a803f0b6e2bd93b97271ab2c95b29ccf57c6d33ecad0c7df625f9f295c8f77` |
| New SQL order documentation | `7a357f194478efe819e72b610194262f9ba1ac865c358444158e0ffb8c5cfc6f` |

## Integration concerns and limits

- Canonical root registration of scaling/offline and their pending-migration
  allowlist is outside this agent's exclusive editable scope. The combined test
  intentionally references the reviewed source candidates until the integration
  owner chooses that registration. Root migration push alone currently omits
  scaling/offline; do not represent a source push as SQL deployment.
- The complete tested fresh-install route is the immutable archive plus the
  three candidates, as documented. `digital/backend/schema.sql` was not changed.
- Tests prove actual PostgreSQL SQL behavior locally, including read-only
  enforcement and tuple changes. They do not prove concurrent hosted PostgreSQL
  performance, production Auth JWT verification, hosted Realtime delivery, Edge
  deployment, physical device behavior or capacity at 5,000 users.
- The existing scaling rollback suite passes; no scaling fingerprints or
  historical SQL/hosted receipts were modified to obtain that result.

Coordination: reviewed the existing read-only SQL compatibility agent's report
at `sql-compatibility-report.md`; shared the exact
wrapper changes and passing evidence back with that agent for optional final
read-only review.
