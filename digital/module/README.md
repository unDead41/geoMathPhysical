# Modul Pembelajaran GeoDecoder Digital V1

Versi modul: **v1.2.0**. Branch kerja: **digitalize-module**.

## Cuba terus

Muat turun **GeoDecoder_Modul_V1.html**, kemudian buka dengan Chrome atau Edge.
Satu fail ini mengandungi semua kod, gaya, kandungan dan geometri. Tiada CDN,
fon, pemasangan, akaun, storan pelayar atau sambungan Internet diperlukan.
Pautan DSKP ialah rujukan pilihan; aktiviti tidak memerlukannya.

- Pilih kubus, kuboid, piramid bertapak segi empat sama, silinder atau kon.
- Seret model untuk putar. Cubit dua jari, gunakan roda tetikus atau butang +/− untuk zum.
- **Kedudukan asal** mengembalikan kamera dan zum. Anak panah pada model
  memutarkannya; Home mengembalikan kamera. Pilihan arah menyediakan alternatif kepada seretan.
- **Buka bentangan**, **Cantum semula**, **Main/Jeda**, **Ulang** dan peluncur
  mengawal proses yang sama secara berterusan.
- Hidupkan label atau pilih permukaan bernombor untuk menjejaki warna muka.
- **Pandangan 2D** menutup semula bongkah, menghentikan putaran dan menyediakan
  atas, bawah, depan, belakang, kiri dan kanan. Semua unjuran ialah ortografik.
- **Cuba fikir** memberi penerangan tanpa markah atau penyimpanan keputusan.
- Pilih **Nota pembelajaran** untuk sifat, bentangan, luas permukaan dan isi padu
  bagi bongkah yang dipilih. Butang 6.1–6.4 membawa terus kepada bahagian nota.
- Buka **Contoh berpandu** untuk soalan dan empat langkah penyelesaian.
- **Cuba ukuran sendiri** menerima ukuran dalam cm (0.1–1000), termasuk koma
  perpuluhan. Rajah ukuran, tinggi sendeng, jumlah luas dan isi padu dikira semula.
  Silinder/kon menyediakan pilihan π ≈ 22/7, π ≈ 3.142 atau nilai π penuh.
- Nota turut mengandungi rumus ringkas, penukaran unit, kesilapan lazim dan satu
  contoh bongkah gabungan. Tindakan pada nota membuka model/bentangan/pandangan
  bongkah yang sama. Membaca nota menghentikan gerakan 3D di belakangnya.

Putaran automatik bermula perlahan apabila reduced motion tidak aktif. Ia boleh
dihentikan. Tab tersembunyi menghentikan gerakan dan memerlukan tindakan baharu
untuk bergerak semula. Reduced motion mematikan putaran awal dan peralihan kamera;
animasi pendidikan hanya dimainkan selepas arahan Main/Buka/Cantum daripada murid.
Peluncur sentiasa membolehkan pemerhatian bingkai demi bingkai.

## Makmal interaktif v1.2.0

Pilih **Makmal interaktif**, kemudian pilih aktiviti 01–04:

1. **Bina bentangan:** grid 6 × 6, tepat enam muka kubus. Tekan petak, seret muka,
   atau pilih muka dan gunakan butang arah. Lipat/buka, jeda/sambung dan peluncur
   memaparkan muka yang tegar. Mesej membezakan tidak cukup muka, sambungan
   terputus dan pertindihan. Susunan dengan sambungan berlebihan menandakan
   potongan tambahan dengan garis putus-putus dalam pratonton.
2. **Isi padu:** susun kiub unit, tambah satu lapisan atau penuhkan kuboid.
   Ukuran integer 1–6 cm (maksimum 216 kiub). Pilih kon/piramid untuk tiga
   pemindahan isi kepada silinder/prisma yang mempunyai tapak dan tinggi sama.
   Isi semula sumber antara tuangan. Ukuran perbandingan 1–8 cm.
3. **Terbitkan rumus:** semua lima bongkah, ukuran 1–10 cm, bentangan berukuran
   sebenar, pemilihan setiap permukaan dan jumlah luas. Rumus muncul selepas
   semua permukaan dipilih. Bulatan menggunakan nilai π penuh, ditandai anggaran
   pada paparan; pengiraan tidak membundarkan bahagian sebelum menjumlahkan.
4. **Gabungan:** kubus+piramid dan silinder+kon dengan tapak bersama sepadan.
   Cantum/pisah secara berterusan, ubah ukuran dan pilih permukaan luar.
   Kedua-dua permukaan yang bercantum dikecualikan; isi padu ditambah.

Semua makmal menggunakan satu kamera yang boleh diseret, butang arah, zum dan
kedudukan asal. Butang yang memulakan animasi memfokuskan model. Menukar makmal,
keluar bahagian atau menyembunyikan tab menghentikan animasi. Pemindahan cecair
ialah simulasi aras/isi padu ideal, bukan simulasi aliran bendalir fizikal.

Pengesahan v1.2.0: [laporan makmal](docs/LABS_V1_2.md).

## Kandungan dan matematik

