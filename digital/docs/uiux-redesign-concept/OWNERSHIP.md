# Pemilikan empat branch UI

Semua branch membaca design system pusat dan konsep yang sama. Tiada branch ini memiliki penerbitan. Skop visual tidak memberi kebenaran mengubah backend atau aturan pembelajaran.

| Branch | Paparan | Pemilikan utama |
|---|---|---|
| `digitalized-game-duel-ui-refresh` | 10–13; 09 rujukan gaya sahaja | Duel lobby/live/result; bahagian Duel dalam app/index, CSS Duel, salinan dan ujian Duel |
| `digitalized-module-explore-ui-refresh` | 25–28 | Shell/navigation modul; explore-panel, study-panel; layout penerokaan/nota/kalkulator |
| `digitalized-module-labs-ui-refresh` | 29–33 | labs-panel termasuk hab; empat makmal, control rail, guided-panel dan net-tools presentation |
| `digitalized-module-studio-ui-refresh` | 34–36 | projection-panel, calculation-panel, progress-summary dan paparan rekod refleksi yang sudah disokong |

## Fail bersama dan cara mengelakkan konflik

- `digital/module/src/index.html`: Modul 1 hanya header/nav, `explore-panel`, `study-panel`; Modul 2 hanya `labs-panel`; Modul 3 hanya `projection-panel`, `calculation-panel`, `progress-summary`. Kekalkan ID yang digunakan controller, label dan native-language roots.
- `digital/module/src/style.css`: Modul 1 memiliki shell/explore/notes. Modul 2 memiliki blok berpenanda `UX-REDESIGN:LABS` yang di-scope kepada `#labs-panel`. Modul 3 memiliki blok `UX-REDESIGN:PROGRESS` yang di-scope kepada progress/records. Jangan menulis reset global atau override generik untuk meniru panel sendiri. Konflik append diselesaikan dengan mengekalkan semua blok, bukan menerima satu fail penuh.
- `digital/module/src/net-tools.css` dan bahagian visual `labs.mjs` dimiliki Modul 2. Formula/state/renderer dalam fail ini kekal.
- `projection-studio.css`, `calculation-workshop.css` dan bahagian view dalam `projection-studio.mjs`/`calculation-workshop.mjs` dimiliki Modul 3. `projection-geometry.mjs` dan `calculation-steps.mjs` bukan sasaran refactor matematik.
- `digital/module/src/app.mjs`: Modul 1 memiliki pemasangan shell. Modul 2/3 guna listener dan mount sedia ada; jika hook baharu diperlukan, serahkan patch kecil berlabel dalam handoff, jangan menyalin keseluruhan app atau mencipta dispatcher bersaing.
- `digital/dist/module-progress-view.mjs`/salinan rekod: Modul 3 boleh mengemas kini persembahan sahaja. `module-progress.mjs`, storan/awan dan protokol tidak diubah.
- `digital/dist/app.mjs`/`index.html`: branch Duel hanya region/hook Duel. Kerja Home/guest/tutorial dalam chat lain kekal; jangan ganti seluruh shell dengan versi lama.
- Token generator, foundation, portal controller dan iframe bridge adalah pemilik bersama sedia ada. Jika perlu pindaan global, catat cadangan dan hook minimum; jangan import perubahan global tanpa semakan integrator.
- Semua branch menggunakan senarai CSS/JS sedia ada dalam builder modul. Jika fail sumber baharu benar-benar perlu disenaraikan, Modul 1 menyelaraskan hook build/import; branch lain menyerahkan patch kecil. Jangan menghasilkan bundler kedua.
- Vendor pin dan hasil standalone aplikasi induk diselaraskan oleh integrator selepas source modul digabung dan dibina semula. Jangan memilih satu HTML lama untuk menindih hasil branch lain.

Setiap chat boleh siap dan push kerja miliknya sendiri tanpa menunggu keseluruhan redesign. Labelkan hook silang sebagai belum diintegrasi jika berkenaan; jangan mendakwa halaman induk sudah memakai modul baharu sebelum pin dan build gabungan disahkan.
