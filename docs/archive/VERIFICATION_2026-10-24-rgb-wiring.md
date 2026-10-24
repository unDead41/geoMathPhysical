# GeoDecoder verification - user RGB wiring, 24 October 2026

Working branch: `codex/game-flow-rgb`. Change based on verified branch commit
`9db9dfd17ac99d1e19a46db231ab4c675b06c948`. Main was read at
`66bf7959ecbf98d46b98492adb8fe924e0108743`; this change targets the work branch only.

## Requested and implemented wiring

| Output | Reader role | R | G | B |
|---|---|---:|---:|---:|
| RGB1 | R1 bongkah | GPIO16 | GPIO17 | GPIO26 |
| RGB2 | R2 bentangan | GPIO13 | GPIO14 | GPIO25 |

`RGB_PINS` is stored in R/G/B order. This explicitly requested mapping supersedes
that of the preceding flow revision. `LED_PINS` is now separate: ordinary mode
keeps R1=GPIO25 and R2=GPIO26. It must not obtain its pin from the RGB red channel.
`esp32dev` remains the default; select `esp32dev-rgb` for the RGB wiring above.
Common-cathode/common-anode configuration is unchanged.

Serial `pins`, the wiring guide and current user guides reflect the selected
mode. The quiz engine, two-card flow, stopwatch, bank, button/RFID wiring and
UID/NVS format have not changed in this revision.

## Native simulation

| Current verification path | Ordinary LEDs | RGB |
|---|---|---|
| Actual PlatformIO entry `src/main.cpp` | 11/11 core + 37/37 behaviour PASS | 11/11 core + 37/37 behaviour PASS |
| Every tab compiled independently | 11/11 core + 37/37 behaviour PASS | 11/11 core + 37/37 behaviour PASS |

```text
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
```

Every runner first executes `tests/run_domain_tests.py`, linking the real core,
view and application without Arduino or device fakes. Firmware integration uses
real adapters and simulated electrical I/O. C++11, `-Wall -Wextra -Werror
-pedantic`, ASan and UBSan are enabled; LeakSanitizer is disabled in this runtime.

The new physical-output regression was observed failing against the old wiring
before implementation. It drives OFF, red, green, blue, yellow, cyan, magenta
and white through the real adapter and checks literal physical GPIOs on both
readers, including isolation of the other reader. In ordinary mode it checks
that only the original GPIO25/26 outputs change for every logical colour.
It also exercises the real Serial `pins` command in each environment.

Existing stage-colour expectations were updated to the user's physical pins.
All two-card ordering, hints/errors, 900 ms blink/clock, held-card/button,
menu/result cadence, reset, teacher tools and legacy registry regressions remain
passing. No gameplay test was removed.

## ESP32 cross-compilation

```text
pio run -e esp32dev -e esp32dev-rgb
```

| Environment | Result | Static RAM | Program flash |
|---|---|---:|---:|
| `esp32dev` | SUCCESS | 22,748 / 327,680 bytes (6.9%) | 330,473 / 1,310,720 bytes (25.2%) |
| `esp32dev-rgb` | SUCCESS | 22,748 / 327,680 bytes (6.9%) | 330,617 / 1,310,720 bytes (25.2%) |

PlatformIO Core 6.1.18, Espressif32 6.12.0, Arduino-ESP32 2.0.17, Xtensa GCC
8.4.0+2021r2-patch5, MFRC522 1.4.12 and hd44780 1.3.2. No production dependency
or board target changed. These sizes are build results, not physical RAM tests.

## Problems addressed and physical validation

The prior RGB pins did not match the supplied wiring. Merely replacing the RGB
array would also move ordinary LEDs to GPIO16/13 because their driver used the
first RGB channel. Separating LED_PINS prevents that regression. Serial's old
ordinary-mode label, PIN R SAHAJA, was also replaced by the actual LED GPIO.

No outstanding software failure was found in the checks above. No USB upload or
physical-device test was performed. Select `esp32dev-rgb`, Build and Upload in
VS Code, then use `pins` to confirm 16/17/26 and 13/14/25 in R/G/B order. Check
actual red/green/blue/yellow colours and the R1 -> R2 gameplay sequence on the
board. Ordinary installations continue to use `esp32dev`. Avoid flash erase to
preserve enrolled UIDs.

The previous two-card flow report, including its independent review and full
six-configuration matrix, is retained in
`docs/archive/VERIFICATION_2026-10-24-two-card-flow.md`.
