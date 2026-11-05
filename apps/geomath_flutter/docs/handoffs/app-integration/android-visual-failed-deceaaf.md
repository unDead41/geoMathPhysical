# Failed Android visual evidence review — deceaaf

Source: `deceaaf3ce942d3af37aab6d79cc133e1f7821fa`.
[CI run42053609842](https://github.com/unDead41/geodecoder/actions/runs/42053609842).
Reviewed the extracted `geomath-android-evidence` artifact: all six test PNGs,
three normal-APK PNGs, `last-screen.png`, hierarchy XML/dump records,
`production-captures.json`, `test-captures.json` and integration log.

**Gate failed.** The integration log ends with23 passes and4 failures;
`run.exit` is1. The capture metadata declares four target profiles, but its
`captures` array contains only three PNGs from320dp/BM/light/100%. It does not
prove the other profiles ran. This review promotes no acceptance item to ready.

## What the actual images show

| Image | Visible evidence and limit |
|---|---|
| `320dp-ms-light-100-contrast0-37-settings.png` | Real normal-APK preferences, scrolled to audio/reduced motion/contrast and durable-save notice. Labels, switches and bottom navigation are readable. Language/theme/text selectors are outside this captured viewport; XML records show their actual interactions separately. |
| `320dp-ms-light-100-contrast0-01-home-offline.png` | **Flutter splash/logo on white, not Home.** Its filename and metadata scope must not be used as successful ID01 visual evidence. |
| `320dp-ms-light-100-contrast0-41-learning-hub.png` | Real normal-APK learning hub with blue/yellow/orange cube illustration, offline message and Mula teroka CTA. Readable320dp native UI. This is not the real WebView model. |
| `last-screen.png` | Teroka3D native shell, disabled Kubus selector and loading progress bar; the WebView region is blank. Not a loaded-model screenshot. |
| `test-41-learning-hub-ms-light-100.png` | Actual integration-test APK hub render, distinct from the normal main-APK capture. |
| `test-25-learn-explore-ms-light-100.png` | Native selector says Kubus while the inner canonical document says Hemisfera and shows part of a hemisphere. This is a state mismatch at capture time; it must not be labelled a successful cube comparison. |
| Four `test-25-explore-{ms,en}-{light,dark}-contrast-150.png` files | Actual test-APK native/WebView mixed renders show a cube's partly unfolded coloured net, translated headings, high-contrast light/dark styling and persistent navigation. The net is mostly below the visible viewport; these are not full-canvas comparison views or11-model visual acceptance. |

No obvious text overflow is visible in these PNGs. At150%, however, duplicated
native/inner headers and the large native introduction/tools region consume
roughly332dp before the WebView. Only a small lower portion of the geometric
canvas is initially visible. This is a concrete density/scrolling limitation,
not evidence that text can be compressed safely or that every control is
reachable under keyboard/TalkBack/gesture conditions.

## Hierarchy and runtime findings

- Hierarchies014/015 contain real Home labels and its explore CTA, despite the
  paired Home PNG still showing splash. Accessibility readiness can precede
  compositor readiness; that is a hypothesis, not a proved root cause. A loaded
  hierarchy alone is insufficient to certify the named screenshot.
- Hierarchies018/019 contain the native Teroka shell only. Hierarchy020 adds
  the WebView title GeoMath Learning, without a loaded canonical model node.
  Dump021 is empty and no corresponding hierarchy XML is present. Retry
  empty/malformed dumps within a bounded wait; neither a document title nor
  the native Kubus selector proves the canonical canvas is loaded.
- The baseline Kubus/Hemisfera mismatch occurred while the test drove shape
  changes through the private JS adapter. It is not yet a reproduction through
  the user-facing selector. Confirm canonical rendered heading, snapshot and
  native binding agree after the state settles before accepting the capture.
- The integration failures are foundation handshake failure, the13-screen
  learning test's12-minute timeout, the geometry/palette test's4-minute timeout,
  and the quick destination checkpoint test timing out while awaiting readiness.
  The log also records a Chromium renderer-process crash message during a test
  transition; this review does not establish whether it caused the timeout or
  followed timed-out view teardown.

Successful local SQLite/classroom fixture cases do not remove these WebView
failures. The normal APK launching and the hub/settings images do not prove
normal-main offline geometry works. The next diagnostic source and run need a
separate receipt; they cannot retroactively relabel this failed source as pass.

Keep IDs25–36 and EX11/EX13 device acceptance partial where their required
WebView path failed. Real hosted Auth/CRUD/sync, two-client Duel, manual TalkBack,
physical-phone and complete visual-profile acceptance remain unverified.
