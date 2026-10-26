# Pengesahan empat makmal v1.2.0

Tarikh: 26 Oktober 2026 (Malaysia). Branch kerja: digitalize-module.
Asas: 92c12c3a07ec250c03a73decaf52a654fc26d502, modul v1.1.0.
Semua perubahan berada di digital/module/; tiada perubahan peraturan kuiz,
markah, analitik, pangkalan data, firmware atau GPIO.

## Fungsi yang dibina

| Aktiviti | Fungsi sebenar | Had skop |
|---|---|---|
| Bina bentangan | Grid 6×6, klik tambah/buang, seret pindah, pilih muka + butang arah, lipat/buka, jeda/sambung, peluncur, validasi sambungan/pertindihan | Bina sendiri ialah kubus sahaja; maksimum 6 muka |
| Isi padu | Kiub unit, satu lapisan, penuh/kosong, ubah ukuran; tiga pemindahan kon/piramid kepada penerima sepadan, isi semula, reset | Kiub unit: integer 1–6 cm, maksimum 216 kiub; perbandingan: 1–8 cm |
| Terbitkan rumus | Lima bongkah, ubah ukuran mesh sebenar, buka/cantum, pilih setiap permukaan, jumlah bahagian, rumus selepas lengkap | Ukuran integer 1–10 cm, bongkah tegak tertutup |
| Gabungan | Kubus+piramid dan silinder+kon, tapak sepadan, cantum/pisah, ubah ukuran, pilih permukaan luar, pembetulan tanpa markah, jumlah isi padu | Dua jenis cantuman penuh; bukan boolean sewenang-wenangnya |

Satu kamera dikongsi oleh semua makmal, dengan seretan, anak panah, zum dan
kedudukan asal. Paparan custom menggunakan fit ortografik yang seragam pada
kedua-dua paksi, supaya adegan dua bekas menggunakan lebar pentas tanpa herotan.
Pembukaan silinder/kon menggunakan pembangunan analitik sedia ada dengan ukuran
pilihan, bukan panel poligon berengsel. Dimensi canonical asal tidak dimutasi.

## Ketepatan matematik

- Semua 35 heksomino bebas dijana secara exhaustive di dalam ujian. Tepat 11
  dikelaskan sebagai bentangan kubus sah. Enam muka mesti bersambung pada sisi
  dan menghasilkan enam normal akhir yang berlainan.
- Setiap muka kekal berluas 1 dan mempunyai empat sisi panjang 1 pada bingkai
  0, 0.1, 0.4, 0.7 dan 1. Dua hujung setiap engsel ibu-anak sentiasa bertepatan.
- Susunan berkitar seperti segi empat tepat 2×3 mempunyai lebih lima sambungan.
  Pratonton mengekalkan lima engsel dan menandakan potongan tambahan dengan
  garis putus-putus serta penerangan. Ia tidak mendakwa seluruh helaian tanpa
  potongan boleh mengikut lipatan itu. Susunan masih ditolak kerana pertindihan.
- Bahagian luas setiap lima bongkah sepadan dengan rumus analitik. Luas mesh
  pada bingkai pembukaan pertengahan sepadan dengan toleransi tessellation 0.1%.
- Perbandingan kon/silinder dan piramid/prisma menggunakan luas tapak dan tinggi
  tegak yang sama. Isi penerima selepas satu/dua/tiga tuangan ialah 1/3, 2/3, 1.
  Aras dalam sumber yang mengecil ke puncak dikira secara tidak linear.
- Jumlah isi sumber + penerima kekal pada setiap bingkai sampel. Isi mesh cecair
  yang benar-benar dilukis diperiksa secara tetrahedron, bebas daripada fungsi
  paras; toleransi lengkung 0.2%. Piramid menggunakan permukaan satah tepat.
- Kubus sisi 6 + piramid sisi 6, tinggi 4, s=5: luas luar 240 cm², isi padu 264 cm³.
  Silinder j=3/h=6 + kon j=3/t=4/s=5: luas luar 60π ≈188.50 cm²,
  isi padu 66π ≈207.35 cm³. Kedua-dua muka bersama dikecualikan daripada luas.
- Makmal menggunakan Math.PI; paparan dibundarkan hingga 2 tempat perpuluhan.
  Jumlah menggunakan nilai penuh sebelum pembundaran. Nota v1.1.0 masih
  mempunyai pilihan π sendiri; beza anggaran dinyatakan pada kedua-dua bahagian.

## Ujian automatik dan sumber

**100/100 lulus:** 33 geometri asal, 15 nota, 19 matematik makmal, 30 aplikasi dan
3 renderer. Ujian aplikasi menjalankan skrip HTML keluaran sebenar dengan adapter
DOM minimum. Adapter itu bukan bukti pelayar, OS atau sentuhan sebenar.

