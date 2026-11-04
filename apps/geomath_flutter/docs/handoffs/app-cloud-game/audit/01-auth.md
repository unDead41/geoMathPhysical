# Auth, profile and protected session audit

4 November 2026. Status: **BLOCKED — foundation not READY**. This is source audit evidence; no Flutter implementation, scaffold, shared types, dependency installation, APK or native callback test is delivered.
Worker branch: `app-cloud-game-worker-1-7395917`; initial working tree clean. Only this handoff is changed.
The lead verified `app-foundation` and `app-learning` absent (404); `apps/geomath_flutter/docs/FOUNDATION_CONTRACT.md` and `apps/geomath_flutter/docs/FOUNDATION_READY.json` are absent locally. Resume implementation only from the same verified READY SHA as learning.

## Inspected sources

Repository `unDead41/geodecoder`; full source pins:

- **A** instruction/app and baseline Digital: `38f061af963256528d5060ff076bae9ee05eafc3`, Digital 2.9.0, module 1.6.1.
- **P** provider branch `digitalized-utility-auth-providers`: `28ba888ccaae12f842dd4abae618a51cb60cd1f2`; fetched through GitHub connector, current branch head independently verified equal.
- **M** current `main-digitalized`: `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital 2.9.1. Cloud/security blobs match A; session presentation changed while validation, payload and revocation semantics remain the same.
- Current firmware `main` inspected read-only at `25836eb1a6f24459aace8a3980ae880a13e3b488`, v2.0.2. A inherits firmware v1.1.3; no firmware/version change is made.

| Source permalink (pin) | Git blob SHA |
|---|---|
| [cloud.mjs (A)](https://github.com/unDead41/geodecoder/blob/38f061af963256528d5060ff076bae9ee05eafc3/digital/dist/cloud.mjs) | `b1de83046ced49e5318c9463906f0d44ac6a77f9` |
| [account-security.mjs (A/P)](https://github.com/unDead41/geodecoder/blob/38f061af963256528d5060ff076bae9ee05eafc3/digital/dist/account-security.mjs) | `cd4a8c5f3411cef8fd07f6e1e570115602c7425d` |
| [active-sessions.mjs (A/P)](https://github.com/unDead41/geodecoder/blob/38f061af963256528d5060ff076bae9ee05eafc3/digital/dist/active-sessions.mjs) | `65d027a936612045d69647557167070d1d2745c5` |
| [active-sessions.mjs (M)](https://github.com/unDead41/geodecoder/blob/37bc2cd262cc0a54e8ee31339ea37471c1ecfda5/digital/dist/active-sessions.mjs) | `edb75ec9acb3ea2748199578392031b30230441b` |
| [Auth gateway (A)](https://github.com/unDead41/geodecoder/blob/38f061af963256528d5060ff076bae9ee05eafc3/digital/backend/auth/index.ts) | `98a4c49aff9f4a0dda7f0e555ff5cc6144cbdf8e` |
| [portal.mjs (A)](https://github.com/unDead41/geodecoder/blob/38f061af963256528d5060ff076bae9ee05eafc3/digital/dist/portal.mjs) | `4e4b558cb624bac52ecbbe36d7585e35c82a5f0a` |
| [schema.sql (A)](https://github.com/unDead41/geodecoder/blob/38f061af963256528d5060ff076bae9ee05eafc3/digital/backend/schema.sql) | `bd2d7e00fa3971ea6cf18965555b11976851d7c2` |
| [Session RPC migration (A)](https://github.com/unDead41/geodecoder/blob/38f061af963256528d5060ff076bae9ee05eafc3/digital/backend/security/supabase/migrations/20261026090539_geodecoder_security_sessions.sql) | `c441473dba0934e1eab1e14e4548b61f84d5c52b` |
| [AUTH_PROVIDERS.md (P)](https://github.com/unDead41/geodecoder/blob/28ba888ccaae12f842dd4abae618a51cb60cd1f2/digital/docs/AUTH_PROVIDERS.md) | `68badc1f58ef585e3dbd6d4eb7e4915cda9d185e` |
| [Provider handoff (P)](https://github.com/unDead41/geodecoder/blob/28ba888ccaae12f842dd4abae618a51cb60cd1f2/digital/docs/handoffs/digitalized-utility-auth-providers/LATEST.md) | `f569d93626d4bc827b4cdfc63a64a877d8f40b36` |
| [cloud.mjs (P)](https://github.com/unDead41/geodecoder/blob/28ba888ccaae12f842dd4abae618a51cb60cd1f2/digital/dist/cloud.mjs) | `71c51c19c7901755abee579b8d172a912695b148` |
| [auth-providers.mjs (P)](https://github.com/unDead41/geodecoder/blob/28ba888ccaae12f842dd4abae618a51cb60cd1f2/digital/dist/auth-providers.mjs) | `a7518f2be8877e312eaa8e758505b56ca67ecf89` |
| [Provider portal (P)](https://github.com/unDead41/geodecoder/blob/28ba888ccaae12f842dd4abae618a51cb60cd1f2/digital/dist/portal.mjs) | `82a6830c6341e9fb9430c5933bb36511965fe0ca` |
| [Profile completion migration (P)](https://github.com/unDead41/geodecoder/blob/28ba888ccaae12f842dd4abae618a51cb60cd1f2/supabase/migrations/20261104053103_geodecoder_auth_providers.sql) | `e864122b53fb4ab3cd46fbb9053d41a2db739d86` |

Root AGENTS/versioning, Prompt 3/COMMON_RULES, app SOR C01/C05/N01–N02/O02/O05, architecture/UX/design/screens/test plan, integration-sync README/SQL_ORDER and email/profile/security contracts were read. Historical package snapshots do not supersede these pins or the latest product decision to drop SMS.

## Exact account wire contracts

`POST {config.url}/functions/v1/geodecoder-auth`, headers `apikey: publishableKey`, `Content-Type: application/json`; JSON below. The app sends no service key. Baseline timeout is 20 s. The server keeps privileged credentials in Edge secrets.

| Operation | Exact body / SDK call | Success and rejection contract |
|---|---|---|
| Login | `{action:"login",username,password}`; `username` accepts email or handle | `{session}` containing SDK access/refresh tokens; HTTP 401 generic credentials failure; 403 email not confirmed. Adopt through the protected SDK owner. |
| Signup | `{action:"signup",username,password,email,display_name,role}` | `{confirmation_required:true,email,message}`; no authenticated session. Normal Auth signup plus transactional profile trigger; no admin auto-confirm. Username collision 409. |
| Legacy recovery | `{action:"recover",username,password,recovery_code}` | 32 hex recovery code; only legacy `@accounts.geodecoder.invalid` identities. Success `{message}`, no session; email accounts must use email links. Invalid code/identity 400. |
| Email recovery | `auth.resetPasswordForEmail(email,{redirectTo})` | Non-enumerating authored message. This is a link request, not email OTP. |
| Resend confirmation | `auth.resend({type:"signup",email,options:{emailRedirectTo}})` | Non-enumerating authored message; SDK 429/send limits get safe feedback. |
| Profile read/save | RPC `geo_action` with `{action:"snapshot",payload:{}}` / `{action:"update_profile",payload:{display_name,avatar}}` | Requires self profile. Extra save fields, role/username/target IDs rejected: `invalid_profile`; invalid name/avatar: `invalid_name` / `invalid_avatar`; unauthenticated/profile missing: `unauthenticated` / `profile_missing`. |

Gateway handles are trimmed/lowercased, regex `^[a-z0-9_]{3,24}$`. Email is trimmed/lowercased, at most 254 characters, valid address shape and excludes the legacy suffix. Password stays verbatim, 10–128 JS UTF-16 units; login UI is looser at the minimum, so retain the gateway requirement. Signup display name is trimmed, 2–60 JS UTF-16 units; profile save/completion use Unicode character count and reject controls. Preserve this observed distinction rather than claiming validators already agree.
`role` is exactly `teacher` or `student` at account creation. After creation, server private profile role is authoritative and immutable; editable metadata/routes do not grant permissions. Save avatars: `initial`, `cube`, `cuboid`, `pyramid`, `cylinder`, `cone`.
Edge failures are `{error:string}` without stable error codes: HTTP 400 validation, 405 method, 413 body over 4096 characters, 429 rate limit, 503 unavailable. Do not invent RPC-style codes for these responses. Rate guards are signup 100 / other auth 180 per IP per 600 s, plus 20 per normalized account per 600 s; no structured Retry-After is supplied by this gateway.
Existing profile drafts preview locally. Save/discard/stay is explicit; failed, empty or wrong-account responses must preserve the draft and block pending navigation. Header changes only after acknowledged matching profile. Account switch discards old drafts/destinations; shared settings can open without losing the draft.

## Session adoption, recovery and native callbacks

- `securitySessionKey` is user ID plus JWT `session_id` (fallback token in web source). Legitimate refresh of the same session must preserve native actor identity; a new session, logout, account or scope switch invalidates old work.
- `_boundRpc` rechecks SDK ownership before and after each request, freezes the matching bearer token in Authorization before releasing the mutation lock, uses a 20 s deadline and rejects late `session-changed` results. Snapshot cache hits also validate ownership; retryable SDK refresh errors remain `network`, not a transfer to another owner.
- **Reproduced source gap:** A `cloud.mjs:139–143` fetches an email/username login before taking the session-install lock, then installs the returned session without comparing the request's original epoch/identity. A delayed login A overwrote a newer SDK login B in an actual SDK fixture. Native auth must serialize mutation intents and reject stale gateway/callback adoption; copying the installation lock alone is insufficient. No Digital file was changed.
- One protected SDK persistence owner must handle init, login/logout, provider adoption and recovery. Credentials never enter SQLite/outbox, WebView, UI serializable state, logs, screenshots or support reports. Guest partition and each account's pending records remain separate; auth operations are never queued offline.
- Web source uses `flowType:"implicit"`. Callback inspection accepts access+refresh tokens with bearer type and positive expiry in the fragment, then awaits validated SDK `SIGNED_IN` / `PASSWORD_RECOVERY`; route/query text alone never authorizes reset. A query `code`/`token_hash` is detected and rejected by this web inspector, not exchanged as native PKCE.
- Callback credentials/errors are scrubbed from URL after handling. A recovery navigation intent stores only user ID, session ID and a 30 min expiry; reload rechecks the same session with server `getUser`. Changing session invalidates reset permission; same-session token refresh preserves it. The intent itself is not authorization.
- **Native routing dependency:** the Edge signup gateway hardcodes `https://undead41.github.io/geodecoder-digital/` for confirmation. Client recovery/resend and Google use configured redirect or that web default. A native manifest alone cannot change signup delivery; backend owner must approve an allowlisted native callback or a verified web handoff before native confirmation can be accepted. No callback URI/package identifier is invented here.
- Test cold/warm/process-recreated starts, duplicate/reused/expired/malformed/cancelled callbacks, ordinary login trying reset, account switch during callback/adoption, and a callback received after logout. Validate with the frozen SDK/platform configuration before routing; keep callback processing single-owner and idempotent.

