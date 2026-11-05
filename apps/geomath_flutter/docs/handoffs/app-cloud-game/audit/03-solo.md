# Solo source audit — worker 3

Status: **audit only; blocked on foundation READY**. No Dart engine, native schema,
shared contracts, scaffolding or dependencies were created. This report and the
adjacent trace are the only owned files. No source was modified or pushed.

| Provenance | Value |
|---|---|
| Audited app source | `38f061af963256528d5060ff076bae9ee05eafc3` |
| Private branch | `app-cloud-game-worker-3-7395917` |
| Worktree | `/workspace/scratch/7395917c0f68/worktrees/worker-3` |
| Digital engine version / ruleset | `2.9.0` / `single-attempt-v1` |
| Inherited firmware label | `v1.1.3`; unchanged; this is not a firmware release |
| Current main, checked by lead connector | `25836eb1a6f24459aace8a3980ae880a13e3b488`, `v2.0.2` |
| Current Digital, checked by lead connector | `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` |

Local `main` was absent (`git log -1 main`, exit 128); lead supplied remote provenance.
Lead compared current Digital: `questions.mjs` and `solo-save.mjs` are identical;
`core.mjs` changes only VERSION `2.9.0`→`2.9.1`. Trace remains pinned to app source.
Read root AGENTS/versioning, Prompt 3/COMMON_RULES, SOR G01–G06/O01–O05/N01–N03,
app architecture/UX/test contracts and Digital integration/SQL order guidance.
No `FOUNDATION_READY.json` or Flutter project existed in the audited tree.

## Bank identity and RNG

`digital/dist/questions.mjs:2–168` contains these 15 records in this source order:

| Shape | IDs | Count |
|---|---|---:|
| pyramid | P1, P2, P3 | 3 |
| cylinder | S1, S2, S3 | 3 |
| cube | K1, K2, K3 | 3 |
| cone | C1, C2, C3 | 3 |
| cuboid | B1, B2, B3 | 3 |

`SHAPES` order is **cube, cuboid, pyramid, cylinder, cone** (`core.mjs:4`).
Preserve both orders: filtering the source bank and then shuffling affects draw parity.
The saved bank identity is the exact **`JSON.stringify(QUESTIONS)` string**, not
an ID set or ruleset alone (`solo-save.mjs:11,16`). SHA-256 of its UTF-8 bytes:
`6ea4e9057d1f04e4f485aeefd89ec3cb681deb07b2dad7e76862e78e22159065`.
Source-file hashes, including the distinct questions-file hash, are in the trace.
BM/English display copy is applied by ID in `i18n.mjs:1026–1031`; it does not
mutate the canonical bank. Topic inference uses explicit topic, then `/^[VL]=/`,
then ID suffix 3; **C1 and C2 are both formula** (`core.mjs:30–33`).

| Actual JS operation | Draws / ordering |
|---|---|
| `shuffle(n)` | `n−1`, descending Fisher–Yates; `floor(draw*(i+1))` (`core.mjs:11–17`) |
| Quiz constructor | 27: five 3-item shuffles (10), selected 10-item shuffle (9), solid/net shelves (4+4) |
| Practice constructor | 22: 15-item shuffle (14), two shelves (8) |
| Review constructor, n IDs | `n−1+8`; unique, valid, nonempty IDs, at most15 |
| Next-question shelves | Each retries 4-draw shuffles up to12 times until **every position** changes; after48 unsuccessful draws, one draw selects rotation shift1–4 (`core.mjs:20–27,225–226`) |
| Visual plan | 10 extra draws, solid then net, in SHAPES order (`visuals.mjs:15–28`) |

