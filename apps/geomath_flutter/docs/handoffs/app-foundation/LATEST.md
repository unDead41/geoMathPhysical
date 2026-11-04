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