## Security actions and active sessions

Security uses an isolated nonpersisting SDK client: verify original token with `getUser`, check returned user ID, and for password change reauthenticate the verified server email with `signInWithPassword({email,password:current_password})`. Both returned IDs must match; `updateUser({password,current_password})` executes on that temporary verified session. No persistent session replacement occurs during verification; cleanup has an independent 5 s deadline.

| Action | Exact SDK operation / scope | Required acknowledgement |
|---|---|---|
| `change-password` | Values `{current_password,password,password_confirm}`; update above | Matching user result; lost response is `outcome-unknown`, never auto-repeat. |
| `reset-password` | Values `{password}`; `updateUser({password})` on verified recovery session, then global sign-out | Recovery authorization required, not raw `/auth/reset`; `password-updated-logout-failed` is distinct if update succeeded but revocation failed. |
| `logout-current` / ordinary `logout` | `signOut({scope:"local"})` | Security action verifies actual scoped HTTP response; ordinary logout is the simpler SDK local path. |
| `logout-others` | `signOut({scope:"others"})` | Keep current session; affects all other sessions, including rows beyond the display limit. |
| `logout-all` | `signOut({scope:"global"})` | Clear only the still-matching local actor after confirmed server revocation. |

Security logout actions accept no selector fields. Observed 2xx at the configured project's `/auth/v1/logout?scope=...` is mandatory; swallowed SDK 401/403/404 must not become success. Existing access JWTs can remain valid until expiry after refresh-session revocation. Do not claim instant revocation across all class APIs.
Stable security errors: `invalid-input`, `reauth-failed`, `session-expired`, `session-changed`, `same-password`, `weak-password`, `rate-limit`, `unsupported`, `cancelled`, `busy`, `network`, `outcome-unknown`, `unconfirmed-logout`, `password-updated-logout-failed`. Map authored safe messages; preserve field association and unknown-outcome state without exposing provider text.
RPC `geo_security_sessions` takes exactly `{}`. The server derives user/session from verified JWT claims and requires its current unexpired Auth session row. Reply: `{server_now,capabilities:{revoke_individual:false},sessions:[{is_current,started_at,user_agent,status}],truncated}`; at most 100 rows, exactly one current `recorded` row, status `recorded|expired`, nullable start/UA, UA bounded to 512. No session ID, user ID, IP, tokens or learner last-activity fields.
Session metadata is memory-only, cleared on failed read/navigation/account change; labels are estimates, not online presence. Render current first and dates in Malaysia time. Individual row revocation is unsupported. Missing RPC/42501 → `sessions-unavailable`; 401/PGRST301/PGRST303 → `session-expired`; malformed reply → unavailable or expired per validator. Do not broaden RPC grants to unblock UI.

