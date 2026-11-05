# Explore, views, notes and calculator source audit

Audit date: 2026-11-04 UTC. Scope: Prompt 2 worker 2; SOR L01–L04/U02.
This is source evidence and later adapter work, not a Flutter implementation or runtime acceptance.

## Provenance and foundation gate

- App base: `38f061af963256528d5060ff076bae9ee05eafc3`; private branch `app-learning-worker-2-2c9458ca`.
- Canonical pin: `main-digitalized` SHA `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital 2.9.1 / module 1.6.2, verified by the lead this session.
- Read-only source snapshot: `/workspace/scratch/2c9458ca3d01/canonical-snapshot`; evidence paths below are repository-relative at that pin.
- Current firmware `main`, inspected by the lead: `25836eb1a6f24459aace8a3980ae880a13e3b488`, v2.0.2. This app report does not advance firmware.
- `origin/app-foundation` is unavailable (lead remote read: HTTP 404); no READY SHA, frozen signatures or hashes are available.
- Continue independent audit only. Before implementation, consume the same verified READY SHA as Prompt 3; do not create router/theme/session/database or bridge contracts here.
- Read root `AGENTS.md`, `docs/SOR_VERSIONING.md`, `APP.md`, the app preparation contracts/plan, and Prompt 2 plus `COMMON_RULES.md`.

## Catalogue and mesh APIs

`digital/module/src/content.mjs:1–81` owns `MODULE_VERSION`, `MODEL_ORDER`, `MODEL_DATA`, physical labels, surface counts, six view descriptions and `noNet`.
The actual exported full-catalogue API is `learningMesh(shape, progress=0, segments=96, dimensions)` in `learning-mesh.mjs:22–29`.
There is no `buildLearningMesh` export in the audited module source; that name must not be assumed to be an existing API.
`geometry.mjs:95–101` exports `buildMesh`, which accepts only cube/cuboid/pyramid/cylinder/cone and throws for the other six IDs.
`ModelRenderer.draw` calls `learningMesh` (`renderer.mjs:18–30`); reuse this renderer instead of reducing the catalogue to `buildMesh`.

| Shape ID | Mesh owner through `learningMesh` | Physical surface IDs | Required measurement fields |
|---|---|---|---|
| `cube` | `geometry.mjs` box | 0–5, six squares | `a` |
| `cuboid` | `geometry.mjs` box | 0–5, six rectangles | `p,l,t` |
| `pyramid` | `geometry.mjs` pyramid | 0 base; 1–4 triangular sides | `a,t` |
| `cylinder` | `geometry.mjs` cylinder | 0 curved; 1 top; 2 bottom | `j,t` |
| `cone` | `geometry.mjs` cone | 0 curved; 1 circular base | `j,t` |
| `triangular-prism` | `preset-nets.mjs` prism | 0–2 sides; 3/4 caps | `a,t` |
| `tetrahedron` | `preset-nets.mjs` triangular pyramid | 0 base; 1–3 sides | `a,t` |
| `pentagonal-prism` | `preset-nets.mjs` prism | 0–4 sides; 5/6 caps | `a,t` |
| `hexagonal-prism` | `preset-nets.mjs` prism | 0–5 sides; 6/7 caps | `a,t` |
| `sphere` | `learning-mesh.mjs` round study | 0 curved only | `j` |
| `hemisphere` | `learning-mesh.mjs` round study | 0 curved; 1 circular base | `j` |

`presetNetMesh(key, fold, dimensions)` uses fold 0=flat / 1=closed; `learningMesh` converts with `1-progress` (`preset-nets.mjs:22–25`, `learning-mesh.mjs:28`).
`studySolidMesh` recentres/uprights measurement-aware meshes; `studySurfacePieces` supplies actual surface areas (`learning-mesh.mjs:31–54`).
`labDimensions` maps lesson symbols to core geometry dimensions, including cone slant via `hypot(j,t)` (`lab-geometry.mjs:44–46`); do not swap width/depth/height.

## Stable identity and palette gap

`geometry.mjs:27–36` defines the following cube/cuboid identities before camera/folding transforms; requested colors come from `docs/geomath-app/face_colors.json`.

| Stable ID | Physical label | Current `FACE_COLORS` | Required app color |
|---|---|---|---|
| 0 | Front / Depan | `#64CBB8` | `#4C8DFF` |
| 1 | Right / Kanan | `#94BDF7` | `#F69B45` |
| 2 | Back / Belakang | `#F2A1C2` | `#E9799B` |
| 3 | Left / Kiri | `#BCADF0` | `#42B883` |
| 4 | Top / Atas | `#FFD17D` | `#F4C95D` |
| 5 | Bottom / Bawah | `#FFAD8F` | `#9B7EDC` |

