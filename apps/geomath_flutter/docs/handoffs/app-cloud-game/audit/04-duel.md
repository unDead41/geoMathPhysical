# Duel protocol 2 canonical audit

Status: **audit complete; native implementation BLOCKED by foundation READY gate**.
Audited 2026-11-04 UTC on `app-cloud-game-worker-4-7395917`, initially clean,
worktree `/workspace/scratch/7395917c0f68/worktrees/worker-4`.
Instruction and tested source SHA: `38f061af963256528d5060ff076bae9ee05eafc3` (`app`).
Digital package at this SHA is 2.9.0; Duel protocol is 2; inherited firmware v1.1.3 is unchanged.

`apps/geomath_flutter/`, foundation contract and READY receipt were absent at the base.
The lead verified remote `app-foundation` absent (ref fetch 404); no alternate foundation,
Dart interfaces, feature scaffold, Android preview or native tests were created.
Local worker refs expose only `origin/app`; current-main readback belongs to the lead:
`main` `25836eb1a6f24459aace8a3980ae880a13e3b488` v2.0.2;
`main-digitalized` `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` Digital 2.9.1.
Those remote observations do not change the tested app snapshot above.

## Pinned source references

All line references below use this SHA. Blobs are Git object IDs, not deployment receipts.

| Key | Repository path | Blob | Relevant lines |
|---|---|---|---|
| T | `digital/dist/duel.mjs` | `2d9ba80cc89b09de7daba106daa3961d6c6409f2` | 7–145 |
| P | `digital/dist/duel-state.mjs` | `bd7d821064d99b0565c9f11d57e1c72d6b8140d9` | 5–61 |
| E | `digital/backend/duel/functions/geodecoder-duel/handler.mjs` | `c8b0e4636b6613d9e3d29af491e7bccb1b3ee23f` | 3–57,89–158 |
| G | `supabase/migrations/20261026110959_geodecoder_digital_v2_7_integration.sql` | `612d67c985c90d208364ce4e8354f08472ccf361` | 53–300 |
| V | `supabase/migrations/20261025181814_geodecoder_duel_v1.sql` | `b403043971b2c7a6e378747adc22df3582e1c822` | 26–93,172–201,387–391 |
| N | `digital/dist/network-policy.mjs` | `e84c4a4327143028a40f4b3a1a2f04a65edb160d` | 3–19 |
| U | `digital/dist/app.mjs` | `236a40454e51d043e980fb065ebc48b0bf18cc08` | 65–67,220–285,919–925,1076–1099 |
| C | `digital/dist/core.mjs` | `551a2167caa0f5cf344c7f75b969f4d0a7837713` | 133–145,182–210 |
| S | `digital/backend/scaling/supabase/migrations/20261104014211_geodecoder_scaling_v1.sql` | `32a8dc38f4e2eda40f0c8a33a84b149b8d884ee8` | 76–159 |
| K | `digital/backend/duel/config.toml` | `706c82256bde47daed08bdc68bb87d10d22d826e` | 1–3 |
| D | `digital/docs/DUEL_V2.md` | `ca1d23d956226aaa62779736b4aa6ccd50b9b49d` | 17–56 |

SOR G01–G06/D01–D03/C01–C05/O01–O05/N01–N03, backend/offline contracts,
Prompt 3, COMMON_RULES, app architecture/UX/design/screens/test plan and integration
README/SQL_ORDER were read. Durable review exists in the root archived G migration;
the standalone feature migration is not an instruction to replay SQL on hosted systems.

## Exact Edge wire contract

Every operation is JSON POST to the configured `geodecoder-duel` Edge endpoint.
Every body includes `protocol:2`, `action`, `token`; the table lists **all additional fields**.
No GET state query exists. Unknown fields, supplied client score/time and classroom metadata
are rejected. Source transport uses `Content-Type: application/json`, public `apikey`,
credentials omitted and no-store; player capability is separate from Supabase login (T:43–59, E:23–57).

| Action | Additional fields |
|---|---|
| `create` | `name` |
| `join` | `name`, `code` |
| `state` | `roomId` |
| `ready`, `leave` | `roomId`, `seq` |
| `hint`, `skip`, `advance` | `roomId`, `seq`, `questionIndex` |
| `scan` | `roomId`, `seq`, `questionIndex`, `kind`, `shape`, `target` |

