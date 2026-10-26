---
version: alpha
name: "GeoDecoder Learning Module"
colors:
  primary: "#215FF0"
  ink: "#18334B"
  background: "#F3F7FB"
  surface: "#FFFFFF"
  success: "#127957"
  danger: "#B9403E"
  accent: "#FFCB66"
  muted: "#526A7D"
  border: "#D9E4ED"
  controlBorder: "#7D94A8"
typography:
  display:
    fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif'
  sans:
    fontFamily: '"Segoe UI", Arial, sans-serif'
    fontSize: "1rem"
    lineHeight: "1.65"
  mono:
    fontFamily: '"SFMono-Regular", Consolas, monospace'
rounded:
  DEFAULT: "1rem"
  lg: "1.5rem"
  control: "0.625rem"
  small: "0.375rem"
spacing:
  unit: "0.25rem"
  panel: "1.5rem"
  pageMax: "85rem"
components:
  button:
    height: "2.75rem"
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  modelStage: {}
  faceChip: {}
  field: {}
  feedback:
    textColor: "{colors.success}"
---

# GeoDecoder Learning Module

## Overview

A classroom geometry workbench for Malaysian pupils, with BM at Tingkatan 1
reading level. Product register throughout. The openable, colour-traceable solid
is the signature. Quiet controls frame the actual geometry; no decorative hero,
background animation, account workflow or dashboard is added. Preserve the palette
and system-font identity in ../DESIGN.md without modifying the quiz design.

Model B ownership: **src/design-system.mjs is the canonical UI token and icon
source**. tools/build.mjs generates src/design-tokens.css and embeds that CSS plus
src/style.css into GeoDecoder_Modul_V1.html. Generated CSS is never hand-edited.
This document mirrors accepted values and explains their use. tools/check.mjs
compares the generated file byte-for-byte and checks every token in the HTML.

## Colors

Royal blue actions, navy ink, cool white-blue surfaces, mint success. Keep the nine
inherited brand colours unchanged. Native control boundaries use #7D94A8 rather
than the low-contrast decorative panel border. Selected controls combine border,
aria-pressed and a tick/explicit label; colour alone never conveys selection.

Semantic state tokens include --primary-dark, --primary-pressed, --hover,
--selected, --blue-soft, --mint-soft, --danger-soft, --warning-soft and
--warning-ink. The theme source owns all exact values. tools/check.mjs verifies
4.5:1 text contrast for the canonical text/state pairs and 3:1 control boundaries.
Geometry FACE_COLORS deliberately remain independent from status colours: a face
keeps its own ID, name and colour throughout unfolding. Original diagram face
colours and mathematical line markings are not interaction tokens.

## Typography

Trebuchet MS display, Segoe UI body and SFMono/Consolas data, all system fallbacks.
No downloads or font swap. Token scale: caption/compact controls 12px, general controls/supporting copy
14px, reading text 16px, subheading 18px, heading 24px, title 32px. Page headline
is fluid 30–40px. Body line-height 1.65; headings 1.25. Never shrink controls,
notes or feedback to 7–11px to fit a phone. Text wraps; tables scroll locally.

## Layout

Maximum page width 85rem. Shared spacing scale 4, 8, 12, 16, 20, 24, 32 and 40px.
Desktop exploration and notes use a 20rem reference column. Two-column content
stacks at 900px. Phone padding is 16px; cards use 16px padding below 600px.
Three section actions remain labelled and wrap into a vertical set on phones.
The five shape previews remain visible together. The model gets the wide column.

Model instructions and camera controls live in normal flow, outside the canvas;
they never cover geometry, focus or the progress slider. Camera/header rows wrap
instead of shrinking controls. Six orthographic choices use 3×2, then 2×3 on phones.
Notes keep natural document height; the reference is never a long sticky overlay.

The four labs share one scene, camera, playback area and activity-control column.
The entire scene column is sticky only on sufficiently tall desktop screens;
smaller/shorter screens use natural document scrolling. Explicit playback reveals
the model. The control column ends with **Lihat perubahan pada model**, providing
an immediate return after dimensions or choices change on a phone.
No fixed header, floating bottom toolbar, viewport-height page shell or global
horizontal clipping. Tables own their horizontal overflow and visible scrollbar.

## Elevation & Depth

Panels use thin cool borders; strong native-control boundaries make affordances
clear. Only selected segmented controls and the dragged-face ghost use the shared
subtle shadows. Canvas shading describes physical geometry. No large floating
shadows, glass panels, illustrative model substitutes or distortion for layout.

## Shapes

16px panels, 24px primary workspace, 10px controls and 6px small markers. These are
radius tokens. Mathematical corners, edges, curvature and net connections stay
exact; UI radius never alters geometry.

## Components

| Owner / role | Canonical path | Consumers |
|---|---|---|
| Colour/type/space/radius/control/motion tokens | design-system.mjs → generated design-tokens.css | all module surfaces |
| Button, selection, field, panel and feedback recipes | style.css shared selectors | exploration, notes, four labs |
| Safe DOM/SVG and playback labels/icons | ui.mjs | app.mjs, notes.mjs, labs.mjs |
| 24×24 SVG icon paths, 1.8px stroke | UI_ICONS in design-system.mjs | static build placeholders + uiIcon |
| Learning/model state and progress | app.mjs | exploration, six orthographic views |
| Note presentation and field validation | notes.mjs | all five lesson data records |
| Lab state and one cancellable animation loop | labs.mjs | all four labs |
| Geometry, formulas and calculations | geometry.mjs, lessons.mjs, lab-geometry.mjs | renderer and learning activities |
| Version | MODULE_VERSION in content.mjs | badge, package, README, changelog checks |

