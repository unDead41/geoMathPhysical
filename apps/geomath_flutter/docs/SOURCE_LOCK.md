# Canonical Digital source lock

The foundation app is `0.1.0+1`, based on app commit
`38f061af963256528d5060ff076bae9ee05eafc3`. Its Digital source is
`main-digitalized` commit `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`,
Digital **2.9.1**, module **1.6.2**. The canonical recursive Git tree is
`ce89242bbf9409c6ccad5129631dfe8ac3a52db8`.

The separately audited firmware `main` reference is
`25836eb1a6f24459aace8a3980ae880a13e3b488`, firmware **2.0.2**. No firmware
source or version is changed by this app export.

`docs/source_lock.json` is the app-relative machine-readable provenance record. The independent
`tools/contracts/canonical_inputs.json` pins the Git blob, SHA-256 and byte size
of all 47 build/export inputs. The exporter checks those bytes before imports
or build execution. The app branch does not edit or generate `digital/**`.

| Contract | Frozen source value |
| --- | --- |
| Bank | 15 original questions, three per game shape |
| Bank content version | `bank15-sha256:6ea4e9057d1f04e4f485aeefd89ec3cb681deb07b2dad7e76862e78e22159065` |
| Ruleset | `single-attempt-v1` |
| Game shapes | cube, cuboid, pyramid, cylinder, cone |
| Quiz / practice | 10 / 15 questions |
| Learning catalogue | 11 models through `learning-mesh.mjs/studySolidMesh` |
| Progress / settings / native envelope | separate protocol 1 / version 1 / version 1 |
| Solo snapshot / formative record / asset manifest | schema 1 / 1 / 1 |

## Exported contracts

`assets/contracts/bank15.json` contains the original bank verbatim as JSON.
`ruleset.json` carries constants and separately named protocol versions.
`learning_catalogue.json` contains the canonical eleven-model terminology,
surface counts, default dimensions and physical surface IDs. Sphere and closed
hemisphere retain one and two physical surfaces respectively; tessellation
patches do not become new faces.

`engine_golden.json` records quiz and mixed-practice scenarios as concrete
actions, absolute clock inputs, explicit ordered RNG draws, returned outcomes,
per-action state/LED snapshots and final results. Dart must consume those draws
in order; a matching numeric seed across languages is not assumed. The corpus
covers the R1-solid/R2-net order, blocked input, hints, pause/resume, correct
pairs, failed single attempts, review delay, skips and both round sizes.
`tools/contracts/reference/*.mjs` are byte-identical pinned JS sources used for
replay, including the canonical Duel projection import dependency. These are
reference tests, not a client-authoritative Duel engine.

`geometry_cards.json` copies real canonical solid and net vertices and stable
face IDs for the five game shapes. Every face has the same neutral fill.
`core/geometry/GeometryCardProvider` and `GeometryCardView` are independent of
the learning feature. Optional exported SVG cards use the same mesh coordinates;
they are not traced mockups and are not required by the native painter.

## Full offline module

The canonical build is run in a temporary complete source snapshot with the
real `digital/module/tools/build.mjs`. Its self-contained HTML is **572,718
bytes**, SHA-256
`7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`.
That unchanged build output is retained as `assets/module/canonical-module.html`.
It includes the complete model/notes/labs/projection/calculation runtime.

The feature entry point `assets/module/index.html` loads a local wrapper script.
The wrapper embeds the source-built HTML, installs the canonical settings and
language adapter, and mounts it in an opaque `sandbox="allow-scripts"` iframe.
There are no runtime website/GitHub/CDN fetches, remote module imports, service
worker requirements, cloud credentials or remote speech requests. Optional
speech uses only a locally installed voice; unavailable voices leave text usable.

The build adapter changes presentation only: face colors use stable physical
IDs, approved cube/cuboid palette, and one color per real curved surface. It
colors the canonical mesh and surface-piece producers by their actual shape;
custom laboratory renderers retain those face colors and matching legends. It
does not change meshes, formulas, parser, projection or folding. A source-bound
read-only snapshot plus strictly enumerated DOM control actions support real
WebView smoke tests; they do not substitute a renderer.

`ModuleAssetRepository.verify()` checks the feature manifest, required entries,
path boundaries, duplicate names, byte lengths and every SHA-256 before creating
a WebView. Missing or corrupt assets fail closed. The central application asset
catalog should register only feature manifest paths; per-file hashes belong to
`assets/module/manifest.json` and `assets/contracts/manifest.json`. A later
learning bundle can update its own manifest without editing a frozen aggregate
hash list.

## Native wrapper boundary

Android's `webview_flutter` JavaScript channel does not report the originating
frame. The native adapter therefore explicitly declares `wrapperCapability`
proof rather than inventing platform main-frame metadata. It verifies the
current top-level local asset URL and native document generation, then validates
the envelope against a random bridge capability retained only in the wrapper's
closure. That capability is never placed in a URL, DOM attribute, child message,
diagnostic object or getter. The one-shot bootstrap setter is removed after
configuration. The opaque child receives only the separate progress
session and canonical settings instance. The wrapper checks `event.source` and
opaque origin before forwarding any allowed canonical command.

The core bridge binds the native actor/session/epoch and lifecycle; JS cannot
select the owner. Actor change closes the instance and clears its iframe.
Late, malformed, oversized, unsupported and stale messages cannot become native
commands. Main-frame navigation is pinned to the single verified file; child
navigation permits only local `about:srcdoc` anchors.

The adapted child labels provisional reflection state as drafts/activity state.
Only the native record writer's awaited durable receipt can produce a saved
notice. A full/failed disk or an uninstalled queue cannot be claimed as saved.

Preferences update through settings version 1 and module context protocol 1
without reload. Camera, selected model, unfolding, dimensions and drafts remain
owned by the canonical runtime. The native audio coordinator grants one module
lease; revocation stops speech and waits for a child acknowledgement. Covered
routes and app lifecycle pause the module without recreating its document.

## Reproduce and verify

From the Flutter app folder, using an exact canonical source checkout and its
complete recursive Git tree JSON:

```sh
node tools/module/build_module.mjs /path/to/canonical /path/to/recursive-tree.json
node --test tools/contracts/verify_exports.test.mjs
flutter analyze --no-pub lib/core/geometry lib/features/learning test/contracts test/learning
flutter test --no-pub test/contracts test/learning
```

The source build and **341 original canonical module tests** passed in an
isolated snapshot. Export/adapter contract tests passed. Those checks prove
source, geometry/parser and wrapper behavior; they are not Android rendering,
hardware or device-smoke evidence. Actual Android run status belongs in the
foundation READY receipt and handoff, recorded by the lead after the device gate.

After foundation freeze, `features/learning/**`, `assets/module/**` and
`tools/module/**` transfer to Prompt 2. The bank/golden/neutral provider remain
shared foundation contracts; Prompt 3 does not import learning implementation.
