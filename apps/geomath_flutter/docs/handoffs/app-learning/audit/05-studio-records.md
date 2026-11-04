# Studio, calculation and reflection audit

Date: 2026-11-04. Scope: Prompt 2 independent audit for screens 34–36, L06–L08.
Status: source audited; Flutter implementation waits for verified foundation READY.
No scaffold, frozen Dart types, database tables, queue or Flutter test result is claimed.

## Provenance and boundary

- App base: `38f061af963256528d5060ff076bae9ee05eafc3`, branch `app`.
- Audit branch: `app-learning-worker-5-2c9458ca`.
- Worktree: `/workspace/scratch/2c9458ca3d01/worktrees/worker-5` (clean initially).
- Canonical source: `main-digitalized` at `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`.
- Read-only source directory: `/workspace/scratch/2c9458ca3d01/canonical-snapshot`.
- Executed tests only in `/workspace/scratch/2c9458ca3d01/worker5-audit-source`, a copied `digital/` tree.
- Source package versions read: Digital `2.9.1`, module `1.6.2`; no version changed.
- Read root AGENTS/SOR, Prompt 2/common rules, APP and app architecture/UX/design/test documents.
- Lead verified remote `main` via GitHub API: `25836eb1a6f24459aace8a3980ae880a13e3b488`,
  firmware `2.0.2`; local worker refs expose only `origin/app`, with no local `main` object.
- Foundation contract/READY files do not exist in this app base. Exact Dart APIs remain blocked.

## Projection: preserve the canonical exercise

Owner: `digital/module/src/projection-geometry.mjs`; UI: `projection-studio.mjs`.
`PROJECTION_SHAPES` contains these seven project keys, not the full eleven-model catalogue:

| Keys | Source behaviour |
|---|---|
| `cube`, `cuboid`, `pyramid`, `cylinder`, `cone` | Five basic upright solids; actual study meshes/dimensions |
| `assembly-step` | Eight unit cubes; step/notch; shared internal faces removed |
| `assembly-recess` | Seventeen unit cubes; upper centre recess; real occluded edges |

| View | Observer | Coordinates relative to model bounds | Combined placement |
|---|---|---|---|
| `front` | +Z | x−minX, y−minY | Above plan |
| `plan` | +Y | x−minX, maxZ−z | Below front |
| `side` | +X | maxZ−z, y−minY | Left of front |

This is Kaedah 1. Native tabs may select one view; combined display/export keeps this arrangement.
Scale is the denominator `1` or `2`; every drawing length/radius is divided by it.
Default drawing anchor is `[1,1]` cm. Screen zoom, CSS pixels and physical screen size are irrelevant.
Cylinder/cone plans are analytic circles; elevations use rectangle/triangle outlines.
Pyramid plan contains true corner-to-apex edges; assemblies retain genuine hidden edges.

| Exact JavaScript export | Contract to reuse |
|---|---|
| `projectionModel(shape='cube', dimensions)` | Own dimensions, study mesh, bounds/extents, optional cells/grid step |
| `projectionDimensionSegments(model)` | Actual geometry arrows; round width is diameter; height is perpendicular |
| `projectionViews(model, scale=1, anchor=[1,1])` | `front/side/plan`, each with primitives, width/height, scale and anchor |
| `projectionDrawingBounds(primitives)` | Exact line/circle bounds, or null for empty input |
| `checkProjectionDrawing(expectedInput, actualInput, {tolerance=.06}={})` | Validity, missing/extra, issue codes and original element indices |

Primitives are `{kind:'line',a:[x,y],b:[x,y],type}` or `{kind:'circle',center:[x,y],r,type}`.
Types are `visible`, `hidden`, `construction`; use the canonical thick/dashed/thin legend.
Checker accepts reordered/reversed/duplicated/split/merged collinear coverage.
Visible edges override coincident hidden edges; construction lines cannot replace answer edges.
Tolerance is inclusive **0.06 drawing cm**, with source epsilon `1e-8`; never rescale it at 1:2.
It applies to perpendicular offsets, endpoints/gaps, centre Euclidean distance and radius error.
Issue codes: `position`, `length`, `scale`, `shape`, `line-type`, `missing`, `extra`.
Pure checker rejects invalid/nonfinite primitives and arrays over 512 entries.
Studio limits each view to 200 elements and retains 30 independent Undo snapshots per view.
Coordinates/keyboard provide a drawing alternative to drag; clear/delete are undoable edits.
Four guide steps precede independent practice; examples/hints never fill the answer drawing.
Changing shape, applied dimensions or scale explicitly starts a new guide and empty drawings.
Studio dimensions accept whole numbers 1–20 cm; assembly dimensions remain unit-cube based.

## Calculation: retain semantics and bounded parsing

Owner: `digital/module/src/calculation-steps.mjs`; UI owner: `calculation-workshop.mjs`.
Sequence is `formula → substitution → calculation → unit` (Rumus→Gantian→Pengiraan→Unit).
The UI gates later steps and invalidates their confirmations after an earlier answer is edited.
Dimensions are 0.1–1000 cm; diameter UI converts to stored radius before problem creation.
All eleven models remain supported; open cuboid/cylinder and matched-base composite contexts remain.