## Provider candidate and capability gates

P checks `GET {url}/auth/v1/settings` with public `apikey`, `cache:"no-store"`, 10 s timeout; only `external.google === true` enables a Google attempt. Source notes on 4 November report Google/Phone disabled and credentials empty; this is a historical receipt, not a fresh hosted status check or deployment receipt.
Google SDK request: `signInWithOAuth({provider:"google",options:{redirectTo,skipBrowserRedirect:true,queryParams:{prompt:"select_account"}}})`. Validate returned URL against the configured project origin, `/auth/v1/authorize`, provider `google`, exact `redirect_to`, no URL credentials/hash. Native launch/callback adaptation must follow the eventual pinned SDK. No additional OAuth scopes or client secrets belong in the app.
Provider-only profile/security views use matching Auth user contact/confirmation fields for presentation and provider guidance instead of assuming every account has a password. Existing server authorization still controls security actions.
When authenticated snapshot reports `profile_missing`, P shows first-profile completion and blocks class flow until a matching snapshot is accepted. RPC is exactly `geo_complete_profile({username,display_name,role})`; no user ID, provider claim or extra metadata is sent.
Migration `20261104053103_geodecoder_auth_providers.sql` grants authenticated execute only (anon and service_role denied). It locks `auth.users` for `auth.uid()`, returns an existing profile unchanged on retry, then requires canonical confirmed Google email plus matching `auth.identities`, or confirmed phone plus matching phone identity. Editable metadata is not identity proof. New Google profile + private legacy identity marker insert atomically; phone-only creates no synthetic email/legacy identity. Existing profile role/name are never replaced by completion retries.
RPC errors: `auth_required`, `auth_identity`, `invalid_account`, `username_taken`. Client mapping: auth identity → `session-changed`; invalid account → `profile-invalid`; collision → `username-taken`; missing function `PGRST202`/`42883` or `profile_missing` → `profile-unavailable`. Other provider codes/status map safely to `provider-unavailable`, `provider-cancelled`, `rate-limit`, `session-expired`, `network`, `auth-failed`/`profile-failed`. A source migration/test PASS does not prove hosted availability.
**SMS product scope:** excluded from current Flutter implementation. The optional observed P capability uses normalized E.164/Malaysian numbers, `signInWithOtp({phone,options:{channel:"sms",shouldCreateUser:true}})`, six ASCII digits via isolated `verifyOtp({phone,token,type:"sms"})`, guarded adoption and local 60 s resend cooldown. Keep it disabled unless separately requested and actually enabled; retain only this source contract for future review. No real SMS, OTP, account, Google consent, hosted migration or Auth/SMTP setting was requested or changed here.

