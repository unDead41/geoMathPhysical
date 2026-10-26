# Shared game and module preferences

User approved shared language, text size and animation on 26 October 2026.
Continue digitalize-ease-of-use, whose remote db5acf197175bc4d517bdf2e9c5338a9c9dff468
has current digitalize adc51627eaaace5d9543c7e033d2994986c8715d as its parent.
Digital candidate2.5.0, firmware1.1.3. No other ref or backend deployment.

One parent Settings dialog owns ms/en, text100/125/150 and decorative motion.
The pinned module1.2.0 remains byte-identical and sandboxed. A versioned,
source/instance-checked postMessage adapter carries only those preferences;
initial values are embedded before the module runs, ready/load sends recover
races, and changes update the existing frame without replacing srcdoc.
The module can request the same parent dialog. No second stored preference.

The existing pin is BM-only: a local authored BM/English catalog and canonical
DOM/canvas translation adapter supply English and reversible live changes.
IDs, measurements, formulas, game answers and module activity state stay intact.
CSS scales authored text, not geometric sizes. Reduced motion combines device
and user choice, stops current/automatic motion, keeps sliders and explicit
educational Play available, and never restarts motion on its own.

Considered: replacing the module with a different branch would broaden scope;
a reload per preference would discard activities. The in-place adapter preserves
the tested pin and has fail-closed source hooks, documented for a future native API.
Unit tests cover message identity/validation and existing fragment handling;
browser tests cover startup/live/reload, all learning views, large mobile text,
OS reduction, offline and denied storage, plus unchanged solo score/selection.
