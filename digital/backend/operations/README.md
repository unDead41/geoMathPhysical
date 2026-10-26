# Backend operator handoff — 26 October 2026

Source base: `unDead41/geodecoder/main-digitalized` at
`790d989d666e64f3beabb507cd4140b832696367`.
Work branch: `digitalized-core-backend`. Digital runtime remains v2.6.0 / module v1.5.0.
This package changes operations/history documentation and tests, not firmware or runtime behavior.

## Verified now

- Existing project `fkrlwzxvyufndavlpzbp`, Singapore, ACTIVE_HEALTHY, PostgreSQL 17.11.
- 18 application tables: 13 private, 1 public, 4 geodecoder_duel. All enable RLS.
- Five hosted SQL suites completed without error using rollback: classroom/PIN/scoring,
  email trigger/provisioning, profile, module progress and Duel. These exercise actual
  SQL roles, ownership and grants; they do not exercise GoTrue email delivery.
- 56 existing Node tests passed for Auth validation, email callback/reset, account
  switching/session binding, password reauthentication/logout, Duel handler and profile SQL.
- One new PostgreSQL test replayed all nine exact historical migrations in order,
  then passed all five SQL suites. Auth schema is a minimal local fixture in this test;
  this is not a full Supabase CLI reset, Edge runtime or GoTrue test.
- Hosted geodecoder-auth v3 and geodecoder-duel v1 source files match Git exactly.
- Live Duel create/join concurrency smoke passed: one of two simultaneous guests joined,
  third player received room_full; host refresh showed opponent; leave cancelled the room.
  This is a limited HTTP smoke, not a complete two-browser ten-question Duel.
- public.room_progress is in supabase_realtime. Its SELECT policy calls
  private.can_view_room(room_id). No client table grants on either private schema;
  no SECURITY DEFINER function lacking a configured search_path was found.
- Dashboard Site URL and sole redirect both match https://undead41.github.io/geodecoder-digital/.
  Confirm email remains enabled; email provider enabled; anonymous sign-in disabled.

## Open items and limitations

- SMTP is OFF in the live dashboard. User selected Gmail/Google Workspace on this run.
  No SMTP credential was entered and no confirmation/reset email was sent by this audit.
- User must enter Gmail App Password directly in dashboard, then save and authorize
  a named recipient for a real signup/reset test. Never send the password to chat.
- End-to-end signup, confirm, email/username login, recovery, expired/reused links,
  logout and real cross-account browser checks remain unverified against live GoTrue.
  Mock/SQL tests cannot substitute for these flows.
- Realtime publication/RLS passed inspection; authenticated event delivery and reconnect
  recovery remain untested. Duel uses polling, not this publication.
- GitHub integration remains disconnected. OAuth reached the account-selection page
  for unDead41; Continue did not advance during this session. No new repository
  permission was granted and no production automation was enabled. Actual GitHub App
  scopes are not yet visible: inspect and request approval there before granting access.
- Leaked-password protection is disabled and the dashboard marks it Pro-only. No paid
  plan was enabled. Three unused-index INFO findings were retained because low traffic
  is not evidence the indexes are unnecessary. Private tables with no RLS policies are
  intentionally reachable only via reviewed gateways, not open client table policies.
- Hosted config has Duel verify_jwt=true; its publishable-key HTTP smoke succeeded.
  Preserve this observed setting. Recheck gateway behavior before future changes;
  current docs distinguish publishable apikey from user Authorization JWT.
- No data backup/restore drill or load test was performed.

## Where the server and tables live

There is one managed PostgreSQL server in Supabase, not a separate server per feature.
The public GitHub Pages repository only hosts the compiled frontend.

| Component | Dashboard location |
| --- | --- |
| Tables | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/editor — use schema selector for private/public/geodecoder_duel |
| Schema / indexes / functions | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/database/schemas |
| Accounts | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/users — managed auth schema |
| Edge servers | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/functions |
| SMTP | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/smtp |
| Redirects | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/url-configuration |
| Realtime | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/realtime/inspector |
| Repository integration | https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/settings/integrations |

Do not expose private schemas or grant client table access to make them visible.
Teacher/student role is stored in private.profiles and becomes immutable after creation.
The existing product permits selecting teacher at signup; it is not an institution-verified
teacher credential. Editable JWT user_metadata must not authorize later privilege changes.

## Gmail setup — credential handoff

Use Authentication → Emails → SMTP Settings. Enable custom SMTP and enter:

