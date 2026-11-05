# Integration source and ancestry audit

Audit date: 5 November 2026 (Malaysia). This audit establishes source provenance; it does not establish Android, hosted service or visual acceptance.

## Remote refs inspected

| Ref | Exact remote commit |
| --- | --- |
| app | `38f061af963256528d5060ff076bae9ee05eafc3` |
| app-foundation | `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e` |
| app-learning | `8a5527438ee828a306afba36a337a3ca3bbedb83` |
| app-cloud-game | `33e6734a27db789f04a9a048bf7f69ebd046e016` |
| main | `25836eb1a6f24459aace8a3980ae880a13e3b488` |
| main-digitalized | `752ce908d16d13acc9cc7510797e8363d182c3f5` |

GitHub compare API confirms app is the common ancestor of foundation (+14 commits), learning (+20) and cloud-game (+18), each with zero commits behind. Both features include foundation READY `9a1f49a`; local `git merge-base` returns that exact commit. Source API comparisons are summarized in `ancestry-comparisons.json`.

Relative to foundation, learning changes 77 paths and cloud-game changes 139. Their changed-path intersection is empty; all changes remain inside `apps/geomath_flutter/`. Preserve both feature ancestors in the integration merge. Production registration and shared guard changes are new integration work, not changes taken from one feature over the other.

## Frozen contracts

Both feature commits contain identical verified bytes:

| File | SHA-256 |
| --- | --- |
| docs/FOUNDATION_CONTRACT.md | `0a31f7aef121a151ee91a4ae92250fd893ad62108f27a9389b5fa5ed9a918356` |
| docs/source_lock.json | `cf7d5e6a54c6da65d70f97caae26cff059de558f3fd56db97245252358220452` |
| pubspec.lock | `9ba313c3af1f80193c6c0a61c2e38fcee51f1b5aabb8404ebdccfd04210f542c` |

The source-lock hash applies to the machine-readable lowercase `docs/source_lock.json`, not the explanatory `docs/SOURCE_LOCK.md`. Both source trees retain the same foundation contract and lockfile. Learning owns its changed module submanifest; its current hash must be resolved rather than compared with the old READY manifest snapshot.

## Recovered local Git objects

The execution environment had partial Git object stores and zero free disk. The integrator created its own in-memory bare store and sparse worktree rather than altering feature worktrees. Missing remote commits were reconstructed from GitHub Git Data API metadata using exact raw Git object bytes and accepted only after SHA-1 matched the requested remote object:

- `38f061af963256528d5060ff076bae9ee05eafc3`
- `5ab7102193e070d853c1622f2ae038b2b37a833d`
- `33e6734a27db789f04a9a048bf7f69ebd046e016`
- `6cc470e32f790c1c49e14f0fa0173f0818e3fbfb`
- `ee9a690a279f50765f753c17401eeac8e5fc6aa0`

Their original author/committer timestamps and +0800 timezone offsets, ordered parents, messages and tree hashes remain intact. No ancestry was synthesized. The original app root tree `0df709881a96a4021657fbffc6389a30e54ee1c6`, root .gitignore blob and 22 missing historical cloud-game audit/evidence blobs were restored with independently checked raw-object hashes. Feature runtime objects were already present.

Pre-app historical parent `262e9b92dc824f2a926a1f0ea6e4006776ffad4c` and many unchanged nonapp blobs are not locally materialized. API ancestry establishes the app fast-forward relationship. Preserve existing nonapp tree references; do not replace them with a sparse filesystem snapshot. Local write-tree may use --missing-ok for unchanged known tree entries. A normal GitHub nonforced ref update remains the final fast-forward enforcement.

## Requests requiring integration ownership

1. Register learningFeature() and cloudGameFeatures() once in the production bootstrap, resolve one shared records writer and sync owner, and await startup before presenting normal Home.
2. Apply active contributed BackPolicy before bottom-tab reset. Save failure must offer Stay/Leave without claiming a durable save. Test quick edit, destination change and reopen.
3. Register learning_checkpoints:1, solo:1 and sync:1 through the shared migration composition; no duplicate reflection/outbox schema.
4. Add the Android native callback filter when appropriate, but leave nativeCallbackReady false until real cold/warm/replayed/expired flows and the hosted allowlist are verified.
5. Run feature-specific Android learning/cloud suites and the integrated production target. Previous foundation CI and host-rendered previews do not satisfy these gates.

No shared source, dependency, platform runner, feature runtime or remote ref was modified by this worker. The lead alone integrates and publishes.
