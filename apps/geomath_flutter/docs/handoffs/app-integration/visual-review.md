Current Android evidence: [the32-capture review](android-visual-review.md).
The reference/host-only review below retains its historical scope.

# Visual and interaction contract review

Review date: 5 November 2026 (Malaysia). Scope: the twelve archived reference
boards on `app` source `38f061af963256528d5060ff076bae9ee05eafc3`, the flow
image, nine planning/contract documents and the 323-line implementation plan.
Production source was inspected at
`f3555c2e94fdfc8c39111d550de977ec7cf10bc3`.
This is a source/reference/host-render review, **not Android acceptance**.

The twelve boards were viewed through actual browser screenshots of their
repository image pages. Those internal reference captures are not app evidence
or deliverables and are not copied into this handoff. Board09's lower phone
controls were cropped by the browser viewport; its headings, main studio/parser
content and upper reflection records were readable. No complete visual check of
that cropped portion is claimed.

| Reference board | Screen IDs | Review against source |
|---|---|---|
| 01 · Start and guide | 01–04 | Native Home, setup, saved-slot summary and finite guide exist. Production Home now opens learning rather than the spike. First-use automatic guide remains a deviation below. |
| 02 · Game and feedback | 05–08 | Quiz/practice, explicit R1/R2 actions, review, result and analysis are implemented. Larger scrollable neutral cards replace the compact coloured illustrations. |
| 03 · Scoreboard and Duel | 09–12 | Local quiz scores and real-protocol entry/lobby/match states have implementations. Online capability remains a prerequisite; the board does not prove a live room. |
| 04 · Account and Duel result | 13–16 | Server-result review, login/signup/email/legacy recovery map to native source. Actual hosted authentication and provider callbacks remain separately gated. |
| 05 · Teacher workspace | 17–20 | Teacher classes, members/invitations, room monitoring and closed-room results map to one classroom controller and shared forms. Hosted populated-state acceptance is unverified. |
| 06 · Student and profile | 21–24 | Student join/wait/same-attempt, profile drafts and security map to native source. Profile uses canonical avatar presets rather than illustrated colour swatches. |
| 07 · Explore, notes, calculator | 25–28 | Native routes launch the bundled canonical model, views, notes and calculator. Physical-face palette and cube4→96/64 follow source, with actual Android renderer acceptance still required. |
| 08 · Interactive labs | 29–32 | All four labs and their advanced modes remain in canonical runtime, with native framing and guarded draft persistence. |
| 09 · Studio and progress | 33–36 | Lab hub, projection, bounded calculation parser and four shared reflection records are implemented. Lower image controls were cropped; source and test pointers cover those controls separately. |
| 10 · Settings and support | 37–40 | Shared preferences, dark theme, finite help and local report preview/copy/TXT exist. No report transmission is implied. |
| 11 · Hub and management | 41–44 | Learning destinations and native create-class/create-room/join forms exist. Bell imagery is decorative concept art, not a push-notification requirement. |
| 12 · Confirmation, sessions, reconnect | 45–48 | Confirmation/reset/session and Duel reconnect states map to real feature source. Recovery authorization, session semantics and server clock take precedence over illustrative states. |

Exact owner, actual route/state, implementation paths, test pointers and
capability bounds for all48 IDs and EX01–EX16 are in
[SCREEN_ACCEPTANCE.json](../../SCREEN_ACCEPTANCE.json). A shared route for
variants/forms is intentional; presence in this table is not a claim that every
populated state has a device screenshot.

## Native rendering observations

Four existing host-rendered Flutter previews were visually inspected: BM light
Solo setup, English dark150% Solo setup, English light active Solo question and
BM light guest profile. These are actual widget-code renders from the feature
work, labelled **host**, not emulator or phone screenshots. Their labels,
primary actions and five-destination navigation are readable; the dark150%
example wraps content and uses scrolling rather than compressing text.

The native navy/blue palette, light card surfaces, rounded controls, status
notices and navigation follow the common design direction. Native controls are
larger and less dense than the four-phone concept boards. Geometry cards in
assessment use the required neutral palette; learning uses physical-face colour.
This review does not establish measured contrast ratios, complete keyboard/safe
area coverage, TalkBack, gestures, platform text rendering or every profile/state
combination. Final Android captures require their own receipt and visual review.

## Explicit partial UX items and source overrides

- The archived flow routes first-time setup through the guide before starting
  the Solo clock. Current `SoloPlayPage._start` starts the attempt directly;
  the guide remains available as an optional action. Automatic first-use guide
  presentation is partial. This does not block the explicitly bounded offline
  learning milestone, and must not be described as full flow parity.
- The concept scoreboard shows a CSV download, and Duel results show a
  wrong-question practice shortcut. Neither action is present in the current
  native screen. Local leaderboard and server-owned Duel review are implemented;
  these extra concept actions are not claimed.
- Profile source accepts the canonical initial/geometry avatar presets, rather
  than the colour-swatch selector drawn in board06. Role remains server-owned.
- Five assessment shapes include **cone**, despite Prisma in some board
  illustrations. Neutral game assets, parser symbol `a` for cube edge,
  canonical projection arrangement/tolerance and actual surface counts override
  illustrative image errors. The board09 `s` formula is not a parser contract.
- SVG/URL preview/select/copy does not claim native printing, file-save or OS
  browser opening. Missing cloud capability shows an honest unavailable state;
  Google consent, delivery, real CRUD/outbox acknowledgements and two-client
  Duel are unverified by reference images or host fixtures.

No additional critical integration defect was identified by this limited visual
review. The combined Android runtime gate, actual screenshots, physical-phone
and hosted-service bounds remain owned by the final integration handoff.
