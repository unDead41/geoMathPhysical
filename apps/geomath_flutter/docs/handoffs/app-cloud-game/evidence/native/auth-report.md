# Auth/profile completion

- Branch: `app-cloud-game-native-worker-1`; worktree `native-worktrees/worker-1`.
- App `0.1.0+1`; foundation contract `1.0.0`, READY `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`.
- Parent `41b5774694c83b9d2464df4bbc3bc55046a79dd8`.
- Feature commit `e2bb4474d6502549a78fdbe61b7b2c4928886aa3`, tree `4622e0b801b1305bcfd2c338c1ed6c219dc52711`.
- Final HTTP error follow-up **`848307d3e56b1bdb62cb8c076420fb21c38499e4`**, parent `e2bb4474d6502549a78fdbe61b7b2c4928886aa3`, tree `6a89c8d7408852f551a2a6601fd7938a09974fee`.
- Exactly 24 added files under `lib/features/auth/**`, `lib/features/profile/**`, `test/features/auth/**`, `test/features/profile/**`; clean private worktree. Nothing pushed. No root/core/pubspec/router/platform changes.
- The reconstructed sparse Git repository cannot run normal commit because unchanged `.vscode/extensions.json` blob `a72f1ec63fc7e4e0d8871b5bf1763cf29808e0dc` is intentionally absent. With lead confirmation, used `write-tree --missing-ok`, `commit-tree` and expected-old-HEAD `update-ref`; all changed blobs are present. Lead should publish the feature delta against the existing remote tree.

## Completed behavior

Preserved and finished the existing real native implementation: exact Edge email/username login, signup/confirmation acknowledgement, legacy recovery code flow, link-based recovery, PKCE Google/provider capability gate, protected session restore/refresh, verified recovery reset, password reauthentication without session adoption, actual HTTP-success logout scopes, recorded sessions, gateway RPC, profile completion and mutable fields, BM/English UI and contribution registrations. Google is allowed by actual capability/config; SMS/phone UI and transport are absent.

Auth intents serialize; requests capture credentials and the full actor/session/epoch/scope. Protected writes precede verified actor adoption. Cold callback restoration requires the same installation and, where applicable, the same refreshed/server-verified user/session. Replayed/expired/foreign callbacks and raw reset routes cannot authorize a reset. Canonical provenance remains in `lib/features/auth/README.md` (Digital `752ce908d16d13acc9cc7510797e8363d182c3f5`).

Resume review additionally fixed four regressions: a late auth response touching disposed controllers; late responses clearing a newer actor's password input; obsolete warm callback failures publishing into a new actor; profile tab exits losing unknown-outcome protection during an unacknowledged save. New focused regressions cover each. Profile drafts stay in actor-bound feature memory and clear at identity boundaries.

## Verification

From `apps/geomath_flutter`, using `/workspace/scratch/7395917c0f68/toolchains/flutter/bin/` and existing `/root/.pub-cache` package config:

- `flutter test --no-pub test/features/auth test/features/profile --reporter expanded`: **exit 0, 75 tests passed**, `evidence/auth-resume-tests.log`.
- `flutter analyze --no-pub lib/features/auth lib/features/profile test/features/auth test/features/profile`: **exit 0, no issues**, `evidence/auth-resume-analyze.log`.
- `dart format --output=none --set-exit-if-changed lib/features/auth lib/features/profile test/features/auth test/features/profile`: **exit 0, 23 Dart files unchanged**, `evidence/auth-resume-format.log`.
- Four focused added regressions: **exit 0**, `evidence/auth-resume-regressions.log`.
- `git diff --cached --check` before commit: **exit 0**.

Earlier broad passing suites were not repeated. Only the changed auth/profile suites were rerun. Local HTTP tests include the actual locked GoTrue PKCE exchange; these do not establish hosted or Android callback behavior.

## Required integration wiring

