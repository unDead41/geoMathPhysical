# Bina Bentangan and Isi Padu — preliminary source audit

Status: verified canonical JavaScript behavior; Flutter implementation remains blocked by foundation READY.
Audit date: 2026-11-04. App base: `38f061af963256528d5060ff076bae9ee05eafc3`.
Canonical `main-digitalized`: `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`; module package version `1.6.2`.
Read-only source: `canonical-snapshot/`; lead supplied Git-blob verification. Tests ran in a private scratch copy.
Foundation SHA, frozen signatures and contract hashes: unknown; `app-foundation` unavailable at kickoff (lead-verified 404).
No Flutter scaffold, bridge implementation, source changes, firmware version change or native execution is claimed.
Paths below are repository-relative at the canonical SHA; line numbers identify existing source/test entry points.

## Verified API and ownership map

| Source | Existing API / responsibility |
|---|---|
| `digital/module/src/labs.mjs:21` | DOM controller `LearningLabs({announce,prefersReduced,onProgress,onActivity,onDescribe})`; `open/close`, `choose/openActivity`, `snapshot/undo`, `pause/resume/nextStep`, `restoreProgress`. |
| `digital/module/src/lab-geometry.mjs:4–92` | `NET_PRESETS`, `cubeNetState(cells)`, `cubeNetMesh(cells,t)`, `pourState(kind,d,pours,progress)`; `unitCubeMesh` and `pourMesh` provide actual drawn geometry. |
| `digital/module/src/preset-nets.mjs:7–24` | `PRESET_NETS`, `presetNetMesh(key,fold,dimensions)`; fold `0` is flat and `1` is closed. |
| `digital/module/src/net-studio-geometry.mjs:5–124` | `STUDIO_SHAPES`, `studioFields/DimensionDefaults/Adjacency`, `defaultStudioTree`, `netStudioState`, `studioNetMesh`, `cubeStudioExamples`. |
| `digital/module/src/net-studio.mjs:7` | `NetStudio({mount,onBeforeChange,onChange})`; state owns shape, parent tree, inside flags, dimensions, open face; `mesh/getPrintInfo/render`. |
| `digital/module/src/net-print.mjs:8–94` | `netPrintPlan`, `netPrintSVG`, `NetPrinter`; explicit print/download, real millimetres, scale and grid. |
| `digital/module/src/volume-lab.mjs:5–23` | `volumeFields/Defaults/Info`, `comparisonTotal(items,included,count)`, `volumeComparisonMesh`; capacity uses canonical `calculateMeasures(...,'full')`. |
| `digital/module/src/volume-transfer.mjs:5–22` | `readVolumeAmount(raw,unit)`, `transferPlan(items,from,amount,allowOverflow,previousSpill)`, `transferFrame(plan,progress)`. |
| `digital/module/src/guided.mjs:2–38` | `GuidedActivity`, `validGuidedRecord`, `LabHistory` (default 30), `LabMotion`, `acceptModuleContext`; UI and persistence are separate owners. |

## Verified reflection flow

- `labs.mjs:204,238–263`: Ramalkan → Cuba → Semak → Terangkan; no observation before a nonempty saved prediction and a completed, edited experiment.
- Net reflection is **editor only**: prediction resets to the invalid 2×3 arrangement; a manual repair and full valid fold are required. Loading the cross example cannot satisfy repair.
- Net check accepts `distinct` (six distinct directions without overlap); `count` and `vertices` are wrong explanations.
- Volume reflection supports `unit`, `cone`, `pyramid`; unit check equals current `p*l*t`, pour check equals `3`. A/B comparison is exploration.
- Gallery and studio remain exploration. Native UX must retain them without inventing extra reflection activity IDs or completion gates.
- Edits invalidate live observation/check; answer edits require recheck. Completion requires observed result, successful check and trimmed nonempty explanation.
- Records retain only `activity,stage,prediction,result,explanation,completed`; activities are `net/volume/area/composite`, limits are `240/600/600` characters.
- Earned completed records survive retry, undo and subsequent partial work; only another full explanation replaces them. Restore never unlocks the live experiment gate.
- `emitGuided()` deduplicates identical milestones. These are self-reports, without TP, XP, grade or mastery claims.

