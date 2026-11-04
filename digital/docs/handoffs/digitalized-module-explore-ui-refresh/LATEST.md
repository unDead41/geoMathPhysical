# GeoMath — Modul 1 / Teroka, nota dan kalkulator

Tarikh: 4 November 2026 (Asia/Kuala_Lumpur). Calon modul **v1.6.1**.
Branch kerja sahaja: `digitalized-module-explore-ui-refresh`.

## Sumber dan resit Git

| Rujukan | SHA penuh / nilai |
|---|---|
| Asas `main-digitalized` remote | `391df985eea4fee15d9859e678068b1a3f613cba` |
| Ref konsep `ui/ux-redesign-concept` | `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd` |
| Final implementation + evidence commit | `e81879ebf4c15f4dd4c565c2dfe574e304fb92bf` |
| Digital / modul pada asas | Digital 2.8.0 / modul 1.6.0 |
| Calon branch ini | Modul 1.6.1; versi Digital tidak diubah |
| `main` yang diperiksa | `25836eb1a6f24459aace8a3980ae880a13e3b488`, firmware 2.0.2 |

Commit implementation di atas ialah sumber akhir kod dan bukti; commit serahan
berikutnya hanya menambah dokumen ini. SHA head remote commit serahan dilaporkan
selepas push, bukan dimasukkan secara self-referential ke failnya sendiri.

Sumber diperoleh melalui sambungan GitHub kerana Git terus tidak mempunyai
credential. Objek commit/tree/blob asas dibina semula dan disahkan hash Git,
termasuk metadata zon masa asal, sebelum worktree sparse tersendiri dicipta.
Tiada checkout chat lain ditukar, tiada sejarah di-reset dan tiada force push.

Konsep dibaca penuh: prompt 02, README, manifest, IMPLEMENTATION_CONTRACT dan
OWNERSHIP. Gambar 07 / paparan 25–28 disahkan:

- SHA-256: `15fee50999f6d1ce1d0f1b636824fc6f7334c3986d5533c913f2dc15a1225fcd`.
- Git blob: `8ed65934d6025cd13bf33118c4747eca351314d0`.
- PNG 1672 × 941, 1,847,068 byte. Imej konsep tidak menjadi rajah runtime.

## Hasil

- Shell GeoMath menggunakan navigasi pembelajaran sisi pada desktop dan dua
  lajur pada telefon. Pemilih mengekalkan lima model projek serta enam tambahan.
- Teroka menggunakan canvas/ModelRenderer asal, panel sifat canonical, kawalan
  zum/putar/reset, slider bentangan dan pendedahan native bagi arah/tempo/label.
- Enam pandangan 2D sebenar disusun di sisi model pada desktop, bersama penerangan
  bahawa pandangan bukan bentangan. Urutan/arah ortografik asal dikekalkan.
- Nota mengekalkan sifat, rumus, simbol, unit, jadual 11 bentuk dan dua contoh
  setiap bongkah. Model kecil nota menggunakan ModelRenderer canonical.
- Kalkulator boleh dibuka terus daripada navigasi. Ia ialah view LearningNotes
  yang sama, mengekalkan input, π, hasil langsung dan pautan semakan pengiraan.
  Desktop mengelompokkan ukuran, rajah dan hasil; telefon mengalir secara menegak.
- Klik dan Enter pada kalkulator menggunakan validasi milik modul tanpa memerlukan
  penghantaran borang yang disekat sandbox. Input salah mengosongkan hasil dan
  memfokus medan pertama yang salah. Tiada perubahan formula atau had ukuran.
- Dalam iframe, header aplikasi disembunyikan dan kawalan Tetapan/Bantuan induk
  sedia ada dipindahkan ke navigasi modul. Tiada preference store/protokol kedua.
- Bahasa, tema, kontras, saiz teks dan reduced motion kekal melalui pemilik induk.
  Resize/bahasa tidak mereset kamera, model, ukuran, tab atau kemajuan bentangan.

Rajah berbilang warna dan model tertutup dalam mod pandangan sengaja mengikut
renderer canonical. Angka/katalog/rajah raster konsep tidak menggantikan matematik.
Kalkulator kekal dengan ukuran cm dan hasil cm²/cm³ seperti kontrak asal; pilihan
unit jawapan yang lebih luas kekal dalam Semakan Pengiraan milik Modul 3.

## Pemilikan fail dan hook integrasi

| Fail / region | Perubahan |
|---|---|
| `module/src/index.html` | Header/nav, wrapper shell/model picker, explore-panel dan study-panel sahaja; ID/listener kekal |
| `module/src/style.css` | Blok `UX-REDESIGN:EXPLORE`; shell serta selector Explore/Notes/Calculator; tiada reset global baharu |
| `module/src/app.mjs` | Pemasangan shell, `studyMode`, preview nota, label/tajuk dan reuse mount semasa |
| `module/src/notes.mjs` | Callback buka kalkulator serta validasi klik/Enter; pengiraan kekal dalam lessons.mjs |
| `module/src/content.mjs` | `MODULE_VERSION` sahaja, 1.6.0 → 1.6.1; katalog/data selebihnya identik |
| `module/package.json`, README, CHANGELOG, DESIGN, UX-CONTRACT | Versi calon, dokumentasi view dan kontrak shell |
| `module/tests/explore-refresh.test.mjs` | Draf/kamera/π/nav serta validasi tanpa form navigation |
| `module/tools/explore-ui-qa.mjs` | Fixture QA statik berasaskan runner iframe dan prepareModuleFrame sebenar |
| `module/GeoDecoder_Modul_V1.html` | Hasil build asal, bukan edit tangan |

