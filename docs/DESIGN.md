> Historical document from the supplied ZIP. Some counts, interfaces and results describe earlier revisions. Current setup: `README.md`; current behaviour: `main/`; current checks: `VERIFICATION.md` and `tests/run_tests.py`.

# GeoDecoder ESP32 quiz

User-approved design, 16 October 2026. Execution authorised in chat: continue coding; choose suitable shapes.

- ESP32 classic WROOM-32/32E, two RC522 readers, I2C LCD 20x4, two 3-pin buttons.
- Default active types: cube, square-based pyramid and cylinder. Each has a solid tag at R1 and a distinct net tag at R2: six real, user-enrolled UIDs. This supersedes the earlier two-type default.
- Twelve stored questions for five supported types. Each round builds a shuffled pool of two questions per active type, then takes min(5, pool size), without replacement. Two types therefore give four questions. Cylinder and cone have three stored variants, of which two rotate into each pool.
- Only fully enrolled active types can start play. Unknown tags and wrong-reader tags cannot become answers. Matching shapes must also match the current question.
- Boot always opens the GeoDecoder menu with saved tags loaded. B1/NEXT starts or resumes; B2/HINT toggles the how-to screen. During play B1 advances/skips and B2 hints without changing the question line. On the summary B1 starts a new round and B2 returns to the menu. B1 cancels teacher capture or returns from UID inspection to the menu.
- One point per eventually-correct question, once only. Wrong attempts and hints are counted, not deducted. Skipped questions receive zero. The round stopwatch includes hints/retries, pauses in menus/teacher modes, and freezes when the final question is answered or skipped. Summary shows score and elapsed time. No round progress is persisted.
- Student LCD uses centered menu text, PAD A/B instructions and a running clock. Raw UIDs, firmware, GPIO and Serial commands stay in Serial. Brand is GeoDecoder throughout code, documents and print labels. Keep the existing NVS namespace and registry version to preserve enrolled tags.
- Serial provides help, current active types/count, active-type selection, UID scan, scan-to-enrol, direct UID assignment, removal, status, bank, score, play, stop, next, hint, retry and new round.
- Preferences stores a versioned registry/settings blob atomically. Reject duplicate/malformed UIDs and validate loaded data; failed writes must not change RAM settings.
- Registration/configuration edits invalidate the old round. UID inspection merely pauses it. Successful registration stops capture. A 30-second timeout cancels unfinished capture.
- GPIO follows the user's supplied wiring screenshots: SPI 18/19/23, SS 5/27, shared RST 4, LCD 21/22, B1/B2 32/33 with internal pull-up for active LOW (pull-down for active HIGH). Future RGB R/G/B 25/13/14 and 26/16/17, disabled by default. All assigned pins are distinct except intentional shared buses/reset.
- LCD 5V I2C uses a bidirectional level shifter. RC522/buttons use 3.3V. RGB channels need individual resistors.
- Deliver six reusable-frame print labels: solid + net for each default type. Use exact vector geometry, standard 85.6 x 54 mm cards, A4 100% print layout, editable SVGs, and a reusable SVG frame.

## Completion evidence

Host tests execute the actual sketch with simulated hardware boundaries; an ESP32 compiler validates target APIs separately. Neither proves physical RF, wiring or supply behaviour.
