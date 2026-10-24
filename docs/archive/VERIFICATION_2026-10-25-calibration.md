# GeoDecoder verification - component calibration, 25 October 2026

Firmware baseline main: `797a21f01ebcd47966aef5316aa813f2834e9347`.
Publication baseline main: `2a49dcdbdf7f0fe82df632f2f8712618aa41aef5`.
Local working branch: `codex/component-calibration`; publication target: `main`,
explicitly requested by the user. The baseline includes the latest harmonised
question bank and bulk Serial unassign commands.
Main advanced with an assets/documentation-only update during this task. Its
latest PDFs, removed old previews and documentation were retained; the firmware
and tests did not change. Both new changelog entries were preserved.

## Behaviour

- R1Red/Green/Blue/Yellow/Cyan/Magenta/White/Off and matching R2 commands
  select persistent colours on one target, with the other target OFF.
- R1RGB/R2RGB select seven random non-OFF colours, changing every 500 ms
  without consecutive duplicates. test/led/target/random uses the same mode;
  omitted target means both. Colours are logged for physical comparison.
- ButtonTest/NEXTTest/HINTTest select the existing isolated button watch.
  Short presses are reported once at stable release below 1,000 ms; long
  presses once at or above 1,000 ms while held, then the final release duration.
  Each button has independent short/long/total counts. Reset/switch clears them.
- Duration uses debounced states (40 ms). Held-on-entry buttons, including
  raw presses not yet sampled by the driver, require stable release before
  starting a gesture. Bounce does not arm them. Held-on-exit input remains
  suppressed until stable release before any fresh gameplay action.
- Timing uses unsigned millis differences and no delay/retry loop. Diagnostics
  keep owning outputs and block scoring, timer, enrolment and game buttons.
  Existing slash commands, cycle/blink, teacher tools and normal game button
  events remain compatible. Malformed/extra arguments do not start or change tests.

## Native simulation

| Runner flags (`python tests/run_tests.py`) | Pure core/application/view | Firmware integration |
|---|---|---|
| no flags (Arduino tabs) | 11/11 passed | 60/60 passed |
| `--rgb` | 11/11 passed | 60/60 passed |
| `--entrypoint src/main.cpp` | 11/11 passed | 60/60 passed |
| `--entrypoint src/main.cpp --rgb` | 11/11 passed | 60/60 passed |
| `--separate-modules` | 11/11 passed | 60/60 passed |
| `--separate-modules --rgb` | 11/11 passed | 60/60 passed |

All six maintained paths were freshly run. C++11 warnings-as-errors, ASan and
UBSan remain enabled; LeakSanitizer remains disabled for this managed runtime.
Tests use actual UART parsing, real debounce, output GPIO adapter, game loop
and application; only electrical/device I/O is simulated.

Eight new cases cover shortcut target/channel selection and persistence, all
seven random colours and 499/500 ms boundaries, random rollover/late ticks,
invalid shortcuts, 200/999 ms short durations, the exact 1,000 ms long threshold,
non-repeat and long release, independent/simultaneous buttons, status/reset,
stable/unsampled held-on-entry buttons, bounce and held-on-exit suppression.
Existing RFID, two-card scoring, LCD bank, bulk unassign and legacy NVS cases
remain active. The starting baseline passed 11/11 core and 52/52 integration.
Seven new feature cases first failed on unsupported commands. The added raw
held-on-entry regression then failed on a fabricated gesture before its fix.
Both red/green cycles were observed; all final cases pass.

Independent read-only code review found no Critical, Important or Minor issues.
The reviewer reran the actual PlatformIO entry in RGB mode: 11/11 pure and
60/60 integration passed. Physical tests, other ESP32 variants and the separate
asset update were outside that review; the final documentation merge was checked
separately and did not change firmware or tests.

## ESP32 compilation

Command: `pio run -e esp32dev -e esp32dev-rgb`, using an isolated build directory.
Exit code 0, both environments SUCCESS; no compiler warnings or errors.

| Environment | Static RAM | Flash |
|---|---:|---:|
| esp32dev | 22,812 / 327,680 | 338,005 / 1,310,720 |
| esp32dev-rgb | 22,812 / 327,680 | 338,061 / 1,310,720 |

PlatformIO Core 6.1.18, Espressif32 6.12.0, MFRC522 1.4.12, hd44780 1.3.2.

## Scope and physical checks

Serial help, README, command/component guides, architecture and changelog are
updated. Question bank, GPIO, ordinary-LED default, NVS ABI, saved registrations,
dependencies, pure domain/application and loop are unchanged. Publication uses
the actual baseline tree so binary assets from other work are retained.
`git diff --check` passes.

USB upload and physical ESP32/RFID/LCD/button/RGB tests were not performed.
Upload esp32dev-rgb, then send one command at a time: R1Red/Green/Blue/Yellow,
R1RGB, the matching R2 commands, ButtonTest, NEXTTest and HINTTest. Compare the
requested colour and GPIO labels with the hardware. Check a short tap, a hold
over one second and simultaneous buttons, then test/stop and stable release
before returning to normal play. The guides provide the full command list.

Previous bulk unassign verification is retained in
[the archive](docs/archive/VERIFICATION_2026-10-24-bulk-unassign.md).

