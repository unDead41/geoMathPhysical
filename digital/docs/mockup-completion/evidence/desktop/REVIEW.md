# Desktop image review — 40 screens

Visual auditor: Codex, using direct image-viewer inspection. Root/user approval is separate.

Visual review compares the actual application images with the approved concept; **capture success and functional tests do not establish visual match**. “Structure matches” means the main approved grouping, hierarchy and emphasis are present. “Qualified” identifies concrete remaining presentation differences or required truthful/domain states. Neither label means pixel-perfect, identical artwork, or zero deviations.

All 10 original boards were opened and byte-verified against the concept manifest. All 40 final desktop frames were visually inspected in the ten final side-by-side contact boards; larger individual frames were also inspected during refinement, with fresh 01/06/12/34 and mobile fixes checked directly. This report does not infer image approval from source or test counts.

Capture snapshot: `final-canonical-desktop-vendored` / `final-canonical-mobile-vendored`. Repository HEAD `ef697c86a5bfdf5a5658c3df92bce1d7f3f88652` is the **base**, with the dirty source state recorded in each manifest. Exact served index/CSS hashes, app source hash and QA bundle hash identify the snapshot; the HEAD is not a claim that these changes were already committed.

Packaged module: `vendor/module-v1.6.2.html`, Git blob `3af0469979d878c8e605d093db1be0c0649c6509`, SHA256 `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`. Desktop and mobile index/CSS/module content hashes agree. The fixture compiles real app sources in memory with QA-only controller hooks/local transport; it does not serve the release bundle byte-for-byte. `builtAppBundleSha256` separately records the build artifact present during capture.

Synthetic QA Auth, local PostgreSQL gateways, labelled classroom/solo/reflection records and a real local protocol 2 Duel handler are used. No production account/email/database is touched; non-local browser requests are blocked. No product CSS injection, font/layout mask, invented product route or global demo mode is used.

All 40 requested captures completed at 1440×900;0 capture failures,0 page errors,0 external requests and no document/iframe horizontal overflow. These are capture diagnostics, separate from the manual findings below.

