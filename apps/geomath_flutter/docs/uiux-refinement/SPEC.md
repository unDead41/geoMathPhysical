# GeoMath UI/UX refinement

Approved scope: the user's 6 November 2026 instruction to apply all eighteen recommendations in this conversation.

## Source and approach

Preserve integrated `app`/`app-integration` 20eed848cc015d6253accd6cf72fcf127bf72827 and the newer descendant `app-cloud-game` 1d7c8f7e4a6b980b1a911729e73818f79476302f. The latter is the publication parent. Keep Flutter 3.47.9, Dart 3.13.7, the dependency lock, canonical geometry/math and real native controllers. Refine shared native controls and the pinned offline module adapter. Full renderer replacement adds parity risk; a whole-site WebView loses the existing native state boundaries. Reuse is the selected implementation choice.

## Acceptance mapping

| Item | Required behavior | Owner |
|---|---|---|
| 1 | Swipe through all eleven learning solids with snap, count, arrows and explicit selection; preserve game selection/scan separation | native learning / games |
| 2 | Actual canvas rotation, pinch zoom and reset, with button alternatives | native learning / module |
| 3 | Controlled unfold slider 0..1 on supported shapes, geometry and reduced motion preserved | native learning / module |
| 4 | Select physical faces; consistent highlight across model, net and 2D | module |
| 5 | Existing stable face palette and labels, including curved-surface IDs | module |
| 6 | Accessible front/back/left/right/top/bottom/isometric camera presets | native learning / module |
| 7 | Drag solid/net game choices to the active reader using existing selection and explicit scan semantics; tap remains available | games |
| 8 | Reuse existing equation presentation; readable steps, symbols and units remain canonical | games / module |
| 9 | Resizable note/calculator panel while retaining the same mounted activity and draft | native learning / module |
| 10 | One shared design system; refine hierarchy and consistency without a competing token palette | shared |
| 11 | Width-adaptive navigation and stable destination/scroll state | shared |
| 12 | Small-phone through tablet layouts; two-pane where useful | all |
| 13 | Existing light/dark/contrast plus system text scaling; never shrink essential text | shared |
| 14 | Subtle motion and optional haptic feedback, disabled under user/system preferences | shared / consumers |
| 15 | Useful loading/empty/error/retry, keep entered data | all |
| 16 | Honest durable/local/pending/acknowledged sync states from existing controller | lead |
| 17 | PIN paste/copy/invitation clarity, readiness and reconnection from real server projections | classes / games |
| 18 | Resume learning/solo and display actual record-based progress; no invented mastery/XP | lead |

## Invariants

Do not modify firmware, digital source, canonical vertices/parser, scoring/timing, server authorization, account/epoch guards, protected credentials or the formative outbox contract. Guest data never auto-uploads. Sphere/hemisphere have no invented exact flat net. Neutral game cards never disclose correct pairs by color. Physical face IDs never depend on camera orientation. Preserve the original trusted-document readiness/deadline fixes. No hosted deployment, Pages or main publication is authorized.

## Verification

Run formatter, analyzer, existing Flutter and Node suites, plus meaningful gesture/state/paste/large-text regressions. Exercise 320/390/430/768 logical widths with BM/English and 150% text. Render actual widgets if available. Build a normal Android APK and run Android checks when tooling/device exists. Report host, emulator, hosted and physical evidence separately; absence of a device is a limitation.