| Field | Value |
| --- | --- |
| Host | smtp.gmail.com |
| Port | 587 (STARTTLS), or 465 for SSL |
| Sender name | GeoDecoder Digital |
| Sender email / username | The Gmail/Workspace mailbox being used |
| Password | Google App Password, entered directly by user |

App Password availability depends on Google 2-Step Verification and account/admin policy.
Do not use the normal Google account password. Use a sender matching the authenticated
mailbox or an allowed alias. Keep Confirm email ON. Inspect Supabase Auth email rate limits
and Google's applicable mailbox quota; custom SMTP does not remove either limit.
Do not claim delivery from HTTP success: confirm receipt, token verification and redirect.
See https://support.google.com/mail/answer/7104828 and
https://support.google.com/accounts/answer/185833 and
https://supabase.com/docs/guides/auth/auth-smtp .

## Safe GitHub deployment sequence

1. Integrator reviews this branch against the recorded base and current main-digitalized.
   Merge the package only through the authorized integration handler.
2. supabase/migrations contains the exact hosted history exported on this audit, including
   version 20261026050330. Do not run schema.sql, fix_v2.sql or old dispatcher SQL on
   production again; they can replace newer functions. Existing backend SQL remains
   historical/source material, not an additional automatic migration directory.
3. Export fresh version/name/statements from supabase_migrations.schema_migrations as JSON
   using an authorized read-only query. Run from repo root:
   `node digital/backend/operations/check-history.mjs /secure/path/hosted-history.json`.
   The gate fails on mismatches; it never repairs history or deploys.
4. Use a current pinned CLI; discover flags with --help. Link explicitly to this project,
   run migration list and db push dry-run. Expected historical pending count is ZERO.
   If not zero, stop. Never use include-all, db reset --linked, or migration repair
   against production to silence a discrepancy.
5. In Supabase GitHub integration choose source repository unDead41/geodecoder, working
   directory '.', production Git branch main-digitalized. The public mirror is not the
   backend source. Supabase's displayed production branch 'main' is its database branch
   label; it is not evidence of a Git mapping. Verify the Git branch field explicitly.
6. Keep Automatic branching OFF (avoid paid preview resources). Keep Deploy to production
   OFF until history/dry-run/config/function review is complete. Grant GitHub App access
   only after the user approves its displayed scopes; prefer only the source repository.
7. After deliberate enablement, new migrations only are applied; declared Edge Functions
   deploy from their existing canonical paths. Root config intentionally omits SMTP secrets
   and remote Auth overrides. GitHub integration ignores Auth/API settings by default;
   Edge secrets are not the same as SMTP server configuration.
8. Run five rollback SQL suites, HTTP smoke and authenticated two-browser tests after each
   deployment. Record source SHA, migration versions, function versions, test outputs and
   frontend release separately. Push here does not publish the public Pages mirror.

## Backup and recovery

Git migrations preserve schema history, functions and the seeded question bank. They do
not back up user accounts, classes, attempts, progress, sessions, Storage objects, Auth
settings or Edge/SMTP secrets. Never commit a production data dump to Git.

Before a production schema change, use a secure owner-controlled machine and supported
Supabase CLI/pg_dump workflow to make encrypted schema/roles/data backups. Inspect current
CLI --help and official backup guide for managed-schema exclusions and restore ordering.
Protect Auth password hashes, identity records and any dump as credentials/private data;
store the key separately, restrict access and record checksum/date/retention off-repository.
Free projects do not provide the paid downloadable-backup guarantees. No upgrade is made
by this package. Storage file bytes require a separate backup from database metadata.

Restore into an isolated local environment first. Recreate schema/functions, restore data
with correct role/trigger ordering, preserve original user UUIDs, then validate counts,
ownership, login, class/PIN, scoring, progress and Realtime. Reconfigure Auth redirects,
SMTP and Edge secrets securely. Record RPO/RTO only after measuring an actual restore.
For a code regression roll forward with a reviewed corrective migration; do not run a
production reset or delete migration history. Escalate data recovery separately from code
rollback. No production restore is authorized or performed by this audit.

Official references checked 26 October 2026:
- https://supabase.com/changelog.md
- https://supabase.com/docs/guides/deployment/branching/github-integration
- https://supabase.com/docs/guides/deployment/branching/configuration
- https://supabase.com/docs/guides/functions/development-tips
- https://supabase.com/docs/guides/functions/auth-headers
- https://supabase.com/docs/guides/platform/backups
