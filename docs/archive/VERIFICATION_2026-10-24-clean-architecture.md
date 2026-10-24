# GeoDecoder verification - clean architecture, 24 October 2026

Baseline: `main` commit `75d22f14ecc9b1ccd55b93c1f6964647834c54eb`.
The original import report is retained in
`docs/archive/VERIFICATION_2026-10-24-import.md`.

## Native verification

| Mode | LED biasa | RGB |
|---|---|---|
| Arduino tabs in one translation unit | 29/29 passed | 29/29 passed |
| Actual PlatformIO `src/main.cpp` entry | 29/29 passed | 29/29 passed |
| Each tab compiled independently | 29/29 passed | 29/29 passed |

Every maintained firmware runner also builds/runs 9/9 pure core/application/view
cases with no Arduino headers, target defines or device fakes. It links the
real application tabs and drives them through typed ports. C++11,
`-Wall -Wextra -Werror -pedantic`, ASan and UBSan are enabled.

Commands:

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
```

The original 22 regression cases passed in both LED modes before refactoring.
Seven added cases cover failed/partial/unavailable NVS, duplicate UID, corrupt stored
version, command pause/resume, oversized command recovery and a literal
pre-refactor 120-byte registry image. Existing regressions cover all 15 LCD
question/hint displays, single-scan scoring, wrong reader/shape, hints and skips,
notices, held-card removal, physical debounce/late presses, final-time freeze,
millis rollover, long durations, per-reader LEDs and filtered round selection.

## ESP32 builds

Command:

```text
pio run -e esp32dev -e esp32dev-rgb
```

| Environment | Cross-compile/link | Static RAM | Program flash |
|---|---|---:|---:|
| `esp32dev` | SUCCESS | 22,732 / 327,680 bytes (6.9%) | 329,929 / 1,310,720 bytes (25.2%) |
| `esp32dev-rgb` | SUCCESS | 22,732 / 327,680 bytes (6.9%) | 329,945 / 1,310,720 bytes (25.2%) |

Compared with the verified import, each mode uses 80 additional static RAM bytes
and 788 additional program bytes. The new core/ports introduce no heap
allocation or production dependency. These are compile-time image sizes, not
measurements of physical runtime performance or peak stack usage.

Toolchain: PlatformIO Core 6.1.18, Espressif32 6.12.0,
Arduino-ESP32 2.0.17, Xtensa GCC 8.4.0+2021r2-patch5,
MFRC522 1.4.12 and hd44780 1.3.2. Classic ESP32/WROOM-32, 4 MB flash.

## Preserved contracts

- The 15 question IDs, answer types, reader roles, text and hint text are intact.
- GPIO assignments, ordinary LED default and optional RGB wiring are intact.
- NVS namespace `geomath_q2`, key `registry`, magic `0x474D5132`, version `1`.
- Shape IDs 0..4 / NONE=255; `Uid` 11 bytes, `RegistryData` 120 bytes,
  `tags` offset 8. Compile-time checks and a legacy byte-image test protect this.
- Failed writes leave the accepted RAM mapping unchanged.
- One firmware implementation serves the PlatformIO entry and sketch tabs.

Architecture/API migration guidance: `docs/ARCHITECTURE.md`.
No USB upload or physical-device test was performed in this environment.

## Code review

Independent read-only review found no blocking production issue. Two test gaps
were addressed: recovery after an oversized command now uses the actual UART
input path, and NVS tests now exercise a short positive write as well as a zero
return. Temporary mutation checks confirmed each regression test detects its
corresponding broken implementation; the working source was unchanged by those
checks. The complete final native matrix then passed again.

## Physical checks

1. Pull current main, Build and Upload the matching environment in VS Code.
2. Confirm `status`, `tags` and `current` show the enrolled cards and ready readers.
3. Test each reader, both buttons, LCD and per-reader LED indication.
4. Complete a round including wrong answer, hint and skip; confirm score/time.
5. Keep the last result open and confirm its time remains fixed.
6. Reset the board and confirm stored registrations and active types reload.

Avoid full-flash erase when preserving enrolled cards.
