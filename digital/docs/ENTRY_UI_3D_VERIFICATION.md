# GeoMath animated entry UI verification

Verified 4 November 2026 (Malaysia). Code revision: `f213e1d9c6c17ae49aa49a2bb02eb674e8b754ea`.
Work branch: `digitalized-ux-ui-upgrade`. Previous entry baseline:
`6c7c4656199f0118fafba37a6eb5a6f78999a541`.

## Delivered

The existing four entry pages share original procedural 3D assets, with satin
materials, chamfered edges, studio lighting and board shadows. Home has labelled
Left/Right/Reset and Pause controls as alternatives to dragging. The existing
motion preference remains the sole owner. Native mode radio semantics, actual
resume state, demo playback, navigation, game rules and data owners remain intact.

Three.js 0.180.0 is pinned and bundled. One renderer serves visible scenes;
WebGL is preferred, Canvas2D renders the same model/camera data when WebGL is
unavailable, and SVG remains the last fallback. Rendering caps are 30/20 FPS
(GPU/CPU), with 1.5 maximum pixel ratio. Hidden routes and background tabs stop
animation. No remote model, font, texture or HDRI requests are required.

## Checks run

- Full existing application suite: 353 passed, zero failures.
- New scene lifecycle/finite-geometry/mesh-budget tests: 2 passed.
- Final entry/settings/real save-resume suite: 13 passed, zero failures,
  including those 2 scene cases.
- Build, prepare:pages (local artifacts only), check and design:check passed.
- Strict UI audit: zero errors or warnings.
- DESIGN.md lint: zero errors, six existing optional-token warnings.

## Live browser evidence

Published preview: https://undead41.github.io/geomath-ui-preview/#utama
Preview commit: `c63d31bc2388d11ed40c086119eab6b1f26d97ca` on `unDead41/geomath-ui-preview:preview-ui-upgrade`.
Pages workflow: https://github.com/unDead41/geomath-ui-preview/actions/runs/41757354297 — completed successfully.

The browser read back the code revision from the deployed HTML and rendered
`canvas-3d` artwork. Its WebGL provider is disabled; therefore live GPU rendering
and physical device GPU performance are not claimed. The shared Three.js assets
build successfully and their geometry is covered by the new tests.

- Home: animated 3D board/solids, rotation controls, reset and central pause.
- Modes: clipboard, graduation cap and two-player 3D assets; native mode radios.
- Guide: cube, valid six-square cube net and completed-pair artwork.
- Resume: real empty state and shared cube assets; no sample save inserted.
- All four pages: 320 px, English, dark theme, text 150%, reduced motion,
  document scroll width 310 px (no horizontal overflow).
- Home additionally verified at 390 px (document scroll width 380 px).
- Preferences restored to BM / system theme / normal text / system motion.

The HTTPS-only responsive fixture is `entry-review.html` in the separate preview,
from `tests/browser/entry-3d-review.html`. Local cloud-browser access is unavailable;
verification used the real HTTPS Pages build. The repository-wide legacy browser
suite was not used as evidence for this change.

Proof: [animated-3d-home.jpg](entry-ui-evidence/animated-3d-home.jpg).

## Branch boundaries

Original `main` remains `25836eb1a6f24459aace8a3980ae880a13e3b488`.
Original `main-digitalized` remains `391df985eea4fee15d9859e678068b1a3f613cba`.
Neither branch was pushed/merged; the existing public geodecoder-digital site and
backend were not changed. Only the existing UI work branch and its separate
preview branch received the refresh.