- Build: node tools/build.mjs, satu HTML mandiri; tiada pakej runtime/CDN/font.
- Suite penuh: node --test --test-reporter=tap tests/*.test.mjs.
- Semakan mandiri: node tools/check.mjs, syntax/ID/versi/CSP/tiada rangkaian atau storan.
- Checker repo: python tools/check_version.py, firmware kekal v1.1.3.
- Git diff whitespace dan skop hanya digital/module/ disemak sebelum penerbitan.
- Log suite penuh: ../evidence/labs-v1.2-tests.tap.

Ujian meliputi pause/resume, perubahan makmal, membuka nota, tab tersembunyi,
perubahan pilihan reduced motion, input ukuran, kapasiti, reset, akhir tuangan,
pemilihan luar betul/salah, pemulihan fokus grid/permukaan, serta binding sebenar
bagi semua butang literal selepas bahagian lazy dibuka. Renderer mengekalkan
label melengkung dan menguji fit adegan lebar tanpa menukar nisbah geometri.

## Semakan pelayar sebenar

Chrome cloud, HTML melalui HTTP pratonton. Aliran yang disemak:

- Lipatan kubus sah sampai 100%, contoh bertindih, grid kosong dan seretan muka
  sebenar dari petak (1,0) ke (0,0): muka berpindah dan kiraan kekal enam.
- Kiub unit 18/18 (3×2×3); maksimum 216/216 (6×6×6).
- Tiga tuangan kon dan tiga tuangan piramid: 33.33%, 66.67%, 100%, dengan isi
  semula antara tuangan. Penghantaran tambahan selepas penuh disekat.
- Lima bongkah pada makmal luas: 96, 108, 96, 747.70 dan 75.40 cm² dengan π penuh;
  pilihan permukaan, rumus dan bentangan silinder sampai 100% diperiksa.
- Cantuman kubus+piramid: 240/264, jawapan luar betul dan salah. Silinder+kon:
  188.50/207.35. Animasi cantuman dan pemilihan kumpulan disemak.
- Semua empat makmal pada iframe 320, 390 dan 768px: client/scroll width
  masing-masing 310/310, 380/380, 758/758; 10px ialah gutter scrollbar.
- Reduced motion: suntikan matchMedia pada workbench QA sahaja, bukan tetapan OS.
  Gerakan awal dimatikan; playback eksplisit masih dibenarkan. Pause memegang
  nilai progress yang sama pada dua bacaan berasingan, kemudian keluar bahagian.
- Log yang diperiksa tidak menunjukkan ralat aplikasi. Log metadata extension
  Chrome dikecualikan. Beberapa deadline automasi bacaan sekitar 3 saat tamat
  ketika animasi hampir selesai; bacaan DOM berikutnya mengesahkan keadaan akhir.

Screenshot JPEG sebenar, hash dan saiz direkodkan dalam manifest browser.
Tiada imej janaan atau pengubahan imej. Workbench kelihatan pada screenshot
iframe supaya kaedah ujian telefon/tablet dapat dikenal pasti.

## Pembaikan peluncur yang ditemui dalam pelayar

Tetikus pada track tidak mengekalkan nilai baharu kerana stop() menyegarkan
paparan sebelum handler membaca nilai input. Ujian baharu mereproduksi kegagalan
0.081 berbanding 0.37. Handler kini membaca input dahulu, kemudian menghentikan
playback. Suite penuh meningkat kepada 100 ujian lulus. Pelayar sebenar mengesahkan
klik tengah track menghasilkan value 500/progress 0.5; End menghasilkan progress 1
untuk makmal luas dan gabungan. Screenshot selepas pembaikan disertakan berasingan.
Screenshot aliran lain diambil semasa pengesahan v1.2.0; pembaikan urutan bacaan ini
tidak mengubah geometri atau keadaan pegun yang ditunjukkannya.

## Audit UI

Native Select/Listbox direkodkan sebagai keputusan canonical dalam UX-CONTRACT.md
serta premium-ui.json. Semua pilihan adalah set kecil dan statik; popup ialah
milik pelayar/OS. Pemilihan native dan kawalan papan kekunci diuji; popup platform
itu sendiri tidak digayakan atau dianggap widget authored.

Auditor strict disimpan sebagai bukti mentah. Ia tinggal 58 amaran/error
`affordance.actionless-button`, kerana regex hanya mengenali onclick/@click
inline dan tidak memahami addEventListener atau LearningLabs.bind. Ini false
positive yang disemak melalui kod auditor, binding actual shipped script dan
ujian fungsi. Tiada butang palsu/handler kosong/disabled ditambah untuk menutup
laporan. Jangan mendakwa auditor strict lulus sepenuhnya. DESIGN.md lint lulus
(rujuk log untuk amaran token bukan blocking). Tiada API native dialogs,
innerHTML, fetch atau storan pada sumber runtime modul.

## Batasan sebenar

- Fail satu HTML disemak secara statik dan melalui HTTP. Browser ujian menyekat
  protokol file://; cold-open fail tempatan sebenar belum disahkan.
- Edge, sentuhan fizikal, screen reader dan reduced motion OS sebenar belum diuji.
  Seretan tetikus dan alternatif keyboard/button sudah disemak.
- Cecair divisualkan melalui perubahan paras/isi; tiada simulasi aliran bendalir
  atau animasi bekas dituang secara fizikal. Pengiraan menganggap tiada tumpahan.
- Lengkung ialah tessellation untuk lukisan. Tiada tab gam, ketebalan kertas,
  eksport bentangan berskala atau pengesanan pelanggaran kertas pada setiap
  bingkai pertengahan. Validasi kubus merujuk kepada penutupan akhir.
- Tiada dakwaan FPS terukur atau prestasi peranti telefon sebenar.
- Tiada skor, gred TP, akaun, simpanan kemajuan, API guru atau analitik ditambah.
