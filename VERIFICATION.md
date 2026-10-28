# GeoDecoder v2.0.1 verification - 28 October 2026

## Actual audited bases and concurrent work

Main: `c368e8c951478360c89f99b8a3c9944a62761049` (v2.0.0).
Sharing: `63a1193978577a9f8a4fe116a902ec08e87b52d5` (2.0.0-sharing.1).
These heads arrived during the earlier audit. Work was reapplied to these
actual sources, retaining their final-flow implementation, typed QuestionFocus,
all 15 answer explanations and seven PDFs, including the new printable net.

Publication targets are main v2.0.1 and sharing package 2.0.1-sharing.1. PATCH
fits SOR: complete the agreed LCD guidance and fix a pending-button leak while
preserving the v2.0.0 game/usage, hardware, storage and question-data contracts.

## LCD and input changes

Cara Main now has 15 actual firmware pages. Each has a title, two ASCII body
rows <=20 and HINT: Seterusnya (last: HINT: Menu utama). The pages explicitly
cover solid R1->R2, net R2->R1, blue waiting, first green/+0, matching pair +1,
three green blinks/auto-next, terminal wrong +0/continuous red, answer/reason,
NEXT/TERUSKAN, paused time and active-reader purple hints. The clock wording
names green *blinking*, so steady first-card green is not mistaken for a pause.
HINT opens/advances/returns; NEXT is inactive on every page.

Input blocking now takes the button index. Both buttons remain suppressed
through automatic green/skip-red sequences. In WRONG_ANSWER, only HINT is
suppressed until release; NEXT stays usable. The driver snapshots blocking
before dispatching either button, so NEXT cannot carry a HINT whose debounce
began in the wrong-answer screen into the next question. Held NEXT still acts
once. The existing timed-blink/default NEXT query remains compatible.

Fresh tests on the actual v2.0.0 source first passed 14 pure and 75 integration
cases. New regressions then failed exactly for incomplete 15-page guidance
and a HINT started 20 ms after a NEXT press in wrong review. Both pass after
the production changes. All source QuestionFocus, QuizEngine, Question data
(including every explanation), registry/Shape/NVS, config/GPIO, RFID adapter,
component diagnostics and PlatformIO configuration remain byte-identical to
the audited current source. loop() is unchanged.

## Native simulation results

| python tests/run_tests.py flags | Version regressions | Pure core/application/view | Integration |
|---|---:|---:|---:|
| none (legacy LED developer compatibility) | 6/6 | 14/14 | 79/79 |
| --rgb | 6/6 | 14/14 | 79/79 |
| --entrypoint src/main.cpp | 6/6 | 14/14 | 79/79 |
| --entrypoint src/main.cpp --rgb | 6/6 | 14/14 | 79/79 |
| --separate-modules | 6/6 | 14/14 | 79/79 |
| --separate-modules --rgb | 6/6 | 14/14 | 79/79 |

The sharing source was also exercised with the main harness using
`--sketch ../geodecoder-final-sharing/main --entrypoint ../geodecoder-final-sharing/src/main.cpp --rgb`:
6/6 checker regressions, 14/14 pure and 79/79 integration. The pure runner uses
main's core; byte parity of all 36 firmware/entry files establishes the same
core in sharing. Electrical/device I/O is simulated. These paths use C++11,
-Wall -Wextra -Werror -pedantic, ASan and UBSan; LeakSanitizer is disabled.

Coverage retains both card orders, wrong at either stage, +1 once after the
pair, continuous synchronized red/frozen wrong time and rollover, final wrong
NEXT, correct/skip six half-steps (900 ms), timer resume/final freeze, stop/play/
retry/clear/inspection/diagnostic locks, pre-positioned/old cards and sequential
scans without requiring simultaneous presence, held inputs, ambient random RGB,
legacy NVS, teacher commands and diagnostics.

Additional cases check wrong waits/next in both orders, both stages and final
questions; pending HINT plus held NEXT; recoverable unknown/wrong-role UIDs
on both stages/orders; and skip from both focus orders/stages. All 15 wrong
LCD explanations are now tested at both stages (30 frames), including no
answer name in ordinary question/hint and unchanged display after 5 seconds.
Every one of 15 guide pages and its navigation/ASCII/width is checked.

`python tools/check_version.py --previous-version v2.0.0` passes. Runtime
header, README and top CHANGELOG identify v2.0.1. Both git diff --check runs pass.

## ESP32 compilation

Default `python -m platformio run` (equivalent to pio run, without -e)
completed SUCCESS for both branches. Core 6.1.18, Espressif32 6.12.0,
Arduino ESP32 2.0.17, MFRC522 1.4.12 and hd44780 1.3.2.
RAM 22812/327680 bytes; flash 341073/1310720 bytes in main.
Independent checks confirm one default RGB environment per branch:
esp32dev-rgb and esp32dev-sharing-rgb; classic board esp32dev and original pins.
No production dependency or partition change was introduced.

## Sharing, documentation and assets

All 36 firmware/entry files match byte-for-byte. Sharing retains its installer,
config and minimal tree, adding only GAME_FLOW_RGB.md and the existing-name
TUTORIAL_FLOW_V2_HANDOFF.md as two compact user documents (60 files total).
No test fixtures, design history, toolchain, COM data or build output is shipped.
Package metadata records the actual main source SHA; changed text-file SHA-256
values are regenerated, while unchanged PDF entries retain prior digests backed
by identical Git blob SHAs. Sharing deletions are never merged into main.

The existing tutorial handoff is extended, rather than replaced by a competing
handoff: all 15 guide pages, all 15 actual wrong frames and gameplay examples
are exported from buildLcdFrame/QUESTIONS/LCD_INSTRUCTIONS. Right-hand padding
is omitted only in Markdown. These frames are text simulation, not board photos.
The seven PDFs and main PNG ZIP from current tutorial/print work are preserved.
A-Z/player/LCD PDFs, PNG previews and video still need the changes listed in
that handoff; the printable-card/net assets need no flow-related replacement.

## Physical limits

No USB upload, physical ESP32/RFID/RGB/LCD/button testing, actual Windows install
or new video recording was performed. Native PASS and successful ESP32 compile
are separate from physical validation. After pull, Build/Upload the sole RGB
default and query version at 115200 baud; routine full-flash erase is unnecessary
and would remove enrolled cards.

Previous release evidence: docs/archive/VERIFICATION_2026-10-28-version-2.0.0.md.

## Independent final review

Read-only review of the canonical v2.0.1 source found no Critical or Important
issues. It checked the button snapshot, wrong-answer locks, fresh-card barriers,
rollover/time, every help page and preservation of the protected files.
A pre-existing editorial minor is deferred: K1's reason splits `segi empat`
and `sama saiz dan bentuk` across rows; explicit square wording could be
clearer in future tutorial editing. The current rows match the user-provided
example and are preserved with all current answer data. This is not a scoring,
flow or LCD-width issue. Hardware/PDF limits above remain; the actual source SHA
and manifest are finalized before publication.
