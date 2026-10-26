> **v2.6.0 deployment disahkan:** Projek hosted GeoDecoder Digital telah menerima `profile_v2_3.sql` dan `module_progress_v2_4.sql` dalam migration transaksi `20261026050330` (`geodecoder_profile_and_module_progress_v2_6`), selepas kebenaran jelas pengguna. Kedua-dua ujian SQL hosted lulus dan semua fixture di-rollback. Avatar/RPC/rekod kemajuan serta grants/RLS telah disahkan. Resit: `../docs/integration-evidence/deployment-v2.6-20261026.json`.

> **Upgrade projek lain:** Selepas schema kelas/email v2.2, pasang migration profil dan kemajuan sebelum frontend. `schema.sql` ialah keadaan lengkap pemasangan baharu. Jangan jalankan semula migration dispatcher lama selepas kontrak baharu tanpa menyemak definisi akhirnya. Lihat `../docs/PROFILE.md` dan `../docs/RELEASE_V2_6.md`.

> **v2.2.0 email:** Signup baharu menggunakan email sebenar dan pengesahan Auth; login menerima email/username. Jalankan `email_v2_2.sql` untuk database sedia ada, deploy auth/index.ts, kemudian lengkapkan Site URL/redirect dan custom SMTP mengikut `../docs/EMAIL_SETUP.md`. `schema.sql` sudah mengandungi trigger yang sama. `verify_email.sql` serta `verify.sql` menguji dengan rollback. Akaun lama dan kod pemulihannya dikekalkan. Bahagian username-only di bawah menerangkan keluaran terdahulu.

# GeoDecoder V2 backend

**Sesi Aktif v2.7.0 candidate:** jalankan migration tambahan selepas schema
sedia ada, termasuk bagi pemasangan baharu. RPC baca sahaja dan skop logout
didokumenkan dalam [security/README.md](security/README.md). Tiada dispatcher
kelas/profil/kemajuan atau Auth settings diganti. Deployment projek hosted
direkod dalam [ACTIVE_SESSIONS.md](../docs/ACTIVE_SESSIONS.md).

Apply `schema.sql` as the Supabase database owner, then run `verify.sql` with the same privileges. The schema is repeatable for this version (`IF NOT EXISTS`, replaceable functions, deterministic bank upsert). Future structural changes should use a migration rather than treating this file as a general upgrade engine. The verification transaction creates five temporary Auth users, exercises real SQL roles and RPCs, and rolls everything back. It requires no pgTAP dependency. PostgreSQL `ASSERT` failures stop the test.

The browser uses the Supabase project URL and publishable/anon key. The service-role key belongs exclusively to the username authentication Edge Function. Do not expose the `private` schema through the Data API. No browser writes to any table are permitted.

## Database API

`geo_action(action text, payload jsonb default '{}')` is available to `authenticated`. Expected failures return `{ "error": { "code": "…", "message": "…" } }`; callers must check this before using a response. Returning a normal JSON error is essential for retaining failed-PIN counters. Anonymous execution is revoked.

| Action | Payload | Result |
| --- | --- | --- |
| `snapshot` | optional `room_id` | Account, classes, invites, rooms, optional room and own attempt |
| `update_profile` | `display_name` (2–60 aksara), `avatar` (enam ID terbina dalam); tiada kunci tambahan | Snapshot profil sendiri; peranan/identiti kekal |
| `heartbeat` | optional `room_id` | Same snapshot; updates own profile and progress presence |
| `create_class` | `name` | Snapshot plus `class_id` |
| `invite` | `class_id`, `username` | Snapshot plus `invite_id` |
| `accept_invite` | `invite_id` | Snapshot plus `class_id` |
| `create_room` | `class_id`, `name` | Room snapshot plus `room_id` |
| `rotate_pin` | `kind: "class" \| "room"`, `id` | Refreshed snapshot |
| `join_pin` | six-character digit string `pin` | Snapshot plus `class_id` and optional `room_id` |
| `join_room` | `room_id` | Room snapshot plus `room_id`; requires class membership |
| `set_room` | `room_id`, `status` | Room snapshot |
| `start_attempt` | `room_id` | `{state}`; resumes the existing attempt if present |
| `answer` | `attempt_id`, `kind`, `shape`, `target`, `index`, UUID `event_id` | `{state,result}` |
| `hint`, `skip`, `advance` | `attempt_id`, `index`, UUID `event_id` | `{state,result}` |

`answer.kind` is `solid` or `net`; `target` is `r1` or `r2`; `shape` is `cube`, `cuboid`, `pyramid`, `cylinder` or `cone`. The question index is zero based. `result.type` follows the game engine (`solid`, `wrong`, `correct`, `blocked`, `stage`, `kind`). Successful hint, skip and advance actions use `correct` as their acknowledgement; render the returned state to determine their effect. `stage` includes the required `target`, and `kind` includes the required `kind`.

The state keeps the core game's camelCase fields: `attemptId`, `roomId`, `questions` (ID strings), `index`, `stage`, `status`, `score`, `mistakes`, `hints`, `skipped`, `elapsed`, `hintUsed`, `attempts`, `lastOutcome`, `wrongReader`, `answers`, `readyInMs`. Answer records preserve `id`, `shape`, `topic`, `outcome`, `hint`, `failedAt`, `attempts`, `elapsed`, `firstTry`. Other entity fields use snake_case.

The Edge Function alone may call:

