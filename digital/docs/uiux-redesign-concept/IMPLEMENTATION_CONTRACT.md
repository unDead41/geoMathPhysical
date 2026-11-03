# Kontrak pelaksanaan reka bentuk GeoMath

## Tujuan dan keutamaan

Ikut komposisi visual dalam konsep: latar cerah, teks navy, tindakan biru, panel kemas, model geometri dan ruang kerja yang jelas. UI mesti hidup dan menggunakan data serta controller sebenar. Jangan menjadikan satu gambar screenshot sebagai seluruh halaman atau menggantikan alat interaktif dengan ilustrasi statik.

Keutamaan apabila gambar bercanggah: arahan pengguna semasa → kontrak domain/API dan UX yang disahkan → sumber matematik serta renderer sebenar → reka bentuk konsep. Catat perbezaan yang penting dalam handoff; jangan mengubah peraturan untuk meniru teks atau rajah gambar.

## Identiti dan design system

Gunakan nama paparan **GeoMath** dalam skop visual yang dilaksanakan. Nama repository, API, ID, event, RPC, storage key, protokol dan namespace GeoDecoder kekal. Jangan membuat penggantian rentetan menyeluruh.

Gunakan `digital/design-system/tokens.mjs`, `digital/dist/foundation.css`, `digital/dist/module-foundation.css` dan adapter modul sedia ada. Warna asas yang sepadan dengan konsep sudah wujud: primary #215FF0, ink #18334B, bg #F3F7FB, surface #FFFFFF, success #127957, accent #FFCB66. Anggap nilai ini penerangan rujukan; konsumsi token runtime, jangan salin menjadi token owner baharu.

Kekalkan fon sistem, bahasa BM/English, tema cerah/gelap/sistem, kontras, teks 100/125/150%, reduced motion dan pemilik audio sedia ada. Kawalan minimum 44px, label jelas, fokus kelihatan dan alternatif klik/papan kekunci untuk seretan. Jangan menambah header utama kedua dalam iframe modul. Sidebar atau tab mengikut navigasi yang benar-benar tersedia; jangan menunjukkan pautan kosong.

## Pembetulan terhadap mockup

- Bentangan, pandangan, mesh, formula, unit, bilangan muka/rusuk/bucu dan jawapan menggunakan sumber/renderer geometri canonical. Beberapa rajah raster dalam konsep tidak sesuai dijadikan bahan matematik tepat.
- Senarai model ringkas dalam gambar tidak mengecilkan katalog sebenar. Kekalkan semua **11 bongkah pembelajaran** dan mod/preset yang tersedia pada sumber asas.
- Kata laluan semasa **10–128 aksara**, bukan “6 aksara” yang terjana dalam salah satu gambar.
- Tutorial sedia ada ialah demonstrasi terhingga **4.8 saat**, bukan durasi contoh dalam mockup. Tab/Enter/Space kekal; jangan menganggap A–E ialah shortcut sedia ada.
- Nama, PIN, kelas, tarikh, statistik dan markah dalam gambar ialah data contoh. Jangan seed data itu ke akaun/backend sebenar.
- Tindakan eksport, ulang, rematch atau navigasi hanya dipaparkan jika benar-benar disokong controller semasa. Tiada butang mati atau penghantaran laporan automatik.
- Papan skor kuiz adalah setempat; ia tidak dicampur dengan Duel, kelas, latihan atau ulang soalan salah.
- Rekod modul ialah refleksi latihan kendiri, bukan gred TP atau bukti penguasaan. Jangan menambah peratus penguasaan, XP, streak atau skor kajian rekaan.
- Simpan/sambung setempat bukan janji sync semua peranti. Ikut actor/session dan storan sedia ada.

## Permainan dan Duel

Kekalkan enjin bersama: kuiz 10, latihan 15, R1 bongkah kemudian R2 bentangan mengikut kontrak Digital semasa. Semua lima kad bongkah dan lima bentangan kekal tersedia; warna/posisi tidak membocorkan padanan. Jangan mengambil aturan firmware sebagai alasan menukar permainan Digital.

Duel mengekalkan protokol 2, dua pemain, sepuluh soalan bersama, hint/correction projection, single attempt, sequence/idempotency, durable review, token dan aturan forfeit. Pelayan menentukan markah, fasa dan masa; UI tidak menilai atau mendedahkan jawapan aktif. PIN lobi 10 minit, match 15 minit; masa Duel terus berjalan ketika dialog, tab tersembunyi dan terputus sambungan. Betul 900ms; salah/langkau minimum 1800ms mengikut acknowledgement pelayan. Jangan mengganti engine atau gateway untuk kerja visual.

## Modul dan jambatan induk

Kekalkan renderer/mesh canonical, preset bentangan, ukuran, kiraan, kawalan kamera dan durasi animasi pendidikan. Tukar struktur panel dan persembahan tanpa mengubah matematik.

Satu pemilik preferences di induk; bridge settings dan progress berasingan serta disahkan source/instance/session. Iframe tidak menerima credential, tidak menulis terus ke database, dan tidak mencipta storan bahasa/tema kedua. Tukar bahasa/tema tidak mereset kamera, ukuran, bentangan, jawapan atau draf. Tukar akaun membersihkan draf sebagaimana kontrak sedia ada.

Pelan & Dongakan mengekalkan front +Z, plan +Y, right +X, skala Kaedah 1, lima projek dan dua susunan kiub serta toleransi inklusif 0.06cm lukisan. Semakan Pengiraan mengekalkan Rumus → Gantian nilai → Pengiraan → Unit, parser terbatas dan canonical measures.

## Git dan penerbitan

- Cipta/sambung hanya branch kerja sendiri daripada `main-digitalized` remote terkini. Catat base SHA penuh dan concept SHA penuh.
- Jangan push/merge `main`, `main-digitalized`, `sharing`, mirror `geodecoder-digital` atau branch chat lain. Jangan force-push, reset kerja orang lain atau memadam branch.
- Jangan deploy Pages/Sites, migration, Edge Function, Auth/SMTP atau menulis data production. UI sahaja tidak memerlukan deployment backend.
- Jangan merge seluruh branch konsep atau branch kerja lain secara membuta tuli. Rujuk aset konsep dengan `git show`/GitHub atau salin hanya dokumen yang diperlukan.
- Fail di `digital/dist/*.mjs` dan `digital/dist/index.html` ialah sumber. Bundle dan HTML standalone/vendor adalah hasil binaan; bina melalui tool asal, bukan edit terus.
- Versi firmware tidak dinaikkan untuk pakej konsep ini. Pelaksana ikut polisi versi Digital/modul semasa; nombor pada branch kerja bukan resit keluaran production.

## Pengesahan dan handoff

Jalankan unit/build/check berkaitan dan ujian pelayar sebenar untuk aliran yang diubah. Semak 1440px dan 390px, BM/English, light/dark, teks besar, keyboard, reduced motion, pending/error/empty/retry. Gunakan fixture setempat untuk Duel; jangan membuat akaun atau match production tanpa arahan berasingan.

Sertakan screenshot UI sebenar selepas pelaksanaan, SHA branch remote, fail diubah, ujian/command sebenar, batasan dan hook integrasi. Rekod di `digital/docs/handoffs/<branch>/LATEST.md`. Jangan mendakwa preview grafik sebagai screenshot hasil kod, ujian hos sebagai bukti hardware atau source push sebagai deployment.
