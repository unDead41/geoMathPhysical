# Kontrak interaksi Modul GeoDecoder

Modul pembelajaran bebas, tiada skor, profil, penghantaran data atau storan.
Sumber perniagaan: arahan pengguna dan docs/SOURCE.md. Rupa: ../DESIGN.md,
dengan varian modul dalam DESIGN.md. Tidak mengubah kontrak kuiz Digital.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Scrollbar | src/style.css global baseline | DESIGN.md | forced-colors native | source check + phone browser |
| Toast | app.mjs announce + inline text | this contract | info, learning feedback | browser + tests/app.test.mjs |
| Direct manipulation | app.mjs Pointer Events controller | user brief | mouse/touch, two-pointer pinch, keyboard, direction buttons | browser drag/keys + cancellation handlers |
| Range | native input range + progress state | this contract | drag, keyboard | browser Home/End/PageUp |
| Selection | native buttons with aria-pressed | this contract | shape, view, face, answer | browser all choices |

Shape change cancels playback and resets model progress, camera, zoom, face
selection and local learning feedback. Current model/view mode is retained.
Every model has six direction choices. No route fetch is needed. Hash selection
is optional; inability to modify file-origin history does not stop learning.

All geometry controls use one progress state in [0,1]. Open/Close continue from
current progress. Play performs one opening then closing cycle, or closes when
started at the flat end. Pause freezes progress; replay starts a new cycle.
A zero-time first frame is not a completed transition. Target completion is
checked against movement direction. Short camera transitions use the shortest
yaw path. Entering views closes a partial net, freezes spin, then aligns the
camera. Drag/arrows return to free model mode. Reset restores camera and zoom,
keeping the chosen opening stage. No modal is needed for reversible exploration.

Auto rotate stops on orbit, face selection or animation. Reduced motion has no
initial spin/camera tween; explicit educational playback remains available and
slider changes are direct. Preference changes stop running motion. Background
stops playback and spin without automatic resume. Pointer cancellation/lost
capture cleans up gestures. Native buttons and ranges provide non-drag choices;
model supports arrows, +/− and Home. Every colour also has a name/number.

No loading, data failures, CRUD, login or external request states exist in the
module. Runtime CSP denies network connections. External DSKP anchors are optional
navigation and explicitly described as requiring Internet. Safe textContent/DOM
construction is used for dynamic instructional copy.

## Nota pembelajaran (v1.1.0)

LearningNotes dalam src/notes.mjs memiliki paparan nota dan input pengiraan.
LESSON_DATA dan calculateMeasures dalam src/lessons.mjs menjadi sumber kandungan
dan matematik. Semua lima pilihan bongkah dikongsi dengan Teroka 3D.

Membuka nota menghentikan playback, putaran dan camera tween, membatalkan rAF,
serta mengekalkan kemajuan model. Kembali ke Teroka tidak menyambung gerakan
secara automatik. Input nota bagi bongkah semasa kekal ketika beralih bahagian;
menukar bongkah menggunakan nombor contoh bongkah baharu. Nilai π pilihan kekal.
Reset ukuran mengembalikan nombor contoh sahaja.

Native details membuka contoh. Butang lompat memfokuskan heading dan menatal
dengan reduced motion. Nota → bentangan menggunakan progress controller sedia
ada; nota → pandangan menutup bongkah dan memilih atas. Tiada route fetch.

Input salah memaparkan ralat bersebelahan, aria-invalid dan kosong pada output.
Tiada jawapan lama digunakan. Submit memfokus input salah. Ukuran sah diproses
pada setiap input; hasil dibundarkan untuk paparan sahaja, nilai sangat kecil
menggunakan < 0.01 cm³. Rajah ukuran tidak menukar bentuk umum model 3D.

## Makmal interaktif v1.2.0

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | native | fixed lab choices in src/index.html; ownership in premium-ui.json | browser/OS-owned popup | real browser selection + keyboard |
| Lab geometry | src/lab-geometry.mjs | user-approved activities 1–4, DSKP mapping | cube net, unit cubes, matched-base transfer/union | tests/labs.test.mjs |
| Lab interaction | LearningLabs in src/labs.mjs | four approved activity descriptions | native buttons, range, cell drag and direction alternatives | shipped script + browser |

Labs own one independent cancellable rAF controller. Entering notes/exploration
closes the lab controller before the other section becomes active. Choosing a
lab, changing dimensions/type or editing a net cancels pending motion as needed.
Pause retains the target; resume continues to it. Background and reduced-motion
preference changes stop motion without an automatic restart. Only deliberate
playback moves a lab scene. Progress sliders offer direct frame inspection.

Cube net construction supports six squares in a 6×6 grid. Additional cyclic
joins are explicitly marked as cuts in the preview; only five hinge connections
are retained. It never silently tears a fully connected sheet. Cube classification
uses six distinct final normals, not shape-name guessing. All 35 free hexominoes
are checked in tests. Volume transfer uses equal bases and perpendicular heights.
Composite choices are exact full matching-base unions, not arbitrary booleans.

All quantities are in cm/cm²/cm³. Lab circular values use Math.PI; notes retain
their independent selectable π convention. Display rounds only after calculation.
Wrong exterior choices produce explanation and allow retry, with no score or data
collection. Shapes/dimensions change the lab mesh only; quiz/model defaults remain.

## Tempo, galeri dan isi pilihan (v1.3.0)

LearningLabs owns all four lab timelines with speeds 0.25/0.5/1 (default 0.5).
Pause/resume retains the destination, including a partial pour or A/B fill.
A lab change suspends the old lab; returning requires Resume. Explicit size,
shape, editor or direct slider changes cancel that timeline. Speed changes
retain the current pose and recompute the remaining duration. There is at
most one pending rAF. Reduced motion/background never resumes automatically.

The ready-made gallery in preset-nets.mjs has nine valid layouts; existing
MODEL_ORDER and quiz IDs remain the five project shapes. Face chips restore
keyboard focus after highlight changes. Cube cells lock while folded; opening
flat restores editing. Surface buttons and exterior checks expose their next
step before activation, so selection is made on a ready model.

Volume-lab.mjs owns nine shape capacities and actual filled meshes. Users choose
one/two solids, edit each size, add at most 1 cm³ per chosen solid or fill it,
and include A/B independently in the sum. A+B adds up to 2 cm³ in total.
The fill range is a volume fraction, never a height fraction for pyramids/cones.
Changing one shape/size clears that solid only. Direct ranges cancel animation
and keep the newly read value. All calculations use unrounded quantities; tiny
positive results show < 0.01 instead of zero. Circular values use Math.PI.
