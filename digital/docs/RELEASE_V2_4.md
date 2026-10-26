# Digital v2.4.0 · Modul v1.3.0

Branch: `digitalize-module-upgrade`. Tarikh: 26 Oktober 2026 (Malaysia).
Asas aplikasi: `adc51627eaaace5d9543c7e033d2994986c8715d`; asas modul:
`931a0150397bfb3fd79ef3c8da6684167d1c6aad`. Source pin akhir berada dalam
`vendor/module-release.json`; semakan build mengesahkan Git blob HTML tepat.
Semakan semula remote sebelum push: `digitalize` masih pada SHA asas di atas;
firmware `main` pada `a059979d97926b82cafd4aa5cf3fe59da04a55bb` (v1.1.3).

## Perubahan

1. Empat makmal mempunyai Ramalkan → Cuba → Semak → Terangkan, dengan eksperimen
   sebenar dan semakan konsep sebelum penerangan boleh melengkapkan aktiviti.
2. Cabaran membaiki bentangan, ramalan isi padu, sebutan rumus mengikut muka dan
   penolakan dua tapak dalaman disertakan. Pertindihan/permukaan dalaman ditandai.
3. Kelajuan 0.5×/1×, langkah seterusnya, jeda/sambung serta peluncur dan kawalan
   papan kekunci disediakan untuk model dan animasi makmal.
4. Undo edit, Asal kamera dan Ulang aktiviti mempunyai tanggungjawab berasingan.
   Perubahan eksperimen/jawapan membatalkan semakan semasa, sambil mengekalkan
   pencapaian terdahulu yang sah.
5. Fokus model dan tema cerah/gelap, termasuk kanvas, digunakan bersama kawalan
   berhampiran model. Header membalut pada skrin sempit; butang primer tema gelap
   menggunakan pasangan warna dengan kontras 7.52:1 (10.30:1 semasa hover).
6. Suara Melayu setempat dimainkan atas permintaan, boleh diulang/dihentikan,
   dan mempunyai transkrip. Jika tiada suara setempat, penerangan teks kekal.
7. Ringkasan empat pencapaian dipulihkan oleh aplikasi. Tetamu dan setiap ID
   akaun mempunyai rekod berasingan; tiada pemindahan automatik rekod tetamu.
8. Pelajar boleh membuka modul dari portal. Guru boleh membaca tahap, ramalan,
   pemerhatian, penerangan dan masa kemas kini bagi ahli kelas miliknya.

## Data dan deployment

`backend/module_progress_v2_4.sql` menyediakan jadual peribadi dan RPC
`geo_module_progress`. Pelajar menyimpan rekod sendiri; guru membaca kelas
miliknya sahaja. Tiada keistimewaan jadual terus untuk klien. Identiti datang
daripada `auth.uid()` dan peranan daripada profil peribadi. Rekod ialah refleksi
latihan kendiri; bukan markah penilaian, bukti penguasaan disahkan atau gred TP.

Migration disediakan dalam branch dan belum dipasang pada production. Untuk
database sedia ada, jalankan fail migration sekali semasa deployment. Schema
lengkap untuk pemasangan baharu sudah mempunyai definisi yang sama. Tiada
perubahan Auth, SMTP, permainan room, pemarkahan, audio atau firmware.

Branch `digitalize`, `digitalize-module`, firmware `main` dan laman Pages awam
tidak diterbitkan semula dalam tugasan ini. Keluaran awam kekal Digital v2.3.0.

## Bukti pengesahan

- 121/121 ujian modul dan 96/96 ujian aplikasi lulus. Build/check kedua-duanya
  lulus; checker aplikasi mengesahkan 100 ID unik, ARIA, pin modul dan HTML offline.
  Kedua-dua suite dijalankan semula selepas tugas disambung pada 26 Oktober
  2026: 217 lulus, 0 gagal, 0 dilangkau. Build modul boleh dihasilkan semula
  tepat, 194684 bait, tanpa perubahan pada HTML canonical.
- Ujian baharu meliputi gate penyelesaian, Undo, edit selepas selesai, callback
  animasi sekali sahaja, spoof/stale source/session, pemisahan akaun/tetamu,
  kegagalan storan, save bersiri dan respons awan lewat.
- PostgreSQL hosted 17.11: migration dan fixture sintetik diuji dalam satu
  transaksi. Validasi payload, pengguna sendiri, sempadan kelas guru, penolakan
  anon, penolakan akses jadual terus dan kemas kini monotonik lulus. ROLLBACK
  terakhir dan bacaan susulan mengesahkan jadual/RPC ujian tidak kekal. Tiada
  Auth HTTP, pendaftaran sebenar atau email dihantar oleh ujian.
- Pelayar pratonton branch: empat aktiviti dilengkapkan melalui UI; net dibaiki
  secara manual dan Undo dicuba; kiub 3×2×3 = 18 cm³, kubus a=4 memberi 96 cm²,
  gabungan 312−36−36 = 240 cm². Ringkasan aplikasi dan modul mencapai 4/4, kemudian
  pemuatan semula memulihkan pencapaian. Kelajuan/step, peluncur papan kekunci,
  tema gelap, fokus dan fallback suara tanpa suara Melayu setempat diperiksa.
- Harness iframe 320px menggunakan aplikasi sebenar: lebar kandungan aplikasi
  310/310px dan modul terbenam 266/266px (client/scroll), tiada limpahan mendatar;
  Panduan, kawalan langkah dan medan ramalan kekal tersedia. Ini semakan viewport
  CSS, bukan ujian telefon fizikal.
- Komponen portal guru diuji menggunakan data contoh setempat: 4/4 dan 1/4,
  empat butiran aktiviti, disclosure kekal selepas refresh, dan tindakan buka
  modul. Tiada akaun atau data murid sebenar digunakan dalam harness ini.
- Semakan sumber bebas menemui dan mengesahkan pembaikan rekod selepas selesai.
  Pelayar menemui kegagalan randomUUID pada HTTP; fallback getRandomValues
  mengekalkan nonce rawak. Semakan semula kedua-dua pembaikan lulus.

## Had bukti

Tiada dakwaan aliran guru/pelajar dengan sesi sebenar dan migration production
dipasang, penghantaran email sebenar, audio Melayu didengar, ujian screen reader,
sentuhan/FPS telefon fizikal atau perkakasan ESP32. Geometri cecair ialah model
paras/isi padu ideal. Keselamatan SQL diuji pada PostgreSQL sebenar dengan fixture
rollback; paparan portal diuji dengan data contoh, bukan sesi Auth sebenar.

Ujian fail HTML dan transkrip tetap berfungsi tanpa akaun. Penyelarasan ke awan
memerlukan Internet, sesi pelajar dan migration semasa deployment.
