# Independent shared-settings review

Reviewed on26October2026 for digitalize-ease-of-use candidate2.5.0.
Final browser bundle SHA256: `14fbffd81f396a47b3db9dc88f7bd14201288355deffd0d2ed24d56f2587ec33`.

Result: **8/8 named browser cases PASS,108 layout checks PASS,0 runtime errors**.
The final single process completed successfully. The executable case list,
timings and five screenshot hashes are in `browser-review.json`.

Verified the actual opaque srcdoc frame, not a mock module:

- Parent English150%/paused settings are applied at first module entry and
  after reload. One Settings control persists the choices. Module Settings
  opens that same parent dialog; language and size update the existing child
  Document/srcdoc, not a fresh module. Measured font-size ratio150/100=1.5.
- Cone selection,350/1000 net progress and labels remain; Notes measurement7.5
  keeps area337.5 and volume421.88, with invalid input/error state retained
  through both languages. All four labs retain their active state: net650,
  unit count3, selected cone area piece/progress420 and composite580.
- BM/English ×100/125/150% ×1365/390/320px ×Explore/Notes/four labs all fit
  horizontally. Separate word-range assertions confirm readable320px150%
  headings, activity titles and number badges rather than mid-word splitting.
- English visible-text scan covers all five solids in Explore/Notes, thinking
  answer feedback, four labs, invalid net/composite feedback and two pour types.
  Correct singular/plural metric labels and cone apex are asserted.
- Device reduced motion stops automatic rotation. Removing reduction does
  not restart it. Sliders and deliberately requested educational movement
  remain available under the documented product policy.
- Parent ignores unrelated sources, stale instances and wrong protocol
  versions; child ignores self-sent settings packets. Existing unit checks
  separately validate the three-value payload schema.
- File-based standalone works offline with zeroHTTP requests. Storage denial
  retains choices in memory. Game settings preserve card order, acceptedR1,
  selected net and question/score; matchingR2 still earns exactly1.

Review findings resolved before the final run:

1. English metric sublabel `puncak` and singular labels for plural counts:
   catalog/context-aware metric correction, independently asserted in UI.
2. Two mixed-language phrases in the cuboid notes and net activity card:
   explicit authored translations; high-confidence BM-residue scan passes.
3. At320px150%, activity numbers/names and Interactive split within words:
   deterministic Range RED→GREEN; narrow activity cards use one column and
   responsive headings. No horizontal overflow is used as a substitute for
   checking readability.

The final evidence uses ordinary viewport screenshots with no CSS hiding.
Full-page capture around a vh-sized iframe produced a misleading skip-link
paint in this custom Chromium. Diagnostics at capture show the unfocused
parent skip link entirely above the viewport(top−80,bottom−18.8 at150%).
Viewport capture avoids resizing that iframe for the screenshot and displays
its actual current scroll position. No production workaround was added.
The harness also now waits for asynchronous postMessage delivery before
asserting or capturing the Settings dialog.

Minor visual observation: narrow BM shape-picker labels can still wrap within
a word(e.g.Piramid/Silinder at390px125%). The text remains visible and its
button works; a future wider/wrapping shape-picker grid would improve polish.

No unresolved material findings in the reviewed transport, language, layout
or state-preservation scope. No backend/permission/data-schema change was
reviewed or required by this presentation feature. Physical phones, Safari,
Firefox and a class-load test were not exercised; desktop/mobile claims here
refer to Chromium viewport emulation.
