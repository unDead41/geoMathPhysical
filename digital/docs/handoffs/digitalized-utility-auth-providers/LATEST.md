# Google and Phone Auth handoff

Date: 4 November 2026 (Malaysia). Repository: `unDead41/geodecoder`.
Work branch: `digitalized-utility-auth-providers`.
Base: `main-digitalized` / `ef697c86a5bfdf5a5658c3df92bce1d7f3f88652`.
Runtime baseline: Digital v2.9.0; module v1.6.1.
Firmware `main` was inspected at `25836eb1a6f24459aace8a3980ae880a13e3b488`, v2.0.2; no firmware changes.

## Behavior

- Existing email/username login and email recovery remain available.
- Google uses the existing SDK session owner and the canonical HTTPS callback.
  Its authorize URL is restricted to the configured project's Auth endpoint.
- SMS login accepts formatted Malaysian/international numbers, requests a
  six-digit SMS OTP, enforces a 60-second local resend cooldown and respects
  server errors. OTP values remain transient and are erased on completion,
  failure, rerender, navigation and page hide.
- OTP verification uses an isolated nonpersisting SDK before the shared owner
  adopts its session under the existing session mutation lock. Late requests
  cannot overwrite a newer account or reverse a logout.
- A signed-in account lacking a profile sees the first-profile form. The new
  authenticated RPC requires a confirmed canonical Google or phone identity.
  It returns the existing profile on retries and never changes an existing role.
- Google/phone-only account security shows provider guidance and session actions.
  Phone-only profiles display the Auth phone and confirmation state.

## Backend rollout dependency

Apply `supabase/migrations/20261104053103_geodecoder_auth_providers.sql` before
using the provider frontend against a hosted project. The canonical fresh schema
contains the same definitions. `digital/backend/auth-providers/verification.sql`
contains read-only post-migration checks. No hosted migration was applied in
this task. The complete setup is in [AUTH_PROVIDERS.md](../../AUTH_PROVIDERS.md).

Observed hosted status: Google false, Phone false, both Google credentials empty,
SMS provider Twilio with credentials empty. Site URL and redirect allowlist already
match `https://undead41.github.io/geodecoder-digital/`. The public settings GET
also confirmed both providers disabled. Configure secrets directly in Supabase;
never put them into frontend config or Git. See [status receipt](../../auth-providers-evidence/provider-status.json).

## Verification

187 relevant tests pass across provider helper/UI/real SDK contracts, PGlite SQL,
existing email/recovery/profile/security, session ownership and offline binding.
This is a targeted auth regression run, not the repository's entire test suite.
The exact TAP output is [unit.tap](../../auth-providers-evidence/unit.tap).

`npm run build`, `npm run prepare:pages` and `npm run check` pass, including
standalone alias parity, inline JavaScript syntax, module pin, design tokens,
question bank fidelity and 183 unique IDs. Logs are in
[build.log](../../auth-providers-evidence/build.log),
[publication-check.log](../../auth-providers-evidence/publication-check.log) and
[check.log](../../auth-providers-evidence/check.log).

Browser inspection confirms the account choices, phone form, local blank-number
validation and BM/English labels on the built app. The managed preview's injected
development script required escaping an embedded module closing-body string in
the scratch preview copy only; tracked source/artifacts were not adapted.
Real Google consent, SMS delivery and OTP login require the missing provider
credentials and were not exercised. No real SMS was requested.

Only this feature branch is published. `main`, `main-digitalized`, the public
mirror and Pages are outside this push. Generated files are rebuilt from the
source and included for branch review; preparing artifacts is not deployment.