Buttons expose normal, hover, focus, active, selected and disabled states through
one recipe. Primary actions use solid brand emphasis; supporting/reset actions
use outline or text emphasis. Hover changes colour without moving the target.
All standard controls are at least 44px high. Spatial net cells are the documented
exception: at least 36px high with 4px gaps on 320px; the labelled select and 44px
directional buttons provide the non-drag alternative. Native checkbox glyphs are
20px inside a labelled 44px target. Icon-only controls have BM names and titles.

Native select ownership is intentional: platform-owned popup geometry and OS
interaction are accepted. No appearance:none or custom half-listbox. Ranges,
checkboxes and details retain native semantics, keyboard operation and focus.
Fields have actual labels, inline associated errors and first-error focus.
The global scrollbar baseline covers standards and WebKit, including forced colors.

### Motion

Canonical timings (ms): UI 140, feedback 220, panel 240, camera 700, exploration
unfold 5800, lab fold 4000, join 1600, pour 2600, layer 600, compare add 1200, compare fill 2600, endpoint hold 1000. Lab durations are divided by the chosen speed (default 0.5). Shared easing
for UI: cubic-bezier(.2,.7,.2,1); geometric interpolation keeps the original
smoothstep. No repeated perpetual UI animation. Diagram labels use the 16px token, giving 12px at the narrow 210/280 scale.
CSS panel entrance is a 4px
translation/opacity of the interface only, never a replacement for unfolding.

All animation has one progress state and a cancellable loop. Pause freezes both
progress and pending camera motion. Lab resume preserves its original elapsed
easing timeline. Hidden tabs suspend work and require explicit resume; section
or lab changes suspend it for an explicit resume. Shape, dimension and direct slider changes cancel the affected timeline. Playback uses elapsed active time rather than frame count; hidden time is excluded.

Unfolding remains actual rigid/analytical geometry. Lab animations use a cached
reference mesh sampled across their path to keep framing and physical scale
stable while folding, developing or joining. User orbit/zoom still work. Face
colours and names remain unchanged. Reduced motion disables initial spin, camera
transitions, UI entrance and smooth scrolling; deliberate educational playback
and direct sliders remain available. Preference changes stop running movement.

## Do's and Don'ts

- Do prioritise model, readable instruction, direct action, then explanation/result.
- Do keep original KSSM/DSKP notes, ten examples and all four activities available.
- Do test disabled, invalid, overlap, retry and narrow states, not only screenshots.
- Don't alter formulas, dimensions, projections, joined faces or quiz behavior for design.
- Don't use perspective distortion for the six orthographic views.
- Don't present a net as a view, sector as triangle, or curved surface as a hinge.
- Don't add CDN, external fonts, telemetry, storage or runtime requests.

## Reconcile drift — v1.2.1

| Previous rule / implementation | Verdict | Resolution |
|---|---|---|
| No spacing API; repeated screen-local literals | DRIFT | One canonical token source; generated CSS with deterministic drift check |
| Text reduced to 7–11px on phone | DRIFT | 12/14/16px readable scale, wrapping and natural document flow |
| Multiple button/panel/field recipes | DRIFT | Shared normal/hover/focus/active/selected/disabled primitives |
| Whole lab column sticky at ordinary desktop heights | DRIFT | Restrict to tall desktop; return-to-model control on all widths |
| Independent pause/resume labels/timing | DRIFT | Shared playback presentation and preserved elapsed timeline |
| Existing brand palette, face IDs and curriculum | MATCH | Preserve; runtime mathematical sources unchanged |

## Tempo dan perbandingan v1.3.0

Keep the model the visual anchor. Put speed, motion state and the single
Pause/Resume control immediately above the canvas. A compact numbered guide
shows the next meaningful action; surface selection waits for the flat net,
and exterior checking waits for the complete join. No surprise auto-resume.

Nine ready-made nets use the same native select and face chips. Cube editing
is a separate labelled choice; editing locks until the layout is flat. Face
identity stays coloured and numbered. Extra prisms use regular polygon bases.

Volume comparison uses A mint / B blue, with text naming their left/right
positions, independent measurement details and labelled percentage ranges.
The stage outcome also shows both current volumes and the selected total, so
students see the result while watching a fill. One-solid mode hides B controls.
Amount, fill height and empty capacity must remain explicitly distinguishable.

## Peluasan v1.4.0

Keep the five primary cards and put six learning extras in one labelled native
select. Reuse existing field, action, output and detail styles. A shared quantity
field precedes the A/B cards; transfer is a progressive disclosure with a visible
conservation ledger. Surface mode switches reuse one canvas and camera. Advanced
surfaces highlight meaningful groups without exposing renderer face numbers.
Studio connection details reveal one face at a time. Print preview represents a
physical mm plan while responsive width only affects screen display. No new
brand palette: two supplementary face colours extend the six original colours
without changing their identity. The version badge is V1.4.0.

## Integrasi MD v1.3.1

The v1.2.1 design system is integrated with all v1.3.0 gallery, pacing and volume controls. Their new guide, speed selector, comparison cards and sum choices use the same token recipes and 12/14/16px type scale. Volume A/B colour markers mirror the unchanged geometric fill colours through --volume-a/--volume-b. The source helpers preset-nets.mjs and volume-lab.mjs remain authoritative for their mathematical models.

## Latihan dan akses v1.5.0

The guided panel uses existing field, button and feedback primitives, with a visible
scope explanation before the prediction. Exploration-only modes stay available.
Undo and retry remain separate from camera reset. Dark values share the canonical
src/design-system.mjs source and generated CSS with light tokens. Focus expands
the real model and keeps control labels visible. The optional speech area always
retains its transcript and reports local voice availability for the active language.
