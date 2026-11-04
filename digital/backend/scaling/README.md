# GeoMath scaling candidate — operator handoff

This package reduces repeated work on Digital 2.8.0 without changing Duel
protocol 2 or module progress protocol 1. It is **not deployed**. It does not
certify 5,000-user hosted capacity. Never run its load scenarios on production.

## Changes and cache scope

- Duel polls: initial 1.5–2 s, active match 4–5 s, lobby 5–6.25 s, countdown
  1–1.25 s, hidden tab 30–37.5 s; failures back off. Offline polls make no
  request. Final results stop polling; explicit resume/mutation still works.
- Transient errors retain exactly the same pending sequence/payload. HTTP429
  and server Retry-After prevent immediate repeated requests. Edge exposes the
  header to cross-origin clients. Rejected game actions are not retried.
- Classroom snapshots: 1-second memory cache, at most eight keys, same account
  session and payload only; concurrent requests share a load. Every hit checks
  the SDK's current session. Room/account change, mutation and Realtime events
  invalidate its generation. Obsolete reads rejoin fresh data or are discarded;
  they cannot overwrite a newer response. No cache of credentials, score
  decisions or other accounts.
- Heartbeats: 20–25 s with a spread initial delay, still within the existing
  45-second presence estimate. Failed heartbeats back off. Snapshot reads do
  not update presence; heartbeat writes are coalesced over 15 seconds.
- Module edits persist locally immediately; 500 ms coalescing reduces redundant
  read/save cycles. Failed sync retries up to five times with backoff. Offline
  checks poll at 30 s for a bounded period; explicit sync always remains usable.
  Existing local records reconstruct pending changes after reload. Account
  switch cancels queued work; newer edits remain queued during an older save.
- Valid Duel state reads check token/room ownership before allocating counters,
  retain the 120/min/token budget, skip shared-IP counters and global cleanup,
  and update player presence at most once per 10 s. The requested-room expiry
  gate, row locks, tick/deadline, sequence, review and scoring remain intact.
- Invalid capabilities share a separate fingerprint rejection budget (default
  1,200/minute). Rotating random tokens do not create separate token rows, and
  exhausting this budget does not block valid players behind the same school IP.

This is transport reliability; the separate offline/PWA workstream still owns
service workers and offline page installation. No shared Redis is introduced.

## Database candidate and rollback

Apply only after all 11 entries of `../../../supabase/hosted-history.json`.
The migration filename was created with Supabase CLI 2.122.0:
`supabase/migrations/20261104014211_geodecoder_scaling_v1.sql`.
Use the backend owner's normal migration process **inside one transaction**.
Do not run a general db push from this partial history directory.

The migration compares both routine bodies to the reviewed hosted MD5s in
`fingerprints.json`, performs narrow replacements on their current definitions,
then verifies the resulting MD5s. A mismatch stops the transaction and requires
a review of the new upstream definition. It never replaces another branch's
dispatcher from an old file. ACLs, security modes and search paths stay intact.

The new `geodecoder_duel.capacity_policy` has RLS/forced RLS and no client
privileges; service_role has SELECT only. Database operators own updates.
Existing defaults remain: global create120/join300 per minute, IP mutations1200,
IP create20/join30, with the existing longer-window multipliers. They are
admission limits, not evidence of server capacity. Adjust them on staging after
measuring actual legitimate traffic, including a whole school behind one IP.
Increasing them does not increase compute resources or remove per-token limits.

Rollback: use `rollback.sql` in one transaction after stopping new work. Its
post-update fingerprint guards prevent overwriting later work. It restores the
exact two old routines and drops only the new operator policy; no profiles,
questions, progress, attempts, players or rooms are deleted. Run the existing
SQL verification suites afterwards. Old clients remain compatible throughout.

Deployment order when separately authorized: backup/restore drill → staging
migration → SQL/HTTP checks → staging Edge header update → frontend rebuild and
checks → measured load → review resource/plan budget → production window.
Do not edit archived hosted-history records until deployment actually succeeds.

## Local verification

From `digital`:

```sh
npm ci
npm test
node backend/scaling/local-smoke.mjs
npm run build
npm run prepare:pages
npm run check
```

The HTTP smoke uses ten disposable local clients, real Edge code, candidate
SQL on PGlite and exactly one intentionally lost acknowledgement. It finishes
four ten-question matches plus a match in which both clients wake after the
actual 15-minute deadline, without double scoring. Fixture time is advanced only
inside this disposable database; it is not a hardware or hosted timing test.
The existing Playwright Duel suite is a separate real-browser check against an
isolated protocol-2 baseline fixture. Its execution status belongs in the current
handoff; unit/HTTP checks do not substitute for a passing browser run.

