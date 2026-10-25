# GeoDecoder Digital V1

Versi digital: **v1.2.0**. Branch: **digital-dwi**.

## Cuba terus — satu fail HTML

Muat turun `GeoDecoder_Digital_V1.html`, kemudian buka dengan Chrome atau Edge.
Semua JavaScript, CSS, soalan dan ilustrasi terkandung dalam satu fail; tiada
pemasangan atau sambungan Internet diperlukan untuk bermain.

1. Masukkan nama, pilih Murid/Pelajar dan isi kelas.
2. Seret bongkah ke R1. Selepas R1 betul, seret kad bentangan ke R2.
3. Pasangan betul mendapat +1. Satu pusingan mempunyai 10 soalan unik,
   dua bagi setiap bongkah daripada bank 15 soalan.
4. **Satu percubaan setiap soalan.** Salah pada R1 atau R2 menamatkan soalan
   dengan +0. Lihat pasangan yang betul dan penerangannya, kemudian teruskan.
5. Lihat analisis mengikut bongkah, R1/R2 dan jenis soalan di akhir permainan.

Tanpa seretan: klik/sentuh kad, kemudian klik pengimbas. Papan kekunci:
Tab untuk bergerak, Enter/Space untuk memilih dan mengimbas. Memilih kad sahaja
belum menggunakan percubaan. Petunjuk percuma. Langkau +0 dan menunjukkan jawapan.

## Warna dan animasi

Semua lima bongkah dan lima bentangan sentiasa tersedia. Setiap pilihan berubah
kedudukan setiap soalan. Warna juga berubah bagi setiap bongkah/bentangan;
warna R1 dan R2 dipilih berasingan, jadi padankan **bentuk**, bukan warna.
Ilustrasi utama bergerak perlahan, seni kad bergerak sedikit dalam kawasan
pilihan yang tetap, imbasan mempunyai animasi masuk dan semakan menunjukkan
pasangan betul dengan animasi. Jeda animasi melalui ikon di penjuru atas.
Tetapan reduced motion peranti juga dihormati.

Betul menjalankan tiga kelipan 150 ms ON/OFF, kemudian meneruskan selepas 900 ms.
Salah/langkau menunjukkan semakan dan memerlukan butang terus selepas minimum
1.8 saat. Jam dijeda sepanjang maklum balas/semakan, dialog dan tab tersembunyi.
Permainan yang belum lengkap tidak masuk papan skor. Reload kembali ke borang.

## Analisis dan skor

Analisis membezakan salah, langkau, petunjuk dan tahap belum dicuba. Salah R1
tidak dikira sebagai salah R2. Peratus R1/R2 hanya menggunakan imbasan sebenar;
kiraan pasangan/topik menggunakan soalan yang diberi. Kiraan dan denominator
dipaparkan bersama cadangan latihan dan semakan semua sepuluh soalan.

Papan skor menyimpan sehingga 50 keputusan terbaik dalam pelayar/peranti yang
sama. Susunan: markah → soalan salah lebih sedikit → masa lebih pantas.
Skor V1.0.0 dengan retry dikekalkan dalam kumpulan berasingan dan tidak masuk
kedudukan satu percubaan. Eksport CSV merangkumi papan skor semasa. Padam skor
meminta pengesahan dan memadam kedua-dua kumpulan.

Nama dan keputusan kekal setempat; tiada akaun, API atau penyegerakan peranti.
Sekiranya localStorage tidak tersedia, notis dipaparkan dan skor kekal sementara
dalam sesi. Polisi storan fail tempatan boleh berbeza antara pelayar.

## Pembangunan

```sh
cd digital
npm test
npm run standalone
npm run check
```

Node diperlukan untuk pembangunan sahaja. `dist/` ialah sumber modular tanpa
dependency npm. Pembina HTML menggunakan sumber yang sama; salin artifak dari
`artifacts/GeoDecoder_Digital_V1.html` ke akar folder digital sebelum commit.

`docs/SOURCE.md` merekodkan bank firmware dan SHA rujukan; `docs/UPGRADE_V1_1.md`
merekodkan skop perubahan; `docs/VERIFICATION.md` merekodkan hasil semakan.
Versi digital berasingan daripada firmware v1.1.3. Modul pembelajaran penuh
bongkah→bentangan akan dikerjakan berasingan pada `digitalize-module`.

Keluaran ini ialah HTML untuk dicuba dahulu; tiada laman web diterbitkan.

## Bahasa Melayu / English

Pilih bahasa di kepala halaman atau dialog. Soalan, padanan diterima, warna, susunan, percubaan, jam dan data analitik tidak berubah. Semua terjemahan turut berada dalam HTML offline.

Lihat [glosari](docs/DWI_GLOSSARY.md), [kontrak bahasa dan sumber](docs/DWI_LANGUAGE.md), [bukti BM/BI](docs/DWI_VERIFICATION.md) dan [changelog](CHANGELOG.md). Ujian pelayar: `npm run test:browser` dengan Playwright berasingan; pilihan lokasi melalui `PLAYWRIGHT_MODULE_PATH` dan `PLAYWRIGHT_CHROMIUM_PATH`.
