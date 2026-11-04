# Integrated classroom, offline and scaling SQL

These are source candidates. A source merge or push does not deploy SQL, update
hosted migration receipts, deploy Edge functions or publish the frontend.

Use the following complete bootstrap for a new disposable database, or apply only
the pending steps to an existing database whose history matches the baseline.
Supabase supplies Auth; the local regression fixture provides synthetic Auth
tables and JWT claims solely for testing.

| Order | SQL source | Execution requirement |
|---|---|---|
| 1 | The 11 entries in [`supabase/hosted-history.json`](../../../supabase/hosted-history.json), using each recorded `file` from [`supabase/migrations`](../../../supabase/migrations) in manifest order | Preserve every archived file and its recorded SHA-256. |
| 2 | [`20261104014211_geodecoder_scaling_v1.sql`](../../backend/scaling/supabase/migrations/20261104014211_geodecoder_scaling_v1.sql) | Run the entire file in one transaction. Its policy-table creation and before/after routine fingerprint checks must commit together. |
| 3 | [`20261104014958_geodecoder_classroom_crud.sql`](../../../supabase/migrations/20261104014958_geodecoder_classroom_crud.sql) | The file owns its transaction. It routes the public classroom gateway through the lifecycle guards. |
| 4 | [`offline-sync.sql`](../../backend/offline-sync.sql) | The file owns its transaction. It requires the existing module-progress functions and Supabase Auth sessions. |

The paths above identify the reviewed SQL sources. Scaling and offline currently
remain feature candidates outside the root migration directory. Before using a
normal root migration deployment, the backend owner must register the exact
reviewed candidates in that canonical deployment stream with unique versions and
adjust its pending-migration allowlist. Do not run a general database push from a
partial feature directory, and do not infer deployment from this ordered list.

`digital/backend/schema.sql` alone is the older installation contract. For this
integration, the archived-history bootstrap followed by all three candidates is
the complete tested installation path. Do not rerun older schema, profile or
gateway replacements after the candidates; they can restore old routing, grants
or dispatcher bodies.

The CRUD wrapper handles snapshots before taking the account mutation lock.
Snapshots are read-only and do not refresh presence. Heartbeats update profile
and selected-room presence only when older than 15 seconds, and room writes still
require current class membership. This behavior also works with CRUD installed
before scaling, while management/game mutations retain their established user →
class → room → attempt lock order. Direct authenticated execution of the legacy
`private.geo_action` remains revoked, so callers cannot bypass lifecycle checks.

The scaling candidate still verifies the original private classroom dispatcher
and Duel gateway fingerprints. The CRUD wrapper does not edit either guarded
body. Local tests also replay CRUD → offline → scaling to prove order compatibility;
the order above is the single operator handoff order.

Run the focused regression from `digital`:

```sh
node --test --test-concurrency=1 tests/integration-sync-backend.test.mjs tests/classroom-crud-backend.test.mjs tests/offline-backend.test.mjs tests/scaling-database.test.mjs tests/backend-history.test.mjs
```

The combined test replays all 11 immutable migrations in real PGlite PostgreSQL,
then both candidate orders. It checks final routine fingerprints and ACLs,
snapshots inside a read-only transaction, heartbeat tuple coalescing and room
scoping, lifecycle ownership/archive/revision guards, retained attempts and
Realtime SELECT RLS after member removal, and offline replay/history/session
ownership without changes to classroom scores. It separately tests CRUD before
either other candidate is installed.

These local checks do not establish hosted Auth/Realtime behavior, concurrent
PostgreSQL performance or a user-capacity limit. Before a separately authorized
deployment, obtain a fresh hosted history export for
[`check-history.mjs`](../../backend/operations/check-history.mjs), verify backup and
restore, run the complete registered order in staging, then verify actual
teacher/student sessions, permissions, retained results and rollback. Record SQL,
Edge and frontend deployment results separately. Append hosted-history receipts
only after an actual successful hosted deployment.
