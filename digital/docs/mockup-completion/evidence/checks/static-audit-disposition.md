# Static audit disposition: 98 module buttons

Result: **98/98 reported literal buttons are bound**. All98 have a real click listener in Chromium and a source mapping to the existing module handler. No unbound/dead control was found in this bounded set. Nine representative behavior checks passed; no browser page errors occurred.

The original strict auditor report still contains98 `affordance.actionless-button` errors. It detects inline action/submit affordances and does not follow these `.mjs` event bindings. This disposition supplies independent evidence; no rule was disabled, no fake `onclick` was added, and no product source was changed.

## Scope and provenance

- Source audit: `module-premium-audit.json`;98 findings, all in `digital/module/src/index.html`. Re-parsing all enabled literal `<button>` elements produced exactly98 unique IDs, with the same count on every reported line.
- Module version: `1.6.2`; manifest source commit: `7bba111209e15697cb4b704f6cef7c0fb120aa55`.
- Audited packaged module: `digital/module/GeoDecoder_Modul_V1.html`.
- Packaged and vendored SHA-256 agree: `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`.
- Exact source/HTML hashes and runtime listener locations/descriptions are recorded in `static-audit-disposition.json`.
- Chromium ran the actual self-contained module locally at1440×900 with reduced motion. Notes and Labs were opened to exercise their real lazy initializers before listener inspection.
- Listener proof uses Chromium CDP `DOMDebugger.getEventListeners` on each actual DOM button, including the controls currently hidden or disabled by their supported state.

**This is not a clean audit certificate for the entire application.** The separate main-app audit reported0 because its ignored roots excluded `dist`; it did not inspect the real app source. Dynamically created projection/calculation/record buttons, other affordance rules, and complete outcomes for all98 actions are outside this disposition.

## Method and limits

Each finding was reconciled one-for-one to the literal HTML ID on its reported line. Direct `el/get/noteEl(id).addEventListener` bindings and expanded loop/`LearningLabs.bind()` bindings are cited below. Chromium independently confirmed a click listener on every ID. Full listener records, source excerpts and existing test references are in the JSON companion.

The CDP step proves attachment, and the source handler proves that the binding dispatches a real action. It does not claim that all98 outcomes were individually executed. The bounded behavior checks below exercise representative navigation, input validation, model state and native disclosure paths. Existing relevant lifecycle-test references are included per ID; the parent separately reported341 module tests passing, which this audit did not rerun.

State restrictions remain meaningful: for example, speech is disabled when no supported local voice is available, the embedded theme follows the host, and some fold/move/check actions require their real preceding stage. A legitimate disabled/hidden state is not an unbound control.

## Actual representative behavior checks

| Check | Result | Observed evidence |
|---|---|---|
| Native net-mode disclosure reaches the existing editor action | PASS | `{"preset":"editor"}` |
| Net clear changes the real editor grid | PASS | `{"count":"0 / 6 muka"}` |
| Native lab-camera disclosure exposes real directional control | PASS | `{"before":"0.48","after":"0.27999999999999997"}` |
| Unit Add and Clear mutate the real unit count | PASS | `{"afterAdd":1,"afterClear":0}` |
| Comparison Add uses the existing capacity model | PASS | `{"before":"0","after":"0.00008573721913420646"}` |
| Explore zoom and reset change the actual model camera | PASS | `{"before":"1","zoomed":"1.15","reset":1}` |
| Views button switches the actual orthographic mode | PASS | `{"modeAfterSwitch":"views","returned":"model"}` |
| Measurements calculate canonical current values and reset validation | PASS | `{"invalidValueRejected":true,"resetArea":"96 cm²"}` |
| Focus and theme buttons change their actual document presentation state | PASS | `{"oldTheme":null,"newTheme":"dark","focusEnabledThenDisabled":true}` |

## All 98 IDs and binding proof

Each row below also has one or more actual Chromium click listeners. A loop citation expands the listed ID through the real existing loop; `labs.mjs:32` is the binding helper that attaches the event and re-renders after its action.

