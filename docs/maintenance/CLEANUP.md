# Repository consolidation and cleanup

The 6 November 2026 cleanup keeps one active source branch, `main`, in `unDead41/geoMathPhysical`. Each original head is recorded in [CLEANUP.json](CLEANUP.json) and retained as commit ancestry. Only reviewed, unchanged redundant branch refs may be retired, after the current main passes CI and the archive tag is verified.

- All Physical branch histories are consolidated; sharing firmware already matches main byte-for-byte.
- Windows installer templates are retained once and generate a reproducible sharing ZIP from current main.
- The unique audio script pack uses current SOLID/NET metadata, retaining all 30 original speech texts; no MP3 or playback is claimed.
- Inactive pre-architecture C++ fixtures and completed repository-migration executables are removed; live tests and all printable assets remain.

Original PDFs, printable resources, mockups and runtime offline assets keep their original Git blobs. Historical screenshots/logs remain associated with their original reports, even when two observations have equal bytes. Only obsolete migration executables, completed one-off workflows and explicitly inactive fixtures are removed. The repository-split provenance remains under `docs/archive/repository-split-20261106/`.

The archive tag is `archive/physical-before-cleanup-20261106`. To recover a historical branch, fetch that tag and create a review branch from the recorded SHA. Port needed source onto current main; do not restore an old mixed-platform tree.
