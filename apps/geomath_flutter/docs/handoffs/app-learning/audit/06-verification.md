# Independent verification audit — Prompt 2

Date: 4 November 2026 (UTC). Status: **SOURCE CHECKS PASS; FLUTTER ACCEPTANCE BLOCKED**.

No learning implementation, foundation substitute, theme, router, session store or database was created. All 13 learning screens remain unimplemented in the app base inspected. A source test PASS is not an Android WebView, Flutter, screenshot, accessibility or physical-device PASS.

## Provenance and readiness

| Item | Independently observed value |
|---|---|
| Repository | `unDead41/geodecoder` |
| Private worktree | `/workspace/scratch/2c9458ca3d01/worktrees/worker-6` |
| Worker branch | `app-learning-worker-6-2c9458ca` |
| Clean worker/app base | `38f061af963256528d5060ff076bae9ee05eafc3` |
| Remote `app`, GitHub ref API | `38f061af963256528d5060ff076bae9ee05eafc3` |
| Remote `main-digitalized`, GitHub ref API | `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` |
| Remote `main`, GitHub ref API | `25836eb1a6f24459aace8a3980ae880a13e3b488` |
| Firmware at that main SHA | `v2.0.2`; read `main/firmware_version.h`, blob `ad1c80a23cdc8b4131769d310ce735f8a721e037`; unchanged |
| Source versions | Digital `2.9.1`; module `1.6.2`, from actual package files |
| `app-foundation` | GitHub GET `https://api.github.com/repos/unDead41/geodecoder/git/ref/heads/app-foundation` returned `404`, `NOT_FOUND` |
| Foundation SHA / freeze hashes | **Unavailable**, not inferred from the app SHA or a marker name |
| App files at inspected app base | `git ls-tree -r --name-only HEAD apps/geomath_flutter` returned no paths |

The same GitHub connection successfully read the three existing refs above. Therefore the missing foundation ref is an observed dependency failure, rather than evidence that the connection cannot read this repository. These are session observations, not a guarantee that the remote will remain unchanged.

Read the root `AGENTS.md`, `docs/SOR_VERSIONING.md`, `APP.md`, app SOR, architecture, source status, UX/design contracts, screen catalog, test plan, implementation plan, Prompt 2 and `COMMON_RULES.md`. The current canonical integration README was also read. Its historical suite figures are attributed upstream evidence and are **not** substituted for this audit's executed commands. The 12 mockup PNGs and flow PNG were not visually verified: sparse tree names are present, but an attempted local `git show HEAD:docs/geomath-app/assets/GeoMath_Aliran_UIUX_App.png` returned missing-object exit 128. No visual acceptance is claimed from those references.

### Required gate before Flutter work resumes

1. Fetch a real READY `app-foundation` head. Read `FOUNDATION_CONTRACT.md`, `FOUNDATION_READY.json` and its handoff at that exact commit. Verify declared contract/version/content hashes against bytes and verify referenced analysis, tests, debug APK and Android smoke evidence. A READY label alone is insufficient.
2. Confirm Prompt 2 and Prompt 3 use **the same foundation commit**. Record that SHA and contract hashes before adopting interfaces. Recheck the moving remote before integration.
3. Confirm the frozen `ActorBinding`, `Result`/failure types, preferences, transaction/migration registry, `FormativeRecordWriter` and `FormativeRecordReader` DTOs, asset submanifest extension point, feature contributions, preview bootstrap, lifecycle/back policy, bridge port and audio ownership. The guest writer must provide real durable offline receipts; the reader must use the same record schema.
4. Run the foundation's real Android WebView spike and learning preview contribution against those concrete services. Any required shared API change goes to the foundation owner through the lead's integration request. Do not define replacement interfaces in learning to make a preview compile.

The Flutter binary exists outside PATH: `/workspace/scratch/dda77b0786fb/runtime-setup/flutter/bin/flutter --version --machine` actually exited 0 and reported Flutter `3.47.9`, Dart `3.13.7`, framework revision `c197ca5199e9ee5661e865596c9c07294dfab51c`. This is a tool availability check, not a project SDK pin or build. The initial PATH probe found no Flutter/Dart/ADB; `/dev/kvm` does not exist. No Android device enumeration or connection was demonstrated. The absent foundation remains the primary gate even though an SDK can run.

