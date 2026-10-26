# Kontrak interaksi Modul GeoDecoder

Modul pembelajaran bebas tanpa skor atau profil dalaman. HTML mandiri tiada storan
pelayar atau rangkaian; mod terbenam menghantar rekod latihan kendiri melalui
jambatan induk protokol 1 yang dibenarkan.
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


## Aktiviti berpandu v1.3.0

`guided.mjs` memiliki logik tulen gerbang ramalan/pemerhatian/semakan/penerangan,
sejarah berhad 30 keadaan dan jam masa aktif animasi. `labs.mjs` menilai
pemerhatian daripada keadaan geometri sebenar. Jawapan yang disemak ialah konsep
yang khusus kepada makmal. Perubahan eksperimen membatalkan pemerhatian dan
semakan; perubahan jawapan membatalkan semakan. Rekod pencapaian kekal berasingan
daripada draf semasa; Ulang aktiviti mengekalkan pencapaian. Asal kamera tidak
mengubah eksperimen. Langkah seterusnya dan main berkongsi jam tuangan yang sama.

`accessibility.mjs` memiliki ringkasan, tema/fokus, suara atas permintaan dan
protokol 1. Hanya mesej daripada `window.parent` dengan konteks sah diterima.
Mesej kemajuan menggunakan token sesi semasa; pemulihan tidak menghantar echo.
Sesi baharu mengosongkan draf lama. Rekod dipulihkan tidak mengesahkan eksperimen
atau semakan semasa. Tema terbenam dikunci kepada konteks induk. Suara hanya
menggunakan suara Melayu dengan `localService === true`, tanpa main automatik;
teks sentiasa tersedia dan suara dihentikan pada pertukaran aktiviti, pagehide
atau halaman tersembunyi. Semua medan menggunakan kawalan teks/range/select
asli. Tiada penghantaran rangkaian atau storan ditambah pada iframe mandiri.
