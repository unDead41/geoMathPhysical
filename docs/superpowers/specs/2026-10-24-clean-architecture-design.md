# GeoDecoder clean architecture

The user approved cleaning the existing firmware and publishing directly to
`main`. This is a behaviour-preserving refactor of upstream `75d22f1`.

Use a lightweight C++11 core with no heap allocation, framework or extra library.
Keep the Arduino tabs as thin integration modules and `src/main.cpp` as the
PlatformIO composition root. Extract the state machine, UID rules and persisted
types into hardware-independent headers. Inject time, randomness, logging,
storage and reader control through small function-pointer ports. The application
owns mutable state and exposes const views. Render LCD frames from snapshots;
the LCD driver only writes changed rows. Wire input events in the composition
root so RFID/button drivers do not reference game state.

An all-at-once move to a new framework or separate firmware tree would add build
and cross-chat migration work without improving these boundaries. Merely moving
the old globals between folders would leave the coupling intact. The selected
approach keeps the existing file entry points while enforcing real boundaries.

Preserve all GPIOs, normal LED default, RGB opt-in, 15 question IDs and text,
scoring, notices, timer behaviour, removal/debounce rules, serial commands and
NVS ABI (`geomath_q2/registry`, magic `0x474D5132`, version `1`, Shape IDs 0..4).
No new gameplay is part of this change. Physical upload is outside this runtime.

Prove the core and view compile without Arduino; retain the existing behavioural
suite; compile tabs both together and separately to expose hidden dependencies;
build both ESP32 LED environments. Before publishing, compare against the latest
remote head and use an expected-SHA, non-forced update of `main`.
