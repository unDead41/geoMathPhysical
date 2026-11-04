# Final built browser regression review

Digital 2.9.1; pinned module 1.6.2. Real Chrome-for-Testing 151.0.7922.34 through Playwright 1.62.1. All service requests use intercepted test fixtures; no hosted account, report, score, room or Duel mutation is performed.

## Current verification

The initial maintained 13-case usability invocation completed seven passing cases: navigation, layout, dialog-race, drag, storage, account, and classroom-review-fixture. Its layout case passed all 216 Home/game/result/Settings combinations across BM/English, light/dark, 100/125/150% text, and 1365/390/320 px widths.

All 13 unique maintained usability cases are now validated across the retained passes and affected reruns. The complete Help/report suite passed all seven scenarios. Per-case passing-log provenance is recorded in `final-built-browser-coverage.json`.

Five initial assertions used obsolete presentation targets and one final case aborted on a missing test-fixture RPC endpoint. These failures are retained in `final-built-usability.log` and `final-built-usability/` screenshots. The affected six cases plus the successful classroom-review case were rerun after the updates below; the additional classroom-review rerun verifies its new, stronger offline history assertions. Successful unrelated cases and the 216-case matrix were not repeated.

Root subsequently amended only narrow-screen Home, pair-action and Duel presentation styles. The retained matrix predates that final CSS amendment; root separately covered it with final mobile captures of 14 screens. The affected browser rerun uses the latest built inputs, including the rebuilt offline HTML. `final-built-browser-inputs.json` preserves initial input hashes; `final-built-browser-inputs-after-css.json` records the final rerun inputs. Between these snapshots only the standalone offline HTML, `dist/entry.css`, and `dist/style.css` changed; the app bundle and pinned module inputs remain identical.

| Suite | Status | Log/evidence |
| --- | --- | --- |
| Initial full usability invocation | 7 passed; 5 obsolete-target assertions; final case aborted on a missing fixture endpoint | `final-built-usability.log`, `final-built-usability/` |
| Affected usability cases after maintained test updates | 6/7 passed; practice-correct stopped on the obsolete blanket prohibition of bounded MathML scrolling | `final-built-usability-after-selectors.log`, `final-built-usability-after-selectors/` |
| Practice-correct after strict accessible-scroll checker update | 1/1 passed; exit 0; all 15 IDs, 90 BM/English rich-text views and zero offline HTTP(S) requests | `final-built-practice-keyboard-final.log`, `final-built-practice-keyboard-final/` |
| Help/report complete suite after maintained test updates | 7/7 passed; exit 0 | `final-built-help-final.log`, `final-built-help-final/` |

## Maintained test updates

Only test/helper files were edited by this reviewer:

- `usability.browser.mjs` still checks that result details start collapsed, then opens them before asserting the same exact visible mistake, first-R1 and hint values. Score totals, 15-question coverage, wrong/skipped subsets, storage isolation, clocks and error assertions remain intact.
- The account identity selector now targets `#portal-account-identity b` and waits for the literal fixture profile to load. Student welcome copy checks its authored exploration wording. The one-question result retains the exact `/ 1` denominator in the new fraction presentation.
- `help-support.browser.mjs` opens the actual footer Help-centre button; the header question mark remains the approved Guide route. Keyboard focus restoration is checked against that real button, and actual FAQ disclosures must start collapsed. The earlier root update to the lab hub/mode disclosure is retained.
- `ease-browser-helpers.mjs` still blocks all network requests in offline mode and additionally uses native CDP `Network.overrideNetworkState` after file navigation, asserting `navigator.onLine === false`. Current Chromium request emulation alone left the browser signal true for file pages; application globals are not mocked.
- The same helper keeps strict paragraph bounds for ordinary MathML. For approved `.formula-scroll` containers it requires a bounded, focusable wrapper with an actual scrolling overflow policy, then presses real ArrowRight keys until the right edge is reached and verifies that the full formula is accessible. Left-edge access is checked and original focus/scroll are restored. The initial S2 warning was this legacy checker mismatch, not an established product clipping defect.
- `classroom-transport.fixture.mjs` now narrowly validates and acknowledges the existing, separate student solo/review outbox protocol. It checks the fixture owner token, exact wire fields, canonical payload and review mode. Both completed classroom-to-local-review cases await exactly one history event and verify the exact score, denominator and zero mistakes/hints/skips, while proving the remote classroom attempt remains untouched and no classroom score/answer RPC is sent.

The strict final keyboard check proved S2 at 320 px in both BM and English scrolls from the start to the full 34/34 px right edge. Its readiness condition waits for the actual formula edge, so native smooth-scroll animation cannot trigger an early assertion. The final 14-file payload hash check found no changes after the last CSS snapshot.

The initial Help invocation targeted the former header Help control. After that target was corrected, three report scenarios passed before the offline-signal fixture mismatch stopped the run. Those logs and screenshots are preserved separately; only the complete final rerun is used for the final 7/7 Help pass count.

Full source suites remain 497/497 app tests and 341/341 module tests passing, as recorded in `../runtime-independent-test-summary.json`. Product source and generated payloads were not edited by this reviewer.
