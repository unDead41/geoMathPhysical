# GeoMath laboratory UI implementation plan

Goal: implement concept screens 29–33 using the current four laboratory controllers and canonical geometry.

Base: `main-digitalized` `391df985eea4fee15d9859e678068b1a3f613cba` (Digital 2.8.0 / module 1.6.0).
Concept: `ui/ux-redesign-concept` `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd`.
Spec: `digital/docs/uiux-redesign-concept/prompts/03-module-labs-ui-refresh.md` at the concept ref, plus its implementation and ownership contracts.

- [x] Add a four-card hub with canonical mesh thumbnails and actual reflection states; keep activity navigation in LearningLabs.
- [x] Arrange the existing canvas, playback, camera and activity rail; move the existing guided fields into four readable steps below the experiment. Preserve every controller ID and advanced mode.
- [x] Keep new visual rules inside the `UX-REDESIGN:LABS` block scoped to `#labs-panel`; consume central tokens. Keep print geometry unchanged.
- [x] Verify navigation and paused work across hub/activities, reflection gates and retry, canonical net printing, transfers/overflow, surfaces/cavity and both compositions.
- [x] Run the full module suite/build/check and central design check. Inspect 1440/390px, both locales/themes, 150% text, contrast, keyboard, simulated touch and reduced motion. Save real rendered screenshots and a reproducible browser fixture.
- [x] Record evidence/limitations and integration boundary. Push only the work branch using a checked remote head.

Review focus: no autoplay on hub return; no draft loss on presentation changes; invalid nets cannot print; volume fraction is distinct from height; records remain formative and session-scoped. No source version, vendor pin or generated parent bundle changes belong to this isolated presentation branch; release numbering and the combined pin belong to the integrator.