`geometry.mjs:11` has eight old colors, also `#83D0EA/#DAAE8D`; changing only Flutter chips would leave rendered faces inconsistent.
`renderer.mjs:45–79` shades `f.color`, highlights/selects by `f.id`, and returns that ID from `pick`; normals affect lighting, never physical identity.
`app.mjs:78–90` builds selectable labeled legend chips using old `FACE_COLORS`; `notes.mjs:24–55` also contains hard-coded old diagram colors.
Later adapter must use `(shapeId, stableFaceId)` consistently across mesh, net, views, legends and cube/cuboid dimension diagrams, without modifying IDs or vertices.
Do not apply the six-direction cube palette as six invented faces on other models; preserve their actual named surfaces and shape-specific mapping.
Cylinder/cone strips all share curved ID 0 (`geometry.mjs:57–93`); sphere patches share ID 0 and hemisphere adds base ID 1 (`learning-mesh.mjs:9–20`).
`renderer.mjs:64–72` groups selection by physical ID and delays curved badges until strips are painted; tessellation does not create new surfaces or edges.
Sphere/hemisphere reject nonzero opening and expose `noNet`; no exact flat net may be fabricated (`learning-mesh.mjs:24–26`, `content.mjs:65–80`).
Keep this learning palette out of neutral game/net cards; this audit changes neither canonical source nor game assets.

## Six orthographic views and interaction state

`geometry.mjs:5–10,23` owns `VIEWS`, `VIEW_ORDER=[top,bottom,front,back,left,right]` and `viewPoint`; `renderer.mjs:39` uses orthographic x/y projection.
`app.mjs:92–118` renders six closed-solid thumbnails; selecting views first closes an open net, disables rotation, then aligns to the selected direction.
Views project the solid at progress 0; nets develop surfaces at progress 1. Cube views are six individual squares, not the six-square net.
Pelan & Dongakan is a separate three-view drawing tool (`projection-geometry.mjs` / `projection-studio.mjs`), not a replacement for Explore's six views.

| Behavior | Existing owner and boundary |
|---|---|
| Orbit/zoom/reset | `app.mjs:165–170,308–361`: zoom clamp 0.6–2.2, pointer/pinch/wheel, arrow controls, Home and +/- alternatives |
| Select surface | `selectFace`, `renderLegend`, renderer `pick`; selection survives ordinary redraw, rotate and folding |
| Fold/pause/resume | `beginAnimation`, playback handlers and `pausedAnimation` (`app.mjs:157–164,287–301`) preserve direction/target/hold |
| Background | `visibilitychange` stops frames/rotation, retains a deliberate resume target; speech stops via `ModuleAccess` |
| Preferences | `refreshModuleHost` redraws without reconstructing state; explicit auto-rotate changes/reduced motion can stop animation (`app.mjs:363–382`) |
| Shape change | `selectShape` intentionally resets camera/zoom/folding/selection; it writes only shape to URL hash (`app.mjs:149–155`) |

