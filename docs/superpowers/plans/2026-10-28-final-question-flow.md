# Final GeoDecoder flow implementation

User-authorized execution: implement and publish to main/sharing without a
design approval pause. Main baseline c9275fda75b1720613c5bfa776e6b3049ee326d5
(v1.1.4); sharing 4e3fdfcbfc1508dcf4cce55a58df637243c33f2a.

1. Add failing real-engine and firmware regressions for focus-driven reader
   order, terminal wrong answers, indefinite red blink, frozen clock, NEXT,
   held inputs, stale cards and all fifteen explanation frames.
2. Give Question typed solid/net focus and two short explanation rows. Keep
   IDs, question/hint copy, answers and randomized selection unchanged.
3. Add WRONG_ANSWER to the pure engine state machine. Track completion of the
   first card independently of its physical reader. Wrong answers pause at the
   scan timestamp; only explicit continuation advances. Correct/skip retain
   three synchronized 150 ms ON/OFF cycles and the existing stopwatch policy.
4. Adapt application routing, stop/play/retry, Serial and pure LCD view.
   Keep GPIO/NVS, diagnostic controller and the sole RGB build unchanged.
   Recoverable unknown UID/wrong-role help must not finalize an answer.
5. Update active guides, contributor contract, changelog and verification.
   Release v2.0.0: the answering/retry contract changes; no NVS migration.
6. Run version checks, pure tests, all six native configurations and the
   default ESP32 build. Synchronize only shipping firmware/docs into sharing,
   retain installer/assets, refresh source SHA and payload checksums, build
   sharing and verify firmware parity. Never merge sharing deletions to main.
7. Re-read remote heads before each lease-checked publication, preserve concurrent
   tutorial changes, then verify actual published SHAs and source parity.

Review focus: both order directions, last-question failure, locked failure
through stop/play/retry/diagnostics, NEXT held beyond a transition, stale cards
at either stage, no answer disclosure outside failure, ASCII 20-column rows.

## LCD completion against current main/sharing (v2.0.1)

Re-audited main c368e8c951478360c89f99b8a3c9944a62761049 and sharing
63a1193978577a9f8a4fe116a902ec08e87b52d5 (v2.0.0) before publication.
Retain their typed focus, engine, explanations and all seven PDF assets.

- [x] Re-run current baseline: 14 pure and 75 firmware integration cases.
- [x] Add guide/page/navigation and pending-HINT regressions; observe both fail.
- [x] Extend Cara Main to 15 pages and per-button suppression while retaining NEXT.
- [x] Regenerate exact LCD handoff from current source and align Serial/docs.
- [x] Validate six native modes, sharing entry, default ESP32 builds and release SOR.
- [x] Independent final review: no Critical/Important issues; pre-existing K1 wording minor retained.
- Publication uses fresh-head guards; sharing source SHA/manifest are finalized from the actual main commit.
