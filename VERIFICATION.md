# GeoDecoder verification - two-card flow, 24 October 2026

Working branch: `codex/game-flow-rgb`. Main was read at
`66bf7959ecbf98d46b98492adb8fe924e0108743`; the flow branch was read at
`b81862661e972cd3320c71fe88ef81ac08ff86e3`. It was one commit ahead and two
behind main. The two-card change is ported onto main's clean architecture;
main itself is not modified by this work. This report travels with the source
commit; its final SHA is recorded by Git history, not a self-referential file.

The earlier clean-architecture report is retained in
`docs/archive/VERIFICATION_2026-10-24-clean-architecture.md`.
Approved design/plan: `docs/superpowers/specs/2026-10-24-two-card-flow-design.md`
and `docs/superpowers/plans/2026-10-24-two-card-flow.md`.

## Native simulation

| Build path | Ordinary LEDs | RGB |
|---|---|---|
| Arduino tabs, one translation unit | 11/11 core + 36/36 behaviour PASS | 11/11 core + 36/36 behaviour PASS |
| Actual PlatformIO entry `src/main.cpp` | 11/11 core + 36/36 behaviour PASS | 11/11 core + 36/36 behaviour PASS |
| Every tab compiled independently | 11/11 core + 36/36 behaviour PASS | 11/11 core + 36/36 behaviour PASS |

Commands run from the repository root:

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
```

Each runner executes `python tests/run_domain_tests.py` first. The core/view/
application suite links real production code without Arduino headers or device
fakes. Firmware integration uses the real adapters with simulated electrical
I/O. Both use C++11, `-Wall -Wextra -Werror -pedantic`, ASan and UBSan;
LeakSanitizer is disabled for this managed runtime.

The initial baseline passed 9/9 core and 29/29 actual-entry RGB cases. New
regressions were observed failing for the old single-card award, old blink/clock
behaviour, missing yellow output, missing stage arming/header and ambient cycles
before the corresponding implementation. Old single-card expectations were
replaced deliberately, not retained as a competing runtime rule.

Coverage includes:

- R1 then R2 required even for questions whose old metadata selected R2.
- Wrong shape, wrong card role, unregistered UID and early R2 cannot score.
- R1 green remains while R2 is wrong or using a hint; errors restore blue or
  yellow after 1,200 ms. R1 success closes its hint without earning a point.
- A matching pair awards exactly one point; repeated scans are ignored.
- Skip at either stage gives zero, including after a correct R1.
- All 900 millisecond samples assert exactly three synchronous ON/OFF pulses,
  150 ms per half. Stopwatch remains constant for every sample and resumes on
  the next question; the last action freezes it before the final blink.
- R2 cards placed too early and both cards held into a following question
  require removal; they cannot automatically answer a new stage/question.
- Physical debounce, long holds, short presses and late presses during the
  transition do not skip/toggle/dismiss the next screen. New presses work after
  release. Logical scans/NEXT/HINT are also rejected during the transition.
- Menu/help colours hold for 999 ms and change at 1,000 ms; results hold for
  149 ms and change at 150 ms. These modes leave readers stopped, scores and
  registry unchanged, and the result time frozen.
- Results NEXT and menu NEXT reset score, stage, time and reader mode. Results
  HINT restores the slow menu cycle. Ordinary mode never drives G/B outputs.
- Existing random/filtered bank selection, 15 question/hint bodies, long time,
  millis rollover, teacher inspection/enrolment, NVS failure handling, duplicate
  registrations and literal legacy NVS byte-image checks remain passing.

## ESP32 cross-compilation

```text
pio run -e esp32dev -e esp32dev-rgb
```

| Environment | Result | Static RAM | Program flash |
|---|---|---:|---:|
| `esp32dev` (ordinary/default) | SUCCESS | 22,748 / 327,680 bytes (6.9%) | 330,537 / 1,310,720 bytes (25.2%) |
| `esp32dev-rgb` | SUCCESS | 22,748 / 327,680 bytes (6.9%) | 330,613 / 1,310,720 bytes (25.2%) |

Toolchain: PlatformIO Core 6.1.18, Espressif32 6.12.0, Arduino-ESP32 2.0.17,
Xtensa GCC 8.4.0+2021r2-patch5, MFRC522 1.4.12 and hd44780 1.3.2.
No production library or board setting was changed. These image sizes do not
measure physical runtime performance or peak stack consumption.

## Preserved contracts and identified problems

- `main/question_bank.h` is byte-for-byte identical to main: blob
  `0f3d12455ddd730d2b52009aee4e89a40080ea4c`. No content from the separate
  question editing branch is overwritten. Legacy `Question.reader` remains
  metadata only; the runtime stage chooses the active pad.
- GPIO/config, Shape IDs, `Uid` (11 bytes), `RegistryData` (120 bytes, tags
  offset 8), namespace `geomath_q2`, key `registry`, magic `0x474D5132` and
  storage version 1 are intact. Existing saved registrations remain compatible.
- `main/main.ino`, `loop()`, button/RFID/NVS drivers and PlatformIO defaults
  remain unchanged. No new delay or blocking state-machine wait was added.
- The old flow branch preceded the clean architecture. Porting its whole files
  would undo the module boundaries; its useful guidance/colours were adapted
  through current domain/application/view APIs instead.
- Old single-scan awards, reader selection from question metadata, 1,000 ms
  notices counting as play time, and static/off menu/result colours were all
  incompatible with the approved flow and have been replaced.
- No USB upload or physical-device tests were performed. Native PASS and ESP32
  build SUCCESS establish software behaviour and compilation, not antenna,
  supply, button polarity, physical colour or LCD/backpack operation.

## Final code review

An independent read-only review of the production diff, approved flow and
unchanged RFID/button drivers found no Critical, Important or Minor issue.
It checked stage/score gates, all transitions, fresh-card interlocks, late
button suppression and domain/application/view boundaries.

The review confirmed these intended boundaries: a card placed before the
three-empty-poll arming interval must be lifted/rescanned; explicit teacher
maintenance commands can interrupt gameplay; legacy question content/metadata
stays intact; physical RF reliability and pulse timing still require the real
board. Unsigned rollover arithmetic is correct on inspection; current rollover
regressions cover elapsed time, rather than a dedicated blink/ambient wrap test.

## Physical validation still required

1. Check out `codex/game-flow-rgb` in VS Code. Build and upload `esp32dev` while
   ordinary LEDs are installed; use `esp32dev-rgb` after RGB assembly is ready.
2. Confirm `status`, `tags`, `current` and `check uid 1/2` recognise saved UIDs.
3. Start with NEXT. Verify LCD R1, score 0, time 00:00, then wrong solid and hint.
4. Scan a correct solid: R1 green/R2 blue (ordinary: both ON), score still 0.
   Try wrong/unknown/early cards and hint; only the net stage should remain active.
5. Complete the pair: verify three short green pulses and frozen time during
   blinking. Hold both cards across the next question; lift/rescan each in turn.
6. Skip on R1 and R2 separately: zero marks, three red pulses, no clock increase.
   Press/hold/release NEXT/HINT during the pulses and confirm no carried input.
7. Complete/skip the last question: final time freezes on that action, three
   pulses finish, then score/percentage/time appear with fast RGB colour changes.
8. Check results NEXT reset and HINT menu return; verify slow menu colour changes
   and inactive scoring. Reset the board to confirm registrations reload.

Use regular Upload, not full-flash erase, to preserve registered UIDs.