1. Register `authFeature()` and `profileFeature()` once. The default services are real implementations. `AuthServices.repository` (`auth.repository`) is the single credential owner; `AuthServices.gateway` (`auth.gateway`) exposes the same instance as `CloudGateway`. Profile services are `profile.repository` and `profile.drafts`. Borrow foundation SessionController/SessionStore/config only. Injecting a test AuthRepository that is not itself CloudGateway requires an explicit injected gateway.
2. Await `AuthRepository.restore()` before sync starts, and retain the existing guest experience on failure. Failed restore is retryable; concurrent restores coalesce. Initial native URI is handled only after restore when callback readiness is enabled.
3. Routes: `cloud-game-login`, `cloud-game-signup`, `cloud-game-confirmation`, `cloud-game-recover`, **`cloud-game-legacy-recovery`**, `cloud-game-reset`, `cloud-game-security`, `cloud-game-sessions`, `cloud-game-profile` (`/profile`). No migrations, assets or dependencies are added by these features.
4. Keep `nativeCallbackReady:false` until integrator establishes Android VIEW/BROWSABLE/DEFAULT handling for `com.geomath.dev://auth/callback`, appropriate app_links ownership, the identical hosted Auth redirect allowlist, and actual cold/warm round trips. Recovery UI may offer reset only when repository `recoveryRequired` is true. Signup Edge uses its fixed canonical web confirmation redirect; UI describes website confirmation followed by native login.
5. Shared router `select()` bypasses feature back policies. Foundation owner must add a shared tab-exit guard to obtain save/discard/stay confirmation on destination changes. Current fallback preserves exact drafts, and unacknowledged saves require explicit refresh before another save. System/app-bar back already uses the contributed profile back policy.
6. Backend capability/deployment dependencies: canonical `geodecoder-auth`, authenticated `geo_action`, `geo_complete_profile`, `geo_security_sessions`, and GoTrue Google settings/PKCE. Missing or denied services return explicit safe failures; no hosted config/migration is changed.

## Exact remaining limits

No local source, formatting, analysis or auth/profile test blocker remains. Android APK/device smoke and screenshots belong to lead/assembly verification. Hosted email delivery, Google consent, native callback/allowlist round trips, protected Android Keystore behavior, and deployed provider/profile/session RPCs were not exercised by this worker. Drafts intentionally do not survive process death. Individual session revocation is not offered because canonical capability is false. No SMS request, hosted mutation, provider configuration, migration or push was performed.

## Final cross-feature HTTP fix

Commit `848307d3e56b1bdb62cb8c076420fb21c38499e4` changes five owned auth source/test/documentation files. HTTP 503 now follows the transient `FailureCode.network` path; 500/502/504/507/599 are verified on that same existing path. HTTP 404/405/501 remain unavailable, so missing RPCs do not gain automatic retry. The actual NativeAuthRepository performs one mutation attempt only; sync owns bounded retry, while the real GatewayProfileRepository preserves network failure for the existing ProfileScreen unknown-outcome branch.

NativeAuthTransport now preserves all non-2xx status and Retry-After headers before successful-body JSON validation, discarding/cancelling untrusted error bodies. HTML/text 429 and 5xx therefore retain their classification and server retry delay. HTTP 200 still requires valid JSON; the whole-attempt deadline remains tested.

Focused actual-repository, profile, loopback HTTP and existing unknown-outcome UI regressions: **exit 0, 21 tests passed** (`evidence/auth-http-errors-tests.log`). Four targeted checks demonstrably failed before the fix (`evidence/auth-http-errors-before-fix.log`). Scoped analyzer: **exit 0, no issues** (`evidence/auth-http-errors-analyze.log`). Formatter: **exit 0, four files unchanged** (`evidence/auth-http-errors-format.log`). No broad suites were rerun. Sync worker is separately validating actual shared gateway plus durable queue retry/recovery. Private worktree is clean; no push.