## Foundation requirements and implementation acceptance

Use the eventual frozen definitions; names below are requirements from COMMON_RULES, not newly declared Dart signatures.

1. `ActorBinding` current value/stream with stable guest/owner partition, nullable user ID, session ID, epoch and scope; no credentials. The concrete auth adapter owns binding changes; session refresh is distinguished from replacement.
2. Protected `SessionStore` with one SDK persistence owner, atomic adoption/clear, recoverable read/write failure, serialized auth mutation boundary, and callback/recovery intent lifecycle. Protected persistence failure must not announce a successful durable login.
3. `Result<T>`/`AppFailure` handling for unavailable, unauthorized, stale, storage failure, cancellation, retry-after and unknown outcome; transport supports explicit bound Authorization, cancellation/deadline and injected clock. Never replace source codes by raw exception strings in UI.
4. `FeatureContribution` registration for auth/profile routes, localisations and factories; shared forms, pending/error notices, save/discard/stay confirmation and focus/back policy. Integration owner supplies public config, approved native callback registration and chosen SDK/dependency versions. Feature worker must not edit global router/pubspec/platform manifests independently.
5. Tests after READY: stale gateway adoption repro must become rejection; A→B and same-user/new-session races at every await; SDK refresh with same session; logout cleanup preserving newer login; protected-store failure/reopen; provider/RPC unavailable; no-role-escalation; profile Unicode/bounds/extra fields; lost password-update response; real scoped logout acknowledgement; malformed/truncated session lists; cold/warm/duplicate/reused recovery. Native widget/device/hosted results remain separate.

