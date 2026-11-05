# Native classroom resume receipt

Completed on 5 November 2026 in `/workspace/scratch/7395917c0f68/native-worktrees/worker-2`.
Branch: `app-cloud-game-native-worker-2`. No push, hosted request, deployment,
migration, Auth provider change or firmware change was performed.

## Commits and ownership

- Existing implementation: `2cc39f76334258b508f00b115f297c5cc46c43ab`.
- Resume fixes: `7d01da97df93d3eb2e34c7877671a9d954568161`.
- Foundation adoption parent: `41b5774694c83b9d2464df4bbc3bc55046a79dd8`;
  published READY reference remains `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`.
- App version remains `0.1.0+1`.
- New commit changes only `apps/geomath_flutter/lib/features/classroom/**`
  and `apps/geomath_flutter/test/features/classroom/**` (seven files).
- `lib/features/auth` remains the pre-existing untracked reference symlink to
  worker-1. It was not added, modified or committed. No other owned files were
  changed. Final worktree status contains only this reference symlink.

The normal `git commit` path encountered a missing unchanged `.gitattributes`
blob in the reconstructed sparse object database. The private local commit was
created with `git write-tree --missing-ok`, `git commit-tree` and an expected-old
`git update-ref`. This preserves every unchanged tree reference. The resulting
commit's changed-path list and `git diff HEAD^ HEAD --check` were verified.

## Completed fixes

1. Live attempt leave/confirmation actions capture actor, controller generation,
   class, room, attempt and pending event identity. Both toolbar confirmation
   and contributed back policy also verify route instance/currentness after the
   dialog. A stale confirmation cannot clear a replacement room/attempt or its
   unresolved event, including replacement under the same actor.
2. Dashboard authorization failures purge sensitive projections and stop
   automatic reads across polling, visibility and lifecycle changes. A denied
   room read allows one dashboard fallback; a denied fallback stays stopped.
   Explicit refresh or a new actor can recover without an authorization loop.
3. Unknown mutation outcomes remain blocked until explicit server
   reconciliation, preserving management text and captured revision. The shared
   native Auth gateway maps HTTP 503 to `FailureCode.unavailable`; classroom
   now conservatively treats that transport failure as uncertain for mutations.
   Unconfigured classroom preflight remains a known unavailable result. Raw
   gateway HTTP 5xx and 429 statuses take precedence over untrusted body codes.
4. Real composition tests instantiate the actual registered
   `NativeAuthRepository`, `authFeature()` gateway service and classroom
   repository with a test-only wire transport. They prove that a foundation
   binding alone does not authorize an RPC, classroom borrows the single Auth
   owner, verified requests target `/rest/v1/rpc/geo_action`, invitation cancel
   sends only `invite_id`, a 503 preserves the draft until reconciliation, and
   a late gateway response cannot repopulate a replacement session.

Official classroom score/stage/time state still comes exclusively from parsed
server projections. The UI clock is display-only; no local score evaluator or
offline classroom queue was added. Closed rooms stay closed, archive restore
does not mint PINs, and unknown game events retain their original event payload.

## Canonical audit and shared dependencies

Read root `AGENTS.md`, `docs/SOR_VERSIONING.md`, classroom prompt and common rules,
the frozen foundation contract/READY receipt, the available app README/SOR,
existing feature implementation/tests, and the shared Auth gateway implementation.

Audited current canonical source at
`752ce908d16d13acc9cc7510797e8363d182c3f5` using the parent's retained files in
`/workspace/scratch/7395917c0f68/canonical-current/digital/`:

- `dist/cloud.mjs`: authenticated `geo_action` RPC with `{action,payload}`.
- `backend/classroom-crud/README.md` and `docs/classroom-crud/HANDOFF.md`:
  capability `classroom_crud:1`, revision scope, retention and authorization.
- Retrieved current `supabase/migrations/20261104014958_geodecoder_classroom_crud.sql`
  read-only through GitHub. Blob `fd6e69d8c6f8bc319fa94ac2d58a079ba9c34cc6`
  matches the pinned foundation canonical source at
  `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`.
