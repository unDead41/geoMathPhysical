> Rekod sumber terdahulu. Untuk aliran, struktur fail, bukti dan had semasa v2.4.0, lihat [EASE_OF_USE.md](EASE_OF_USE.md).

# Latihan Pengukuhan — semua 15 soalan

Permintaan: main kesemua 15 soalan sebagai latihan pengukuhan. Branch kerja
`digital-richText`, asas remote `f61a109b9af555eba563163dc38dd8e849a0c472`
(digital v1.3.0). `main` disemak pada
`a059979d97926b82cafd4aa5cf3fe59da04a55bb`, firmware v1.1.3.

## Keputusan pelaksanaan

- Pilihan mod pada borang mula: Kuiz (10 soalan, lalai) atau Latihan Pengukuhan
  (semua 15 soalan, tiga bagi setiap bongkah). Kedua-duanya menggunakan bank,
  enjin, rich text, BM/BI dan aliran R1→R2 yang sama.
- Setiap ID muncul tepat sekali dalam latihan, dengan susunan rawak. Satu
  percubaan setiap soalan, hint percuma, semakan jawapan selepas salah/langkau,
  jeda masa dan animasi sedia ada dikekalkan.
- Kemajuan, markah /15, bilangan rekod semakan dan analitik menggunakan jumlah
  soalan sesi sebenar. Main lagi mengulangi mod yang sama; borang mula membolehkan
  pertukaran mod. Pilihan bahasa kekal disimpan seperti sebelumnya.
- Keputusan latihan dipaparkan pada akhir sesi dengan analitik lengkap, tanpa
  masuk kedudukan kuiz 10 soalan. Tiada migrasi atau pencampuran skor lama.
  Latihan boleh dimainkan offline. Reload kembali ke borang seperti aliran asal.

## Pelan dan pengesahan

- [x] Ujian gagal dahulu untuk semua 15 ID, tiga soalan setiap bongkah, tamat
  selepas soalan 15, jawapan campuran, hint, penyebut analitik dan pengasingan skor.
- [x] Tambah konfigurasi mod dalam core dan paparan BM/BI tanpa enjin kedua.
- [x] Uji permainan latihan sebenar, hasil /15, pertukaran bahasa, dialog,
  ulang mod, kuiz /10, storan dan HTML offline pada telefon/desktop.
- [x] Bina HTML digital/root, semak versi digital v1.4.0 dan semakan kod bebas.
  Penerbitan menggunakan parent SHA remote di atas, dengan lease pada ref
  `digital-richText`. SHA akhir disahkan dan dilaporkan selepas push.

## Kontrak kod

`new Game(bank, player, now, rng, {mode:'practice'})` menggunakan semua soalan.
Argumen kelima adalah pilihan; pemanggil lama kekal kuiz 10 soalan. Nilai mod
yang sah ialah `quiz` dan `practice`. `buildRound(bank, rng, mode)` menyemak
bank latihan lengkap: 15 ID unik, tiga bagi setiap lima bongkah. Data bank
tidak diubah, hanya salinan susunan yang dirawakkan.

`game.total` berasal daripada panjang pusingan sebenar. `result()` mengandungi
`mode` dan `total`; ID soalan, bentuk, topik dan ruleset kekal stabil. Paparan
menggunakan jumlah ini untuk kemajuan, markah, label kebolehcapaian, pengumuman,
dialog bantuan/keluar, penamat selepas soalan terakhir, keputusan dan analitik.

`finishGame()` hanya menyimpan keputusan mod `quiz`. `validRecord()` turut
menolak `practice`; rekod kuiz lama tanpa medan `mode` kekal diterima. Tiada
kunci storan, aturan kedudukan, CSV atau data lama ditukar. Skor latihan tidak
dibandingkan dengan skor kuiz kerana jumlah soalan berbeza. Tiada sejarah
latihan berterusan ditambah dalam skop ini.

## Keputusan pengesahan — 26 Oktober 2026 (Malaysia)

| Semakan | Keputusan |
|---|---|
| `npm test` | 60/60 lulus; termasuk 500 seed latihan, semua ID tepat sekali, tiga soalan setiap bongkah, penamat soalan 15, satu percubaan, hint, analitik dan sempadan storan |
| Ujian gagal→lulus | Enam ujian latihan gagal pada kod asal; ujian penyebut bahasa turut gagal dengan `15 daripada 10` sebelum pembetulan |
| `npm run test:practice` | Dua sesi 15 soalan lengkap lulus; BM/BI, 1365px/390px/320px, pemilih mod muat, 15 tanda kemajuan, soalan 11→15 dan penyebut label akses betul |
| Latihan offline semua betul | 15/15, R1 15/15, dua hint, 15 rekod semakan, analitik 3/3 bagi setiap bongkah; sifar permintaan HTTP |
| Latihan jawapan campuran | 10/15, tiga salah, dua langkau, dua hint, R1 11/15; 10/15 tidak dilabel semua betul; semakan pada soalan 10 meneruskan soalan 11, langkau soalan 15 membuka analitik |
| Mod, bahasa dan storan | Pilihan kad, susunan/warna, /15, hint dan mod kekal ketika tukar bahasa; ulang latihan kembali 01/15; boleh kembali dan memilih kuiz 01/10; rekod kuiz sebelum latihan tidak berubah |
| `npm run test:browser` | Kesemua lapan senario regresi kuiz lulus: BM/BI, daftar, dialog/jeda, permainan satu percubaan, analitik/CSV, skor sekali sahaja, telefon, offline dan storan ditolak |
| Build/check | HTML digital dan `index.html` root sama tepat; v1.4.0 sepadan, sintaks inline/asset offline, 92 ID unik, ARIA dan kesetiaan bank lulus |
| Semakan kod bebas | Isu pengumuman yang masih menyebut jumlah 10 dibetulkan pada ketiga-tiga template BM/BI dan empat callsite, diuji semula dan disahkan selesai; tiada finding tertangguh |

Playwright ialah dependency pembangunan berasingan. Jalankan dengan lokasi
dependency/executable melalui `PLAYWRIGHT_MODULE_PATH` dan
`PLAYWRIGHT_CHROMIUM_PATH` jika tidak menggunakan lokasi lalai.

| Bukti Chromium sebenar | Bahasa Melayu | English |
|---|---|---|
| Pilihan mod | [BM](practice-evidence/practice-welcome-ms.png) | [English](practice-evidence/practice-welcome-en.png) |
| Soalan 11 daripada 15 | [Desktop BM](practice-evidence/practice-game-ms.png) | [Telefon English](practice-evidence/practice-game-en.png) |
| Keputusan 15/15 | [BM](practice-evidence/practice-result-ms.png) | [English](practice-evidence/practice-result-en.png) |

Animasi dibekukan untuk tangkapan sahaja. Ujian berjalan pada Chromium sebenar
dengan emulasi viewport; telefon fizikal, Safari/Firefox dan sebutan pembaca
skrin sebenar belum diuji. Label akses dan pengumuman disemak melalui DOM dan
ujian dwibahasa. Tiada perubahan firmware/hardware, audio, akaun atau hosting.
