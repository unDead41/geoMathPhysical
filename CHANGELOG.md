# Changelog

## 2026-10-24 - RGB game flow on codex/game-flow-rgb

- Added yellow on the required reader while a hint is visible and during the
  one-second skip notice. Wrong-card feedback stays red and restores the
  previous blue question or yellow hint state after 1.2 seconds.
- Kept per-reader blue guidance, single-award green feedback, green completion,
  replay reset, ordinary-LED default, quiz rules, GPIO and saved-card format.
- Added RGB colour guidance within the existing six LCD help pages.
- Added a Malay guide explaining every gameplay step and corrected the wiring
  guide's old global-colour and teacher-mode descriptions.
- Extended the native behavioural suite for LED state transitions, errors,
  reader routing, summary/replay, instruction bounds and ordinary GPIO scope.

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
