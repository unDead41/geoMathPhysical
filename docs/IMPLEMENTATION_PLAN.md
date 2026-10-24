> Historical document from the supplied ZIP. Some counts, interfaces and results describe earlier revisions. Current setup: `README.md`; current behaviour: `main/`; current checks: `VERIFICATION.md` and `tests/run_tests.py`.

# GeoDecoder Implementation Plan

> For agentic workers: execute inline under superpowers:executing-plans; the user explicitly requested coding and delegated routine choices.

**Goal:** Deliver a complete Arduino IDE project and wiring guide for the approved RFID geometry quiz.

**Architecture:** Independent Arduino tabs use explicit declarations in config.h. The question bank provides pure round selection; the quiz owns scoring; tag_registry owns persistent identity; app routes hardware events and maintenance modes.

**Tech Stack:** Arduino ESP32 3.3.12, MFRC522 1.4.12, hd44780 1.3.2, Preferences.

**Spec:** DESIGN.md.

## Global Constraints
- Target classic ESP32 WROOM-32/32E only.
- No invented usable UIDs; six actual cards enrolled by Serial.
- Default three types, two selected questions per type, round target five, twelve stored questions. A two-type configuration remains supported with four questions per round.
- No application delay in the interactive loop; debounce on press.
- RGB disabled by default; no extra dependency.

## Review Focus
- Held cards across B1 and across maintenance mode transitions must not answer a fresh question.
- Duplicate/invalid UIDs, extra Serial arguments and overflow must cause no partial mutations.
- A matching pair of the wrong shape is still wrong; marks cannot repeat.
- NVS failure/corruption must not silently claim saved data.
- All LCD frames fit 20x4; hints preserve the question line.

## Task 1: Bank and quiz contracts
Files: main/config.h, main/question_bank.h, tests/core_test.cpp.
Interface: bankBuildRound(mask, out) returns the question count; out stores indices into QUESTIONS.
- [x] Write a failing test: cube/pyramid yields four unique questions; the default three types yield five from six; five types yield five from ten.
- [x] Implement the bank and Fisher-Yates selection; verify the native core test.

## Task 2: Registry, application and hardware tabs
Files: main/*.ino, tests/stubs/*, tests/integration_test.cpp.
Interfaces: registryAssign/SetActive/SetCount commit validated settings; quizOnScan/Next/Hint own answer state; appHandleScan routes modes; RFID owns presence edges.
- [x] Add integration tests before feature implementations: persistence, role checks, scoring, Serial parsing, held cards, buttons and LCD.
- [x] Implement each independent tab using the explicit interfaces in config.h.
- [x] Run native tests with sanitizers, including RGB-disabled and RGB-enabled builds.

## Task 3: Target verification and deliverable
Files: README_MULA_SINI.md, SAMBUNGAN.md, COMMANDS.md, VALIDATION.md, ZIP.
- [x] Compile actual target with Arduino CLI and required libraries, with RGB disabled and enabled.
- [x] Perform a separate final review against DESIGN.md, then fix important findings with regressions.
- [x] Document exact test evidence and physical-test limitations; prepare project for packaging and delivery.
- [x] Produce and visually inspect six editable vector labels and their A4 print PDF; the user explicitly added this deliverable.

Ruling: This is a standalone downloadable artifact, not an existing git repository. Git/worktree/merge steps do not apply; source, tests and validation travel in the ZIP.