## Staging load procedure

Install Grafana k6 separately; no k6 dependency is added to production.
Only publishable staging keys belong in the environment. Generate disposable
Auth sessions outside the measured run; Auth email/signup throughput is a
separate scenario and is bounded by provider and Supabase quotas.

`k6.mjs` rejects the production project and public Pages host unconditionally.
It also requires an exact staging-host allowlist and explicit opt-in. Example:

```sh
ALLOW_STAGING_LOAD=yes TARGET_ORIGIN=https://YOUR-STAGING-PROJECT.supabase.co \
STAGING_HOST=YOUR-STAGING-PROJECT.supabase.co \
SUPABASE_PUBLISHABLE_KEY=STAGING_PUBLIC_KEY \
WORKLOAD=duel LOAD_USERS=100 k6 run backend/scaling/k6.mjs
```

Run separate steps at 100, 500, 1,000, 2,500 and 5,000 people, with sufficient
hold time and a recovery interval. Each Duel VU creates and operates **two**
independent capabilities, including ready, scans, review advance and state polls;
5,000 people means 2,500 Duel VUs. Iterations create fresh matches so the test
does not become an idle completed-room test after the first 15 minutes.
Before each run, compare expected create/join/mutation rates and ten-minute
totals against admission policy. One generator shares an IP; the conservative
default IP quotas intentionally cannot sustain the largest profiles. Tune the
staging policy within measured resource/budget limits instead of treating a
quota failure as proof of a slow database.

For `WORKLOAD=mixed`, 5,000 people means 3,500 module users, 1,000 classroom
users and 250 Duel pairs. Supply `STATIC_ORIGIN`/`STATIC_STAGING_HOST` for the
staging frontend and `CLASSROOM_USERS_FILE` for disposable session fixtures.
The private fixture is a JSON array with `{userId,accessToken,roomId?}`; it needs
one distinct account per possible VU (4,750 for the 5,000 mixed profile) because
k6 VU IDs are shared across scenarios. Unused entries are not signed in.
Files named `*.local.json` and `load-results/` are ignored; never commit them.
Fixture parsing/validation occurs once per generator in a SharedArray. Global
VU IDs select accounts; distributed ID gaps need extra fixture slots or abort
safely. Setup preflights every supplied account against the authenticated
snapshot, one at a time with 20 ms spacing plus latency, with a 30-minute setup
limit. Supply sessions that remain valid through setup and the complete run.
Redirects are disabled globally and on each request; bad credentials/config
abort immediately and transient failures wait instead of forming a retry storm.
Setup samples are tagged separately; SLO thresholds evaluate load samples only.
The module scenario models one cold entry load followed by local work. It does
not measure rendering/geometry CPU on real phones or the browser cache itself.
The mixed scenario is HTTP/read focused: it does **not** open Realtime teacher
subscriptions or generate student answer/progress writes. A passing result
therefore cannot certify overall 5,000-user classroom capacity. Add separate
representative subscription/fan-out and authenticated write workloads, plus a
login/signup burst appropriate to actual Auth/SMTP quotas, before promotion.

Acceptance targets: HTTP errors <1%, semantic failures <0.1%, p95 <1,000 ms,
p99 <2,500 ms. These are proposed gates, not measured promises. Inspect failures
by status, including 429; retries do not turn server errors into a passing test.
Run `diagnostics.sql` read-only before/after each step. Record CPU/RAM, pool wait,
locks, query latency, writes, WAL/Realtime lag, connections, egress and billing.
Verify no doubled marks or missing progress, then test shared NAT, sudden joins,
network loss/reconnect, 30–60-minute soak and a short spike above the target.

## Capacity and remaining infrastructure work

The observed project is Free in Singapore with PostgreSQL max_connections60.
Browser users use the Data API; 5,000 users do not require 5,000 direct database
connections. Measure the existing PostgREST pool; any future direct serverless
database client must use a bounded pool. Do not blindly raise max_connections.

Realtime defaults observed on 4 November 2026: Free200, Pro500, Pro without
spend cap10,000 connections. Concurrent connections, message throughput, channel
join bursts and charges are separate limits. Default Pro alone does not certify
5,000 realtime users. Any paid plan/compute/quota change needs budget approval.
The current room stream also uses Postgres Changes; evaluate authorized
Broadcast for larger audiences after measuring event fan-out. Guest Duel has
opaque tokens, so public Broadcast channels would break its privacy boundary.

Primary references checked 4 November 2026:
- https://supabase.com/docs/guides/realtime/limits
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/database/connection-management
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
- https://grafana.com/docs/k6/latest/using-k6/thresholds/
