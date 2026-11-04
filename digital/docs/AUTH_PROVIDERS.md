# Google sign-in — Digital v2.10.0

The published application offers email/username and Google sign-in. Phone login
and SMS OTP were removed at the user's request on 4 November 2026 (Malaysia).

## User flow

1. Open Log masuk or Daftar akaun and choose **Teruskan dengan Google**.
2. Supabase redirects to Google's account picker using the existing Google client.
3. Auth returns to `https://undead41.github.io/geodecoder-digital/`.
4. The existing SDK session owner validates the callback and removes credentials
   from the URL. Existing profiles enter their classroom.
5. A new Google account chooses a username, display name and student/teacher role.
   The authenticated `geo_complete_profile` RPC provisions only that user.

Google-only accounts show Google password/recovery guidance. Existing email and
legacy-password accounts keep their authentication and recovery paths. Account
session controls remain available to Google users.

## Hosted prerequisites and observed state

- Project: `fkrlwzxvyufndavlpzbp`.
- Read-only `/auth/v1/settings` on 4 November 2026 reports Google enabled, email
  enabled, phone disabled, and signup enabled.
- The authorize endpoint redirects to `accounts.google.com/o/oauth2/v2/auth`.
- Profile migration `20261104061744_geodecoder_auth_providers` is already applied;
  its original source is retained as
  `supabase/migrations/20261104053103_geodecoder_auth_providers.sql`.
- The RPC permits authenticated callers and denies anonymous/service-role
  callers. Source schema and historical migration retain the deployed generic
  provider provisioning contract; no SMS routes or controls ship in this client
  and the hosted phone provider remains disabled.
- No OAuth secret is included in frontend config, source, evidence or release
  metadata. This publication does not create or change OAuth credentials.

## Session and error behavior

Google checks provider availability, suppresses duplicate requests and rejects
responses after a session switch or logout. The authorize URL must use this
project's Auth origin and configured callback. Provider/internal messages are
mapped to authored BM/English errors.

Profile completion reuses the ownership-bound RPC transport and shared session
lock. The backend checks canonical confirmed provider identities rather than
editable metadata. Retries preserve existing profiles and roles.

## Verification scope

Run `node --test --test-concurrency=1 tests/*.test.mjs`, `npm run build`,
`npm run prepare:pages`, and `npm run check` from `digital/`.
Tests cover the pinned SDK OAuth URL generation, safe errors, profile ownership,
session changes, existing email/security flows, current account layout and
absence of SMS controls/network requests. SQL tests exercise the unchanged
deployed migration, including its historical provider contract.

Synthetic tests do not perform personal Google consent or create real profiles.
Live navigation to Google's sign-in page verifies the redirect boundary;
full personal-account sign-in remains a separate user action.
