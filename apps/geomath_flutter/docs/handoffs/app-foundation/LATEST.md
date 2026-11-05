# GeoMath Flutter foundation handoff

App **0.1.0+1**, development application ID `com.geomath.dev`. Contract **1.0.0**.
Current gate is **BLOCKED**, specifically actual Android launch/WebView smoke.
Read [FOUNDATION_READY.json](../../FOUNDATION_READY.json) for machine-readable
commands, exit status and source/contract/asset hashes. The final publication SHA
is reported after remote readback, not embedded in its own commit.

## Source and isolation

| Reference | Audited SHA |
| --- | --- |
| app base | `38f061af963256528d5060ff076bae9ee05eafc3` |
| canonical main-digitalized | `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` |
| observed firmware main | `25836eb1a6f24459aace8a3980ae880a13e3b488` |

Own worktree: `/workspace/scratch/5c9edfba3bf4/app-foundation`, branch
`app-foundation`. Started clean from the exact app base. GitHub connector supplied
the exact Git tree/commit and hash-verified source files because direct Git clone
had no runtime credentials. The complete unchanged base tree is preserved;
unneeded legacy binaries remain sparse locally. No other chat's checkout was
reset, stashed or changed. Published changes are restricted to
`apps/geomath_flutter/**` and `.github/workflows/geomath-flutter.yml`.

The canonical Digital source is 2.9.1, module 1.6.2, ruleset
`single-attempt-v1`. Source build ran in scratch, not the committed Digital tree.
The app inherits legacy firmware 1.1.3 from app; observed firmware main is 2.0.2.
No firmware release/version or upstream branch was changed.

## Implemented

- Native Home (01), finite 4.8-second guide (04), durable preferences (37), dark
  variant (38), visual help (39), local report/preview/copy/select/Android TXT
  document-picker adapter (40). Five shared destinations and explicit unfinished
  learning/game/classroom/profile states, rather than simulated feature results.
- Shared canonical design tokens, physical face palette, BM/English, theme,
  contrast, text100/125/150%, motion/audio preferences, accessible controls,
  confirmations, notices, shape controls and face legend.
- One actor/session epoch owner, protected session port, SQLite transaction and
  migration registry, canonical formative DTOs and actor-bound reader/writer.
  Guest saves are durable local commits; signed-in saves fail unavailable until
  an atomic queue appender is supplied. Nothing claims synced without server ack.
- Modular route/service/localisation/migration contributions and both preview
  bootstrap functions. Prompt 2/3 do not edit the root or create another
  theme/preferences/session/database. Public config is optional and typed
  unavailable when absent; no cloud SDK login/provider capability is fabricated.
- Verified full local canonical module and actual WebView adapter, 11 learning
  models, bank15, explicit JS RNG draws/clock golden traces, five neutral game
  geometry providers including cone. Native/progress/settings protocols remain
  separate; wrapper capability provenance is documented honestly.

The native module preview writes validated progress through the shared writer
and displays durable local/pending/failure status only after its receipt. The
complete native Learning UX, Auth/classroom/solo/Duel and queue flusher are later
features, not completed foundation screens.

## Verification

| Check | Result |
| --- | --- |
| Flutter3.47.9 / Dart3.13.7 / Temurin17.0.21+9 | Observed; doctor Android toolchain and licenses pass |
| Locked pub dependencies | PASS, offline retrieval after official archive hash verification |
| Formatter | PASS, 75 Dart files, zero changes |
| Flutter analyze | PASS, no issues |
| Flutter unit/widget suites | PASS, 92/92, including real on-disk SQLite and two preview compositions |
| Canonical/adapter Node checks in the app | PASS, 11/11 |
| Full pinned canonical module source suite | Worker execution PASS341/341; independent math subset PASS93/93 |
| Final debug APK | PASS, 196848676 bytes; SHA256 `86fcddbfe50a8736210792bfda3fe0abe17a1cc7c1c85bcfef35c6398c545b06` |
| Actual local Android run | BLOCKED, exit1 before installation: Package Manager service absent |
| Real Android WebView integration | NOT RUN on local device; target files pass Dart analysis; device compilation/execution pending |
| Android app screenshots | None yet; internal widget renders are not device evidence |
| Root version checker / diff check | PASS; inherited firmware1.1.3 unchanged |

