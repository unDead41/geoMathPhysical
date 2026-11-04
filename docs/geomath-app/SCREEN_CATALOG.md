# Katalog48 paparan dan state tambahan

ID sepadan dengan kapsyen mockup, bukan bukti48 route telah dibina. Route di
bawah ialah **cadangan native app**. `variant`/`state` boleh menggunakan widget
atau route yang sama dengan state berbeza; jangan menggandakan page class
untuk setiap gambar. Kamera, ukuran, tab dan draf milik feature kekal apabila
route visual bertukar secara sah.

Penggunaan route tidak memberikan authorization. Khususnya `/auth/reset`
memerlukan recovery session sah, dan route kelas/Duel memerlukan skop sebenar.

| ID | Paparan | Jenis | Route cadangan | Actor | Rangkaian | SOR |
|---|---|---|---|---|---|---|
| 01 | Utama | page | `/` | Semua | Offline | U01 |
| 02 | Pilih permainan | page | `/play/setup` | Semua | Offline | G01, G02 |
| 03 | Sambung permainan | page | `/play/resume` | Owner slot | Offline | G05 |
| 04 | Cara bermain | page | `/help/how-to-play` | Semua | Offline | G03, U04 |
| 05 | Kuiz 10 | page | `/solo/quiz/:attemptId` | Semua | Offline | G01, G02, G03, G04 |
| 06 | Latihan 15 | page | `/solo/practice/:attemptId` | Semua | Offline | G01, G02, G03, G04 |
| 07 | Semakan jawapan | state | `/solo/:attemptId/review` | Owner attempt | Offline | G03, G04 |
| 08 | Keputusan dan analisis | page | `/solo/:attemptId/result` | Owner attempt | Offline | G06 |
| 09 | Papan skor kuiz setempat | page | `/solo/scores` | Owner slot | Offline | G06 |
| 10 | Cipta/sertai Duel | page | `/duel` | Pemain Duel | Online | D01 |
| 11 | Lobi Duel | page | `/duel/:roomId/lobby` | Capability pemain | Online | D01, D02 |
| 12 | Duel berlangsung | page | `/duel/:roomId/match` | Capability pemain | Online | D01, D02, D03 |
| 13 | Keputusan Duel | page | `/duel/:roomId/result` | Capability pemain | Online/resync | D03 |
| 14 | Log masuk | page | `/auth/login` | Belum login | Online | C01 |
| 15 | Daftar akaun | page | `/auth/signup` | Belum login | Online | C01 |
| 16 | Pemulihan akaun | page | `/auth/recover` | Pemohon pemulihan | Online | C01 |
| 17 | Dashboard guru | page | `/classes/teacher` | Guru | Online; cache berlabel | C02, C03 |
| 18 | Ahli dan jemputan kelas | page | `/classes/:classId/members` | Guru pemilik | Online | C02, C03 |
| 19 | Pantau bilik | page | `/classes/:classId/rooms/:roomId/monitor` | Guru pemilik | Online | C02, C04 |
| 20 | Keputusan bilik | page | `/classes/:classId/rooms/:roomId/results` | Guru pemilik | Online; cache berlabel | C02, C04 |
| 21 | Dashboard pelajar | page | `/classes/student` | Pelajar | Online; cache berlabel | C02, C03 |
| 22 | Bilik pelajar | page | `/classes/:classId/rooms/:roomId` | Ahli kelas semasa | Online | C02, C04 |
| 23 | Profil saya | page | `/account/profile` | Akaun sah | Online untuk simpan | C05 |
| 24 | Kata laluan dan keselamatan | page | `/account/security` | Akaun sah | Online | C01, C05 |
| 25 | Teroka 3D | page | `/learn/explore` | Semua | Offline | L01, L02, U02 |
| 26 | Pandangan 2D | page | `/learn/views` | Semua | Offline | L03, U02 |
| 27 | Nota pembelajaran | page | `/learn/notes/:shapeId` | Semua | Offline | L04 |
| 28 | Kalkulator ukuran | page | `/learn/calculator/:shapeId` | Semua | Offline | L04 |
| 29 | Bina bentangan | page | `/learn/labs/net` | Semua | Offline | L05, L08 |
| 30 | Makmal isi padu | page | `/learn/labs/volume` | Semua | Offline | L05, L08 |
| 31 | Luas permukaan dan rumus | page | `/learn/labs/area` | Semua | Offline | L05, L08 |
| 32 | Bongkah gabungan | page | `/learn/labs/composite` | Semua | Offline | L05, L08 |
| 33 | Hab makmal | page | `/learn/labs` | Semua | Offline | L05 |
| 34 | Pelan dan Dongakan | page | `/learn/projection` | Semua | Offline | L06 |
| 35 | Semakan langkah pengiraan | page | `/learn/calculation` | Semua | Offline | L07 |
| 36 | Rekod latihan kendiri | page | `/learn/records` | Owner rekod | Local; sync berakaun | L08, O03 |
| 37 | Tetapan penggunaan | page | `/settings` | Semua | Offline | U03 |
| 38 | Tema gelap halaman utama | variant | `/` | Semua | Offline | U03 |
| 39 | Pusat bantuan | page | `/help` | Semua | Offline | U04 |
| 40 | Lapor masalah dan pratonton | page+sheet | `/help/report` | Semua | Offline | U04 |
| 41 | Hab Belajar | page | `/learn` | Semua | Offline | L01, U01 |
| 42 | Cipta kelas | form | `/classes/new` | Guru | Online | C02 |
| 43 | Cipta bilik | form | `/classes/:classId/rooms/new` | Guru pemilik | Online | C02 |
| 44 | Sertai kelas/bilik melalui PIN | form | `/classes/join` | Pelajar | Online | C02 |
| 45 | Sahkan e-mel | state | `/auth/verify` | Akaun belum disahkan | Online untuk sahkan | C01 |
| 46 | Kata laluan baharu | form | `/auth/reset` | Recovery session sah | Online | C01 |
| 47 | Sesi aktif | page | `/account/sessions` | Akaun sah | Online | C05 |
| 48 | Sambungan Duel terganggu | state | `/duel/:roomId/match` | Capability pemain | Resync; clock terus | D02, D03, N01 |

