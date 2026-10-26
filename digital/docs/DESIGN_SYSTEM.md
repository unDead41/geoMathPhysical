# GeoDecoder central design system v1

Use `npm run build` from `digital/`. Open `artifacts/GeoDecoder_Design_System.html`
for the actual BM/English component reference (offline, no Auth or storage).
`npm run design:reference` rebuilds the reference alone. The development source is
`design-system/reference.html`; a normal local HTTP server can serve it directly.

## One owner, two presentation formats

| Source / owner | Generated or adapted output | Consumer |
|---|---|---|
| `design-system/tokens.mjs` | `dist/design-tokens.css` | Portal/Home/play/settings, loaded first |
| Same owner + module variant | `module/src/central-tokens.mjs` / `design-tokens.css` | Source module and offline concatenator |
| Same owner + `dist/module-foundation.css` | `dist/module-design.mjs` | `prepareModuleFrame`, after original module styles |
| `dist/foundation.css` | Inlined by `tools/standalone.mjs` | Existing portal class names and reference |
| `dist/module-foundation.css` | Source module build and pinned frame | Native module controls and primary action states |

Generated output is never hand-edited. Run `npm run design:tokens`, then
`npm run design:check`. The checker compares bytes and rejects redefinitions in
feature CSS and iframe preparation, including definitions that repeat the right
value. New semantic roles belong to the owner. Geometry palettes, face identity,
measurements and educational animation duration remain separate.

Light/dark/strong contrast remap semantic roles rather than copying recipes.
`--primary` is text/focus; `--primary-fill` + `--on-primary-fill` is a solid action.
Use `--border-control` for controls, `--border` for decorative separators.
Typography and spacing are root-relative; production text-size preferences keep
their existing single owner. Existing portal selectors are compatibility adapters.

## Components

| Role | API / existing adapter | State and semantics |
|---|---|---|
| Brand action | `.button.button-primary` | Native button, hover/focus/active/disabled/busy |
| Secondary | `.button.button-outline` / `.button-quiet` | Existing navigation/action handlers retained |
| Danger | `.button-danger-outline` / `.button-danger` | Visible action verb; existing confirmation policy |
| Icon | `.icon-button` | Localized accessible name; minimum 44px target |
| Field | `.gd-field` / `.field` / `.portal-field` | Native input/select/textarea, visible label, associated error |
| Toggle | `.gd-toggle` wrapping native checkbox with `role="switch"` | Space toggles, checked/disabled semantics; no new preference store |
| Panel | `.gd-card` / `.gd-panel` / existing portal panels | Feature owns grid/flow, shared surface/shape/type |
| Tabs | `.gd-tabs` + proper tablist/tab/tabpanel markup | Roving Tab, arrows/Home/End; use reference implementation |
| Feedback | `.gd-feedback[data-tone="info|success|warning|error"]` | Persistent text; owning controller manages live region |
| Dialog | Native `dialog` + `.dialog-shell` | Existing modal controller or reference example |

A busy action uses `aria-busy="true"` and real `disabled` where duplicate
activation must stop. Add `data-block-while-busy` before the request to reserve its
indicator slot. Keep the same label/geometry when possible. Existing action code
continues to own validation, focus, recovery and authorization. Styling an
`aria-disabled` control does not itself prevent activation: use native disabled.

## Handoff: module layout branch

Integrate this branch into the newest integration history first. Keep
`module/src/central-tokens.mjs` generated; do not restore an old hand-written
`UI_TOKENS` map. Add layout to module `style.css`/`net-tools.css`; use shared
space/type/radius/control roles. Keep `MODULE_TOKENS` for genuine module variants
such as 85rem page width. Native select popup geometry remains browser-owned.

Run `npm run design:tokens`, `npm run design:check`, then module
`npm run build`, `npm test`, `npm run check`. The integrated v2.8 portal explicitly pins the rebuilt v1.6.0 educational source with the central presentation adapter. Its source provenance and blob are recorded in `vendor/module-release.json`. This combines the reviewed learning-tools and design branches; CSS generation alone never changes the educational source pin.

## Handoff: motion/audio branch

UI timing/easing lives in `UI_TIMING` and `--motion-*`/`--ease-*`. Add UI timing once
in that owner, regenerate, then consume it. JS values are milliseconds; generated
CSS values include `ms`. Use existing effective reduced-motion preference and
`prefers-reduced-motion`; static busy/text feedback must survive reduction.

`module/src/design-system.mjs:UI_MOTION` retains educational timings. Game feedback
and server timing remain in their current controllers. Add sound presentation
through existing audio/preferences owners; do not create another mute/volume key
or bind duplicate global handlers. This branch introduces no new sounds.

## Migration and drift audit

| Finding | Resolution | Remaining boundary |
|---|---|---|
| Portal light, portal dark and module token maps were independently authored | One owner + deterministic outputs; exact owner checks | Face palettes stay domain-owned |
| Shared button/input shapes and small portal fonts diverged | Central recipes and root-relative portal type | Feature layouts remain local |
| Dark primary mixed light text and solid fills | Separate text-primary and action-fill roles | New components must choose the semantic pair |
| Iframe strong-contrast values were embedded literals | Generated CSS at existing frame boundary | Preference/session protocol unchanged |
| Reference examples did not exist centrally | Interactive offline BM/English gallery using shipped CSS | Gallery preview settings are temporary |

Rollback: revert this foundation changeset as a unit (owner, adapters, recipes and
builds). No data migration or backend rollback is required. Before merging work
from other chats, compare their base; preserve new Auth/security/save/help hooks.
This task did not import unrelated feature branches.

Long exact question formulas use a bounded keyboard-focusable horizontal scroll
region when the chosen text size needs it. Arrow keys scroll the expression.
The formula/MathML/speech representation remains unchanged; only its UI container
was adapted. All 15 questions, open hints and corrections are covered at 320px/150%.
