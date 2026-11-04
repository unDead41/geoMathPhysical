# Independent final integration source review

Verdict: **spec compliance PASS; code quality PASS for the reviewed combined source. No unresolved Critical or Important finding.** Final release generation, full-suite results, provenance, remote ancestry and push verification remain the root integrator's gates. This review does not certify a deployed backend/frontend.

Reviewed worktree: `/workspace/scratch/8354d9072f14/geodecoder-integration`, integration base `391df985eea4fee15d9859e678068b1a3f613cba`. Read `integration-progress.md`, `transport-merge-report.md`, `sql-integration-fix-report.md`, `module-merge-report.md`, relevant combined source changes, candidate SQL, SQL order documentation and focused tests. Review ran while root finalized Digital 2.9.0/module 1.6.1 provenance and generated assets; earlier vendor/build state was not treated as a finished-release defect.

## Important finding resolved during review

**Stale classroom entry destination — fixed.** In `digital/dist/app.mjs`, `navigateEntry` stores a requested destination before invoking `requestHome`. Classroom games intentionally return immediately to their portal, but the earlier `requestHome` room-state branch did not consume/clear that destination. Reproduction: start a classroom game → choose Learn in primary navigation → portal opens → exit portal → an old Learn destination can replay instead of staying Home. `ui_merge` confirmed the path and updated line 918 to clear `pendingEntryRoute` before opening the classroom portal. The new real-app DOM regression in `digital/tests/solo-ui.test.mjs:178` passes independently. The existing classroom departure behavior and later Home behavior are both retained.

## Spec compliance

| Required integration boundary | Review result |
|---|---|
| Offline owner/session/outbox | Preserved. Remembered ownership scopes local records; sends use `_boundRpc` with verified SDK owner/session and explicit bound Authorization. Account changes invalidate cached reads and pending response application. Storage acknowledgements remain owner-scoped and lost responses remain replayable. |
| One module sync owner | Preserved. `ModuleProgress.handleMessage` persists local data immediately and sends `onRecord` into the durable outbox. Its direct RPC debounce path is not scheduled when the offline adapter owns sync. Old iframe/session messages and account-change responses remain rejected. |
| Solo completion exactly once | Preserved in reviewed path. Completion uses the stable attempt ID; repeated completion data deduplicates in the queue and SQL receipt. Duel/classroom results fail the formative solo eligibility boundary. Finished saves do not offer Resume. |
| CRUD retention/security plus scaling | Preserved. Public calls route through the lifecycle wrapper; direct authenticated execution of the original dispatcher stays revoked. Wrapper snapshots return before the account mutation lock. Heartbeats retain selected-room/current-membership predicates and 15-second stale-write conditions. Management mutations preserve ownership/archive/revision checks and attempt/progress retention. Guarded original routine bytes/fingerprints remain unchanged by the wrapper fix. |
| Entry/Duel/room routes | Preserved after the fix above. Reviewed solo leave/cancel, Duel-to-Classes, guide/help and classroom-to-portal boundaries. Server Duel scoring/timing and pending-sequence ownership remain in their existing owners. |
| Module mathematics | Preserved. Independently compared the 15 canonical geometry/math/controller files in module provenance against `HEAD`; all 15 remain byte-identical to the integration base. The three module UI regions compose around those owners. |
| Source PWA/build contract | Preserved. The builder emits complete PWA HTML, worker, manifest, icon and both music files; its version hashes all relevant content. The service worker caches the enumerated public assets only, bypassing API/authorized/arbitrary requests. Existing standalone generation remains available. |
| No hosted/public deployment | Preserved in reviewed source scope. The history gate remains strict; all historical migration bytes/receipts remain separate from pending candidates. `SQL_ORDER.md` accurately records source locations, root-registration prerequisite, atomic scaling execution and the complete bootstrap route. |

## Code quality assessment

The integration keeps one composition owner in `app.mjs`, one verified transport/cache owner in `cloud.mjs`, one managed module-progress/outbox path, and the backend authority boundaries. It does not copy old full dispatchers over newer contracts. The SQL wrapper fast path is narrow and independently supports CRUD-before-scaling installation. The combined tests exercise externally relevant behavior—read-only enforcement, tuple coalescing, real permission checks, stable result IDs and stale session rejection—rather than merely reproducing the implementation text.

No additional source-quality change is required by this review. Root should keep the documented deployment prerequisites in the release handoff: a source push does not install candidate SQL/Edge changes or activate the PWA mirror, and canonical migration registration remains future backend rollout work.

## Verification and limits

Independently reran only focused checks, avoiding full-suite duplication:

- `node --test --test-concurrency=1 tests/transport-integration.test.mjs`: **4/4 PASS**. Covers retryable SDK errors before/after cache hits, owner/session changes, coalesced CRUD permission errors/recovery, immediate durable module queueing without the direct debounce.
- `node --test --test-concurrency=1 --test-name-pattern='entry routes|Duel entry navigation|solo completion|classroom return' tests/solo-ui.test.mjs`: **4/4 PASS**. Includes the resolved classroom navigation regression and real signed-in solo completion queueing.
- Canonical module-source comparison: **15/15 files unchanged** against integration base.
- Independently read the final SQL fast path and combined SQL tests. The SQL implementer's recorded **30/30** focused passing results include both installation orders, CRUD alone, read-only snapshots, 15-second heartbeats, removed-membership filtering, offline ownership/replay, ACLs and guarded rollback. The module implementer's report records **341/341** tests plus Explore/Labs/Studio browser matrices.

No source edits, subagents, hosted calls, public deployment, commit or push were performed by this reviewer. Local PGlite/DOM/browser evidence does not establish production Auth/Realtime, physical-device behavior, multi-session PostgreSQL concurrency or 5,000-user capacity. Root owns final full-suite/build evidence and actual remote commit/ref verification.

## Scoped re-review — skip link and module accessibility assertion

**PASS; no new Critical or Important concern.** Reviewed the small follow-up at `digital/dist/app.mjs:585`, its DOM regression and the real-keyboard usability browser assertion. The existing skip link targets the focusable `<main id="main" tabindex="-1">`. Its click handler now prevents fragment navigation, focuses that same main landmark and scrolls it into view. Keyboard Enter activates the normal anchor click path, so the change retains skip-navigation semantics while avoiding the new Play route's `#main` hash. It neither changes game state nor opens a leave dialog. Independently ran `node --test --test-concurrency=1 --test-name-pattern='skip to content' tests/solo-ui.test.mjs`: **1/1 PASS**.

The `digital/tests/module-native-settings.test.mjs:51` adjustment matches the delivered module UI contract: `details.progress-summary` has `aria-labelledby="module-records-title"`, that title is localized to “Your learning journey”, and all four activity action controls remain present. This replaces an obsolete literal-label assertion with checks of the actual accessible-name relationship and retained functionality; it does not remove the accessibility requirement. No product source change accompanies that test adaptation. The earlier spec/code-quality verdict remains PASS, subject to root's final full-suite/build and remote verification gates.