- Also checked pinned `digital/docs/integration-sync/README.md`, `SQL_ORDER.md`
  and historical `digital/backend/schema.sql` for RPC, snapshots and game event
  behavior. No old schema file was applied anywhere.

The exact management payloads match current SQL: revision applies to class/room
rename/archive/restore/delete and remove-member. `cancel_invite` and
`decline_invite` accept the issuance UUID in `invite_id` only. Ownership remains
server-authoritative; local preflight only prevents obviously invalid actions.

The shared Auth reference was worker-1 HEAD
`e2bb4474d6502549a78fdbe61b7b2c4928886aa3` when the final receipt was read.
Relevant file SHA-256 values:

| File | SHA-256 |
| --- | --- |
| `FOUNDATION_CONTRACT.md` | `0a31f7aef121a151ee91a4ae92250fd893ad62108f27a9389b5fa5ed9a918356` |
| `FOUNDATION_READY.json` | `14d6631e3ea81905e40eea70dc958fd64cfa97582c4a7aee754b4c1f3b455f4a` |
| Auth `data/native_auth_repository.dart` | `4394bcfa2a43dba9935af4cd4fcba01b05827865caf6c798f0d6c5c715a8be7e` |
| Auth `data/cloud_gateway.dart` | `2476b818d7924eb234401f2079a97466b05eb3636819e75740e089164d3bb6d6` |
| Auth `auth_feature.dart` | `92d327340eefde2b7c051ef51cfc62faff9b4836a462ef9d7d9cc3636efa9bd5` |

## Verification

Runtime: Flutter `3.47.9`, Dart `3.13.7`; toolchain at
`/workspace/scratch/7395917c0f68/toolchains/flutter/bin/flutter`.
Flutter commands ran from `native-worktrees/worker-2/apps/geomath_flutter`.

| Check | Result | Evidence |
| --- | --- | --- |
| `flutter test --no-pub test/features/classroom --reporter expanded` | Exit 0, **41 passed**, 0 failed | `evidence/classroom-native/resume/tests.log` |
| `flutter analyze --no-pub lib/features/classroom test/features/classroom` | Exit 0, no issues | `evidence/classroom-native/resume/analyze.log` |
| `dart format --output=none --set-exit-if-changed apps/geomath_flutter/lib/features/classroom apps/geomath_flutter/test/features/classroom` from worktree root | Exit 0, 12 files, 0 changes | `evidence/classroom-native/resume/format.log` |
| `git diff HEAD^ HEAD --check` | Exit 0 | Command receipt in task session |

The passing suite covers two actors/two classes, revision conflict and preserved
draft, invite reissuance UUID, exact payload rejection, closed/archive/playing
guards, removed access, immutable game event retry, official projections,
session/scope response races, lifecycle polling, denial-loop prevention, real
gateway sharing, and native dialogs/layout at 320dp/BM/English/dark/150% text.
The additional gateway tests use an explicitly test-only transport/store. They
are not evidence of hosted Auth, Android Keystore or real network delivery.

## Integration needs and remaining gates

- Integrator should retain/import the existing classroom implementation commit
  and apply resume commit `7d01da97df93d3eb2e34c7877671a9d954568161` after it.
- Register Auth contribution before resolving classroom services. The classroom
  repository resolves `AuthServices.gateway`; the real native Auth repository
  supplies this port. Classroom and Auth must use the same foundation sessions.
- No new dependencies, migrations, platform permissions, routes or l10n keys are
  requested by this follow-up. Existing route is `cloud-game-classes` `/classes`.
- Parent owns combined preview, Android build/device testing, screenshots,
  integration/handoff files and publication. No Android test or APK build was
  run by this worker during the resume.
- Hosted classroom CRUD activation, real teacher/student sessions, member
  revocation/reconnect, access-policy behavior and live gateway availability
  remain unverified. Those need a valid authorized staging environment. Local
  fixture passes do not establish hosted deployment or production capacity.
- Some archived docs/main objects are absent from this reconstructed sparse
  checkout (`main` history inspection fails on missing tree). No firmware/main
  change was needed or made.
