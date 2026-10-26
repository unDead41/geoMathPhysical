# Makmal dan nota v1.4.0 — pengesahan

Tarikh: 26 Oktober 2026. Semua perubahan terhad kepada digital/module/.
Sambungan kepada modul v1.3.0 dan reka bentuk MD v1.3.1. Rujukan Git penuh
terkandung dalam SOURCE.md. Pengguna membenarkan digitalize-module serta MD;
main, sharing, digitalize, main-digital dan branch design tidak diterbitkan semula.

## Hasil lima penambahbaikan

1. Sebelas bentuk: lima projek, tiga prisma sekata, piramid bertapak segi tiga,
   sfera dan hemisfera. Nota, contoh asal, rajah ukuran, kalkulator, model dan
   enam pandangan disediakan bagi semuanya. Katalog ini berasingan daripada kuiz.
2. Tambah jumlah positif cm³/mL/L pada A/B/kedua-duanya. Pindahan A↔B mengambil
   isi sumber, mengisi ruang penerima dahulu, kemudian merekod limpahan jika
   dipilih. Ledger mengira A+B+limpahan; checkbox jumlah tidak mengubahnya.
3. Bekas nipis terbuka/bertutup silinder/kuboid dan rongga segi empat tepat tembus.
   Luas dinding dalam dimasukkan; isi padu bahan menolak rongga. Label kapasiti
   berasingan daripada isi bahan. Tiada peluncur bentangan palsu bagi mod ini.
4. Studio tujuh poliedron dengan rusuk/muka asal, edit induk/sisi bukaan/ukuran,
   sorotan pertindihan dan 11 net kubus unik. SVG/A4 menggunakan mm sebenar,
   grid10mm, palang10mm dan penolakan layout yang melebihi ruang A4.
5. Sfera dan hemisfera mengekalkan model melengkung tanpa bentangan rata palsu.
   Hemisfera membezakan luas lengkung2πj² daripada jumlah tertutup3πj².

Reka bentuk token/ikon/widget MD dipelihara. Lima pilihan utama kekal mudah
mencapai; enam tambahan dalam select native. Animasi lalai0.5×, boleh0.25×/1×;
easing, sasaran, jeda/sambung dan framing stabil dipelihara selepas integrasi.
Makmal tidak memberi markah atau menulis analitik/storan.

## Ujian yang benar-benar dijalankan

| Pengesahan | Hasil |
|---|---|
| node --test tests/*.test.mjs, pada kod serta HTML keluaran sebenar | **215/215 PASS**,0skip |
| build + check | PASS; IIFE mandiri, tiada import/runtime network/storan/CDN, versi1.4.0, token/ikon/kontras |
| python tools/check_version.py | PASS; firmware/README/changelog repo kekalv1.1.3 |
| git diff --check | PASS |
| Pelayar Chromium,11nota dan66pilihan pandangan | Semua menunjukkan bentuk/nilai yang sepadan |
| Studio tujuh poliedron dan11net kubus | Sah; contoh pertindihan menandakan invalid dan menyekat cetak |
| Reflow20kes pada320/390/768/1280px | Tiada overflow luar jadual, teks kecil atau sasaran biasa<44px menurut fixture |
| Bekas silinder j3,t4; penutup dibuka | Luas131.95→103.67cm²; kapasiti113.1cm³ kekal |
| Rongga luar6×5×4, bukaan2×1.5 | Luas170cm²; isi bahan108cm³ |
| Pindahan27cm³, sumber27, penerima24 | A0+B24+limpahan3=27cm³ |

TAP, binaan, checker, reflow, studio, nota, transfer, sumber dan manifest terdapat
pada evidence/extended-v1.4-*. Screenshot ialah tangkapan pelayar sebenar; tiada
imej geometri rekaan atau komposit. Paparan studio50% datang daripada peluncur
sebenar. Laporan sourcebook memberi julat dua bab dan SHA-256 keenam-enam PDF.

Semakan bebas menggunakan dua ejen maksimum. Reviewer menguji3072senario
pindahan×6bingkai (ralat pemuliharaan maksimum2.85×10⁻¹⁴), rongga nipis/tinggi
serta paras sfera. Arah penutup mesh isi diperbetulkan ke+y, dan polygon
sempadan degenerat dibuang. Ujian volum bertanda kini mengawal regresi itu.

Audit premium statik menghasilkan75findings `affordance.actionless-button`:
penghurainya tidak mengikuti binding modul luaran/dinamik. Semua75bukan dakwaan
PASS auditor. Ujian runtime sedia ada memeriksa setiap butang literal selepas
lazy-init; ujian baharu menjalankan studio, bekas, unit dan pindahan sebenar.
Tiada jenis finding lain dalam audit itu. Log metadata sambungan Chrome
dikecualikan daripada laporan ralat modul.

## Ketepatan dan batas sebenar

- Nombor menggunakan rumus analitik dan dibundarkan hanya untuk paparan. Mesh
  bulatan/sfera ialah tessellation. Sfera/hemi: ralat isi mesh<0.4% **kapasiti
  penuh**, bukan0.4% isi semasa apabila hampir kosong. Luas silinder144jalur
  berbeza<0.018% daripada analitik. Sfera tidak boleh diratakan tanpa ubah metrik.
- Ini isi ideal dan perubahan paras, bukan simulasi aliran bendalir fizikal.
  Studio terhad tujuh poliedron tegak/sekata, bukan pembina bentuk bebas.
- Cetakan satu A4 tanpa tab gam atau jubin; pilih100% dan semak palang dengan
  pembaris. Pratonton/struktur SVG disahkan. Pencetak fizikal dan dialog PDF
  native belum diuji. Percubaan muat turun Blob SVG pada pelayar terkawal tamat
  masa menunggu event; penyempurnaan fail muat turun OS tidak didakwa lulus.
- Ujian pelayar melalui HTTP, bukan native file:// (laluan itu disekat oleh
  persekitaran). Analisis mandiri mengesahkan semua dependency dibenamkan;
  HTML disediakan untuk cubaan terus oleh pengguna. Edge belum diuji secara
  berasingan. Viewport telefon ialah iframeCSS; sentuhan fizikal/screenreader
  dan tetapan reduced motion OS belum diuji. Fixture reduced motion ialah suntikan
  dependency. Tiada dakwaan60fps atau rakaman video; bukti ialah screenshot.
- Hanya Tingkatan2Bab6 dan Tingkatan3Bab7 digunakan; latihan formal pelan/dongakan
  berskala/garis terlindung dan seluruh DSKP belum diliputi. Bukan pentaksiran TP.

HTML akhir: 279057bytes; SHA-256
`ca4db77cea20b86a2e4606b13ac8750aab46dd384a03fb000de6d05eac94adc9`.
