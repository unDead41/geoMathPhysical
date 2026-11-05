# Acceptance and screen mapping audit — worker 6

**BLOCKED_FOUNDATION.** This is a requirements audit: all 29 owned native IDs and all 16 extra states remain unimplemented. No Flutter scaffold, styles, shared contracts or feature tests were created.

Source: `app` at `38f061af963256528d5060ff076bae9ee05eafc3`; private branch `app-cloud-game-worker-6-7395917`. The paired `06-screen-matrix.json` contains exact catalog metadata, ownership, sources, acceptance conditions and required suites for every ID.

## Evidence boundaries

| Layer | Observed evidence | Meaning |
|---|---|---|
| Instruction/source | Clean starting worktree at the app SHA above; document/SOR version 1.0.0; inherited Digital 2.9.0 and module 1.6.1 | Requirements and source text can be audited; this is no native implementation |
| Remote gate, reported by lead | `app-foundation` and `app-learning` absent from branch listing; `FOUNDATION_READY.json` lookup returned 404/no commit found | No READY SHA, frozen signatures/hashes, SDK or foundation preview evidence available |
| Current source refs, reported by lead | `main` = `25836eb1a6f24459aace8a3980ae880a13e3b488`, firmware v2.0.2; `main-digitalized` = `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital 2.9.1 | Fresh source observations, separate from older `SOURCES_AND_STATUS.md` snapshot and this app checkout |
| Native build/device | No app package, preview, APK, emulator or phone run audited | Every native implementation/visual/test result remains blocked |
| Hosted backend | No deployment, Auth/provider delivery, CRUD/sync activation, two-client hosted Duel or capacity receipt | Git/source and historical local suites do not prove hosted activation or 5,000-user capacity |
| Mockups | `docs/geomath-app/assets/` unavailable in this checkout | PNG/flow visual inspection deferred; no pixel or layout approval claimed |

Read root/app AGENTS, SOR_VERSIONING, APP, Prompt 3, COMMON_RULES, app README/SOR/architecture/catalog JSON+Markdown/UX/design/test/source-status/backend/offline contracts and existing implementation plan. Read integration README/SQL_ORDER and targeted canonical source text for gameplay, auth, classroom, transport, sync and tokens. Source groups and hashes are recorded in the matrix; source references are acceptance inputs, not Flutter PASS receipts.

## Ownership and coverage

| Feature owner in app-cloud-game | Native IDs | Count |
|---|---|---:|
| solo, worker 3 | 02,03,05–09 | 7 |
| duel, worker 4 | 10–13,48 | 5 |
| auth, worker 1 | 14–16,45–46 | 5 |
| classroom, worker 2 | 17–22,42–44 | 9 |
| profile, worker 1 | 23–24,47 | 3 |
| Total | 02–03,05–24,42–48 | 29 |

EX01–EX08 belong to classroom; EX09–EX11 to sync; EX12 to Duel; EX13 to profile; EX14 to auth; EX15 to classroom with shared network policy; EX16 to sync with auth/classroom/Duel capability adapters. All 16 are `BLOCKED_FOUNDATION`.

**EX11:** app-learning presents the learning storage failure returned through the frozen persistence port; app-cloud-game owns the signed-in writer/outbox failure behavior. A failed atomic transaction must not report durable save/sync or evict queued records. Foundation owns the shared failure type and guest/local implementation. This audit creates none of those interfaces.

Foundation owns 01/04/37–40 and shared shell/theme/preferences/help; learning owns 25–36/41. Reuse those contributions after freeze. 07/45/48 are states; 48 shares 12's proposed route, and forms/dialogs may share controllers. Do not infer a new page class for each ID.

## Acceptance that assembly must preserve

| Area | Positive requirements | Required negative boundaries |
|---|---|---|
| Solo 02/03/05–09 | Canonical five shapes including cone; 15 unique questions, three/shape; quiz 10 = two/shape; practice all 15; select then scan R1 solid→R2 net; +1 only complete pair | Wrong R1/R2, premature R2, double tap, skip and hint once; R2 untouched is notAttempted; explicit RNG-draw/clock JS→Dart trace parity |
| Solo timing/persistence | BLINK 900 ms, WRONG 1200 ms, REVIEW 1800 ms; correct auto-advance after 900; wrong/skip requires Continue after at least 1800; owner/schema/ruleset/exact-bank validation | WRONG is not auto-next; dialog/background pauses solo; kill/reopen at both stages, feedback/review and fractional elapsed; corruption, denied/full storage, actor swap and duplicate finalization; quiz-only max 50; retry subset preserves original |
| Duel 10–13/48,EX12 | Protocol 2, two players, 10 shared questions; countdown 3 s after both Ready; lobby PIN 10 min, match 15 min; server projection and time | Same payload+seq on lost ack; durable 900/1800 gates including final review; reconnect/background/dialog never pause clock; forfeit confirmation; 429/Retry-After, stale room/epoch, protocol mismatch; no active answer/bank-ID or opponent private data leak |
| Auth/profile 14–16/23–24/45–47,EX13/14 | Gateway/SDK session adoption, server-owned role; username 3–24 `[a-z0-9_]`, display name 2–60, password 10–128 per source; protected single session owner; draft/save/discard | Cold/warm/duplicate/expired/reused recovery callbacks, logout/actor switch, provider unavailable and unknown update outcome; raw reset route grants no permission; email uses links; legacy recovery uses existing 32-hex code; SMS excluded; observed OTP 6/cooldown 60 s is documented for source audit only |
| Classroom 17–22/42–44,EX01–EX08 | Teacher ownership/current student membership; PIN exactly six digits and 24 h expiry; same attempt; online server clock/ranking; closed is terminal; create/edit names trimmed 2–60 Unicode code points without controls | Teacher/student/outsider and two classes; revision conflicts preserve drafts; archive/restore retains history and never restores old PIN/open closed room; playing prevents relevant archive/remove; empty-only delete; stale invitation UUID and revoked membership |
| CRUD wire | `classroom_crud:1`; nonnegative integer `expected_revision` on rename/archive/restore/delete/remove; exact payload keys from API | `cancel_invite`/`decline_invite` take `invite_id` only, without revision; unknown fields rejected; unknown outcome refresh/reconcile before retry; no optimistic destructive success |
| Sync EX09–EX11/EX15/EX16 | Reflection or completed solo record + pending event in one SQLite transaction; owner partition; immutable IDs/content_version/ruleset; batches ≤20, pending ≤2000/owner; specific valid ack IDs only | Rollback/crash/DB reopen; partial/duplicate/foreign/missing/invalid ack; ID-content conflict; expired session, missing RPC, permanent error, A→B mid-flight; no guest transfer, silent eviction or credential; auth/CRUD/PIN/live class/Duel/help never queued |

Create-room's rendered HTML field currently says `maxlength=120`, but the effective source validator and server use 2–60. Accept against the validator/server, including Unicode boundary cases, rather than copying the field attribute (`portal.mjs` validation and backend source in matrix).

## Visual, semantic and lifecycle acceptance after READY

- Exercise every owned ID/state at 320/390/430/768 dp, BM and English, light and dark, text 150%; also baseline 100/125%, system theme, strong contrast, reduced motion and supported orientation changes.
- Reject clipped primary actions, overflowing forms/dialogs, inaccessible card choices, tables without a usable small-screen layout, keyboard-covered fields/buttons and unsafe-area collisions. Check long English labels and localized validation/pending/error text.
- Use foundation's generated token mapping, shared shell/field/button/sheet/dialog/notice/loading/error/empty/success components and one preferences/audio owner. Neutral geometry cards must not reveal correct pairs through unique color cues. No feature-local theme/style fork.
- Native targets ≥48 dp; TalkBack labels/order/state, meaningful stage/selection/outcome labels, tap alternatives to drag, visible focus, invalid-field focus and dialog focus return must work. Color/motion/audio cannot be the only explanation.
- Cover applicable loading/empty/error/retry/offline/saving/success, conflict/unknown outcome, pending/needs-auth/unavailable/storage-failed and revoked-access states. Keep drafts and focus during refresh; announce actual acknowledgements only.
- Theme/language/text changes preserve attempt, draft and selected state. System/gesture/app-bar back share policy. Solo pauses/checkpoints remaining time; Duel/classroom retain server deadlines and foreground resync. Late actor/session/epoch/room responses are ignored; polling/refresh is single-owner/single-flight.

## Native evidence still required

1. Obtain `origin/app-foundation` READY at the exact SHA also used by app-learning. Read its actual contract, hashes, typed failures, actor/session store, transaction/record writer+reader, contribution/bootstrap APIs, neutral cards, preferences, lifecycle and audio ownership; send integration requests for gaps before implementation.
2. Assemble real widgets against repositories/controllers and frozen shared components, then run the Android preview `lib/dev/cloud_game_main.dart`. A labeled fixture transport is test-only. No screenshot-as-screen or static gallery acceptance.
3. From the app package, record SDK/lockfile and actual command results for formatter, `flutter analyze`, meaningful feature unit/widget/database tests, Android integration tests and `flutter build apk --debug -t lib/dev/cloud_game_main.dart`. Build/automation/physical-device results remain distinct.
4. Capture screenshots from the running native preview across the matrix, obtain unavailable mockup PNGs for comparison, and record deviations against canonical behavior. Verify semantics/lifecycle on emulator and at least one physical Android phone before claiming a tested phone APK.
5. Separately, when an authorized staging environment exists, verify actual Auth/callback/provider capability, two actors/two classes/Realtime revocation, outbox ownership/ack and two independent Duel clients including guest. Preserve hosted deployment receipts separately; no live SMS/OAuth/SMTP/migration side effects are authorized by this audit.

## Documentation verification

The inline JSON check verifies exact sets/counts, uniqueness, catalog parity, per-ID owners/acceptance/source/suite references, all statuses blocked/unimplemented, source hashes and EX11's split ownership. It does not execute any app code.

| Check | Result |
|---|---|
| JSON coverage/consistency script | PASS, exit 0: 29 native + 16 EX; exact catalog parity, blocked status, ownership, source hashes, suites and visual matrix |
| `python tools/check_version.py` | PASS, exit 0: `[VERSION OK] GeoDecoder v1.1.3`; inherited firmware only, no bump |
| `git diff --check` | PASS, exit 0; staged scope/whitespace checked again before commit |
| Flutter/analyze/build/widget/database/Android/visual/hosted | NOT RUN — foundation missing |

Reproducible coverage command from the repository root (the first run also checked all referenced source SHA-256 values and negative-suite references):

```sh
python - <<'PY'
import hashlib, json
from pathlib import Path
root = Path('apps/geomath_flutter/docs/handoffs/app-cloud-game/audit')
d = json.loads((root / '06-screen-matrix.json').read_text())
c = json.loads(Path('docs/geomath-app/screen_catalog.json').read_text())
a, b = d['screens'], d['supplemental_states']
expected = {f'{n:02}' for n in [2, 3, *range(5, 25), *range(42, 49)]}
assert len(a) == 29 and {r['id'] for r in a} == expected
assert len(b) == 16 and {r['id'] for r in b} == {f'EX{n:02}' for n in range(1, 17)}
assert len({r['id'] for r in a + b}) == 45
index = {r['id']: r for r in c['screens']}
assert all(all(r[k] == index[r['id']][k] for k in index[r['id']]) for r in a)
index = {r['id']: r for r in c['supplemental_states']}
assert all(r['catalog_behavior'] == index[r['id']]['behavior'] and r['requirements'] == [index[r['id']]['requirement']] for r in b)
assert all(r['implementation_state'] == 'BLOCKED_FOUNDATION' and r['implemented'] is False for r in a + b)
assert all(r['implementation_owner'] == 'app-cloud-game' and r['feature_owner'] and r['presentation_owner'] and r['acceptance'] for r in a + b)
assert all(s in d['source_registry'] for r in a + b for s in r['source_refs'])
assert all(s in d['required_suites'] for r in a + b for s in r['required_suites'])
for s in d['source_registry'].values():
    assert s['source_sha'] == d['instruction_source_sha'] and s['native_evidence'] is False
    assert all(hashlib.sha256(Path(f['path']).read_bytes()).hexdigest() == f['sha256'] for f in s['files'])
