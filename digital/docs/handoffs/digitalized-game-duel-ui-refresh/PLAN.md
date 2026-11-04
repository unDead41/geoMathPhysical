# GeoMath Duel UI refresh plan

Goal: implement concept screens 10–13 on the current protocol 2 controller.
Base: `391df985eea4fee15d9859e678068b1a3f613cba` (Digital 2.8.0).
Concept: `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd`.

The user supplied the visual direction and authorized direct implementation.
Keep one Game, DuelClient, preferences owner, native dialog and token system.

- [x] Read source, design/domain contracts and ownership; verify both original
  image SHA-256 hashes. Set up an isolated linked worktree on the requested branch.
- [x] Replace only Duel entry/lobby markup with a centered heading, exact SVG
  kit, two action cards, one accessible six-digit input and two player slots.
- [x] Present current-player/opponent status, server score/time, actual countdown
  and result through the existing controller. Keep all five choices per shelf.
- [x] Scope the compact workbench and result layout with mode attributes; consume
  central runtime tokens. Preserve Home, quiz, practice and classroom layouts.
- [x] Verify pending/retry/invalid/expired PIN and duplicate protection, keyboard,
  locale/theme/text preferences, reconnect/reload in R1/R2/review, tie and forfeit.
- [x] Run design check, unit suite, isolated two-context Duel suite, build,
  local prepare, check, shared design/browser regressions and strict UI audit.
- [x] Save real desktop/mobile screenshots and verification receipts. Commit and
  push only `digitalized-game-duel-ui-refresh`; read the remote SHA back.

Review focus: names are escaped; empty slots never invent a player; polling must
not replace focused controls or selected cards; result waiting state must not
declare a winner; expired/retried operations retain controller idempotency.

No backend changes, production matches, migrations, Pages or other branch pushes.
The final receipt records implementation SHA first, then a documentation receipt
commit; a file cannot contain its own final commit hash.
