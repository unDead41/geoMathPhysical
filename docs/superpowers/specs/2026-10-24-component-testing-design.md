# Serial component testing

User request: a separate testing-components branch with repeatable Serial
commands such as `test/rfid/<function>` for RFID, LEDs and buttons.

Implementation choice: branch `testing/components` starts from the latest flow
and wiring commit `e457b0536987d35042da4d47337fea65a0ad5d77`, rather than the
older main. Keep the default ordinary LEDs, current RGB wiring, bank and NVS.

## Command contract

- `test`, `test/help`, `test/rfid`, `test/led`, `test/button`: discover commands.
- `test/status`: current test session; `test/stop` or `stop`: exit to menu.
- `test/rfid/status`: cached boot/last-probe firmware and connection state.
- `test/rfid/check`: reread both version registers, report connection health
  and scan both readers. No self-test or successful RF/antenna claim is inferred.
- `test/rfid/r1`, `test/rfid/r2`, `test/rfid/all` (alias `scan`): watch UIDs,
  including unregistered cards, without enrolment or scoring. Cards may already
  be present when the test begins; held cards do not flood the monitor.
- `test/led/[r1|r2|all]/<action>`; omitted target means both. Actions: off,
  red, green, blue, yellow, cyan, magenta, white, cycle, blink.
  Cycle uses seven colours at 500 ms each; blink is white 250 ms ON/OFF.
- `test/button/status`: one-shot physical raw/debounced status.
- `test/button/all`, `/next`, `/hint`: watch selected raw and stable transitions
  plus debounced press counts. `/reset` starts/resets the all-button watch.

Normal Serial case/whitespace handling remains supported. Invalid paths or
extra arguments must not change the current session, readers or outputs.

## Boundaries and lifecycle

One integration module owns diagnostic state and uses existing hardware APIs.
No hardware dependency is added to the pure domain/application. Composition
root gates input and renders diagnostic LED/LCD output; the loop remains intact.

Starting a test uses appStop() to pause play/cancel capture and stop readers,
then enables only the requested reader/test. No test writes NVS. Held buttons
are suppressed during tests and until a stable release when leaving. Normal
read-only help/status/pins/tags/current/bank/score remain available; other game
or registry commands require test/stop first. Existing teacher commands work
normally after exit. There is no automatic game resume on leaving a test.

LED test output overrides ambient output until exit, including OFF. Ordinary
mode maps non-off colours to ON and reports that colours need esp32dev-rgb.
No blocking wait or delay is introduced. Live changes use millis rollover-safe
subtraction. The LCD labels the active component test and its exit command.

This reuses actual reader/button/LED adapters. Duplicating a test-only sketch
would drift from production wiring and is deliberately avoided.

## Verification

Drive real Serial input, GPIO adapters and events in existing firmware tests.
Cover routing/unknown commands, output ownership and isolation, cycle/blink
boundaries, button debounce/counts/holds/exit, all RFID reader modes and live
health changes, zero scoring and unchanged registry, legacy-command gating,
rollover and session switching. Run maintained native paths and both ESP32
builds. Serial tests facilitate physical checking; software cannot judge a
wire, colour or antenna without the actual device.