## Executed source verification

The shared canonical snapshot was read only. Tests ran in a separate copy at `/workspace/scratch/2c9458ca3d01/verification-worker-6/source`; no generated web files or dependency directories were staged.

Git blob verification used SHA-1 over `blob <byte-length>\0<bytes>` against the lead's GitHub tree manifest. Initially all 177 listed blobs matched. Adding five pinned vendor files produced 182 verified blobs; those code/assets still matched after the tests. A final document-only refresh of `digital/docs/integration-sync/README.md` produced **183 verified blobs**; tested code did not change. Final verification-manifest SHA-256: `55ca2bfadef614ff95ec3ea41dd048e333dc175bfe5f7e650132d7cbbea13b65`.

Runtime: Node `v24.22.1`, npm `11.9.0`. Existing dependencies were linked into this isolated scratch copy after verifying package versions `jsdom 30.1.3` and `@supabase/supabase-js 2.118.0` against the canonical lockfile. **No `npm ci` or dependency installation was run by this audit.**

All source commands below used canonical SHA **`37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`**.

| Actually executed command | Working directory relative to private source copy | Exit | Observed result | Raw log SHA-256 |
|---|---|---:|---|---|
| `npm test` | `digital/module` | 0 | 341 tests; 341 pass; 0 fail/cancel/skip/todo | `daf7930371935c21e4f37baab36ae1e919c7e5eb15d4961bc47845fd4d1becde` |
| `node --test tests/module-frame.test.mjs tests/module-language.test.mjs tests/module-native-language.test.mjs tests/module-progress-view.test.mjs tests/module-progress.test.mjs` | `digital` | 0 | Initial subset: 19 tests; all pass | `1bf074e3ac832ff89cc7dc20a08af09e4839101f4737e0e2f0c4054fb5e732a9` |
| `node --test tests/module-*.test.mjs` | `digital` | 0 | Full adapter selection: 32 tests; 32 pass; 0 fail/cancel/skip/todo | `b0de7f5f07c44c9f26a33652b171897a9408c85a5a082fbf901badceb9e0277e` |
| `node probes/bridge-characterization.mjs` | Private audit scratch root, one directory above the source copy | 0 | Source characterization below; not an acceptance suite | `f8c22eb2fe783a0fe05c14d6fca19c792eb0e14bf8dcf64040557767c486fa82` |

There are **373 distinct canonical source tests** across the final two suites, not 392: the initial 19-test selection is contained in the final 32-test selection. The adapter glob expanded to eight `.test.mjs` files; its exact argv and test timings are retained in `source-test-result.json`. Full Digital `npm test`, module build/check and browser suites were not run by this worker. Build/check belong to the source-export audit and must retain separate receipts.

The 32 adapter tests include the **actual pinned vendor HTML** selected by `digital/vendor/module-release.json`. That release selects `module-v1.6.2.html`, release blob `3af0469979d878c8e605d093db1be0c0649c6509` and provenance source commit `7bba111209e15697cb4b704f6cef7c0fb120aa55`. Those nested release provenance values differ from the integrated source SHA above; neither is a foundation SHA. Native-settings tests use JSDOM and explicit canvas/animation/observer stubs. Their successful DOM execution is not a real WebView, real rendering, TalkBack or touch result. Cloud tests use fixtures; no hosted authentication, RPC or migration was exercised.

### Source characterization and remaining bridge work

An independent read-only probe imported the real `ModuleProgress`. It observed:

- Foreign source and wrong session nonce were rejected. Closing, changing account, and reopening invalidated the old session; account B had zero records from A.
- Replaying an **older completed reflection inside the still-current session** was accepted and restored the older result over the newer completed result. Progress protocol 1 has no native message sequence/replay envelope. Stale-session rejection must not be reported as proof of current-session replay prevention.
- A valid record with an unknown `padding` property exceeding 64 KiB was accepted. Canonical field limits still apply, but they do not establish an outer native envelope byte cap. The proposed 64 KiB cap must be frozen with its encoding/measurement rule and enforced before dispatch.
- With denied storage, `handleMessage` returned `true` while `storageFailed` was `true`. Acceptance of a JS teaching event is not a durable save receipt. Learning must display EX11 and wait for the frozen native writer's durable receipt before displaying saved.

