# Native account feature

Foundation contract 1.0.0; app 0.1.0+1. Runtime code stays within auth/profile.
Canonical account behavior was inspected at Digital 2.10.0 commit
`752ce908d16d13acc9cc7510797e8363d182c3f5`:

- `digital/dist/cloud.mjs`, blob `5593d56637bdb36cc8ba43be9f5b0955497b2b65`.
- `digital/backend/auth/index.ts`, blob
  `98a4c49aff9f4a0dda7f0e555ff5cc6144cbdf8e`.
- `digital/docs/AUTH_PROVIDERS.md`, blob
  `fb4b4803357fd031b6dca7e81553b2a0d8c3e673`.

- `digital/dist/account-security.mjs`, blob `cd4a8c5f3411cef8fd07f6e1e570115602c7425d`.
- `digital/dist/active-sessions.mjs`, blob `edb75ec9acb3ea2748199578392031b30230441b`.
- `supabase/migrations/20261104053103_geodecoder_auth_providers.sql`, blob
  `e864122b53fb4ab3cd46fbb9053d41a2db739d86` (historical provider schema;
  the native client exposes Google only).

SMS has been removed. No phone request, OTP form, secret, hosted migration or
provider configuration is included.

## Composition

`authFeature()` contributes namespace `auth`, lazy `AuthServices.repository`
(`auth.repository`) and `AuthServices.gateway` (`auth.gateway`).
`profileFeature()` contributes namespace `profile`, `ProfileServices.repository`
and actor-bound, non-durable `ProfileServices.drafts`. Injected test repositories
are borrowed; the normal composition disposes its native auth adapter.

Startup awaits `AuthRepository.restore()` before starting sync. Concurrent restore
calls share a flight; successful restore is memoized, failed reads/network can
retry. Missing public configuration leaves the original guest binding intact and
makes no network or protected-store request. Expired/malformed stored sessions
return a safe needs-login failure while guest activity remains available.

Routes: `cloud-game-login`, `cloud-game-signup`, `cloud-game-confirmation`,
`cloud-game-recover`, `cloud-game-legacy-recovery`, `cloud-game-reset`,
`cloud-game-security`, `cloud-game-sessions`, and `cloud-game-profile` (`/profile`).
A route alone never authorizes a password reset. `recoveryRequired` is established
only by verified PKCE adoption; UI listeners may offer the reset route afterward.

## Credentials and requests

The foundation SessionController and protected SessionStore remain the only
identity/persistence owners. Native auth intents serialize and invalidate older
results before protected writes/adoption. Credentials are captured before request
awaits; full actor/session/epoch/scope is checked before/after. Refresh retains the
same epoch only when the verified user and JWT session ID remain unchanged.

`CloudGateway.rpc` returns `Failed` for transport, HTTP denial or stale identity;
HTTP-success application denial remains `Success(CloudReply)` with safe
`errorCode`. Error text and nested credential fields are removed. Requests are
single attempts; a network failure of a mutation has an unknown outcome, never an
automatic replay. HTTP 503 and other 5xx failures remain transient network
failures, except unavailable 501; missing RPC 404/405 stays unavailable.
Non-JSON error bodies cannot hide HTTP status or Retry-After. Password
verification uses temporary credentials without
adopting them. Revocation requires actual HTTP 2xx for the exact selected scope.
Recorded sessions are memory-only auth records; individual revocation is absent.

## Native callback/platform integration still required

`nativeCallbackReady` defaults to false. Enabling it requires integrator evidence
for Android VIEW/BROWSABLE/DEFAULT intent handling for
`com.geomath.dev://auth/callback`, and the identical hosted Auth redirect allowlist.
This feature does not edit the manifest or hosted settings. Signup Edge currently
uses its fixed canonical web confirmation redirect; the UI says to complete that
confirmation on the website then return to log in.

The locked Supabase Flutter 2.18.3 / GoTrue 2.27.3 adapter uses PKCE and an external
Google browser, with operation-local SDK clients and no global Supabase instance.
The narrow native link port uses the inspected app_links 7.2.2 platform channels;
revalidate that port when upgrading the locked plugin. Startup attaches one link
subscription only when callback readiness is enabled, handles the initial URI
after protected restore, and coalesces duplicate platform deliveries by digest.

The protected envelope stores only bounded PKCE material and an opaque intent
nonce/kind/30-minute expiry plus original installation/verified session binding.
Cold restore maps it to a fresh actor only for the same stable installation and,
for a signed-in origin, a refreshed and server-verified identical user/session.
New account intents/logout cancel it; expired/foreign/reused callbacks fail. Raw
callback codes are never persisted. Hosted Google consent and Android callback
round trips remain unverified; local fixture tests are not hosted/device proof.
Late platform callback failures cannot publish into a newer actor or intent.

Profile back offers save/discard/stay and rejects stale dialog choices. Frozen
root destination `select()` bypasses feature back policies: the integrator must
add a shared navigation guard for a tab-exit confirmation. Until then, drafts
survive tab unmount/reopen in actor-bound feature memory and clear on any binding
change. Leaving during an unacknowledged profile save retains an unknown-outcome
draft that requires explicit refresh before another save. Drafts do not survive
process death and never enter a sync outbox.

## Local verification

`flutter analyze --no-pub lib/features/auth lib/features/profile test/features/auth test/features/profile`
and `flutter test --no-pub test/features/auth test/features/profile --reporter expanded`.
The suite covers native HTTP fixtures (including the real pinned SDK's PKCE S256
exchange), auth/write races, verified recovery, callback cold/warm/replay/scope,
exact gateway/RPC payloads, safe denials, role/actor isolation, recorded-session
validation, 320dp BM/English light-to-dark 150% draft retention, save/discard/back,
unknown save outcome and tab-return preservation. No hosted mutation or physical
Android/Google-provider round trip is claimed.
