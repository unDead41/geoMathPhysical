# Offline learning adapter

From `apps/geomath_flutter`, regenerate the adapter from the already verified
canonical HTML without a source checkout:

```sh
node tools/module/rebuild_bundled_module.mjs
node --test test/features/learning/bundle/*.test.mjs test/features/learning/surface/*.test.mjs
```

`rebuild_bundled_module.mjs` checks the canonical HTML against the source lock
and `reference/provenance.json`, and verifies every frame dependency by byte
count, SHA-256 and Git blob SHA-1 before importing it. The reference files are
unchanged files read through the GitHub connector at source commit
`37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` on 6 November 2026. Three are also
checked against `tools/contracts/canonical_inputs.json`; the generated design
reference is pinned by its Git blob at that same commit. No network is needed
by this rebuild or by the resulting module.

The full canonical-source route remains available:

```sh
node tools/module/build_module.mjs --feature-only CANONICAL_ROOT RECURSIVE_TREE_JSON
```

Both routes use `prepare_module.mjs`. Make presentation changes to its adapter
sources, then rebuild; do not edit the generated `native-adapter.js` directly.
`canonical-module.html` stays byte-for-byte identical. Bootstrap diagnostics,
source/origin guards, readiness channels and monotonic private action sequences
are preserved.

Private controls added by the UI adapter:

| Action | Exact payload | Behavior |
|---|---|---|
| Camera preset | `{action:'preset',view:'front'}` | `front`, `back`, `left`, `right`, `top`, `bottom`, `isometric`; exploration only; keeps section, zoom, unfolding and physical selection |
| Study panel | `{action:'panel',panel:'notes'}` | `notes` or `calculator` over exploration/2D views; `none` closes; moves the existing study node without replacing the model or document |

Preset yaw/pitch pairs match canonical `VIEWS`: front `0,0`; back `π,0`;
left `−π/2,0`; right `π/2,0`; top `0,π/2`; bottom `0,−π/2`. Isometric uses the
canonical initial camera `.55,.35`. The older `view` action still selects one
of the six actual 2D views. Panel state is presentation-only diagnostics
`panel`/`height`, while measurement drafts remain in the existing checkpoint.
Panel height supports pointer dragging, keyboard arrows, Home/End and a labelled
range input. Closing/reopening retains raw measurements and open examples.

The app adapter extends the version-1 settings bridge with the actual effective
system/user text percentage: any finite number greater than zero through 1000,
including fractional percentages. Native combines its OS and app text settings
before sending this value; the child preserves it without clamping to presets.
The existing `motionPaused` field includes system reduced motion. The pinned
reference files remain byte-identical; `prepare_module.mjs` applies this additive
font-scale extension to one explicitly checked serialized validator anchor.

Node ports exercise the real bundled controller, geometry, renderer hit testing
and pointer listeners. They are not browser layout, Android, TalkBack, pixel or
physical-device evidence. Real WebView review is still required for those claims.
