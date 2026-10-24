# Changelog

## 2026-10-24 - Harmonised question and hint wording

- Rewrote all 15 questions and hints for clear Malay within three 20-character ASCII rows.
- Kept the live question/time/score header and all persisted shape IDs and card registrations.
- Preserved the 2 solid / 1 net question split for every shape and every question ID.
- Net questions now ask about the net itself or box dimensions, without unrelated volume calculations.
- Replaced the ambiguous cone slant-length definition with tinggi sendeng.
- Added reviewed display fixtures and checks for source-row overflow, ASCII, unique IDs and Serial/LCD consistency.
- Added a complete LCD review with both question and hint screens rendered from the native firmware.

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

