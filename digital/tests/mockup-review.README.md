# Approved 40-screen visual review

`mockup-review.capture.mjs` collects current-source application screenshots. It does **not** assert that the implementation visually matches the approved mockup. The generated `REVIEW.md` starts every comparison at `PENDING`; a reviewer must open the images and record findings.

The fixture compiles the real app and current module sources in memory. It does not overwrite `app.bundle.js`, module/vendor output, or product source. The only controller hooks are appended in that in-memory QA bundle. The parent module bridge and sandboxed iframe remain real. A disposable PGlite database runs the real classroom SQL gateway; a second runs the real protocol 2 Duel handler and SQL. Auth sessions, session-list transport, reflection records and classroom display records are synthetic QA data. The fixture never sends email or touches a hosted database. Browser requests to non-local hosts are aborted and recorded.

Run from the repository root:

```sh
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome-headless-shell \
PLAYWRIGHT_MODULE_PATH=/path/to/playwright \
node digital/tests/mockup-review.capture.mjs \
  --screens 01,14,25 --out /absolute/evidence/smoke --label working-source
```

Omit `--screens` for all 40 desktop views at **1440 × 900**. Use `--profile mobile` for representative views at **390 × 844, English, dark, 150%**; its default set is 01,05,12,14,17,22,25,27,29,34,37,39,40. Both profiles accept an explicit screen list. Captures include viewport PNGs, full-content PNGs, a source/provenance/error/overflow manifest, and a manual-review table. They use a fixed QA random seed and reduced motion for repeatable images.

Mobile module entries also save actual scrolled activity/model viewports for 25,27,29,34, because their real vertical navigation occupies the entry viewport at enlarged text. Utilities 37,39,40 also save the bottom of the native dialog scroll. Scroll coordinates and image hashes are recorded; no DOM, style, font or layout changes hide the real entry state. Screen 06 additionally checks that a long formula stays within its own scroll owner and can be scrolled by keyboard. Add 06 and 13 to the representative list to retain the final formula and Duel-result regression evidence.

After packaging/pinning the module, pass `--module vendored` to capture the HTML actually imported by the application. The default `--module source` compiles the current teaching sources in memory for iteration. The manifest distinguishes both modes and hashes the exact served module, QA bundle, app source and frozen index/CSS. `sourceCommit` is the repository HEAD, not a claim that uncommitted source has that commit's contents; `sourceStatus` and these content hashes describe the capture snapshot. Final labels reject the optional iteration-only `MOCKUP_REVIEW_MODULE_CSS` injection.

Screen 18 uses the real class selection and **Buka kelas** anchor from screen 17. It is a workspace within the same dashboard, so that viewport is scrolled to the actual anchor. Screen 16 uses a synthetic verified recovery session, through the existing recovery lifecycle, rather than an unverified reset form. Screen 13 sends real Duel actions and honors feedback/review readiness before rendering the actual result. Screens 08/09 settle the real solo Game controller; their records are display fixtures, not performance evidence. Screens 19/20 contain explicitly labelled synthetic SQL display records. Screen 36 uses valid synthetic self-reflections, not mastery or grades.

The approved originals and acceptance criteria are external to the product tree: `mockup-reference/images`, `VERIFIED_IMAGES.json`, and `VISUAL_SPEC.md` in the task workspace. Original bytes and hashes are preserved separately from any comparison crops/contact sheets.

Do not publish the fixture or treat capture success, workflow tests, source inspection, or a screenshot count as visual approval.

Create visual comparison artifacts after capture:

```sh
python digital/tests/mockup-review.compare.py \
  --captures /absolute/evidence/desktop \
  --reference /absolute/mockup-reference/images \
  --out /absolute/evidence/comparison
```

This creates 40 individual reference/current pairs, ten contact boards and a local HTML reviewer gallery. Original reference bytes stay unchanged; comparison crops and contact boards are derived review artifacts. No similarity score or automatic match verdict is produced. The committed evidence reviews distinguish the agent's direct image inspection from root/user approval and record qualified composition differences explicitly.


The accompanying `mockup-notes.browser.mjs` switches through all11 canonical
solids and asserts painted solid/net output, truthful no-net captions for sphere
and hemisphere, and no page errors. Run with the same Chromium/Playwright
environment variables. This protects the overview against a mathematically valid
but edge-on camera that produces a visually empty net.
