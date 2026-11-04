# Panduan pembangun GeoMath App

Skop fail ini: pakej persediaan app dan, apabila diarahkan, folder
`apps/geomath_flutter/`. Arahan pengguna terkini mengatasi cadangan dokumen.
Jangan menggantikan AGENTS repository akar dengan fail ini.

## Sebelum menulis kod

1. Baca README, SOR, SOURCES_AND_STATUS, ARCHITECTURE dan kontrak berkaitan.
2. Semak working tree, remote, branch dan SHA semasa. Gunakan checkout/worktree
   sendiri. Jangan menukar checkout, membuang perubahan atau reset kerja chat lain.
3. Cadangan branch ialah `app/flutter-foundation`; ia **belum dicipta** oleh pakej ini.
   Gunakan nama lain jika pengguna menetapkannya. Rekod base SHA penuh.
4. Jangan menganggap `main` ialah aplikasi Digital. `main` ialah firmware;
   `main-digitalized` ialah integrasi Digital. Semak branch offline, CRUD,
   scaling dan UI sebelum menetapkan asas app.
5. Jangan merge semua branch secara membuta tuli. Pemilik bersama seperti
   `cloud.mjs`, `module-progress.mjs` dan composition hooks memerlukan gabungan
   sumber, semakan kontrak dan ujian semula.

## Pemilikan fail cadangan

- Kerja app: `apps/geomath_flutter/**`.
- Pengeksport bank/aset: cadangan `digital/tools/export-mobile-contracts.mjs`;
  perubahan pada fail bersama ini memerlukan penyelarasan pemilik Digital.
- Renderer, parser, geometri dan bank soalan canonical kekal pada sumber Digital.
  Jangan cipta semula daripada gambar atau ingatan.
- Token UI app mempunyai satu pemilik. Palet muka geometri mempunyai pemilik
  berasingan dan adapter berdasarkan ID muka stabil, bukan kedudukan kamera.
- Jangan mengubah firmware, UID/NVS, GPIO, backend production, Auth/SMTP,
  branch UI chat lain atau mirror Pages sebagai sebahagian kerja app biasa.

## Kontrak yang tidak boleh hilang

- 11 model pembelajaran; lima model permainan termasuk **Kon**, bukan Prisma.
- R1 bongkah kemudian R2 bentangan bagi Digital; aturan firmware berbeza tidak
  menjadi alasan mengubah aliran Digital.
- Kuiz 10, latihan15, single attempt, +1 bagi pasangan betul sahaja; papan skor
  kuiz setempat berasingan daripada rekod kelas, latihan dan Duel.
- Duel protocol 2, markah/masa pelayan, sequence/idempotency dan forfeit.
- Modul progress protocol 1 dan settings bridge version 1 ialah kontrak berasingan.
- Pelan Kaedah 1, skala1:1/1:2, toleransi inklusif0.06 cm lukisan; parser terbatas.
- Bahasa BM/English, tema, saiz teks dan audio mempunyai satu pemilik app.
- Credential tidak dihantar ke modul WebView, outbox, log atau laporan masalah.
- Guest dan setiap akaun mempunyai sempadan simpanan sendiri. Respons lama
  tidak boleh diterapkan selepas akaun/ruang kerja bertukar.

## Cara kerja dan pengesahan

Gunakan pelan berperingkat. Jalankan ujian yang membuktikan kontrak sebenar,
bukan ujian yang hanya menyalin implementasi. Semakan dokumentasi sahaja tidak
memerlukan build firmware. Delegasi hanya apabila pengguna mengizinkan atau
arahan projek yang terpakai menetapkannya; ia bukan keperluan pakej ini.

Simpan fail kunci dependency dan rekod versi SDK sebenar. Bezakan source,
binaan, ujian emulator, ujian telefon, hosted deployment dan capacity benchmark.
Jangan mendakwa APK siap atau 5,000 pengguna disokong hanya daripada mockup,
unit tests atau source push.

Tiada auto-push/merge ke `main`, `main-digitalized`, `sharing`, branch lain atau
mirror. Commit/push branch app, deployment backend dan penerbitan store/Pages
mengikut arahan sesi yang memberikan kebenaran untuk tindakan tersebut.
Jangan force-push. Lengkapkan HANDOFF_TEMPLATE selepas setiap milestone.
