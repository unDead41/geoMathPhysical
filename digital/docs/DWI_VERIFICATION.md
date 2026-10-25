# Pengesahan GeoDecoder Digital BM/BI v1.1.0

Tarikh: 25 Oktober 2026 (Malaysia). Branch: `digital-dwi`.
Asas: `digitalize` / `cd47ebd7dbcbab709b9f61a2122f7492f2b74113`.
Firmware rujukan: v1.1.3 / `a059979d97926b82cafd4aa5cf3fe59da04a55bb`.
SHA penerbitan sebenar perlu dibaca daripada commit yang mengandungi laporan
ini; nombor SHA sendiri tidak dibenamkan secara berulang dalam kandungannya.

## Hasil ujian

| Semakan sebenar | Hasil |
|---|---|
| `npm test` dalam `digital/` | **34/34 PASS**: 25 kes asas + 7 bahasa/CSV + 2 pemformatan |
| Pemilihan pusingan asas | 500 seed; 10 ID unik dan tepat dua soalan setiap bongkah |
| Simulasi engine asas | 100 pusingan lengkap menggunakan engine sebenar |
| `npm run standalone` | HTML tunggal dibina daripada sumber modular, tanpa dependency rangkaian |
| `npm run check` | PASS: sintaks HTML/JS tunggal, 67 ID unik, ARIA, key BM/BI, semua 15 soalan, sumber bank, versi, token reka bentuk dan pariti HTML |
| `python tools/check_version.py` | PASS: firmware v1.1.3 = README root = CHANGELOG root |
| `git diff --check` | PASS |
| Chrome sebenar melalui Playwright | **8/8 senario PASS**, tiada runtime error |

Ujian pelayar menggunakan Chromium headless pada desktop Linux, dependency
Playwright yang telah disediakan runtime dan executable Chromium setempat.
Runner boleh dijalankan semula menggunakan `npm run test:browser`; parameter
`PLAYWRIGHT_MODULE_PATH` / `PLAYWRIGHT_CHROMIUM_PATH` membolehkan lokasi runtime
berbeza tanpa dependency produksi baharu.

## Lapan senario pelayar

1. Default BM, satu pemilih bahasa dan skrin mula English.
2. Ralat pendaftaran bertukar bahasa tanpa mengosongkan nama/kelas.
3. Kad terpilih, order semua pilihan, R1 diterima dan hint terbuka kekal;
   salah R2 diterjemah dengan betul selepas bertukar bahasa.
4. Dialog jeda, panduan, papan skor dan keluar diterjemah; masa kekal dijeda.
5. Pusingan penuh dengan satu cubaan salah: 10/10, first try 9/10, satu hint,
   satu kesilapan. Pertukaran bahasa keputusan tidak menyimpan skor dua kali.
   Jadual 12 skor boleh diperluas tanpa mengecil selepas tukar bahasa;
   CSV dimuat turun dan dialog padam diterjemah.
6. BM/BI pada lebar 320 dan 390 piksel tidak melimpah secara mendatar;
   teks pilihan bahasa penuh muat. Skrin permainan telefon juga diperiksa.
7. HTML sebenar dibuka melalui `file://` dalam context rangkaian offline;
   pendaftaran dan 10 pilihan permainan muncul, tanpa permintaan HTTP.
8. `localStorage` ditolak dengan SecurityError: English, notis storan dan
   permulaan permainan masih berfungsi dalam sesi.

## Pembetulan yang dibuktikan

- RED → GREEN bagi preference bahasa, 15 pasangan kandungan/rumus dan rekod
  skor lama/baharu. ID kategori tersimpan kekal walaupun label CSV berubah.
- RED → GREEN bagi pemformat matematik: penggantian global `pi` merosakkan
  perkataan `tepi` / `overlapping`. Kini hanya token `pi` ditukar kepada π;
  markup pengguna masih di-escape. Dua ujian khusus ditambah.
- RED → GREEN bagi mesej kad terpilih: parameter jenis kad asal menyimpan
  bahasa lama. Kini status menyimpan ID mesej/jenis kad dan menterjemahnya semula.
- RED → GREEN bagi overflow telefon: grid latar yang ditransform melebarkan
  halaman. Had grid dibetulkan; label bahasa juga diperiksa, bukan lebar halaman sahaja.
- Ujian HTML offline mengesan alias import pemformat yang hilang ketika
  penggabungan. Binding kini dinyatakan dalam sumber supaya modular dan HTML
  tunggal menjalankan fungsi yang sama; senario offline akhir lulus.

## Semakan bebas dan keputusan

Seorang reviewer bebas membaca diff, sumber bahasa, kontrak keadaan, ujian dan
contoh screenshot secara read-only, serta mengulangi 32 ujian sebelum dua ujian
pemformat ditambah. Satu isu Important (pemformat `pi`) dan dua pemerhatian
paparan (nama bahasa terpotong, sublabel edisi BM) dibetulkan. Pengesahan akhir
34/34 dan 8/8 dijalankan oleh pelaksana selepas pembetulan. Tiada isu ditangguh.

Reviewer tidak mengesahkan penerbitan remote, rujukan kurikulum secara bebas,
browser lain atau rebuild akhir; pelaksana mengesahkan sumber, pariti HTML dan
ref remote secara berasingan. [Rekod rujukan](DWI_LANGUAGE.md) membezakan hos
mirror daripada KPM dan menyatakan had pengesahan tahun cetakan.

## Bukti paparan sebenar

Semua gambar di bawah ialah screenshot aplikasi dalam Chrome, bukan mockup.

| Paparan | BM | English |
|---|---|---|
| Mula desktop | [welcome-bm.png](dwi-evidence/welcome-bm.png) | [welcome-en.png](dwi-evidence/welcome-en.png) |
| Permainan desktop | [game-bm.png](dwi-evidence/game-bm.png) | [game-en.png](dwi-evidence/game-en.png) |
| Keputusan dan semakan | [result-bm.png](dwi-evidence/result-bm.png) | [result-en.png](dwi-evidence/result-en.png) |
| Mula telefon 390px | [mobile-bm.png](dwi-evidence/mobile-bm.png) | [mobile-en.png](dwi-evidence/mobile-en.png) |
| Permainan telefon 390px | [mobile-game-bm.png](dwi-evidence/mobile-game-bm.png) | [mobile-game-en.png](dwi-evidence/mobile-game-en.png) |

## Had pengesahan

Tiada ujian peranti sentuh fizikal, Safari, Firefox, pembaca skrin sebenar,
USB/ESP32 atau perkakasan. Paparan telefon ialah viewport Chrome.
Kandungan bahasa disemak terhadap dokumen KSSM/DSKP yang direkodkan; tahun
edisi rasmi terbaharu belum disahkan terus daripada hos BPK.

Tiada perkakasan, UID/NVS, firmware, peraturan kuiz atau branch modul/audio
diubah. Kelemahan analitik baharu dan peraturan satu percubaan daripada chat
lain tidak digabungkan secara tersirat.
