# Independent final review

Reviewed `ca9d77e1a90a8ce11420f6dda0f14e25ac8a4420` against `49b471afe9ce3e5ca72048b25ef088f19cfada95` and `CONTRACT.md`. Read-only source/test review; no source edits, test reruns, push, hosted mutation or credential/config access.

Follow-up review examined only the three-file profile delta `7eebc72180b9d18508c637e9eb47ac07fd064620..8492c4b37d0266df4ceb96d5450cb757cb796d13` for the sole finding below.

## Verdict

**Approved after the profile fix.** No unresolved Critical or Important findings in the reviewed scope. Combined checks and hosted/device acceptance remain with the parent.

## Resolved Important finding

### A malformed profile refresh previously cleared the uncertain-write barrier

Locations:

- `apps/geomath_flutter/lib/features/profile/data/profile_repository.dart:95`
- `apps/geomath_flutter/lib/features/profile/presentation/profile_screen.dart:117`
- `apps/geomath_flutter/lib/features/profile/presentation/profile_screen.dart:120`

Before the fix, `GatewayProfileRepository.load()` used `reply.data['profile'] == null` to accept a verified missing profile. That also accepted an omitted key: a successful HTTP response containing `{}` returned `Success(null)`. `ProfileScreen._load()` then marked the profile loaded and cleared `_unknownOutcome`.

Concrete prior sequence: a profile save committed but its acknowledgement was lost or malformed; the new save guard correctly blocked another write. A following malformed 200 `{}` refresh cleared the guard and displayed completion without a verified snapshot. The permissive repository line predated the initial diff, but the new presentation relied on it as its reconciliation boundary.

Resolved by `8492c4b37d0266df4ceb96d5450cb757cb796d13`: `profile_repository.dart:97` rejects omitted `profile` fields with `profile.invalidResponse`, while line 105 retains explicit `{'profile': null}` compatibility. The existing screen failure path therefore preserves the draft/base and leaves `_unknownOutcome` closed. Invalid initial snapshots also remain failed loads.

The repository regression covers missing envelopes and invalid profile types alongside explicit-null compatibility. The production `NativeAuthRepository` fixture flow now covers both lost and malformed save acknowledgements followed by refresh 200 `{}`: Save stays disabled, the edited name is retained, completion is absent, an error is shown and no second write is sent. A later valid refresh permits the explicit next write. The source and targeted tests resolve the finding; no passing suites were rerun during this follow-up review.

## Other reviewed contracts

- The mathematical presenter imports only Flutter and receives public strings. The actual BM/English bank and Duel fixture equations fit its bounded grammar. Multiplication, source-symbol legends, powers, grouped numerators and denominators, and spoken grouping are preserved. Duel callers introduce no local bank/answer lookup.
- The shared carousel has no selection/scan callback; arrow/swipe paths only scroll. Callers preserve choice order/keys and explicit tap/scan boundaries. Scope keys use public attempt/question/stage/session identity; preferences do not reset browsing. Solo pause keeps the carousel mounted. No engine/RNG/scoring change was introduced.
- Duel gesture guards bind the actor, session generation, current snapshot, route, foreground/controller readiness and deadline. Protocol commands and scores remain server-owned. The legacy gateway header is derived only from the configured public anon key; modern publishable keys remain apikey-only and no user-session credential is consulted.
- Classroom management and lifecycle controls now use the same `ownsRoom` predicate as controller authorization. The existing revision, pending-command and reconciliation paths remain intact.
- Profile field validation, actor/generation checks, server role adoption, and actual security-route binding remain intact. The malformed-read gap is resolved as recorded above.
- Reviewed the supplied 320dp/150% widget coverage and feature reports. Passing suites were not rerun. Hosted authenticated acceptance and physical-device/APK verification remain separate acceptance limits.
