# Handoff integrasi modul v1.6.0

Tarikh: 26 Oktober 2026, Malaysia. Branch hasil sahaja:
`digitalized-module-pelan-pengiraan`. SHA commit hasil yang benar-benar dipush
disertakan dalam serahan akhir; gunakan tip branch itu, bukan nombor versi sahaja.

## Asas dan perubahan remote

| Rujukan | SHA penuh | Catatan |
|---|---|---|
| Asas main-digitalized ketika kerja bermula | `790d989d666e64f3beabb507cd4140b832696367` | Digital 2.6.0; modul 1.5.0; status worktree bersih |
| main-digitalized disemak sebelum push | `2e5c70cf4176f99a82376697081c0b6ed4b1368a` | Integrasi Digital 2.7; 15 commit selepas asas; tiada perubahan pada digital/module atau module-language.mjs dalam perbandingan |
| Firmware main disemak | `a059979d97926b82cafd4aa5cf3fe59da04a55bb` | Firmware 1.1.3, tidak diubah |

Branch hasil belum wujud ketika semakan awal dan semakan sebelum push. Kerja
bermula dalam worktree sendiri. Remote dibaca melalui GitHub API, dan objek
commit/tree/blob yang digunakan dipadankan dengan SHA remote; fail daripada
snapshot lain hanya digunakan apabila hash tepat sama. Tiada branch lain dipush,
digabung atau dipadam. Tiada penerbitan Pages, migration atau perubahan akaun.

## Hasil

**Studio Pelan & Dongakan** menggunakan mesh pembelajaran bagi lima bentuk
projek dan mesh gabungan dua susunan kiub unit. Unjuran depan +Z, atas +Y dan
sisi kanan +X menggunakan Kaedah 1 buku: depan di atas pelan, sisi kanan di kiri
depan. Ketiga-tiga grid mempunyai skala panjang sama. Garis padu/sempang/binaan,
garis pindahan 45°, contoh berpandu, latihan kosong, garis/bulatan, snap,
koordinat papan kekunci, pilih/padam, Undo dan kosongkan tersedia.

Semakan setiap pandangan membandingkan liputan geometri; arah, urutan dan
pemecahan/cantuman garis sebaris tidak mengubah kesetaraan. Garis nampak mengatasi
rusuk terlindung yang terunjur pada tempat sama. Garis binaan pilihan tidak
menggantikan jawapan. Toleransi inklusif **0.06 cm lukisan** meliputi jarak
serenjang, hujung/jurang, pusat bulatan dan jejari. Maklum balas menunjukkan
bentuk, kedudukan, panjang, skala atau jenis garis serta lokasi yang terkesan.

**Semakan Langkah Pengiraan** menyediakan empat langkah berturutan untuk 22
pasangan bentuk/kuantiti bagi 11 bentuk. Ia turut menyokong bekas kuboid/silinder
terbuka dan dua gabungan bertapak sepadan. Rumus/nilai sebenar datang daripada
`calculateMeasures`, `containerMeasures` dan `compositionMeasures`. Ukuran,
jejari/diameter, π dan unit dipilih pada satu soalan yang sama. Petunjuk khusus,
cuba semula, contoh berpandu dan penyelesaian tidak mengisi jawapan murid.

Parser terhad tidak menjalankan kod murid. Rumus dibandingkan pada sembilan set
ukuran bebas. Gantian memeriksa asal ukuran melalui AST dengan had 8192 calon,
supaya `96+0` tidak diterima sebagai gantian 6 × 4². Nilai penuh dikekalkan;
pembundaran akhir 2 tempat perpuluhan, atau 3 angka bererti di bawah 0.01.
Ralat jejari/diameter, tinggi tegak/sendeng, tapak/permukaan, faktor 1/3,
tapak dalaman/penutup, π, unit dan pembundaran awal mempunyai petunjuk khusus.

## Pemilik fail

| Laluan dalam digital/module | Tanggungjawab |
|---|---|
| src/projection-geometry.mjs | Unjuran/occlusion, dimensi, skala dan semakan geometri tulen |
| src/projection-studio.mjs / .css | Draf tiga pandangan, panduan, alat dan UI BM/EN |
| src/calculation-steps.mjs | Parser, soalan/rumus bersama, kesetaraan, diagnostik dan unit |
| src/calculation-workshop.mjs / .css | Empat langkah, input/gates, petunjuk dan UI BM/EN |
| src/app.mjs / index.html / tools/build.mjs | Navigasi, nota/kalkulator, tetapan dan HTML mandiri |
| tests/learning-tools-*.test.mjs | Kontrak integrasi, unit hujung julat dan regresi bebas |
| tools/learning-tools-qa.html | QA pelayar sahaja; tidak dibundel untuk murid |

Satu perubahan kecil di luar subtree: `digital/dist/module-language.mjs` kini
mengabaikan akar `data-module-native-language`, supaya adapter lama tidak menulis
semula terjemahan dua komponen baharu. Ujian regresi khusus disertakan dalam
`digital/tests/module-native-language.test.mjs`. Jangan gugurkan perubahan ini
ketika mengemas kini pin modul induk.

