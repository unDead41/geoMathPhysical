# Kata Laluan & Keselamatan

## Design and implementation plan — 26 October 2026

Base: `digitalize` at `adc51627eaaace5d9543c7e033d2994986c8715d`.
Main inspected read-only: `a059979d97926b82cafd4aa5cf3fe59da04a55bb`, firmware v1.1.3.
Output branch: `digitalize-utility-security`. Original worktrees are untouched.

Goal: signed-in users can change a password and request global sign-out using
the installed Supabase SDK, with the existing portal's fields, buttons and tokens.
The new password policy stays 10–128 characters, without trimming. Existing
email confirmation, recovery links, legacy recovery, roles and game rules stay intact.

Chosen approach: a temporary SDK client verifies the current session with Auth,
then authenticates the server-verified account email with the current password.
Both returned user IDs must match the original account. This works for legacy
internal addresses too and never switches the persistent client. The temporary
client has no persistence, URL detection or refresh timers. `updateUser` operates
only on that verified session; `current_password` is supplied for deployments that
require it. A current-password-only update on the shared client was rejected:
provider enforcement depends on configuration and shared sign-in can switch accounts.

Global sign-out uses an isolated client bound to the verified original session,
`signOut({scope:'global'})`, and observes an actual successful logout HTTP response.
SDK success alone is insufficient because it suppresses some invalid-token errors.
Only a confirmed response permits the matching local session to be cleared.
Refresh tokens are revoked; already-issued access JWTs can last until expiry.

Review focus: session identity changes (including another session of the same
user), dropped mutation responses, provider errors with sensitive text, leaving
while requests are pending, and global logout errors swallowed by the SDK.

- [x] Add SDK-bound security service and failing tests for success, mismatch,
  reauthentication failure, expiry, network errors, identity races and global acknowledgement.
- [x] Integrate signed-in page, inline field errors, confirmation and sensitive
  field cleanup into `portal.mjs`; pause polling while this page is open.
- [x] Verify DOM interaction, field focus, Escape, reveal labels, paste and sensitive cleanup.
- [ ] Verify actual browser keyboard traversal and 320px layout and capture screenshots: blocked by browser/environment access; see evidence below.
- [x] Run full digital suite/check/build and review the source diff.
- Publication is restricted to `digitalize-utility-security`; remote SHA and
  final publication status are verified in the delivery message.

No production Auth settings or schema deployment is required.

Official API references:
- https://supabase.com/docs/reference/javascript/auth-updateuser
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/reference/javascript/auth-signout
- https://supabase.com/docs/guides/auth/signout

The pinned SDK types expose `current_password`; the password guide also describes
`currentPassword`. The implementation follows the actual installed types and
performs explicit password sign-in so provider configuration cannot silently skip
the application's reauthentication step.


## Verification — actual results

- `npm test`: **107/107 passed**, including 25 new security tests and the new
  password form validation test (baseline 81 passed). SDK/HTTP tests use the real
  pinned Supabase SDK and controlled external responses. DOM tests use pinned
  JSDOM 26.1.0. No live account password or server session was changed by these tests.
- `npm run build`: passed; website 639,243 bytes, offline HTML 6,196,012 bytes.
- `npm run check`: passed; standalone syntax/assets, 98 IDs/ARIA references,
  canonical question-bank fidelity, diagrams, tokens and baseline accessibility.
- Password success, mismatch, current-password rejection, session expiry,
  network error, uncertain update response, same-user/new-session cancellation,
  other-identity rejection, duplicate requests and exit cancellation are covered.
- Global logout verifies a real observed 2xx response. Real SDK HTTP fixtures
  reproduce suppressed 401/403/404 errors and prove these cannot become success.
- Independent reviewer reproduced the A-logout/B-login race before the fix.
  Two real SDK clients with shared SDK storage now preserve B, both when B is
  installed during A cleanup and when A's cloud cache is stale. Login session
  installation, logout, reset and explicit callback initialization use the same
  named mutation lock. Current release tabs cooperate through Navigator Locks;
  an in-process queue is the fallback. Previous-release tabs cannot cooperate.
- The temporary verifier's best-effort cleanup has its own five-second deadline,
  independent of page cancellation. A real SDK regression confirms cleanup still
  has a live signal after leaving. If the provider is unreachable, its temporary
  session can remain on the server until provider expiry; no credential or token
  from it is persisted by this implementation.
- DOM tests check actual delegated form handlers, invalid-field focus,
  description targets, autocomplete, sensitive cleanup after success/navigation/
  logout/account changes, pending request suppression, show/hide labels,
  paste allowance, Escape cancellation and restored focus.

## Browser evidence limitation

No browser screenshots were produced. The connected browser and cloud browser
could not reach the workspace test server (`ERR_CONNECTION_REFUSED`); the server
runs in an isolated execution network. The browser URL policy also rejected
opening the standalone test artifact through a `data:` URL because only HTTP(S)
protocols are allowed. No workaround to that policy was attempted after rejection.

Therefore **actual 320px layout, native Tab/Enter traversal, visual contrast and
real password-manager integration remain unverified**. JSDOM does not establish
browser layout or screen-reader behavior. CSS includes single-column layout below
800px and wrapping actions below 380px, but that is not rendered evidence.

For an accessible local review on your own device:

```sh
cd digital
npm ci
npm run preview:security
python -m http.server 8765
```

Open `http://localhost:8765/artifacts/security-fixture.html`. The banner explicitly
labels controlled Auth responses. Use current password `Fixture Current#41` and
any matching 10–128-character new-password fields. No real credentials, emails,
accounts or sessions are contacted. Choose success, failed authentication,
expired session, disconnected network, delayed request, lost update response or
denied global logout from the test-only scenario selector. This fixture is not
imported into the production bundle. Review 320px, both themes, native keyboard,
zoom and a password manager; save real screenshots only after rendering.

## Live-provider limits

- No real email delivery, live password change or cross-device logout was tested.
- Global sign-out revokes refresh sessions. Previously issued access JWTs can
  remain usable until expiry, as explained before confirmation.
- A successful password change keeps this portal session until provider policy
  requires sign-in again. It does not claim that other devices were immediately
  logged out. Use the separate global action when desired.
- If an update response is lost, the outcome is unknown; try the new password or
  the existing reset flow. Do not automatically submit the password change again.
- A deployment-specific CAPTCHA/MFA/auth hook can require additional provider
  interaction. Provider rejection remains visible; no unsupported bypass is used.
- Production Auth settings, SMTP, schema, quiz rules, scores, roles, firmware and
  pinned module v1.2.0 were not changed. Firmware remains v1.1.3. The digital
  branch version is v2.4.0.

## Remote publication contract

Only `digitalize-utility-security` may be published. Main and all other protected
branches named in the task are read-only. The base was fetched through the
connected GitHub API because terminal Git authentication was unavailable. The
snapshot tree and reconstructed base commit were checked against their actual
Git hashes before creating the isolated worktree. Final full commit SHA is
reported with the branch link in the delivery message; run `git rev-parse HEAD`
for the local checkout's full SHA.

The security page also remains accessible from the classroom-load error state,
so an unavailable classroom snapshot does not prevent Auth security actions.
A shared SDK-session check rejects stale cached identities before verification.
Browser Locks rejected before entering an operation use an in-process fallback;
an operation already entered is never replayed after its error.
