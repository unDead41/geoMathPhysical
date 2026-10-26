# Motion and audio: dependency gate and baseline audit

Date: 26 October 2026 (Malaysia). **Status: preflight only; implementation blocked by the unavailable design-system dependency. Do not integrate this branch as a completed motion/audio upgrade.**

## Source and dependency receipt

| Item | Verified value |
| --- | --- |
| Repository | `unDead41/geodecoder` |
| Integration base | `main-digitalized` |
| Initial remote SHA | `790d989d666e64f3beabb507cd4140b832696367` |
| Refreshed base / commit parent | `123704bd1265df05854be0f7905fb710fc04533b` |
| Base tree | `16ea8667b0a12f2936cc74276b8441a30cfdd2eb` |
| Work branch | `digitalized-ux-motion-audio` |
| Digital / module / firmware baseline | `2.7.0` / `1.5.0` / `1.1.3` |
| Firmware `main` inspected | `a059979d97926b82cafd4aa5cf3fe59da04a55bb` |
| Required dependency | `digitalized-ux-design-system` |
| Dependency SHA | **Unavailable; not fabricated** |
| Remote dependency checks | GitHub branch endpoint returned HTTP 404, `Branch not found`, on repeated checks during this audit |
| Initial work-branch remote check | HTTP 404; no existing remote work was overwritten |
| Isolation | Own linked worktree and separate local Git object store; no other chat's checkout modified |
| Agents used | 0; maximum allowed is 2 |

During the audit, `main-digitalized` advanced to v2.7.0 at the refreshed SHA above. Its feature integration was compared against the initial SHA, and this isolated branch was refreshed to that exact upstream commit before rerunning build/browser checks. All upstream backend and utility changes are inherited intact; this branch changes only the audit material. The named design-system dependency is still absent.

The request explicitly requires: “Dependency: hasil digitalized-ux-design-system yang sudah siap.” It also requires integration of the completed dependency when it is absent from `main-digitalized`. No completed remote commit is currently available to integrate. Existing legacy token owners in the base are not evidence that the named dependency is complete. Work in another checkout was not adopted as a completed dependency.

Git CLI transport was unavailable in this environment. Branch/ref metadata was read through the connected GitHub API. The isolated local base uses the real upstream commit and tree; materialized audit files were verified by Git blob SHA. Documentation and evidence are committed through the GitHub connector with the real upstream parent. Sparse materialization is a local workspace detail, not a new repository layout.

Read: `AGENTS.md`, `docs/SOR_VERSIONING.md`, architecture and branch architecture, Digital and module `DESIGN.md`/`UX-CONTRACT.md`, preferences and module-settings contracts, application/music/preferences/iframe code, and the actual module animation/lab/accessibility code. Supplied textbooks were not needed: no mathematical content or geometry changed.

## Findings

| Priority | Finding and evidence | Required follow-up after dependency |
| --- | --- | --- |
| High | SFX oscillators are scheduled directly in `dist/app.mjs::tone`. References are not retained for cancellation on navigation, hiding, mute or superseding cues. Context resume is asynchronous but oscillators are queued immediately. Suspending a context does not discard those scheduled notes. This is a source-level stale-audio risk, not a listening-test result. | One cancellable cue controller with an epoch, active-node cleanup, gesture gate and preference-driven gain; tests for late resume, hidden state, route changes and rapid mute/unmute. |
| High | Keyboard activation of a module face chip replaces the entire face legend. The real embedded module moved `document.activeElement` to `BODY`, losing the activated control. See `module/src/app.mjs::renderLegend/selectFace` and the browser JSON. | Preserve the activated face control or restore its focus by face ID without moving the page. |
| Medium | The parent `frame` function always schedules another rAF, including Home. Browser measurements found 16 callbacks in an otherwise idle 300 ms window. This is a count, not a CPU/power benchmark. | Schedule parent rendering only when game presentation, drag or a required Duel presentation tick needs it. Keep server clocks, deadlines and protocol polling authoritative. |
| Medium | Motion values have separate owners: literal CSS animation timings in `dist/style.css`, module `UI_MOTION` in `module/src/design-system.mjs`, and geometry easing in `module/src/geometry.mjs`. | Consume the completed central foundation's tokens/primitives. Keep educational timelines distinct from game-rule timing. Do not invent a competing global token source while the dependency is missing. |
| Preserve | Module Pause keeps progress; changing to 0.5× while paused keeps progress; Resume advances the same model. Reduced motion stops playback/spin, and removing reduction does not resume it. Notes produced zero module callbacks in the observed idle 200 ms window. | Add lifecycle regressions before modifying these paths. |
| Preserve | One background Audio element; music volume followed the shared range to 2%; shared mute paused it. Removing the module and rapidly reopening/leaving it cleared the active iframe without runtime errors. | Retain the single owner, prepaint/settings contract and iframe instance/session validation. |

