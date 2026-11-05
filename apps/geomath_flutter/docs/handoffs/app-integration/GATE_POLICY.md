# Targeted completion of the unchanged-runtime Android gate

The integration owner may combine these receipts only when every condition below
is verified. A diagnostic/follow-up run is never a standalone publication gate.

- Baseline245f9ee / CI42066617435 passed formatter, analyzer,492host tests,
  50canonical checks,15tool checks and normal debug/release builds.
- Its combined real-Android suite passed25actual cases. Its sole failed case was
  solo_reopen_test59, reading game immediately after a tap while native SQLite
  start/initialization was still pending. Preserve that failed result.
- The corrected Solo test must pass on Android with all original attempt,
  selected-card,R1/R2,score,durable-save and database-reopen assertions intact.
  It waits for actual enabled controls and native completion; it supplies no
  replacement game state.
- All170tracked runtime paths and file hashes must exactly match245f9ee. The
  follow-up rejects a changed/added/removed runtime file before device work.
- Normal-main capture uses the exact APK from baseline artifact13435485632,
  validated by SHA25666c16685019baa334f54af89bd617206ef021432f2208c4faae2342cfbf72eea.
  The independent deliverable has the same170runtime inputs but its own binary
  SHA/certificate receipt; do not claim that exact local binary ran in CI.
- All32actual production captures across the four declared profiles must finish,
  pass expected-state/paint/hash checks and be visually reviewed. The corrected
  gesture stays within fresh WebView XML bounds and outside the canvas;
  minimum visible-model dimensions remain128x200px.
- Final changes after these receipts may contain evidence/documentation only.
  Recheck runtime equivalence,scope,root version consistency and remote refs.

Only this combined verification resolves the critical offline integration gate.
The baseline workflow remains failed; no earlier receipt is relabelled success.
Hosted Auth/classroom/sync/two-client Duel,physical-phone/manual accessibility and
performance remain separately unverified. App may fast-forward only after the
integration owner records that all combined conditions actually passed.
