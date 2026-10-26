# Help and support implementation — 26 October 2026

Base: `main-digitalized` at `790d989d666e64f3beabb507cd4140b832696367`, Digital
v2.6.0 / module v1.5.0. Result branch: `digitalized-utility-help-support`.
Firmware `main` was read at `a059979d97926b82cafd4aa5cf3fe59da04a55bb`, v1.1.3.
No existing result branch was found by the GitHub exact-ref read.

## Design and ownership

The user's detailed specification authorizes implementation and branch push.
Extend the existing native `app-dialog`; a separate route would tear down the
module and a second overlay would duplicate focus/timer ownership. Keep the
royal-blue geometry workbench palette, system fonts, existing buttons, fields,
theme, focus and scrollbar tokens. Use a compact R1 → R2 task guide and native
disclosures, with one report call to action. Phone layouts stack naturally.

`help-copy.mjs` owns BM/English guide and form copy, merged into the existing
locale owner. `support-report.mjs` owns validation and the explicit diagnostic
allowlist. `help-support.mjs` owns ephemeral drafts, preview and local export.
`app.mjs` supplies the current context and existing modal lifecycle. Extend the
existing source/origin/instance-checked module bridge with `open-help`; do not
change the pinned module or its progress protocol. Existing tutorial stays the
only three-step tutorial implementation.

No remote report endpoint exists (see HELP_SUPPORT_AUDIT.md). No email, issue,
telemetry, backend mutation or public deployment is part of this branch.

## Plan and checks

- [x] Add failing report/privacy/validation tests and full-app help state tests.
- [x] Implement allowlisted context, bounded form, localized preview and export.
- [x] Wire shared help entry, Settings and current module bridge; reuse tutorial.
- [x] Verify real browser BM/English, phone/desktop, keyboard, clipboard denial,
  offline standalone, long input, R1/R2 state, module state and all clock modes.
- [x] Document backend handoff and evidence; propose Digital v2.7.0. Keep firmware
  v1.1.3 and module v1.5.0 because neither source runtime changes.
- [x] Run suites, build, publication preparation (local only), project checker,
  firmware version consistency, UI audit and review. Commit/push only result ref (final remote receipt is recorded in the chat);
  verify the exact remote commit and preserve any concurrent branch work.

Report context is captured when the report form opens. It never reads URL,
storage, Auth/session objects, question text/answer, PINs, class or opponent data.
Browser online indication is explicitly unverified; a service's last successful
response is historical evidence, not a new connectivity check. Free text is
reviewed before export; obvious emails/PINs/credential patterns are redacted as
an additional aid, without claiming complete automatic anonymization.

Drafts remain in memory during this tab session, including close/reopen and
switching to Settings/tutorial. They are not written to storage or transmitted.
Copy/download use the exact read-only preview. Clipboard and file failures expose
manual selection. Closing help uses the existing modal owner and restores focus.
