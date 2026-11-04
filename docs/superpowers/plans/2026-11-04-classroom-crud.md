# Classroom management CRUD implementation plan

**Goal:** Complete the existing teacher class/room management workflow, backed by the real authenticated PostgreSQL gateway.

**Architecture:** Add an additive migration and a private authorization gateway in front of the existing game dispatcher. Extend the existing portal forms, feedback and snapshot transport; do not replace the UI, scoring or progress protocols.

**Base:** `main-digitalized`, `391df985eea4fee15d9859e678068b1a3f613cba`. Work branch: `digitalized-classroom-crud`.

## Product decisions

- Classes/rooms support name edits (2–60 Unicode characters, no control characters), archive/restore, and permanent deletion only when empty of members, invitations and child records.
- Archiving preserves memberships, attempts, scores and module records. It invalidates join codes and prevents new activity. A playing room must be closed using the existing scoring/timer transition before archiving it or its class.
- Removing a student revokes class and room access but preserves room membership rows and attempts because the existing foreign keys cascade deletion into results. Removal is blocked while a class room is playing. A valid new join via PIN or invitation can enroll the student again; removal is not an account ban.
- Only the teacher who owns the class/room manages it. Students may decline their own pending invitations. The teacher may read/cancel pending invitations in their classes.
- New management actions require the revision shown in the snapshot. Conflicts keep drafts and require refresh/retry. Unknown fields and caller-supplied ownership are rejected.
- Use the current theme tokens and shared portal helpers. New edit/confirmation content uses native authored dialogs, named consequences, Cancel focus, keyboard focus restoration, duplicate-submit prevention and BM/English.
- Keep changes on this work branch. No main merge, production database modification, or Pages publication is included; integration needs the additive migration before the frontend is released.

## Tasks

- [x] Write failing PostgreSQL permission/lifecycle/retention tests; implement additive migration; run real local SQL tests, including replay after historical migrations.
- [x] Write failing portal workflow tests; implement shared management dialog, rename/archive/restore/delete/member/invitation actions, archive navigation and localized messages; run portal tests.
- [x] Build the real frontend; run full tests, token/check gates, browser success/error/keyboard/mobile checks; save screenshots and handoff; review and push only the work branch.

## Review focus

Cross-teacher IDs and direct legacy gateway bypass; stale simultaneous edits; game attempts surviving removal; archived entities rejecting old PINs and new starts; timeout/session changes not applying late UI success. Verify these in SQL/DOM/browser coverage rather than relying on source-text assertions.