Semua laluan dalam jadual relatif kepada `digital/`.

**Tiada hook build/import runtime baharu.** Fail QA hanya alat pembangunan.
`tools/build.mjs`, token generator, foundation, bridge, vendor pin dan build parent
tidak diubah. Integrator perlu menggabungkan region source Modul 1/2/3, memelihara
wrapper shell/ID, kemudian membina semula modul serta menyelaraskan vendor pin
dan parent sekali. Jangan memilih satu HTML standalone untuk menindih branch lain.
Versi 1.6.1 ialah cadangan branch; integrator menyelesaikan metadata versi bersama
jika branch selari turut mengubahnya.

[ownership-check.json](evidence/ownership-check.json) mengesahkan byte-identical
untuk labs-panel, projection-panel, calculation-panel, progress-summary, renderer,
geometry, learning-mesh, lessons, preset-nets, labs/net-tools dan kedua-dua studio.
Komponen dan markup dalaman region tersebut tidak diubah. Progress-summary hanya
diletakkan selepas workspace dalam shell, tanpa menukar kandungan/controller.

## Pengesahan sebenar

| Arahan / semakan | Hasil |
|---|---|
| `cd digital/module && npm test` | **331/331 PASS**; asas sebelum perubahan 328/328 |
| `npm run build` | PASS; standalone dibina dengan builder asal |
| `npm run check` | PASS: sintaks, ID, CSP, standalone, versi dan contrast |
| `cd digital && npm run design:check` | PASS: satu pemilik token; adapter identik |
| `npx --offline -p @google/design.md designmd lint digital/module/DESIGN.md` | 0 error; 5 amaran token frontmatter asal yang tidak dirujuk oleh contoh component |
| `git diff --check` dan `node --check` sumber terubah | PASS |
| Fixture pelayar sebenar | 15 kumpulan semakan; **64 keadaan PASS**, 0 ralat runtime |

Matriks pelayar menggunakan iframe CSS **1440px / 390px** (ruang kandungan
1430px / 380px selepas scrollbar), BM/English, light/dark dan teks 100/150% bagi
Explore, Views, Notes dan Calculator. Semakan merangkumi semua 11 model, net yang
disokong, enam arah, nota/contoh, hasil canonical, reset/zum/putar, draf, input salah,
fokus, resize/preference tanpa reset, minimum kawalan 44px dan perkataan tajuk.
Makmal, Pelan & Dongakan serta Semakan Pengiraan dibuka melalui mount sebenar.
Semakan keyboard native tambahan meliputi ArrowRight, +, Home, popup pilihan
Hemisfera, Enter pada ukuran salah, serta animasi Buka/Cantum hingga 100%/0%.
Lihat [manual-browser.json](evidence/manual-browser.json).

Log dan hash berada dalam folder [evidence](evidence/), termasuk
[browser-results.json](evidence/browser-results.json) dan
[provenance.json](evidence/provenance.json). Runner boleh diulang:

```sh
cd digital/module
npm run build
node tools/explore-ui-qa.mjs /absolute/temporary/qa-output
```

Hidangkan folder output secara setempat, buka `qa.html`, tekan **Jalankan matriks**
dan muat turun laporan. Ini HTML modul akhir yang dipasang dengan bridge sebenar
di dalam sandbox `allow-scripts`, tanpa vendor pin atau backend production.

Audit statik generik `audit_project.py --mode strict` mengeluarkan **92 false
positives** `affordance.actionless-button`, bukan keputusan PASS. Audit itu hanya
mengenali handler inline dan tidak menyelesaikan `.mjs`/addEventListener. Binding
controller sebenar dikekalkan dan diuji. Lihat [laporan mentah](evidence/premium-audit.json)
serta [adjudikasi](evidence/premium-audit-review.json); tiada handler inline palsu
ditambah untuk menyenyapkan alat tersebut.

## Screenshot hasil kod

Ini tangkapan pelayar sebenar daripada HTML yang dibina, bukan imej konsep.
Bar QA di luar iframe mengenal pasti lebar/bahasa/tema/saiz teks ujian.

- [25 — Teroka 3D](evidence/25-explore-1440-ms-light.jpg)
- [26 — Enam pandangan 2D](evidence/26-views-1440-ms-light.jpg)
- [27 — Nota](evidence/27-notes-1440-ms-light.jpg)
- [28 — Kalkulator](evidence/28-calculator-1440-ms-light.jpg)
- [Telefon — English, dark, teks 150%](evidence/phone-calculator-390-en-dark-150.jpg)

## Had dan sambungan

- Telefon ialah emulasi viewport CSS dalam Chrome cloud, bukan sentuhan fizikal,
  pembaca skrin, Safari atau Firefox. Tiada dakwaan ujian peranti fizikal.
- Cold-open `file://` disekat polisi pelayar; self-contained/offline disemak oleh
  checker serta UI HTTP tanpa dependency runtime. Tiada jalan pintas polisi dibuat.
- Parent sebenar masih menggunakan pin asas sehingga integrator menerima source
  gabungan. Preview branch ini tidak membuktikan halaman production telah berubah.
- Hanya branch kerja ini dipush. `main`, `main-digitalized`, branch lain, mirror
  awam, Pages/Sites, Auth/SMTP, migration dan Edge Function tidak diubah/diterbitkan.
