# Senarai Sesi Aktif — v2.7.0 candidate

Date: 26 October 2026 (Asia/Kuala_Lumpur). Output branch:
`digitalize/security-activeSession`, explicitly requested by the user.

## Base and implementation plan

- Remote integration: `main-digitalized`, full SHA
  `790d989d666e64f3beabb507cd4140b832696367`, Digital v2.6.0.
- Requested `digitalize-utility-security` redirects to renamed
  `digitalized-utility-security`, head
  `80309ab7bdcddd6a96317f3088d0d8378d121a1f`. GitHub comparison reports
  integration ahead by 25 commits, behind by zero; its merge base is that
  security head. The integration base preserves the complete accepted utility.
- Firmware `main` read-only: `a059979d97926b82cafd4aa5cf3fe59da04a55bb`, v1.1.3.
  AGENTS, SOR, architecture, branch ownership, design, UX, email/Auth and security
  utility documentation were read. No firmware, scoring or account roles change.
- Terminal Git could not authenticate to the private repository. Remote reads
  use the connected GitHub API. Commit and tree objects were reconstructed and
  verified by exact Git SHA; verified cached blobs populated an isolated sparse
  worktree. Paths outside the sparse view remain in the index, without deletion.
  The initial worktree status was clean. No other workspace was modified.

The task's explicit fallback authorizes the selected design: own-session
read-only RPC, estimated labels, and officially supported local/others/global
logout. A per-selected-session button would misrepresent backend capability.
No internal endpoint, fabricated JWT or direct Auth-table deletion is used by
the feature. No extra location service, metadata table or session registry exists.

Plan and review focus:

- [x] Verify hosted Auth columns, current official docs and installed SDK.
- [x] Implement no-argument owner-bound RPC and PostgreSQL authorization tests.
- [x] Integrate transient session state into the existing security page; translate
  authored copy through the existing language catalog and retain password fields
  during independent list refreshes.
- [x] Test stale reads/mutations across accounts and same-account sessions,
  duplicate actions, lost/denied acknowledgement, expiry, retry and focus.
- [ ] Verify two actual browser profiles, native keyboard/reflow at 320px, and
  screenshots; browser-to-workspace connectivity is unavailable.
- [ ] Verify live Auth target refresh rejection using approved temporary QA
  accounts; setup was blocked by automatic approval review.
- [x] Full suite: 267/267 passed with `node --test --test-concurrency=1 tests/*.test.mjs`.
- [x] Build, prepare:pages and static check passed; version checker confirms
  unchanged firmware v1.1.3. Preparing local assets does not publish Pages.
Remote publication is confirmed separately in the final delivery with the full
result SHA, after reading the remote ref back.

## Backend contract and capabilities

`public.geo_security_sessions()` is a no-argument SECURITY INVOKER wrapper for
`private.geo_security_sessions()`. The private helper needs SECURITY DEFINER
only for the internal Auth read, fixes `search_path=''`, and derives both actor
and current session from PostgREST-verified JWT claims. The current session must
still exist, belong to `auth.uid()`, and have no elapsed `not_after`. Missing,
malformed, foreign, removed or explicitly expired current sessions return the
same sanitized `session-expired` code. PUBLIC/anon execute is revoked. Frontend
roles receive no direct `auth` table privileges. No new table requires RLS.

Result fields: `server_now`, `capabilities.revoke_individual=false`, `truncated`,
and up to 100 own records with `is_current`, `started_at`, bounded `user_agent`
and `status`. Current session sorts first and cannot fall outside the limit.
Raw session IDs, user IDs, IP, access/refresh tokens and untrustworthy activity
timestamps are excluded. Device/browser parsing outputs fixed labels only.

`recorded` means an Auth record exists, not that a device is online or its next
refresh is guaranteed. Supabase can retain expired/inactive records until later
cleanup. Only elapsed backend `not_after` produces `expired`. `refreshed_at` is
not learner activity and is deliberately omitted. Dates explicitly use Malaysia
time. No exact device model, location or last-page-activity claim is made.

Current SDK 2.118.0 and official docs expose `signOut` scopes `local`, `others`
and `global`; the admin form requires a valid session JWT. There is no documented
list/revoke-by-session-ID method in the installed SDK. `others` affects every
other session, including any beyond the displayed limit. It never targets just
the row the learner is looking at. The UI explains this before confirmation.

Logout uses an isolated, nonpersistent SDK client bound to the original verified
identity. Success requires an observed 2xx response on the expected project,
`/auth/v1/logout`, and exact scope; suppressed SDK 401/403/404 responses cannot
become success. Logout rejects caller-supplied user/session selectors. Local and
global cleanup recheck shared SDK identity under the existing mutation lock.
Others never clears the current shared SDK session. There is no automatic retry
of a potentially completed revocation. A subsequent list read reflects backend
state; deleting a row from the view never constitutes success.

