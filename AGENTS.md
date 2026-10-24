# GeoDecoder contributor guidance

- Read `README.md`, `SAMBUNGAN.md`, `COMMANDS.md` and `VERIFICATION.md` before editing firmware.
- Firmware source lives in `main/`. `src/main.cpp` is the PlatformIO entry point and includes the same tabs. Keep a single source of application logic.
- Target: classic ESP32/WROOM-32 (`esp32dev`). Do not silently retarget C3/S3, change GPIO assignments, or enable RGB in the ordinary-LED environment.
- Preserve persisted `Shape` IDs, `RegistryData`, namespace `geomath_q2`, registry key, magic and storage version unless implementing an explicit migration.
- LCD is 20x4. A question/hint body has three ASCII rows, each at most 20 characters. R1 expects solid cards; R2 expects net cards.
- Current bank: 15 questions, three per shape, up to five unique questions per round. For all five active shapes, one question per shape. Runtime `main/question_bank.h` is authoritative.
- Reuse the existing tests for firmware changes. Exercise the actual PlatformIO entry with `python tests/run_tests.py --entrypoint src/main.cpp` and add `--rgb` for RGB changes. Build affected environments with `pio run -e esp32dev` / `pio run -e esp32dev-rgb` when the toolchain is available. Documentation-only changes do not require rerunning firmware tests.
- The active suite is `tests/behaviour.cpp` via `tests/run_tests.py`. `tests/core_test.cpp`, `tests/integration_test.cpp`, `tests/stubs/`, `VALIDATION.md` and the original design/plan/progress notes are historical files from earlier revisions and are not the current test contract.
- Distinguish native simulation, ESP32 compile, USB upload and physical tests in reports. Do not claim hardware was tested from a native PASS or successful build.
- Avoid full-flash erase during routine upload: it removes enrolled cards. Never commit real card UID lists, credentials, local COM settings, toolchains or `.pio/` build outputs.
