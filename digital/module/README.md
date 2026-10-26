# Modul Pembelajaran GeoDecoder Digital V1

Versi modul: **v1.6.0** (cadangan branch). Sasaran integrasi: **main-digitalized**.

## Dua fungsi pembelajaran v1.6.0

- **Pelan & Dongakan:** model projek dan dua susunan kiub unit, contoh berpandu,
  tiga grid dalam susunan Bab 7, skala 1:1 / 1:2, garis nampak/terlindung/binaan,
  garis/bulatan, koordinat papan kekunci, pilih/padam, Undo dan semakan setiap
  pandangan. Garis terbalik atau dipecah/dicantum diterima; toleransi inklusif
  0.06 cm lukisan. Ini pandangan objek tertutup, berbeza daripada bentangan.
- **Semakan Pengiraan:** murid menulis Rumus → Gantian nilai → Pengiraan → Unit.
  Luas permukaan dan isi padu bagi semua 11 bentuk, bekas terbuka terpilih serta
  dua gabungan. Pilih nilai π dan unit akhir, baca petunjuk khusus, cuba semula
  atau lihat penyelesaian. Input ialah ungkapan matematik terhad, bukan kod.
- Dari nota, **Semak langkah untuk ukuran ini** membawa ukuran dan π kalkulator
  kepada soalan yang sama. **Latih pelan & dongakan** membawa lima bentuk projek
  ke studio. Navigasi umum mengekalkan draf sesi; sesi akaun baharu memadam draf.
- Kedua-duanya ikut bahasa/tetapan induk tanpa menambah skor atau rekod baharu
  kepada empat aktiviti refleksi. Sesi HTML mandiri kekal tanpa storan/rangkaian.

Rujukan: [pemetaan sumber](docs/SOURCES_PELAN_PENGIRAAN.md),
[handoff dan pengesahan v1.6.0](docs/HANDOFF_PELAN_PENGIRAAN_V1_6.md).

## Aktiviti berpandu v1.5.0

Ramalkan → Cuba → Semak → Terangkan menambah refleksi kendiri kepada empat
aktiviti asal. Bentangan menggunakan editor pembaikan kubus; isi padu menggunakan
kiub unit atau tiga tuangan; luas menggunakan lima bongkah tertutup asal; kedua-dua
gabungan disokong. Galeri, studio, perbandingan A/B, bentuk tambahan, bekas dan
rongga terus tersedia sebagai penerokaan, dengan batas latihan dinyatakan pada UI.
Undur edit merangkumi semua mod, termasuk lejar pindahan dan sambungan studio.

Langkah seterusnya berkongsi garis masa easing dengan Main/Jeda/Sambung.
Kamera asal tidak mereset eksperimen. Tema cerah/gelap dan Fokus model disediakan.
Suara ialah pilihan selepas menekan Baca, menggunakan suara dipasang setempat
mengikut bahasa aplikasi (BM/BI); teks sentiasa tersedia jika suara tiada atau
audio dimatikan. Modul mandiri kekal BM dan tanpa storan/rangkaian. Semasa
terbenam, aplikasi induk boleh menyimpan refleksi melalui protokol 1 bertoken sesi.

Butiran sumber, skop dan ujian gabungan: [GUIDED_V1_5.md](docs/GUIDED_V1_5.md).

## Cuba terus

Muat turun **GeoDecoder_Modul_V1.html**, kemudian buka dengan Chrome atau Edge.
Satu fail ini mengandungi semua kod, gaya, kandungan dan geometri. Tiada CDN,
fon, pemasangan, akaun, storan pelayar atau sambungan Internet diperlukan.
Pautan DSKP ialah rujukan pilihan; aktiviti tidak memerlukannya.

- Pilih lima bongkah GeoDecoder atau bentuk tambahan melalui senarai: prisma segi
  tiga/segi lima/segi enam, piramid segi tiga, sfera dan hemisfera. Kesemua 11 bentuk
  mempunyai nota, pengiraan, model serta enam pandangan 2D. Sfera dan hemisfera
  tidak mempunyai bentangan rata tepat; kawalan buka/cantum disembunyikan.
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
  Silinder, kon, sfera dan hemisfera menyediakan pilihan π ≈ 22/7, π ≈ 3.142 atau nilai π penuh.
- Nota turut mengandungi rumus ringkas, penukaran unit, kesilapan lazim dan satu
  contoh bongkah gabungan. Tindakan pada nota membuka model/bentangan/pandangan
  bongkah yang sama. Membaca nota menghentikan gerakan 3D di belakangnya.

