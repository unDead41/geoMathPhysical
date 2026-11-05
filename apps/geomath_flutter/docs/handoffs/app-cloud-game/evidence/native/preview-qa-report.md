# Native preview and independent QA resume

- Branch: `app-cloud-game-native-worker-6`; app `0.1.0+1`.
- Final QA/startup commit: `4b50767b1281cd1224c0d89a750905b5bdb41f5f`, parent `c52314146779c90b7cd77b0f26ad7863b09eb668`. Route assembly QA commit remains `c52314146779c90b7cd77b0f26ad7863b09eb668`.
- Foundation: READY `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`, contract `1.0.0`.
- Owned changes are three cloud-game test files and `lib/dev/cloud_game_features.dart`. No push, parent-tree edits, root ownership changes, backend changes or platform edits.

Saved-login restore now permits offline guest continuation for `network`, `retryAfter` or `unavailable` only while verified Auth still exposes a guest binding. Protected storage failures remain retry-gated. The saved protected login is retained, account queues remain separate, and one sync controller is started. A localized guest notice offers actor-bound retry except during server rate limiting.

The bootstrap test now proves one real `NativeAuthRepository` also supplies the `CloudGateway` used by profile, classroom and sync. It proves solo uses the same signed-in formative writer/outbox/database/session owners exposed through foundation extension ports. Production preview installs real repositories and IO adapters; absent config remains honestly unavailable.

The widget test now visits every one of the 19 feature routes at 320/390/430/768 dp × BM/English × light/dark × 150% text: 16 profiles, 304 route/profile combinations. It checks one shared app/page shell, unchanged actor/writer, translated labels, visible tap targets and absence of Flutter exceptions. It also taps the real Play→Duel and Play→sync links added by solo owner commit `655697ffddc13f6ce5691067370eb770865ce514`.

| Check | Result | Evidence |
| --- | --- | --- |
| Formatter, changed test files | PASS; no formatting changes | `worker6-resume-format.log` |
| Analyze `lib/dev`, cloud-game tests, preview integration target | PASS; no issues | `worker6-resume-analyze.log` |
| `flutter test --no-pub test/features/cloud_game --reporter expanded` | PASS 25, fail 0 | `worker6-resume-final-cloud-game.log` |
| Targeted startup regression after offline fix | PASS 9, fail 0 | `worker6-offline-startup-verified.log` |
| Analyze/formatter, changed startup files | PASS; no issues/no formatting changes | `worker6-offline-startup-analyze-final.log`, `worker6-offline-startup-format.log` |
| `git diff --check` | PASS | local command |

The 25-test matrix receipt predates the startup change. The focused 9-test startup receipt proves prior protected-session failures HTTP502/429/503 keep actual guest Solo and explicit login reachable at320dp/150% in BM/English; protected login bytes and old owner's queued records remain unchanged, guest writes stay local, retry creates no second sync owner, and late refresh cannot replace a newer server-verified login. The original protected-storage retry barrier still passes. No unrelated broad suite was rerun.

The earlier scoped suite also reuses real SQLite rollback/reopen/owner isolation, startup restore/retry and solo lifecycle/back checks. Its feature snapshot was the original combined copy plus final auth/profile `e2bb447` and final solo navigation files. Lead subsequently integrated newer classroom, solo data, Duel and sync fixes; the lead's single final combined run must cover that exact final snapshot. The startup run used refreshed final lead feature copies from before the later Auth transport848307d and sync regression39933d changes; the lead owns the final exact integrated run. This worker did not rerun unrelated feature suites.

## Screen/state coverage

`evidence/cloud-game-screen-coverage.json` maps all **29 required screen IDs** (02–03,05–24,42–48) and **EX01–EX16** to the actual native route, source widget/state, test pointers and verification gaps. It includes reviewed worker commits and tested feature hashes.

The complete profile sweep covers guest/unconfigured or empty direct-route entries. It is not a full sweep of populated signed-in dashboards, all dialogs, live matches, review/results, keyboard or TalkBack. Feature fixture tests cover several populated states at 320dp; JSON rows explicitly describe narrower coverage. Historical passing focused `worker6-*` logs remain intact; older failing `worker6-widget-matrix.log` and `worker6-native-combined-final.log` remain historical failures, superseded by the new passing scoped receipt.

## Integration still required

1. Normal composition must install the contributions and await `CloudGamePreviewServices.startup.ready` once after bootstrap if Home is the initial route. The dev preview gates every feature route already.
2. Preserve shared `FoundationServices.recordsWriter` adoption by learning; EX11 learning presentation and signed-in atomic-save behavior need combined learning integration.
3. Foundation tab selection/reset needs the shared feature back-policy guard for unsaved profile drafts and live Duel forfeit. Feature workers did not modify the frozen root.
4. Keep native callback activation false until Android intent filter, allowlist and real callback dispatch are integrated and tested. Google/email delivery and SMS are not claimed; phone OTP is not currently a working native capability.
5. Lead owns APK build, Android integration/screenshot evidence and hosted Auth/CRUD/sync/two-client Duel checks. No Android, physical-device, hosted-service, SMS/Google consent, iOS or capacity PASS is claimed by this receipt.

Sparse historical UX/mockup blobs were unavailable locally; this is shared-component/layout/behavior QA, not a pixel-match claim against all twelve PNG boards.
