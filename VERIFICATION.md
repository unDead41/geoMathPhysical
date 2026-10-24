# GeoDecoder verification - 24 October 2026

## RGB game flow - codex/game-flow-rgb

Base main: `75d22f14ecc9b1ccd55b93c1f6964647834c54eb`.
Adds yellow hint/skip feedback and six-page RGB instructions. Existing
question text, score/time policy, GPIO and UID/NVS format are preserved.

| Check | Ordinary LEDs | Two RGB LEDs |
|---|---|---|
| Arduino-tab native suite | 30/30 passed | 30/30 passed |
| `src/main.cpp` native suite | 30/30 passed | 30/30 passed |
| ESP32 cross-compilation and firmware link | SUCCESS | SUCCESS |
| USB upload / physical RGB/LCD/RFID test | Not performed | Not performed |

The same four native commands below were run for this change. All use the
existing C++11 warnings-as-errors and Address/UndefinedBehavior sanitizers.
Before the colour implementation, the RGB suite produced the expected
failures for `hint_led_yellow_then_blue`,
`error_led_recovers_to_question_or_hint` and
`skip_led_yellow_until_next_question` (27/30 passed). All 30 cases then passed
for both entry points in both LED modes.

The added cases cover both reader roles, three invalid-answer types, error
recovery with/without a hint, exact notice boundaries, per-reader green
feedback, a 0/5 green completion, frozen final time, replay, idle/help,
teacher scanning/enrolment/timeout, LCD instruction bounds and unused GPIOs
in ordinary-LED mode. Native RGB checks use the default common-cathode setup.

`pio run -e esp32dev -e esp32dev-rgb` completed with both environments SUCCESS,
using the pinned platform/toolchain and library versions listed below.

| Current environment | Static RAM | Program flash |
|---|---:|---:|
| `esp32dev` | 22,652 / 327,680 bytes (6.9%) | 329,157 / 1,310,720 bytes (25.1%) |
| `esp32dev-rgb` | 22,652 / 327,680 bytes (6.9%) | 329,153 / 1,310,720 bytes (25.1%) |

The ordinary-LED environment remains the default. After the unfinished RGB
wiring is ready, build/upload `esp32dev-rgb` and physically check yellow
(R+G), the selected reader, hint/skip distinction on the LCD and the final
score/time. See [the step-by-step guide](docs/GAME_FLOW_RGB.md).

Source: the user-supplied `Geo-Decoder Board.zip`. This import adds VS Code /
PlatformIO support; the original quiz rules, question bank, wiring, persisted
shape IDs and NVS storage format remain intact.

## Results for the imported repository

| Check | Ordinary LEDs | Two RGB LEDs |
|---|---|---|
| Original Arduino-tab native suite | 22/22 passed | 22/22 passed |
| Final `src/main.cpp` native suite | 22/22 passed | 22/22 passed |
| ESP32 cross-compilation and firmware link | SUCCESS | SUCCESS |
| Local COM override configuration | PASS | PASS |
| USB upload / physical device | Not performed | Not performed |

Native verification commands (Linux, Python 3 and G++):

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
```

The final entry-point runs use C++11, `-Wall -Wextra -Werror -pedantic`,
AddressSanitizer and UndefinedBehaviorSanitizer. The same 22 existing behavioural
cases exercise the real firmware with simulated electrical/device I/O.
No separate copy of quiz logic was introduced.

ESP32 build command:

```text
pio run -e esp32dev -e esp32dev-rgb
```

Build environment: PlatformIO Core 6.1.18; Espressif 32 platform 6.12.0;
Arduino-ESP32 2.0.17 (`framework-arduinoespressif32` package
3.20017.241212+sha.dcc1105b); MFRC522 1.4.12; hd44780 1.3.2;
Xtensa ESP32 GCC 8.4.0+2021r2-patch5. These builds target classic ESP32/WROOM-32
with 4 MB flash.

| Environment | Static RAM | Program flash |
|---|---:|---:|
| `esp32dev` | 22,652 / 327,680 bytes (6.9%) | 329,141 / 1,310,720 bytes (25.1%) |
| `esp32dev-rgb` | 22,652 / 327,680 bytes (6.9%) | 329,157 / 1,310,720 bytes (25.1%) |

The first cross-build exposed a missing `Wire.h` include path. The framework
contained Wire and Preferences, but the dependency finder did not discover
them through the shared tabs outside `src/`. `src/main.cpp` now declares the
library includes directly; the final dependency graphs include Wire,
Preferences and SPI, and both complete firmware builds succeed. Keep those
explicit includes when maintaining the shared entry point.

The per-computer configuration check copied `platformio.local.ini.example`
into a temporary project: both environments resolved upload/monitor to COM5
while retaining 115200 baud and their inherited firmware settings. COM5 is an
example and must be replaced with the user's real port.

## Coverage and preserved data

The maintained behavioural suite covers: all 15 question and hint displays;
five-shape rounds without repeated IDs; six help pages; hint toggle and time;
single-card scoring; wrong reader/shape; skip +0; pending-notice button presses;
held-card removal; automatic final result; frozen final time; replay reset;
physical-button debounce/hold; LED routing; millis rollover; durations beyond
one hour; NVS reload; and active-type filtering.

Namespace `geomath_q2`, key `registry`, magic 0x474D5132, storage version 1,
`RegistryData` layout and existing `Shape` values are unchanged. Ordinary LED
mode remains the default; `esp32dev-rgb` enables the six RGB GPIO channels.
A normal firmware upload preserves the NVS region under the default partition
layout. Full-flash erase removes the enrolled cards; a previous custom partition
layout requires separate checking before upload.

## Physical checks still required

1. Upload through VS Code / PlatformIO to the actual classic ESP32.
2. Run `status`, `tags` and `current`; confirm both readers are READY.
3. Use `check uid 1` / `check uid 2` with the actual solid/net cards.
4. Confirm the LCD is readable, both buttons have correct polarity, and only
   the requested reader LED is active; check RGB colours if using RGB.
5. Play a complete round, including a hint, wrong answer and skipped question.
6. Confirm the final score/time and that final time stays fixed.
7. Reset the ESP32 and confirm enrolled cards and active types are retained.

The successful build does not establish antenna reliability, electrical
safety, LCD contrast, correct USB drivers or working physical wiring.

## Earlier package notes

The original verification record is retained in
`docs/archive/VERIFICATION_2026-10-16.md`. Other supplied design/plan/validation
files are labelled historical where they describe earlier question counts or
interaction rules. `tests/core_test.cpp`, `tests/integration_test.cpp` and
`tests/stubs/` are historical; `tests/run_tests.py` is the current suite.