| RPC | Parameters | Result |
| --- | --- | --- |
| `geo_provision` | `p_user_id`, `p_username`, `p_display_name`, `p_role`, `p_auth_email`, `p_recovery_hash` | `{profile}` or a normal error; duplicate ID/username is rejected |
| `geo_identity` | `p_username` | `{id,user_id,username,auth_email,recovery_hash}` or JSON `null` |
| `geo_rate_guard` | `p_key`, `p_limit`, `p_window` (seconds) | JSON boolean; denied requests are counted |

Create the Supabase Auth user first with a randomized internal address such as `UUID@accounts.geodecoder.invalid`, then provision its private account. Provisioning validates that the UUID and internal address match the Auth record. Username normalization is lowercase plus trimming; accepted characters are `^[a-z0-9_]{3,24}$`. Display names are 2–60 characters and roles are `teacher`/`student`. Auth metadata is never used for authorization. The account username, ID and role are immutable after provisioning. Password validation and recovery-code hashing/reset are the Edge Function's responsibility. The stored recovery hash and internal email are available only through the service-role identity RPC.

## Rooms, PINs and privacy

PINs are uniformly generated with `pgcrypto.gen_random_bytes`, retain leading zeros, and expire after 24 hours. The generator discovers pgcrypto's installed extension schema. Global PIN uniqueness covers class and room codes. Rotation takes the target lock, removes the old code and generates a different one. After eight invalid guesses per student within 15 minutes, joining with a PIN is blocked until that window expires. Invalid and expired codes share the same error. PINs and `pin_expires_at` appear only in their owner's snapshots. Student values are JSON `null`.

A class PIN enrolls a student in the class. A room PIN enrolls the student in its class and room. A username invitation is accepted by its named student. Teachers can view only their own class roster; students receive an empty `members` array. The room list is visible to the teacher and class members. Each item includes `is_member` for the caller; room details and leaderboard rows require room membership or ownership. Closed rooms offer result access only to their owner or enrolled room members.

Rooms transition `open → playing → closed`; closed is terminal. Joining while open or playing is allowed. Attempts start only while playing, one per student per room. Closing a room stops unfinished attempts and preserves their partial answers and settled time. Completed attempts keep their finished status and result.

## Authoritative scoring and timing

The canonical 15 questions are seeded from `dist/questions.mjs`; topic labels follow `questionTopic` in `dist/core.mjs`. Room creation selects two unique questions for each of the five shapes and shuffles the same ten IDs for every student. The answer bank and all attempt records live in the private schema.

Correct R1 unlocks R2. A wrong answer at either stage settles the entire question with zero points and no retry. Correct R2 adds exactly one point. Skipping adds zero. Each question counts a hint at most once. There is no client-supplied score or elapsed-time field. Wrong/skipped review requires at least 1,800 ms and correct feedback at least 900 ms before advancing.

Every game mutation locks the attempt row and validates ownership. Replaying an event UUID with the same payload returns the current state and original acknowledgement without scoring twice. Reusing that UUID with another payload returns `event_conflict`. Too-early `advance` events are intentionally not recorded so a queued retry can succeed once ready; stale question indices cannot advance again. Persist pending event UUIDs across reconnects and apply returned state rather than optimistic score changes.

`state.elapsed` is cumulative answering milliseconds at the server's current time. It includes an active question's running interval. `public.room_progress.elapsed_ms` is the settled cumulative base; add `max(0, serverNow − timer_started_at)` only when `timer_started_at` is non-null. Review and feedback have no running timer. Server time is returned as `server_now` for client clock offset. The timer continues while the student is disconnected and resumes from server state on reload. Room closure settles any currently running interval.

## Realtime

Subscribe to `postgres_changes` for `public.room_progress` with `room_id=eq.ROOM_UUID`. The schema adds this sanitized table to an existing `supabase_realtime` publication. If the project has no such publication, enable the table in the Supabase Realtime dashboard. RLS permits SELECT only to the room's teacher and enrolled room members. All authoritative entities and functions remain outside the exposed schema, and authenticated INSERT/UPDATE/DELETE privileges are revoked.

The sanitized row contains `room_id`, `user_id`, `username`, `display_name`, `status`, `question_index`, `score`, `total`, `mistakes`, `hints`, `skipped`, `elapsed_ms`, `timer_started_at`, `updated_at`, `last_seen`. The primary key is `(room_id,user_id)`. Projection status maps running to `playing`, feedback/review to `review`, plus `waiting`, `finished` and `closed`. Refresh `snapshot` after reconnect to recover events missed while offline.

The free project may pause when inactive. The client should display recoverable connection errors and retry; this backend requires no paid database feature. Verify actual publication delivery through the deployed browser in addition to the rolled-back SQL suite.


## Module progress RPC

`public.geo_module_progress(action text, payload jsonb)` hanya boleh dilaksanakan
oleh `authenticated`. Tindakan `mine` membaca rekod pelajar sendiri; `save`
menyimpan refleksi aktiviti sendiri; `class` hanya dibenarkan kepada guru untuk
kelas miliknya. Payload tidak boleh menentukan pemilik, role atau markah.
`private.module_progress` menggunakan RLS dan tiada akses jadual terus untuk
anon/authenticated/service_role; gateway yang disemak menguatkuasakan pemilikan.

Rekod latihan kendiri tidak menjadi markah room atau pengesahan TP. Ujian
`verify_profile.sql` dan `verify_module_progress.sql` menggunakan fixture rawak
dan rollback. Deployment ini tidak mengesahkan penghantaran email atau aliran
kata laluan pengguna sebenar.
