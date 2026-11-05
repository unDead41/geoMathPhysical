# Formative persistence and deferred-sync audit

Status: **AUDIT COMPLETE; NATIVE IMPLEMENTATION BLOCKED BY FOUNDATION FREEZE**.
This document audits source behavior; it does not define Dart interfaces or SQL.

## Provenance and boundary

- Audited app/instruction SHA: `38f061af963256528d5060ff076bae9ee05eafc3`.
- Private branch: `app-cloud-game-worker-5-7395917`; initial tree clean.
- Worktree: `/workspace/scratch/7395917c0f68/worktrees/worker-5`.
- Digital package at this SHA: `2.9.0`; app documentation: `1.0.0`.
- Lead's remote read: firmware `main` is `25836eb1a6f24459aace8a3980ae880a13e3b488`,
  `v2.0.2`; current `main-digitalized` is `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`,
  package `2.9.1`. These remote heads are provenance, not this audit's tested tree.
- No Flutter package or `FOUNDATION_READY.json` exists at the audited app SHA.
  Lead reports `app-foundation` absent from the remote inventory/READY lookup.
  Pin the same verified READY SHA as learning before starting native work.
- Read root guidance/versioning, Prompt 3, COMMON_RULES, app architecture/contracts,
  SOR O01–O05/N01–N03, `digital/docs/OFFLINE_SYNC.md` and integration SQL order.
- This worker changes only this audit. No shared code, migrations, firmware,
  hosted services, credentials, or deployment receipts were changed.

## Canonical source map

Paths below are relative to the repository root at the audited SHA.

| Source | Relevant behavior |
|---|---|
| `digital/dist/offline-records.mjs:4–26` | Account/event IDs, version and payload allowlists |
| `digital/dist/offline-db.mjs:29–64` | Durable immutable enqueue, owner cap, ordered read, scoped ack |
| `digital/dist/offline-sync.mjs:30–105` | Unsaved memory, owner epoch, batch/ack/retry controller |
| `digital/dist/offline-runtime.mjs:39–113` | Remembered owner, teaching/solo hooks, wake/stop lifecycle |
| `digital/dist/module-progress.mjs:9–30,59–100` | Reflection validation, monotonic merge, separate local save |
| `digital/dist/cloud.mjs:159–184,236–246` | Session-bound JWT capture and exact offline RPC |
| `digital/backend/offline-sync.sql:25–140` | Canonical ingest/history, session ownership and receipts |
| `digital/docs/integration-sync/SQL_ORDER.md` | Installation dependency; source is not deployment |

## Allowed records and wire envelope

Local canonical event fields are exactly `owner,id,kind,content_version,payload`.
`owner` is an account UUID; `id` is 1–160 ASCII characters matching
`[A-Za-z0-9:_.-]`; `content_version` is the JSON integer `1`.
The request removes `owner`; the server derives ownership from Auth.
Use `geo_offline_sync` with `{action:'push',payload:{events:[...]}}` or
`{action:'history',payload:{}}`; do not invent another endpoint or capability RPC.

| Kind | Canonical fields and limits |
|---|---|
| `module` | activity: `net/volume/area/composite`; stage: `prediction/experiment/check/explanation`; prediction ≤240, result/explanation ≤600; completed boolean |
| `solo` | attempt_id, mode, ruleset, score, total, mistakes, hints, skipped, elapsed_ms |

Reflection text is validated before trimming; prohibited control characters are
rejected. Prediction is required; experiment/check/explanation require a result;
explanation requires an explanation. `completed:true` requires that final stage.
JS length uses UTF-16 units; PostgreSQL uses `char_length` and different trimming.
Preserve the canonical client boundary and test Unicode/whitespace explicitly.
Reflection merge cannot reduce stage or completed achievement. At the same stage,
valid later content can replace earlier content; completed stays completed.
Cloud module writes are student-only; solo history accepts an existing profile.

