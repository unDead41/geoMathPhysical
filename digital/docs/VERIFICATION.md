# GeoDecoder Digital V2 — pengesahan

Keluaran **2.1.0**, semakan 25 Oktober 2026 UTC / 26 Oktober MYT. Branch: `digitalize` sahaja. Asas: `55a79849d5007ec53a9b877cd20877c9bf15aa8d`. Firmware/main tidak diubah. Rekod semakan keluaran sebelumnya dikekalkan dalam `VERIFICATION_V1_1.md`.

## Automatik tempatan

- `npm test`: **47/47 PASS**, termasuk semua 35 ujian permainan/storan V1.1, lima ujian Edge Auth, tiga regresi sambungan cloud dan empat regresi validasi akaun portal.
- Permainan: 500 seed sepuluh soalan unik/dua setiap bongkah; 500 urutan perubahan posisi/palet; 100 pusingan sempurna; salah R1/R2, langkau, petunjuk, timing/feedback, analisis dan storan/CSV.
- Auth: validasi username/peranan/password/recovery, SHA256, CORS/method/config, penolakan input sebelum network dan regresi respons identity JSON null semasa pendaftaran baharu.
- Cloud: heartbeat akaun lama tidak mengisi cache akaun baharu; respons room lama tidak menimpa room semasa; log keluar membersihkan cache dan mengabaikan respons lewat.
- `npm run build`: PASS, SDK/CSS/JavaScript dibundel dalam HTML tunggal. `GeoDecoder_Digital_V1.html` dan `GeoDecoder_Digital_V2.html` ialah kandungan keluaran yang sama.
- `npm run check`: PASS; sintaks bundle, aset sebaris, **92 ID unik**, sasaran ARIA, bank firmware, sepuluh ilustrasi SVG, token reka bentuk dan baseline aksesibiliti.

## Pembaikan pendaftaran yang disertakan dalam V2.1.0

- Bukti screenshot pengguna: username dengan huruf besar ditolak di borang; kata laluan juga belum memenuhi minimum 10 aksara. Validasi frontend berlaku sebelum permintaan akaun dihantar.
- Punca: regex frontend hanya menerima huruf kecil tetapi belum menormalkan input; Edge Auth sudah menggunakan trim + lowercase.
- Test-first: empat kes dijalankan pada validator borang sebenar; tiga gagal pada kod V2.0.0, kemudian keempat-empatnya lulus selepas pembaikan. Signup/login/recover/invite kini menormalkan username sebelum validasi dan penghantaran serta memaparkan username yang dinormalkan.
- Kata laluan tidak dipotong, ditukar case atau dilonggarkan. Kata laluan pendek masih ditandakan; username sah tidak lagi menerima ralat palsu bersama ralat password. Karakter/username terlalu pendek atau panjang kekal ditolak.
- Ujian automatik menggunakan input sintetik dan shim DOM kecil; tiada kata laluan pengguna dibaca atau diminta.

## Database hosted sebenar

`backend/verify.sql` dijalankan pada projek **fkrlwzxvyufndavlpzbp** selepas migrasi terakhir: **PASS**, keseluruhan transaksi rollback. Ujian mencipta lima pengguna Auth sementara dan menggunakan role SQL `service_role`, `authenticated`, `anon` sebenar. Skop:

- Provisioning servis sahaja, role immutable dan penolakan role palsu dalam user_metadata.
- Pengasingan dua guru, roster guru sendiri, larangan pelajar mencipta kelas, bank jawapan peribadi dan RLS leaderboard.
- Jemputan username/terima, PIN kelas/room, enam digit, putaran/luput, pengekalan kiraan cubaan PIN salah dan rate limit.
- `is_member` membezakan peserta room daripada ahli kelas yang belum masuk; peserta sahaja boleh melihat keputusan room tertutup.
- Sepuluh ID sama untuk semua peserta, unik dan dua setiap bongkah; satu percubaan yang disambung semula.
- Salah R1 dan R2, tahap/jenis pengimbas, semakan 1800 ms, maklum balas 900 ms, petunjuk sekali, langkau dan tamat **7/10** yang mengekalkan sepuluh jawapan.
- Masa dikira server, maklum balas dikecualikan, markah/masa client diabaikan, direct update/insert skor disekat.
- UUID tindakan sama tidak menambah markah/salah; payload berbeza dengan UUID sama ditolak. Penutupan mengekalkan keputusan lengkap/separa tanpa mereka jawapan.

## HTTP/Auth/Realtime hosted sebenar

Ujian opt-in `tools/verify-cloud.mjs` menggunakan tiga akaun sintetik baharu dan SDK sebenar, tanpa token/service key dibenamkan ke produk: **8 kelompok PASS**. Ujian susulan Auth sebenar menambah kelompok kesembilan.

1. Username signup menghasilkan sesi Supabase Auth dan kod pemulihan.
2. Guru mencipta kelas miliknya dan menerima PIN enam digit.
3. Jemputan username diterima oleh pelajar yang dituju.
4. Pelajar masuk dengan PIN room dan guru memulakan permainan.
5. Guru luar serta pelajar tidak memperoleh keistimewaan yang tidak dibenarkan.
6. Satu percubaan, event UUID idempotent dan **kemas kini `public.room_progress` benar-benar diterima melalui WebSocket guru** selepas jawapan pelajar.
7. Skor/masa server, penolakan cubaan mengubah skor terus dan leaderboard guru sepadan.
8. Guru menutup room dan keputusan separa pelajar kekal.
9. Login, username pendua, kod pemulihan salah, reset dengan kod betul, penolakan kata laluan lama dan login kata laluan baharu.

