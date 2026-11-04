# Google-only authentication release v2.10.0

Integration base: `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`.
Provider input: `28ba888ccaae12f842dd4abae618a51cb60cd1f2`.
Target source: `unDead41/geodecoder`, `main-digitalized`.
Target Pages: `unDead41/geodecoder-digital`, `main-digitalized`.
Module v1.6.2 remains byte-identical to its existing pin. Firmware `main`
`25836eb1a6f24459aace8a3980ae880a13e3b488` is outside this change.

## Result

- Merge Google/provider profile behavior into the current account, profile and
  security layouts. Email/username and existing recovery paths remain available.
- Remove phone forms, OTP state, timers and SDK send/verify operations from the
  shipping client. Direct legacy phone actions fail closed without networking.
- Provision first Google profiles with the deployed owner-bound RPC. Preserve
  existing profiles/roles on retries and reject stale or cross-session results.
- Keep Google-only password handling with Google, while retaining app session
  controls and password forms for email-linked accounts.
- Fix two reviewed regressions with failing-then-passing tests: native browser
  fetch receiver binding, and Google retry after a cancelled/error callback.

## Hosted evidence

Read-only Auth settings report Google/email enabled and phone disabled. The real
preview button reaches Google's Sign in page for the configured client, with
the Supabase callback and canonical Pages return destination.

Read-only SQL confirms the profile RPC and authenticated-only privileges. The
existing hosted provider migration `20261104061744` matches its original source
SQL byte for byte; archive that observed fact in `supabase/hosted-history.json`.
No migration, OAuth credential, provider setting or Edge Function changed during
this release. Historical generic provider SQL remains immutable.

## Verification

- Exact integration snapshot: 497 tests passed before editing.
- Final complete regression suite: **541 passed, 0 failed** after both fixes.
- Final Google/profile/account/email/security/workspace suite: 85 passed,
  including both new regression cases.
- Application build, Pages preparation, standalone parity, syntax, IDs, ARIA,
  canonical token generation and pinned module hash checks passed.
- Native browser: BM/English sign-in and signup show Google without SMS;
  Google button opens the real Google Accounts sign-in page.
- Receiver probe: native fetch called as a cloud-object method reproduced
  `Illegal invocation`; the detached call returned HTTP 200.

The managed preview server injected development markup into an embedded module
closing-body string. A scratch preview copy escapes that one literal for QA;
tracked output is built normally and is checked independently. The probe,
preview manifest and scratch copy are excluded from the Git change.

Personal Google credentials/consent and real profile creation were not performed.
Successful SDK callback/session/URL cleanup and SQL provisioning are exercised by
the real pinned SDK and database fixtures. Cancelled callback text still uses
the existing generic email-link error wording; returning to login permits retry.

## Publication

Build from this integrated tree, publish only the PWA frontend/audio/icons to the
public mirror, record its exact source commit and asset hashes in `release.json`,
and verify the Pages deployment plus live HTML hash. Source is updated through
an expected-head ref check, preserving both input heads as parents. The local
materialization commit is a test-workspace baseline, not published history.
