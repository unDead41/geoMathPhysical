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
typography:
  display:
    fontFamily: '"Trebuchet MS", "Avenir Next", sans-serif'
  sans:
    fontFamily: '"Segoe UI", Arial, sans-serif'
  mono:
    fontFamily: '"SFMono-Regular", Consolas, monospace'
rounded:
  DEFAULT: "1rem"
  lg: "1.5rem"
omitted:
  - section: spacing
    reason: "Module layout uses src/style.css; no shared spacing API is added."
components:
  button: {}
  modelStage: {}
  faceChip: {}
---

# GeoDecoder Learning Module

## Overview

A classroom geometry workbench. The openable, colour-traceable solid is the
signature; quiet controls frame it. This is a product tool for independent
learning in BM. Retain the existing ../DESIGN.md identity. No rebrand of the game.

## Colors

Normative UI palette and fonts are inherited from ../DESIGN.md. src/style.css
maps the existing values to the same --primary/--ink/--bg/etc variables;
tools/check.mjs rejects palette drift. Face palette in geometry.mjs deliberately
adds teal, blue, pink, lavender, yellow and coral: in this learning variant, colour
tracks a face rather than encoding a quiz answer. Number/name always accompanies it.

## Typography

Existing system fonts, no downloads. Display font carries compact headings;
body font carries BM explanations; monospace shows version and progress.
Content remains text outside Canvas for reading and assistive technology.

## Layout

Main model occupies the wide column; notes use a 300px side column. Stack below
850px; at phone widths shape choices remain five visible buttons and notes follow
the model. Document scrolling owns the page. Main animation actions wrap into a
2×2 grid. Six orthographic choices form a 3×2 grid. Keep clear labels for the two
representations. Stage reserves a fixed footprint; feedback has reserved space.

## Elevation & Depth

Thin cool borders for panels. Shading describes geometry, rather than decorative
cards. No photographic/AI geometry, visual-only substitutes or fade transitions.

## Shapes

16/24px panels and 10px buttons follow the game. Mathematical corners stay exact.

## Components

Native buttons with hover/focus/pressed/disabled states. Native range/checkbox
control retained; authored visual previews are buttons, not an improvised listbox.
Global scrollbar baseline includes standards, WebKit and forced-colors support.
Model has visible keyboard focus, non-drag direction controls and textual notes.

User explicitly requested slow automatic rotation and surface animation. This is
a module-only motion variant of the game contract's small card/hero motion.
Reduced motion disables initial spin and camera tween, while deliberate
educational playback and a direct progress slider remain available. No motion
continues in a hidden tab. The game DESIGN.md/UX behavior is unchanged.

## Do's and Don'ts

- Do make model and animation the focus; support comparison and self-explanation.
- Do keep one progress state, one face ID/colour and one geometry source.
- Don't use perspective distortion for the six orthographic choices.
- Don't present a net as a view, a sector as a triangle or curved surfaces as hinges.
- Don't add accounts, marks or telemetry to free learning.

## Nota pembelajaran v1.1.0

Use the shared shape picker with two clear learning choices, Teroka 3D and
Nota pembelajaran. Notes use a readable main column and a compact formula
reference on desktop. Keep chapter jump controls visible at the note entrance;
stack content naturally on narrow screens. Tables scroll within their own
labelled keyboard-focusable region. Do not give the whole page horizontal scroll.

Reuse existing typography and navy/blue/mint tokens. Surface-area formulas are
blue and volume formulas green, with explicit labels and squared/cubed units.
Use native details for original worked examples. The measurement activity has
real labelled fields, inline errors, reset and unit-bearing outputs. The SVG
section explains t/s/radius or half-base and must never be presented as a net.

Canonical owners: notes.mjs for note interactions; lessons.mjs for instructional
data and numerical calculation; app.mjs for the shared shape/motion state.
All current source remains offline and dependency-free.
