> Historical document from the supplied ZIP. Some counts, interfaces and results describe earlier revisions. Current setup: `README.md`; current behaviour: `main/`; current checks: `VERIFICATION.md` and `tests/run_tests.py`.

# GeoDecoder execution ledger

Design and implementation plan: DESIGN.md and IMPLEMENTATION_PLAN.md.

- User chose native continued implementation, authorised default shape choices and confirmed cube + square-based pyramid after terminology clarification.
- Pre-flight: registry masks and bank Shape indices share stable explicit IDs; both readers use role indices 0 and 1; all cross-tab declarations live in config.h to avoid Arduino auto-prototype order errors.
- Ruling: standalone artifact; no external repository, push, deployment or merge is involved.
- User steering: add cylinder and its net. Default is now three types/six cards, five questions from a six-question pool. Six print labels and a reusable frame are included.
- Task 1 complete: observed RED (round count zero instead of four); implemented selection; native bank test passes across 100 seeds and active masks.
- Task 2 complete: observed missing application RED; actual tabs now pass 21 integration cases with ASan/UBSan, both RGB=0 and RGB=1. External I/O only is simulated.
- Final review: independent reviewer reported no Critical/Important issue; NVS no-op false-success was regraded important and fixed via an observed RED-to-GREEN regression. Added persistence-corruption and held-card resume regressions. Final suite: 24 cases in each RGB mode, plus bank test.
- Ruling: wrong counter counts changed answer combinations, not repeated identical RF scans; this preserves stable feedback and is documented for the teacher. It does not change earned marks.
- Target compile complete: RGB off 331,595 flash / 24,300 RAM; RGB on 331,875 flash / 24,300 RAM; both exit zero, no warnings.
- Label PDF and six SVGs complete; visual inspection corrected fold-line dashes in PDF rendering, then verified the final sheet.
- User-facing instructions, wiring, Serial reference and validation are complete. Delivery bundle includes editable sources, tests and print assets.
- Wiring correction from the user's two supplied screenshots: SS1=5, SS2=27, shared RST=4,
  B1/B2=32/33; LCD stays 21/22. Buttons use polarity-appropriate internal bias. RGB remains off,
  with future R/G/B pins 25/13/14 and 26/16/17 to avoid the button pins.
- Existing host suite rerun successfully after updating hardware stubs: bank 100 seeds and
  24 integration scenarios in each RGB mode. Updated target builds: RGB off 331,611 flash,
  RGB on 331,891 flash; both 24,300 RAM, exit 0, no warnings. Actual card read awaits user upload.
- Student UI update: boot now opens the GeoDecoder menu; NEXT starts/resumes, HINT toggles instructions.
  Questions keep the hint on a separate row; the footer shows score and elapsed time. Summary shows score
  and duration, with physical replay/menu controls. Technical diagnostics remain in Serial.
- Timer includes hints/retries, pauses in teacher/menu modes and freezes on the final correct answer or skip.
  New rounds clear score/time. Existing NVS namespace and registry schema are retained for enrolled tags.
- TDD evidence: menu test failed on old auto-start behavior, timer test failed on absent elapsed display;
  both subsequently passed. Final host coverage is 29 cases per RGB mode plus the bank selection test.
- Label branding is GeoDecoder; exact geometry and frame remain reusable. Native LCD snapshots document
  the actual 20-column render for menu, instructions, a timed question and round results.

- Current GeoDecoder target builds: RGB off 333,031 flash / 24,324 RAM; RGB on 333,327 flash / 24,324 RAM. Both exit zero with no compiler warnings. Final 29-case suites pass in both modes.