## State tambahan tanpa gambar baharu

Keperluan berikut datang daripada candidate CRUD/offline dan lifecycle app.
Ia menggunakan form/sheet/notice bersama; ia belum diwakili sepenuhnya dalam
48 mockup dan tidak boleh ditinggalkan hanya kerana tiada PNG.

| ID | State | SOR | Tingkah laku |
|---|---|---|---|
| EX01 | Sunting nama kelas | C03 | Nama/draf/expected_revision; kekalkan input pada gagal |
| EX02 | Sunting nama bilik | C03 | Nama berubah tanpa mengubah status atau markah |
| EX03 | Pengesahan arkib | C03 | Nama skop, kesan PIN dan blok semasa playing |
| EX04 | Senarai arkib / restore | C03 | Restore tidak membuka closed room atau kod lama |
| EX05 | Pengesahan padam rekod kosong | C03 | Semak server; unknown outcome refresh sebelum retry |
| EX06 | Keluarkan ahli kelas | C03 | Sejarah dipelihara; akses semasa ditarik |
| EX07 | Batal/tolak jemputan | C03 | UUID issuance baharu tidak dipengaruhi dialog lama |
| EX08 | Conflict revision / refresh | C03 | Tunjuk nama terkini sambil kekalkan draf |
| EX09 | Senarai pending sync | O04 | Bilangan sebenar, retry dan status setiap kumpulan |
| EX10 | Login semula untuk sync | O05 | Owner sama; jangan hantar queue menggunakan akaun lain |
| EX11 | Storan gagal/penuh | O02 | Belum disimpan; tiada silent eviction atau janji durable |
| EX12 | Keluar Duel / forfeit | D02 | Pengesahan jelas; clock tetap terus berjalan |
| EX13 | Draf belum disimpan | C05 | Simpan/discard/stay; account switch mengikut kontrak |
| EX14 | Pemulihan akaun legacy | C01 | Kod lama hanya melalui aliran source; bukan OTP baharu |
| EX15 | Cache read-only / akses ditarik | N01 | Label stale; denial membersihkan data/subscription |
| EX16 | Backend capability belum tersedia | N01 | Tiada kawalan mati; pending disimpan jika sync belum dipasang |

## Aliran dan pemakaian semula

- Screen05/07/08 juga memberi bahasa visual untuk permainan kelas, tetapi data,
  clock dan hasilnya kekal dalam context kelas; ia tidak masuk leaderboard09.
- Screen38 ialah variant tema bagi 01. Screen48 ialah state12. Screen40 merangkumi
  form dan preview sheet. Screen42/43 boleh menjadi page atau bottom sheet
  mengikut ruang; validation/callback menggunakan controller sama.
- Borang EX01/EX02 menggunakan komponen nama yang sama dengan42/43, dengan
  expected_revision untuk edit. Dialog confirmation bukan screenshot berulang.
- Screen36 merangkumi empat refleksi; Pelan&Dongakan34 dan Semakan Pengiraan35
  tidak secara automatik menjadi aktiviti kelima/keenam dalam progress protocol.
- Gambar01–48 kekal rujukan visual. Rekod yang kelihatan, PIN, email, tarikh,
  jam dan kemajuan ialah contoh, bukan data untuk seed production.
