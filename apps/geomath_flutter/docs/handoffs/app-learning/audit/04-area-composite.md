# Area and composite source audit

Date: 2026-11-04. Status: **AUDIT ONLY; implementation gated on foundation READY**.
Scope: screens 31/32, shared lab flow and records; SOR L05/L08/U02.

## Provenance and gate

- App base: `38f061af963256528d5060ff076bae9ee05eafc3`, branch `app-learning-worker-4-2c9458ca`.
- Worktree: `/workspace/scratch/2c9458ca3d01/worktrees/worker-4`; initially clean.
- Canonical source: `main-digitalized` at `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, supplied verified read-only snapshot.
- Actual package versions: Digital 2.9.1; module 1.6.2. Integration-sync README's 1.6.1/older test totals describe earlier evidence.
- Lead inspected firmware `main` at `25836eb1a6f24459aace8a3980ae880a13e3b488`; APP.md records v2.0.2. No firmware edits/version bump.
- Lead reports `origin/app-foundation` absent/404; this base has no Flutter app, frozen contract or READY marker.
- Foundation SHA, contract hashes, Dart signatures, actor/checkpoint APIs and Android evidence therefore remain **unknown**.
- No scaffold, bridge, controller, assets, new persistence types or source changes are delivered by this audit.
- Read: root AGENTS/SOR, Prompt 2/COMMON_RULES, APP.md and app SOR/architecture/UX/design/screens/sources/test-plan/plan.

Source references below are paths/line numbers in the canonical SHA, not assertions that those files exist on branch `app`.
Unqualified `.mjs` references mean `digital/module/src/`; test paths are relative to `digital/module/`.

## Existing APIs to reuse after freeze

| Canonical API | Contract and evidence |
|---|---|
| `calculateMeasures(shape,input={},piMode='22/7')` | Eleven IDs; returns validity/errors, dimensions, area, volume, slant, parts and π context (`lessons.mjs:10`). |
| `learningMesh(shape,progress=0,segments=96,dimensions)` | Full catalogue; core `buildMesh()` alone covers only five shapes (`learning-mesh.mjs:22`). |
| `studySurfacePieces(shape,d)` | Logical `{id,name,area,color}` pieces, never one piece per curved tessellation strip (`learning-mesh.mjs:45`). |
| `containerMeasures(shape,d,closed=true)` | Cuboid/cylinder, `{area,volume,parts}`; capacity is independent of lid (`surface-workshop.mjs:5`). |
| `holeMeasures(d)` | Through rectangular hole; area/material-volume/outer-volume/hole-volume/parts (`surface-workshop.mjs:11`). |
| `workshopMesh(mode,d,{shape='cuboid',closed=true}={})` | `container` or `cavity`, mesh IDs and semantic selection groups (`surface-workshop.mjs:17`). |
| `compositionMeasures(kind,d)` / `compositionMesh(kind,d,joined=1)` | Only `roof`/`rocket`; measures include groups, sharedArea, separateArea, area, volume, slant (`lab-geometry.mjs:61,94`). |
| `LearningLabs({announce,prefersReduced,onProgress,onActivity,onDescribe})` | Actual DOM controller, navigation/motion/history/guided gates; no public frozen native launch API (`labs.mjs:21`). |
| `GuidedActivity`, `validGuidedRecord`, `LabHistory`, `LabMotion` | Canonical formative gates/history/motion; do not replace with independent Dart mathematics (`guided.mjs:5–31`). |

## Supported modes and boundaries

| Mode | Actual source behaviour |
|---|---|
| `area.mode='closed'` | All eleven learning shapes; change dimensions, open/close when valid, select logical surfaces and reveal complete formula (`labs.mjs:366–379`). |
| Original five closed shapes | Six cube/cuboid faces; pyramid base + four triangles; cylinder curved side + two disks; cone curved side + disk. Guided flow supported. |
| Extra closed shapes | Triangular/pentagonal/hexagonal prisms, triangular pyramid (`tetrahedron`), sphere, hemisphere. Exploration supported; guided completion deliberately disabled. |
| Sphere/hemisphere | Curved ID 0; hemisphere disk ID 1. No exact flat net, no unfolding slider; reject nonzero mesh progress (`learning-mesh.mjs:9–29`). |
| `area.mode='container'` | Thin cuboid/cylinder with optional lid; group-select parts, clear/all and top view; capacity label distinct from material area. No fake net animation. |
| `area.mode='cavity'` | Centred rectangular hole passes through cuboid top/bottom; exposed inner walls count; label is material volume. No blind-hole or arbitrary Boolean geometry. |
| `comp.kind='roof'` | Cube + square pyramid, common side `a`; cube height also `a`; pyramid perpendicular height `t`. |
| `comp.kind='rocket'` | Cylinder + cone, common radius `j`; cylinder height `h`, cone perpendicular height `t`. |
| Both composites | Separate/join, dimensions, outside-group selection/check, total area/volume, two explicit interface subtractions; guided flow supported. |

The exploratory scope is explicit in `labs.mjs:204,252`; preserving advanced modes does not mean inventing extra guided assessments.
Area selection waits for fully flat geometry unless the shape has no net; composite selection/check waits for joined=1, with no live/paused animation (`labs.mjs:264–265`).
Lab speed .25/.5/1, pause/resume, manual progress, next-step, camera buttons/drag/zoom and Undo share the canonical controller.
Area closed sliders use integer 1–10 cm; workshop UI bounds/clamping are in `surface-workshop.mjs:42–43`; calculator validation is separately 0.1–1000 cm.

## Mathematics and identity

- Labs/workshop/composites use **Math.PI/full**; notes/calculator independently support `22/7`, `3.142`, `full` (`lessons.mjs:2`; `lab-geometry.mjs:43,48`).
- Sum full values before display rounding. Source lab outputs cm, cm² and cm³; no arbitrary area-unit conversion control exists here.
- Cube `a=4`: area 96 cm², volume 64 cm³; `a` remains the parser/dimension symbol.
- Pyramid slant `s=√(t²+(a/2)²)`; cone `s=√(t²+j²)`. Triangular pyramid uses the equilateral base apothem, not a/2.
- Container area: cuboid `2t(p+l)+(closed?2:1)pl`; cylinder `2πjt+(closed?2:1)πj²`. Capacity stays `plt` or `πj²t`.
- These are zero-thickness sheets, not a doubled inside/outside wall-area model or finite wall-volume calculation.
- Through-hole: `L=2t(p+l)+2t(u+v)+2(pl−uv)` and `V=(pl−uv)t`; require positive finite dimensions ≤1000, `u<p`, `v<l`.
- Example outer 6×5×4, hole 2×1.5: L=170 cm² and material V=108 cm³; mesh area and oriented volume agree.
- Composite rule: `Loutside=Lseparate−2Ajoin`; `V=Vlower+Vupper`, with matching full bases and no overlapping volume.
- Roof `a=6,t=4,s=5`: L=240 cm²; V=264 cm³. Rocket `j=3,h=6,t=4,s=5`: L=60π; V=66π.
- Composite group keys are `side`, `bottom`, `joinLower`, `joinUpper`, `roofSide`; only first, second and fifth are external (`lab-geometry.mjs:65`).
- Standard cube/cuboid IDs 0..5 remain front/right/back/left/top/bottom through unfolding (`geometry.mjs:27–38`).
- Current FACE_COLORS are mint/blue/pink/lilac/yellow/peach, **not** the requested app palette (`geometry.mjs:11`; app `face_colors.json`).
- Future pinned adapter must map the constituent shape and stable physical ID consistently in mesh, selectable piece swatch and legend; camera/screen order cannot choose colours.
- Composite lower IDs retain their originals; upper IDs have +10 offset (`lab-geometry.mjs:94–99`). Never remap composite IDs modulo six or colour a pyramid as cube faces.
- Container mesh preserves original face IDs and removes only lid ID 4 (cuboid) or 1 (cylinder).
- Cavity IDs 0..15 identify patches, not ordinary cuboid faces: outer 0..3, inner 4..7, top 8..11, bottom 12..15. Preserve separate provenance and group selection.
- Cylinder/cone/sphere tessellation repeats one curved-surface ID; hemisphere adds one base. Counting strips would change the mathematical model.

## Ramalkan → Cuba → Semak → Terangkan

| Phase | Actual prerequisite/action |
|---|---|
| Ramalkan | Trim nonempty prediction, limit 240; begin resets the live experiment, not earned achievement (`guided.mjs:13`; `labs.mjs:238`). |
| Cuba: area | After prediction, touch/complete opening and select every piece; progress=1, no animation/pause; record observed full selected total (`labs.mjs:240–241`). |
| Cuba: composite | After prediction, complete joining; observation includes outside/interface equation. This alone does not complete reflection. |
| Semak: area | Choose the term for actual surface 1: cube a²; cuboid p×t; pyramid a²; cylinder 2πjt; cone πjs (`labs.mjs:242–248`). |
| Semak: composite | Answer exactly 2 mating surfaces **and** select precisely all external groups, excluding both joins. Wrong selection keeps completion locked. |
| Terangkan | Nonempty explanation ≤600 after successful current check; result ≤600. `completed=true` only at stage `explanation`. |

Canonical validation is nonempty bounded self-report, not semantic grading of the explanation; no TP/XP or mastery claim is justified.
Changing model/dimensions/selections/answer, Undo or retry invalidates live observation/check; previously completed record survives until a new full completion.
Restoring an earned record never restores a live gate (`guided.mjs:19–20`). History is cloned/deduplicated and bounded at 30 snapshots.
Only activity IDs `net/volume/area/composite` exist. No new record IDs for modes, projection or calculation.

## Persistence and isolation findings

- `LearningLabs.snapshot()` includes area/workshop mode, dimensions, lid and selection; composite state includes dimensions/join/selection/feedback (`labs.mjs:187–201`). It is an in-memory Undo format, not a native durable schema.
- `emitGuided()` deduplicates record messages; `ModuleAccess.progress()` sends protocol 1 plus session/record. Standalone module has no browser persistence (`accessibility.mjs:11,29`).
- Raw context session change clears guided text/records/touched/suspended motion and closes completion, but leaves area experiment and Undo history (`app.mjs:257–260`).
- Reproduced A→B: a=5, 6/6 selected and 150 cm² remain; Undo is still available; guided completion remains locked. Session message alone is insufficient for actor-partitioned checkpoints.
- Native host must use the frozen actor/epoch/lifecycle contract to discard or restore only that owner's instance/checkpoint. Do not expose stale A experimentation as B's draft.
- Durable-save receipt, EX11, native owner-switch behaviour, reopen and preference persistence need foundation implementation/evidence; no native writer/reader signatures are assumed here.

## Verification performed

Tests ran on an isolated full `digital/` copy at `/workspace/scratch/2c9458ca3d01/worker-4-check`; shared canonical snapshot was not mutated.
Node v24.22.1. `node tools/build.mjs` and `node tools/check.mjs`, from copied `digital/module/`: both exit 0.
Built HTML: 572718 bytes; SHA-256 `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`, identical to supplied canonical HTML.

Exact focused command (exit 0; **186/186 PASS**, 0 skipped/failed):

```sh
node --test tests/geometry.test.mjs tests/labs.test.mjs tests/lessons.test.mjs tests/extended-lessons.test.mjs tests/learning-mesh.test.mjs tests/surface-workshop.test.mjs tests/guided.test.mjs tests/guided-app.test.mjs tests/app.test.mjs tests/integration-v1.5.test.mjs tests/labs-ui-refresh.test.mjs tests/studio-records-ui.test.mjs tests/renderer.test.mjs
```

| Existing suite group | Relevant coverage |
|---|---|
| `geometry`, `labs`, `learning-mesh`, `renderer` | Rigidity, 1001-frame stable IDs/colours, logical curved identities, measures/mesh area, both composite formulas and reference framing. |
| `lessons`, `extended-lessons` | Independent expected formulas, slants, units, π modes, all eleven shapes, scaling and invalid inputs. |
| `surface-workshop` | One lid removed with fixed capacity, open/closed mesh area, inner walls, cavity oriented volume and invalid holes. |
| `guided`, `guided-app` | All activity gates, wrong answers, empty explanation, edits/retries, completed-record retention and session validation. |
| `app`, `integration-v1.5`, `labs-ui-refresh`, `studio-records-ui` | All eleven area choices, advanced modes, Undo, focus, session reset, host preference refresh, pause/background/resume and literal record text. |

An additional fixture probe passed all four phases for each original five area shapes and both composites, including wrong checks, empty explanations and post-completion invalidation.
Additional read-only Node probe passed both composite kinds × five join frames × five groups: IDs/groups/colours fixed and per-group mesh areas within 0.1% of analytic values; also reproduced the session-checkpoint finding above.
These are native Node/VM fixture checks with a minimal DOM, **not Android WebView, browser visual, TalkBack, physical-device, APK or durable-storage evidence**.
No Flutter completion is claimed. Resume only after a verified shared READY SHA, frozen APIs/hashes and source lock; then test real WebView/actor isolation, requested palette, advanced modes and complete reflections.

