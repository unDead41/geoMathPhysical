# GeoDecoder Digital changelog

## Belum diterbitkan — design system pusat v1

- Satu pemilik token dan adapter terjana untuk portal serta modul offline.
- Komponen bersama, tema/kontras, tipografi, kawalan, fokus dan keadaan interaksi.
- Rujukan komponen BM/English, semakan drift dan bukti pelayar sebelum/selepas.
- Kandidat `digitalized-ux-design-system`; nombor keluaran aplikasi/firmware kekal
  sehingga integrasi. Tiada perubahan backend, pemarkahan atau geometri.

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
