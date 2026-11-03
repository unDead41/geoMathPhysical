# Chat: GeoMath — Modul 1 / Teroka, nota dan kalkulator

Branch kerja tepat: `digitalized-module-explore-ui-refresh`.

Repository: https://github.com/unDead41/geodecoder
Asas kod: `main-digitalized` remote terkini.
Ref konsep: `ui/ux-redesign-concept`.
Folder konsep: `digital/docs/uiux-redesign-concept/`.

Ini arahan pelaksanaan UI. Teruskan berdasarkan sumber sebenar dan selesaikan pilihan teknikal rutin sendiri.

## Sebelum mengubah kod

1. Fetch asas, branch kerja dan ref konsep; rekod SHA penuh serta versi sebenar. Gunakan folder/worktree sendiri. Jika branch kerja sudah ada, semak sejarah dan sambung perubahan sah tanpa reset/force-push.
2. Baca AGENTS.md, docs/SOR_VERSIONING.md, digital/docs/BRANCH_ARCHITECTURE.md, digital/DESIGN.md, digital/UX-CONTRACT.md dan digital/docs/DESIGN_SYSTEM.md.
3. Pada ref konsep, baca README.md, manifest.json, IMPLEMENTATION_CONTRACT.md dan OWNERSHIP.md. Baca prompt ini sepenuhnya. Sahkan SHA-256 gambar rujukan sebelum menjadikannya asas visual. Kod semasa kekal asas pelaksanaan; jangan merge seluruh branch konsep ke atas kod terkini.
4. Periksa controller, template, CSS, token dan ujian sebenar sebelum merancang perubahan. Simpan semua ciri yang telah diterima.

## Peraturan bersama

Ikut gaya konsep GeoMath: latar putih/biru muda, navy, tindakan biru, panel kemas dan ruang kerja geometri. Gunakan design system pusat; jangan cipta palette, preference store, header induk atau engine kedua. Identiti paparan GeoMath tidak mengubah ID/storage/API/protokol GeoDecoder.

Bina DOM/CSS dan interaksi sebenar. Rajah matematik mesti datang daripada renderer/data canonical, bukan PNG konsep. Teks, nombor, bentuk dan keadaan contoh dalam gambar tidak menggantikan kontrak runtime. Kekalkan BM/English, light/dark/system, teks 100/125/150%, kontras, reduced motion, keyboard dan touch.

Commit dan push **hanya ke branch kerja yang dinyatakan**. Jangan push/merge `main`, `main-digitalized`, `sharing`, branch lain atau mirror `geodecoder-digital`. Jangan publish Pages/Sites, deploy backend/Edge, migration atau mengubah Auth/SMTP. Jangan force-push atau menukar checkout chat lain.

## Rujukan visual dan skop

Buka `images/07-explore-notes-calculator.png`, paparan **25–28**.

Laksanakan:
- Shell pembelajaran dan navigasi sedia ada yang kemas, tanpa header aplikasi berganda di dalam iframe.
- Teroka 3D: pemilih model yang mudah dicari, canvas besar, sifat bongkah, putar/reset dan kawalan bentangan.
- Pandangan 2D: label enam arah, perbezaan jelas daripada bentangan dan skala/renderer sebenar.
- Nota: hierarki isi, contoh, sifat/rumus/unit dan bacaan yang selesa.
- Kalkulator: ukuran berlabel, unit, hasil langsung dan pautan ke semakan langkah yang benar-benar disokong.

Gambar menunjukkan pilihan ringkas, tetapi **semua 11 bongkah pembelajaran**, ukuran, preset dan keupayaan sedia ada mesti kekal tersedia. Jangan mengecilkan katalog agar sama dengan screenshot.

## Audit dan pemilikan

Baca digital/module/README.md, DESIGN.md, UX-CONTRACT.md, docs/CURRICULUM.md, GEOMETRY.md, NOTES_V1_1.md, SOURCE.md dan sumber sebenar dalam module/src/.

Miliki header/nav modul, `#explore-panel`, `#study-panel`, layout berkaitan dalam style.css, serta bahagian view nota dan pemasangan shell dalam app.mjs. Kekalkan semua ID/listener dan region milik chat Modul 2/3. Jangan mengganti seluruh index.html/style.css/app.mjs daripada branch lama.

Jika fail baharu perlu hook build/import, anda menyelaraskan hook kecil itu untuk modul mengikut OWNERSHIP.md. Jangan memperkenalkan bundler atau token owner kedua. Foundation pusat dan host bridge tetap pemilik bersama sedia ada.

## Tingkah laku yang mesti kekal

Renderer, mesh, geometri, formula, π, unit dan canonical measures tidak berubah. Jangan CSS-transform model sehingga pandangan matematik mengelirukan. Canvas responsive mesti mengukur semula tanpa mereset kamera atau state. Kawalan guna pointer/touch serta alternatif keyboard.

Bahasa, tema dan saiz teks menggunakan preference induk melalui bridge semasa; tukar paparan mengekalkan model, ukuran, kamera, tab, unfold progress dan draf. Kekalkan standalone/offline dan mod embedded. Perubahan nama paparan GeoMath tidak menukar ID/protokol.

Navigasi ke makmal/studio hanya menggunakan mount/controller semasa. Tiada tab kosong, fungsi olok-olok atau angka hasil hardcode daripada gambar.

## Pengesahan dan serahan

Dari digital/module jalankan `npm test`, `npm run build`, `npm run check`; dari digital jalankan `npm run design:check`. Guna runner pelayar sedia ada untuk mode Explore/Notes/calc dan embed yang relevan. Jangan edit generated HTML atau vendor pin dengan tangan.

Semak semua 11 model, rotate/reset, buka/tutup bentangan, enam pandangan, perubahan ukuran dan unit, nota/formula panjang serta kawalan ke semakan pengiraan. Uji 1440px/390px, BM/English, light/dark, teks 150%, keyboard dan reduced motion; pastikan kamera/ukuran tidak hilang ketika tukar bahasa.

Build standalone modul untuk preview sebenar. Vendor pin dan build gabungan parent diserahkan kepada integrator; jangan menindih perubahan modul branch lain dengan HTML sendiri.

Rekod screenshot hasil kod, fail/hook silang, base/concept/final SHA dan ujian sebenar dalam `digital/docs/handoffs/digitalized-module-explore-ui-refresh/LATEST.md`. Commit/push branch ini sahaja dan berikan link serta SHA remote.
