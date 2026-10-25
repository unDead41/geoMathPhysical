# Modul Pembelajaran GeoDecoder Digital V1

Versi modul: **v1.1.0**. Branch kerja: **digitalize-module**.

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
Versi modul bebas daripada permainan Digital v1.1.0 dan firmware v1.1.3; nombor
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
