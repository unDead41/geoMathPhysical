# Chat: GeoMath — Modul 3 / Studio, pengiraan dan rekod

Branch kerja tepat: `digitalized-module-studio-ui-refresh`.

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

Buka `images/09-studio-and-progress.png`, paparan **34–36 sahaja**. Hab makmal pada paparan 33 dimiliki chat Modul 2.

Laksanakan:
- Studio Pelan & Dongakan: model sebenar, tiga ruang lukisan, toolbar jelas, koordinat, pilih/padam, Undo dan semakan.
- Semakan Langkah Pengiraan: fokus satu langkah Rumus → Gantian nilai → Pengiraan → Unit, jawapan berlabel, hint/contoh serta feedback yang membantu.
- Rekod latihan kendiri: ringkasan empat aktiviti, status sebenar, refleksi dan tindakan sambung/ulang melalui aliran sedia ada. Jika tiada route rekod berasingan, kemaskan panel sedia ada; jangan mencipta halaman kosong atau statistik hardcode.

## Audit dan pemilikan

Baca digital/module/DESIGN.md, UX-CONTRACT.md, docs/HANDOFF_PELAN_PENGIRAAN_V1_6.md, SOURCES_PELAN_PENGIRAAN.md, GUIDED_V1_5.md serta sumber projection-studio.mjs/css, projection-geometry.mjs, calculation-workshop.mjs/css, calculation-steps.mjs dan renderer/controller rekod.

Miliki projection-panel, calculation-panel, progress-summary, view CSS/markup studio dan blok `UX-REDESIGN:PROGRESS` dalam style.css. Boleh kemaskan persembahan `digital/dist/module-progress-view.mjs`/salinan jika perlu; jangan ubah storage/cloud/progress protocol.

Jangan mengubah shell/navigation, Explore/Notes atau labs-panel. Guna hook/mount sedia ada; hook app.mjs/build baharu diserahkan sebagai patch kecil kepada pemilik Modul 1. Kekalkan native-language roots agar adapter lama tidak menindih salinan.

## Kontrak yang tidak berubah

Pelan & Dongakan menggunakan front +Z, plan +Y, right +X dan susunan Kaedah 1 dengan skala konsisten. Kekalkan lima projek, dua susunan kiub unit, garis nampak/tersembunyi/binaan, equivalence segmen dan toleransi inklusif **0.06cm lukisan**. Jangan mengganti geometri atau menyederhanakan pemeriksa untuk meniru screenshot.

Semakan Pengiraan menggunakan semua 22 pasangan bentuk/kuantiti pada 11 bongkah, bekas terpilih dan dua gabungan. Kekalkan parser terbatas, equivalence/provenance, ukuran/π dibawa daripada nota dan semakan unit. Jangan menggunakan eval, membocorkan jawapan atau menanda betul berdasarkan contoh UI.

Draf kekal merentas navigasi/bahasa dan dibersihkan mengikut pertukaran sesi akaun semasa. Tiada persistence/rekod backend baharu. Empat refleksi asal kekal latihan kendiri, bukan TP/verified mastery; jangan menambah skor studio pada kemajuan asal.

## Pengesahan dan serahan

Dari digital/module: `npm test`, `npm run build`, `npm run check`; dari digital: `npm run design:check` serta ujian rekod/host relevan jika view parent berubah. Jalankan suite pelayar learning-tools sedia ada menggunakan fixture setempat.

Semak toolbar/koordinat/Undo, skala tiga pandangan, garis tersembunyi, sempadan toleransi, urutan empat langkah, jawapan invalid, unit, retry, worked example, draf/bahasa dan pengasingan sesi. Uji 1440px/390px, BM/English, light/dark, teks 150%, keyboard dan reduced motion.

Preview mesti UI sebenar dengan model/rekod sebenar atau fixture ujian yang berlabel. Bina standalone; vendor pin/build parent menunggu integrator, jangan menindih artifact branch lain.

Rekod screenshot hasil kod, fail/hook, base/concept/final SHA, ujian sebenar dan batasan dalam `digital/docs/handoffs/digitalized-module-studio-ui-refresh/LATEST.md`. Commit/push hanya branch ini dan berikan link serta SHA remote.