## Verified modes and constraints

| Mode | Complete supported scope and boundaries |
|---|---|
| Net gallery | Nine presets: `cube` (6), `cuboid` (6), `pyramid` (5), `cylinder` (3), `cone` (2), `triangular-prism` (5), `pentagonal-prism` (7), `hexagonal-prism` (8), `tetrahedron` (4); parentheses count semantic faces/surfaces. |
| Cube editor | 6×6 integer grid; exactly six unique cells, connected by full edges, six distinct folded normals. Add/remove, drag, selected-face arrows, cross/overlap examples, clear, fold/flatten and Undo. Connected invalid arrangements may fold to expose overlap. |
| Connection studio | Seven polygonal shapes: gallery minus cylinder/cone. Real edge adjacency, root face 0, one parent per other face, acyclic path to root, outside/inside opening; positive flat overlap over `1e-7` is invalid. Eleven inequivalent cube nets; dimensions and attachment changes are real geometry. |
| Studio dimensions | UI `.5–4` model units in `.5` steps; geometry rejects nonfinite, nonpositive or `>1000` dimensions. Edits lock while folded or animation is active/paused. Invalid overlap is highlighted and printing is disabled. |
| Print / SVG | Flat, valid, idle net required. Scale API `.25–3` cm/unit, UI `.5/1/1.5/2`; plan limited to 190×267 mm, no silent shrinking. Grid/ruler stay 10 mm; tessellation is never a fold; curved surfaces roll. |
| Volume comparison | One/two independent vessels; **all eleven** `MODEL_ORDER` shapes, including sphere/hemisphere. Add amount/full to A/B/both, direct fill, include checkboxes, empty, A→B/B→A and keep/spill policies; comparison has no guided completion. |
| Volume dimensions | `a` cube; `p,l,t` cuboid; `j,t` cylinder/cone; `a,t` pyramid/tetrahedron/three prisms; `j` sphere/hemisphere. Comparison UI `1–8` cm, fill `0–1000`/1000; canonical dimension validation `.1–1000` cm. |
| Unit cubes | Integer `p,l,t` each 1–6; default `3×2×3=18`. Add one, complete current layer, fill gradually, empty; changing dimensions clears contents. Actual geometry enforces count `0..p*l*t`. |
| Three pours | Cone→cylinder or square pyramid→square prism, equal base and height; UI size/height integer `1–8` cm, defaults cone `j=3,t=4`, pyramid `a=6,t=4`. Explicit refill between pours; capped at three, one completion callback per pour. |

- Amount parsing delegates to `lessons.mjs:5` decimal grammar, accepting comma/dot, then `>0` and at most `1e6 cm³`; `cm3/mL/L` factors `1/1/1000` (API unit IDs `cm3/ml/l`). No expression parser or `eval` is used here.
- HTML inputs cap amount text at 12 characters and guided numeric answer at 80; guided answer is a separate `Number(value.replace(',','.'))` equality check, not the bounded algebra parser used by Calculation Steps.
- `transferPlan` requires exactly two items, source index 0/1, finite positive amount, finite nonnegative spill. Keep policy moves `min(source,request,space)`; spill policy moves `min(source,request)`.
- `transferFrame` preserves `A+B+spill=initialTotal` through every frame, independent of selected-sum checkboxes. Adding externally is a separate action; the ledger labels that distinction.
- Pour source height is `t*(1-cbrt(progress))`; receiver height is `t*(pours+progress)/3`. A/B `fillLevelRatio` also handles narrowing and spherical-cap volume; half volume is not always half height.
- `sphere/hemisphere` participate in volume but have no exact flat net; neither gallery nor studio fabricates one. Curved mesh strips share a semantic surface ID.

