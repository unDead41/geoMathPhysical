# Learning and bundled module verification

Verified candidate `d4a71ee5690bf6f94c358b857fa59eff828a9d99` on private branch
`app-unified-worker-3`, app `0.3.0+4`, on 6 November 2026. Worktree:
`/workspace/scratch/7395917c0f68/app-handoff/worker-3`.

Result: all checks below passed. No production changes or test changes were
needed. The private worktree remains clean. No commit or push was made.

## Commands and actual results

Commands run from `apps/geomath_flutter` unless otherwise specified.

| Command/check | Exit | Actual result |
| --- | --- | --- |
| `DART_BIN=/workspace/scratch/459484a16739/toolchains/flutter/bin/dart node --test tools/contracts/verify_exports.test.mjs test/foundation/native_adapter_contract.test.mjs test/features/learning/bundle/*.test.mjs test/features/learning/surface/*.test.mjs test/features/learning/studio/checkpoint_schema_parity.test.mjs` | 0 | 60 passed; 0 failed, skipped, cancelled or todo |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -v -s tools/android -p 'test_*.py'` | 0 | 7 passed: verified SQLite download/cache fixtures and bounded driver process/receipt behavior |
| `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -v -s tools/android/tests -p 'test_*.py'` | 0 | 29 passed: module scrolling/readiness, paint readiness and log sanitization fixtures |
| `node tools/module/rebuild_bundled_module.mjs` in an isolated temporary repository layout, repeated twice | 0, 0 | Both rebuilt all four shipped files byte for byte; production files unchanged |
| Manifest, catalogue, source-lock and neutral-card integrity probe using Python SHA-256/JSON checks | 0 | All 3 module assets and 15 contract assets match their manifest sizes/hashes; source identities align |
| `git status --short` | 0 | Empty output after checks |

Toolchain: Node `v24.22.1`, Python `3.12.14`, standalone Dart `3.13.7` from the
provided Flutter SDK. The Node test's Dart probe is the checkpoint schema parity
check, not a broad Flutter test run. Python total is **36**, composed of the
separate 7-test and 29-test discovery roots used by the actual CI workflow.

## Preserved content and behavior

- Canonical source: `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, tree
  `ce89242bbf9409c6ccad5129631dfe8ac3a52db8`, Digital `2.9.1`, module `1.6.2`.
- Learning adapter is **4** in the feature manifest. The frozen foundation source
  lock retains adapter snapshot 2; the foundation contract explicitly assigns
  current per-file hashes and later learning updates to the feature submanifest.
- All 11 learning models are present: cube, cuboid, pyramid, cylinder, cone,
  triangular-prism, tetrahedron, pentagonal-prism, hexagonal-prism, sphere,
  hemisphere. The actual bundled runtime boots each across exploration, views,
  notes and calculator. Tests compare all 11 geometries, winding and edges against
  unchanged canonical HTML and check physical surface identity/colors and analytic
  surface sums.
- Five game shapes remain cube, cuboid, pyramid, cylinder, **cone**, with 10 neutral
  solid/net cards. Every face remains `#D5DFEA`; the original 15-question bank,
  explicit RNG/clock corpus and single-attempt behavior pass their canonical checks.
- Actual bundled source tests retain parser/calculator results for cube `a=4`:
  `96 cm²` and `64 cm³`. Source-driven labs, projection/Undo, drafts/checkpoints,
  camera presets, pointer handling, context panels and fractional text scaling pass.
- Wrapper tests retain opaque child source/origin checks, separate protocol-1
  channels, readiness gating/retries, private monotonic sequences, bounded SVG and
  checkpoint validation, stale-message rejection and native session isolation.

## Byte-for-byte regeneration

An inline Python driver copied `tools/module`, the two required contract tooling
files, `docs/source_lock.json` and the canonical HTML into a fresh temporary
`apps/geomath_flutter` layout. It supplied the unchanged root face palette, ran the
real offline builder twice, and compared each output with shipped bytes. The
temporary tree was deleted after verification.

| File under `assets/module/` | Bytes | SHA-256 |
| --- | ---: | --- |
| `canonical-module.html` | 572718 | `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4` |
| `index.html` | 696 | `e8db2197527c325fa2c879a56b3aac8a0dc8fe65c449c154b405d4c9d00c8331` |
| `native-adapter.js` | 814651 | `c5037a779423774d0748c5be68e265b619007183bbd167335a76bd1f925f21c9` |
| `manifest.json` | 1137 | `a54b5d4e0ee4afcb9d5d497e12902e587c8e4ab573e1282ef239907f63de2930` |

The offline builder verifies unchanged canonical HTML and all four pinned frame
dependencies by bytes, SHA-256 and Git blob SHA-1 before importing them. Canonical
contract tests additionally verify the pinned core/questions/duel-state references.
The full Digital source build and its historical 341-test suite were not rerun.

## Integration identity and limits

Combined candidate subtrees match the UI parent exactly for `assets/module`,
`tools/module`, `test/features/learning/bundle` and `tools/android/tests`. Both
parents and the candidate have identical `tools/contracts` and `assets/contracts`
subtrees. This plus the fresh tests/regeneration found no source/tooling break
introduced by the UI import.

The sparse worktree omits root `docs/geomath-app/face_colors.json`; the first
isolation setup therefore stopped before invoking the builder. The candidate tree
does contain palette blob `2c9593e5449c05826faca410f9f4a28e72003b89`. Existing
`/workspace/scratch/459484a16739/app-uiux-refinement/docs/geomath-app/face_colors.json`
has that exact Git blob, so it was copied only into the temporary rebuild layout.
One subsequent inline-driver attempt used the app-relative Git tree query and
failed before the builder; the corrected repository-root query produced the two
successful runs above. Neither setup failure changed tracked files or indicates
a production defect. A complete checkout includes the required palette normally.

No `origin/main` ref is present in this partial Git repository; lead handles the
current remote audit. This worker made no firmware, Digital, backend, dependency,
lockfile, platform or app-version changes. Host Node/Python checks and a Dart
schema probe provide no Android WebView layout, TalkBack, emulator, USB, physical
device, hosted service, APK-build or new screenshot evidence. Broad Flutter tests
and build/device gates belong to the lead's separate receipts.
