# GeoDecoder Digital V1

Versi digital: **v1.5.0**. Branch: **digital-richText**.

## Cuba terus — satu fail HTML

Muat turun `GeoDecoder_Digital_V1.html`, kemudian buka dengan Chrome atau Edge.
Semua JavaScript, CSS, soalan dan ilustrasi terkandung dalam satu fail. Kuiz dan
Latihan Pengukuhan boleh dimainkan tanpa Internet. **Duel memerlukan Internet**
untuk menghubungkan dua pemain dan mengesahkan keputusan.

1. Masukkan nama, pilih Murid/Pelajar, isi kelas dan pilih mod permainan.
2. Seret bongkah ke R1. Selepas R1 betul, seret kad bentangan ke R2.
3. Pasangan betul mendapat +1. **Kuiz** mempunyai 10 soalan unik, dua bagi
   setiap bongkah. **Latihan Pengukuhan** meliputi semua 15 soalan tanpa ulangan,
   tiga bagi setiap bongkah, dengan markah maksimum 15.
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
1.8 saat. Dalam kuiz/latihan, jam dijeda sepanjang maklum balas/semakan, dialog
dan tab tersembunyi. Permainan yang belum lengkap tidak masuk papan skor.
Reload kuiz/latihan kembali ke borang. Jam Duel menggunakan masa pelayan dan
terus berjalan; sambung semula melalui mod Duel selepas reload.

## Duel — lawan kawan menggunakan PIN

1. Kedua-dua murid buka fail/halaman versi ini, isi borang dan pilih **Duel**.
2. Pemain pertama pilih **Cipta Duel**, kemudian salin dan kongsi PIN enam digit
   kepada kawannya. Pemain kedua masukkan PIN itu untuk menyertai.
3. Kedua-duanya tekan **Sedia**. Kira detik tiga saat memulakan sepuluh soalan
   yang sama dalam susunan sama, dua soalan bagi setiap bongkah.
4. Jawab menggunakan R1 kemudian R2. Markah lebih tinggi menang; jika markah
   sama, pemain yang selesai lebih cepat menang. Keputusan disahkan pelayan.

Setiap pemain boleh memilih BM atau English sendiri. Kemajuan lawan dikemas kini
sekitar dua saat, ditambah masa rangkaian. Menu, tab tersembunyi dan gangguan
sambungan tidak menghentikan jam Duel. Had perlawanan 15 minit; PIN lobi sah
10 minit. Keluar sebelum selesai bermaksud menyerah kalah. Jika sesi masih
tersimpan dalam tab, masuk semula ke Duel untuk menyambung selepas reload.
Keputusan Duel tidak dimasukkan ke papan skor kuiz.

Alias dan tindakan Duel dihantar kepada pelayan; kelas/kategori kekal setempat.
Akses sesi luput selepas 24 jam dan pembersihan data dibuat secara berperingkat
apabila pelayan menerima permintaan. Lihat [kontrak, bukti dan had ujian Duel](docs/DUEL.md).

## Analisis dan skor

Analisis membezakan salah, langkau, petunjuk dan tahap belum dicuba. Salah R1
tidak dikira sebagai salah R2. Peratus R1/R2 hanya menggunakan imbasan sebenar;
kiraan pasangan/topik menggunakan soalan yang diberi. Kiraan dan denominator
dipaparkan bersama cadangan latihan dan semakan semua soalan sesi (10 atau 15).

Keputusan Latihan Pengukuhan dipaparkan bersama analitik /15 pada akhir sesi.
Keputusan latihan tidak dimasukkan ke papan skor kuiz 10 soalan. **Ulang latihan**
memulakan semula semua 15 soalan dalam susunan rawak. Pilihan mod boleh diubah
pada borang mula. Lihat [kontrak dan bukti latihan](docs/PRACTICE.md).

Papan skor menyimpan sehingga 50 keputusan terbaik dalam pelayar/peranti yang
sama. Susunan: markah → soalan salah lebih sedikit → masa lebih pantas.
Skor V1.0.0 dengan retry dikekalkan dalam kumpulan berasingan dan tidak masuk
kedudukan satu percubaan. Eksport CSV merangkumi papan skor semasa. Padam skor
meminta pengesahan dan memadam kedua-dua kumpulan.

Dalam kuiz/latihan, nama dan keputusan kekal setempat tanpa akaun atau API.
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

Keluaran ini menyediakan HTML; backend Duel sudah aktif. GitHub Pages belum
diaktifkan untuk repository private ini. Branch penerbitan `main-digital`
belum menerima perubahan Duel daripada `digital-richText`.

## Bahasa Melayu / English

Pilih bahasa di kepala halaman atau dialog. Soalan, padanan diterima, warna, susunan, percubaan, jam dan data analitik tidak berubah. Semua terjemahan turut berada dalam HTML offline.

Lihat [glosari](docs/DWI_GLOSSARY.md), [kontrak bahasa dan sumber](docs/DWI_LANGUAGE.md), [bukti BM/BI](docs/DWI_VERIFICATION.md) dan [changelog](CHANGELOG.md). Ujian pelayar: `npm run test:browser` dengan Playwright berasingan; pilihan lokasi melalui `PLAYWRIGHT_MODULE_PATH` dan `PLAYWRIGHT_CHROMIUM_PATH`.

## Rich text dan rumus

Rumus menggunakan pecahan dan kuasa berstruktur, simbol π/× dan label bacaan
matematik BM/BI. Istilah geometri penting ditebalkan dalam soalan, petunjuk dan
penerangan semakan. Ukuran mempunyai jarak unit yang konsisten. Kandungan juga
menyokong `**tebal**`, `_italik_` dan baris baharu melalui renderer setempat.
Semua ini berada dalam HTML offline. Lihat [kontrak dan pengesahan rich text](docs/RICH_TEXT.md).
Jalankan `npm run test:rich-text` untuk ujian paparan rumus sebenar.