These are characterized source behaviors and requirements for the future native adapter; no canonical or Flutter code was changed. The probe's script, script hash and observations are included in the machine-readable report for reproducibility. Replay, bounded-message and durable-receipt acceptance remain **open** despite the source suite PASS.

The canonical `geometry.mjs` still exports the older `FACE_COLORS` starting `#64CBB8`, `#94BDF7`. Source geometry tests passing therefore do not satisfy the app palette in U02. The deterministic, source-pinned app adapter must preserve physical face IDs and supply the approved colors without altering geometry or the neutral game cards.

## Screen and SOR acceptance matrix — future, not executed

Every row below is **BLOCKED: no frozen foundation or Flutter contribution at the inspected app base**. Source test names identify reusable evidence; they do not mark a screen complete. Relevant loading, empty, error and retry states are part of each flow.

| Screen | SOR | Reusable canonical evidence | Required native acceptance |
|---|---|---|---|
| 25 Teroka 3D | L01,L02,U02 | `learning-mesh`, `geometry`, `renderer`, `explore-refresh` | All 11 models; rotate, pinch/zoom and tap alternatives, reset camera, select/label a face, open/join, pause/resume, reduced motion. Preferences preserve camera, dimensions, selected face and folding progress. |
| 26 Pandangan 2D | L03,U02 | `geometry`, `learning-mesh`, `learning-tools-geometry-contract` | Six actual orthographic projections; compare to the same physical faces after rotation/folding. Cube views are squares, distinct from a net. No invented exact sphere net. |
| 27 Nota | L04 | `lessons`, `extended-lessons`, `learning-tools-calculation-contract` | All 11 shape IDs and their actual measurements/formulas; BM/EN; notes-to-calculator context preserves shape, dimensions, unit and π mode. |
| 28 Kalkulator | L04 | `lessons`, `calculation-steps` | Cube `a=4 cm` gives `96 cm²` and `64 cm³`; fixtures for every supported solid, π convention and unit conversion; invalid/non-finite dimensions clear stale results. |
| 29 Bina Bentangan | L05,L08 | `labs`, `net-studio`, `presets`, `guided` | Ramalkan→Cuba→Semak→Terangkan; valid/invalid user nets, all galleries, connection studio, fold controls and supported print/export. Invalid or oversize geometry gives a recoverable result. |
| 30 Isi Padu | L05,L08 | `volume-lab`, `transfers`, `labs` | All supported solids and advanced transfer modes; real fill volume, no linear-height shortcut for cones/spheres; units/π and four phases; pause/background preserves checkpoint. |
| 31 Luas/Rumus | L05,L08 | `surface-workshop`, `calculation-steps`, `labs` | Surface decomposition and derived formulas; supported open containers/lid removal and through-hole modes; capacity remains correct, explanations and phases remain available. |
| 32 Bongkah Gabungan | L05,L08 | `labs`, `surface-workshop`, `calculation-steps` | All supported combinations/voids; exclude both contact faces, include exposed inner walls, add/subtract correct volumes; all phases and advanced controls. |
| 33 Hab Makmal | L05 | `labs-ui-refresh`, `learning-tools-integration` | Reach all four labs and their galleries/studios; discoverable advanced modes; return to a preserved draft/checkpoint; no login requirement. |
| 34 Pelan&Dongakan | L06 | `projection-geometry`, `projection-studio` | Five base projects plus two cube arrangements; first-angle front +Z, plan +Y, right side +X; right view left of front, plan below. Both 1:1/1:2 scales, lines/circles/types/Undo and drawing alternatives. Accept exactly 0.06 cm drawing tolerance; reject just above. |
| 35 Semakan pengiraan | L07 | `calculation-steps`, `calculation-workshop` | Rumus→Gantian nilai→Pengiraan→Unit, sequential validation and earlier-edit invalidation. Canonical parser only; malicious syntax and 480-character/180-token-and-node/depth-28/power-magnitude-12/finite-1e30 boundaries; preserve draft and confirmations on preference changes. |
| 36 Rekod latihan kendiri | L08 | `guided`, `studio-records-ui`, `module-progress`, `module-progress-view` | Read through frozen `FormativeRecordReader`, save through the same-schema writer; only net/volume/area/composite, correct 240/600/600 field limits, valid completed explanation, literal escaped text. Guest/A/B isolation, EX11, reopen, durable receipt and retry; no TP/XP/grades. |
| 41 Hab Belajar | L01,U01 | `learning-tools-integration`, content catalog | Native shell/contribution launches the required destinations, all 11 shape contexts and records offline. Android app-bar/system/gesture Back returns consistently without losing allowed work. |