`LearningNotes.render` returns early for the same shape, preserving the notes/calculator draft across navigation; another shape fills its defaults (`notes.mjs:83–103`).
Persistence gap: Explore state and measurement drafts are memory-only; `ModuleAccess` explicitly states no browser persistence (`accessibility.mjs:11`). No process-death/reopen checkpoint is established here.
Actor gap: `app.mjs:257–260` resets studios/labs for changed module context but does not clear Explore or notes values; the later adapter must isolate or reset these per frozen actor binding.
Source host refresh is not proof of native WebView lifecycle persistence or complete BM/English translation; retain current state when native presentation settings change and test the actual bundle.

## Notes, dimensions, units and calculations

`lessons.mjs:2–31` owns `PI_MODES`, `MEASURE_FIELDS`, `FIELD_LABELS`, `readDimension` and `calculateMeasures`; its `LESSON_DATA` owns formulas/examples for all 11 models.
Dimensions accept finite values 0.1–1000 cm inclusive; decimal comma/point are accepted. Missing/invalid values clear results; strings such as hex/exponential syntax are rejected.
Cube uses `a`: `calculateMeasures('cube',{a:4})` gives area 96 cm² and volume 64 cm³. `s` denotes slant height elsewhere; do not substitute `s` for cube `a`.
Modes are `22/7`, `3.142`, `full` (`Math.PI`); notes round presentation to two decimal places, retain full calculation values, and show positive values below 0.01 as `< 0.01`.
Notes output uses cm²/cm³; `UNIT_FACTS` (`lessons.mjs:122`) states m↔cm, square/cubic factors and 1 L=1000 cm³=1000 mL.
For converted targets, reuse `calculationUnitOptions`, `calculationProblem`, `calculationConvert`, `calculationSolution`, `calculationCheckStep` (`calculation-steps.mjs:7–8,115–138,199–218,266–268`).
Area targets: cm²/m²/mm²; volume targets: cm³/m³/mm³/mL/L. Preserve canonical `a` formula references (`calculation-steps.mjs:9–11`) and the bounded parser.
`app.mjs:279–282` sends current validated notes dimensions and π to calculation checks; invalid notes remain in place with focus on the failed field.
Mesh caveat: notes 3D/net overview uses default exemplar dimensions (`app.mjs:28–32`), while `drawNoteDiagram` uses current inputs; live mesh parity would require explicit measurement-aware adapter wiring.

## Verification and next implementation boundary

Read-only command run in the canonical snapshot with Node v24.22.1 (exit 0; 153 passed, 0 failed, 0 skipped):

```sh
node --test tests/geometry.test.mjs tests/learning-mesh.test.mjs tests/renderer.test.mjs tests/presets.test.mjs tests/lessons.test.mjs tests/extended-lessons.test.mjs tests/app.test.mjs tests/explore-refresh.test.mjs tests/learning-tools-integration.test.mjs tests/learning-tools-calculation-contract.test.mjs
```

These tests cover 1001-frame stable IDs/colors, rigid/continuous developments, six-view extents, all 11 surfaces, exact examples, units/π boundaries and navigation/pause/background behavior.
They validate the current old palette, not requested app colors. Add later adapter parity checks for ID→color after rotation/folding/all views, real-surface selection and renderer/legend/diagram agreement.
Reuse `tools/explore-ui-qa.mjs` as a browser QA reference; its matrix covers 1440/390, BM/English, light/dark, 100/150% and checks pose/draft preservation. It was read, not run here; its 44 px check does not prove 48 dp app targets.
Later exporter must pin input SHA/file hashes and palette schema, produce deterministic owned assets under `assets/module/**`, and record transformations plus output hashes in the feature submanifest. Do not silently advance canonical content.
Apply only declared, hash-checked transformations at mesh colors, legends and diagrams; fail when expected source anchors/hash differ rather than applying a loose global color replacement.
`tools/build.mjs` writes generated web tokens and bundled HTML; any future build runs in a writable pinned scratch copy, not this read-only source or committed `digital/**`.
Await verified foundation contracts before implementing contribution/preview, bridge, preference/lifecycle/checkpoint or actor integration. This audit adds only this report; no Flutter/Android/WebView/device/build acceptance is claimed.
