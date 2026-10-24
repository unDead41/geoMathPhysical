# Current firmware tests

Run from the repository root with Python 3 and G++:

```text
python tests/run_domain_tests.py
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
```

The pure runner compiles and links the real domain, LCD view and four application
tabs using only standard C++11 headers. It supplies typed application ports and
executes 11 cases: two-card scoring/routing/final freeze, every blink half-step
and both skip stages, role/error/hint colours, hint/pause/resume, rollover/reset,
invalid rounds, UID values, registry validation, filtered/random rounds,
immutable LCD snapshots, and an application driven entirely by ports.

Each firmware runner first runs those 11 cases, then executes 36 behavioural
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

