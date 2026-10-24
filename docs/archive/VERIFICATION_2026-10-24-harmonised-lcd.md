# GeoDecoder verification - harmonised LCD bank, 24 October 2026

Baseline main: `4a798fd835a8cca811ee1140f209900446c1fbf9`.
Question branch: `b514d733a2e10f9cdc8640c0de2471513dc9f051`.

The reviewed bank is integrated with the current clean architecture, two-card
game flow and component diagnostics. The `domain/types.h` include and injected
`RandomIndex` round builder are retained.

## Native checks

| Configuration | Pure core/application/view | Firmware integration |
|---|---|---|
| `--entrypoint src/main.cpp` | 11/11 passed | 46/46 passed |
| `--entrypoint src/main.cpp --rgb` | 11/11 passed | 46/46 passed |
| `--separate-modules` | 11/11 passed | 46/46 passed |
| `--separate-modules --rgb` | 11/11 passed | 46/46 passed |

Commands use `python tests/run_tests.py` with the flags above. C++11,
warnings as errors, ASan and UBSan remain enabled. The maintained bank case
checks all source rows for printable ASCII and the 20-column limit, unique
IDs, the preserved two solid/one net question metadata split per shape,
and matching Serial/LCD wording. The integration case checks all 15 question
and hint bodies. The pure LCD view case now expects the reviewed P1 hint.

Existing two-card scoring, stage routing, held-card/button interlocks, exact
900 ms blink sequences, stopwatch pause/resume, user GPIO wiring, NVS byte-image
and Serial component diagnostics all pass in the combined source.

## ESP32 compilation

`pio run -e esp32dev -e esp32dev-rgb` completed successfully.

| Environment | Result | Static RAM | Flash |
|---|---|---:|---:|
| esp32dev | SUCCESS | 22,772 / 327,680 | 335,921 / 1,310,720 |
| esp32dev-rgb | SUCCESS | 22,772 / 327,680 | 335,969 / 1,310,720 |

Toolchain: PlatformIO Core 6.1.18, Espressif32 6.12.0, Arduino-ESP32 2.0.17,
Xtensa GCC 8.4.0+2021r2-patch5, MFRC522 1.4.12 and hd44780 1.3.2.
These are compile-time image sizes, not physical performance measurements.

## Documentation

- [Text review of all screens](../LCD_QUESTION_REVIEW.md)
- [Latest A4 PDF](../lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf)
- [15 matching PNGs](../lcd/GeoDecoder_15_Contoh_LCD_PNG.zip)

All 30 question/hint frames were captured by executing the current
`src/main.cpp` through the native LCD harness. Each frame has four rows of
20 ASCII characters and matches the reviewed bank. Previews show the active
R1 header at 00:14 and the hint at 00:19. Runtime changes the header to R2
after the correct solid card without changing the question/hint body.

The PDF contains 15 landscape A4 pages with one fixed layout, side-by-side
LCDs, textbook symbol terms, no metadata row and a gold accent inside the
rounded banner. Each PNG comes from the final PDF. Visual inspection and
pixel comparison confirmed the latest update changed only R1 in the LCD
headers; the approved template remains identical on all pages.

## Preserved contracts and findings

All 15 question IDs, answer shapes and legacy metadata remain. Runtime
`AnswerStage`, rather than `Question.reader`, still chooses R1 then R2.
No scoring, clock, game engine, component controller or GPIO change was made.

Ordinary LEDs remain GPIO25/26. User RGB wiring remains R1 R/G/B=16/17/26
and R2=13/14/25. NVS namespace `geomath_q2`, registry key, shape IDs and the
120-byte registry ABI remain unchanged; saved cards require no migration.

The previous question branch targeted the older architecture and included
single-card documentation. Integration retains the current types/RNG API,
updates the stale P1 hint fixture, and describes the active two-card rule.

USB upload and physical LCD/RFID/button/LED tests were not performed.
Physical readability and contrast still need a real-board check.

The prior component integration evidence is retained in
[the archive](VERIFICATION_2026-10-24-components.md).