| Exact JavaScript export | Contract to reuse |
|---|---|
| `calculationParseExpression(raw)` | Returns `{ast,variables,nodes,source}`; accepts arithmetic only |
| `calculationEvaluateExpression(expression, variables={}, piMode='22/7')` | Evaluates canonical parsed/string expressions; trusted internal variables |
| `calculationProblem(options={})` | Validated shape/context/dimensions/π/unit, answer and exact substitution |
| `calculationCheckStep(problem, step, input)` | `{correct,code}`; unit input is `{value,unit}` |
| `calculationConvert(value, fromUnit, toUnit)` | Same-quantity conversion using square/cube scale factors |
| `calculationSolution(problem)` | Formula/substitution/base answer/converted answer/unit without filling inputs |

Limits: raw input ≤480 UTF-16 units, tokens ≤180, AST nodes ≤180, internal parse depth ≤28.
Exponent magnitude ≤12; literals and evaluated arithmetic must stay finite within ±1e30.
Depth 28 counts parser recursion, not brackets: six nested brackets around `1` pass; seven fail.
Allowed syntax includes implicit products, decimal comma, π/pi, sqrt, powers and canonical glyphs.
Aliases are `r→j`, `h→t`, `w→l`; cube edge is `a`, while `s` is slant height.
No eval/Function/member access/code execution. Route only validated strings and problem inputs.
Do not expose parsed AST objects or unbounded caller-provided variables across a native bridge.
Formula equivalence samples nine independent dimensions; numeric coincidence is insufficient.
Substitution requires actual givens/derived values, with bounded provenance search (8192 attempts).
π modes `22/7`, `3.142`, `full` and final-only rounding/tiny-positive handling must survive reuse.
Cube a=4 gives 96 cm² / 64 cm³; square/cubic conversion and capacity units are canonical.

## Reflections, drafts and actor storage

Owners: `src/guided.mjs`, `src/accessibility.mjs`, `digital/dist/module-progress.mjs`.
Only `net`, `volume`, `area`, `composite` are record IDs; projection/calculation add no activities.
Record fields: `{activity,stage,prediction,result,explanation,completed}`.
Stages: `prediction`, `experiment`, `check`, `explanation`; completed is strictly boolean.
Text maxima: prediction 240, result 600, explanation 600 UTF-16 units (before normalization trim).
Every record needs prediction; later stages need result; explanation stage needs explanation.
`completed:true` additionally requires explanation stage and a nonblank explanation.
`normalizeModuleRecord(value)` trims, whitelists fields and rejects forbidden control characters.
`mergeModuleProgress(...groups)` preserves completed evidence against unfinished retries;
completed revisions may replace completed evidence, and output follows the four canonical IDs.
`GuidedActivity.restore(record)` restores self-report only; it never unlocks live experiment gates.
`retry/edit/check` preserve earned completed evidence until another full completion is valid.
Records are self-reflection, with no TP/XP/grade/streak or invented scores.

Draft/checkpoint storage is a separate local type; canonical studios provide no durable serializer.
Retain shape/dimensions/scale, three drawings, Undo, guide cursor, camera, unapplied measurements,
calculation answers/checks/active step/π/unit as appropriate to an explicitly versioned checkpoint.
Ordinary navigation/preferences preserve drafts in the existing instance; destruction loses them.
Checkpoint restore must validate bounds and rebuild/recheck derived geometry and confirmation state.
Never serialize DOM, renderer, Set/Map internals or whole controller objects blindly.

Integration findings requiring foundation/adapter treatment:

1. `validGuidedRecord` is weaker than `normalizeModuleRecord`: it accepts NUL in text.
   Native writer acceptance must match the stricter parent normalizer, not only the module predicate.
2. `CalculationWorkshop.resetContext()` clears answers/checks but retains dimensions/quantity/π/context.
   Actual shipped fixture retained a=7.5 and volume after a new module session; actor change must create
   a fresh isolated module instance or fully replace its actor-owned checkpoint before display.
3. Module session changes reset live drafts. Send initial context before restoring a permitted
   checkpoint; preference refresh must keep the same instance/session rather than reopen it.
4. Keep progress `protocol:1` and settings `version:1`; native actor/session/epoch/nonce remain outside
   record payloads. JS cannot choose owner. Late saves/reads cannot cross actor or module instances.
5. Consume actual frozen `FormativeRecordWriter.saveReflection` / reader `watchReflections` later.
   Guest/local durability and signed-in atomic record+outbox belong to their single shared owner.
   Learning creates no second SQL schema/queue; only durable receipt permits a saved UI state (EX11).

## Verification performed and next gates

Node `v24.22.1`: module focused suite **110/110**, progress/view suite **12/12**, both exit 0.
Module command: `node --test tests/{projection-geometry,projection-studio,calculation-steps,calculation-workshop,learning-tools-calculation-contract,learning-tools-geometry-contract,learning-tools-integration,guided,guided-app,studio-records-ui}.test.mjs`.
Parent command: `node --test tests/module-progress.test.mjs tests/module-progress-view.test.mjs`.
Extra inline assertions: **35/35** parser/text/merge boundaries plus **3/3** actor-reset observations.
Initial extra probe exit 1 assumed numeric-invalid formula feedback was `invalid-expression`;
formula requires symbols first. Corrected probe checks evaluator rejection; no source defect inferred.
No canonical file edited; no Flutter/widget/WebView/Android/build/physical-device test performed.
After READY: verify frozen signatures, actor checkpoint isolation, cold reopen, EX11 rollback,
real WebView primitives/Undo, tolerance boundaries at both scales, locale/large text and system Back.
Report-only branch: run `git diff --check`, commit only this file, return actual SHA; no push.
