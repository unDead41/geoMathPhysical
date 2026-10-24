# Firmware Version Implementation Plan

> Execute in this session with the existing native firmware harness.

**Goal:** show one version on Serial and GitHub and preserve future release rules.
**Architecture:** one version header consumed by the outer Serial adapter, with
README/changelog agreement checked outside the firmware.
**Tech stack:** existing C++11, Arduino/PlatformIO and Python standard library.
**Spec:** `docs/superpowers/specs/2026-10-25-firmware-version-design.md`.

## Global constraints

- First numbered release: `v1.0.0`, no zero-padding or invented previous versions.
- Keep both `esp32dev` and `esp32dev-rgb`; no GPIO, NVS or gameplay changes.
- Preserve the single Arduino-tab/PlatformIO source and read-only diagnostics.
- Publish one coherent main commit; inspect main again before updating its ref.

## Review focus

- Opening Monitor after boot: `version` must recover the identity without reset.
- RGB versus ordinary builds: report the compiled environment correctly.
- Version during R2/hint or component tests: preserve state, clock and UID storage.
- Extra command arguments: reject them without mutations.
- Future version edits: reject stale documentation and malformed numbers.

## Task 1: versioned Serial identity

- [x] Add three firmware regressions for boot/status, read-only UART version and
  diagnostics/invalid arguments; run and observe missing-feature failures.
- [x] Add `main/firmware_version.h`, `serialPrintVersion()` and the command route.
- [x] Rerun native tests in both LED environments and separate-module mode.

## Task 2: release reference and agreement check

- [x] Add the SOR and link it from AGENTS, README and the architecture guide.
- [x] Add a checker plus controlled valid/mismatch/malformed input regressions.
- [x] Call the checker from the maintained test runner and document the command.
- [x] Build both ESP32 environments, review the diff and record actual results.
- [ ] Reconcile any concurrent main changes, then publish with an expected-head
  check; verify the resulting source and version directly on GitHub.
