# GeoMath Physical repository scope

- Repository ini ialah `unDead41/geoMathPhysical`; `main` khusus firmware ESP32.
- Portal web, modul browser, PWA dan backend berada dalam `unDead41/geoMathDigital`.
- Flutter, Android, Lawan AI dan aset App berada dalam `unDead41/geoMathApp`.
- Jangan tambah `digital/`, `apps/`, `supabase/` atau entry portal web ke sini.
- Gunakan `python tools/check_repository_scope.py` sebelum menerbitkan perubahan.
- Branch lama Digital/App dipulihkan melalui manifest asal dan tag arkib yang
  diterangkan dalam `docs/REPOSITORY_SPLIT.md`, kemudian teruskan kerja di repo sasaran.
- Arahan pemilikan ini mengatasi andaian monorepo dalam dokumen sejarah.

# GeoDecoder contributor guidance

- Before any update, read `docs/SOR_VERSIONING.md` and inspect current `main`.
  Every published main update must advance `main/firmware_version.h` and match
  README's current version plus the top versioned CHANGELOG entry. Run
  `python tools/check_version.py --previous-version v<last-main-version>`;
  report the final version, branch and actual commit SHA. First numbered release: v1.0.0.
- Read `README.md`, `docs/ARCHITECTURE.md`, `SAMBUNGAN.md`, `COMMANDS.md` and `VERIFICATION.md` before editing firmware.
- Component tests: read `docs/COMPONENT_TESTS.md` before changing Serial diagnostics. Keep the controller outside pure domain/application, preserve nonblocking output ownership and suppress game actions during tests.
- Active flow: `docs/GAME_FLOW_RGB.md`. Typed `Question.focus` determines first
  reader: solid R1 -> net R2, or net R2 -> solid R1. Roles/pins never swap.
  Runtime `stage` selects the current pad; `firstAccepted` tracks pair progress.
  A wrong registered answer enters WRONG_ANSWER: +0, stopped clock, continuous
  synchronized 150 ms red ON/OFF until NEXT. Do not gate NEXT with timed-blink
  input blocking; retry/hint/play must never reopen a finalized wrong question.
  Correct/skip retain three 150 ms ON/OFF cycles (900 ms) with stopped clock.
  Unknown UID/wrong card role remain recoverable help, not scored failures.
  Cara Main has 15 ASCII 20x4 pages; HINT opens/advances/returns and NEXT stays
  inactive throughout help. Keep all exact pages in the existing tutorial handoff.
  InputEvents button blocking is per-button: both during automatic blink,
  only HINT during WRONG_ANSWER. Snapshot before dispatch so pending HINT cannot
  enter the next question after NEXT. Keep NEXT available in WRONG_ANSWER.
- Firmware source lives in `main/`. `src/main.cpp` is the PlatformIO entry point and includes the same tabs. Keep a single source of application logic.
- Keep domain and application hardware-independent. Application time/RNG/logging/storage/reader control goes through `AppPorts`, bound once in setup. RFID/buttons emit `InputEvents`; LCD accepts a `LcdFrame`. `config.h` contains board settings only.
- Mutable state is owned by its module. Read `appState()`, `quizState()` and `registryState()` as const; use application actions for mutations. Do not restore mutable extern globals or introduce production `const_cast`.
- LED wiring: ordinary LED_PINS stays R1=25/R2=26; user-authorized RGB_PINS (R/G/B) is R1=13/14/25, R2=16/17/26. Keep these configurations separate.
  The RGB R1/R2 swap was explicitly requested by the user on 25 October 2026.
  Random RGB pairs must differ between R1/R2 and from each reader's previous colour.
  Share the bounded selector in domain/rgb_random.h across ambient and component random modes.
  Gameplay hints use MAGENTA (purple, R+B) on the active reader; yellow remains a diagnostic colour.
- Target: classic ESP32/WROOM-32 (board ID `esp32dev`). User-authorized policy from v1.1.3: expose exactly one RGB environment, default `esp32dev-rgb` in main and `esp32dev-sharing-rgb` in sharing. Do not reintroduce an LED/environment chooser in setup or Configure. Legacy script options map to RGB only. Do not silently retarget C3/S3 or change GPIO assignments. Ordinary-LED code remains for native compatibility checks only, not a published environment.
- Preserve persisted `Shape` IDs, `RegistryData`, namespace `geomath_q2`, registry key, magic and storage version unless implementing an explicit migration.
- LCD is 20x4. A question/hint body has three ASCII rows, each at most 20 characters. R1 expects solid cards; R2 expects net cards.
- Current bank: 15 questions, three per shape, up to five unique questions per round. For all five active shapes, one question per shape. Runtime `main/question_bank.h` is authoritative.
- The pure suite `python tests/run_domain_tests.py` compiles the real core/application/view without Arduino headers or device fakes. Keep that boundary intact.
- Reuse the existing tests for firmware changes. Exercise the actual PlatformIO entry with `python tests/run_tests.py --entrypoint src/main.cpp --rgb`. Build with `pio run` (sole RGB default) when the toolchain is available. Use `--separate-modules --rgb` for module/header changes; it compiles every tab separately. Native runs without `--rgb` remain developer compatibility checks and do not create a second user build. Each maintained runner also executes the pure suite. Documentation-only changes do not require rerunning firmware tests.
- The active suite is `tests/behaviour.cpp` via `tests/run_tests.py`. `tests/core_test.cpp`, `tests/integration_test.cpp`, `tests/stubs/`, `VALIDATION.md` and the original design/plan/progress notes are historical files from earlier revisions and are not the current test contract.
- Distinguish native simulation, ESP32 compile, USB upload and physical tests in reports. Do not claim hardware was tested from a native PASS or successful build.
- Avoid full-flash erase during routine upload: it removes enrolled cards. Never commit real card UID lists, credentials, local COM settings, toolchains or `.pio/` build outputs.


