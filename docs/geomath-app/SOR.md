# Statement of Requirements — GeoMath Flutter App

Versi SOR **1.0.0** · 4 November 2026 · Status: **spesifikasi persediaan**.
Produk: **GeoMath**, berasaskan GeoDecoder Digital. Nama dalaman API, event,
storage key, ruleset, ID model dan repository GeoDecoder dikekalkan.

## 1. Tujuan dan tahap keputusan

App menyediakan pembelajaran geometri, latihan kendiri, permainan pasangan
bongkah–bentangan dan aktiviti kelas. Ia mengekalkan matematik serta protokol
produk sebenar sambil menggunakan susun atur mudah alih yang seragam.

| Tahap | Maksud |
|---|---|
| Diminta pengguna | Flutter, mockup lengkap dengan aliran, muka bongkah berlainan warna, dokumentasi untuk sambung kemudian |
| Cadangan penulis | Android dahulu; Flutter hibrid; struktur app dan local database yang dihuraikan dalam ARCHITECTURE |
| Dibuktikan pada sumber | Kontrak Digital pada SHA yang direkodkan; source candidate offline/CRUD/scaling dibaca berasingan |
| Belum dibuktikan | App Flutter, APK/iOS, integrasi semua branch, perubahan backend hosted atau kapasiti production |

SOR ini tidak memberikan kebenaran baharu untuk menerbitkan produk, menukar
pelan berbayar atau memigrasi production. Asas kod perlu disemak semula ketika
pembangunan bermula. Rujuk SOURCES_AND_STATUS untuk provenance.

## 2. Pengguna dan sempadan

Tetamu boleh belajar dan bermain solo. Pelajar berakaun boleh menyertai kelas,
menerima jemputan dan menjalankan satu percubaan setiap bilik. Guru mengurus
kelas/bilik miliknya serta melihat keputusan. Peranan akaun datang daripada
rekod pelayan yang dipercayai; sunting profil tidak menukarnya.

Cadangan fasa pertama ialah Android telefon dan tablet. iOS ialah fasa susulan;
desktop/web bukan jaminan automatik kerana adapter WebView mempunyai sokongan
platform tersendiri. Aplikasi tidak membaca kad RFID/NFC telefon atau menggantikan
perkakasan GeoDecoder tanpa skop baharu.

## 3. Keperluan fungsian pembelajaran

| ID | Keperluan wajib | Bukti penerimaan |
|---|---|---|
| L01 | Semua 11 model canonical tersedia: cube, cuboid, pyramid, cylinder, cone, triangular-prism, tetrahedron, pentagonal-prism, hexagonal-prism, sphere, hemisphere | Katalog tepat; tiada model hilang ketika bahasa/tema ditukar |
| L02 | Teroka 3D mengekalkan putar, zum, kamera asal, pilih muka, animasi buka/cantum, jeda/sambung dan reduced motion | Face ID, kamera dan kemajuan lipatan tidak reset akibat tetapan |
| L03 | Enam pandangan2D menggunakan unjuran sebenar; pandangan berbeza daripada bentangan | Kubus menunjukkan enam petak pandangan; sfera tidak diberi bentangan tepat rekaan |
| L04 | Nota dan kalkulator menggunakan sumber formula, ukuran, unit dan mod π canonical | Kubus a=4 cm memberi96 cm² dan 64 cm³; kes bentuk lain ikut fixture sumber |
| L05 | Empat makmal mengekalkan Ramalkan→Cuba→Semak→Terangkan serta mod lanjutan sedia ada | Bentangan, isi padu, luas/rumus dan gabungan boleh diselesaikan tanpa memotong galeri/studio/bekas/rongga yang disokong |
| L06 | Pelan&Dongakan mengekalkan lima projek, dua susunan kiub, skala1:1/1:2, garis/bulatan, Undo dan jenis garis | Kaedah 1; depan+Z, pelan+Y, sisi kanan+X; toleransi inklusif0.06 cm lukisan |
| L07 | Semakan pengiraan mengekalkan Rumus→Gantian nilai→Pengiraan→Unit dan parser terbatas | Tiada eval/kod; had input480 aksara, token/node180, parse depth28, kuasa maksimum magnitud12 dan finite bound1e30 mengikut parser |
| L08 | Rekod latihan ialah empat refleksi kendiri, bukan gred penguasaan | activity net/volume/area/composite; completed hanya dengan penjelasan sah; tiada TP/XP/streak rekaan |

