# GeoDecoder v2.0.0 verification - 28 October 2026

Audited main: `c9275fda75b1720613c5bfa776e6b3049ee326d5` (v1.1.4).
Audited sharing: `4e3fdfcbfc1508dcf4cce55a58df637243c33f2a` (1.1.4-sharing.1).
The v1.1.4 printable-net asset update arrived during the audit and was retained.
Publication targets: main v2.0.0 and reduced sharing 2.0.0-sharing.1.

## Behaviour and data

Typed QuestionFocus selects solid R1 -> net R2 or net R2 -> solid R1.
First-card progress is independent of reader number; only the second matching
card awards +1. A registered wrong shape on either stage enters WRONG_ANSWER,
pauses at the scan timestamp, stops readers and continuously blinks both LEDs
red at 150 ms ON/OFF until NEXT. NEXT is not gated by automatic-blink blocking.
It advances immediately to a fresh question and resumes time, or opens the
last summary with the original failure timestamp still frozen.

All fifteen questions have actual-answer names and two precise explanation
rows. Formula derivations, net components and B3's paired face dimensions were
reviewed. All source rows, compact answer labels and eight instruction pages
fit printable ASCII 20x4. Question/hint copy, IDs, answers and random selection
are preserved. No solution data is rendered in ordinary question/hint frames.

Unknown UID and wrong registered card role retain the 1,200 ms recoverable
help notice: time runs, score/stage/wrong count do not change. Reader faults
never dispatch an answer; online checks and teacher diagnostics remain.
Stop/play/retry/clear and inspection/diagnostic roundtrips cannot reopen a
finalized failed question. Deliberate round new or registry changes still
reset the round as documented.

No hardware pin, reader role, config default, storage namespace/key/magic/
version, Shape ID or RegistryData ABI changed. Ordinary LED paths remain
native developer compatibility only. One published RGB environment remains
on each branch. No production dependency was added and loop() is unchanged.

## Native simulation

Baseline v1.1.4: 12/12 pure cases and 68/68 integration passed. Before the
implementation, six new scenarios failed on the intended missing behaviours:
focus routing, terminal failure/pause, maintenance lock, held NEXT, reverse
stale-card routing and explanation rendering. Existing fresh-card protection
already satisfied the additional wrong-to-next held-card case.

| python tests/run_tests.py flags | Version regressions | Pure core/application/view | Firmware integration |
|---|---:|---:|---:|
| none (developer ordinary LED) | 6/6 | 14/14 | 75/75 |
| --rgb | 6/6 | 14/14 | 75/75 |
| --entrypoint src/main.cpp | 6/6 | 14/14 | 75/75 |
| --entrypoint src/main.cpp --rgb | 6/6 | 14/14 | 75/75 |
| --separate-modules | 6/6 | 14/14 | 75/75 |
| --separate-modules --rgb | 6/6 | 14/14 | 75/75 |

The sharing source was also executed using the main harness:
`python tests/run_tests.py --sketch ../geodecoder-sharing/main --entrypoint ../geodecoder-sharing/src/main.cpp --rgb`:
6/6 version regressions, 14/14 pure cases and 75/75 integration. The pure
runner reads the main core; byte-for-byte parity of all 36 firmware/entry
files establishes the same core in sharing. Electrical adapters are simulated.

C++11, -Wall -Wextra -Werror -pedantic, ASan and UBSan were enabled;
LeakSanitizer is disabled in the managed runtime. Each maintained runner
executes the pure suite. `python tools/check_version.py --previous-version
v1.1.4` passes for v2.0.0. Both git diff --check runs pass.

New coverage includes both question orders and failure stages, prior-score
preservation, every millisecond of continuous red output for 4,800 ms, longer
frozen waits/maintenance roundtrips, final failure, both physical held buttons,
both-order prepositioned cards and old cards across questions. Pure tests
cover last/non-last failures and continuous blinking across millis rollover.
Existing tests retain all 900 green/red blink samples, skip paths, ambient
RGB timing/distinct-pair rules, UID/NVS, Serial, calibration and game resets.

## ESP32 compilation

Default `python -m platformio run` (no -e) succeeds for both snapshots using
PlatformIO Core 6.1.18, Espressif32 6.12.0, Arduino ESP32 2.0.17,
MFRC522 1.4.12 and hd44780 1.3.2. Both builds use 22,812 bytes RAM and
340,457 bytes flash. Project config confirms exactly one environment and
matching default each: esp32dev-rgb / esp32dev-sharing-rgb, board esp32dev,
GEODECODER_RGB_ENABLED=1. Compile is not a USB upload.

## Independent review and sharing package

Read-only independent review found no Critical, Important or Minor issues.
The reviewer independently ran the PlatformIO RGB native entry (6/14/75
passing), checked all explanations and verified all 36 shipping source files
match. The other five native runs and ESP32 compilation are executor results.

Sharing is synchronized by selected firmware/guide updates on its own tree;
it is never merged back into main. Its tree remains 58 files, with 57 payload
manifest entries excluding package.json. Installer/PowerShell/tasks/config
files and all seven PDF Git blobs are retained. Existing binary payload hashes
are retained for unchanged PDF blobs; every local text payload hash is checked
against its final bytes. Firmware version, package version, actual main source
SHA, README source link and payload inventory are checked together before push.
Installer code is unchanged; Windows installer orchestration was not rerun in
this firmware-only update. It is not reported as newly tested.

## Physical limits and tutorial follow-up

No USB upload, actual Windows installation or physical ESP32/RFID/LCD/button/
RGB test was performed. After pulling, Build/Upload and query version to confirm
v2.0.0 on the board. Retain existing UID data; do not erase flash routinely.

The A-Z tutorial PDF, student gameplay PDF, 15-screen LCD PDF/PNG and any
video using the previous flow need updates. They still describe earlier
reader order/error handling and do not show the new explanations/eight help
pages. No PDF/video was overwritten by this change. Print-card/net PDFs,
including the latest smaller printable nets, are preserved. Exact handoff:
[docs/TUTORIAL_FLOW_V2_HANDOFF.md](docs/TUTORIAL_FLOW_V2_HANDOFF.md).

Previous verification: [v1.1.3 archive](docs/archive/VERIFICATION_2026-10-25-version-1.1.3.md).