## Integrasi untuk chat induk

1. Fetch main-digitalized terkini dan branch hasil; gabungkan commit melalui Git
   dalam worktree integrasi. Pelihara semua perubahan Digital 2.7 selepas asas.
2. Semak konflik jika ada kerja reka bentuk modul yang lebih baharu. Titik
   berpotensi: navigasi `src/index.html`, lifecycle/host di `src/app.mjs`, urutan
   bundle di `tools/build.mjs`, versi `content.mjs`/package/README/changelog,
   serta pengecualian bahasa di `digital/dist/module-language.mjs`.
3. Naik taraf pin `digital/vendor/module-release.json` dan HTML vendornya kepada
   fail **GeoDecoder_Modul_V1.html v1.6.0** yang diuji. Branch ini sengaja tidak
   membina semula pin/alias penerbitan aplikasi induk.
4. Bina semula aplikasi induk dan semua alias melalui alatnya. Jalankan suite
   penuh aplikasi induk selepas pin diganti, selain suite modul dan checker.
   Uji srcdoc sebenar, tetapan, bahasa dan empat refleksi. Tiada perubahan
   protokol, schema, skor, bank soalan atau analitik diperlukan.
5. Penerbitan laman awam kekal di bawah chat integrasi dan arahan pengguna.

## Pengesahan sebenar

- `npm run build`, `npm test`, `npm run check` dalam digital/module: **328/328**
  lulus, 0 gagal/skip. HTML sebenar diuji melalui port DOM/jam, selain matematik
  tulen. Log penuh dalam `../evidence/pelan-pengiraan/`.
- Ujian adapter induk: **7/7** lulus. Ini ujian terarah bahasa/frame, bukan
  tuntutan bahawa keseluruhan suite portal Digital 2.7 telah dijalankan.
- Checker firmware: **v1.1.3 = README = CHANGELOG**. Firmware tidak dibina atau
  dimuat naik kerana tiada perubahan firmware.
- Chrome sebenar melalui pratonton pembangunan: 16 kombinasi (dua fungsi ×
  320/390/768/1280 × BM cerah 100% atau English gelap 150%/kontras tinggi).
  Tiada overflow halaman, kawalan biasa <44 px, teks UI <12 px, ID pendua atau
  sumber luar. Lebar ialah viewport iframe CSS, bukan telefon fizikal.
- Interaksi pelayar sebenar: lengkapkan contoh; lukis empat garis kubus dengan
  borang koordinat; semak tepat; kosongkan dan Undo; lukis garis menggunakan
  Home/Enter/anak panah; semak rumus salah, gantian kebetulan tepat, unit padu
  yang salah untuk luas dan pembetulannya. Draf ukuran 7 kekal selepas bahasa
  dan navigasi, kemudian kembali 4 selepas sesi baharu.
- Semakan bebas silang dua ejen: satu isu penting draf ukuran belum Apply
  ditemui, direproduksi melalui ujian gagal dan dibaiki. Semakan bebas pengiraan
  turut menjalankan 1800 pemeriksaan penyelesaian dengan 0 kegagalan.
- Screenshot sebenar studio dan maklum balas pengiraan dipaparkan dalam chat.
  Eksport binari screenshot kembali ke workspace tidak tersedia; ia tidak
  dimasukkan sebagai fail bukti dalam commit. Tiada video dirakam.

## Had sebenar

Studio ialah lima bentuk tegak projek dan dua susunan kiub tetap; bukan pembina
objek bebas. Ukuran studio integer 1–20 cm, skala 1:1/1:2. Snap 0.5 cm (piramid
0.25 cm); borang menerima perpuluhan tepat. Papan gabungan menatal secara setempat
pada telefon. Bulatan analitik; model 3D bulat ditesselasi untuk paparan.

Semakan algebra terhad ialah bantuan pembelajaran, bukan pembukti identiti
simbolik lengkap. Bentuk input sangat panjang/rumit boleh ditolak pada had yang
dinyatakan. Tiada storan draf baharu; draf mandiri hilang apabila fail ditutup.
Empat refleksi protokol 1 kekal seperti sebelumnya. Tiada penggredan TP.

Reduced motion/saiz teks/kontras/bahasa diuji melalui jambatan tetapan sebenar
dengan kawalan QA. Tetapan OS, sentuhan fizikal, pembaca skrin, suara sebenar,
Edge/Safari dan fail:// tidak diuji. Browser menyekat navigasi fail://; ketulenan
HTML luar talian disemak melalui bundle/CSP, tiada sumber luar dan pratonton
HTML mandiri HTTP. Pengguna boleh memuat turun HTML untuk ujian peranti sendiri.

Rujukan PDF, julat halaman, standard yang disahkan dan contoh asli:
[SOURCES_PELAN_PENGIRAAN.md](SOURCES_PELAN_PENGIRAAN.md).
