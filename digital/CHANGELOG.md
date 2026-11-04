# GeoDecoder Digital changelog

## v2.9.1 — 4 November 2026 (calon semakan mockup)

- Lengkapkan susun atur Home, mod, panduan, permainan, Duel, akaun, kelas,
  modul, tetapan dan bantuan berdasarkan 40 paparan konsep yang diluluskan.
- Gunakan ilustrasi bongkah sedia ada, hierarki navy, rel akaun dan panel
  tetapan bersama; semua borang/tindakan masih mengikut controller sebenar.
- Nota modul v1.6.2 menggunakan kandungan ringkas, model dan bentangan sebenar
  serta pendedahan lanjut untuk nota penuh. Studio mengekalkan matematik asal.
- Betulkan panduan kepada demo terhingga 4.8 saat dan kawalan Tab/Enter/Space.
- Kekalkan offline/outbox, CRUD, sesi, peraturan permainan dan protokol Duel2.
  Ini branch semakan; tiada perubahan backend atau penerbitan Pages.

## v2.9.0 — 4 November 2026 (integrasi sumber main-digitalized)

- Menyatukan UI utama dengan aset 3D, UI Duel dan tiga kemasan modul v1.6.1.
- Menambah pakej PWA, cache offline serta outbox rekod latihan/kegiatan modul
  yang terikat kepada pemilik dan sesi; tindakan kelas dan Duel kekal online.
- Menggabungkan CRUD kelas/room/invitation dengan cache, request coalescing,
  polling/backoff dan simpanan modul. Wrapper kelas mengekalkan snapshot baca
  sahaja dan heartbeat berkala apabila digabungkan dengan scaling.
- Mengemas kini pin modul daripada hasil binaan gabungan, alias HTML dan bundle.
- Semua kepala branch sumber dikekalkan dalam ancestry integrasi; branch kerja
  aktif menerima upstream secara fast-forward selepas pengesahan.

Ini integrasi kod private. Migration hosted, deployment Edge dan penerbitan
mirror/Pages belum dilaksanakan oleh integrasi ini. Fail scaling/offline masih
mempunyai langkah pendaftaran dan rollout tersendiri. Lihat
[rekod integrasi](docs/integration-sync/README.md),
[urutan SQL](docs/integration-sync/SQL_ORDER.md) dan
[prompt sambungan](docs/integration-sync/BRANCH_SYNC_PROMPTS.md).

## v2.8.0 — 26 Oktober 2026 (main-digitalized)

Modul dinaik taraf kepada v1.6.0; firmware kekal v1.1.3. Keluaran ini menyatukan
kerja design system pusat, cadangan bantuan visual v2.7.1 dan modul pelan/pengiraan
di atas semua fungsi v2.7.0. Pengesahan gabungan lulus; keputusan dan resit penerbitan Pages v2.8.0 berada dalam `docs/RELEASE_V2_8.md` dan `docs/integration-evidence/v2.8/`.

### Design system pusat v1

- Satu pemilik token dan adapter terjana untuk portal serta modul offline.
- Komponen bersama, tema/kontras, tipografi, kawalan, fokus dan keadaan interaksi.
- Rujukan komponen BM/English, semakan drift serta suite visual/akses sedia ada.
- Peraturan backend, pemarkahan, masa dan geometri kekal dengan pemilik asal.

### Bantuan visual

- Tutorial R1/R2 dan pasangan +1 menggunakan demonstrasi bergambar 4.8 saat,
  sekali main, dengan Jeda/Sambung dan Main semula.
- Tujuh panduan bantuan mendahulukan visual; penerangan penuh dan panduan papan
  kekunci dibuka apabila diperlukan. BM/English dan eksport laporan kekal.
- Kurangkan gerakan melalui OS atau Tetapan memberikan ilustrasi statik berlabel.
  Tiada video/aset luar, timer permainan atau penghantaran laporan baharu.

### Modul v1.6.0: pelan, dongakan dan langkah pengiraan

