# Shared shell audit

- Candidate: `d4a71ee5690bf6f94c358b857fa59eff828a9d99`.
- Worker branch: `app-unified-worker-2`.
- Handoff commit: `1a41ddc09b482a19f8b06200a4da88cd2194a3c5`.
- App version: `0.3.0+4`; dependencies, lockfile, SDK, production source and firmware unchanged.
- Worktree: `/workspace/scratch/7395917c0f68/app-handoff/worker-2`, clean after commit. Nothing pushed.
- Owned change: `apps/geomath_flutter/test/design/adaptive_navigation_test.dart` only.

## Result

No shared-shell production regression found in the audited navigation, lifecycle, dialog/back ownership or accessibility scaling paths. AI is a normal contribution using the existing session/lifecycle/navigation owners.

The new regression test uses the real AI contribution, real SQLite FFI repository and its actual saved-slot replacement sheet. It verifies:

1. AI hides the phone destination bar and tablet rail, while `/play/ai` remains the Play destination.
2. Concurrent system and app-bar back closes the confirmation sheet once; it preserves the AI route instance, saved match and entered draft.
3. AI retains its controller and draft across BM to English, light to dark, and 390 to 768 logical width.
4. System nonlinear text scaling reaches the actual AI route without flattening: with app 150%, 16 dp becomes 48 dp and 32 dp becomes 72 dp.
5. Leaving AI returns to the original mounted legacy activity, retaining its route instance, controller and draft; the tablet navigation rail is restored.

Existing adaptive tests additionally verify 320/390/430/768 dp, both languages, combined system/app scaling, 48 dp navigation targets, landscape rail reachability, preference/layout preservation, covered utility routes, scroll restoration and reduced motion. Shared-widget tests exercise accessible wrapped headers, keyboard/sheet actions and readable loading/retry. Interaction policy tests preserve the nonlinear curve and gate haptics.

## Source audit

- `app_router.dart`: stable MaterialPage route-instance keys and keyed destination content preserve mounted features across rail/bar changes. The route's `showNavigation` controls both adapters. Popup observation and root pending-pop coalescing close pageless routes before activity back policies.
- `app_navigation.dart`: one back/reset owner captures the entry, coalesces requests, checks stale completions and asks covered activities before reset.
- `app.dart` / `geomath_text_scaler.dart`: the system TextScaler is composed with the app preference using `system.scale(fontSize) * appScale`, retaining its nonlinear curve. Preferences rebuild presentation around the same router.
- `app_lifecycle.dart` / `audio_coordinator.dart`: one native lifecycle observer and one serialized audio owner remain in place. AI consumes the existing lifecycle service; no extra SDK lifecycle observer or audio endpoint was added.
- `ai_battle_feature.dart` / `ai_battle_screen.dart`: AI's `/play/ai` route has `showNavigation:false`, uses the normal back policy for durable leave, and pauses when its AppRouteScope becomes covered. It keeps its name controller in State, separate from the legacy activity.
- `solo_feature.dart`: `/play/solo` also keeps `showNavigation:false`; ordinary `/play` retains the existing shell navigation. No route, data, controller or service registration was changed by this worker.

## Validation

Environment: supplied Flutter at `/workspace/scratch/459484a16739/toolchains/flutter`, `PUB_CACHE=/workspace/scratch/459484a16739/pub-cache`; host Flutter widget tests with real SQLite FFI. Commands run from the app directory.

| Command | Result |
| --- | --- |
| `dart format --output=none --set-exit-if-changed test/design/adaptive_navigation_test.dart` | Exit 0, no formatting changes |
| `flutter analyze --no-pub test/design/adaptive_navigation_test.dart` | Exit 0, no issues |
| `flutter test --no-pub test/design/adaptive_navigation_test.dart test/design/shared_widgets_test.dart test/design/interaction_policy_test.dart --reporter expanded` | Exit 0, 27 tests passed |
| Focused new AI confirmation/state-retention test after changing the test I/O wait to a bounded 10-second deadline | Exit 0, passed |
| `git diff --check` | Exit 0 |

The test helper alternates real I/O and widget pumping while AI loads SQLite. Its deadline allows slower hosts without replacing real storage or forcing feature readiness. During test authoring, naive `pumpAndSettle` timed out on the real asynchronous loading spinner, and field focus initially scrolled back after `ensureVisible`; the final test handles actual I/O and dismisses focus before tapping. These were harness corrections.

No Android emulator/physical device, APK build, hosted backend or firmware execution was performed by this worker. Parent owns full-suite/build/device gates. Local `main` and archived `docs/geomath-app` are absent in this sparse partial worktree; root AGENTS/SOR/COMMON_RULES and available frozen app contracts/current source were read.

## Observation sent to lead

AI setup loading currently uses a raw indeterminate `CircularProgressIndicator` (`ai_battle_screen.dart`, around line 302). It remains animated with reduced motion, whereas shared `LoadingState` uses a static value under `MediaQuery.disableAnimationsOf(context)`. This is a small existing AI presentation observation, not a shared-shell regression. Lead was notified for the AI owner to assess; no production edit was made here.

The AI phase scroll-key regression discovered by the game worker is owned by that worker and is outside this commit.
