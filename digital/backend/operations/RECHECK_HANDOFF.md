# Backend recheck and integration handoff

Source initially inspected: `790d989d666e64f3beabb507cd4140b832696367`.
Source rechecked after integration advanced: `391df985eea4fee15d9859e678068b1a3f613cba`.
Existing work-branch head before this addendum: `02fced51fb8b23442e57eda2890ad3882952b496`.
Repository: unDead41/geodecoder; work branch: digitalized-core-backend.
Project: fkrlwzxvyufndavlpzbp, Singapore. No schema/function deployment was performed by this recheck.

## Confirmed and tested

- Initial project health: ACTIVE_HEALTHY; PostgreSQL 17.11.
- Initial classroom, email-trigger, profile and module SQL suites completed without errors, with transactional rollback. These test SQL behavior, not email transport or live GoTrue login.
- The earlier Duel v1 tool response was not received during this recheck; it must not be treated as a new PASS. Existing audit-20261026.json independently records its earlier run.
- Current source digital/backend/duel/verify-v2.sql was fetched at the rechecked source SHA and executed successfully against hosted, with statement_timeout=15s and lock_timeout=3s. It creates random fixture identities and rolls back. Covers create/join, ready, R1/R2 scoring, durable review, duplicate event, review pacing, advance and forfeit.
- Catalog inspection: 18 application tables (13 private, 1 public, 4 geodecoder_duel), all RLS enabled. No direct anon/authenticated grants on private application tables. public.room_progress grants authenticated SELECT only, with room_members_read policy using private.can_view_room(room_id).
- Realtime publication includes public.room_progress. Actual authenticated event delivery/reconnect was not tested.
- Signup and immutable-profile triggers are enabled. Catalog inspection found explicit execution ACLs and configured search_path on application functions.
- Security Advisor: leaked-password protection disabled; private-table RLS-without-policy INFO reflects gateway-only access. No client policy was added to silence it.
- Performance Advisor: unused rooms_teacher_idx, join_codes_expiry_idx, rate_buckets_expiry_idx INFO. Retained; low observed usage is not sufficient reason to drop them.
- Frontend config at current source points to the intended project and https://undead41.github.io/geodecoder-digital/. Only a public publishable key appears in that config.

## Migration/deployment boundary

Hosted now lists ELEVEN versions:
20261025172311, 20261025172740, 20261025172928, 20261025173022,
20261025173354, 20261025175447, 20261025181814, 20261025193222,
20261026050330, 20261026091211, 20261026110959.

Current integration source contains matching versioned filenames and an updated supabase/hosted-history.json.
The older backend branch was prepared against nine migrations. Its manifest MUST NOT replace the
newer integration manifest. Integrator should take this addendum selectively and retain current
history/config/functions. Filename/version matching alone is not a fresh SQL hash comparison.
Run the existing history gate against a fresh hosted statement export, followed by migration
list and dry-run, before enabling production deployment. No historical migration may be pending.
Do not repair history, include-all, reset production, or rerun old schema/dispatcher scripts.

The root Supabase configuration already exists on current integration source, declares both
function entrypoints and disables seeding. It is a review package, not proof GitHub App is
connected. Intended mapping remains source repository unDead41/geodecoder, production Git
branch main-digitalized, working directory '.', with paid preview branching disabled.
GitHub App scopes and connection status were not freshly inspected in this recheck; no additional
permissions were granted. Inspect displayed repository access and obtain approval before granting it.

## Remaining work and actual blockers

Existing operations/README.md records the user's Gmail/Google Workspace provider selection.
SMTP was last observed OFF by that audit; this recheck did not read SMTP configuration or enter
credentials. User must enter sender mailbox and Google App Password directly into
Authentication > Emails > SMTP Settings. Host smtp.gmail.com, port 587 STARTTLS or 465 SSL,
sender name GeoDecoder Digital; sender must match mailbox or allowed alias. Keep email
confirmation enabled. Never send the App Password through chat, Git or frontend.

A named owned test recipient and explicit permission to send are still required. After setup,
verify actual inbox receipt, confirmation redirect, email and username login, logout, password
reset, expired/reused links and session/account switching in two real browser sessions.
Do not infer these from SQL, mock tests or a successful SMTP save.

Current deployed Edge source/version was not compared again after integration advanced;
the old v3 Auth / v1 Duel observations are historical. Recheck list/get functions and compare
current source before declaring deployment consistency.

No data backup or restore drill was performed. Git schema/migrations are not a backup of Auth
users, classes, attempts or progress. Follow operations/README.md for secure encrypted backups,
separate Storage bytes, isolated restore and identity/ownership checks. Do not commit dumps.

## Handoff

Existing operations/README.md contains dashboard locations, safe deployment sequence and
backup/recovery guidance. Existing deployment-plan.json is review-only.
This addendum changes documentation only. No firmware/main/sharing/public Pages changes.
No paid subscription, production reset, user-data deletion or deployment automation enabled.
Native git clone failed authentication in this environment; repository reads and this additive
commit use the connected GitHub API, preserving the existing branch.