- Studio Pelan & Dongakan menggunakan lima bentuk projek dan dua susunan kiub
  unit, tiga grid Kaedah 1, skala 1:1/1:2, garis nampak/terlindung/binaan,
  alat garis/bulatan, koordinat papan kekunci, Undo dan semakan setiap pandangan.
  Liputan geometri setara diterima pada toleransi inklusif 0.06 cm lukisan.
- Semakan Rumus → Gantian nilai → Pengiraan → Unit bagi 11 bentuk, bekas terbuka
  terpilih dan dua gabungan; π/unit pilihan, petunjuk khusus dan parser terhad
  tanpa pelaksanaan kod murid.
- Nota/kalkulator membawa ukuran semasa kepada aktiviti. Bahasa/tetapan induk,
  geometri, empat makmal/refleksi asal dan protokol kemajuan kekal; komponen
  baharu memiliki bahasa sendiri dan dikecualikan daripada adapter terjemahan lama.
- Pin modul dan alias aplikasi mesti dibina semula daripada sumber gabungan.
  Tiada schema, rekod skor atau storan draf kekal baharu.

Rujukan sumber dan had: docs/DESIGN_SYSTEM.md, docs/HELP_VISUAL_UPDATE.md dan
module/docs/HANDOFF_PELAN_PENGIRAAN_V1_6.md. Rekod deployment v2.7.0 di bawah
kekal sejarah keluaran tersebut, bukan pengesahan penerbitan v2.8.0.

## v2.7.0 — 26 Oktober 2026 (integrasi main-digitalized)

Deployment v2.7.0 disahkan kemudian melalui migration `20261026110959`,
Duel Edge v2/protocol2 dan commit awam
`0486388a9c94942ab0973af5609be0168d27323c`; lihat docs/RELEASE_V2_7.md.
Catatan penggabungan dan gate asal dikekalkan di bawah.

Modul v1.5.0 dan firmware v1.1.3 dikekalkan. Penerbitan awam dan deployment baharu memerlukan resit berasingan; bukti ujian setiap branch bukan pengesahan automatik hasil gabungan.

### Duel protocol 2

- Jawapan aktif dan future question IDs tidak dihantar; hint/correction menggunakan projek pelayan selepas ACK.
- Semakan tahan refresh, advance idempotent, perlindungan polling/request lama dan terminal ACK selepas deadline.
- Baki masa, status pemain, Home resume dan panduan guru. Pengaktifan backend/Edge diselaraskan mengikut docs/DUEL_V2_HANDOFF.md.

### Profil

- Pratonton nama/avatar, status draf, amaran keluar dengan Simpan/Teruskan, Buang atau Teruskan menyunting; tetapan mengekalkan draf.
- Nama guru daripada snapshot yang dibenarkan, pintasan kelas/keselamatan serta aliran murid tanpa kelas.
- Migration susulan profile_class_details_v2_7.sql hanya memperluas snapshot; deployment hosted perlu disahkan berasingan. Rujuk docs/PROFILE_V2_7.md.

### Sesi aktif

- Senarai sesi Auth sendiri, label Peranti ini, masa mula dan anggaran peranti/pelayar.
- Pembatalan semua sesi lain atau sesi semasa melalui scope SDK, dengan pengesahan dan perlindungan pertukaran akaun.
- Pembatalan satu sesi pilihan tidak disokong API rasmi; token akses boleh kekal sah sehingga luput.
- Rekod deployment RPC baca sahaja dan batas bukti dua sesi live berada dalam docs/ACTIVE_SESSIONS.md; tiada dakwaan deployment baharu oleh integrasi ini.

### Auth email v1.1.0

- Lapan templat BM/English dalam reka bentuk geometry postcard, satu tindakan utama dan pautan alternatif berlabel; ConfirmationURL/OTP dikekalkan.
- Sumber canonical, manifest subjek, generator, semakan dan pratonton setempat. Custom SMTP masih prasyarat pengaktifan hosted; tiada bukti penghantaran inbox daripada merge.

