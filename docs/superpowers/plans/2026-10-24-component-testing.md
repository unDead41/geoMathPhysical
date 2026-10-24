# Component Testing Implementation Plan

> Execute directly with test-first changes and one final independent review,
> using the previously applied executing-plans workflow.

**Goal:** Repeatable RFID/LED/button Serial commands on testing/components.
**Architecture:** A hardware integration module owns diagnostic sessions;
composition root gates inputs/outputs while pure game modules remain untouched.
**Tech Stack:** Existing ESP32 Arduino C++11, PlatformIO and native G++ suites.
**Spec:** ../specs/2026-10-24-component-testing-design.md

## Global Constraints

Preserve question_bank.h, UID/NVS ABI, GPIO, ordinary default, and current two-card
flow. Work/push only on testing/components. No new production dependencies,
blocking loops, sleeps or delay. Retain one implementation across entry points.

## Review Focus

- Diagnostic input must not register cards, score, start or skip a game.
- Output OFF/colours must survive ambient updates and isolate the other reader.
- Held/short buttons at test exit must wait for release before gameplay actions.
- Invalid paths/extra arguments must leave an active test unchanged.
- Health results distinguish version-register access from actual UID RF success.

### Task 1: Command and hardware-session behaviour

Files: tests/behaviour.cpp and tests/fakes/MFRC522.h (electrical boundary only).

- [x] Write regressions for UART help/routing, persistent LED patterns, selected
  RFID UID capture/check, button watch/debounce, input and legacy command gates,
  no NVS/score changes, switching/exit and millis wrap.
- [x] Run actual entry in RGB to observe feature-missing failures.

### Task 2: Integration

Create main/component_tests.ino and main/hardware/component_tests.h.
Modify main/main.ino (composition only), src/main.cpp, main/serial_commands.ino,
main/buttons.ino + hardware/buttons.h and main/rfid.ino + hardware/rfid.h.

Interfaces: componentTestsBegin/Active/Update/ReaderColor/LcdFrame/Command/Stop;
rfidCheckConnections(); buttonsRequireRelease(). Input gating is wired in setup.

- [x] Implement strict path routing and hardware tests without game/storage
  ownership changes; retain raw/debounced button state in its existing driver.
- [x] Run actual entry and separate-module paths in ordinary/RGB modes.
- [x] Commit implementation after green tests.

### Task 3: Delivery

- [x] Write docs/COMPONENT_TESTS.md with copy/paste commands, output meaning,
  RGB/default environments and stop/release instructions; update command help,
  README, changelog, architecture and verification evidence.
- [x] Build both ESP32 environments and run the maintained native matrix.
- [x] Independently review final diff; fix material findings with regressions.
- Create/publish testing/components from e457b05; verify remote tree and
  SHA, with existing flow branch and main left unchanged.

Publication is performed after committing this record; the delivered remote SHA
and complete remote tree verification establish that final step.