Token: 64 hex characters, lowercased at Edge; source generation uses 32 cryptographic bytes.
`roomId` is UUID text, normalized lowercase. `seq` is an integer 1…2147483647.
`questionIndex` is zero-based 0…9; normal actions use `me.answered`, `advance` uses
`me.answered-1`. `kind` is `solid|net`; `target` is `r1|r2`; `shape` is
`cube|cuboid|pyramid|cylinder|cone`. Name rejects control characters, trims/collapses
whitespace, then checks JS UTF-16 length 2…60; join `code` is a six-digit string.
The server generates create PINs without a leading zero (E:23–57,81–86).

Edge removes raw token/protocol before service-role RPC, SHA-256 hashes the token,
and adds a keyed address fingerprint; create also receives a server-generated code.
Raw token and service-role key never enter projections. K keeps `verify_jwt=true`;
the app must validate guest access on the authorized hosted setup without changing this policy
(E:122–154, V:83–93,387–391). No server secret belongs in native configuration.

## Pending commands and isolation

T:73–123 persists one command before send, blocks concurrent/new actions, and derives
the next mutation seq from the accepted `me.seq+1`. A transport failure/timeout can mean
the mutation succeeded: retry the **identical payload and seq**, including create/join's
original token. `resume()` replays pending before state refresh. Automatic mutation retry
is limited to two total attempts for network/server errors without Retry-After.
Transient failures retain pending; a known permanent denial clears it. State reconciliation
can clear a pending seq already acknowledged by the server (T:101–116).

G:165–224 serializes token→room→player access. Same seq plus same canonical JSON
(excluding tokenHash/fingerprint) returns the prior result; same seq/different payload
is `sequence_conflict`; any seq other than current+1 is `sequence_mismatch`.
Create/join deduplicate by token, so a lost acknowledgement must not generate a new identity.

Native dependency: a protected, independently scoped capability/pending store, separate
from SDK login persistence, SQLite formative records, WebView, logs and outbox.
Web sessionStorage with swallowed write failure is only a web fallback (T:22–26,U:65–67),
not proof of native durable storage. Adoption/logout/actor-switch rules must consume the
frozen foundation binding; never silently transfer a guest capability or apply old-scope data.

## Projection, clock and review decisions

E:89–109 whitelists room fields and exposes `currentQuestion` only while playing,
unsettled and below ten answers: `{id:'duel-N',index:N,topic,copy:{ms,en},formulaKey?}`.
No active shape, original bank ID, source metadata or future question IDs are exposed.
Hints appear only after server `hintUsed`; countdown/review expose no active prompt.
Only settled `me.answers` reveal the original ID, shape and bilingual correction question.
Opponent summary permits counts including hints; it excludes token/hash, seq, answers,
attempts, hintUsed and hint content. Do not join the local solo answer bank to active Duel UI.

P:11–49 checks protocol, total10, hidden questionIds, answered/answer length, outcomes,
attempts, bilingual prompts, recomputed counters and review consistency before adaptation.
P:52–59 rejects wrong-room or regressive seq application. C blocks local scan/skip/advance;
all score, stage and review changes come from validated acknowledgements.

Once both players are ready, the server selects ten shared unique questions (two per shape),
starts after **3000 ms** and sets deadline to start+**900000 ms**. Waiting PIN expires
at create+**600000 ms**; room record TTL is separately 24h (G:182–204,245–253; V:26–40,172–201).
Server `serverNow` plus a monotonic local delta drives display; dialogs/background/disconnect
do not pause the server deadline or finish-time tiebreaker (T:28–29,U:206–211,1076–1099).

Settlement increments answered/counters once, persists `reviewPending=true`, and sets
`nextReadyAt=serverNow+900` for correct or +1800 for wrong/skip. Input/hint/skip is blocked
during review. Correct auto-advances after the server gate; wrong/skip requires Continue.
Reload restores that same review and remaining gate; it must never start a new local timer.
Advance requires the settled index, clears only review/nextReadyAt, and remains allowed
in a **complete** room for the final question without changing score or finishedAt
(G:227–234,256–293; P:34–47; U:237–269).

