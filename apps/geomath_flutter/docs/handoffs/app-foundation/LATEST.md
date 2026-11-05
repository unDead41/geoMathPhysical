# GeoMath Flutter foundation handoff

Foundation **READY**. App **0.1.0+1**, contract **1.0.0**, private module adapter
**2**, development application ID **com.geomath.dev**.

Verified source: `f5aeddd58d81e490b1e67b8bf4a21311645d3631`.
[Successful CI run](https://github.com/unDead41/geodecoder/actions/runs/41973098124), job `127065623084`.
The final READY publication restores the exact full workflow verified here. Its
app, unit/integration tests, contract, lockfile and runtime hashes are the same
verified source. Screenshot tooling was checked separately against that exact
normal APK in run 41977674183, commit `2f2719ef57ac7c53251bd85772dd505b412baada`. The publication head is read back remotely and reported
after push; no file embeds the SHA of its own commit.

## Shared starting point for feature branches

Both `app-learning` and `app-cloud-game` must use the **same final published
app-foundation READY SHA**, as reported in the publication response. Read
[FOUNDATION_READY.json](../../FOUNDATION_READY.json),
[FOUNDATION_CONTRACT.md](../../FOUNDATION_CONTRACT.md),
[STORAGE_CONTRACT.md](../../STORAGE_CONTRACT.md) and
[SOURCE_LOCK.md](../../SOURCE_LOCK.md). Use the registered feature contributions
and preview bootstrap; shared API changes go in each branch's integration request.

Prompt 2 owns learning/module assets/tools and its preview. Prompt 3 owns
Auth/profile/classroom/solo/Duel/sync and its preview. Existing feature tabs
explicitly identify unfinished functionality; foundation readiness is not a claim
that every planned screen or cloud capability has been implemented.

## Implemented foundation

- Native Home, finite animated guide, durable preferences and dark variant,
  visual help and local report with preview/select/copy/TXT Android adapter.
- Central design tokens, face palette, accessible components, BM/English,
  light/dark/system, contrast, 100/125/150% text, motion and audio preferences.
- Shared actor/session epochs, protected session port, SQLite migrations and
  atomic canonical formative reader/writer contracts. Guest records remain local.
- Feature route/service/localisation/migration contributions, both preview roots,
  network policy, injectable clock/RNG, lifecycle/back rules and single audio owner.
- Verified offline canonical module and real WebView: eleven learning models,
  physical face colours, rotation/unfolding and validated actor-bound messages.
  Bank15 and neutral game cards retain cube/cuboid/pyramid/cylinder/cone.

Private readiness acknowledgement closes the demonstrated enqueue/acceptance
lifecycle race. Duplicate valid READY messages do not repeat logical callbacks.
The original native 30-second deadline and progress/settings/envelope version1
remain. See [the ADR](../../adr/module-ready-acknowledgement.md).

## Verified results

| Check | Actual result |
| --- | --- |
| Dependency resolution / format / analyze | PASS; source formatter and analyzer completed |
| Flutter unit/widget suites | PASS 92/92, including real SQLite and preview contributions |
| Canonical/adapter Node contracts | PASS 12/12 |
| Debug normal APK | PASS; 172051208 bytes, SHA256 `ae533c5f573adee45304a732dd4d9f39840f84da71ace0fc4c2035aea0dd213d` |
| Real Android integration | PASS 4/4 on emulator API35 with radios disabled |
| Actual normal APK run | PASS; preserved normal APK launched after integration |
| Native app screenshots | Captured by ADB; Home, Settings and canonical module |
| Root version / scoped diff | PASS; app branch retains inherited firmware1.1.3 |

Android device: `emulator-5554`, `Android SDK built for x86_64`,
Android `15` / API `35`;
active WebView `com.android.webview 124.0.6367.219`.
Airplane mode, disabled Wi-Fi/data and the normal-app cold start are recorded.

The device suite verifies rotation/unfolding, settings without model reset,
native readiness acceptance and duplicate suppression, stale actor rejection,
missing/corrupt assets, actual clipboard, local preferences/records and reopen.
The unit/widget suites additionally cover failed storage/queue absence and
320dp/150% keyboard/back/confirmation reachability. The native TXT adapter is
implemented and failure-tested; the system file-picker save flow is not automated.

Evidence: [full CI receipt](evidence/ci-41973098124.txt),
[capture receipt](evidence/ci-41977674183.txt),
[device integration log](evidence/android-test/integration.txt),
[device metadata](evidence/android-test/device.json),
[WebView provider](evidence/android-test/webview.txt),
[Home screenshot](evidence/android/01-home-offline.png),
[Settings screenshot](evidence/android/37-settings.png),
[module screenshot](evidence/android/module-preview.png).

## Provenance and scope

| Source | Audited SHA |
| --- | --- |
| app base | `38f061af963256528d5060ff076bae9ee05eafc3` |
| canonical main-digitalized | `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` |
| observed firmware main | `25836eb1a6f24459aace8a3980ae880a13e3b488` |

Digital2.9.1/module1.6.2 and single-attempt-v1 remain pinned. The canonical child,
geometry/parser/formulae, bank and golden fixtures were not altered by the private
wrapper ACK correction. Canonical source suite341 and independent math subset93
passed during source export; the current app exports and adapter contracts are
verified separately above. Current web Auth later advanced to Digital2.10.0;
Prompt3 must audit that newer Auth source. It is not imported into foundation.

Only `apps/geomath_flutter/**` and its scoped Flutter workflow are published to
`app-foundation`. No backend/provider/SMTP/migration, Pages or store deployment is
part of this work. Physical-phone, iOS, hosted-auth and production-capacity tests
are not claimed. The earlier local TCG emulator blocker is historical; the actual
device gate is satisfied by the identified hosted emulator.

## CI audit trail

| Run | Source | Android outcome |
| --- | --- | --- |
| [41864207926](https://github.com/unDead41/geodecoder/actions/runs/41864207926) | `397cab4` | blocked_before_device |
| [41951082306](https://github.com/unDead41/geodecoder/actions/runs/41951082306) | `185e62f` | blocked_before_device |
| [41954312460](https://github.com/unDead41/geodecoder/actions/runs/41954312460) | `bcaf83b` | failed |
| [41957473390](https://github.com/unDead41/geodecoder/actions/runs/41957473390) | `27cb9d5` | failed_2_of_4 |
| [41961837268](https://github.com/unDead41/geodecoder/actions/runs/41961837268) | `d8e5a65` | blocked_before_device |
| [41963202642](https://github.com/unDead41/geodecoder/actions/runs/41963202642) | `d72a5bb` | passed_3_failed_1 |
| [41967215715](https://github.com/unDead41/geodecoder/actions/runs/41967215715) | `5f91253` | not_run |
| [41967889411](https://github.com/unDead41/geodecoder/actions/runs/41967889411) | `d2557ca` | passed_3_failed_1_environment_focus |
| [41971048550](https://github.com/unDead41/geodecoder/actions/runs/41971048550) | `61f21b0` | passed_4_of_4 |
| [41973098124](https://github.com/unDead41/geodecoder/actions/runs/41973098124) | `f5aeddd` | passed_4_of_4 |
| [41975565145](https://github.com/unDead41/geodecoder/actions/runs/41975565145) | `6fe2ceb` | not repeated;sourceCI41973098124passed4/4 |
| [41976286905](https://github.com/unDead41/geodecoder/actions/runs/41976286905) | `243ffc2` | not repeated;fullCI41973098124passed4/4 |
| [41977674183](https://github.com/unDead41/geodecoder/actions/runs/41977674183) | `2f2719e` | not repeated; full4/4 passed in41973098124 |

Earlier failures and their original receipts remain in evidence. They are not
successful device proofs. The full test run and the separately identified capture run together satisfy the gate.

## Worker handoffs

Six initial workers ran in separate private worktrees. Only the lead publishes
`app-foundation`; worker branches were not pushed.

| Worker | Incorporated commits |
| --- | --- |
| Toolchain/scaffold | `b63924a32f7b911ed90af24a454c6e35404477b9`, `d2782db868b60e0e9d72f2d036a00bf0491bac2b`, `c26f9751a995cd435843c1b9120188373e6a574d` |
| Design/preferences | `a480279bbba0d868931487d0a62dc8dc54521bfe` |
| Composition/bridge | `7b76b50d77032350300634f58cec9bd3e515df38`, `cdd6f79805dd9d828e5dc1cf19f9a93403ea743c` |
| Session/storage | `6bf8a3e27b971657396d4905da38a6275ca62fcb`, `7cbf2d2775c9acfa4601ac74f075b925c5064f84` |
| Source/module | `de7cb10ed0f353517b5ed8901835a85cc1f51a5c`, `933fd6e622477aeaeae523c0577eec33eb46b9f7` |
| Independent QA | `ff903cd648aac242d4cea86b79922df4cb080d91`, `687a1468f2217924d06344cfea7afa18aa830587` |

Lead fixes include native bootstrap/routing/report adapters, cleanup and back
guards, typed public config, final lint/API integration, source-scope checks and
the final 92-test run. No backend/provider/SMTP/production migration, Pages,
store publication or capacity claim is part of this work.
