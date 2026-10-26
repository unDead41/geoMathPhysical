# Own Auth session metadata

Apply `supabase/migrations/20261026090539_geodecoder_security_sessions.sql`
to the existing GeoDecoder Digital project after its base schema. The migration
is additive and repeatable. It creates two functions and notifies PostgREST to
reload its schema; it does not change Auth settings, users, sessions, refresh
tokens, existing application functions or tables. Fresh installations also run
this migration after `../schema.sql`.

The only exposed endpoint is `rpc('geo_security_sessions')`, with **no
arguments**. PostgREST verifies the caller's JWT. A private definer then derives
the account from `auth.uid()`, derives the current session from the verified
`session_id` claim, and requires that the corresponding non-expired Auth record
belongs to that account. A public invoker wrapper exposes the narrow result;
neither anonymous callers nor frontend roles receive Auth table privileges.
No service key belongs in the frontend.

The JSON result contains:

- `server_now`: database observation time.
- `capabilities.revoke_individual`: always `false` for this implementation.
- `sessions`: at most 100 records, current session first, then newest starts.
  Each record contains only `is_current`, `started_at`, bounded `user_agent`
  and `status` (`recorded` or `expired`).
- `truncated`: whether additional rows exist beyond the bounded result.

`recorded` means only that Auth retains the row. It does not prove that a
browser is online, recently used, or still refreshable under every project
policy. `expired` means its explicit `not_after` has passed. Device/browser
inference from `user_agent` is an estimate. Refresh timestamps, IP addresses,
locations, raw account/session IDs and all tokens are omitted.

The endpoint provides **no revocation mutation**. Current documented Auth APIs
support `signOut({scope:'local'})`, `signOut({scope:'others'})`, and
`signOut({scope:'global'})`; `others` revokes every other session, not one
selected session. Already issued access JWTs may remain valid until expiry.
The metadata endpoint also checks current-session existence so a revoked
session cannot continue reading these sensitive metadata with a surviving JWT.
This check does not change authorization of other application APIs.

Local verification:

```sh
cd digital
node --test --test-concurrency=1 tests/active-sessions-backend.test.mjs
```

These tests execute real PostgreSQL in PGlite with synthetic Auth tables and
JWT-claim fixtures. They verify SQL authorization and projection behavior;
they do not prove hosted Auth login or revocation. Hosted deployment, advisory
checks and real session tests are separately recorded in the feature report.

Official references checked 26 October 2026:

- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/signout
- https://supabase.com/docs/reference/javascript/auth-admin-signout
- https://supabase.com/docs/guides/database/functions

The migration filename was generated with `supabase migration new
geodecoder_security_sessions`, rather than inventing a migration timestamp.

For a separately authorized hosted lifecycle check, create two dedicated QA
accounts through the documented Admin API or Studio. Do not seed password-bearing
users directly into internal Auth tables. Keep their credentials in an external
mode-0600 file and use the explicit `temporary-fixtures-only` guard in
`verify-live.mjs`. The script accepts only reserved session-QA addresses, signs
in three isolated SDK clients, verifies the two same-account sessions and the
other account boundary, then checks actual refresh rejection after `others`.
It emits no tokens or credentials and does not create/delete users. Admin-created
QA users must be removed by the same authorized admin after testing. Browser
profiles, native keyboard and rendered 320px checks are separate from this script.

For those manual browser checks without a workspace server, download the portable
[GeoDecoder_Session_QA.html](qa/GeoDecoder_Session_QA.html). Read
[qa/README.md](qa/README.md) for approved-account setup, rebuild instructions,
privacy boundaries and the two-profile sequence. It creates no accounts and
uses no controlled session responses.
