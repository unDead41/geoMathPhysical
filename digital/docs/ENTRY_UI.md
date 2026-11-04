# GeoMath: shared entry UI

Scope: Home, choose a game, resume and how to play, matching the supplied reference.
Work branch: `digitalized-ux-ui-upgrade`. Base: `391df985eea4fee15d9859e678068b1a3f613cba`.
This is a separate preview. Do not publish it to either integration branch or the
existing public Pages repository without a later instruction from Ijamm.

| Element | Owner | Reuse rule |
|---|---|---|
| Palette, typography, focus, contrast, timing | design-system/tokens.mjs | Change here, then regenerate; no page token copies. |
| Buttons, fields, dialog, feedback | dist/foundation.css and existing app owners | Reuse existing classes, validation and native dialog. |
| Header and footer | dist/index.html | One shared shell for every screen; do not duplicate into a page. |
| Mode card | entry-components.mjs: modeCard/ENTRY_MODES | Add a configuration row and catalog strings. Preserve the Game mode contract. |
| Guide step | entry-components.mjs: guideStep/guideSteps | Use the same semantic step markup, shared 3D illustrations and exact shapeArt fallback diagrams. |
| Information panel | entry-components.mjs: infoPanel | Accept escaped or trusted catalog text only. |
| Geometry illustration/icons | entry-art.mjs; existing art.mjs | Keep exact geometry and accessible equivalent descriptions. |
| Entry layout and responsive rules | entry.css | Consume shared tokens; document scrolling; no second framework. |
| BM/English entry text | entry-copy.mjs → existing i18n.mjs | Add both languages; locale remains the application owner. |
| View bindings/demo | entry-ui.mjs | No direct Game, Auth or storage mutation. |
| Dimensional assets | entry-models.mjs | Original procedural models, shared PALETTES and central theme colours; decorative only. |
| Renderer and animation | entry-scenes.mjs | One WebGL context, visible-route rendering, 30 FPS cap, pixel ratio capped at 1.5, reduced motion and static SVG fallback. |
| Navigation/game/storage | app.mjs, core.mjs, solo-save.mjs | Existing leave guards and actor-scoped snapshots remain authoritative. |

Routes: `#utama`, `#main`, `#sambung`, `#cara-bermain`. Learning and class links
continue into the existing application. Empty resume is intentional until a real
unfinished round exists. Saved dates are optional metadata; older snapshots work.

Build: run `npm ci`, `npm test`, `npm run build`, `npm run prepare:pages`,
`npm run check`, `npm run design:check` in digital. For the separate static
preview, run `node tools/package-preview.mjs` from the repository root.
The preview uses the canonical external bundle; downloadable HTML remains
self-contained with the original complete audio tracks and pinned module.

No schema, Supabase service, firmware, UID registration, scoring or module
geometry changes are part of this work.

## Dimensional entry refresh — 4 November 2026

Home: true 3D cube, pyramid, cylinder and cuboid on a gridded board with ruler,
set square and compass. Drag to rotate, or use Left/Right/Reset buttons; Pause
uses the existing motion preference rather than a second local setting.
Mode cards: shared clipboard, graduation cap and two-player assets.
Resume and guide: the same solid materials/board with a valid six-square cube
net. These are presentation assets; learning geometry and live answers are
untouched. Theme changes rebuild material colours without changing page state.

Three.js 0.180.0 (MIT) is pinned in package.json/package-lock.json and bundled
by the existing builder. No runtime CDN/HDRI/model downloads. Failed/unsupported
WebGL keeps accessible copy, SVG artwork and every ordinary control available.
