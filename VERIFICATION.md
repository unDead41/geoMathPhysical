# GeoDecoder verification - bulk Serial unassign, 24 October 2026

Baseline main: `d241ea5683c2af24d418af468cff3cdf394226ba`.
Working branch: `codex/serial-unassign`.

## Behaviour

- `unassign all` clears all ten R1/R2 tag slots, including inactive shapes.
- `unassign kubus`, `piramid`, `silinder`, `kon` or `kuboid` (one shape per
  command) clears that shape's pair. Existing English names work; `kubu`
  is an additional alias for kubus in this command.
- Existing `unassign r1/r2 <shape>` syntax still clears one slot only.
- The application prepares a complete candidate and commits it once before
  accepting RAM or cancelling a round/capture. Failed, short or unavailable
  storage leaves the accepted registry and application mode unchanged.
- Active selection, NVS namespace/key/version/ABI and unrelated settings remain.
  Successful deletion returns to the menu and discards the old round. Missing
  active pairs must be registered again or replaced using `use` before play.
- Malformed/extra arguments do not mutate state. Component diagnostics block
  the new commands until `test/stop`.

## Native checks

| Runner flags (`python tests/run_tests.py`) | Pure core/application/view | Firmware integration |
|---|---|---|
| no flags (Arduino tabs) | 11/11 passed | 52/52 passed |
| `--rgb` | 11/11 passed | 52/52 passed |
| `--entrypoint src/main.cpp` | 11/11 passed | 52/52 passed |
| `--entrypoint src/main.cpp --rgb` | 11/11 passed | 52/52 passed |
| `--separate-modules` | 11/11 passed | 52/52 passed |
| `--separate-modules --rgb` | 11/11 passed | 52/52 passed |

C++11, warnings as errors, ASan and UBSan remain enabled. The six added cases
exercise actual Serial/application behaviour: all BM/English names, the kubu
alias, case/whitespace through UART, selected versus all slots, reload from
NVS, unrelated settings, unchanged active mask, idempotence/re-enrolment,
storage failures, invalid arguments, legacy syntax and capture cancellation.
A first-write-only storage adapter catches slot-by-slot partial commits.
Existing diagnostic isolation now covers pair/all and legacy unassign commands.

The baseline passed 11/11 core and 46/46 integration cases. Before implementation,
five new feature cases failed because the commands were unsupported; the legacy
and invalid-input case passed. All six new cases pass after implementation.

## ESP32 compilation

Final clean build: `pio run -e esp32dev -e esp32dev-rgb`, with an isolated
build directory and locally cached pinned libraries. Exit code 0; both SUCCESS.

| Environment | Static RAM | Flash |
|---|---:|---:|
| esp32dev | 22,772 / 327,680 | 336,477 / 1,310,720 |
| esp32dev-rgb | 22,772 / 327,680 | 336,525 / 1,310,720 |

PlatformIO Core 6.1.18, Espressif32 6.12.0, MFRC522 1.4.12 and hd44780 1.3.2.
An earlier overlapping build encountered an invalid ELF header while both
processes shared temporary outputs. The processes ended; the isolated build
above passed with unchanged firmware source.

## Scope and remaining physical checks

Serial help, COMMANDS.md, README.md, tests documentation and changelog are updated.
No question-bank, scoring, RGB wiring, LCD layout, storage ABI or dependency
change was made. Single-source PlatformIO/Arduino and hardware-free application
boundaries are preserved. `git diff --check` passes.

USB upload and physical ESP32/RFID/LCD/button/RGB tests were not performed.
After uploading this branch, register test cards, run a pair/all removal, use
`tags`, reboot and verify the chosen slots remain empty before re-enrolling.

Previous LCD bank/build evidence is retained in
[the archive](docs/archive/VERIFICATION_2026-10-24-harmonised-lcd.md).
