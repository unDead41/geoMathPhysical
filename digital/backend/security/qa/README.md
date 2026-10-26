# Portable session acceptance check

`GeoDecoder_Session_QA.html` is a standalone, test-only page using the existing
production Security view, session-list service and pinned Supabase SDK. It has no
fixture response handler. It contacts the existing hosted project only when the
operator signs in or explicitly runs a check. It is not imported by `app.mjs`.

Build from `digital/`:

```sh
node backend/security/qa/build.mjs
```

The source-controlled HTML and ignored `artifacts/GeoDecoder_Session_QA.html`
are byte-identical. Download and open the file on your own device in two real
browser profiles (or normal and Incognito). No workspace HTTP server is needed.
Opening the built file in an actual browser is still a manual acceptance step;
JSDOM and a successful bundle do not prove that a browser has rendered it.

## Prerequisite: two approved QA accounts

Use the existing project's Supabase Admin/Studio Auth Users interface:
https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/users

Create two dedicated temporary QA accounts using the documented Admin route,
with email confirmation set for these QA accounts only. Do not change global
confirmation settings. `auth.admin.createUser` is server-only, and its
`email_confirm: true` option is documented here:
https://supabase.com/docs/reference/javascript/auth-admin-createuser

Example dedicated addresses below are **not created by this task**:

- `qa-session-84ae2418-3995-4931-b0e3-c3738fc75f62@accounts.geodecoder.invalid`
- `qa-session-04417b94-7e5d-44e0-9001-7a452a202519@accounts.geodecoder.invalid`

Choose and enter passwords directly in Studio and the QA page; do not put them
in chat, Git, screenshots or exported observations. The page accepts only
`qa-session-<UUID>@accounts.geodecoder.invalid` addresses. It cannot provision,
invite or delete users and contains no service-role key or Admin client. Normal
portal login/signup/password-change routes are disabled inside this test wrapper;
only the existing documented sign-out actions remain available.

## Manual acceptance sequence

1. Open the HTML in profile A and another profile/Incognito B. Set their local
   labels A and B. Sign in using the **same first QA account**.
2. Both lists must contain the real sessions and exactly one correct `Peranti ini`
   label in each profile. Record the list check in each profile.
3. In A use the production `Log keluar semua sesi lain` action and confirm it.
   In B press `Uji pembaharuan sesi`. A server refresh rejection can be recorded;
   a network failure is explicitly unconfirmed. A missing row in the UI alone is
   not evidence of revocation. Existing access JWTs may survive until expiry.
4. In A refresh the list and verify A is still usable. Open profile C with the
   **second QA account** to inspect its separate records. The existing
   `verify-live.mjs` provides additional automated foreign-selector checks when
   approved credentials are supplied securely outside Git.
5. Check BM/English, 320px reflow and Tab/Enter/Escape. Capture real screenshots
   and export observations per profile. The JSON contains bounded event types,
   timestamps and counts, with no user/session IDs, email, device strings,
   passwords or tokens. It deliberately never declares all acceptance tests
   passed. Confirm the sequence manually alongside screenshots.
6. Sign out the remaining QA sessions with the production confirmation before
   closing. The authorized admin removes only these dedicated QA users after
   testing; the HTML does not delete accounts.

SDK clients do not persist sessions, automatically refresh them or process URL
callbacks. A manual token-refresh button makes the target-session check explicit.
Browser User-Agent is not fabricated. UI themes/language affect this page only.
The production list still clears on logout/account switch; anonymous historical
test observations remain in memory for export until the page closes. No report
is uploaded automatically.

## Verification boundary

Controlled tests cover validation, duplicate login suppression, sensitive field
cleanup, redacted export, Auth-rejection versus network distinction, logout UI,
language context and nonpersistent SDK setup. This does **not** mean a real QA
account was created, a live refresh was rejected, or 320px was rendered.
The original automatic-review rejection of internal Auth-table account inserts
has not been retried or bypassed. No hosted database/Auth change is made by this
resume beyond the previously deployed read-only session RPC.
