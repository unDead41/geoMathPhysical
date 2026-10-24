> Historical single-card design. Superseded by the approved two-card flow;
> see `2026-10-24-two-card-flow-design.md` / `2026-10-24-two-card-flow.md`.

# GeoDecoder RGB game flow

User request: explain the game one step at a time and update the working branch.
Base: `unDead41/geodecoder` main `75d22f14ecc9b1ccd55b93c1f6964647834c54eb`.
Working branch: `codex/game-flow-rgb`.

## Intent and decisions

Use one RGB beside each RFID reader to guide pupils through the existing
single-card quiz. R1 accepts solid cards; R2 accepts net cards. Only the
reader required by the current question displays game feedback.

The existing blue/green/red flow is retained. Yellow is added for a visible
hint and the one-second skip notice. These colour choices are the developer's
defaults for this request. The alternative of adding flashing or more colours
would add states without helping pupils distinguish the current actions.

| State | Required reader | Other reader |
|---|---|---|
| Menu / help / stopped | Off | Off |
| Question | Blue | Off |
| Hint visible | Yellow | Off |
| Wrong shape / unknown UID / wrong card role | Red for 1.2 seconds, then previous question/hint colour | Off |
| Correct | Green for one second, +1 once, advance automatically | Off |
| Skip | Yellow for one second, +0, advance automatically | Off |
| Summary | Both green: round complete, regardless of score | Both green |

Teacher UID scanning/enrolment keeps the existing blue reader indication.
Keep the six help pages; RGB-specific wording teaches the colours.
Menu, result, three-row question/hint copy, bank, scoring, timer policy,
GPIO assignments, stored IDs and UID/NVS format remain intact.
Ordinary LEDs remain the default until the unfinished RGB wiring is ready.
The existing `esp32dev-rgb` environment enables RGB; no new dependencies.

## Verification

Exercise actual firmware through the maintained native suite and PlatformIO
entry point in both LED modes. Add behavioural coverage for hint restoration,
error recovery, skip notices, summary/replay and teacher modes. Check that all
instruction text fits 20 ASCII columns. Build both ESP32 environments when the
cached toolchain can be used. Physical wiring/upload is a separate user check.