## Verified state, controls and persistence boundaries

- `labs.mjs:26–28`: initial gallery cube, volume comparison (empty 27/24 cm³ vessels), speed `.5`; `.25/.5/1` speed choices, pause/resume, 10% timeline step and net progress slider.
- Grid click/arrow alternatives, camera buttons/keyboard, focus restoration, `aria-pressed`, accessible fill values and announcements exist alongside drag/rotate gestures. Camera pitch clamps ±1.5 and zoom `.6–2`.
- Visibility loss/section close/hub return pause motion; foreground does not auto-resume. Activity switching retains separate suspended motion and mode values but deliberately resets camera (`choose`, line 205).
- Theme/locale/text refresh reuses the document/controller. Existing hub test retains prediction/units across locale changes; reduced-motion changes pause active labs. Native visibility/audio/back wiring remains unproved.
- `snapshot()` is an in-memory Undo payload for net/studio or volume/compare; it omits camera, motion callbacks and guided draft. It is not an exported, validated durable checkpoint format.
- Standalone `ModuleAccess` has no browser persistence. Existing web parent `digital/dist/module-progress.mjs` owns actor-partitioned record storage, protocol `1`, record normalization and session-bound messages.
- `digital/dist/module-frame.mjs` owns preference channel `geodecoder.module.preferences`, `version:1`, instance ID and setting validation; it preserves document identity. This is distinct from progress `protocol:1`.
- New module context clears guided fields/records, touched state and suspended motion (`app.mjs:259`), but retains lab values, histories and camera. A same-document session-change probe confirmed `unit,p=4,units=1,yaw≈.28` and enabled Undo survive; this is a native host reuse risk, not proof of a web account leak.
- `geometry.mjs:11` still uses the old palette. Gallery/studio retain source face IDs; cube-editor IDs are cell-array indices. The requested physical palette needs a source-pinned deterministic adapter and explicit editor identity fixtures.

## Existing tests and actual execution

Selected command below ran in the private source copy with Node `v24.22.1`: **172 passed, 0 failed, exit 0**.
These are geometry tests and shipped-HTML VM/DOM-port tests, not Android/WebView/physical-device evidence.

| Existing test file under `digital/module/tests/` | Exact coverage entry points |
|---|---|
| `labs.test.mjs:7–43` | Cross vs rectangle; 11/35 free hexominoes; rigid square hinges; conserved three pours, actual fluid meshes and explicit cyclic cuts. |
| `presets.test.mjs:8–25` | Nine gallery shapes; enrichment topology, flat non-overlap and 101-frame rigid/hinge checks; sphere rejection. |
| `net-studio.test.mjs:23–107` | All seven studio shapes through 101 frames, real closure, tree rejection, overlap, eleven cube examples, A4/SVG scale/grid/ruler and control locks. |
| `volume-lab.test.mjs:7–14` | Exact nine-solid formula/clipped volumes; selected sums; invalid dimensions; sphere/hemisphere outward fluid caps below 0.4% full-capacity error. |
| `transfers.test.mjs:7–26` | Decimal units, source/space bounds, keep/spill, reverse/empty transfer and conservation through 101 frames. |
| `guided.test.mjs:3–11` | All four phase gates, bounded/cloned history, motion callback once, restore validation, retained earned records. |
| `guided-app.test.mjs:6–23` | Real repair requirement, example bypass rejection, 18-cube answer/edit/Undo, paused pour stepping, progress/session binding and speech stop. |
| `app.test.mjs:68–231` | Full lab controls; nine-net UI loop; compare sums, units/overflow/ledger, eleven studio examples, pause/resume/visibility, direct override and retained easing. |
| `labs-ui-refresh.test.mjs:7–49` | Hub reentry with paused fold, mode/history retention, earned-result status, preference refresh and existing tool navigation. |
| `learning-mesh.test.mjs:6–25` | Eleven finite learning meshes, round semantic IDs/no-net behavior and nonlinear round fill levels. |