Quiz selects two per shape, then shuffles the ten; practice validates exactly15
unique IDs/three per shape, then shuffles all. Review shuffles only its validated
subset (`core.mjs:55–77`). The UI uses the same global RNG for Game and later
visual plans (`app.mjs:340,357`). Restoring also consumes fresh `Math.random`
draws in constructor/replay before overwriting saved shelves (`solo-save.mjs:28–52`).
There is **no saved PRNG state or promise of identical future shelves after reopen**.
Native parity must inject numeric draws; Dart `Random(seed)` is not equivalent.
UID fallback can add one global draw (`app.mjs:133`); `SoloStore.read` also runs
restore validation. Trace fixes IDs and includes only the recorded RNG consumers.

## Attempts, feedback and clock

- Card selection only changes external `{kind,shape,letter}` (`app.mjs:487–497`).
  Wrong target returns `stage`; wrong kind/unknown shape returns `kind`; neither
  spends an attempt (`core.mjs:144–150`). R1 correct switches to net with +0.
- Wrong R1 or R2 records one mistake and enters review immediately. A correct
  R1/R2 pair grants exactly+1, increments firstTry and enters feedback. Later
  scans/skip/hints are blocked while feedback/review is active (`core.mjs:151–194`).
- Skip at either stage gives+0, retains attempts already made and enters review.
  Hint toggles freely, counts once across both stages, closes on correct R1 and
  never deducts points. `firstTry` is true for every correct answer, even with hint.
- `BLINK_MS=900`, `WRONG_MS=1200`, `REVIEW_MS=1800` (`core.mjs:7–9`). Both readers
  blink three 150ms ON/OFF cycles. Correct advances via `update` at900ms; wrong
  and skip **never auto-advance**, including at1200ms, and require explicit
  `continueReview` at/after1800ms (`core.mjs:171–207,246–258`). WRONG_MS is unused
  by the current transition logic. After wrong R2 blinking, R1 is green/R2 red.
- Time accrues only while running and unpaused; feedback/review time is excluded.
  Pause freezes clock/LED phase; resume shifts pending gates by the paused gap
  (`core.mjs:137,230–258`). Answer durations and final duration round independently.
  Dialog close resumes; background opens a pause prompt; pagehide pauses/checkpoints
  (`app.mjs:849–876,1076–1080,1159`). The UI also checkpoints every5s (`1161`).

## Save contract and ownership

`solo-save.mjs:3–11` uses one key `geodecoder.digital.solo.v1.<actor>`; actor is
account UUID or `guest` (`offline-runtime.mjs:38`). Snapshot v1 contains ruleset,
exact bank, actor, stable attempt ID, mode/player, ordered questionIds, selected
card, visualPlan, elapsed and **feedbackRemaining/reviewRemaining**, plus state:
index/score/mistakes/hints/skipped/stage/status/hintOpen/hintUsed/wrongOnQuestion/
attempts/questionStartElapsed/firstTry/wrongReader/lastOutcome/answers/solidOrder/netOrder.

Restore validates actor/schema/ruleset/bank, player, unique/valid/balanced round,
orders/palettes/selection, finite durations and timer bounds900/1800; it replays
accepted answers through the actual engine, checks totals/stage/outcomes and
rounding tolerance, then restores state (`solo-save.mjs:15–55`). It anchors gates
to the supplied new clock and starts unpaused; elapsed wall time while closed is
not counted. `savedAt` is informational. No credential belongs in this payload.
Store exposes empty/saved/invalid/failed distinctly (`57–61`); replacement requires
confirmation (`app.mjs:338,1139–1144`). Actor switch saves old scope then exits it
(`app.mjs:652–655`). Native ActorBinding/session/epoch guards remain required.

## Results, analysis and finalization

`Game.result` returns null until finished, then clones result/answers with stable
ID, version/ruleset/mode/player, totals, rounded elapsed and explicit completion
time (`core.mjs:261–264`). Answer rows preserve id/shape/topic/outcome/hint/failedAt/
attempts/elapsed/firstTry. Stage analytics exclude null attempts: wrong R1 leaves
R2 **notAttempted**, not wrong (`core.mjs:35–52`). Empty groups have null percent.
`reviewQuestionIds` deduplicates only valid wrong/skipped IDs in answer order
(`usability.mjs:23–27`); new review shuffles them without changing original results.