|Screen|Actual final image|Manual comparison|Findings / precise exceptions|
|---|---|---|---|
|01 home|[viewport](01-home.png)|Structure matches|Navy split headline, large gridded geometry kit and three equal destinations. Real rotation controls and the offline status strip remain.|
|02 choose-mode|[viewport](02-choose-mode.png)|Structure matches|Nickname above three selectable cards; blue Quiz selection and one primary start. Counts remain10/15/two players. Illustrated miniatures differ from the raster line icons.|
|03 resume|[viewport](03-resume.png)|Structure matches|Two-solid illustration, divider, real saved facts/progress, device-only note and two actions. Synthetic attempt is0/10, rather than copying mockup progress.|
|04 guide|[viewport](04-guide.png)|Structure matches|Three numbered illustrated steps, arrows, compact playback and keyboard guidance. The real finite 4.8 s demo replaces the raster 24 s/A–E labels.|
|05 quiz-r1|[viewport](05-quiz-r1.png)|Structure matches|Compact session strip, side-by-side scanner/prompt, two complete five-card banks; both banks fit the 900px viewport.|
|06 quiz-r2|[viewport](06-quiz-r2.png)|Structure matches|Real Practice 15 accepted R1/active R2 with purple hint. Formula, hint banner and complete5+5 choices are visible. Mobile long formula uses its own keyboard-scroll owner.|
|07 correction|[viewport](07-correction.png)|Structure matches|Coral correction banner, selected/correct solid+net groups, explanation and primary Continue. Actual settled solo feedback drives the view.|
|08 solo-results|[viewport](08-solo-results.png)|Structure matches|Large scene beside green 7/10 summary; supported actions and two compact review tables. The full ten-answer review remains scrollable/disclosed.|
|09 scoreboard|[viewport](09-scoreboard.png)|Qualified|Scene/table proportions, local scope, five QA rankings and supported export are present. Existing native dialog/backdrop replaces the concept full page.|
|10 duel-entry|[viewport](10-duel-entry.png)|Structure matches|Single heading, small scene and equal create/join cards. Redundant instruction stepper removed. One accessible pasteable six-digit input replaces six separate boxes.|
|11 duel-lobby|[viewport](11-duel-lobby.png)|Qualified|PIN/copy block above two readiness cards and Ready action; native return/leave flow retained. PIN expiry and real waiting text add height and the Ready action spans the workspace.|
|12 duel-play|[viewport](12-duel-play.png)|Structure matches|Compact horizontal match strip, narrow scanner rail and two side-by-side five-card banks. Both pads fit 900px. Server clock explanation stays available.|
|13 duel-results|[viewport](13-duel-results.png)|Qualified|Single verdict, two score panels, trophy/geometry centre, navigation and durable review. Canonical shared scene is central rather than oversized solids at the raster edges; trophy is a line icon.|
|14 login|[viewport](14-login.png)|Structure matches|Balanced editorial scene and labelled white login form; text/art no longer overlap. Recovery, registration and guest routes remain.|
|15 registration|[viewport](15-registration.png)|Qualified|Split illustration/form and two role tiles match. Real policy/helper text and44 px controls make the form taller than 900px; password/actions require vertical scroll. No mockup identity values are seeded.|
|16 recovery|[viewport](16-recovery.png)|Structure matches|Narrow scene, verified two-step reset workspace and side information card. This capture uses a labelled synthetic verified recovery lifecycle; request-link is a separate real state.|
|17 teacher-overview|[viewport](17-teacher-overview.png)|Qualified|Teacher rail, class list and selected illustrated overview match the main grouping. Existing class-creation and management actions add content absent from the raster.|
|18 class-workspace|[viewport](18-class-workspace.png)|Qualified|Real Buka kelas anchor opens this portion of the same dashboard. Compact PIN/invite row, roster and room list; pending invitations follow roster. Header scrolls above this anchored viewport; real CRUD rows are taller.|
|19 teacher-live-room|[viewport](19-teacher-live-room.png)|Structure matches|Teacher rail, live title, PIN plus bounded scene, freshness and full-width progress table. Synthetic SQL display results are labelled fixtures, not achievement evidence.|
|20 teacher-results|[viewport](20-teacher-results.png)|Structure matches|Closed results table at about two-thirds width with scene at right, scope copy and back action. Unsupported classroomCSV is omitted.|
|21 student-overview|[viewport](21-student-overview.png)|Qualified|Student rail, small scene, prominent PIN panel and two class/invitation cards match. Recent data is actual supported module checkpoints, rather than invented quiz-history scores.|
|22 student-waiting-room|[viewport](22-student-waiting-room.png)|Structure matches|Bounded scene beside participant list; waiting state, disabled Start/reason and server-clock note all visible. Inactive QA connection dots reflect the local fixture heartbeat state.|
|23 profile|[viewport](23-profile.png)|Qualified|Avatar strip, aligned edit fields and preview card match. Immutable email/verification/role/class details and44 px controls extend the real form below 900px; Save/Cancel remain below.|
|24 security|[viewport](24-security.png)|Qualified|Password card above sessions with mint current-device row; real session semantics and policy explanations extend below 900px. Direct Security correctly uses a neutral rail until private profile is loaded.|
|25 explore|[viewport](25-explore.png)|Structure matches|One parent header, feature rail,11-model picker, large canonical cube workspace and properties/try column. Extra camera/animation controls remain reachable below the first viewport.|
|26 orthographic-views|[viewport](26-orthographic-views.png)|Qualified|Canonical orthographic viewport and six 3×2 view cards are present. Real Explore ownership retains picker/tabs and uses a true2D face, rather than the raster perspective cube.|
|27 notes|[viewport](27-notes.png)|Structure matches|Inner contents rail, model/properties row and three concept tiles; canonical net is visibly painted. Worked examples/full notes remain below or in native disclosures.|
|28 calculator|[viewport](28-calculator.png)|Structure matches|Distinct model picker, unit-labelled measurements, canonical dimension diagram and two mint results. Actual96cm²/64cm³ values and calculation route remain.|
|29 net-studio|[viewport](29-net-studio.png)|Qualified|Real cube editor selected through its native Details control: large gridded canonical net and action/editor rail. The real editor/grid/hinge controls differ from the raster fictional Add/Undo rail and continue below 900px.|
|30 volume-lab|[viewport](30-volume-lab.png)|Qualified|Unit-cube mode selected through the real volume selector; container left, dimensions/actions right and four-stage path. Capture is the honest initial empty container, not the raster partially filled sample.|
|31 surface-workshop|[viewport](31-surface-workshop.png)|Qualified|Surface workspace and right mode/action rail are present. Actual cube is smaller than the concept, and face-selection/result controls continue below the first viewport. Canonical face/area rules remain authoritative.|
|32 composite|[viewport](32-composite.png)|Qualified|Separate canonical cube+pyramid scene, supported preset/dimension/action rail and reflection path. Actual totals/selection controls remain below rather than squeezing unsupported raster controls into one viewport.|
|33 lab-hub|[viewport](33-lab-hub.png)|Structure matches|Four equal activity cards with substantial canonical art and aligned Open actions; other tools strip below. Completion chips reflect actual record state.|
|34 projection-studio|[viewport](34-projection-studio.png)|Qualified|Model/dimensions, full drawing toolbar and complete Method1 combined board. Domain correction is deliberate: right elevation left of front, front above plan. Plan bottom/ticks fit the board; coordinate/check tools remain below.|
|35 calculation-workshop|[viewport](35-calculation-workshop.png)|Structure matches|Four calculation stages, substantial shape/measure card and current answer/check card. Default is Formula, rather than raster Substitution sample; restricted parser and true state preserved.|
|36 records|[viewport](36-records.png)|Qualified|Four clean canonical-art rows, honest 2/4 reflection count, statuses and continuation controls. This is the real native records disclosure within the module; sidebar scrolls with the document and reflections remain expandable.|
|37 settings-light|[viewport](37-settings-light.png)|Qualified|Illustrated rail, tabs, display/preview split, audio rows and Done match. Existing native dialog and native selects preserve all real options including System, rather than imitating limited raster segments.|
|38 settings-dark|[viewport](38-settings-dark.png)|Qualified|Same settings hierarchy in navy/dark with legible text, borders, preview and blue selections; same native-dialog/select exception as 37.|
|39 help|[viewport](39-help.png)|Qualified|Help rail, real topics/search, mintR1+R2 guide and FAQ match. Existing native dialog remains; topic labels/content reflect supported navigation.|
|40 support-report|[viewport](40-support-report.png)|Qualified|Illustrated rail, read-only prepared report, copy/select/download/edit actions and no-auto-send note match. Extra required expected/actual fields are truthfully disclosed; no real report is submitted.|

The approved originals are the immutable concept commit `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd`, `digital/docs/uiux-redesign-concept/images/`. Number strips and concept-gallery captions are documentation chrome, not UI. Ten final contact boards plus40 individual comparisons and an HTML reviewer gallery are retained at `/workspace/scratch/8354d9072f14/mockup-reference/final-canonical-desktop/comparison/`; they contain original reference images beside the current viewports, not similarity scores.

Screen 34 containment: within the iframe, complete plan group top 518/bottom 656.5; SVG top 318.5/bottom 670.5; scroll owner top 317.5/bottom 671.5, clientHeight 352/scrollHeight 352. Entire plan including bottom ticks is inside the board.

Full outer-document PNGs remain in the corresponding scratch capture folder and are intentionally omitted from Git. A full outer-document screenshot does not expand iframe/modal scroll content; mobile scrolled supplements provide actual activity/model evidence.

[Open the ten final approved/current contact boards](../comparison/README.md). Repo contact copies are resized derived review artifacts; the complete original-size final comparison outputs remain in the scratch comparison folder.