L01 catalog must equal exactly `cube`, `cuboid`, `pyramid`, `cylinder`, `cone`, `triangular-prism`, `tetrahedron`, `pentagonal-prism`, `hexagonal-prism`, `sphere`, `hemisphere`; do not use only `buildMesh()` as catalog coverage.

For U02 test cube **and** cuboid with `(shapeId, stableFaceId)` fixtures: 0/front `#4C8DFF`, 1/right `#F69B45`, 2/back `#E9799B`, 3/left `#42B883`, 4/top `#F4C95D`, 5/bottom `#9B7EDC`. Assert identity through arbitrary camera rotations, intermediate folds, fully open nets and all six views. Compare semantic colors/IDs rather than exact shaded pixels. Cylinder/cone/sphere patches share the identity/color of their actual curved surface; hemispheres have one curved surface and one base. Face labels and legends must work without color perception.

## Cross-cutting native test cases — future, not executed

### Bridge, actor and lifecycle

| Case | Fixture/action | Required oracle |
|---|---|---|
| B01 Trusted source | Foreign window/frame, forged JSON origin, unexpected main-frame URL, untrusted local path, remote/data/javascript navigation | No dispatch/save/navigation; only the current trusted wrapper/controller may send. External links require the permitted native action. |
| B02 Independent protocols | Swap progress `protocol:1` and settings `version:1` messages/nonces; wrong channel/version/type/instance | Reject mixed or unknown formats; canonical inner formats remain unchanged. Ready/open/preferences do not complete an activity. |
| B03 Schema and size | Null/array/invalid JSON, control characters, wrong types, excessive depth, unknown privileged fields/commands, byte-limit−1/exact/+1 including multi-byte text | Reject before side effects; freeze outer byte cap and schema in the foundation. Preserve canonical reflection and parser bounds independently. JS cannot select owner or RPC. |
| B04 Replay | Duplicate ID, same ID/different content, older message after a newer completion, out-of-order arrival, repeated ready; then close/reopen and deliver old queued messages | No older state overwrite or duplicate durable write. Any permitted retry maps to the same receipt. The current canonical source alone does not prove this gate. |
| B05 Actor epoch | Guest→A→B/logout during save/read/ready, delayed reader stream and receipt; token refresh within the same session | Native actor/epoch/scope controls ownership. A's response cannot populate B or mark B saved. Same-session refresh does not unnecessarily destroy state. |
| B06 Preferences | Change BM/EN, theme, text/contrast, reduced motion and audio during fold, calculation input, drawing, net editing and reflection | Same document/repository/controller; preserve camera, dimensions, fold progress, tab, draft and confirmations. Exactly one audio owner; no reload to apply preferences. |
| B07 Lifecycle/Back | Background/foreground, lock/unlock, route pop, settings/help round-trip, system and predictive/gesture Back, process death/relaunch | Audio and auto-rotation stop in background. Allowed checkpoint restores; stale instances cannot act. App-bar and system Back share the frozen policy, including unsaved work. No claim of force-stopped background syncing. |

Use the actual Android WebView in integration tests. Capture a redacted channel transcript with only synthetic fixture content and verify no credential/JWT/password reaches JS, an event, diagnostic log or screenshot. Widget tests or JSDOM cannot establish transport source binding on the platform.

### EX11, records, corruption and offline/reopen

