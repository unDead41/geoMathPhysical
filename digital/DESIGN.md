---
version: alpha
name: "GeoDecoder Digital"
description: "A bright geometry workbench with physical scanner pads and draggable mathematical solids."
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
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
spacing:
  section-gap: "2rem"
  page-max: "76rem"
components:
  button: {}
  card: {}
  dialog: {}
  input: {}
  scanner: {}
---

# GeoDecoder Digital Design System

## Overview

### Creative North Star
A real classroom geometry kit translated into a bright digital workbench. The signature is the two scanner pads: R1 takes a solid, R2 takes its net. Exact SVG models serve learning and are never decorative AI geometry.

### Product context and register
Malaysian Murid/Pelajar, readable at Tingkatan 1 level, using mouse, keyboard or touchscreen. All product language is BM. Sessions are self-paced, ten questions, local high scores. Product register throughout registration, game and scoreboard. Avoid dashboards, neon arcade treatments and tiny LCD-only text.

### Token ownership/runtime mapping
Model B: `dist/style.css :root` owns runtime tokens. This document mirrors the accepted palette. Primary→--primary→buttons/focus; ink→--ink→text; background→--bg→body; surface→--surface→panels; success→--success→correct; danger→--danger→wrong; accent→--accent→milestone; muted→--muted→secondary text; border→--border→all controls. Type→--font-display/--font-body/--font-mono. Corners→--radius/--radius-lg. `tools/check.mjs` checks exact drift for palette.

## Colors
Cool blue-white canvas, navy text, royal blue interaction. Mint indicates success; red errors; violet active hints. Per user request, solids and nets now use eight expressive palettes owned by `dist/visuals.mjs` and consumed by `art.mjs`. Five unique colours per shelf, changed for every shape each question. Solid/net colours differ for the same shape, so colour is not an answer cue. All status colours also have text.

## Typography
Trebuchet MS display headlines, Segoe UI body with system fallback, monospace clocks. Body line-height 1.55, short instructions 16px, headers 32–56px. No network fonts or font swaps.

## Layout
76rem maximum; desktop two-column entry and centred workbench. At 800px the registration/game panels stack, scanner pads remain paired when possible. Five choices wrap to three or two columns below 600px. Document scrolling owns all screens. Main actions at least 44px tall. Reserve question and feedback geometry.

## Elevation & Depth
Subtle cool shadows on the hero's scanner platform and dialog. Normal cards use borders, not heavy floating shadows. Svg solids use face colours to describe spatial depth.

## Shapes
16px standard corners, 24px large panels. Soft rectangles for physical pads, rounded rectangles for controls. Mathematical faces remain geometrically exact.

## Components

### Foundational visual states
Hover raises choices 3px; focus is a 3px blue outline; active selections use outline plus text; disabled reduces saturation and explains the stage. All feedback uses visible inline status and one live region. No skeleton loading for browser-local operations.

### Buttons and actions
Solid primary for start/replay/scan, outline neutral for secondary, outline danger for erase/leave. Labels describe actions. Icon buttons have accessible BM names. Fixed minimum 44px height.

### Navigation and data display
Top header keeps brand and Cara main/Papan skor actions. Scores table is bounded to 50 completed sessions and top ten initially, with an explicit show-all action. Local-only scope is visible.

### Forms and overlays
All fields have visible labels, inline errors and first-error focus, no native validation bubbles. Category is a radio pair. Shared native `<dialog>` provides authored contents, modal inertness, Escape and restored focus. Confirm before abandoning an active round or erasing scores.

### Iconography
Small inline SVG icons, 1.8px strokes, 20–24px, text labels on primary controls. Brand cube uses geometric faces. Every geometric answer has an equivalent screen-reader description.

### Motion
R1/R2 feedback uses three 150ms ON/OFF cycles. Successful pairs advance after 900ms; wrong/skipped answers hold a correction until the player continues, with a minimum 1800ms reading interval. Hero objects float slowly, card artwork breathes 3px inside fixed hit areas, accepted models enter scanner pads, and correction pairs slide into place. No geometry morph is claimed; the full unfolding module is a separate branch task. The header motion control and system reduced-motion setting remove movement/flashing while preserving text and timing. Decorative perspective grids are clipped within the hero scene to prevent horizontal page overflow.

### Content and data visualization
BM, short specific instructions. No shape names printed on answer cards; use shuffled A–E identifiers with diagram descriptions for screen readers. Names are rendered as text, never trusted HTML. Time MM:SS; date ms-MY in Asia/Kuala_Lumpur.

## Do's and Don'ts

- Do keep all five solids and five nets visible.
- Do require R1 before R2 and grant one mark for a pair.
- Don't give the answer through matching card positions or colours.
- Don't rely on dragging, colour or sound alone.
