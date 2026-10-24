# GeoDecoder verification — 16 October 2026

The complete sketch was compiled as C++11 with `-Wall -Wextra -Werror -pedantic` and AddressSanitizer/UndefinedBehaviorSanitizer. Only the electrical/device interfaces were simulated; application, button debounce, quiz, LCD, RFID polling, LED, serial and registry code were the actual `.ino` tabs.

Commands:

```text
python3 tests/run_tests.py --sketch main
python3 tests/run_tests.py --sketch main --rgb
```

Both runs for the preceding LCD/menu implementation: **22/22 passed**.

Coverage: 15 questions / 3 per shape; fair distinct five-shape rounds; menu; all six help pages; NEXT cannot exit help; HINT toggle and continuous time; exact Q/time/S header; every question and hint compared with the expected LCD copy; single solid/net scan; wrong reader/shape rejection; skip notice +0; single-reader arming; held-card removal; automatic last-question results; frozen final time; fresh-round reset; GPIO button debounce/hold; boundary presses during a notice; complete five-question round; LED/RGB routing; millis rollover; minutes:seconds beyond one hour; NVS reload and active-shape filtering.

The original sketch failed the new interaction checks as expected (1/18 passed). An independent source review then found a late physical press could survive the notice and affect the following question/results. Its GPIO-level regression failed before the fix (21/22) and passed afterward (22/22 in both configurations). Presses observed during a pending notice are now consumed until stable release.

No critical or important review finding remains unaddressed. GPIO assignments, persisted shape IDs, `RegistryData` fields, NVS namespace/key/magic/version and enrolment commands remain compatible with the input sketch.

## Scope of verification

This is a native compile/simulation result. No ESP32 Arduino board toolchain or physical device was available, so Arduino IDE board compilation, RF reliability, LCD contrast/I2C, button module polarity and physical LED wiring must still be confirmed on the user's board.

## Question and hint revision

The 10 solid-question bodies remain unchanged, including P1 and P2. The five net questions now require interpretation of measurements, volume or total surface area before choosing a net. All 15 hints guide a reasoning step without naming the answer or listing the net's component pieces. IDs, expected shapes, reader assignments, round selection and all other application code are unchanged.

The revised LCD fixture rejected the old bank as expected (21/22). After the copy update, `python3 tests/run_tests.py --sketch main` passed **22/22** with the default ordinary LEDs. The earlier RGB run above applies to the preceding UI implementation; this revision changes question text only.

All 90 body/hint rows were checked as ASCII with a maximum of 20 characters. Full-text serial descriptions match the displayed questions. Numeric checks confirm P3 has V/(base area * height) = 1/3, S3 = 1 and C3 = 1/3. K3's volume 125 cm^3 and surface area 150 cm^2 match a side-5 cm cube; among rectangular cuboids with this volume, the minimum surface area is 150 cm^2, attained only when all sides are equal. B3 uses three unequal dimensions 6, 4 and 3 cm with volume 72 cm^3. These clues distinguish the intended answers among the five supported shape categories.

## Implementation decisions

- Correct answers advance automatically after the one-second feedback notice. This keeps NEXT's in-game action as skip; changing to manual advance would require changing that transition.
- Ordinary reader LEDs GPIO25/26 remain the default because the supplied configuration preserved those LEDs and left RGB disabled. For two RGB units, set `GEODECODER_RGB_ENABLED` to `1` before upload.
- Existing active-shape selection is retained in NVS. To use all 15 questions, activate all five registered shapes with the `use` command in the README.
