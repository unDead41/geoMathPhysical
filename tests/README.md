# Current firmware tests

Run from the repository root with Python 3 and G++:

The published PlatformIO project exposes one RGB environment and `pio run`
builds it directly. Runs below without `--rgb` exercise retained developer-only
ordinary-LED compatibility; they do not add a second user environment.

```text
python tests/run_domain_tests.py
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
python tools/check_version.py
python tests/test_version_check.py
```

The pure runner compiles and links the real domain, LCD view and four application
tabs using only standard C++11 headers. It supplies typed application ports and
executes 12 cases: two-card scoring/routing/final freeze, every blink half-step
and both skip stages, role/error/hint colours, hint/pause/resume, rollover/reset,
invalid rounds, UID values, registry validation, filtered/random rounds,
immutable LCD snapshots, and an application driven entirely by ports.

Each firmware runner first checks release agreement and six checker regressions,
runs those 12 core cases, then executes 68 behavioural
cases with fake electrical/device I/O. Flow regressions drive real input adapters
for pre-positioned R2, both held cards across questions, short/late/held buttons,
all 900 blink samples, stopwatch resumption, stage arming, hint colours and
menu/result cadence. Existing storage, Serial, 15 LCD-copy and debounce checks
remain, with old single-card expectations replaced by the approved two-card rule.
The literal pre-refactor NVS image still protects all 120 bytes and reader roles.

`--entrypoint` tests the actual `src/main.cpp` used by PlatformIO.
`--separate-modules` compiles every `main/*.ino` independently and links the
same behavioural harness, catching missing declarations and reliance on tab
include order. These two switches are mutually exclusive.

All maintained builds use C++11, `-Wall -Wextra -Werror -pedantic`,
AddressSanitizer and UndefinedBehaviorSanitizer. LeakSanitizer is disabled for
the managed runtime. Tests target Linux/G++; Windows users without compatible
G++ can use the PlatformIO firmware build and physical steps in `README.md`.

The legacy behavioural suite injects synthetic states through test-only utility
casts of const snapshots; production adapters only read const state. New pure
engine tests use the public engine API. All card UIDs in tests are synthetic.

Current: `domain.cpp`, `behaviour.cpp`, `expected_displays.h`, `fakes/` and
the two runners. Original `core_test.cpp`, `integration_test.cpp` and `stubs/`
are historical fixtures from the supplied ZIP, not the active test contract.

Simulation does not replace ESP32 cross-compilation, USB upload or physical
RFID/LCD checks. Latest actual results: `../VERIFICATION.md`.


The physical-wiring case drives every OFF/primary/combined colour through the
real output adapter, checks the user's literal R1=13/14/25 and R2=16/17/26
R/G/B pin wiring, and verifies the Serial `pins` guide. Ordinary mode checks
that only the original GPIO25/26 outputs change for every logical colour.

`component_behaviour.h` adds nine actual-UART/adapter regressions: command help
and routing, LED output ownership/timing, selected RFID reads and refreshed
connection failures/recovery, button debounce/watch/counts, held-button exit,
invalid paths/extra arguments and command gating, test switching and rollover.
The fake MFRC522 exposes per-reader VersionReg values only at the electrical
boundary so the real probe path can be exercised. No component test writes NVS
or scores a quiz. Every existing game regression remains active.

`calibration_behaviour.h` adds thirteen UART/adapter cases for simple per-reader
colour shortcuts, seven-colour random output and 500 ms boundaries, random
rollover/delayed ticks, malformed shortcuts, short-press durations (200/999 ms),
the exact 1,000 ms long threshold and non-repeat, independent/simultaneous
buttons, reset/status, stable and unsampled held-on-entry buttons, release
bounce and held-on-exit suppression. Both LED modes exercise the same commands;
the existing cycle, blink, RFID and gameplay regressions remain active.

`unassign_behaviour.h` adds six cases for pair/all deletion through real Serial
commands: all five BM/English shape names plus the `kubu` alias, actual UART
case/whitespace handling, persistence across reload, unchanged active selection
and unrelated NVS, idempotent clearing/re-enrolment, failed/short/unavailable
storage, invalid extra arguments, legacy per-reader syntax, cancellation of
capture/inspection and one complete storage commit per request. A first-write-only
adapter catches implementations that commit one slot at a time. Diagnostic command
gates also cover the new destructive commands.

`version_behaviour.h` exercises the actual boot/status identity, case-insensitive
UART `version` during an active R2 hint, and version/status lookups during LED
diagnostics. It checks that the query and rejected extra arguments preserve
quiz/application state, clock, GPIO output, reader mode and saved RFID mappings.
The identity test accepts future numeric versions and checks the compiled LED
environment; release agreement is checked separately against the header/docs.

`test_version_check.py` runs the real release checker in temporary repositories:
matching values, README/changelog disagreements, malformed/zero-padded versions,
non-increasing releases and numeric ordering across multi-digit components.


The complete-cycle case checks two full R1RGB/R2RGB cycles plus wraparound,
every physical channel and each 499/500 ms boundary. Purple aliases and
gameplay outputs use the swapped literal wiring. Gameplay tests cover purple
on both hint stages, green R1 retention, red wrong-answer notices, purple
restoration, blue on close, unchanged scoring, running time and untouched NVS.

Calculated-random regressions use a fixed injected sampler to check bounded
selection and reachability of all seven colours without Arduino. Firmware
cases check different R1/R2 colours and no per-reader repeats over 32 seeds
in menu, instructions, summary and both all-target random command forms.
They also verify literal GPIO outputs, cadence edges, per-reader Serial logs,
rollover, delayed updates and preserved stopwatch/score/NVS.