Solo `attempt_id` follows the ID grammar; modes are `quiz/practice/review`;
ruleset is `single-attempt-v1`; totals are 10/15/1–15 respectively.
All counts are integers in `[0,total]`, `score+mistakes+skipped=total`, and
elapsed_ms is an integer in `[0,604800000]`. Normalize to these fields only.
The current solo hook uses `solo:<attempt_id>`; validate the full event ID too.
Completed history must originate from a finished canonical engine result,
not an arbitrary caller-provided score. Repeated finalization reuses its ID.

Only these two kinds enter the queue. Guest data stays local without transfer.
Exclude Auth, profile/security, CRUD, PIN, classroom/Duel commands, support reports,
checkpoints, studio drafts and official marks. Tokens/passwords never enter the
record DTO, actor binding, queue, WebView, logs or handoff.

## Ownership, reconciliation and idempotency

- `OfflineDB` keys events by `(owner,id)`, orders by durable sequence, and performs
  existence/count/add in one read-write transaction. Identical repeats are no-ops;
  changed content under an existing ID aborts. Cap: 2000 durable pending per owner,
  with no eviction. Native must expose queue-full/storage failure clearly.
- `OfflineSync.setActor` increments epoch on owner changes, clears the projection,
  and prevents stale send responses from acknowledging another owner's queue.
  Unsaved memory is partitioned too. A→B→A must invalidate A's original flight.
- Same-owner session identity is additionally guarded by `_boundRpc`, which checks
  SDK ownership before/after send and sets the captured owner's Authorization JWT.
  A refresh retaining the JWT `session_id` remains the same session. Native needs
  owner/session/epoch/scope binding, not just a user-ID comparison after await.
- Remembered Auth ownership supports local work after retryable offline refresh;
  it is not server authorization. Explicit logout/account switch takes precedence.
- Ingest checks JWT subject plus a matching, unexpired `auth.sessions` row.
  Tables are private, RLS enabled and direct role access revoked; the authenticated
  RPC performs owner-scoped operations. Clients cannot nominate another owner.
- Receipt key `(user_id,event_id)` stores the immutable JSONB event. Replay of
  identical content is accepted without applying it twice; changed content is
  `id_conflict`. Solo additionally deduplicates `(user_id,attempt_id)` and rejects
  changed payloads under that attempt even with a different event ID.
- Per-event SQL subtransactions roll back a rejected event while preserving valid
  siblings. Module upsert is monotonic; self-study history is labelled
  `source:'offline-self-study', verified:false`, with the newest 50 returned.
  It does not alter classroom attempt/progress scores or verify mastery.

## Durability and the shared native writer/reader

The web queue atomically stores its canonical event and pending state in one
IndexedDB row. It does **not** provide a SQLite record-table/outbox transaction:
`ModuleProgress.handleMessage` saves localStorage first, then invokes `onRecord`;
the solo result hook likewise queues separately from the existing local stores.
Do not copy that composition pattern into the native record persistence path.

Foundation must freeze the actual `FormativeRecordWriter`/`FormativeRecordReader`
DTOs, receipts, table ownership and transaction capability before implementation.
Use one record schema/read model for learning reflections and completed solo
history, with one migration owner. Learning must not add a second reflection DB.
The guest/local implementation belongs to foundation; this feature supplies the
signed-in implementation through that same frozen port and contribution system.

For a signed-in save, the record update and immutable pending event must commit
in one `AppDatabase` transaction using its shared transaction handle. Both must
roll back on failure. Do not enqueue through a post-save stream/listener. Native
reader data must survive outbox acknowledgement/deletion. Duplicate completed
solo finalization creates neither a second history record nor a second event.
Keep failed canonical writes in owner-scoped memory for the live process and
retry persistence before sending. Return failed/unsaved truthfully; memory alone
is not durable, and force-stop can lose it. EX11 must reach learning via receipt.
No Dart signatures, migration IDs or database package are invented by this audit.

## Batch and acknowledgement behavior