- Reach EX11 directly from screens 29–32 and 36 by injecting typed writer failures, then exercise the real local database under denied/quota/full/transaction-abort conditions. Crash before commit, after commit and before UI receipt. Verify atomic rollback or a readable durable record, never a saved label for failed storage. No silent eviction or clearing of the learner's still-usable draft. Retry is single-flight/idempotent; reader and writer agree after reopen.
- Completed needs a valid explanation; check stage-specific requirements, exactly 240/600/600 versus one over, invalid types/control characters and Unicode length parity with canonical JS. Keep checkpoint/draft types distinct from reflection records. Projection/calculation must not silently create fifth/sixth activities. Merge cannot regress completion, and replay cannot replace newer evidence.
- Flip a byte, remove a file, supply a wrong hash/content version/schema and an old incompatible manifest for bundled HTML/JS/CSS/audio. Verify fail-closed loading before executing the asset; reachable localized recovery/Back/retry; no corrupt asset labelled ready and no replacement from a moving remote/CDN. Registry resolves the feature's own submanifest without an obsolete central duplicate hash.
- Cold launch an installed learning preview with airplane mode, cleared WebView cache and no website service worker. Visit all 13 screens and all 11 models, four labs, supported audio and saved records. Inspect attempted network requests; no CDN, GitHub or website-runtime dependency may be required. Missing optional voice availability remains honest.
- Kill/relaunch during each allowed draft/checkpoint and around save completion. Verify guest/A/B partitions separately, including logout while a delayed write completes; no A data appears in B. Prompt 3 owns the signed-in writer/outbox; learning creates neither a second queue nor direct SQL/read model.

## Visual, interaction and accessibility acceptance — future, not executed

Capture **screenshots of the running Flutter learning contribution** for all 13 screens: 320/390/430 dp phone and 768 dp tablet; BM and English; light/dark/strong contrast; text 100/125/**150%**. Cover supported landscape, safe areas, keyboard/insets, long text/errors/empty records, selected faces and each lab's advanced controls. Repeat active animation tasks with reduced motion. Record device/emulator model, Android version, WebView version, orientation/density, feature commit, source/asset hashes and screenshot filename. Do not treat a desktop browser, PNG mockup or foundation-only main entry as the learning preview.

Pass criteria: no clipped CTA/label, hidden focus, accidental horizontal page overflow or inaccessible advanced mode; clear geometry/legend and adequate label/control contrast in every theme; 48 dp native touch targets; identical camera/dimension/draft state after settings. Semantic palette comparisons must remain distinguishable despite shading.

On a **real Android device**, record TalkBack version and manually perform each flow using spoken focus order and actions: heading/shape/face/value/unit/error labels, selected/toggled state, focus restoration after a sheet/Back, announcement of save failure/success and dynamic calculation feedback. A canvas label alone does not expose face choice, rotation or drawing. Test tap/button alternatives for rotate/zoom/face selection, accessible line/circle creation and Undo, plus ordinary one/two-finger draw/rotate/pinch/scroll and parent-scroll conflicts. Test app-bar, hardware/system and gesture Back, including during drawing and unsaved reflection input. Accessibility automation is supplemental; no TalkBack PASS is recorded here.

At least one physical-phone run is required before describing the APK as phone-tested. Tablet, emulator and physical results are separate evidence classes. No iOS/WKWebView or hosted capacity claim follows from these checks.

## Commands to run only after the foundation gate

The following are **future commands, not executed receipts**. They require the frozen project, actual contribution/test files and a connected Android device. Integration filenames are proposed test targets, not files claimed to exist.

```bash
dart format --output=none --set-exit-if-changed lib/features/learning lib/dev/learning_main.dart test/features/learning integration_test/learning_*.dart
flutter analyze
flutter test test/features/learning
flutter test integration_test/learning_flow_test.dart -d <device-id>
flutter test integration_test/learning_bridge_test.dart -d <device-id>
flutter test integration_test/learning_offline_reopen_test.dart -d <device-id>
flutter build apk --debug -t lib/dev/learning_main.dart
flutter run -t lib/dev/learning_main.dart -d <device-id>
```

The preview must load `learningFeature()` using production repository/controllers and frozen contributions. Record exits, actual SDK/dependency lock, APK hash, source/submanifest hashes, device evidence and unresolved deviations. Run canonical tests/build/check in a fresh pinned scratch snapshot when exporter/domain changes; do not commit generated Digital output. Do not claim formatter/analyze/unit/widget/integration/APK success until those commands actually run.

Worker scope is only this report and its machine-readable receipt. The lead receives the private report commit for integration; this worker does not push. Firmware, shared foundation files, archived app specifications and canonical source remain unchanged.