```sh
node --test --test-reporter=spec tests/labs.test.mjs tests/presets.test.mjs tests/net-studio.test.mjs tests/volume-lab.test.mjs tests/transfers.test.mjs tests/guided.test.mjs tests/guided-app.test.mjs tests/app.test.mjs tests/labs-ui-refresh.test.mjs tests/learning-mesh.test.mjs
```

## No-regression acceptance fixtures for the eventual adapter

| Fixture | Required observation |
|---|---|
| Net catalog | Nine gallery / seven studio / eleven cube examples; no sphere net. Preserve IDs, semantic labels and rigid hinges during rotate/fold; verify requested physical palette independently. |
| Repair sequence | Predict; initial 2×3 invalid; toggle `(0,0),(2,0),(3,1),(1,2)` to repair; fully fold; reject `count`; accept `distinct`; reject blank explanation; valid explanation earns exactly one record. |
| Studio failure | Triangular-prism default with `inside[1]=true` produces overlap `[[0,1]]`; both faces highlighted, print disabled; restoring outside repairs it. |
| Print scale | `.5/1/1.5` preserve edge length × `10*scale` mm; invalid/folded/oversize blocks export; 10 mm ruler/grid unchanged by text scale or locale. |
| Unit reflection | `3×2×3`: layer→6, one→7, full→18; answer 17 fails, 18 succeeds; empty/Undo invalidates check while earned record remains. |
| Pour reflection | Cone `j=3,t=4`: one `12π`, receiver `36π`; pyramid `a=6,t=4`: one 48, receiver 144 cm³. Three explicit pours/refills, no fourth; pause/step cannot double-count. |
| Formula / sums | Cube `a=3` half + cuboid `4×3×2` quarter: `13.5+6=19.5 cm³`; unchecked vessels do not enter selected total. Round `j=3` capacities `36π/18π`. |
| Keep / spill | Start volumes `100/20`, capacities `120/60`, request 50: keep ends `60/60/0`; spill with prior 7 ends `50/60/17`, invariant total 127 at every frame. |
| Amount boundaries | `2,5 L=2500`, `30 ml=30`, `1000 L=1e6`; reject zero, negative, unknown unit, `1000.1 L`, `1e3`, `1+2`, `Infinity`. Scratch boundary probe passed. |
| All eleven volumes | Scratch shipped-HTML probe selected every `MODEL_ORDER` entry at half fill with positive total and 11 selector entries; persist this as an automated adapter fixture. |
| Presentation / lifecycle | Preserve fold, dimensions, selected mode, camera and prediction during theme/language/text changes; background stops motion/audio, deliberate resume preserves cursor and target. Test touch alternatives/system Back on Android. |
| Actor / durability | A→B cannot expose values, Undo, discoveries, drafts or records; stale instance/epoch/replay rejected. Restore approved checkpoints only; failed storage never says saved; only durable writer receipt does. |

## Unknown or blocked

Foundation READY evidence, typed writer/reader/actor/checkpoint/lifecycle interfaces, native bridge security envelope, asset registration and integration signatures remain unavailable. Do not infer them from these JavaScript APIs.
Same-document actor reset/checkpoint policy, physical face resolution in edited cube layouts, native SVG/print handoff, Android semantics/gesture/reflow at 48 dp, durable failure EX11, process-death restore and offline asset corruption need implementation and device tests after freeze.
The selected existing tests and two scratch probes passed; full canonical build/check, browser visual matrix, Flutter analyze/test/APK, emulator and physical-phone execution were not run by this worker.
Legacy `python tools/check_version.py` could not run because that untouched script is absent from this sparse checkout; no firmware or versioned root files changed.