One controller flight per owner epoch reads at most 20 pending events. Server
push also accepts only 1–20, ≤128 KiB request JSON and ≤8 KiB per event; unknown
request/event/payload fields are rejected. Local normalization strips extras.
An accepted list must be an array, contain no duplicate IDs and be a subset of
the sent batch. Missing/malformed/unknown/duplicate acknowledgements retain all
affected pending events. An empty accepted array is not delivery success.
Partial acknowledgements remove only named events through an owner-scoped
transaction. Valid accepted IDs can commit while rejected/unacknowledged ones
remain; a permanent per-event rejection blocks auto retry. Ack-write failure
retains durable rows for replay with the same IDs. Connectivity is not an ack.
Native should validate rejection IDs/codes and returned record DTOs as well,
and never let an acknowledgement delete a different owner or replacement body.

## Retry and lifecycle findings to resolve natively

| Finding | Actual source behavior | Native acceptance requirement |
|---|---|---|
| Retry-After missing | Offline transport discards delay metadata; sync computes its own delay | Carry server delay in frozen failures and honor it across wake/retry triggers |
| No finite automatic budget | First failure delays 2000–2999 ms; exponential component saturates at 256000 ms, plus <1000 ms jitter; attempts keep running | Bounded attempts with an explicit stopped reason and user/foreground recovery policy |
| Halted state can reopen implicitly | needs-auth/unavailable/blocked/storage-failed normally halt; enqueue unconditionally changes status to pending | A new record must not silently restart an unresolved permanent/auth/capability failure |
| Disposal is incomplete | stop removes listeners/timer and blocks new wake; active send can still ack and emit UI state | Cancel or ignore disposed-scope responses; prevent new polling/UI delivery after stop |

Canonical mapping: expired/changed/missing sessions → `needs-auth`; missing RPC
PGRST202/42883 → `unavailable`; validation/forbidden/id_conflict → `blocked`;
failed local write/ack → `storage-failed`; transient failure → pending/backoff.
HTTP 5xx stays transient even with a misleading permanent-looking error code.
Native must also classify remaining permanent errors rather than retry forever.
Keep `local/pending/syncing/synced` distinct; `synced` cannot hide unsaved events.
Runtime coalesces wake calls and uses online/focus/visibility/reopen triggers.
Native foreground/reopen is the primary path; no delivery guarantee after OS kill.
Use one scoped scheduler; cached read success cannot override denied access,
conflict or revoked membership. Keep credentials in the protected session owner.

## Executed verification and limits

- Node `v24.22.1`; dependencies used at existing exact pins:
  `@supabase/supabase-js 2.118.0`, `@electric-sql/pglite 0.5.11`, `jsdom 30.1.3`.
- `node --test tests/offline-sync.test.mjs`: **19/19 PASS**, exit 0.
- From `digital`: `node --test --test-concurrency=1 tests/offline-sync.test.mjs tests/offline-cloud.test.mjs tests/offline-runtime.test.mjs tests/offline-backend.test.mjs tests/integration-sync-backend.test.mjs`:
  **55/55 PASS**, exit 0, including SQL archived history and both candidate orders.
- Inline Node probes against the actual modules: partial/missing/duplicate/unknown
  acks and partial rejection passed; 600000 ms retry hint produced 2000 ms delay;
  13 transient failures stayed pending; enqueue reopened blocked; stop mid-send
  still acknowledged and updated the view. These reproduce the findings above.
- `python tools/check_version.py`: exit 0 for inherited Digital-tree firmware
  `v1.1.3`; this does not supersede the lead's actual remote main `v2.0.2` read.
- Controller tests use in-memory DB fixtures; SQL tests use real PGlite PostgreSQL
  with synthetic Auth. This is not SQLite rollback/crash or real Auth proof.
- No Android/Flutter build, actual SQLite/IndexedDB reopen/cap stress, physical
  device, hosted sync/RLS/Realtime, production migration or capacity test ran.
- SQL dependency remains the 11 immutable hosted-history sources, then complete
  scaling transaction, CRUD transaction and offline transaction. Do not replay
  legacy schema after them or infer hosted activation from Git/local tests.

Next: verify the common READY SHA/hashes and shared transaction/read-write freeze;
then implement and test T05/T07/T11 rollback, DB reopen, cap 2000, actor/session
switches, immutable IDs, all ack cases, retry delays/budget and disposal behavior.
