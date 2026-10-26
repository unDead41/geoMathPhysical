# GeoDecoder Digital — kemudahan penggunaan

Arahan pengguna: laksanakan semua lapan cadangan kemudahan penggunaan dan push
ke branch baharu bernama sesuai. Branch dipilih `digitalize-ease-of-use`.
Ini pelaksanaan cadangan yang sudah dipersetujui, tanpa pusingan kelulusan baharu.

## Asas dan sempadan

- Digitalize v2.3.0: `adc51627eaaace5d9543c7e033d2994986c8715d`;
  tree `4784a88681a72a90a8e84e6c0e994b4e40890a94`.
- BM/BI, rich text, latihan dan Duel v1.5.0:
  `8373fd4bae11847c3a3099ee6f61e2756d99349b` pada digital-richText.
- Modul v1.2.0 dipinkan oleh asas daripada digitalize-module
  `931a0150397bfb3fd79ef3c8da6684167d1c6aad`; jangan ubah kandungan iframe.
- Firmware main v1.1.3: `a059979d97926b82cafd4aa5cf3fe59da04a55bb`.
- Semua commit/push akhir hanya digitalize-ease-of-use. Jangan deploy laman,
  menukar Auth/database, atau menulis ke branch asal/public publication repo.
- Versi digital cadangan v2.4.0, berasingan daripada firmware.

## Reka bentuk yang dilaksanakan

1. Tetamu hanya perlu nama panggilan. Profil tetamu kategori dalaman `Tetamu`
   dan kelas kosong; profil Murid/Pelajar lama serta kelas berdaftar kekal sah.
2. Home mempunyai Main, Belajar dan Akaun/Kelas. Main membuka pilihan Kuiz 10,
   Latihan 15 dan Duel dalam satu borang ringkas dengan keterangan setiap mod.
3. Tutorial tiga langkah bergambar sebelum permainan pertama; boleh langkau,
   dibuka semula daripada bantuan, dan tidak menggunakan masa kuiz sebelum mula.
4. Arahan langkah aktif menonjol: R1 pilih bongkah, kemudian R2 bentangan.
   Kemajuan 1/2→2/2, keadaan dipilih dan pengesahan imbasan jelas.
5. Pada telefon, sentuh kad→sentuh pengimbas ialah arahan utama. Seretan dan
   papan kekunci kekal. Memilih kad tidak menghantar/menggunakan percubaan.
6. Satu dialog Tetapan untuk BM/English, tema, muzik, bunyi, saiz teks dan
   animasi. Pilihan disimpan jika storan tersedia. Perubahan tetapan tidak
   memulakan semula sesi, menukar kad, skor atau jawapan.
7. Keputusan mendahulukan markah/tindakan. Analisis dan semakan panjang berada
   dalam disclosure. Latih Soalan Salah menggunakan ID salah/langkau asal,
   tanpa mengubah skor asal atau masuk papan skor kuiz/room/Duel.
8. Mesej ralat BM/BI menerangkan keadaan dan tindakan berikutnya. Permintaan
   rangkaian belum disahkan tidak dilabel sebagai berjaya/disimpan. Retry
   menggunakan identiti tindakan yang sama.

Duel menggunakan backend aktif yang sama: cipta→salin PIN→kawan masuk→dua
pemain Sedia. Status langkah/menunggu jelas, PIN besar, validasi/paste enam
digit, maksimum dua pemain. Markah dan masa kekal milik pelayan.

## Pilihan pelaksanaan

Dipilih oleh pelaksana: bina pada sumber digitalize v2.3.0 dan integrasikan
enjin/kamus/rendering digital-richText secara terpilih. Ini mengekalkan akaun,
kelas, muzik dan modul semasa sambil mengelakkan dua enjin permainan.
Mengubah branch v1.5.0 sahaja akan kehilangan fungsi semasa; menulis aplikasi
baharu akan menduplikasi logic dan data. Kedua-duanya tidak sesuai dengan skop.

Kamus BM/BI sedia ada menjadi satu sumber; istilah matematik dan bank 15 ID
tidak berubah. UI portal baharu turut menggunakan lapisan terjemahan yang sama.
Kawalan iframe modul terasing dikekalkan; bahasa dalaman modul mengikut
kontrak modulnya sendiri, tanpa mendakwa audio BI baharu sudah tersedia.

## Kejayaan dan had

Semua mod solo berfungsi offline; hanya akaun/room/Duel memerlukan rangkaian.
Satu percubaan, sela maklum balas, peraturan jam solo/room/Duel dan storan lama
dikekalkan. Ujian merangkumi 320/390 px dan desktop, kedua-dua bahasa/tema,
papan kekunci, tetapan ketika bermain, tutorial, review subset, retry dan Duel
live. Telefon fizikal/Safari tidak boleh didakwa lulus daripada emulasi Chromium.