`app.mjs:959–976` caches result by roundId and only saves ordinary quiz to the
leaderboard. `storage.mjs:7–23` accepts total10/quiz (or legacy mode absent),
requires score+mistakes+skipped=10 and firstTry=score, deduplicates IDs, ranks by
score DESC/mistakes ASC/elapsed ASC/completedAt ASC and caps at50. Practice,
review, classroom and Duel are excluded by mode plus caller scope. The web score
key is device-global; checkpoint ownership must not be inferred for this key.
Deduplication proves one row, not immutable payload or transactional finalization.
Native completed history+outbox must use the shared writer atomically. Signed-in
solo payload allows quiz/practice/review only; event ID `solo:<attempt_id>` and
content_version1 (`offline-records.mjs:8–25`, `offline-runtime.mjs:71–73`). Guest,
classroom and Duel are not uploaded as completed solo.

## Executed evidence and remaining work

- Node `v24.22.1`; from `digital/`: `node --test tests/core.test.mjs tests/practice.test.mjs tests/solo-save.test.mjs tests/storage.test.mjs tests/i18n.test.mjs` — exit0, **55/55 PASS**.
- `node --test tests/upgrade.test.mjs tests/usability.test.mjs tests/ease-integration.test.mjs` — exit0, **18/18 PASS**. Includes500-round balance/shelf checks and actual-engine randomized checkpoint recovery.
- `node --test tests/solo-ui.test.mjs` — exit1 before tests: missing `esbuild`; jsdom also absent. No dependency install was performed. This is not a UI PASS.
- `python tools/check_version.py` — exit0, inherited firmware/README/CHANGELOG agree at `v1.1.3`; no release bump. Staged `git diff --cached --check` — exit0.
- Node stdin trace generation and a separate explicit-draw replay — exit0: source hashes/bank checked, **247 action states/1,741 RNG draws** matched; forced reshuffle fallback used49 draws. JSON formatting equality initially compared key order; final semantic replay passed.
- `03-solo-trace.json` is **PROVISIONAL AUDIT ONLY**, not the foundation export or Dart proof. Quiz:6 correct/2 wrong/2 skipped, hint1; practice:12/2/1, hint15; review:4/4. Covers selection, premature R2, wrong kind, double tap, both stages, paused feedback/review, finished restore, duplicate quiz save and invalid snapshot probes.

Lead-inspection logs: `/workspace/scratch/7395917c0f68/audit-logs/worker-3/`
contains `solo-node-tests.log` (combined73 PASS), `solo-ui-blocker.log`,
`solo-trace-replay.log`, `version-check.log` and runnable `replay-solo-trace.mjs` (run from worktree).

After READY, use the **same frozen foundation SHA as learning**, verify contract/
asset hashes and replace/adopt these traces against its exact bank. Require typed
Clock/RNG, neutral GeometryCardProvider, ActorBinding/lifecycle policy, transaction
handle, guest/signed-in FormativeRecordWriter+Reader and solo migration namespace.
Do not introduce substitute DTOs, a second bank, shared schema or learning dependency.

Concrete future tests (planned, not created/run): engine trace consumer with exact
draw exhaustion and state/answer equality;900/1200/1800 boundaries; both wrong
stages/null R2; hint/skip/double tap;15 practice/10 balanced/cone; fallback49 draws;
kill/reopen at selected R1/R2 and each feedback/review phase with fractional time;
actor A→B/guest isolation and stale callbacks; forged/schema/bank/actor rejection;
storage denial/full/DB reopen; atomic duplicate finalization with one immutable
history row/event and rollback on writer failure; review leaves original intact;
leaderboard exclusion/ranking/cap50; actual native BM/English/light/dark/text150%
widgets and Android lifecycle. Flutter analyze/test/build/device/hosted checks
remain unrun and blocked; no native or hosted completion is claimed.