At deadline, server settles remaining answers as skipped at the deadline and clears reviews.
`leave` while waiting cancels; an unfinished countdown/playing participant forfeits and
server settles the match; leaving after personal completion does not rewrite the winner.
Back/navigation needs EX12 confirmation and reconciliation before sending leave;
closing a view is not pause or evidence of acknowledged forfeit (G:88–107,235–244; U:279–285,919–925).

## Polling, lifecycle and errors

One polling epoch plus single-flight refresh; busy mutations suppress new polls.
Base delays are countdown 1 s/playing 4 s/lobby 5 s, hidden 30 s, with 0…25% jitter;
offline skips fetch and checks again after 30 s; failure backoff reaches 30 s before jitter.
Initial poll is 1.5…2 s. Scheduling respects retryAt and caps a single wait at 60 s
(N:3–19,T:106–138). Foreground/reopen must first reconcile pending and fresh projection;
native lifecycle integration awaits foundation, not a separate timer per widget.

HTTP 429 preserves pending, honors numeric/date Retry-After and uses at least 1 s cooldown;
Edge exposes protocol/Retry-After headers and supplies 2 s on 429. Terminal statuses
complete/cancelled/expired stop polling. Named invalid-token/expired/unavailable and
backend/client-update errors stop polling without silently forgetting the capability.
Protocol 1→426; unmigrated DB→503 backend_update_required; legacy Edge 400 without v2
header→backend_update_required. No v1 fallback (E:7–19,151–154,T:52–70).

T guards generation+session identity before/after await, room/player identity, regressive
server time/seq and old request failure serials. Forget aborts requests and invalidates epochs.
Native acceptance gap to test explicitly: a successful response with wrong protocol produces
`invalid_response`, which is absent from T:69's stop set; native must stop on incompatibility.
Also test protected-store failure, process death during pending, immediate foreground resync,
actor switch and strict native DTO validation; current web tests do not prove those native cases.

## Executed verification and remaining dependencies

Node v24.22.1; read-only temporary dependency link used exact PGlite 0.5.11,
Supabase JS 2.118.0 and jsdom 30.1.3; link removed after tests. Commands run from `digital/`:

| Command | Actual result |
|---|---|
| `node --test --test-concurrency=1 tests/duel-client.test.mjs tests/duel-client-lifecycle.test.mjs tests/duel-core.test.mjs tests/duel-content.test.mjs tests/duel-protocol.test.mjs tests/duel-edge.test.mjs tests/network-policy.test.mjs` | PASS 44, exit 0 |
| `node --test --test-concurrency=1 --test-name-pattern='Duel\|Edge exposes\|backend-update\|older successful poll\|terminal capability errors' tests/network-scaling.test.mjs` | Initial module-load failure (Supabase dependency absent); after pinned dependencies PASS 8, exit 0 |
| `node --test --test-concurrency=1 tests/duel-database.test.mjs tests/integration-sync-backend.test.mjs` | PASS 19, exit 0 |
| Root `python tools/check_version.py`; `git diff --check` | PASS, inherited firmware v1.1.3 consistent |

The 71 passing tests cover real localhost dropped/timeout ack, exact retries, stale sessions,
single polling owner, 429 cooldown, protocol/Edge redaction, PGlite durable review/900–1800 gates,
last advance after completion, deadline/expiry/forfeit, ties and both integrated SQL orders.
See `digital/tests/duel-client-lifecycle.test.mjs:15–133`, `duel-client.test.mjs:7–49`,
`duel-database.test.mjs:29–113`, `network-scaling.test.mjs:13–87`,
`integration-sync-backend.test.mjs:132–157`. SQL tests are not hosted/concurrent-client evidence.

Unblocking requires the same pushed READY SHA as learning, verified contract/asset hashes,
protected storage plus actor/lifecycle/failure contracts and neutral geometry assets.
Then implement the owned Duel feature and run native unit/widget/process-reopen/Android tests,
screens 10–13/48 and EX12, BM/English/light/dark/text 150%, and authorized two-client staging.
No APK, device, hosted endpoint, migration, provider configuration, deployment or capacity
test was performed. Source integration/SQL order is not proof of current hosted activation.
