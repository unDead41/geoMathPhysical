# GeoDecoder v1.0.0 verification - 25 October 2026

Initial inspected main: `2a49dcdbdf7f0fe82df632f2f8712618aa41aef5`.
Final publication baseline: `22b3aed3617b16fc04dcc6d51447cd6166f50e3e`.
Target: `main`. Main's concurrent RGB/button calibration update was retained
before final checks; its question bank, assets, GPIO, NVS and tests are included.

## Version identity and future reference

- `main/firmware_version.h` is the sole runtime numeric version source.
- Startup, read-only `version` and `status` show `GeoDecoder v1.0.0`, ESP32
  and the compiled `esp32dev` or `esp32dev-rgb` configuration.
- Queries work during the R2/hint stage and component diagnostics. Invalid
  extra arguments are rejected; queries preserve quiz/application snapshots,
  clock, selected reader, output GPIO and saved RFID registrations.
- README's current-version marker and the first numbered changelog entry match.
  The standard-library checker rejects disagreement and malformed/zero-padded
  versions, and can require a numeric increase from the previous main version.
- `docs/SOR_VERSIONING.md` records PATCH/MINOR/MAJOR rules, every published main
  update, branch collisions, reporting, source/board matching and validation.
  AGENTS.md requires reading it before updates. The maintained runner calls the
  version checker before firmware tests. This does not claim a Git tag exists.

## Native checks

All six paths below were run on the final combined source. Each runner also
passed the release consistency check and all six release-checker regression cases.

| Runner flags (`python tests/run_tests.py`) | Pure core/application/view | Firmware integration |
|---|---|---|
| no flags (Arduino tabs) | 11/11 passed | 63/63 passed |
| `--rgb` | 11/11 passed | 63/63 passed |
| `--entrypoint src/main.cpp` | 11/11 passed | 63/63 passed |
| `--entrypoint src/main.cpp --rgb` | 11/11 passed | 63/63 passed |
| `--separate-modules` | 11/11 passed | 63/63 passed |
| `--separate-modules --rgb` | 11/11 passed | 63/63 passed |

Three new firmware cases exercise real startup/status output, UART routing
while a game is active, and diagnostic/invalid-input isolation. They first
failed with the expected missing firmware identity; all original 52 integration
cases on the initial baseline still passed. The incoming main added eight
calibration cases, yielding 60 existing plus three version cases at publication.
The first separate-module check exposed a missing diagnostic declaration in
the new test header; adding its own public header resolved it. Final checks
above compile all modules independently and pass with warnings as errors.

Six checker cases run the real Python CLI in temporary repositories: matching
versions, README mismatch, latest changelog mismatch, malformed/zero-padded
versions, non-increasing versions and numeric multi-digit ordering. They were
observed failing before the checker existed and pass after implementation.

C++11, `-Wall -Wextra -Werror -pedantic`, AddressSanitizer and UBSan remain.
LeakSanitizer remains disabled for this managed runtime. `git diff --check`
and `python tools/check_version.py` pass.

## ESP32 compilation

`pio run -e esp32dev -e esp32dev-rgb` completed with exit code 0. Both firmware
environments SUCCESS, no compiler warnings/errors. Outputs were isolated in
this task's own checkout; libraries came from the pinned local cache.

| Environment | Static RAM | Flash |
|---|---:|---:|
| esp32dev | 22,812 / 327,680 | 338,245 / 1,310,720 |
| esp32dev-rgb | 22,812 / 327,680 | 338,281 / 1,310,720 |

PlatformIO Core 6.1.18, Espressif32 6.12.0, MFRC522 1.4.12 and hd44780 1.3.2.
The version feature adds no runtime dependency and does not change game rules,
question selection, pin mapping, saved card format or the ordinary-LED default.

## USB and physical checks

No USB upload or physical ESP32/RFID/LCD/button/RGB test was performed here.
After pulling this release, Build and Upload the correct environment. In the
115200-baud Monitor, type `version` and compare with README at that source
commit. Reset the board to see the startup line again if desired.
Git pull alone does not update the firmware already on the board.

Earlier calibration evidence is preserved in
[the archive](docs/archive/VERIFICATION_2026-10-25-calibration.md).
