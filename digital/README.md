# GeoDecoder Digital — Bahasa Melayu / English

Versi digital: **v1.1.0**. Branch GeoDecoder: **digital-dwi**.

Pilih **Bahasa Melayu / English** pada bahagian atas. Bahasa boleh ditukar
semasa bermain atau di dalam dialog tanpa mengulang soalan, menukar pilihan kad,
menghilangkan padanan diterima atau mengubah skor. Pilihan bahasa disimpan pada
peranti; BM ialah pilihan awal. Semua terjemahan turut berada dalam HTML tunggal.

Istilah, rujukan kurikulum dan kontrak integrasi:
[BM/BI](docs/DWI_LANGUAGE.md), [glosari](docs/DWI_GLOSSARY.md),
[bukti ujian](docs/DWI_VERIFICATION.md), [changelog digital](CHANGELOG.md).
Nombor digital berasingan daripada firmware v1.1.3; main/digitalize belum menerima
versi branch bahasa ini.

## Cuba terus — satu fail HTML

Muat turun `GeoDecoder_Digital_V1.html` daripada folder ini. Buka fail itu dengan
Chrome, Edge atau Firefox. Tidak perlu VS Code, ESP32, PlatformIO, pemasangan
atau sambungan internet untuk bermain. Fail ini mengandungi semua CSS,
JavaScript, 15 soalan dan ilustrasi SVG; tiada fail luaran diperlukan.

1. Masukkan nama, pilih **Murid/Pelajar** dan isi kelas.
2. Seret satu bongkah 3D ke **R1**.
3. Selepas R1 betul, seret kad bentangan yang sepadan ke **R2**.
4. Pasangan betul mendapat **+1 markah**. Lengkapkan 10 soalan.
5. Keputusan, cubaan salah, penggunaan petunjuk dan papan skor dipaparkan.

Dalam English, kategori dipaparkan sebagai **Pupil / Student**. ID kategori
tersimpan dikekalkan supaya papan skor v1.0.0 masih boleh dibaca. Tajuk CSV dan
label kategori mengikut bahasa pilihan semasa eksport.

Alternatif tanpa seret: klik/sentuh kad, kemudian klik pengimbas. Papan kekunci:
Tab untuk bergerak; Enter/Space untuk memilih dan mengimbas. Escape menjeda.

## Peraturan digital

- Lima bongkah sebenar dalam bank firmware: kubus, kuboid, piramid, silinder, kon.
- Sepuluh soalan unik setiap pusingan, dua bagi setiap bongkah, daripada bank 15.
- Lima bongkah dan lima kad tersedia setiap soalan. Susunan kedua-duanya diacak
  secara berasingan; tiada nama jawapan pada kad.
- Setiap soalan mesti dijawab R1 dahulu, kemudian R2. R1 sahaja tidak mendapat markah.
- Jawapan salah boleh dicuba semula; hint tanpa potongan. Langkau +0.
- R1/R2 menggunakan biru sedia, hijau betul, merah salah, ungu hint.
- Pasangan betul atau langkau menjalankan tiga kelipan 150 ms ON/OFF;
  input dan jam berhenti selama 900 ms. Mod reduced motion mengganti kelipan
  dengan warna tetap tanpa mengubah timing.
- Jeda, panduan, papan skor dan tab tersembunyi menjeda jam. Bunyi pilihan, default padam.
- Satu rekod bagi setiap pusingan lengkap. Reload memulakan semula permainan;
  pusingan yang belum lengkap tidak disimpan.

Papan skor menyimpan 50 keputusan terbaik **dalam pelayar/peranti itu sahaja**.
Susunan: markah paling tinggi → cubaan salah paling sedikit → masa paling singkat.
Tiada akaun, pelayan, penghantaran nama, analitik atau penyegerakan antara peranti.
Eksport CSV dan padam skor tersedia. Mengosongkan data pelayar memadam skor.
Sesetengah pelayar menghadkan localStorage bagi `file://`; aplikasi memberi
notis dan mengekalkan skor sementara dalam sesi jika simpanan tidak tersedia.

## Kod dan pengesahan

`dist/` ialah sumber web tanpa build. `tools/standalone.mjs` menggabungkan sumber
yang sama menjadi HTML tunggal. Semua geometri ialah SVG tepat, bukan imej AI.
`docs/SOURCE.md` merekodkan bank dan flow firmware yang digunakan.

```sh
cd digital
npm test
npm run standalone
npm run check
```

Ujian Chrome sebenar tambahan: pasang Playwright berasingan dan jalankan
`npm run test:browser`. Jika dependency/browser disediakan di lokasi lain,
tetapkan `PLAYWRIGHT_MODULE_PATH` dan `PLAYWRIGHT_CHROMIUM_PATH`.

Node.js hanya diperlukan untuk pembangunan dan ujian, bukan untuk memainkan HTML.
Tiada pakej npm tambahan diperlukan. Untuk pratonton modular, jalankan pelayan
statik daripada `dist/`, contohnya `python -m http.server 8000 --directory dist`.

`npm run standalone` menulis `artifacts/GeoDecoder_Digital_V1.html` dan salinan
untuk QA dalam `dist/`. Fail `GeoDecoder_Digital_V1.html` di akar folder digital
ialah artifak keluaran yang sama. Bina semula dan salin semula fail itu selepas
mengubah sumber. Rekod semakan: `docs/VERIFICATION.md`.

Versi digital berasingan daripada firmware v1.1.3. Kerja ini tidak mengubah
firmware, UID, wiring, main atau sharing. Publication laman web ditangguh:
permintaan terkini pengguna ialah mencuba fail HTML dahulu.
