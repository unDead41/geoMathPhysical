# Mobile image review — 15 representative states

Visual auditor: Codex, using direct image-viewer inspection. Root/user approval is separate.

Visual review compares the actual application images with the approved concept; **capture success and functional tests do not establish visual match**. “Structure matches” means the main approved grouping, hierarchy and emphasis are present. “Qualified” identifies concrete remaining presentation differences or required truthful/domain states. Neither label means pixel-perfect, identical artwork, or zero deviations.

All 10 original boards were opened and byte-verified against the concept manifest. All 40 final desktop frames were visually inspected in the ten final side-by-side contact boards; larger individual frames were also inspected during refinement, with fresh 01/06/12/34 and mobile fixes checked directly. This report does not infer image approval from source or test counts.

Capture snapshot: `final-canonical-desktop-vendored` / `final-canonical-mobile-vendored`. Repository HEAD `ef697c86a5bfdf5a5658c3df92bce1d7f3f88652` is the **base**, with the dirty source state recorded in each manifest. Exact served index/CSS hashes, app source hash and QA bundle hash identify the snapshot; the HEAD is not a claim that these changes were already committed.

Packaged module: `vendor/module-v1.6.2.html`, Git blob `3af0469979d878c8e605d093db1be0c0649c6509`, SHA256 `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`. Desktop and mobile index/CSS/module content hashes agree. The fixture compiles real app sources in memory with QA-only controller hooks/local transport; it does not serve the release bundle byte-for-byte. `builtAppBundleSha256` separately records the build artifact present during capture.

Synthetic QA Auth, local PostgreSQL gateways, labelled classroom/solo/reflection records and a real local protocol 2 Duel handler are used. No production account/email/database is touched; non-local browser requests are blocked. No product CSS injection, font/layout mask, invented product route or global demo mode is used.

390×844, English, dark,150% text and reduced motion. The 13 requested representatives are supplemented by 06 (formula/stacked-action regression) and 13 (Duel result overlap regression). All 15 captured with 0failures,0 page errors,0 external requests and no parent/iframe horizontal overflow. Vertical growth and real internal scroll owners are preserved.

|Screen|Final entry viewport|Direct visual finding|
|---|---|---|
|01 home|[viewport](01-home.png)|Whole-word enlarged headline; scene and three destinations reflow below.|
|05 quiz-r1|[viewport](05-quiz-r1.png)|Readable enlarged prompt; full5+5 banks preserved below (full outer-document image inspected).|
|06 quiz-r2|[viewport](06-quiz-r2.png)|Whole-word full-width actions; accepted R1, hint, R2 and5+5 choices complete. Long formula310px owner/411px content; keyboard0→40px; no page overflow.|
|12 duel-play|[viewport](12-duel-play.png)|Player name/metric sections stack; QA Opponent remains whole. Pads and choice banks follow vertically; server time remains present.|
|13 duel-results|[viewport](13-duel-results.png)|Single verdict, scene then two score cards; no artwork/card overlap. Full-page result directly inspected.|
|14 login|[viewport](14-login.png)|Editorial text/art above real login form; no overlap.|
|17 teacher-overview|[viewport](17-teacher-overview.png)|Identity/navigation reflow above classroom workspace; full content remains vertical.|
|22 student-waiting-room|[viewport](22-student-waiting-room.png)|Identity/room title reflow; scene, participants and truthful waiting reason follow below.|
|25 explore|[viewport](25-explore.png)|Entry viewport shows real module navigation; actual cube and controls inspected in scrolled content/model supplements.|
|27 notes|[viewport](27-notes.png)|Entry viewport shows module navigation; notes contents/net/formula inspected in scrolled supplements. Some long compact labels still wrap within their controls.|
|29 net-studio|[viewport](29-net-studio.png)|Real cube editor chosen through native Details; scrolled canonical net is complete. Guided-reflection/Pause labels can wrap in narrow enlarged controls.|
|34 projection-studio|[viewport](34-projection-studio.png)|Real studio title/tools and complete Method1 board inspected in scrolled supplements; coordinate input form remains below.|
|37 settings-light|[viewport](37-settings-light.png)|Settings labels scale; native selects/tabs and real modal scroll remain.|
|39 help|[viewport](39-help.png)|Help topic words remain readable; main search/guide/FAQ follow in modal scroll.|
|40 support-report|[viewport](40-support-report.png)|Prepared-report state, real required fields and modal scroll; copy/select/download remain supported, no automatic submission.|

The four mobile module entries begin with the actual vertical feature navigation. These extra images use only real scrolling; no DOM/style/font/layout changes conceal that entry state.

|Screen|Scrolled content|Scrolled model/board|
|---|---|---|
|25|[content](25-explore-content.png)|[model/board](25-explore-model.png)|
|27|[content](27-notes-content.png)|[model/board](27-notes-model.png)|
|29|[content](29-net-studio-content.png)|[model/board](29-net-studio-model.png)|
|34|[content](34-projection-studio-content.png)|[model/board](34-projection-studio-model.png)|

Mobile typography measured on the actual app:100% root16px/body16px/stage instruction14px;150% root16px/body24px/stage instruction21px. No225% double scaling was observed. Formula keyboard-scroll proof and exact bounds are in screen 06 workflowChecks. Earlier446px overflow failures remain separately preserved in scratch and are superseded by this final contained state.

Minor remaining presentation differences: some long secondary labels wrap at 150% (for example notes “Try measurements” and lab “Guided reflection”); drawings retain their canonical geometry. No new cosmetic pass is implied by the completed capture checks.

Additional final-source modal-scroll evidence was directly opened at 390×844 EN/dark/150%. No element/style/font/layout alteration was used. The three extra entry captures duplicate numbered coverage; the bottom views verify content that cannot be inferred from an entry screenshot. Their exact CSS/index/module hashes agree with the canonical mobile manifest.

|Screen|Actual modal bottom viewport|Observed content|
|---|---|---|
|37|[settings bottom](utility-content/37-settings-light-bottom.png)|Preview, two audio rows with percentages, reset/help and Done remain visible and legible.|
|39|[help bottom](utility-content/39-help-bottom.png)|Canonical R1/R2 guide, supported guide action and all three FAQ accordions.|
|40|[report bottom](utility-content/40-support-report-bottom.png)|Read-only preview, no-send explanation and Copy/Select/Download/Edit controls.|

[Supplementary capture/provenance manifest](utility-content/capture-manifest.json). These three captures have 0 failures,0 page errors and 0 external requests.
