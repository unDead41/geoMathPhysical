# Digital v2.8.0 integration

This release combines three reviewed heads on top of deployed v2.7.0:

| Feature | Branch | Commit |
|---|---|---|
| Central design system | digitalized-ux-design-system | eb42bb2ad1bbd2a362dfc04de387872017b913f5 |
| Visual help/tutorial | digitalized-utility-help-support | 2b39f290f736f6cf324544c987bd2b30a22ab99f |
| Plan/elevation and calculation tools | digitalized-module-pelan-pengiraan | afe35b3bf87182403405f062c5bcbe2242866056 |

Integration base: `2e5c70cf4176f99a82376697081c0b6ed4b1368a`.
Digital is v2.8.0, the pinned module is v1.6.0, and firmware remains v1.1.3.

The central token owner now feeds portal and native module adapters; stylesheet
order retains Help and foundation layers. Visual tutorial/help uses finite
animation, pause/replay and static reduced-motion storyboards. The rebuilt
module adds Studio Pelan & Dongakan and Semakan Langkah Pengiraan in BM/English.
The vendor pin is regenerated from the merged source, not copied from an old
branch artifact. Its exact immutable source commit and blob are in
`vendor/module-release.json`.

Integration fixes preserve all v2.7 features. Fresh Duel start clears stale
lobby recovery state so an earlier invalid PIN cannot erase the first keyboard
choice on polling. Help badges use accessible semantic colors and scale from
12px to18px at150% text; module navigation badges wrap without splitting words.
The keyboard focus check now uses actual keyboard modality. No backend schema,
Auth/SMTP, scoring rule, Duel protocol or firmware changes are required.

Verification includes350 application tests and328 module tests;26 design
browser scenarios;7 Help/report scenarios; visual animation/reduced-motion and
eight computed contrast/text-size combinations; embedded projection/calculation
interaction and phone layout checks; and two-context Duel replay/reconnect,
10–9 results, forfeit and deadline. Evidence records the actual tested scope.
Browser checks use Chromium emulation and isolated fixtures, not physical devices.

Website and offline aliases are rebuilt together. Source integration alone is
not evidence that Pages has deployed. The final publication receipt is stored
alongside this release under `integration-evidence/v2.8/` after live hash and
workflow verification. Older branch receipts remain historical.
