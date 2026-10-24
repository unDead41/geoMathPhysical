# GeoDecoder verification - Serial component tests, 24 October 2026

Integration target: `main`, previously `66bf7959ecbf98d46b98492adb8fe924e0108743`.
Source branch: `testing/components` at
`36d999a9016cf0389005cede7567b654c462b03d`, incorporating the prior flow/RGB
commit `e457b0536987d35042da4d47337fea65a0ad5d77`. Comparison confirmed main is
an ancestor (source ahead 4, behind 0); no conflict or additional runtime change
was needed. Integration preserves testing/components and codex/game-flow-rgb.
The user explicitly authorized pushing the completed component work to main.
Checkout/upload guides now point to main. The complete native matrix and both
ESP32 builds below were rerun on the integration source before publication.

Design/plan and command contract:
`docs/superpowers/specs/2026-10-24-component-testing-design.md`,
`docs/superpowers/plans/2026-10-24-component-testing.md`, `docs/COMPONENT_TESTS.md`.

## Native simulation

| Firmware path | Ordinary | RGB |
|---|---|---|
| Arduino tabs, one translation unit | 11/11 core + 46/46 behaviour PASS | 11/11 core + 46/46 behaviour PASS |
| Actual src/main.cpp entry | 11/11 core + 46/46 behaviour PASS | 11/11 core + 46/46 behaviour PASS |
| Every tab compiled independently | 11/11 core + 46/46 behaviour PASS | 11/11 core + 46/46 behaviour PASS |

Commands run:

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
```

Each runner first builds/runs the pure core/view/application with no Arduino
headers or device fakes. Integration compiles the real firmware with electrical
I/O simulation. Both use C++11, -Wall -Wextra -Werror -pedantic, ASan and UBSan.
LeakSanitizer remains disabled in the managed runtime.

Nine added cases were observed failing on the pre-feature code, then passing:
real UART discovery/case/whitespace/path routing, LED ownership and 500/250 ms
cycle/blink boundaries, R1/R2/both UID scans including unregistered cards,
fresh version-register failures/recovery, raw/stable button changes and counts,
no carried button input at exit, malformed paths/extra arguments and legacy
command isolation, switching tests and millis rollover. A further red/green
check ensures `stop extra` cannot accidentally exit an active diagnostic.

Tests verify no score, no running quiz timer and no NVS writes; held cards and
held buttons do not flood the monitor. Persistent LED OFF is not overwritten
by menu colours. Existing 37 game, wiring, storage and Serial cases remain.

## ESP32 build

```text
pio run -e esp32dev -e esp32dev-rgb
```

| Environment | Result | Static RAM | Flash |
|---|---|---:|---:|
| esp32dev | SUCCESS | 22,772 / 327,680 (6.9%) | 335,729 / 1,310,720 (25.6%) |
| esp32dev-rgb | SUCCESS | 22,772 / 327,680 (6.9%) | 335,777 / 1,310,720 (25.6%) |

PlatformIO 6.1.18, Espressif32 6.12.0, Arduino-ESP32 2.0.17, Xtensa GCC
8.4.0+2021r2-patch5, MFRC522 1.4.12 and hd44780 1.3.2. No new production
library/board configuration or dynamic allocation was introduced by diagnostics.

## Preserved contracts / findings

- The existing game engine, pure application, bank, GPIO and NVS implementation
  are unchanged. main/question_bank.h remains blob
  `0f3d12455ddd730d2b52009aee4e89a40080ea4c`.
- Ordinary esp32dev stays default with GPIO25/26. RGB1 R/G/B=16/17/26 and RGB2
  =13/14/25. Reader/button wiring, common polarity and stored registrations stay.
- Composition setup/output functions gate diagnostics; loop() is unchanged.
- Diagnostic LED writes would otherwise be overwritten by menu output; explicit
  session output ownership prevents that. Raw presses at serial exit would
  otherwise become game presses; buttonsRequireRelease prevents that race.
- Paths are fully validated before session/hardware mutation. Normal game or
  enrolment commands are blocked until test/stop, except read-only inspection
  and the stop alias. Invalid stop arguments do not exit diagnostics.
- SPI VersionReg READY is a connection indication, not an antenna or UID test.
  test/rfid/check does not perform a full RF self-test/reinitialisation. Confirm
  UID scans and reset after wiring/power repair if needed.

## Independent final review

A read-only review of the full implementation, spec/plan, real adapters, Serial
routing and component regressions found no Critical, Important or Minor
finding. It confirmed input isolation, persistent output ownership, malformed
command rejection, release interlocks and cached/live RFID status distinctions.
The reviewer checked the source and existing passing evidence; it did not imply
physical testing or rerun the green suites. Physical wiring/colour/RF, upload and
reconnect recovery beyond the documented probe still require the actual board.

## Physical verification pending

No USB upload or physical hardware testing was performed. The diagnostics are
implemented to make those tests easy, but native PASS and build SUCCESS do not
establish physical operation or colour correctness.

1. Update main, then Build/Upload the matching environment in VS Code.
2. Open Monitor at 115200 baud; send test/help and pins.
3. Use test/rfid/check then test/rfid/r1, /r2, /all; scan/lift registered and
   unregistered cards and verify each printed UID/reader on the real board.
4. Use test/led/r1/red, /green, /blue and repeat for r2. Check yellow/cycle/blink/
   off; compare physical colours to the Serial label. Verify reader isolation.
5. Use test/button/all; press/hold/release both buttons. Check raw level, stable
   transitions and one count per press. Game/menu actions must not occur.
6. Hold a button while exiting with test/stop; release before starting a game.
   Use play or NEXT and confirm normal game and enrolled cards still work.

Avoid full-flash erase. Previous wiring evidence is retained in
`docs/archive/VERIFICATION_2026-10-24-rgb-wiring.md`.
