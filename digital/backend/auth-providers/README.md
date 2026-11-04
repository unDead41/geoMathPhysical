# Google account profile provisioning

The client ships Google and existing email login. Phone/SMS login was removed at
the user's request. The hosted phone provider is disabled.

The hosted migration `20261104061744_geodecoder_auth_providers` already installs
`geo_complete_profile`. Its original source remains unchanged in
`supabase/migrations/20261104053103_geodecoder_auth_providers.sql`; the canonical
schema mirrors that contract. Do not replay or edit applied migrations to remove
an unused provider branch.

Run `verification.sql` for read-only function ownership, empty search paths,
private profile protection and minimum caller grants. `provider-status.mjs`
reads only public availability and prints boolean flags; it never requests SMS
or records credentials.

See [Google Auth](../../docs/AUTH_PROVIDERS.md) for the current flow and limits.
