# GeoDecoder Clean Architecture Implementation Plan

> **For agentic workers:** Execute this plan natively in the current session;
> the user explicitly requested implementation and a direct push to main.

**Goal:** Clean the current firmware architecture while preserving its behaviour.

**Architecture:** Pure domain headers, application ports and read-only snapshots,
pure LCD view, hardware adapters, and explicit composition in `main/main.ino`.
The PlatformIO entry continues to use that one source of firmware logic.

**Tech Stack:** C++11, ESP32/WROOM-32, Arduino, PlatformIO, existing MFRC522/hd44780.

**Spec:** `docs/superpowers/specs/2026-10-24-clean-architecture-design.md`.

## Global Constraints

- Preserve `geomath_q2/registry`, magic `0x474D5132`, version `1` and Shape IDs 0..4.
- Preserve the existing question text, wiring, ordinary LED default and RGB opt-in.
- No dynamic allocation or new production dependencies.
- Keep one firmware implementation and exercise `src/main.cpp`.

## Review Focus

- A held card must never answer the following question without removal.
- A button pressed during a notice must not activate after debounce on a new screen.
- Failed or partial NVS writes must not change the accepted RAM registry.
- A final answer or skip freezes time immediately, including millis rollover.
- Both single-reader and RGB modes must retain the original reader routing.

## Task 1: Isolate the core and storage contract

Files: `main/domain/{rules,types,registry,quiz_engine}.h`,
`main/question_bank.h`, `tests/domain.cpp`, `tests/run_domain_tests.py`.
Interfaces: `QuizEngine::data/start/submit/skip/update/elapsed/pause/resume`,
pure UID/registry helpers, and `bankBuildRound(mask, out, RandomIndex)`.

- [x] Add hardware-free tests for transitions, double scoring, hints, freeze,
  rollover, UID validity, duplicate registry and filtered round generation.
- [x] Observe failure before extraction; implement the pure core.
- [x] Compile/run with C++11, warnings as errors and ASan/UBSan.

## Task 2: Invert application and hardware dependencies

Files: `main/application/*.h`, `main/hardware/*.h`, existing `.ino` tabs,
`main/presentation/lcd_view.h`, `src/main.cpp`, `tests/behaviour.cpp` and fakes.
Interfaces: `AppPorts`, `InputEvents`, const `appState/quizState/registryState`,
`lcdRender(frame)`, `appReaderColor(reader)`.

- [x] Keep the 22-case regression suite as a baseline in both LED modes.
- [x] Add storage-failure, duplicate UID, serial overflow and paused-resume checks.
- [x] Wire ports and input callbacks once in setup; encapsulate module state.
- [x] Render LCD from an immutable view; keep device I/O in hardware modules.
- [x] Compile each tab as its own translation unit and run the same regressions.

## Task 3: Verify and publish

Files: `AGENTS.md`, `README.md`, `SAMBUNGAN.md`, `tests/README.md`,
`CHANGELOG.md`, `VERIFICATION.md` and `docs/ARCHITECTURE.md`.

- [x] Run the pure suite and combined/separate native suites in both LED modes.
- [x] Build `esp32dev` and `esp32dev-rgb`; record actual RAM/flash results.
- [x] Review the full diff, unchanged question data and persistent ABI.
- [x] Update contributor/build guidance and record hardware-test limits.
- [x] Recheck remote main, publish one reviewed commit with a SHA lease, and
  confirm the remote head and tree match the intended change.
