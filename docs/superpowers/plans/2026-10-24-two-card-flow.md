# Two-card Flow Implementation Plan

> Execute directly in this session, as requested by the user. Use the existing
> clean architecture, test-first changes, and a final review of the full diff.

**Goal:** Implement the approved two-card GeoDecoder flow on codex/game-flow-rgb.
**Architecture:** Pure QuizEngine owns stages, scoring, blinking and the stopwatch.
Application coordinates reader ports and decorative RGB; existing drivers stay
behind their contracts and LCD renders immutable snapshots.
**Tech Stack:** C++11, ESP32 Arduino, PlatformIO, native G++ with ASan/UBSan.
**Spec:** ../specs/2026-10-24-two-card-flow-design.md

## Global Constraints

Keep the question bank, GPIO and persisted registry format unchanged. Ordinary
LEDs remain default. Commit/push only the working branch, never main. No delay()
or blocking waits in the state machine. Exact requested timing: 150 ms per half
blink, three cycles (900 ms), 1,000 ms menu colours, 150 ms result colours.

## Review Focus

- Early/wrong-role/unknown cards must not complete a stage or earn a point.
- Cards pre-positioned on R2 and held across questions must require removal.
- Late or short physical button presses during blinking must not carry forward.
- Resume/play and clock rollover must not include any transition or menu time.
- Rendering and colour updates must not modify scoring or registry data.

### Task 1: Pure engine

- [x] Adapt scoring regression to require R1 then R2; run and observe failure.
- [x] Add tests for retries/hints, skips at either stage, literal 150/900 ms
  blink boundaries, frozen time, final action and rollover.
- [x] Extend domain/types.h, rules.h and quiz_engine.h; run pure suite.

### Task 2: Application, inputs and outputs

- [x] Adapt behaviour.cpp's old single-card expectations; add real-entry tests
  for stage arming, held cards, physical buttons, RGB cadence and teacher tools.
- [x] Run tests to show missing behaviour; update app.ino, quiz.ino and headers.
- [x] Update RGB channel combinations, LCD header/help and Serial guidance.
- [x] Verify ordinary/RGB modes through the real entry and separate modules.

### Task 3: Evidence and publication

- [x] Update flow, architecture, user guides, changelog and verification record.
- [x] Run full native matrix; cross-compile both ESP32 environments.
- [x] Review whole diff and fix meaningful findings with regression tests.
- [x] Recheck remote main/branch and current question-bank blob before push.
- Publish with branch ancestry retained; verify remote SHA and tree after
  the final commit (the delivery report records this action).

Publication is the final action after this record is committed; the delivered
GitHub commit/branch SHA confirms that step without changing its own contents.
