# Tetapan Penggunaan — feature branch verification

Base branch: digitalize
Base SHA: adc51627eaaace5d9543c7e033d2994986c8715d
Inspected firmware main: a059979d97926b82cafd4aa5cf3fe59da04a55bb (v1.1.3).
Result branch: digitalize-utility-preferences. No protected/publication branch is updated.

Git CLI fetch was attempted first but lacked HTTPS credentials. The connected GitHub branch endpoint confirmed the full base SHA equals this isolated worktree's initial HEAD. Existing worktree status was clean. The branch is published through the connected GitHub Git-data API instead of unauthenticated Git transport.

## Ownership

`dist/preferences.mjs` owns defaults, normalization, persistence and shared control markup. The canonical browser key is `geodecoder.digital.preferences.v1`; existing music enablement migrates on first read. The existing independent theme owner/key remains unchanged. This base has no general portal settings repository, so the new repository follows its guarded localStorage pattern. Settings contain no account, score, analytics or authentication data. Storage failure keeps session choices with visible feedback; malformed and out-of-range input is normalized. Cross-tab storage events refresh the canonical state.

Header music, motion and in-game effects shortcuts write this same repository. Volume and mute do not overwrite the underlying enablement/volume choices. The one existing music element still owns source switching, trusted-gesture unlock, failed playback and hidden-tab pausing. Effects use their original oscillator path with a separate gain multiplier; muting suspends the active effects context. No additional media or network dependency is introduced.

The complete settings view uses the existing native dialog with its game pause/resume, inert background, Escape and trigger-focus restoration. It is accessible before login and during local/room play without changing scoring. System motion changes apply while the default is selected. Font scaling changes typography rather than model dimensions or formula calculations.

The pinned module v1.2.0 bytes remain unchanged. `module-frame.mjs` adapts its transient srcdoc only: isolated scripts-only opaque origin, frame/source-checked preference messages, labels and rotation via existing controls, text/contrast CSS, reduced-motion notifications and optional Explore/Notes/Labs resume. The module receives no localStorage access or account data. Labels and rotation changed inside the module return to the same parent store; programmatic synchronization does not feed back as user input. Resume restores the broad learning section, never a quiz, room attempt, model camera or unfinished activity.

## Validation

- Build and standalone checker pass; every tracked downloadable V1/V2 alias is rebuilt from the same offline output. Both full audio tracks and pinned module remain embedded.
- 85/85 node tests pass, including persistence/reset, blocked/corrupt storage, normalization, cross-tab reload and independent audio volume across mute, source and visibility changes. Existing game, auth and scoring tests remain passing.
- Actual Chromium browser runner: `tools/verify-preferences.cjs` (Playwright supplied by the test environment; not a runtime dependency). 12 text/viewport combinations: 1440, 768, 390, 320px × normal, large, largest. No document or settings-dialog horizontal overflow.
- Browser checks save/reload/reset, native slider ArrowRight, Escape/focus restore, system motion changes, explicit reduce, module label persistence, section resume, module rotation disabled under reduce, blocked storage feedback and standalone interactions after network disabled.
- Enlarged module Explore view additionally checked at desktop/tablet/320px with no internal horizontal overflow. Screenshots and machine-readable results are under `preferences-evidence/`.
- No firmware, question bank, geometry algorithm, formula, quiz engine, scoring or analytics source changes. No physical audio-device or screen-reader user test is claimed.

## Real limitations

This digitalize base provides Bahasa Melayu only and has no adjustable animation-speed control. The settings view explains both facts rather than displaying nonfunctional selectors. Language integration will require the separate bilingual work. Preferences apply only to this browser, with session-only fallback when storage is blocked; no cross-device sync is claimed. Resume is limited to the module's Explore/Notes/Labs section. Live Supabase account/classroom services were not exercised; unchanged auth behavior is covered by the existing suite. Audio sequencing/gain was tested at controller level, not by human listening on physical speakers. The portal's existing system CSS can continue suppressing decorative CSS motion when the OS requests reduction, even if Full is selected.
