# GeoDecoder two-card flow

The user's approved specification is the authority: every question requires a
registered R1 solid card followed by the matching R2 net card. Award one point
only at the second success; retry errors at the same stage and skip either stage
for zero. Hints toggle without pausing time and close when R1 succeeds.

Use the clean architecture from main `66bf7959ecbf98d46b98492adb8fe924e0108743`.
Port the useful guidance/colour semantics from branch
`b81862661e972cd3320c71fe88ef81ac08ff86e3`; do not restore its former module layout.

## Implementation choices

- Extend the existing pure QuizEngine with explicit SOLID/NET stages. Keep
  phase + advancePending as the answer/transition/summary state machine.
- Store the blink step in QuizData, advance it from supplied time in update(),
  and render both readers from the same step. Three 150 ms ON / 150 ms OFF
  cycles occupy 900 ms; pause on completion/skip, resume when the next question
  actually opens, and permanently finish at the final action.
- Application owns decorative colours and obtains time/RNG through AppPorts.
  Menu/help use 1,000 ms and summary uses 150 ms. Seven non-off RGB combinations
  include yellow. Keep logical colour rendering independent of hardware.
- Arm only the current reader and require removal after each stage/question.
  Existing button suppression drops presses starting during the transition.
- Keep all three question/hint rows. Put R1/R2 into the spare header space so
  the stage is clear even with ordinary LEDs. Reuse the current bank hint on
  either stage; count its use once per question, with no score deduction.
- Preserve GPIO, Shape/NVS ABI, stored UIDs, and question_bank.h byte-for-byte.
  Ordinary LEDs map non-off colours to ON and use the same blink timing.

An alternative controller or separate sketch would duplicate the existing
engine and break the single-source architecture. Editing bank reader metadata
would create unnecessary conflicts with the question editing branch. Neither
is needed: the runtime stage, rather than legacy question.reader, selects R1/R2.

Teacher inspection/enrolment remains available. Explicit teacher retry resumes
the same question from R1; stop/inspection pauses time. No change to storage.

## Verification

Native tests cover ordering, roles/unknown UIDs, stage colours, hint lifecycle,
single award, skip both stages, every blink boundary, clock pause/resume/freeze,
millis rollover, held cards, late/held/short button presses and ambient cadence.
Run the AGENTS.md matrix and build esp32dev plus esp32dev-rgb. USB upload and
physical tests remain separate and must not be claimed from simulations.