Putaran automatik bermula perlahan apabila reduced motion tidak aktif. Ia boleh
dihentikan. Tab tersembunyi menghentikan gerakan dan memerlukan tindakan baharu
untuk bergerak semula. Reduced motion mematikan putaran awal dan peralihan kamera;
animasi pendidikan hanya dimainkan selepas arahan Main/Buka/Cantum daripada murid.
Peluncur sentiasa membolehkan pemerhatian bingkai demi bingkai.

## Makmal interaktif v1.4.0

Pilih **Makmal interaktif**, kemudian pilih aktiviti 01–04:

1. **Bina bentangan:** sembilan bentangan siap, editor petak kubus dan **Studio
   sambungan muka** bagi tujuh poliedron. Ubah muka induk, sisi bukaan dan ukuran
   sambil mengekalkan pasangan rusuk sebenar. Semak sorotan merah jika bertindih.
   Cuba kesemua **11 bentangan kubus**. Cetak A4 / simpan SVG dengan grid 1 cm,
   skala nyata dan palang semakan pembaris; bentangan tidak dikecilkan secara senyap.
2. **Isi padu:** pilih satu atau dua daripada **11 bentuk**. Tetapkan jumlah
   dalam cm³, mL atau L, kemudian tambah ke A, B atau kedua-duanya; penuhkan dan
   pilih isi yang dijumlahkan. Buka **Pindahkan isi A ↔ B** untuk mengambil isi
   sedia ada daripada sumber. Pilih berhenti pada kapasiti atau terus menuang
   dengan limpahan direkod. Baki A + baki B + limpahan kekal sepanjang pindahan.
   Kiub unit dan tiga tuangan padanan bertapak/bertinggi sama turut tersedia.
3. **Terbitkan rumus:** sebelas bongkah, ukuran sebenar, pilihan bahagian luas dan
   rumus keseluruhan. Sfera/hemisfera dipilih pada permukaan melengkung tanpa
   bentangan rata palsu. **Bekas terbuka / bertutup** membandingkan luas dengan
   kapasiti bagi silinder/kuboid nipis. **Rongga tembus** mengira dinding dalam,
   dinding luar, dua bingkai dan isi padu bahan selepas penolakan rongga.
4. **Gabungan:** kubus+piramid dan silinder+kon dengan tapak sepadan. Cantum dahulu,
   kemudian pilih permukaan luar dan semak. Dua permukaan dalaman dikecualikan.

Kelajuan lalai **Perlahan (0.5×)**; pilih Sangat perlahan (0.25×) atau Biasa (1×).
Lipatan/bukaan penuh mengambil 8 saat pada lalai (16 atau 4 saat pada pilihan
lain), satu tuangan 5.2 saat dan cantuman gabungan 3.2 saat. Ada panduan langkah
serta satu butang Jeda/Sambung berdekatan model. Menukar kelajuan mengekalkan
kedudukan semasa. Menukar makmal/keluar bahagian/tab tersembunyi menjeda gerakan;
kembali tidak menyambung automatik. Saiz/bentuk baharu mengosongkan isi bongkah
itu sahaja. Peluncur membolehkan pemerhatian terus tanpa menunggu animasi.

Semua makmal menyediakan kamera seretan, anak panah, zum dan kedudukan asal.
Animasi eksplisit membawa model ke dalam pandangan. Isi yang mengecil ke puncak
menggunakan paras tidak linear yang sepadan dengan isi padu. Simulasi ini
memaparkan paras/isi ideal, bukan aliran bendalir fizikal. Poligon tambahan ialah
contoh tegak dengan tapak sekata, bukan bentangan bentuk bebas sewenang-wenangnya.

Pengesahan terkini: [laporan v1.4.0](docs/LABS_V1_4.md).
Rujukan enam PDF setempat: [indeks sumber](docs/SOURCES_V1_4.md).
Pengesahan integrasi MD: [laporan v1.3.1](docs/INTEGRATION_MD_V1_3_1.md).
Sejarah fungsi v1.3.0: [laporan makmal](docs/LABS_V1_3.md).
Sejarah: [laporan empat makmal v1.2.0](docs/LABS_V1_2.md).

## Kandungan dan matematik