| # | Literal ID | HTML line | Source binding | Chromium click listeners | Existing test references |
|---:|---|---:|---|---:|---:|
| 1 | `learn-explore` | 26 | `src/app.mjs:272` (addEventListener) | 1 | 7 |
| 2 | `learn-notes` | 26 | `src/app.mjs:272` (addEventListener) | 1 | 21 |
| 3 | `learn-measures` | 26 | `src/app.mjs:273` (addEventListener) | 1 | 7 |
| 4 | `learn-labs` | 26 | `src/app.mjs:275` (addEventListener) | 1 | 63 |
| 5 | `learn-projection` | 26 | `src/app.mjs:276` (addEventListener) | 1 | 5 |
| 6 | `learn-calculation` | 26 | `src/app.mjs:277` (addEventListener) | 1 | 5 |
| 7 | `module-theme` | 27 | `src/accessibility.mjs:17` (addEventListener) | 1 | 2 |
| 8 | `module-focus` | 27 | `src/accessibility.mjs:18` (addEventListener) | 1 | 1 |
| 9 | `mode-model` | 37 | `src/app.mjs:285` (addEventListener) | 1 | 1 |
| 10 | `mode-views` | 37 | `src/app.mjs:285` (addEventListener) | 1 | 2 |
| 11 | `zoom-out` | 39 | `src/app.mjs:308` (addEventListener) | 1 | 0 |
| 12 | `zoom-in` | 39 | `src/app.mjs:308` (addEventListener) | 1 | 0 |
| 13 | `reset` | 39 | `src/app.mjs:308` (addEventListener) | 1 | 0 |
| 14 | `auto-rotate` | 42 | `src/app.mjs:306` (addEventListener) | 1 | 0 |
| 15 | `orbit-left` | 42 | `src/app.mjs:309` (expanded-loop) | 1 | 0 |
| 16 | `orbit-right` | 42 | `src/app.mjs:309` (expanded-loop) | 1 | 1 |
| 17 | `orbit-up` | 42 | `src/app.mjs:309` (expanded-loop) | 1 | 0 |
| 18 | `orbit-down` | 42 | `src/app.mjs:309` (expanded-loop) | 1 | 0 |
| 19 | `play` | 48 | `src/app.mjs:287` (addEventListener) | 1 | 13 |
| 20 | `open-net` | 48 | `src/app.mjs:286` (addEventListener) | 1 | 8 |
| 21 | `close-net` | 48 | `src/app.mjs:286` (addEventListener) | 1 | 1 |
| 22 | `replay` | 48 | `src/app.mjs:303` (addEventListener) | 1 | 1 |
| 23 | `explore-next` | 49 | `src/app.mjs:293` (addEventListener) | 1 | 1 |
| 24 | `guided-net` | 56 | `src/app.mjs:304` (addEventListener) | 1 | 0 |
| 25 | `guided-view` | 56 | `src/app.mjs:305` (addEventListener) | 1 | 0 |
| 26 | `jump-concept` | 63 | `src/notes.mjs:73` (expanded-loop) | 1 | 0 |
| 27 | `jump-net` | 63 | `src/notes.mjs:73` (expanded-loop) | 1 | 0 |
| 28 | `jump-area` | 63 | `src/notes.mjs:73` (expanded-loop) | 1 | 0 |
| 29 | `jump-volume` | 63 | `src/notes.mjs:73` (expanded-loop) | 1 | 0 |
| 30 | `jump-calculate` | 63 | `src/notes.mjs:73` (expanded-loop) | 1 | 1 |
| 31 | `note-draw-projections` | 63 | `src/app.mjs:278` (addEventListener) | 1 | 1 |
| 32 | `note-explore-net` | 68 | `src/notes.mjs:74` (expanded-loop) | 1 | 4 |
| 33 | `note-explore-solid` | 72 | `src/notes.mjs:74` (expanded-loop) | 1 | 0 |
| 34 | `notes-overview-calculate` | 74 | `src/app.mjs:274` (addEventListener) | 1 | 0 |
| 35 | `reset-measures` | 75 | `src/notes.mjs:71` (addEventListener) | 1 | 1 |
| 36 | `pi-ratio` | 83 | `src/notes.mjs:72` (expanded-loop) | 1 | 0 |
| 37 | `pi-decimal` | 83 | `src/notes.mjs:72` (expanded-loop) | 1 | 0 |
| 38 | `pi-full` | 83 | `src/notes.mjs:72` (expanded-loop) | 1 | 3 |
| 39 | `calculate-measures` | 83 | `src/notes.mjs:69` (addEventListener) | 1 | 1 |
| 40 | `note-check-steps` | 86 | `src/app.mjs:279` (addEventListener) | 1 | 4 |
| 41 | `note-explore-views` | 89 | `src/notes.mjs:74` (expanded-loop) | 1 | 1 |
| 42 | `lab-net` | 102 | `src/labs.mjs:46` (expanded-loop) | 1 | 5 |
| 43 | `lab-volume` | 107 | `src/labs.mjs:46` (expanded-loop) | 1 | 26 |
| 44 | `lab-area` | 112 | `src/labs.mjs:46` (expanded-loop) | 1 | 11 |
| 45 | `lab-composite` | 117 | `src/labs.mjs:46` (expanded-loop) | 1 | 4 |
| 46 | `labs-projection` | 123 | `src/labs.mjs:52` (bind-helper) | 1 | 1 |
| 47 | `labs-calculation` | 123 | `src/labs.mjs:53` (bind-helper) | 1 | 1 |
| 48 | `lab-home` | 128 | `src/labs.mjs:49` (bind-helper) | 1 | 4 |
| 49 | `lab-reflect` | 130 | `src/labs.mjs:50` (bind-helper) | 1 | 0 |
| 50 | `lab-left` | 136 | `src/labs.mjs:106` (expanded-loop) | 1 | 0 |
| 51 | `lab-right` | 136 | `src/labs.mjs:106` (expanded-loop) | 1 | 0 |
| 52 | `lab-up` | 136 | `src/labs.mjs:106` (expanded-loop) | 1 | 0 |
| 53 | `lab-down` | 136 | `src/labs.mjs:106` (expanded-loop) | 1 | 0 |
| 54 | `lab-zoom-out` | 136 | `src/labs.mjs:106` (expanded-loop) | 1 | 0 |
| 55 | `lab-zoom-in` | 136 | `src/labs.mjs:106` (expanded-loop) | 1 | 0 |
| 56 | `lab-reset-camera` | 136 | `src/labs.mjs:107` (bind-helper) | 1 | 0 |
| 57 | `lab-next` | 136 | `src/labs.mjs:101` (bind-helper) | 1 | 2 |
| 58 | `net-mode-gallery` | 139 | `src/labs.mjs:54` (expanded-loop) | 1 | 0 |
| 59 | `net-mode-editor` | 139 | `src/labs.mjs:54` (expanded-loop) | 1 | 8 |
| 60 | `net-mode-studio` | 139 | `src/labs.mjs:54` (expanded-loop) | 1 | 4 |
| 61 | `net-clear` | 139 | `src/labs.mjs:59` (bind-helper) | 1 | 2 |
| 62 | `net-left` | 139 | `src/labs.mjs:60` (expanded-loop) | 1 | 1 |
| 63 | `net-right` | 139 | `src/labs.mjs:60` (expanded-loop) | 1 | 0 |
| 64 | `net-up` | 139 | `src/labs.mjs:60` (expanded-loop) | 1 | 0 |
| 65 | `net-down` | 139 | `src/labs.mjs:60` (expanded-loop) | 1 | 0 |
| 66 | `net-fold` | 139 | `src/labs.mjs:61` (bind-helper) | 1 | 20 |
| 67 | `net-flat` | 139 | `src/labs.mjs:62` (bind-helper) | 1 | 3 |
| 68 | `compare-add-a` | 141 | `src/labs.mjs:78` (expanded-loop) | 1 | 2 |
| 69 | `compare-full-a` | 141 | `src/labs.mjs:78` (expanded-loop) | 1 | 2 |
| 70 | `compare-add-b` | 141 | `src/labs.mjs:78` (expanded-loop) | 1 | 0 |
| 71 | `compare-full-b` | 141 | `src/labs.mjs:78` (expanded-loop) | 1 | 0 |
| 72 | `compare-add-both` | 141 | `src/labs.mjs:85` (bind-helper) | 1 | 2 |
| 73 | `compare-full-both` | 141 | `src/labs.mjs:85` (bind-helper) | 1 | 3 |
| 74 | `compare-transfer-ab` | 141 | `src/labs.mjs:84` (bind-helper) | 1 | 5 |
| 75 | `compare-transfer-ba` | 141 | `src/labs.mjs:84` (bind-helper) | 1 | 1 |
| 76 | `compare-empty` | 141 | `src/labs.mjs:86` (bind-helper) | 1 | 3 |
| 77 | `unit-one` | 141 | `src/labs.mjs:65` (bind-helper) | 1 | 3 |
| 78 | `unit-layer` | 141 | `src/labs.mjs:66` (bind-helper) | 1 | 2 |
| 79 | `unit-fill` | 141 | `src/labs.mjs:67` (bind-helper) | 1 | 6 |
| 80 | `unit-empty` | 141 | `src/labs.mjs:67` (bind-helper) | 1 | 2 |
| 81 | `pour-one` | 142 | `src/labs.mjs:71` (bind-helper) | 1 | 6 |
| 82 | `pour-reset` | 142 | `src/labs.mjs:70` (bind-helper) | 1 | 1 |
| 83 | `area-open` | 144 | `src/labs.mjs:91` (bind-helper) | 1 | 9 |
| 84 | `area-close` | 144 | `src/labs.mjs:92` (bind-helper) | 1 | 0 |
| 85 | `area-all` | 144 | `src/labs.mjs:93` (bind-helper) | 1 | 6 |
| 86 | `area-clear` | 144 | `src/labs.mjs:93` (bind-helper) | 1 | 0 |
| 87 | `comp-join` | 145 | `src/labs.mjs:96` (bind-helper) | 1 | 5 |
| 88 | `comp-separate` | 145 | `src/labs.mjs:96` (bind-helper) | 1 | 0 |
| 89 | `comp-check` | 145 | `src/labs.mjs:97` (bind-helper) | 1 | 3 |
| 90 | `lab-return` | 146 | `src/labs.mjs:108` (bind-helper) | 1 | 0 |
| 91 | `guided-begin` | 153 | `src/labs.mjs:102` (bind-helper) | 1 | 10 |
| 92 | `guided-model` | 154 | `src/labs.mjs:51` (bind-helper) | 1 | 0 |
| 93 | `guided-check` | 155 | `src/labs.mjs:102` (bind-helper) | 1 | 10 |
| 94 | `guided-complete` | 156 | `src/labs.mjs:102` (bind-helper) | 1 | 10 |
| 95 | `lab-undo` | 158 | `src/labs.mjs:105` (bind-helper) | 1 | 7 |
| 96 | `lab-retry` | 158 | `src/labs.mjs:105` (bind-helper) | 1 | 2 |
| 97 | `speech-play` | 173 | `src/accessibility.mjs:19` (addEventListener) | 1 | 5 |
| 98 | `speech-stop` | 173 | `src/accessibility.mjs:19` (addEventListener) | 1 | 0 |

## Reproduction

```sh
node /workspace/scratch/8354d9072f14/mockup-work/check-static-audit.mjs
```

The script reads product/source/manifest files and writes only the JSON evidence in `mockup-work`. It launches the pinned local Chromium, inspects listener bindings, runs the nine bounded behavior checks, and exits nonzero for a missing binding, browser error or failed check.

Disposition: **98 static false positives backed by source and runtime evidence;0 concrete dead controls found in the reported set.** The original audit findings remain preserved.
