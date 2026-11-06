# Repository consolidation and cleanup

The 6 November 2026 cleanup keeps one active source branch, `main`, in `unDead41/geoMathPhysical`. Each original head is recorded in [CLEANUP.json](CLEANUP.json) and retained as commit ancestry. Only reviewed, unchanged redundant branch refs may be retired, after the current main passes CI and the archive tag is verified.

- All Physical branch histories are consolidated; sharing firmware already matches main byte-for-byte.
- Windows installer templates are retained once and generate a reproducible sharing ZIP from current main.
- The unique audio script pack uses current SOLID/NET metadata, retaining all 30 original speech texts; no MP3 or playback is claimed.
- Inactive pre-architecture C++ fixtures and completed repository-migration executables are removed; live tests and all printable assets remain.

Original PDFs, printable resources, mockups and runtime offline assets keep their original Git blobs. Historical screenshots/logs remain associated with their original reports, even when two observations have equal bytes. Only obsolete migration executables, completed one-off workflows and explicitly inactive fixtures are removed. The repository-split provenance remains under `docs/archive/repository-split-20261106/`.

The archive tag is `archive/physical-before-cleanup-20261106`. To recover a historical branch, fetch that tag and create a review branch from the recorded SHA. Port needed source onto current main; do not restore an old mixed-platform tree.

## Completed verification

The repository now has one active branch, `main`, at firmware v2.0.4. Six historical branches and two preparation branches were retired after the exact-head and archive checks. [The archive tag](https://github.com/unDead41/geoMathPhysical/tree/archive/physical-before-cleanup-20261106) directly retains all seven original heads as parents, plus the preparation history. The archive uses the current reviewed main tree; original file trees are recovered through the recorded original SHAs.

[Main CI](https://github.com/unDead41/geoMathPhysical/actions/runs/42220241261) passed on `0babf592ca83f0ba07e16bf69ac8bd14501b0417`. Both native entrypoint and separate-module RGB modes passed: six version-checker regressions, 14 pure core/application cases and 79 integration cases per mode. Four audio regressions and all 30 original script exports passed. The scripts use current SOLID/NET metadata; no audio MP3 is present or claimed ready.

The sole ESP32 RGB default compiled. The sharing ZIP contains 59 files, with 58 manifest checksum entries; two builds produce identical bytes. PowerShell parsing, all four legacy environment aliases and changed-file rejection passed. The package is generated from main, so no separate sharing firmware branch remains.

All 37 protected firmware/configuration blobs and all eight original PDF/ZIP assets retain their original identities. Only the version header changes firmware bytes. [Branch retirement](https://github.com/unDead41/geoMathPhysical/actions/runs/42220765756) succeeded after checking the version increase from v2.0.3. No USB upload, physical hardware test or actual Windows installation was performed. This completion update changes only the two cleanup records.