Sifat dan bentangan menyokong DSKP Matematik Tingkatan 2 SP 6.1.1 dan 6.2.1.
Nota meliputi luas permukaan (6.3.1–6.3.2), contoh gabungan dan unit (6.3.3),
serta isi padu (6.4.1–6.4.3) bagi bentuk yang dipilih. Ia menggunakan buku teks
BM/BI Tingkatan 2 Bab 6 dan Tingkatan 3 Bab 7 sahaja, bersama halaman DSKP berkaitan.
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
| `src/design-system.mjs`, `src/design-tokens.css` | Token/ikon utama dan CSS terjana; jangan edit CSS terjana |
| `src/ui.mjs` | DOM/SVG selamat dan label Main/Jeda/Sambung bersama |
| `src/geometry.mjs` | Geometri, lipatan tegar, pembangunan permukaan dan kamera ortografik |
| `src/renderer.mjs` | Lukisan Canvas 2D bagi model 3D, cahaya dan pemilihan permukaan |
| `src/content.mjs` | Satu sumber versi modul dan penerangan BM |
| `src/lessons.mjs` | Nota, contoh asal, rumus dan pengiraan ukuran yang disahkan |
| `src/lab-geometry.mjs` | Validasi bentangan, bingkai engsel, bahagian luas, isi dan gabungan |
| `src/preset-nets.mjs` | Sembilan bentangan sah dan engsel prisma/piramid tambahan |
| `src/learning-mesh.mjs` | Katalog geometri sebelas bentuk, permukaan dan paras sfera |
| `src/volume-transfer.mjs` | Pelan pindahan, baki dan limpahan pada setiap bingkai |
| `src/surface-workshop.mjs` | Bekas terbuka/bertutup dan rongga tembus |
| `src/net-studio-geometry.mjs`, `src/net-studio.mjs` | Sambungan sebenar tujuh poliedron dan 11 net kubus |
| `src/net-print.mjs`, `src/net-tools.css` | SVG/A4 berskala fizikal dan preview luar talian |
| `src/volume-lab.mjs` | Rumus, jumlah pilihan dan geometri isi bagi satu/dua bekas |
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

Paparan bentangan utama menggunakan 144 jalur daripada persamaan analitik;
bekas isi padu menggunakan 96 jalur dan thumbnail pandangan 64 jalur.
Itu penghampiran paparan lengkung; pengiraan bentuk dan panjang datang daripada
persamaan asal. Dua tapak silinder dan tapak kon dibuka selepas garis potong
konseptual, dengan satu titik sentuh kekal pada bentangan. Tiada tab gam atau
simulasi ketebalan kertas. Ini penerokaan geometri, bukan pola pemotongan fabrikasi.

Enam pandangan dalam Teroka menunjukkan permukaan nampak dan rusuk yang kelihatan.
Studio Pelan & Dongakan berasingan menyediakan latihan berskala serta rusuk
terlindung bagi susunan kiub; konvensyen dan batasnya dinyatakan dalam handoff.
Paparan Canvas mempunyai penerangan teks dan kawalan setara; ia bukan model
sentuhan atau pengganti penuh penerangan guru untuk murid bermasalah penglihatan.
Lihat [pengesahan](docs/VERIFICATION.md) untuk beza ujian sebenar dan simulasi.
Pengesahan tambahan v1.1.0 direkodkan dalam [NOTES_V1_1.md](docs/NOTES_V1_1.md).
Kalkulator nota menerima model tertutup; makmal luas juga menyediakan bekas
terbuka nipis dan rongga segi empat tepat tembus. Studio bukan pembina poliedron
sewenang-wenangnya. Cetakan tidak menyediakan tab gam atau jubin berbilang halaman.
Pilih cetakan 100% dan semak palang 1 cm; pencetak fizikal belum diuji.
Sfera/hemisfera ditesselasi untuk paparan: ralat isi mesh <0.4% kapasiti penuh,
bukannya 0.4% isi semasa apabila hampir kosong. Semua nombor menggunakan rumus analitik. Rajah kalkulator mengikut
ukuran aktiviti; ukuran ini tidak mengubah model 3D ilustrasi.


QA pilihan: `npm run qa` membuka workbench tempatan pada port 4173. Laluan
`/qa.html` memaparkan fail HTML keluaran sebenar dalam iframe 320/390/768/1280px.
Simulasi reduced motion di workbench ialah suntikan dependency untuk ujian sahaja,
bukan perubahan tetapan OS. Butang Semak paparan merekod reflow/kawalan; ujian pointer dinyatakan sebagai
simulasi. Tangkapan skrin disimpan berasingan melalui pelayar ujian. Server ini hanya alat
pembangunan dan tidak dimasukkan ke dalam HTML murid.

## Reka bentuk seragam v1.3.1

Token warna, tipografi, ruang, radius, saiz kawalan, ikon dan tempoh animasi datang daripada `src/design-system.mjs`. Semua bahagian berkongsi komponen butang/panel/medan/maklum balas. Teks kecil minimum 12px; kawalan biasa sekurang-kurangnya 44px. Label rajah SVG menggunakan 16px supaya masih 12px pada skrin 320px.

Versi v1.4.0 mengekalkan pembaikan reka bentuk MD v1.3.1. Jeda/sambung mengekalkan garis masa easing sebenar, dan pembingkaian model tetap sepanjang lipatan/cantuman. Kamera boleh dikawal melalui butang arah. Kawalan kembali ke model tersedia selepas panel aktiviti; susun atur kecil menggunakan tatal dokumen biasa.