## Fresh source verification

Node `v24.22.1`; reused read-only existing dependencies `@supabase/supabase-js 2.118.0`, `@electric-sql/pglite 0.5.11`, `jsdom 30.1.3`; none installed. Tests ran in isolated scratch copies. Provider files/imported dependencies were fetched at P and verified against returned Git blob hashes. SDK HTTP fixtures and PGlite synthetic Auth are local simulations, not hosted Auth.

Baseline A command (cwd `/workspace/scratch/7395917c0f68/auth-source-audit/baseline`), exit **0**, **112 passed / 0 failed / 0 skipped**:

```sh
node --test --test-concurrency=1 digital/tests/auth.test.mjs digital/tests/email-auth.test.mjs digital/tests/email-cloud.test.mjs digital/tests/portal-auth-validation.test.mjs digital/tests/profile.test.mjs digital/tests/profile-backend.test.mjs digital/tests/profile-portal.test.mjs digital/tests/security-cloud.test.mjs digital/tests/security-sdk.test.mjs digital/tests/security-portal.test.mjs digital/tests/security-cleanup-race.test.mjs digital/tests/active-sessions-backend.test.mjs digital/tests/active-sessions-cloud.test.mjs digital/tests/active-sessions-portal.test.mjs digital/tests/active-sessions-qa.test.mjs digital/tests/cloud-session-binding.test.mjs
```

Provider P command (cwd `/workspace/scratch/7395917c0f68/auth-source-audit/provider-28ba888`), exit **0**, **52 passed / 0 failed / 0 skipped**:

```sh
node --test --test-concurrency=1 digital/tests/auth-provider-helpers.test.mjs digital/tests/auth-providers-cloud.test.mjs digital/tests/auth-providers-backend.test.mjs
```

Logs: `/workspace/scratch/7395917c0f68/auth-source-audit/baseline-unit.tap` and `/workspace/scratch/7395917c0f68/auth-source-audit/provider-unit.tap`.
Additional controlled reproduction from baseline cwd: `node digital/repro-login-adoption.mjs`, exit **0** confirms the source defect (`staleGatewayOverwroteNewerAccount:true`), not a passed security guarantee. Sanitized evidence: `/workspace/scratch/7395917c0f68/auth-source-audit/login-adoption-repro.log`. Existing suite success does not cover this scenario.
`python tools/check_version.py` exit **0** confirms inherited v1.1.3 consistency only; current main is v2.0.2. Document whitespace check also passed (exit **0**). No Flutter analyze/test/build, Android, physical device, real delivery/consent or hosted lifecycle result is claimed. Blockers remain foundation freeze, protected store/native callback contracts, signup callback routing, and independently verified provider/RPC activation.