## 4. Permainan solo dan Duel

| ID | Keperluan wajib | Bukti penerimaan |
|---|---|---|
| G01 | Bank canonical15 soalan BM/English; lima shape IDs cube/cuboid/pyramid/cylinder/cone | Export bank mempunyai 3 soalan setiap shape; Prisma dalam gambar tidak menggantikan Kon |
| G02 | Kuiz 10 memilih2 soalan setiap shape; latihan15 menggunakan semua 15 tanpa ulang dalam pusingan | Seeded golden fixtures sepadan dengan sumber JavaScript |
| G03 | Pilih bongkahR1 kemudian bentanganR2; pilihan kad belum menggunakan percubaan | +1 hanya bagi pasangan betul; salah R1/R2 atau langkau +0; R2 belum dicuba tidak ditandakan salah |
| G04 | Single attempt, hint percuma sekali/soalan, feedback dan jam ikut mod | Constants BLINK_MS = 900, WRONG_MS = 1200, REVIEW_MS = 1800 dipelihara; solo jeda ketika dialog/background; baki review dipulihkan |
| G05 | Satu slot solo setiap guest/akaun pada peranti, pengesahan sebelum ganti, semakan ruleset/bank/schema | Proses mati/reopen memulihkan state sah; corrupt/incompatible tidak diterima senyap; tiada janji resume rentas peranti |
| G06 | Papan skor kuiz setempat maksimum 50; analisis dan latihan soalan salah berasingan | Latihan, review, kelas dan Duel tidak masuk leaderboard kuiz; hasil asal tidak ditulis semula |
| D01 | Duel protocol 2, dua pemain,10 soalan bersama, kira detik3 s selepas kedua-duanya Sedia | UI membaca projection pelayan dan tidak menilai Duel melalui enjin solo |
| D02 | PIN lobi10 min; match 15 min; masa Duel terus berjalan ketika dialog, background atau disconnect | Deadline dan tiebreaker berdasarkan pelayan; keluar sebelum selesai ialah forfeit |
| D03 | Kekalkan token/sequence/questionIndex/idempotency, durable review dan batas pendedahan lawan | Retry payload sama, tiada double score;900 ms betul dan sekurang-kurangnya1800 ms salah/langkau; tiada jawapan/token lawan |

## 5. Akaun, kelas dan utiliti

| ID | Keperluan wajib | Bukti penerimaan |
|---|---|---|
| C01 | Signup/login/pemulihan/profil/sesi sebenar, BM/English dan role yang disahkan pelayan | Username3–24; nama2–60 mengikut validator; password10–128; callback app disahkan; tiada OTP/provider rekaan |
| C02 | Guru mencipta kelas/bilik, mengurus ahli/jemputan/PIN dan memantau keputusan; pelajar menyertai serta menyambung percubaan yang sama | PIN kelas/bilik24h; bilik tutup tidak dibuka semula; access diperiksa semula selepas perubahan ahli |
| C03 | Integrasi candidate CRUD menggunakan capability classroom_crud:1 dan expected_revision | Rename, archive/restore, delete-empty, remove-member, cancel/decline invite ikut DATA_BACKEND_CONTRACT; conflict tidak overwrite senyap |
| C04 | Kelas kekal server-authoritative dan online | Masa menjawab, ranking dan semakan pelayan; tiada replay event permainan kelas melalui outbox offline |
| C05 | Profil mempunyai draf, simpan/discard yang jelas; keselamatan mempunyai password change dan scope logout sebenar | Sesi akses token tidak didakwa terbatal serta-merta; tiada revoke satu peranti jika API tidak menyokong |
| U01 | Semua paparan menggunakan satu design system dan komponen boleh guna semula | Shell, form, dialog, sheet, notice, loading/error/empty/success dan l10n tiada variasi rawak setiap feature |
| U02 | Warna muka yang dipilih pengguna konsisten pada model, pandangan dan bentangan pembelajaran | Atas kuning; bawah ungu; depan biru; belakang merah jambu; kiri hijau; kanan jingga; label bukan warna sahaja |
| U03 | BM/English, cerah/gelap/sistem,100/125/150%, kontras, reduced motion dan audio mempunyai satu pemilik | Kontrol sentuh native sasaran 48 dp; viewport320–430 dp dan tablet; tetapan tidak reset aktiviti |
| U04 | Pusat bantuan dan laporan bersifat setempat | Pratonton, salin, pilih teks dan TXT; tiada auto-send, tiket, chat atau rakaman rahsia |