assert all(s['status'] == 'BLOCKED_FOUNDATION' and s['executed'] is False for s in d['required_suites'].values())
ex11 = next(r for r in b if r['id'] == 'EX11')
assert ex11['presentation_owner'] == 'app-learning' and ex11['persistence_failure_owner'] == 'app-cloud-game'
assert d['required_visual_matrix']['mandatory_cross_product'] == {'viewport_width_dp': [320, 390, 430, 768], 'language': ['BM', 'English'], 'theme': ['light', 'dark'], 'text_scale': [1.5]}
assert d['status'] == 'BLOCKED_FOUNDATION' and d['foundation_gate']['ready_sha'] is None
assert not Path('apps/geomath_flutter/pubspec.yaml').exists()
assert not Path('docs/geomath-app/assets').exists()
assert len((root / '06-acceptance.md').read_text().splitlines()) <= 150
print('PASS: 29 native + 16 EX; catalog, blocked status, owners, source hashes, suites, EX11 and visual matrix.')
PY
```

Recorded output: `PASS: 29 native + 16 EX; catalog, blocked status, owners, source hashes, suites, EX11 and visual matrix.`

Only this report and `06-screen-matrix.json` are within worker 6's change scope. No source integration, shared theme, root, firmware, backend, platform or learning files are changed; no push is performed by this worker.
