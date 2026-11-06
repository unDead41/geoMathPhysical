# Cloud/account/game preservation review

Reviewed 6 November 2026. No blocking regression found in the scoped source review. No production or test files changed by this worker.

## Reviewed source

- Candidate: `d4a71ee5690bf6f94c358b857fa59eff828a9d99`, private branch `app-unified-worker-4`; app version `0.3.0+4`.
- Common source: `e9fd03ce3533865640907c25bf91961f21b6b291`.
- Cloud/AI source: `b3195a1617187f362af58ca5390adca2fe3e65fa`.
- Read root `AGENTS.md`, `docs/SOR_VERSIONING.md`, and `docs/geomath-app-prompts/COMMON_RULES.md`.
- This private review checkout has no remote refs or `main` branch. `origin/main` read failed with exit 128; no remote/main freshness assertion is made by this worker. Parent owns source/remote reconciliation.

## Findings

| Area | Result and source evidence |
| --- | --- |
| Real behavior preserved | `git diff --name-only b3195a... HEAD` is empty for auth/data, profile/data, classroom/application+data+domain, Duel controller/projection/transport/protected store, sync, and Android. Scoped changes are presentation/strings plus the reusable drag widget and carousel. No repository/controller was replaced by fixture data. |
| Auth validation and stale results | AuthScreen routes still invoke the real repository. Added form validation uses the same AccountValidation policy as native login/signup/recovery. `_operation` advances on actor-binding changes, and response publication requires mounted state plus the matching operation before secrets are cleared (auth_screen.dart:50,56,120). Busy gating remains. Logout confirmation rechecks the original actor. |
| Profile | Existing actor/generation checks and unknown-save-outcome barrier remain (`profile_screen.dart:113,134,171,191`). UI changes add focus, draft notices and field errors; existing role is not editable, and the update path still submits display name/avatar only. Unknown outcomes require explicit refresh before another write. Actor-bound in-memory drafts retain the existing process-death limitation. |
| Classroom | Controller authorization, server-derived role/ownership/capability, pending command/reconciliation and mutation validation files are byte-identical to cloud source. Loading/retry/empty states and PIN clipboard affordances retain controller calls. Copy completion checks captured ClassroomScope before publishing (`classroom_screen.dart:630,653`). Paste checks actor and edit revision, preserving newer typed edits (`:1178,1190,1195`), and cannot join automatically. Confirm still validates before invoking the original submit. |
| Duel authority | Controller/transport/projection files are unchanged. The UI still displays public server question copy and dispatches scan/hint/skip/ready/leave through the service owner. Live gesture checks require actor, session generation, identical current snapshot, controller canAnswer, current route and server deadline (`duel_screen.dart:572,582`). No local answer bank or score calculation was introduced. Pending scans retain disabled selection/scan until server confirmation. |
| Clipboard late edits | Duel increments a text revision on every PIN edit, including edit-then-restore, and rejects delayed paste if the revision, actor, generation or session changed (`duel_screen.dart:42,67,160,175`). Copy shares only the public room PIN/invitation and guards late status publication. Classroom has the analogous revision protection. Platform failures preserve typed PINs and show a notice. |
| Browse/select/scan | Carousel owns browse position only, with scope reset, width alignment and snap behavior; arrow/swipe never submit or select. Long-press drag is separate from horizontal browse. GameReaderTarget rechecks matching scope/kind and live canSelect on entry and acceptance. Drop/tap only set presentation selection; only the explicit scan button dispatches `c.scan` (`duel_screen.dart:694,718`). Five public choices remain cube, cuboid, pyramid, cylinder and cone. |

## Verification scope

No tests were executed by this worker: parent is running the full merged suite, and this review did not expose a concrete unresolved concern requiring an extra narrow run. Existing fixture tests were inspected, not claimed as executed:

- `test/features/auth/auth_screen_test.dart`: field errors/draft retention, stale logout dialog and late auth response isolation.
- `test/features/profile/profile_screen_test.dart`: profile draft/field UI coverage; unchanged repository tests cover real adapter contracts.
- `test/features/classroom/classroom_widgets_test.dart`: PIN channel fixtures, actor switch during paste, invitation copy errors, server attempt/browse and pending preservation.
- `test/features/duel/duel_screen_test.dart`: delayed paste/edit-then-restore, real-protocol fixture payloads, drag stale stage/actor rejection, deadline guards and pending scan behavior.
- `test/features/duel/presentation/game_card_drag_test.dart` and `game_card_carousel_test.dart`: browse/select/explicit scan separation and scoped drag rejection.

These are host tests with fixture transports/platform channel mocks. They do not establish hosted authorization, actual OS clipboard delivery, native gestures or a physical Android round trip.

## Exact continuation limits

1. **Google/native email links remain gated.** Production `cloudGameFeatures()` calls `authFeature()` with default `nativeCallbackReady=false` (`auth_feature.dart:14`). The existing Android VIEW/DEFAULT/BROWSABLE filter for `com.geomath.dev://auth/callback` and disabled competing Flutter deep linking are retained, but manifest presence does not activate readiness. Enabling needs hosted redirect allowlist plus real cold/warm/expired/replayed callback evidence; Google also requires server settings `external.google == true`. Signup acknowledgement remains confirmation-through-website then native login. No provider/SMTP/Auth setting was changed or tested here.
2. **Sync needs the existing server capability.** A valid public URL/key does not prove `geo_offline_sync` is installed or returns the expected accepted event IDs. Existing code sends only signed-in formative reflection/completed-Solo events, checks actor/generation after awaits, and only removes acknowledged rows. Guest records stay local. Missing/unsupported capability retains pending rows and honest unavailable status. This review did not probe hosted state. Hosted class/profile/session permissions, `classroom_crud:1`, protocol2 two-client Duel and accepted-ID sync remain separate acceptance gates, as recorded in the source integration request.
3. **In-place update needs the installed app signer.** Package/label remain `com.geomath.dev` / GeoMath; tracked Android release config still uses the environment debug signing configuration. The historical original-app 0.2.1 packaging report records certificate SHA256 `73f7dfb6f845b2ca669687adcb8402142696f89116d8b1f47c0ce3d93a6c8d40`, different from the inspected 0.1.0 APK certificate `efcb365de2071ebfbc71d5650d966f284809197f207cd013f8ae738d02765631`. This worker has not inspected the user's installed certificate or a new candidate APK. A fresh APK cannot be promised as an in-place update without the matching private signing key; do not solve this by uninstalling or clearing data. The parent should report the actual new APK signer separately.
4. No hosted/API mutation, backend/schema/provider deployment, physical Android test, new APK build, signing validation or store action was performed by this worker.