Sifat dan bentangan menyokong DSKP Matematik Tingkatan 2 SP 6.1.1 dan 6.2.1.
Nota v1.1.0 menambah luas permukaan (6.3.1), contoh gabungan dan unit (6.3.3),
serta isi padu (6.4.1–6.4.3) untuk lima bongkah projek.
Pandangan ortografik ialah pengayaan Tingkatan 3 SP 7.1.1–7.1.2; bahasa dipermudah
pada aras Tingkatan 1. Modul ini bukan liputan keseluruhan DSKP atau pentaksiran TP.
Rujuk [pemetaan kurikulum](docs/CURRICULUM.md) dan [geometri](docs/GEOMETRY.md).

Piramid mengikut `main/question_bank.h`: satu tapak segi empat sama dan empat
muka segi tiga. Nisbah kuboid ialah 6:4:3, sepadan contoh B3. Contoh tegak sahaja.
Muka rata dilipat dengan transformasi tegar pada rusuk sebenar. Silinder dan kon
menggunakan pembangunan permukaan berterusan yang mengekalkan ukuran intrinsik;
bukan pertukaran gambar atau panel poligon berengsel.

## Struktur pembangunan

| Laluan | Tanggungjawab |
|---|---|
| `src/geometry.mjs` | Geometri, lipatan tegar, pembangunan permukaan dan kamera ortografik |
| `src/renderer.mjs` | Lukisan Canvas 2D bagi model 3D, cahaya dan pemilihan permukaan |
| `src/content.mjs` | Satu sumber versi modul dan penerangan BM |
| `src/lessons.mjs` | Nota, contoh asal, rumus dan pengiraan ukuran yang disahkan |
| `src/lab-geometry.mjs` | Validasi bentangan, bingkai engsel, bahagian luas, isi dan gabungan |
| `src/labs.mjs` | Empat aktiviti, kamera bersama, seretan dan kitar hayat animasi |
| `src/notes.mjs` | Paparan nota, rajah SVG, input ukuran, maklum balas dan navigasi |
| `src/app.mjs` | Kawalan input, animasi, pandangan dan aktiviti pembelajaran |
| `src/index.html`, `src/style.css` | Antara muka dan identiti visual |
| `tools/build.mjs` | Menggabungkan sumber menjadi HTML mandiri |
| `tests/` | Geometri sebenar dan kitar hayat aplikasi daripada HTML keluaran |
| `evidence/` | Output ujian dan screenshot sebenar; lihat manifest |
| `docs/` | Rujukan sumber, kurikulum, geometri dan pengesahan |

Pembangunan memerlukan Node.js, tanpa pakej tambahan:

```sh
cd digital/module
npm run build
npm test
npm run check
```

Build semula sebelum ujian aplikasi kerana ia menjalankan skrip HTML keluaran sebenar.
Untuk sumber modular, gunakan pelayan statik pada folder `src/`. Pengguna akhir
hanya memerlukan fail HTML keluaran. Kod kuiz, skor, analitik dan firmware tidak diubah.
Versi modul bebas daripada permainan Digital dan firmware v1.1.3; asas permainan
branch modul ialah v1.1.0, sementara rujukan remote terkini direkod dalam SOURCE.md. Nombor
modul ialah cadangan branch, bukan pengumuman keluaran main.

## Had sebenar

Permukaan melengkung dilukis melalui 144 jalur licin daripada persamaan analitik.
Itu penghampiran paparan lengkung; pengiraan bentuk dan panjang datang daripada
persamaan asal. Dua tapak silinder dan tapak kon dibuka selepas garis potong
konseptual, dengan satu titik sentuh kekal pada bentangan. Tiada tab gam atau
simulasi ketebalan kertas. Ini penerokaan geometri, bukan pola pemotongan fabrikasi.

Enam pandangan menunjukkan permukaan nampak dan rusuk yang kelihatan; garis rusuk
terlindung dan latihan lukisan pelan/dongakan mengikut skala belum disediakan.
Paparan Canvas mempunyai penerangan teks dan kawalan setara; ia bukan model
sentuhan atau pengganti penuh penerangan guru untuk murid bermasalah penglihatan.
Lihat [pengesahan](docs/VERIFICATION.md) untuk beza ujian sebenar dan simulasi.
Pengesahan tambahan v1.1.0 direkodkan dalam [NOTES_V1_1.md](docs/NOTES_V1_1.md).
Pengiraan menerima bongkah tegak tertutup sahaja. Rajah kalkulator mengikut
ukuran aktiviti; ukuran ini tidak mengubah model 3D ilustrasi.


QA pilihan: `npm run qa` membuka workbench tempatan pada port 4173. Laluan
`/qa.html` memaparkan fail HTML keluaran sebenar dalam iframe 320/390/768/1280px.
Simulasi reduced motion di workbench ialah suntikan dependency untuk ujian sahaja,
bukan perubahan tetapan OS. Borang evidence menerima screenshot daripada pelayar
ujian dan menyimpannya dalam evidence/ tanpa menindih fail. Server ini hanya alat
pembangunan dan tidak dimasukkan ke dalam HTML murid.