## 6. Offline, data dan rangkaian

| ID | Keperluan wajib | Bukti penerimaan |
|---|---|---|
| O01 | Modul, audio yang dibundel, kuiz dan latihan solo boleh digunakan offline selepas pemasangan/aset disahkan | Native app tidak bergantung pada service worker laman atau CDN; aset rosak/tiada tidak dilabel sedia |
| O02 | Data dan outbox dipisahkan mengikut owner; event dan pending ditulis secara atomik | Guest tidak auto-upload; akaun A tidak dihantar di bawahB; draf dibersihkan/ditukar mengikut sesi |
| O03 | Hanya refleksi modul dan keputusan solo lengkap diselaraskan sebagai rekod formatif tidak disahkan | Ruleset/content_version/id dipelihara; tiada markah rasmi kelas/Duel daripada payload klien |
| O04 | Bounded batches20, pending maksimum 2000/owner, ack-ID khusus, idempotency dan backoff | Ack hilang kekalkan event; content mismatch pada ID sama ditolak; tiada silent eviction; unknown outcome tidak mengaku synced |
| O05 | Penyelarasan utama ketika app dibuka/dibuka semula; tindakan auth/CRUD/live game tidak diantrikan | Sesi luput meminta login; API belum dipasang mengekalkan pending; tiada janji penghantaran selepas OS membunuh app |
| N01 | Request coalescing, account/session/generation binding, cancel/ignore late response, retry berhad | Satu sumber polling setiap skop; Retry-After dihormati; pertukaran akaun tidak menerima data lama |
| N02 | Credential hanya melalui lapisan sesi dilindungi; authorization tetap di pelayan | Tiada service role dalam app; tiada JWT/password dalam WebView/outbox/log/laporan; RLS dan ownership diuji |
| N03 | Sasaran kelancaran dan kapasiti diukur, bukan diwarisi daripada mockup | Profil telefon sebenar dan staging;5,000 pengguna ialah sasaran belum disahkan, bukan SLA atau hasil ujian app |

## 7. Paparan dan penerimaan keluaran

Semua ID 01–48 dipetakan dalam SCREEN_CATALOG; sebahagiannya ialah state/dialog,
bukan route tersendiri. Keadaan tambahan EX01–EX16 diperlukan untuk kontrak
CRUD/offline dan recovery yang lebih lengkap, tetapi belum mempunyai gambar.

Milestone minimum boleh diterima apabila shell+Belajar offline berfungsi pada
telefon, bridge selamat, sebelas model dan kiraan canonical lulus. Permainan,
akaun, kelas, Duel dan sync ditambah sebagai milestone yang berasingan;
milestone awal tidak boleh diiklankan sebagai app lengkap48 paparan.

| ID | Syarat keluaran |
|---|---|
| R01 | Rekod sumber penuh, versi app/dependency/aset, build reproducible, hash APK/aset dan handoff sebenar |
| R02 | Ujian domain, widget, bridge, lifecycle, offline, role/permission dan telefon mengikut TEST_PLAN; semakan BM/English/light/dark/text 150% |
| R03 | Integrasi, backend deployment, mirror/Pages dan store release mempunyai kebenaran serta resit tersendiri; firmware tidak disentuh |

Kriteria siap bagi **pakej ini** ialah dokumen saling konsisten,48 ID lengkap,
gambar akhir betul dipilih, pautan dalaman wujud dan hash sepadan. Ia berbeza
daripada kriteria siap aplikasi di atas.
