# Changelog

## 2026-10-25 - Refresh current print and LCD assets

- Replaced the three RFID cutting PDFs with the latest nameless source versions
  (version 2, 16 October): mixed solid/net cards, duplicated 2D nets and duplicated
  3D models. Print at Actual size / 100%.
- Replaced the LCD documentation PDF with its latest source version 4 from
  24 October: one landscape A4 PDF with all 15 question/hint pages.
- Retained the matching current ZIP of 15 PNGs; its bytes already match the latest
  source. Removed all eight original LCD PNGs and the older standalone LCD preview.
- Added the asset index and refreshed document links. Verified all 90 LCD question
  and hint rows against the current bank; visually checked the PDFs and validated
  the PNG archive. This change only affects assets and documentation.

## 2026-10-24 - Bulk Serial unassign commands

- Add `unassign all` to remove all ten registered solid/net UIDs, and
  `unassign kubus/piramid/silinder/kon/kuboid` (one name per command) to remove
  that shape's R1/R2 pair. Retain English names and accept `unassign kubu`.
- Keep the existing `unassign r1/r2 <shape>` syntax and active shape selection.
  Commit selected slots in one NVS write; failed writes keep accepted RAM and
  the current round. Successful requests cancel old rounds and pending capture.
- Document the new commands in Serial help and user guides. Add six behavioural
  regressions and extend component-test isolation to the new commands.

## 2026-10-24 - Harmonised LCD questions and documentation

- Harmonised all 15 questions and hints within three 20-character ASCII rows.
- Used j for jejari and s for tinggi sendeng; net questions describe the net
  or box dimensions without unrelated volume calculations.
- Kept question/shape IDs and legacy metadata; every question still requires
  the current R1 solid then R2 net sequence before awarding one point.
- Preserved the clean architecture, injected-RNG round builder, component
  diagnostics, user RGB wiring and saved card registrations.
- Added source-length, ASCII, unique-ID and Serial/LCD consistency checks and
  updated the pure LCD view fixture to the reviewed hint.
- Added the latest static A4 PDF and 15 PNGs with textbook symbol terms,
  no metadata row and a contained gold accent; previews include the R1 stage.

## 2026-10-24 - Integrate component testing into main

- Merge testing/components at 36d999a into main, including its existing two-card
  game flow and user-approved RGB wiring. Retain both source branches.
- Make Serial test/help, test/rfid, test/led and test/button commands available
  from main. Update checkout/upload guidance to main.
- Revalidate the unchanged firmware and both ESP32 environments before publication;
  preserve the question bank, stored UIDs/NVS and ordinary-LED default.

## 2026-10-24 - Serial component diagnostics (testing/components)

- Add discoverable test/rfid, test/led and test/button command paths, with
  per-reader UID capture/live SPI version checks, persistent colours/cycle/blink
  and raw/debounced button transitions with press counts.
- Isolate tests from play, enrolment, timer and ambient output. test/stop or stop
  returns to the menu; buttons held at exit must be released before gameplay.
- Keep pure game/application modules intact; one integration controller shares
  existing hardware adapters through the composition root, with no loop changes.
- Reject malformed paths/extra arguments without changing the active test.
  Read-only teacher commands remain available during tests.
- Preserve the approved GPIO, default ordinary mode, question bank and UID/NVS
  format. Document copy/paste Serial commands and physical verification steps.

## 2026-10-24 - User RGB wiring update

- Set RGB1/R1 bongkah to R=GPIO16, G=GPIO17, B=GPIO26 and RGB2/R2 bentangan
  to R=GPIO13, G=GPIO14, B=GPIO25, as explicitly requested by the user.
- Separate ordinary LED pins from RGB channels: esp32dev stays default with
  R1=GPIO25/R2=GPIO26; esp32dev-rgb uses the new RGB wiring.
- Update Serial pins output and wiring/user guides. Add a physical-output
  regression for every colour, reader isolation and ordinary-mode compatibility.
- Keep quiz flow, bank, UID/NVS, buttons and RFID pins unchanged.

## 2026-10-24 - Two-card flow on clean architecture

- Require registered solid R1 then matching net R2 on every question; award +1
  only once per completed pair. Retry on the active stage and skip either for +0.
- Hold R1 green while R2 waits/errors/uses hints; active hints use yellow.
- Blink both outputs synchronously three times, 150 ms ON + 150 ms OFF (900 ms),
  with the stopwatch paused and answer/NEXT/HINT input discarded.
- Reset stage and require fresh cards between questions; freeze the last time
  before its final blink, then show score/percentage/time.
- Add random RGB menu/help colours every 1,000 ms and result colours every
  150 ms without enabling readers or scoring. Ordinary LEDs remain default.
- Keep question_bank.h, GPIO, stored Shape IDs and NVS ABI unchanged; port
  prior flow guidance onto the clean application/domain/view boundaries.
- Show R1/R2 in the LCD header; update six help pages, Serial and user guides.
- Add regression coverage for two-card routing, retries, exact blink/clock
  boundaries, held cards/buttons, RGB cadence, round reset and teacher tools.
- See VERIFICATION.md for native/build evidence and pending physical checks.

## 2026-10-24 - Clean architecture

- Extracted a hardware-independent quiz engine, rules, persisted types and UID
  validation; state is owned by modules and exposed through const snapshots.
- Injected clock, randomness, logging, registry storage and reader control through
  application ports. RFID/buttons dispatch input events wired in setup.
- Split pure LCD frame rendering from the I2C driver and moved Preferences into
  its own adapter. Board config now contains electrical settings only.
- Kept one firmware source and existing tabs/PlatformIO entry; each module also
  compiles independently to detect hidden include-order dependencies.
- Added hardware-free core/application/view tests and regressions for storage
  failures, duplicate UID, serial overflow, pause/resume and legacy NVS bytes.
- Documented architecture boundaries and corrected RGB environment guidance.

The existing question text, GPIO map, quiz flow and persisted UID ABI are
preserved; both ordinary LED and RGB firmware environments are supported.

## 2026-10-24 - Initial GitHub import and VS Code support

- Imported the supplied `Geo-Decoder Board.zip`, including original firmware,
  LCD previews, printable cards, documentation and simulation tests.
- Added a PlatformIO entry point that uses the original `.ino` modules.
- Added pinned ESP32 platform and library versions, ordinary-LED/RGB build
  environments, VS Code extension recommendations and per-computer COM settings.
- Added a Malay guide for clone, Build, Upload, Monitor, card enrolment and
  physical play directly in VS Code.
- Added an option to run the existing simulation suite through `src/main.cpp`.
- Corrected outdated command documentation: the bank has 15 questions and
  NEXT on the menu starts a fresh round.

GPIO assignments, question content, quiz behaviour and persisted UID format
remain those of the supplied firmware.