## Current animation catalogue

These are the baseline's existing behaviors, not delivered changes.

| Capability | Current owner | Existing behavior / constraints |
| --- | --- | --- |
| Home decoration and answer cards | `dist/style.css` | Hero float/spark/pad breathing, card entrance/breathing; effective reduced motion suppresses them. |
| Scan and correction | `dist/style.css` + `app.mjs` | Scanner arrival, score pop, correction panel/pair entry; visible text/status remain. |
| Dialog | Native `<dialog>` + app/usability dialog owner | Focus, Escape, modal inertness and trigger restoration already owned here; animation must not delay close/focus or replace the dialog owner. |
| Explore and camera | `module/src/app.mjs` + module `UI_MOTION` | Camera 700 ms, unfold 5800 ms, cycle hold 1000 ms; shared progress in [0,1], explicit pause/resume, speed and direct slider. |
| Labs | `module/src/labs.mjs` + module `UI_MOTION` | One cancellable lab timeline with stored elapsed/target/completion; inactive section pauses it. |
| Geometric unfolding and joining | Existing geometry/mesh/rendering modules | Actual geometric transforms and face IDs/colours must remain authoritative. No image/fade substitution or new curved hinge folding. |

The existing 900 ms success transition and minimum 1800 ms correction-reading interval belong to gameplay. They must not be retimed to match cosmetic token durations. Classroom and Duel timing rules remain separate from solo time.

## Current audio catalogue and planned cue mapping

| Current cue | Source / notes | Visible equivalent |
| --- | --- | --- |
| Home/account/result music | Existing local `menu.mp3`, one looping Audio element | Settings state and music control |
| Game/Duel/module music | Existing local `map.mp3`, same Audio element | Scene and music control |
| `solid` | Sine notes 523, 659 Hz | R1 accepted; R2 next-step status |
| `correct` | Sine notes 523, 659, 784 Hz | Pair accepted, +1 and progress |
| `wrong` | Sine notes 196, 165 Hz | Error and answer correction |
| `skip` | Sine note 330 Hz | Skipped, +0 and correction |
| Sound preview | Reuses `solid` | Explicit Settings test action |
| Optional module speech | Local browser voice only, explicit Read action | Full explanation transcript and availability/failure text |

After dependency integration, consolidate these cues before adding quiet selection/action/error/success aliases. Proposed mapping: selection → pressed state; confirmed action → visible resulting state; success → accepted pair or completed activity text; error → inline error and next action. Never sound success for an unconfirmed network operation, emit from render loops, or use audio as the only feedback. No new remote assets, audio library, voice service or preference storage owner is proposed. Preserve the existing music/effects toggles, independent volumes and global mute.

## Ownership and implementation sequence

Until the dependency SHA is recorded, this branch owns only this report, the baseline audit harness, and its evidence. There is no parallel implementation and no production-code change in this preflight commit.

After the dependency becomes available:

