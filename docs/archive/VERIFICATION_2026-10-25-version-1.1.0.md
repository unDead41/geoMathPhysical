# GeoDecoder v1.1.0 verification - 25 October 2026

Inspected main: `b0992bfcbb68effd3b979d3bbee2a28c99d71e55` (v1.0.0).
Publication target: `main`. This release combines the user's complete-colour
calibration request, purple gameplay hints and the physical RGB R1/R2 swap.

## Resulting behaviour

- R1RGB/R2RGB cycle red, green, blue, yellow, cyan, magenta and white in order,
  500 ms per colour, repeating every 3,500 ms. R1Random/R2Random retain the
  previous random pattern; slash commands remain available.
- R1Purple/R2Purple and test/led/target/purple select MAGENTA (red + blue).
  Fixed colour commands, including all seven colours and OFF, are listed in help.
- Gameplay hints use the same purple on the active reader. During R2 hints,
  R1 stays green. Wrong answers turn only the active reader red, then restore
  purple if the hint is open; closing a hint restores blue. Hint time continues
  and scoring still requires the matching R1/R2 pair exactly once.
- Physical RGB mapping is now R1 R/G/B=13/14/25 and R2=16/17/26, as requested.
  LED-only GPIO25/26 remains the default, with the same ON/OFF behaviour.
- Firmware, README and the latest changelog agree on v1.1.0. LCD instructions,
  Serial help, contributor guidance and current wiring/flow guides agree.

## Native checks

The existing pure core and real-firmware integration suites remain active.
New expectations were observed failing against the original code before the
implementation. Three added integration cases exercise complete ordered colour
cycles and 499/500 ms boundaries on both targets, purple aliases, and gameplay
outputs including purple hints on both answer stages, error restoration,
R1 green retention, clock/scoring and NVS isolation. Existing literal-wiring
and hint-colour cases were updated for the user's changed requirements.

| Runner flags (`python tests/run_tests.py`) | Pure core/application/view | Firmware integration |
|---|---|---|
| no flags (Arduino tabs) | 11/11 passed | 66/66 passed |
| --rgb | 11/11 passed | 66/66 passed |
| --entrypoint src/main.cpp | 11/11 passed | 66/66 passed |
| --entrypoint src/main.cpp --rgb | 11/11 passed | 66/66 passed |
| --separate-modules | 11/11 passed | 66/66 passed |
| --separate-modules --rgb | 11/11 passed | 66/66 passed |

Each runner also passed the six release-checker regressions and firmware/README/
changelog consistency. `python tools/check_version.py --previous-version v1.0.0`
passes. C++11 warnings-as-errors, AddressSanitizer and UBSan remain enabled;
LeakSanitizer remains disabled in this managed runtime. `git diff --check` passes.

## ESP32 compilation

`pio run -e esp32dev -e esp32dev-rgb -j 4` completed with exit code 0.
Both environments SUCCESS; the compile log contains no compiler warnings/errors.

| Environment | Static RAM | Flash |
|---|---:|---:|
| esp32dev | 22,812 / 327,680 | 338,641 / 1,310,720 |
| esp32dev-rgb | 22,812 / 327,680 | 338,693 / 1,310,720 |

PlatformIO Core 6.1.18, Espressif32 6.12.0, Arduino ESP32 2.0.17,
MFRC522 1.4.12 and hd44780 1.3.2. Toolchains and libraries were installed into
an isolated temporary cache. An initial SCons package download failed checksum
validation; PlatformIO retried another mirror and installed the validated package.
Checksum validation was not disabled. This dependency-download retry was resolved
before the successful builds above; no unresolved firmware/test failure remains.

## Preserved contracts and physical checks

The question bank, persisted UID/NVS format, shape IDs, RFID/button/LCD pins,
setup/loop and PlatformIO environment definitions are unchanged. The RGB map
is the explicit user-requested wiring change. No blocking delay was introduced.

No USB upload or physical ESP32, RFID, LCD, button or RGB LED test was performed
here. Native GPIO assertions and successful cross-compilation cannot establish
the colour or wiring on the user's board. After pulling, Build/Upload
esp32dev-rgb, confirm `GeoDecoder v1.1.0 | ESP32 | env=esp32dev-rgb` with
`version`, and use `pins` to check the new reader mapping. Test fixed colours
and both hint stages on the installed hardware.

The previous release's verification is preserved in
[the v1.0.0 archive](docs/archive/VERIFICATION_2026-10-25-version-1.0.0.md).
