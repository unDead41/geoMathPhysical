# Chat: GeoMath — Modul 2 / Empat makmal interaktif

Branch kerja tepat: `digitalized-module-labs-ui-refresh`.

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

Buka `images/08-interactive-labs.png`, paparan **29–32**, dan `images/09-studio-and-progress.png`, **paparan 33 sahaja**.

Laksanakan hab makmal serta empat ruang kerja:
1. Bina Bentangan: gallery/preset, editor petak, studio sambungan muka, lipat/buka, semak dan cetak.
2. Makmal Isi Padu: kiub unit, perbandingan satu/dua bongkah, tambahan/pindahan isi dan demonstrasi kon/piramid yang sedia ada.
3. Luas Permukaan/Terbitkan Rumus: pemilihan permukaan, bongkah tertutup, bekas terbuka/bertutup dan rongga.
4. Bongkah Gabungan: cantum/pisah, ukuran dan pemilihan permukaan luar.

Ikut komposisi canvas + control rail + feedback konsep, dengan kawalan tersusun mengikut langkah. Semua mod lanjutan kekal boleh dicapai; jangan membuang fungsi kerana screenshot hanya menunjukkan contoh mudah.

## Audit dan pemilikan

Baca dokumentasi modul, LABS_V1_2.md hingga LABS_V1_4.md, GUIDED_V1_5.md, SOURCE.md serta module/src/index.html, labs.mjs, guided.mjs, net-tools.css, fail net-studio/net-print/volume/surface dan ujian sebenar.

Miliki `#labs-panel`, hab makmal, `#guided-panel`, control panels makmal, persembahan net-tools dan blok style.css berpenanda `UX-REDESIGN:LABS` yang di-scope kepada #labs-panel. Jangan ubah Explore/Notes/header nav atau projection/calculation/progress-summary milik chat lain.

Kekalkan controller dan ID sedia ada. app.mjs serta hook build/import diselaraskan Modul 1; jika perlu hook baharu, serahkan patch kecil berlabel dalam handoff. Jangan menyalin seluruh app atau membuat state/dispatcher kedua.

## Matematik dan aliran

Gunakan mesh/net/face identity canonical. Bentangan bukan ilustrasi raster; cetakan mesti mengekalkan geometri dan skala. Peratus isi padu bukan peratus tinggi. Kekalkan kapasiti, konservasi isi, overflow, π, pembundaran, permukaan dalaman/luaran dan semua validasi.

Kekalkan Ramalkan → Cuba → Semak → Terangkan, Undo/retry, had ramalan 240 aksara dan penerangan 600 aksara serta rekod refleksi asal. Ubah UI tanpa menukar scoring/progress protocol atau menambah TP/penguasaan rekaan.

BM/English, tema, teks besar, reduced motion, optional speech/transkrip dan preference bridge sedia ada mesti berfungsi. Jangan memulakan animasi/audio tanpa aturan sedia ada atau reset aktiviti ketika tetapan berubah.

## Pengesahan dan serahan

Dari digital/module: `npm test`, `npm run build`, `npm run check`; dari digital: `npm run design:check`. Jalankan ujian pelayar makmal sedia ada dan tambah regression test bermakna jika struktur interaksi berubah.

Semak empat makmal, semua mod lanjutan, susunan sah/tidak sah, lipat/undo/reset/cetak, pindahan/overflow, bekas/rongga, cantuman serta complete/retry refleksi. Semak 1440px/390px, BM/English, light/dark, teks 150%, keyboard, touch dan reduced motion. Hasil invalid perlu penerangan, bukan angka palsu.

Bina standalone untuk preview, jangan patch HTML generated atau vendor pin. Serahkan keperluan build gabungan kepada integrator selepas source semua chat digabung.

Rekod screenshot hasil kod, fail/hook, base/concept/final SHA, command/hasil ujian dan batasan dalam `digital/docs/handoffs/digitalized-module-labs-ui-refresh/LATEST.md`. Push branch ini sahaja; laporkan link dan SHA remote sebenar.