1. Read the current remote refs again. Verify the dependency's completed full SHA and ancestry; integrate it on this work branch only. Resolve valid integration changes instead of replacing files with old snapshots. Record the dependency receipt before parallel work.
2. Root owns composition in `dist/app.mjs`, preference/iframe wiring, dependency resolution, builds, generated aliases and integration docs. An optional audio worker owns only the cue controller, `music.mjs` and audio lifecycle tests. An optional motion worker owns only module playback/UI lifecycle and motion tests. Set the exact new helper paths from the completed foundation before dispatch; shared foundation tokens remain with their existing owner.
3. Add failing lifecycle regressions for stale SFX, focus loss and unnecessary parent rendering; then make the smallest production fixes using the central primitives. Preserve geometry and existing gameplay/server behavior.
4. Verify pause/resume, reset/slider/speed, inactive sections, hidden tabs and explicit-only resume; verify rapid navigation, mute/unmute/volume, duplicate cues and rejected/delayed audio. Exercise reduced motion at startup and while moving, through OS and user preferences.
5. Rebuild the module, update its verified vendor pin as required by the existing build contract, then rebuild every Digital/offline alias. Run the full parent and module suites plus relevant browser cases. Record actual final screenshots/video, audio/per-device limitations and the final integration handoff. Push only this work branch.

## Verification actually run

All results below apply to the **unmodified baseline plus diagnostic harness**, not to a completed motion/audio upgrade.

| Command/check | Result | Evidence |
| --- | --- | --- |
| Digital `npm test` | 345/345 pass, 0 skipped | [App log](motion-audio-evidence/baseline-app-tests.log) |
| Module `npm test` | 244/244 pass, 0 skipped | [Module log](motion-audio-evidence/baseline-module-tests.log) |
| Digital `npm run build` | Pass; website 1,169,894 bytes, offline 6,726,663 bytes with both complete tracks and module 1.5.0 | [Build log](motion-audio-evidence/baseline-build.log) |
| Digital `npm run check` | Pass | [Check log](motion-audio-evidence/baseline-check.log) |
| Module `npm run check` | Pass | [Module check log](motion-audio-evidence/baseline-module-check.log) |
| `python tools/check_version.py` | Pass; firmware/README/changelog 1.1.3 | Runtime versions unchanged |
| Instrumented Chromium headless baseline | Pause/speed/resume, reduced-motion stop/no auto-resume, inactive Notes, rapid iframe teardown, shared volume/mute, one Audio element; no page errors. Focus loss and idle parent rAF observed. | [JSON](motion-audio-evidence/baseline-browser.json), [log](motion-audio-evidence/baseline-browser.log) |

Browser reproduction from `digital/`: `node tests/motion-audit.browser.mjs`. Set `PLAYWRIGHT_CHROMIUM_PATH` to an available headless Chromium binary when needed. The first regular Chromium launch could not use a local socket in this execution environment; the installed Chromium headless shell completed the diagnostic successfully. rAF counts vary with scheduling and are observations, not asserted performance targets.

Actual screenshots of the baseline: [Home](motion-audio-evidence/baseline-home.png), [module viewport](motion-audio-evidence/baseline-module.png). The screenshots do not depict a newly implemented design.

No speaker/headphone listening, physical phone, Safari, Firefox, assistive-technology or device OS-preference testing was performed. Hidden-tab and rejected-audio cases are covered by the existing music/controller fixtures and code review; new end-to-end cancellation tests are still pending. No live backend, public Pages deployment, game rules, geometry, account/progress protocol or runtime source was changed.

## Integration handoff

**Blocked / not ready to merge as the requested feature.** Supply or push the completed `digitalized-ux-design-system` commit, then resume from the sequence above. This commit contributes an audited starting point and reproducible baseline only; the requested motion/audio implementation, central cue controller, lifecycle fixes and final acceptance evidence remain open.