Akaun/kelas/bilik sintetik dibersihkan berdasarkan UUID yang direkodkan selepas semakan; fail password/token sementara tidak dicommit. Laporan tidak membawa password, recovery code atau session token.

## Semakan pelayar Chrome

UI portal disemak menggunakan fixture cloud **simulasi berlabel QA**, manakala operasi hosted di atas diuji berasingan melalui HTTP/SDK sebenar. Tiada dakwaan bahawa proses login pengguna sebenar diuji melalui pelayar.

- Dashboard guru: kelas 24 pelajar, PIN dengan sifar hadapan, butang putar PIN, status aktif/tidak aktif, carian username yang menghasilkan seorang pelajar dan pagination 20 rekod.
- Room: skor selesai/masih menjawab/menunggu, markah semasa/akhir, masa, ranking, fallback refresh 15 saat serta pengesahan tutup dengan butang kekalkan room.
- Tema cerah dan gelap diperiksa secara visual pada dashboard/room; pilihan tema kekal selepas navigasi.
- Iframe **390×844** memaparkan dashboard guru/pelajar. Ukuran lebar dokumen **380/380 client/scroll px**, termasuk gutter 10 px: tiada page overflow. Jadual lebar menggunakan scroll region dalaman.
- Integrasi portal → room → permainan menggunakan kod app sebenar dengan adapter QA: ralat sambungan menyekat input dan memaparkan Hantar semula; retry berjaya, langkau membuka semakan, terus membawa ke soalan baharu dan petunjuk soalan baharu kekal tertutup.
- Jeda room memaklumkan masa server terus dikira. Keluar ke room dan sambung percubaan yang sedang dalam semakan mengembalikan semakan serta butang **Soalan seterusnya** yang aktif.
- Review kod membaiki respons lama selepas keluar/masuk percubaan sama, cache akaun lama, snapshot room lama, pemulihan review/feedback selepas replay event dan butang PIN yang luput.

## Home dan Guest V2.1.0 — pelayar sebenar

- Sebelum perubahan: tiada butang Play as a Guest dan borang nama/kelas kelihatan terus di Home. Selepas perubahan: tepat satu butang Guest pada Home; borang pemain tersembunyi sehingga Guest dipilih.
- Klik Guest membuka skrin berasingan dengan nama, Murid/Pelajar dan kelas, tanpa input username/password. Isi nama sintetik Tetamu QA / kelas 1 Ujian dan tekan Mulakan permainan: soalan pertama, pengimbas dan sepuluh pilihan tersedia tanpa log masuk.
- Keluar daripada latihan meminta pengesahan dan kembali ke Home; masuk ke Akaun & kelas kemudian keluar juga kembali ke Home dengan fokus pada Guest. Tiada fokus pada field yang sudah tersembunyi.
- Telefon iframe 390×844: Home dan Guest mempunyai client/scroll width **380/380 px** termasuk gutter 10px. Guest mempunyai **0** input password. Tema gelap diperiksa secara visual; pertukaran kepada tema cerah dan kembali ke Home berjaya.
- Ujian HTTP akaun tambahan daripada pembaikan pendaftaran: password pendek ditolak 400, signup username huruf besar berjaya 200 dan login huruf kecil berjaya 200. Tiada credential pengguna sebenar digunakan. Akaun sintetik `qa_case_ccb73bad86` masih ada selepas permintaan cleanup dibatalkan; ia tidak mempunyai kelas/room dan bukan data pengguna sebenar.

## Had dan advisori

- Pelan Supabase Free mempunyai kuota dan projek boleh dijeda selepas tidak aktif; tiada pelan berbayar dipilih. Frontend dihantar sebagai HTML; tiada deployment laman awam baharu.
- Security advisor: 12 maklumat `rls_enabled_no_policy` pada jadual **private** yang sengaja deny-all untuk akses terus; tiada polisi longgar ditambah. Akses sah melalui RPC terkawal. Rujukan: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .
- Satu amaran `auth_leaked_password_protection`: pemeriksaan password bocor terbina Supabase tidak aktif kerana ciri ini memerlukan Pro. Keluaran menggunakan validasi 10–128 aksara, rate limit dan Auth hashing, tanpa menaik taraf pelan. Rujukan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
- Tiada ujian beban ratusan sambungan, peranti sentuhan fizikal atau semua versi Safari/Edge. Masa paparan ialah anggaran antara respons server; keputusan server adalah muktamad.
- Pembukaan `file://` disekat oleh polisi pelayar kawalan, jadi HTML diuji melalui preview HTTP. Tingkah laku session/localStorage bagi fail tempatan bergantung pada pelayar. Import runtime sudah dibundel; akaun/room tetap memerlukan Internet.
- Had ujian muat turun CSV dalam pelayar kawalan daripada keluaran terdahulu kekal; generator CSV lulus ujian automatik.
