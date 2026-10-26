# Serahan Pusat Bantuan & Lapor Masalah

26 Oktober 2026, Malaysia. Branch `digitalized-utility-help-support`.
Asas remote disemak semula: `main-digitalized`
`790d989d666e64f3beabb507cd4140b832696367`, Digital v2.6.0.
Cadangan Digital v2.7.0; modul v1.5.0 dan firmware v1.1.3 kekal.
Branch hasil belum wujud pada semakan exact-ref sebelum push.

## Perubahan

Satu Pusat Bantuan BM/English melalui header (termasuk Home, akaun dan
permainan), Tetapan serta bridge modul. Tujuh panduan tugas berdasarkan kod
sebenar, dengan tutorial tiga langkah dan panduan modul asal boleh dibuka
semula. Tiada navigasi skrin atau reload iframe untuk membuka bantuan.

Borang mengumpul kategori, penerangan, langkah, jangkaan dan hasil sebenar.
Pratonton teks yang sama digunakan oleh salin dan muat turun TXT. Clipboard
atau muat turun yang gagal mempunyai alternatif pilih teks dan arahan manual.
Draf kekal dalam memori tab. Tiada penghantaran automatik atau backend baharu.
Konteks automatik diproyeksikan semula melalui allowlist pada export boundary;
medan bebas mempunyai redaksi pola rahsia lazim tetapi pengguna tetap perlu
menyemak kandungan. Lihat HELP_SUPPORT_AUDIT.md untuk kontrak dan polisi masa.

## Bukti pengesahan

- `node --test --test-force-exit --test-concurrency=1 tests/*.test.mjs`:
  **256 lulus, 0 gagal**. Force-exit diperlukan kerana pemegang timer dalam
  suite gabungan; semua fail ujian selesai dan ringkasan runner disemak.
- Suite modul: **232 lulus, 0 gagal**.
- Regresi navigation selepas dropdown animasi diselaraskan: **1/1 lulus**.
  Fixture kelas teacher/student, semakan kelas, semakan satu soalan dan
  ralat sambungan kelas turut lulus selepas fixture read-only menyokong
  bacaan geo_module_progress. Tiada perubahan runtime diperlukan.
- `node tests/help-support.browser.mjs`: **7 senario lulus** dalam Chromium
  153.0.8010.0. Resit: `help-support-evidence/acceptance/browser-results.json`.
- Telefon 390px BM/English, desktop 1365px, serta 320px/dark/150% diuji;
  papan kekunci, focus trap/Escape, validasi teks panjang, salin ditolak,
  byte fail muat turun dan tiada overflow diperiksa.
- Offline standalone dengan storan ditolak: R1, R2, hint, pilihan kad,
  skor dan susunan kekal. Jam solo dijeda. Sifar permintaan HTTP.
- Modul: iframe sama, prediction dan tab makmal kekal; panduan asal dibuka
  melalui bridge. Mesej asing/stale/origin/instance salah ditolak oleh unit test.
- Kelas/Duel: jam terus berjalan dan keadaan jawapan/hint/pilihan kekal.
  Semua transport dipintas; tiada akaun, room, match atau laporan sebenar dibuat.
- `npm run build`, `npm run prepare:pages`, `npm run check`: lulus.
  prepare:pages hanya menyediakan fail tempatan, bukan deployment.
- `python tools/check_version.py`: lulus, firmware v1.1.3 selaras.

Ujian pelayar menggunakan emulasi Chromium; bukan pengesahan telefon fizikal
atau Safari. Screenshot telefon dan desktop disertakan dalam folder acceptance.

## Backend Master

Tiada endpoint laporan yang sesuai dalam asas ini. Fungsi portal `report(error)`
ialah callback ralat UI, bukan kontrak simpan laporan. Jangan menghubungkan
borang ini kepada geo_action atau Duel tanpa kontrak khusus.

Sediakan payload schema berversi dengan allowlist konteks yang sama, kategori
serta had panjang dalam support-report.mjs; polisi akses/rate limit, retention,
persetujuan submit, dan respons ID selepas simpan berjaya. Bezakan validation,
network failure dan kejayaan. Jangan hantar credential, jawapan, PIN, nama
kelas, email, lawan atau dump storan. Salin/muat turun perlu terus berfungsi
tanpa endpoint. Utility ini tidak menghantar email, issue atau laporan sebenar.

## Integrasi

Gabungkan branch hasil melalui chat integrasi setelah semakan. Versi v2.7.0
ialah cadangan; semak nombor main-digitalized semula sewaktu integrasi serentak.
Tiada branch lain diubah, tiada migration hosted dan tiada Pages diterbitkan.
