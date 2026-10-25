# GeoDecoder v1.1.1 verification - 25 October 2026

Inspected main: `3fcef581b66c1582661f07e201c840ee84c085fa` (v1.1.0).
Publication target: `main`.

## Calculated random RGB pairs

Menu, instructions, final results and both all-target random test commands now
select different simultaneous R1/R2 colours, including the first random frame.
Each reader also avoids its preceding colour. All seven non-OFF colours remain
available. Menu/help remain 1,000 ms, results 150 ms and random diagnostics 500 ms.

The shared pure `domain/rgb_random.h` selector builds the allowed candidate
list before drawing. R1 excludes its previous colour; R2 excludes its previous
colour and the newly selected R1 colour. Each reader uses one bounded draw from
5..7 candidates, with no retry loop. Diagnostics store and log a colour per
reader; rendering does not draw new random values.

The original implementation selected ambient readers independently and used
one shared diagnostic colour for both targets. New tests were observed failing
against that baseline before implementation. A first candidate ordering exposed
a deterministic fake-RNG palette-coverage failure; ordering candidates relative
to the previous colour preserves the old single-reader traversal and resolves
it while retaining all candidate exclusions. The complete final suite passes.

## Native verification

| Runner flags (`python tests/run_tests.py`) | Pure core/application/view | Firmware integration |
|---|---|---|
| no flags (Arduino tabs) | 12/12 passed | 68/68 passed |
| --rgb | 12/12 passed | 68/68 passed |
| --entrypoint src/main.cpp | 12/12 passed | 68/68 passed |
| --entrypoint src/main.cpp --rgb | 12/12 passed | 68/68 passed |
| --separate-modules | 12/12 passed | 68/68 passed |
| --separate-modules --rgb | 12/12 passed | 68/68 passed |

Each path also passes the six version-checker regressions. The additional pure
case uses seven fixed sampler choices to check different pairs, per-reader
no-repeat, palette reachability and exactly two bounded draws per pair.
Two new firmware cases exercise 32 seeds, 100 ticks per mode and both all-target
random command spellings. They check initial pairs, menu/help/result transitions,
999/1,000 ms, 149/150 ms and 499/500 ms edges, literal GPIO channel outputs,
per-reader Serial labels, millis rollover, delayed-loop logging and unchanged
stopwatch/score/NVS. Existing single-reader random and full ordered-cycle tests
remain active.

C++11 warnings-as-errors, AddressSanitizer and UBSan remain enabled; LeakSanitizer
is disabled for this managed runtime. `git diff --check` and
`python tools/check_version.py --previous-version v1.1.0` pass.

## ESP32 builds

`pio run -e esp32dev -e esp32dev-rgb -j 4` completed with exit code 0; both
configurations SUCCESS and no compiler warning/error in the build log.

| Environment | Static RAM | Flash |
|---|---:|---:|
| esp32dev | 22,812 / 327,680 | 338,933 / 1,310,720 |
| esp32dev-rgb | 22,812 / 327,680 | 338,985 / 1,310,720 |

PlatformIO Core 6.1.18, Espressif32 6.12.0, Arduino ESP32 2.0.17,
MFRC522 1.4.12 and hd44780 1.3.2, using the existing isolated cache.

## Physical checks and preserved behaviour

No USB upload or physical ESP32/RFID/LCD/button/RGB test was performed here.
After pulling, Upload esp32dev-rgb and confirm v1.1.1 with `version`. Use
`test/led/random` to inspect both LED colours simultaneously, then `test/stop`
to return to the menu and inspect the slower different-colour pairs.

The ordinary-LED default and GPIO mapping remain unchanged. Purple gameplay
hints, fixed/ordered colour tests, three synchronous feedback blinks, two-card
scoring, stopwatch, question bank, shape IDs, saved UID/NVS, setup/loop and
PlatformIO environment definitions are preserved. In ordinary-LED mode all
non-OFF colours still map to ON; the different-colour display requires RGB.

Earlier evidence is preserved in
[the v1.1.0 archive](docs/archive/VERIFICATION_2026-10-25-version-1.1.0.md).
