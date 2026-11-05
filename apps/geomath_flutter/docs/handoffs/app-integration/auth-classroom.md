# Auth and classroom integration audit

Host verification passed on cloud-game local source `bfd46a3023d68a631a39c5486a1769c0375e7a39`, based on foundation READY `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`. Parent integration must verify runtime fingerprints against the remote cloud head and rerun the final merged suite. [Receipt](evidence/auth-classroom/receipt.json) identifies exact commands, logs, source hashes and limitations.

## Shared owners

- `authFeature()` provides the one `NativeAuthRepository`. `AuthServices.gateway` resolves that same instance. Profile and classroom borrow the gateway; sync shares its verified session owner. A manually bound account ID does not grant RPC credentials.
- `NativeAuthDriver` creates scoped `GoTrueClient` instances, not a global Supabase singleton. Token refresh is owned by the repository; its SDK clients set `autoRefreshToken:false`. PKCE stays in the existing protected envelope.
- No client role/profile metadata authorizes a class command. Current server responses supply profile role, membership, revisions and attempt results. The client enforces input/actor guards before transport and checks actor scope again after responses.
- Classroom mutations, PINs, authentication and live room play do not enter the formative outbox. Unknown mutation outcomes retain the draft and require server reconciliation before repeating.

## Callback ownership and capability

The locked app_links 7.2.2 / platform interface 2.0.4 transport uses `com.llfbandit.app_links/messages` / `getInitialLink` and `com.llfbandit.app_links/events`. `NativeAuthRepository` owns the sole listener, attached only when native callback capability is enabled. Initial/warm duplicate callbacks are coalesced and pending PKCE intent consumption prevents replay adoption.

The Android integrator owns the VIEW filter with DEFAULT/BROWSABLE, scheme `com.geomath.dev`, host `auth` and path `/callback`. Flutter built-in deep linking should be disabled for that Activity so it does not compete with app_links. Adding a manifest filter alone does not justify enabling `nativeCallbackReady`: the identical hosted redirect allowlist and cold/warm/replayed/expired flows still need verification. Keep the capability false for an offline milestone. No hosted Auth/provider setting or deployment was changed by this worker.

## Verification

| Check | Result | Boundary |
| --- | --- | --- |
| Auth and classroom unit/widget suites | 117/117 passed | Explicit transport/server fixtures; no hosted actor |
| Locked plugin channel compatibility | 2/2 passed | Real Dart MethodChannel/EventChannel with fixture native messages |
| New regression analyzer | 0 issues | Scoped test only |

The auth suite checks server identity mismatch, stale account/epoch/scope responses, verified refresh/restore, expiration/revocation, malformed/replayed callbacks, PKCE cold start and recovery ownership, provider absence and Retry-After. The classroom suite checks the shared gateway, guest/unverified credential denial, revision conflicts, archive/delete-empty/remove-member flows, actor-switch response rejection, same-attempt card flow, unknown-write reconciliation and back confirmation.

The added `test/integration/auth_classroom_links_test.dart` revalidates the inspected plugin channel contract, listener cancellation and oversized/null URI filtering without adding another callback singleton or dependency. It does not prove Android intent delivery or Google consent.

## Remaining gates

The parent must route bottom-tab exit through the contributed back policy before replacing the route. Existing classroom/profile safeguards retain controllers/drafts; they do not fix the root selector bypass. Verify the final registered contribution set, Android manifest, production entry point and full merged suite. Hosted authorization, classroom CRUD capability and live teacher/student room tests require authorized real actors/configuration and remain separately unverified.
