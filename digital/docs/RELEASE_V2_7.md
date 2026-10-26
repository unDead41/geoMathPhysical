# Digital v2.7.0 — deployment record

Production activation was explicitly authorized after the initial integration. Migration `20261026110959_geodecoder_digital_v2_7_integration` applied successfully. Hosted Duel v2 rollback verification passed. Edge `geodecoder-duel` v2 is ACTIVE with `verify_jwt=true`; its three deployed files match source. Live simultaneous join race passed; the synthetic room was cancelled and removed.

Public frontend commit: `0486388a9c94942ab0973af5609be0168d27323c`; workflow [40313690820](https://github.com/unDead41/geodecoder-digital/actions/runs/40313690820). Website SHA256: `d924bf8709dc04b946cdc64b27f1a271d56380beef4fa82390256f4ae2631f0c`. Runtime source remains `123704bd1265df05854be0f7905fb710fc04533b`; later source receipts change documentation/history only.

Canonical migration history now matches all eleven hosted versions. The original prepared timestamp `20261026105248` was replaced with the actual hosted timestamp; do not apply the nested feature migration again. App/module verification:345+244 tests, plus browser suites. SMTP/Auth email template setup is independently maintained; this deployment did not change those settings.

## Historical integration and initial activation gate

# Digital v2.7.0 integration — activation pending

Seven feature heads are integrated into `main-digitalized`: backend operations,
Duel v2, profile improvements, active sessions, Auth email templates, Help and
Support, and solo Save/Resume. Module remains v1.5.0; firmware remains v1.1.3.
Exact heads and verification are recorded in `integration-evidence/v2.7/integration.json`.

Shared application entry, portal, HTML, package scripts, versions and BM/English
help were merged together. Generated website and offline aliases were rebuilt
from this one source. Both solo and Duel resume actions remain on Home.

Fresh verification: 345 application tests and 244 module tests; seven Help browser scenarios;
BM/English desktop/mobile solo recovery, offline/denied storage/corrupt saves;
two-context Duel 10–9 match, lost acknowledgements, reload, reconnect, forfeit
and deadline, using the real Edge handler and isolated PGlite. Hosted combined
SQL rehearsal passed with every change and fixture rolled back. Browser evidence
is emulation, not a physical-device or independent PostgreSQL contention test.

## Production gate

The new production migration was rejected by automatic approval review and was
**not applied**. Hosted security sessions already exist as version
`20261026091211`; root migration history now matches those ten applied versions.
The then-pending migration was `20261026105248`; after authorization it was applied and recorded as `supabase/migrations/20261026110959_geodecoder_digital_v2_7_integration.sql`.
It adds the profile class teacher field and durable Duel review protocol.

Do not publish these candidate HTML files to Pages until that migration and all
three Duel Edge files have been deployed together and hosted checks pass.
New Duel frontend requires protocol 2 and fails closed on deployed protocol 1.
Live Pages remains on public commit `f5e5e13edd4c3627282cdaca78870c13399ac915`.
No SMTP credentials or production Auth email templates were changed here.

After explicit production authorization: recheck effective live matches (waiting
rooms count only before lobby expiry; playing/countdown only before deadline),
run the history gate, apply only the canonical pending migration, record its
actual hosted timestamp/hash, run rollback verification, deploy `index.ts`,
`handler.mjs` and `questions.mjs` together with `verify_jwt=true`, then publish
`artifacts/site-index.html` plus audio to the public repository and verify the
workflow and live hashes. Do not replay nested feature migrations separately.

Old branch receipts are historical, not proof that production v2.7 is active.