Actual logs are in [evidence/](evidence/). The APK hash comes from the final normal
application build, preserved separately from integration runner builds. Doctor's
optional Chrome/Linux targets are absent and its managed-host proxy interface
probe warns; these are not claimed as validated platforms.

The five required scenarios are covered by behavioral contracts and authored
device targets: presentation changes preserve live model state; missing/corrupt
assets cannot become ready; stale session/epoch messages are rejected; failed
storage/absent queue cannot yield a durable/synced receipt; back, keyboard and
confirmation remain reachable at320dp/150%. Their actual WebView/device portion
still needs execution before READY.

## Android execution blocker and next step

Installed command-line tools22, API36/buildtools36, NDK28.2, CMake3.22.1,
platformtools37.0.1 and emulator37.2.13, plus a full JDK17. The host has no
`/dev/kvm`/VMX support and an8GiB memory limit. Early simultaneous build/boot hit
host OOM; build bounds were corrected and the final APK passed. The preserved
writable API36 TCG guest then spent over20minutes repairing/decompressing
Chrome/WebView and performing first-boot ART verification. Its framework later
restarted before boot completion. `flutter run` genuinely attempted installation
and failed because Android's package service was unavailable. No app failure,
rendering pass, offline run or WebView handshake is inferred from that attempt.

The scoped Flutter CI now builds/tests the same sources, runs real integration
on a hardware-accelerated API36 emulator with radios disabled, then reinstalls
the normal APK and captures its actual guest UI via ADB. This is an execution
route, not an already successful CI receipt. Continue until that device gate has
real results; update READY only then. Do not build a second foundation while
this marker is blocked.

Once READY is published, both feature branches must use the same final
`app-foundation` SHA. Prompt 2 owns learning/module assets/tools and its preview;
Prompt 3 owns its Auth/profile/classroom/solo/Duel/sync features and preview.
Use [FOUNDATION_CONTRACT.md](../../FOUNDATION_CONTRACT.md) and the shared tables;
new root needs go to `docs/integration_requests/<branch>.json`.

## CI continuation after the first publication