### Pusat Bantuan & Lapor Masalah

- Bantuan BM/English melalui header, Tetapan dan bridge modul; tutorial/panduan asal dikekalkan tanpa memuat semula aktiviti.
- Borang validasi, pratonton, salin, pilih teks dan TXT setempat. Konteks allowlist tanpa jawapan, identiti, PIN atau credential; draf dalam memori tab.
- Keadaan permainan/iframe dan polisi masa solo/kelas/Duel dikekalkan. Tiada endpoint atau penghantaran laporan baharu. Rujuk docs/HELP_SUPPORT_HANDOFF.md.

### Simpan & Sambung

- Kuiz10, Latihan15 dan latihan semula dipulihkan melalui enjin Game; snapshot berasingan bagi tetamu/setiap akaun.
- Validasi bank/ruleset, replay jawapan, warna/pilihan kad serta baki semakan dikekalkan; masa ditutup tidak dikira.
- Ringkasan sebelum sambung, pengesahan penggantian, mesej storan gagal/rosak dan ID keputusan stabil mengelakkan skor berganda.
- Duel/classroom serta kemajuan modul kekal menggunakan pemilik storan/masa masing-masing. Rujuk docs/SAVE_RESUME.md.

### Sejarah dan operasi backend

- Sejarah migration Supabase yang dipin, audit, pelan deployment dan gate semakan history disepadukan tanpa menjadikan salinan fail sebagai arahan mengulang migration hosted.
- Rujuk backend/operations/README.md untuk prasyarat, bukti dan sempadan operasi.

## v2.6.0 — 26 Oktober 2026 (main-digitalized)

- Satukan branch digital: BM/English, rich text, latihan 15 soalan, Duel,
  kemudahan penggunaan dan tetapan permainan/modul.
- Integrasi modul v1.5.0: semua kandungan v1.4.0 bersama aktiviti berpandu,
  Undo, langkah animasi, fokus, tema, suara dan rekod latihan.
- Profil Saya, pengesahan semula kata laluan, pengurusan sesi serta tetapan
  paparan/audio/pembelajaran berkongsi portal dan lifecycle akaun yang sama.
- Root index dan setiap alias HTML menggunakan satu artifak penerbitan.
- Rujukan lengkap, migration dan had bukti: docs/RELEASE_V2_6.md.

## v2.5.0 — 26 Oktober 2026 (branch digitalize-ease-of-use)

- Seragamkan BM/English, teks100/125/150% dan pilihan animasi antara permainan
  dengan modul. Perubahan terus digunakan tanpa memuat semula iframe.
- Tetapan dalam modul membuka dialog utama yang sama. Aktiviti, ukuran,
  pilihan bongkah dan kemajuan bentangan dikekalkan semasa tetapan berubah.
- Paparan English meliputi penerokaan, nota/pengiraan serta empat makmal
  daripada modul BM yang dipinkan. Tiada kamus daripada rangkaian diperlukan.
- Pilihan kurangkan gerakan merangkumi putaran automatik dan peralihan;
  peluncur serta Main untuk animasi pembelajaran secara sengaja kekal tersedia.
- Modul sumber, formula/ID, backend dan firmware dikekalkan.

## v2.4.0 — 26 Oktober 2026 (branch digitalize-ease-of-use)

- Satukan platform v2.3.0 dengan BM/BI, rich text, latihan 15 soalan dan Duel
  daripada digital-richText v1.5.0, menggunakan satu enjin permainan.
- Home Main/Belajar/Akaun & kelas, tetamu nama sahaja, tutorial tiga langkah,
  arahan R1/R2 jelas dan kawalan sentuh tanpa seretan wajib.
- Tetapan berpusat untuk bahasa, tema, muzik, bunyi, saiz teks dan animasi;
  perubahan tetapan mengekalkan sesi serta pilihan kad.
- Keputusan ringkas dengan analisis boleh dibuka, latihan semula soalan
  salah/langkau tanpa mengubah skor asal, dan mesej ralat dengan tindakan.
