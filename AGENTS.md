# GeoDecoder contributor guidance

- Read `README.md`, `docs/ARCHITECTURE.md`, `SAMBUNGAN.md`, `COMMANDS.md` and `VERIFICATION.md` before editing firmware.
- Component tests: read `docs/COMPONENT_TESTS.md` before changing Serial diagnostics. Keep the controller outside pure domain/application, preserve nonblocking output ownership and suppress game actions during tests.
- Active flow: `docs/GAME_FLOW_RGB.md`. Every question requires R1 solid then matching R2 net; only the pair earns +1. Use the runtime answer stage, not legacy `Question.reader`, to select the pad. Pause the clock during the three 150 ms ON/OFF blink cycles.
- Firmware source lives in `main/`. `src/main.cpp` is the PlatformIO entry point and includes the same tabs. Keep a single source of application logic.
- Keep domain and application hardware-independent. Application time/RNG/logging/storage/reader control goes through `AppPorts`, bound once in setup. RFID/buttons emit `InputEvents`; LCD accepts a `LcdFrame`. `config.h` contains board settings only.
- Mutable state is owned by its module. Read `appState()`, `quizState()` and `registryState()` as const; use application actions for mutations. Do not restore mutable extern globals or introduce production `const_cast`.
- LED wiring: ordinary LED_PINS stays R1=25/R2=26; user-authorized RGB_PINS (R/G/B) is R1=16/17/26, R2=13/14/25. Keep these configurations separate.
- Target: classic ESP32/WROOM-32 (`esp32dev`). Do not silently retarget C3/S3, change GPIO assignments, or enable RGB in the ordinary-LED environment.
- Preserve persisted `Shape` IDs, `RegistryData`, namespace `geomath_q2`, registry key, magic and storage version unless implementing an explicit migration.
- LCD is 20x4. A question/hint body has three ASCII rows, each at most 20 characters. R1 expects solid cards; R2 expects net cards.
- Current bank: 15 questions, three per shape, up to five unique questions per round. For all five active shapes, one question per shape. Runtime `main/question_bank.h` is authoritative.
- The pure suite `python tests/run_domain_tests.py` compiles the real core/application/view without Arduino headers or device fakes. Keep that boundary intact.
- Reuse the existing tests for firmware changes. Exercise the actual PlatformIO entry with `python tests/run_tests.py --entrypoint src/main.cpp` and add `--rgb` for RGB changes. Build affected environments with `pio run -e esp32dev` / `pio run -e esp32dev-rgb` when the toolchain is available. Use `--separate-modules` (and `--rgb`) for module/header changes; it compiles every tab separately. Each maintained runner also executes the pure suite. Documentation-only changes do not require rerunning firmware tests.
- The active suite is `tests/behaviour.cpp` via `tests/run_tests.py`. `tests/core_test.cpp`, `tests/integration_test.cpp`, `tests/stubs/`, `VALIDATION.md` and the original design/plan/progress notes are historical files from earlier revisions and are not the current test contract.
- Distinguish native simulation, ESP32 compile, USB upload and physical tests in reports. Do not claim hardware was tested from a native PASS or successful build.
- Avoid full-flash erase during routine upload: it removes enrolled cards. Never commit real card UID lists, credentials, local COM settings, toolchains or `.pio/` build outputs.

