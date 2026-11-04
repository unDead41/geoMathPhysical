# GeoMath — complete the approved 40-screen UI

User intent: implement the saved mockup, not another redesign or a functional-only merge. Reference authority is concept `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd`, its ten original boards/40 screens and IMPLEMENTATION_CONTRACT.md. Base source is `ef697c86a5bfdf5a5658c3df92bce1d7f3f88652` (Digital2.9.0/module1.6.1), including offline/CRUD/scaling. Work branch `digitalized-ux-mockup-completion` only.

## Approach

Extend the real view owners and their CSS. Preserve controllers, IDs and business/API/storage semantics. Match the reference's composition, proportions, navy hierarchy, blue actions, pale grid/model scenes, quiet panels and shared header/sidebar. Real geometry/data outranks generated raster inaccuracies. Screenshots must come from the built app and labelled synthetic fixtures, never from the concept image placed over an app.

No new framework, token store, auth provider, backend, schema or game engine. Current runtime tokens/fonts, native controls and app-owned dialogs remain canonical. A wide modal may preserve the existing settings/help lifecycle while presenting the approved two-column surface. Where a concept action is unsupported, omit the invented action and record the difference instead of faking it. Existing standalone/PWA output remains supported.

## Binding constraints

- All40 screen IDs need explicit implementation/verification/exception rows.
- BM/English, light/dark/system, 100/125/150%, high contrast, 44px controls and reduced motion remain.
- Canonical design-system/tokens.mjs and foundation.css own shared palette/type/buttons/fields. No competing palette, validation, notification or session stores.
- All11 shapes and canonical geometry/parser/measurements remain. Digital R1 solid then R2 net; five solid and five net choices stay independent; quiz10, practice15, Duelprotocol2 and all scoring/timing authorities remain.
- Offline owner/session/outbox, cache/coalescing, CRUD capability/retention/permission and draft/account boundaries remain. No fake stored statistics, example names, production fixtures or dead buttons.
- Do not edit generated bundles/HTML/vendor by hand. Root builds them after integration.
- Push workbranch only. Do not change main/main-digitalized/other feature refs, public mirror, backend, Auth/SMTP or deploy Pages/Sites in this task.

## Owners

| Screens | Owner | Editable source |
|---|---|---|
| 01–04 and global integration | root | entry-art.mjs, entry.css, entry-components.mjs, tokens consumers, build/docs/version and final composition hooks |
| 05–09 | game worker | app.mjs game/correction/result/scores view functions; style.css game/result/scores rules; index.html game/result regions only |
| 10–13 | root | existing Duel presentation refinements preserving protocol/controller |
| 14–16,23–24 | account worker | new pure auth-view.mjs; profile-view.mjs/security-view.mjs/active-sessions.mjs/account-copy.mjs; handoff portal renderAuth integration hook and account CSS block |
| 17–22 | workspace worker | portal.mjs classroom view functions + portal shell; portal.css; portal-copy/classroom-copy authored copy |
| 25–36 | root | existing module presentation refinements only; all15 canonical math/controller files unchanged |
| 37–40 | utility worker | usability-ui.mjs/usability.css/help-support.mjs/help-support.css/help-copy.mjs; settings-panel HTML patch for root |
| all40 visual evidence | visual auditor | screenshots/fixtures/coverage and visual review only |
| source/runtime/regression review | runtime reviewer | exact source hydration + browser setup, then independent code/behavior review |

Shared decorative model asset is `sceneIllustration({variant='cluster'|'cube',className=''})` from entry-art.mjs. It reuses canonical shapeArt primitives. Utilities/account/workspace use this instead of separate competing artwork.

## Acceptance

Build/check and relevant/full tests pass. Browser coverage includes all40 views at1440×900 and representative390×844 with BM/English/dark/150%, keyboard, failure/empty/busy/retry, and offline/account-switch regression. Record each screen's screenshot and approved-reference comparison; report functional checks separately. Preserve failed attempts and unresolved limits. Deliver real source/screenshots/handoff on the workbranch; publication remains a separate explicit operation.
