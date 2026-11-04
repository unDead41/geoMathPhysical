# GeoMath — Modul 3 UI refresh

Tarikh: 4 November 2026 (Malaysia). Branch penghantaran sahaja:
`digitalized-module-studio-ui-refresh`. Tiada penerbitan laman atau backend.

## Rujukan tepat

| Rujukan | SHA / versi |
|---|---|
| Asas remote main-digitalized; disemak semula sebelum penghantaran | `391df985eea4fee15d9859e678068b1a3f613cba` |
| Konsep ui/ux-redesign-concept | `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd` |
| main diperiksa, tanpa pindaan | `25836eb1a6f24459aace8a3980ae880a13e3b488` |
| Versi sumber Digital / modul | `2.8.0` / `1.6.0` |
| Commit akhir pelaksanaan | `2c35cefa79e3157b16d0bd9fb2e40f12a77df7e2` |

Commit pelaksanaan di atas mengandungi semua source, standalone, ujian dan screenshot.
Commit metadata susulan memuktamadkan handoff ini; SHA tip remote disahkan dalam
serahan chat.

Nombor sumber dikekalkan untuk mengelakkan tiga branch modul memilih nombor
keluaran yang bercanggah. Integrator menetapkan nombor keluaran gabungan kemudian.
Ini bukan resit keluaran production. Firmware tidak diubah.

Prompt 04, README, manifest, IMPLEMENTATION_CONTRACT dan OWNERSHIP dibaca pada
ref konsep. Gambar 09 dibuka; SHA-256
`a4d30c7c3249c1463f661bc6b453e7ac9576f175e1b04e7f324a358c912e6b4e`
dipadankan dengan manifest. Hanya paparan 34–36 dilaksanakan.

Git terus tidak mempunyai kelayakan dalam sesi ini. Commit/tree remote dan 171
blob sumber diperlukan diambil melalui sambungan GitHub; setiap blob dan tree
disahkan dengan hash Git. Worktree tersendiri dibina pada commit asas tepat,
dengan laluan tidak diperlukan ditandakan skip-worktree. Tiada source dibina
semula daripada ingatan dan tiada checkout chat lain ditukar. Penerbitan branch
menggunakan objek Git dan ref melalui sambungan GitHub, tanpa force-push.

## Hasil

**Studio Pelan & Dongakan.** Tajuk GeoMath, toolbar garis/bulatan/pilih dan Undo,
pilihan bongkah/ukuran/skala dalam disclosure, model sebenar di sisi papan,
koordinat dan semakan pandangan aktif. Arahan input serta petunjuk jenis garis
boleh dibuka apabila diperlukan. Lima projek dan dua susunan kiub kekal.

Papan kekal Kaedah 1: depan +Z di atas pelan +Y; sisi kanan +X di kiri depan.
Paparan raster konsep menyusun tiga grid sebaris, tetapi kontrak geometri
mengatasi susunan itu. Skala 36 piksel per cm lukisan tidak dikecilkan untuk
telefon; papan menatal secara setempat. Garis nampak/tersembunyi/binaan,
kesetaraan segmen dan toleransi inklusif 0.06 cm kekal milik pemeriksa asal.

**Semakan langkah pengiraan.** Empat penunjuk langkah dengan satu jawapan aktif,
model/ukuran sebenar di sisi jawapan, soalan dan panduan sintaks dalam disclosure,
kawalan sebelumnya/seterusnya, petunjuk, contoh, retry dan penyelesaian asal.
Langkah terkunci kekal terkunci; menyunting jawapan terdahulu membatalkan
pengesahan langkah berikutnya. Pilihan langkah menatal fokus ke jawapan supaya
medan tidak berada di luar skrin telefon. Draf, ukuran, π dan semakan kekal semasa
bahasa/navigasi biasa; sesi baharu membersihkan jawapan mengikut kontrak asal.

Parser, provenance, 22 pasangan bentuk/kuantiti, 11 bongkah, bekas terpilih dan
dua gabungan tidak diubah. Contoh tidak mengisi jawapan murid.

**Rekod latihan kendiri.** Panel ringkasan sedia ada kini disclosure empat baris,
meter 0–4, status sebenar dan tiga medan refleksi yang boleh dibuka. Ulang/Sambung
membuka makmal yang berkenaan melalui butang navigasi sedia ada. Reset percubaan
kekal tindakan Ulang milik controller makmal; membuka rekod tidak memadam draf
atau pencapaian. Tiada route, statistik hardcode, skor studio, TP atau tuntutan
penguasaan ditambah. Baris DOM dikemas kini tanpa dibina semula supaya fokus dan
refleksi terbuka kekal semasa kemas kini bahasa/rekod. Teks murid menggunakan
textContent. Sesi baharu mengosongkan paparan rekod lama.

## Pemilikan dan integrasi

