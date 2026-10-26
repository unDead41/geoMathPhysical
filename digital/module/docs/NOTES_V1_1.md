# Pengesahan nota pembelajaran v1.1.0

Tarikh: 26 Oktober 2026 (Malaysia). Branch: digitalize-module.
Asas sambungan kerja: 3dde97e6c203012cf9e92c6e5cb86f9820f2ad97 (modul v1.0.0).
Laporan v1.0.0 dan 21 screenshot terdahulu dikekalkan sebagai bukti sejarah.

## Hasil

Nota boleh dipilih bersama Teroka 3D. Lima pilihan bongkah mengemas kini nota,
rumus, simbol, kesilapan lazim, dua contoh asal dan aktiviti ukuran. Empat langkah
contoh didedahkan melalui details native. Nota sifat turut membandingkan lima
bongkah. Luas permukaan dan isi padu dijelaskan sebagai kuantiti berbeza.

Kalkulator menerima cm dalam julat 0.1–1000 dan koma/titik perpuluhan. Ia
membezakan jejari daripada diameter serta t daripada s, memberikan pecahan
jumlah luas, dan menolak input kosong, negatif, sifar, bukan nombor atau di luar
julat. Keputusan lama dibuang ketika input salah. Submit memfokuskan input
pertama yang salah; ralat dikaitkan dengan aria-describedby/aria-invalid.
Isi padu positif di bawah 0.01 dipaparkan sebagai < 0.01 cm³, bukannya 0 cm³.
Ukuran penuh digunakan sebelum pembundaran. Pi = Math.PI ialah nilai numerik
penuh JS; pilihan 22/7 dan 3.142 dinyatakan sebagai anggaran.

Rajah SVG mengikut nisbah ukuran aktiviti. Bagi piramid/kon, keratan rentas
berlabel menunjukkan sudut tegak, t, s, dan a/2 atau j. Ini berasingan daripada
model 3D ilustrasi. Perubahan ukuran kalkulator tidak mengubah model 3D utama.

## Matematik yang disemak

| Bongkah dan ukuran contoh | Luas tertutup | Isi padu | Semakan khas |
|---|---:|---:|---|
| Kubus a = 4 | 96 cm² | 64 cm³ | Enam muka sama |
| Kuboid p = 6, l = 4, t = 3 | 108 cm² | 72 cm³ | Tiga pasang muka |
| Piramid a = 6, t = 4 | 96 cm² | 48 cm³ | s = 5 daripada a/2 = 3 |
| Silinder j = 7, t = 10, π ≈ 22/7 | 748 cm² | 1540 cm³ | Dua tapak + permukaan melengkung |
| Kon j = 3, t = 4, π ≈ 22/7 | 75.43 cm² | 37.71 cm³ | s = 5; nilai tepat 24π dan 12π |

Contoh gabungan: kubus bersisi 6 + piramid sisi tapak 6, tinggi 4, s = 5.
Luas luar 240 cm² mengecualikan kedua-dua muka yang bertemu. Isi padu
216 + 48 = 264 cm³ = 264 mL = 0.264 L. Nota unit meliputi m/cm, m²/cm²,
m³/cm³ dan L/mL. Formula tertumpu pada bongkah tegak tertutup.

## Ujian automatik

67/67 lulus: 33 geometri, 2 renderer, 17 kitar hayat/paparan aplikasi dan
15 nota/pengiraan. Skrip aplikasi yang diuji ialah skrip HTML keluaran sebenar,
dengan adapter DOM minimum. Adapter ini bukan pelayar atau simulasi sentuhan.
Geometri dan penukaran kamera diuji daripada fungsi sumber sebenar.

- Build satu HTML: lulus, tanpa pakej tambahan.
- Semakan syntax, ID, versi, CSP, tiada import/permintaan/storan runtime: lulus.
- `python tools/check_version.py`: lulus, firmware kekal v1.1.3.
- Log penuh: ../evidence/notes-v1.1-tests.tap.

Ujian baharu meliputi kesemua rumus, jumlah bahagian luas, tinggi sendeng,
hubungan satu pertiga, penskalaan panjang (luas ×4/isi padu ×8), tiga mod π,
sempadan ukuran, validasi, koma perpuluhan, contoh gabungan, reset,
pengekalan input ketika kembali dari 3D, fokus ralat, navigasi nota dan
penghentian requestAnimationFrame semasa nota dibuka.

## Semakan pelayar sebenar

Chrome cloud, HTML yang sama melalui pelayan pratonton HTTP. Kandungan,
rumus dan pengiraan default lima bongkah disahkan pada DOM serta paparan.
Contoh luas dan isi padu piramid/kon dibuka. Pilihan π diuji, 3,5 diterima,
0 ditolak, jawapan dikosongkan, fokus ralat dan butang nombor contoh disemak.
Butang nota → bentangan kon mencapai 100% terbuka. Nota → pandangan atas
menutupnya kepada 0%, mod ortografik dan pilihan atas aktif.

Viewport iframe sebenar 320/390/768px menguji breakpoint CSS keluaran.
Client width / scroll width selepas pembaikan: 310/310, 380/380, 758/758
(10px dikhaskan untuk scrollbar). Jadual mempunyai scroll dalam bekasnya,
bukan overflow mendatar halaman. Screenshot telefon menyertakan workbench
QA supaya kaedah viewport dapat dikenal pasti. Ini bukan peranti telefon fizikal.

Tiga screenshot JPEG sebenar direkodkan dalam ../evidence/notes-v1.1-browser.json.
Tiada imej janaan. Log browser yang disemak tidak menunjukkan ralat aplikasi;
ralat metadata chrome-extension berasal daripada sambungan pelayar.

## Had dan perkara yang belum diuji

- Cold-open file:// disekat polisi browser ujian. Keserasian satu HTML diperiksa
  secara statik dan dalam pelayar HTTP; buka fail tempatan sebenar masih perlu
  dicuba oleh pengguna. Tiada import ES module/CDN/font/runtime network.
- Edge, sentuhan fizikal, OS reduced motion sebenar dan screen reader belum
  diuji. Reduced motion dan fokus ralat mempunyai ujian adapter; jangan anggap
  ia bukti aksesibiliti peranti sebenar.
- Skop bukan seluruh Bab 6: sfera/prisma lain dan semua jenis masalah tidak
  diliputi. Tiada penggredan tahap penguasaan atau dakwaan kelulusan KPM.
- Kalkulator bukan penjana bentangan berskala atau alat fabrikasi.
- Laporan audit UI regex v1.0.0 ialah bukti sejarah; ia tidak dijalankan semula
  sebagai pensijilan nota ini. Pengesahan fungsi baharu datang daripada ujian
  aplikasi, pengiraan dan semakan pelayar yang dinyatakan di atas.

Semua perubahan berada di digital/module/. Kuiz, skor, analitik dan firmware
tidak diubah. Rujukan asal dan SHA diperincikan dalam SOURCE.md.

