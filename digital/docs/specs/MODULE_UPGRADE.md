# Module upgrade specification

Authorized scope: implement all eight recommendations accepted on 26 October 2026. Push only to `unDead41/geodecoder: digitalize-module-upgrade`. Base app `adc51627eaaace5d9543c7e033d2994986c8715d`; module source `931a0150397bfb3fd79ef3c8da6684167d1c6aad`. Firmware main remains v1.1.3. Proposed module v1.3.0, app v2.4.0.

## Student experience

- Each of four labs has a real Ramalkan → Cuba → Semak → Terangkan activity. Prediction is entered before an experiment; a valid observed experiment and checked answer are required before an explanation can mark an activity complete. Opening a tab never marks completion. Changing an experiment invalidates its previous observation/check; completed learning records remain achievements and can be retried.
- Net challenge: repair an invalid net and discover valid layouts. Explain and highlight overlapping faces. Volume: predict capacity/number of pours and compare the observed result. Area: connect each formula term with its coloured surface. Composite: show and explain both internal mating surfaces and subtract their areas step by step.
- Animation speed 0.5× and 1×, explicit next-step control, pause/resume and existing sliders/keyboard alternatives. Apply to explore and lab animations including pours. Pause must preserve progress without jump; next-step must support completion callbacks exactly once.
- Undo meaningful lab edits (bounded history), explicit Asal kamera, separate Ulang aktiviti/reset (does not erase saved achievements). Focus mode enlarges the model while keeping essential controls close; usable at 320px, keyboard accessible and honours reduced motion.
- Consistent light/dark themes in module, including canvas. Standalone module can switch locally; embedded module follows parent theme. No runtime network or browser storage in the standalone iframe.
- On-demand Malay speech using installed browser speech capability, replay/stop and a visible transcript/text description. Never autoplay; clear availability fallback; stop on leaving activity, hiding page or closing module. Text is always available.
- Four-activity progress summary with meaningful completion, restoration through a parent bridge when embedded, session-only otherwise.

## Parent bridge contract (protocol 1)

Child posts `{type:'geodecoder:module-ready',protocol:1}` to parent once listeners are ready. Parent answers `{type:'geodecoder:module-context',protocol:1,session,theme,progress}` where `session` is an unpredictable string, `theme` is `light|dark`, and `progress` is an array of records below. Child only accepts messages whose `event.source===parent`. Parent only accepts messages whose source is the current iframe window, while module is open. Progress messages require the current session; stale frames and unrelated windows are ignored.

Progress record: `{activity,stage,prediction,result,explanation,completed}`. Activities are `net|volume|area|composite`. Stages are `prediction|experiment|check|explanation`. Text limits: prediction 240, result 600, explanation 600 characters. Completion needs final stage and all three nonempty texts; guided UI additionally enforces observation and successful check. Child sends `{type:'geodecoder:module-progress',protocol:1,session,...record}` after a meaningful stage change. Parent may resend context after local/cloud restoration; this must not echo events back endlessly. Only self-reported formative learning, never server-validated assessment or TP grades.

## Progress and teacher integration

- Parent stores progress per authenticated user ID, with a separate guest key, and tolerates unavailable storage. Account changes cannot leak, save or display another learner's record. Cloud save is for logged-in student profiles only; guest work stays on this device and never migrates automatically to an account.
- Dedicated authenticated RPC `geo_module_progress(action text,payload jsonb)` with `mine`, `save`, `class` actions. Server obtains identity/role from private profiles. Teachers read only members of their own class; students cannot read classmates. No direct client table privileges. Validate payload/keys/limits and enforce monotonic stage/completion with server timestamps. This is a practice record; do not claim its text is verified evidence of mastery.
- Student can open module from portal and see saved completion count. Teacher sees a per-student count and four activity states in their selected class, with last update and explanations on demand. Existing polling refreshes this view; clear local/pending/cloud save status.
- Migration is versioned and tested transactionally; no production DB schema changes or public Pages release in this branch-only task. Existing live website, source branches, firmware, game scoring, audio and Auth are preserved.

## Verification

Run real module and parent test suites plus build/check. Add meaningful tests for guided transitions, history, pause/step completion, bridge spoofing/stale session, account isolation/storage failure, progress merging and teacher authorization. Exercise browser flows for all labs, theme, focus, voice fallback, persistence and narrow width; clearly distinguish automated geometry tests, browser checks and real device/audio proof.
