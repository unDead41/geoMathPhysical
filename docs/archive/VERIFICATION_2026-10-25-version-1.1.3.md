# GeoDecoder v1.1.3 verification - 25 October 2026

Inspected main: `1f45d142b1cb59d976dbf52eb6581cc8dfcf0e0b` (v1.1.2).
Inspected sharing: `fa12e37861906c7d4e958ad0060eb6cae449f34c` (1.1.1-sharing.3).
Publication targets: `main` v1.1.3 and reduced `sharing` package 1.1.3-sharing.1.

## One user build

Main exposes exactly one default environment, `esp32dev-rgb`; sharing exposes
exactly one, `esp32dev-sharing-rgb`. Both retain board ID `esp32dev`, pinned
platform/libraries and the existing RGB GPIO mapping. `pio run` builds each
project directly without `-e`. Build, Upload and Monitor use that default.
PlatformIO's Default group refers to the same sole environment.

The header default is RGB. The sharing installer and Configure have no LED
selection prompt. Old script environment names all map to RGB; the old
BuildBoth switch submits one build only. Managed legacy state/INI settings
migrate to RGB with COM preserved. User-edited local configuration is protected.

## Native firmware verification

| Runner flags (`python tests/run_tests.py`) | Version regressions | Pure core/application/view | Firmware integration |
|---|---:|---:|---:|
| `--entrypoint src/main.cpp --rgb` | 6/6 | 12/12 | 68/68 |
| `--separate-modules --rgb` | 6/6 | 12/12 | 68/68 |
| `--entrypoint src/main.cpp` (developer LED compatibility) | 6/6 | 12/12 | 68/68 |

All paths completed with exit code 0, C++11 warnings-as-errors, AddressSanitizer
and UBSan; LeakSanitizer is disabled for the managed runtime. The last row
checks retained internal compatibility, not a second published build.
`python tools/check_version.py --previous-version v1.1.2` passes.

## ESP32 compilation

`pio run` without an environment option completed with SUCCESS for both branch
snapshots. PlatformIO project-config output independently confirms one named
environment, one matching default, board `esp32dev` and RGB enabled in each.

Toolchain: PlatformIO Core 6.1.18, Espressif32 6.12.0, Arduino ESP32 2.0.17,
MFRC522 1.4.12 and hd44780 1.3.2, using existing verified dependency caches.

## Sharing installer and local configuration

- 17/17 installer orchestration cases pass on Linux PowerShell 7.4.13 in
  Legacy native argument mode. The fresh-install case passes without an
  Environment option and with prompting enabled; any unexpected Read-Host
  would fail the case. The legacy BuildBoth option submits just one RGB build.
- 14/14 compatibility checks pass: four scripts parse, full package integrity,
  all four saved environment names, old/new command overrides, actual CLI
  Build/Upload/Monitor argument dispatch to a capture process, COM preservation,
  Configure without an environment prompt, edited-INI protection and invalid
  environment rejection.
- Missing/existing dependencies, reruns, failure/recovery, multiple COM ports,
  Unicode/spaces/ampersands and calibration preservation remain covered by the
  installer simulation. Windows OS/process/download/signature boundaries use
  explicit controlled substitutes; Upload/Monitor processes are capture stubs.

Verification fixtures, local COM/configuration, dependencies and build outputs
are not included in either published tree. Sharing keeps its reduced file list.

## Scope and physical limits

No actual Windows application installation, USB upload or physical
ESP32/RFID/LCD/button/RGB test was performed. After pulling and reloading VS Code,
click Upload and use `version` to confirm v1.1.3 on the board.

Gameplay, question bank, GPIO values, UID/NVS schema/namespace, partition layout
and all six PDFs are preserved. Main and sharing use identical firmware source;
sharing records its exact source main commit in package.json and README.
Existing PDF screenshots/environment choices describe the older edition;
the current README directs users to skip LED selection and use the sole RGB build.

Previous RGB-pair verification is retained in
[the v1.1.1 archive](docs/archive/VERIFICATION_2026-10-25-version-1.1.1.md).