| Fail | Pindaan |
|---|---|
| module/src/projection-studio.mjs, .css | View studio, toolbar dan komposisi panel sahaja |
| module/src/calculation-workshop.mjs, .css | View wizard, fokus dan komposisi panel sahaja |
| module/src/index.html | Hanya progress-summary; native-language root dikekalkan |
| module/src/style.css | Hanya append blok UX-REDESIGN:PROGRESS, di-scope kepada .progress-summary |
| module/src/accessibility.mjs | Import utiliti DOM; hanya view summary dan panggilan refresh summary melalui voiceAvailability yang sudah dipanggil oleh settings |
| module/tests/*studio*, calculation-workshop.test.mjs | Regresi view, draf, navigasi dan rekod |
| module/tools/learning-tools-qa.html | Lebar 1440 dan fixture rekod setempat berlabel |
| module/tools/studio-ui-refresh.browser.mjs | Runner Chromium untuk fixture asal, matrix, aliran sebenar dan screenshot |
| module/GeoDecoder_Modul_V1.html | Standalone dibina melalui builder asal |

`evidence/ownership-check.json` menyemak 17 sempadan: baki index.html dan prefix
style.css, app.mjs, renderer, labs, guided, projection-geometry,
calculation-steps, adapter token, builder, progress protocol/view induk dan vendor
pin. Method ModuleAccess.init/progress/applyTheme sama tepat dengan asas.

Tiada hook baharu pada app.mjs atau tools/build.mjs diperlukan. Import utiliti
DOM sudah berada sebelum accessibility dalam senarai builder asal. Gabungkan
region source ini bersama perubahan Modul 1/2; kekalkan semua blok CSS berpenanda.
Bina standalone modul sekali lagi selepas source gabungan selesai. **Jangan
menggantikan vendor pin atau HTML aplikasi induk dengan artifact branch ini**:
integrator perlu mengemas kini provenance pin dan membina semua alias induk
selepas integrasi yang dibenarkan. Branch ini tidak mengubah vendor/pin induk.

## Pengesahan sebenar

| Semakan | Keputusan |
|---|---|
| Baseline npm test, digital/module | 328/328 lulus |
| npm test, digital/module selepas perubahan | 333/333 lulus; 0 gagal/skip |
| npm run build, digital/module | Standalone mandiri berjaya dibina |
| npm run check, digital/module | Lulus: sintaks, ID, network/storage boundary, versi dan token/kontras |
| npm run design:check, digital | Lulus: satu sumber token dan adapter tepat |
| Ujian host module-progress/view, native-language/settings, language/frame/settings | 29/29 lulus; vendor asas tidak diubah |
| Chromium 133; fixture learning-tools asal | 48 keadaan responsif; 4 aliran sebenar lulus |
| git diff --check | Lulus |
| Audit statik strict | 90 penemuan pada asas; 90 selepas perubahan, semuanya affordance.actionless-button; bukan audit bersih |

Arahan browser (selepas build dan pemasangan Playwright untuk pembangunan):

```sh
GEOMATH_CHROMIUM=/path/to/chromium node digital/module/tools/studio-ui-refresh.browser.mjs
```

`GEOMATH_SKIP_CAPTURE=1` menjalankan matrix/aliran tanpa mengambil semula imej.
`GEOMATH_CAPTURE_ONLY=1` mengambil enam screenshot tanpa mengulang matrix.
Binary dan dependency ujian tersedia dalam runtime sesi; ia tidak dimasukkan ke
repo. Runner menggunakan pelayan HTTP loopback miliknya sendiri dan menutupnya.

Matrix: projection/calculation/records × 1440/390 × BM/English × light/dark ×
100/150%; reduced motion aktif. Kawalan biasa sekurang-kurangnya 44 px, tiada
teks UI di bawah 12 px, ID pendua atau overflow dokumen dalam matrix. Papan
geometri sengaja menatal dalam kontainernya. Kontras tinggi turut digunakan
untuk screenshot English dark 150%. Ujian host meliputi nilai 125% yang disokong;
ia tidak diuji sebagai satu lagi matrix screenshot lengkap.

Aliran pelayar: empat garis koordinat kubus dan semakan sebenar, pilih/padam/Undo,
pilihan alat serta Home/Enter/Escape; draf merentas bahasa/navigasi; formula
invalid, petunjuk/contoh, penolakan gantian 96+0, empat langkah, unit cm³ salah
untuk luas dan pembetulan cm², revisiting/invalidation serta retry; rekod fixture,
refleksi, aktiviti sambung dan sesi baharu. Regresi fokus telefon direproduksi
sebelum pembaikan dan disemak semula selepas pembaikan. Suite geometri/parser
asal menguji skala, hidden edges, kesetaraan dan sempadan toleransi.

Semakan bebas menemui satu isu fokus telefon; isu itu direproduksi dan dibaiki.
Tiada isu kritikal lain dilaporkan. Laporan statik mempunyai batasan pengesanan
binding tindakan pada struktur aplikasi lama; 90 penemuan asas dikekalkan untuk
semakan integrator, tanpa perubahan pada shell/makmal milik chat lain.

## Screenshot hasil kod

Ini screenshot Chromium daripada HTML dibina, bukan imej konsep. Model berasal
daripada renderer/mesh canonical. Rekod 2/4 ialah **fixture ujian setempat**, bukan
rekod akaun sebenar; teks refleksi murid sengaja tidak diterjemah.

| Paparan | Desktop | 390px English dark, teks 150% |
|---|---|---|
| 34 Studio | [Screenshot](evidence/34-studio-desktop-en-light.png) | [Screenshot](evidence/34-studio-390-en-dark-150.png) |
| 35 Pengiraan | [Screenshot](evidence/35-calculation-desktop-ms-light.png) | [Screenshot](evidence/35-calculation-390-en-dark-150.png) |
| 36 Rekod fixture | [Screenshot](evidence/36-records-desktop-en-light-fixture.png) | [Screenshot](evidence/36-records-390-en-dark-150-fixture.png) |

## Had dan langkah sambung

Belum diterapkan pada aplikasi induk atau laman awam. Tiada Pages/Sites, backend,
migration, Auth/SMTP, mirror atau branch lain dipush. Draf standalone kekal
memory-only seperti asas. Rekod empat refleksi kekal protokol 1.

Ujian ialah Chromium desktop/Linux dengan viewport CSS, bukan telefon fizikal,
Safari/Edge, pembaca skrin atau keyboard maya. Native select menggunakan popup
OS/pelayar; matrix menguji nilai dan kawalannya, bukan rupa semua popup OS.
Pelayar bersambung tidak dapat mencapai localhost workspace; bukti diambil
melalui runner Chromium setempat, tanpa akaun atau data production.