Revocation prevents further refresh. Issued access JWTs may remain valid until
their `exp`. The new RPC also checks the current Auth row so a removed session
cannot use this sensitive endpoint during that window. This does not retrofit
session-aware checks onto every existing class/progress API.

## UI lifecycle and accessibility

`active-sessions.mjs` owns validation, fixed device labels and rendering.
`cloud.securitySessions()` binds Authorization to the original SDK session,
forwards no selectors and rejects stale responses after an account/session
change. `portal.mjs` owns abortable in-memory list state, requests, confirmation
and view epochs. Logout/account switch/navigation clears metadata immediately.
List refresh replaces only its own region, preserving password input nodes.

Loading, ready/no-other-records, network error, backend-unavailable, expired and
pending-revocation states have specific feedback. Failed reads remove previous
metadata. Refresh and mutation duplicates are suppressed. Confirmation focuses
Cancel; Escape restores its originating control. Refresh temporarily focuses
the region heading and restores its control only if the learner has not moved
elsewhere. Current/global confirmations explain return to sign-in.

Existing portal tokens, focus styles and light/dark themes are reused. CSS wraps
actions, labels and definition lists down to 320px. DOM assertions are not
evidence of actual browser reflow, native key handling or a screen reader.

## Deployment and test evidence

Hosted project: GeoDecoder Digital `fkrlwzxvyufndavlpzbp`, Singapore. Only the
additive read-only session migration was deployed; no Edge Function, Auth setting,
password, role, SMTP, profile, class or learning record was changed.

Source migration (CLI v2.122.0 generated filename):
`backend/security/supabase/migrations/20261026090539_geodecoder_security_sessions.sql`.
Hosted migration history records `20261026091211 / geodecoder_security_sessions`.
The migration API assigns its own execution version. Hosted catalog queries
confirm private definer/public invoker, empty search paths, anon denied and
authenticated execute granted. A no-identity invocation returns session-expired.
Actual hosted HTTP calls reject anonymous execution with 401/42501 and an
invalid JWT with 401/PGRST301. These checks do not establish a valid-user listing
or revocation lifecycle. Postdeployment advisors match the predeployment list;
no new finding was introduced by the migration.
Other installations must apply the same migration after existing base schema;
the shared class/progress dispatchers are not rewritten.

Read-only predeployment advisors had existing private-table deny-by-default
INFOs and an existing leaked-password-protection warning. This change does not
alter those policies or Auth settings.

Controlled tests use the actual pinned SDK with controlled HTTP responses and
JSDOM; backend tests run actual PostgreSQL using PGlite with synthetic Auth
tables. They are separate from hosted Auth lifecycle verification. Two independent
reviews confirmed the API limitation and found/fixed focus restoration and a
post-logout list-refresh account-switch announcement race.

**Live Auth lifecycle blocked:** automatic approval review rejected inserting two
temporary password-bearing QA users into internal Auth tables because persistent
account creation lacked specific authorization and a documented Admin/Studio
creation route is safer. No setup mutation ran. A subsequent dedicated-fixture
sign-in attempt failed before creating any session; it proves no lifecycle claim.
No password/token is included in evidence. No alternate account-creation path
was attempted after rejection. Use approved Admin/Studio-created temporary QA
accounts for `backend/security/verify-live.mjs`; its guarded credential file stays
outside Git with mode 0600, and the script prints sanitized checks only. The
script still uses isolated SDK clients, so two actual browser profiles remain a
separate manual acceptance test.

**Browser evidence blocked:** connected Chrome could not open the workspace
server at `http://127.0.0.1:8769/` (`ERR_CONNECTION_REFUSED`). No screenshot was
fabricated and no public preview was published. A controlled local preview is
available using `npm run preview:security`, then a local HTTP server; its banner
explicitly identifies controlled Auth responses. It uses the real UI and offers
theme and successful/failed/slow/expired request scenarios. The full UI's
BM/English session copy is also covered by the DOM tests.

## Official sources checked on 26 October 2026

- https://supabase.com/changelog?tags=auth (`changelog.md` fetch unsupported;
  HTML Auth changelog checked, including schema restrictions).
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/signout
- https://supabase.com/docs/reference/javascript/auth-admin-signout
- Installed `@supabase/auth-js/src/GoTrueAdminApi.ts` and `GoTrueClient.ts`.

The result branch alone may be pushed. Frontend integration/public Pages
publication and a production release number belong to the integration chat.
