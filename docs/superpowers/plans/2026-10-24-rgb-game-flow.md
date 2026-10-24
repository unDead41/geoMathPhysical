> Historical single-card design. Superseded by the approved two-card flow;
> see `2026-10-24-two-card-flow-design.md` / `2026-10-24-two-card-flow.md`.

# GeoDecoder RGB Game Flow Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline for this small change.

**Goal:** Guide pupils through the existing quiz using two RGB LEDs and a step-by-step Malay guide.

**Architecture:** Keep quiz state and colours in `main/quiz.ino`; drive R/G/B in `main/rgb_leds.ino`. Existing shared entry points and ordinary-LED fallback remain.

**Tech Stack:** ESP32 Arduino, PlatformIO, native C++11 hardware simulation.

**Spec:** `docs/superpowers/specs/2026-10-24-rgb-game-flow-design.md`.

## Global Constraints

- Classic ESP32/WROOM-32; ordinary LEDs stay the default.
- Preserve GPIO assignments, stored IDs, `RegistryData` and NVS format.
- LCD: 20 columns, four rows, ASCII; retain six help pages.
- Keep the bank, scoring and clock rules intact; no blocking delays.

## Review Focus

- A hint stays visible after wrong-card feedback expires.
- Pending notices cannot award twice or consume the next question's button press.
- Final green means completion, even at 0/5; final time remains frozen.
- Ordinary LEDs still use only GPIO25/26.
- Stopped/help and teacher modes must not show leftover game feedback.

## Task 1: RGB flow and pupil guide

**Files:** `main/config.h`, `main/quiz.ino`, `main/rgb_leds.ino`, `main/lcd_display.ino`, `tests/behaviour.cpp`, `README.md`, `README_MULA_DI_SINI.md`, `SAMBUNGAN.md`, `docs/GAME_FLOW_RGB.md`, `CHANGELOG.md`, `VERIFICATION.md`, `tests/README.md`.

**Interfaces:** Keep `RgbColor quizColor()` and `RgbColor quizReaderColor(uint8_t)`; add yellow to `RgbColor`. `rgbWriteReader(uint8_t, RgbColor)` drives red+green for yellow.

- [x] Add behaviour cases for yellow hint/skip, restored blue/yellow, per-reader errors, summary/replay, idle/teacher modes and bounded help text.
- [x] Run `python3 tests/run_tests.py --entrypoint src/main.cpp --rgb`; observe failures for the missing yellow feedback.
- [x] Add yellow mapping and state priority: result/correct, errors, hint/skip, question.
- [x] Update RGB-specific help text within the existing six pages.
- [x] Run the maintained suite for both entry points and LED modes; all cases pass.
- [x] Write the Malay flow and update wiring/status guidance, changelog and verification with actual results.
- [x] Review the diff, commit and publish only `codex/game-flow-rgb`, preserving the main branch.