- Akaun, kelas, data lama, muzik penuh dan modul v1.2.0 dipelihara. Tiada migrasi
  atau deployment backend baharu. Branch ini belum diterbitkan ke laman awam.

## v1.5.0 — 26 Oktober 2026 (branch digital-richText)

- Duel dua pemain dengan PIN enam digit, lobi sedia/kira detik, sepuluh soalan
  sama dan kemajuan lawan daripada pelayan. Markah/masa/keputusan disahkan pelayan.
- Backend Supabase berasingan untuk duel, token sesi persendirian, retry idempoten,
  pemulihan sambungan, had masa dan keputusan seri/menyerah kalah.
- BM/BI, rich text dan mod kuiz/latihan offline dikekalkan. Keputusan duel tidak
  masuk papan skor kuiz. Tiada perubahan firmware atau sistem kelas/akaun.
- Backend Duel sudah aktif; buka HTML versi ini pada kedua-dua peranti dengan
  Internet, kongsi PIN dan tekan Sedia. `main-digital` belum dikemas kini.
- Bukti ujian dua pelayar sebenar, perlumbaan join, keputusan 10–9, menyerah
  kalah, pemulihan R1 dan retry tanpa gandaan markah direkodkan dalam `docs/DUEL.md`.

## v1.4.0 — 26 Oktober 2026 (branch digital-richText)

- Mod Latihan Pengukuhan memainkan semua 15 soalan sekali setiap sesi,
  tiga bagi setiap bongkah, menggunakan bank dan enjin permainan yang sama.
- Pemilih mod BM/BI, kemajuan/markah /15, analitik, 15 rekod semakan dan ulang
  latihan. Hint, rich text, satu percubaan dan semakan jawapan dikekalkan.
- Kuiz 10 soalan kekal sebagai lalai. Keputusan latihan tidak masuk kedudukan
  kuiz; skor lama dan peraturan storan kuiz kekal serasi.
- HTML digital dan root page dibina semula untuk penggunaan offline.

## v1.3.0 — 26 Oktober 2026 (branch digital-richText)

- Rich text BM/BI untuk soalan, petunjuk, kunci rumus, semakan jawapan dan senarai
  soalan selepas permainan. Istilah utama mengikuti glosari sedia ada.
- MathML setempat untuk pecahan, kuasa, π/× dan kurungan, bersama label bacaan
  matematik mengikut bahasa. Unit ukuran menggunakan jarak yang konsisten.
- Renderer menyokong tebal/italik/baris baharu, meng-escape HTML dan kekal offline.
- Peraturan satu percubaan, ID/nilai/jawapan soalan, skor, masa, kad dan analitik
  dikekalkan. Root `index.html` dibina daripada HTML digital yang sama.

## v1.2.0 — 25 Oktober 2026 (branch digital-dwi)

- BM/English lengkap untuk UI, 15 soalan/hint, semakan jawapan, animasi, analitik kelemahan, keputusan, skor lama dan CSV.
- Selaraskan digitalize v1.1.0 (55a79849d5007ec53a9b877cd20877c9bf15aa8d): kekalkan satu percubaan, warna/posisi berubah, animasi dan analitik sebenar.
- Pemilih bahasa tidak mengubah padanan, pilihan kad, warna, jam, percubaan, semakan atau data analitik.
- Kamus dan semua fail runtime disertakan dalam HTML offline; glosari serta bukti BM/BI disertakan.
- Semakan pemformat pi, keutuhan rekod legacy dan paparan telefon. Firmware kekal v1.1.3; hanya digital-dwi diterbitkan.

## v1.1.0 — digitalize, 25 Oktober 2026

- Satu percubaan setiap soalan, semakan jawapan, warna dan animasi serta analitik kelemahan pembelajaran.

## v1.0.0 — 25 Oktober 2026

- Permainan digital asal: lima bongkah, 15 soalan sumber, 10 soalan setiap pusingan, R1/R2, hint, cuba semula, langkau dan papan skor setempat.