Run [41864207926](https://github.com/unDead41/geodecoder/actions/runs/41864207926)
verified commit `397cab4702a13a64a66d3145e0842bd22dcfb5ad`: pub get,
format, analyze, 92 Flutter tests, 11 Node checks and debug APK all passed.
The Android job also built the normal APK, then failed during API36 image
installation with `No space left on device`. The emulator and integration tests
never started; this is not an Android app failure or successful device proof.
See [the CI receipt](evidence/ci-41864207926.txt).

That run resolved `ubuntu-latest` to Ubuntu26.04.1. The workflow now pins
Ubuntu24.04, reclaims unused .NET/Haskell/Swift runtimes and Docker images on its
disposable hosted Android runner, prints byte/inode headroom, and uses a
disk-backed temp directory for SDK extraction. A20GiB project budget is checked
before the image/AVD/integration build. Java, Flutter and the Android SDK are
retained. API36 and the actual app tests remain the same. The AVD is bounded to
2cores/3072MiB RAM/4096MiB userdata, and the preserved normal APK is launched
through `flutter run` after integration. These changes await CI verification;
READY remains blocked until the real Android gate and screenshots succeed.

Resume audit: `app` and firmware `main` remain at their table SHAs;
`main-digitalized` advanced to `752ce908d16d13acc9cc7510797e8363d182c3f5`
(Digital2.10.0: Google sign-in and SMS removal). The locked module1.6.2 snapshot
is retained. Prompt3 must audit the newer Auth source when it starts; this CI
repair does not import web/Auth changes into the frozen foundation.

## Second CI resource measurement

Run [41951082306](https://github.com/unDead41/geodecoder/actions/runs/41951082306)
passed all verify gates at `185e62f993e06cc8c08fbd6316265529e46743f4`, including
92 Flutter/11 Node checks and the debug APK. The separate Android job also built
its normal APK. Root free space rose13GiB ->29GiB during cleanup, then native
build left17585864704bytes. The chosen20GiB guard stopped that job before an
emulator or device test ran. See the [verify receipt](evidence/ci-41951082306-verify.txt)
and [resource receipt](evidence/ci-41951082306-resource.txt).

The runner now additionally measures/removes its unused CodeQL toolcache subtree
and old NDKs that are neither the app's pinned28.2.13676358 nor environment-active.
Java/Flutter and SDK platform/build tools remain. The20GiB guard remains; the
next actual Android run will emit the preserved normal-APK hash and artifact.
READY is still blocked. No app runtime, test, contract or asset bytes changed.

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

## Third CI: real WebView and fixture correction

Run [41954312460](https://github.com/unDead41/geodecoder/actions/runs/41954312460)
at `bcaf83b963aebdeb8f3876fe7ecb9aedd49ba457` passed all verify gates. Its
verify APK is 172050624 bytes, SHA256
`17d50a4bcf4434a4b58a9fca7307550d5a2b788993e9e635cb1fd9ea398221b4`;
all 20 bundled assets and the artifact archive digest were checked independently.
The Android runner passed the disk guard, booted API36 and verified active
WebView133.0.6943.137 with airplane mode enabled and Wi-Fi/data disabled.

The real first module passed rendering, rotation, unfolding and preference state
retention. The test then reused an unkeyed ModuleSpikeScreen State when mounting
a second controller after logout; that State retained its original controller,
so the second remained uninitialized. The existing missing/corrupt-asset device
cases passed. A runner shutdown signal during the next Gradle build prevented
app-flow and screenshot execution; the full Android gate is still blocked.
See [verify evidence](evidence/ci-41954312460-verify.txt) and
[Android evidence](evidence/ci-41954312460-android.txt).

The fixture now keys each newly mounted module screen by its instance ID. It
retains the stale-envelope negative test and the same-controller preference
checks. CI runs both scenario registrations in one integration application to
avoid a second Gradle compile while the emulator is live, and stops idle native
build daemons before emulator startup. No production runtime, contract, asset or
lockfile bytes change. This correction awaits the actual rerun.

## Fourth CI and native readiness acknowledgement

Run [41957473390](https://github.com/unDead41/geodecoder/actions/runs/41957473390)
passed all92 Flutter tests,11 Node checks, formatter, analysis and normal APK
build at `27cb9d570bc254c47dbd5838672a5fc78797e413`. Android ran all four
scenarios: missing/corrupt assets passed, the first WebView timed out at its30s
handshake deadline, and app flow later opened the WebView and retained settings
but missed an off-screen copy button after scrolling without a layout pump.
See the [verify receipt](evidence/ci-41957473390-verify.txt) and
[Android receipt](evidence/ci-41957473390-android.txt). No screenshot pass is inferred.

Source review independently reproduced a real race between JS ready enqueue and
native lifecycle validation. The wrapper now waits for native acknowledgement
and retries unacknowledged readiness on foreground. Native acknowledges only
validated messages and deduplicates logical readiness. The child and native
envelope/progress/settings protocols are unchanged; private adapter revision2
and source/manifest hashes record the correction. The observed CI timeout lacks
sufficient startup detail to prove it took this race path. Tests now log bounded
whitelisted startup flags, and the native30s deadline stays unchanged.

The regression failed before correction and all12 Node contracts pass afterward.
The Android helper pumps/settles after scroll and requires hit-testable actions.
CI uses one runner to preserve its already-built normal APK before emulator tests,
avoiding a repeated normal build. Failed-run logs and a real final screenshot are
retained through a pipefail/exit trap. Integrated checks await this corrected run.
