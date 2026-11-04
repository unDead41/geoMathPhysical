# Classroom management API

Candidate based on Digital v2.8.0, source `391df985eea4fee15d9859e678068b1a3f613cba`.
Canonical upgrade: `supabase/migrations/20261104014958_geodecoder_classroom_crud.sql`.
Apply it **after** the immutable hosted history, including v2.7 integration. Do not rerun old schema/dispatcher files over this migration. It is a source candidate, not a deployment receipt.

The existing authenticated `public.geo_action(action,payload)` transport is retained. New snapshots advertise `classroom_crud: 1`. New controls stay hidden against older backends.

| Action | Exact payload keys | Permission and effect |
|---|---|---|
| `rename_class` | `class_id`, `expected_revision`, `name` | Class owner; name is trimmed, 2–60 characters without controls |
| `rename_room` | `room_id`, `expected_revision`, `name` | Room/class owner; no change to status, bank, timing or score |
| `archive_class`, `restore_class` | `class_id`, `expected_revision` | Owner; archive is blocked while any child room is playing |
| `archive_room`, `restore_room` | `room_id`, `expected_revision` | Owner; archive is blocked while playing; parent must be active |
| `delete_class` | `class_id`, `expected_revision` | Owner; no members, rooms or invitations may exist |
| `delete_room` | `room_id`, `expected_revision` | Owner; no room members, attempts or progress may exist; not playing |
| `remove_member` | `class_id`, `user_id`, `expected_revision` | Owner; no class room may be playing; removes class access and pending/accepted invitation |
| `cancel_invite` | `invite_id` | Owning teacher; pending invitations only |
| `decline_invite` | `invite_id` | Named student; pending invitations only |

`expected_revision` is a JSON nonnegative integer. Unknown fields, supplied owner IDs and malformed IDs are rejected. Revision mismatch returns `conflict`; refresh explicitly before retrying. These actions are single-flight in the UI. A network failure can have an uncertain outcome: refresh before retrying a destructive operation. Deletions return `deleted_class_id` or `deleted_room_id`; room deletion also returns `class_id` for navigation.

## Retention and permissions

Archive retains members, invitations, attempts, event UUIDs, answers, scores and module reflections. Join codes for the archived scope are invalidated. Restore does not reopen a closed room or recreate a code; use the existing PIN action when needed. Archived scopes reject enrollment, creation, PIN rotation and game starts/events. Existing members may still read old room results; student UI does not offer new activity there.

Removing a learner deletes only `class_members` and the learner's invitation for that class. It deliberately retains `room_members`: its existing foreign keys cascade deletion into attempts/progress. Room snapshot, Realtime RLS and game writes additionally require current class membership. Removing someone is not an account ban: a valid PIN or a new accepted invitation can enroll them again and restore access to their original attempt. The teacher can rotate PINs using the existing controls when needed.

Each invitation issuance gets a new UUID, including resends. Stale Accept/Cancel/Decline confirmations cannot consume a newer invitation. Heartbeats update presence only for current class members and, when supplied, only the selected room; they never reproject game scores or timing.

The private gateway authenticates the actor, checks stored ownership and serializes lifecycle mutations with the existing dispatcher using user → class → room → attempt lock order. The original private dispatcher is no longer directly executable by frontend roles. Public wrappers remain security invoker; privileged gateways stay in `private` with an empty search path. No new exposed tables or service keys are added. Existing class module-progress access follows the current class membership rows.

## Integration

1. Recheck source and the actual hosted migration history; retain the existing history gate.
2. Review this additive migration alongside any scaling/offline branch migrations. Never redeploy the historical `schema.sql` or `profile_v2_3.sql` after it: those redefine dispatchers and grants.
3. Apply the new migration through the authorized backend deployment process. Run local SQL suites and approved hosted rollback checks before releasing frontend assets.
4. Rebuild the combined portal source and generated distribution aliases; this branch keeps source changes separate from the parallel UI branches' generated releases.
5. Test real teacher/student Auth, Realtime revocation and cross-account behavior on staging/production. Local PGlite and a synthetic browser Auth adapter are not evidence of live GoTrue or network event delivery.

Local verification: `node --test digital/tests/classroom-crud-backend.test.mjs`; `node --test digital/tests/classroom-crud-portal.test.mjs`; `node digital/tests/classroom-crud.browser.mjs`; `cd digital && npm test`.
