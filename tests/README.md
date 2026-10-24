# Current firmware tests

Run the maintained native suite from the repository root:

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
```

The first pair includes the Arduino tabs directly; the second pair exercises
the PlatformIO entry point. Each run executes the same 22 behavioural cases
with fake electrical/device I/O. Requires Python 3 and G++ with AddressSanitizer
and UndefinedBehaviorSanitizer support (the supplied commands target Linux).
On a Windows setup without a compatible G++, use the PlatformIO firmware build
and physical checks in `README.md`; do not interpret a missing G++ as an ESP32
firmware failure.

`behaviour.cpp`, `expected_displays.h`, `fakes/` and `run_tests.py` are current.
The supplied `core_test.cpp`, `integration_test.cpp` and `stubs/` document
earlier versions with different question/interaction rules. They are kept
from the input ZIP for history and are not run by the maintained suite.

Simulation does not replace an ESP32 compile, USB upload or physical RFID/LCD
test. Latest results: `../VERIFICATION.md`.
