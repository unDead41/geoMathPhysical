# GeoDecoder Digital v1.1.0 — sambungan kerja

Arahan pengguna: sambung permainan pada `digitalize`; modul pembelajaran berasingan
akan menggunakan `digitalize-module`. Rujukan main semasa ialah v1.1.3,
`a059979d97926b82cafd4aa5cf3fe59da04a55bb`; asas digital ialah
`cd47ebd7dbcbab709b9f61a2122f7492f2b74113`.

## Reka bentuk yang dilaksanakan

Kekalkan HTML luar talian dan identiti dua pengimbas. Sambung perubahan enjin
yang sudah tersimpan, kemudian hubungkan ke paparan; elakkan menulis semula game.
Semua lima pilihan berpindah kedudukan setiap soalan. Palet berubah setiap
bongkah/soalan; palet R1 dan R2 berasingan supaya warna tidak membocorkan padanan.
Gerakan hero, kad dan imbasan menggunakan CSS; reduced motion memadam gerakan.

Satu percubaan ialah satu pasangan R1→R2. Salah pada mana-mana tahap menamatkan
soalan dengan 0 markah. Salah/skip membuka semakan jawapan yang betul, menghentikan
jam dan input, dan memerlukan butang terus selepas sekurang-kurangnya 1.8 saat.
Betul meneruskan selepas kelipan 900 ms. Tiada penalti petunjuk.

Analisis mengikut bongkah, topik sebenar soalan dan tahap R1/R2. Bezakan salah,
langkau, bantuan petunjuk dan tahap belum dicuba. Paparkan kiraan/denominator
serta latihan yang khusus. Analisis ini berdasarkan satu pusingan sepuluh soalan.
Skor lama dengan retry kekal berasingan daripada papan skor satu percubaan.

## Pelan dan semakan

- [x] Ubah ujian retry kepada satu percubaan; uji review/pause, derangement,
  warna, analisis dan simpanan skor berasingan.
- [x] Lengkapkan paparan, semakan jawapan, analisis dan animasi.
- [x] Selaraskan dokumentasi, versi dan pembina HTML tunggal.
- [x] Jalankan ujian, semakan sumber/HTML, audit UI dan ujian pelayar sebenar.
- Langkah penerbitan: simpan HTML akhir dan terbitkan hanya pada branch digitalize; SHA sebenar disahkan dalam respons akhir.

## Penyelarasan reka bentuk

| Kontrak lama | Arahan baharu | Tindakan |
|---|---|---|
| Semua bongkah mint, semua kad biru | Pelbagai warna setiap soalan | Palet tepat dalam visuals.mjs, dirujuk art.mjs |
| Tiada gerakan automatik | Tambah animasi | Gerakan kecil pada ilustrasi; kawalan kekal pegun |
| Salah boleh retry | Satu percubaan | Review terkunci, 0 markah, butang terus |
| Skor + skip = 10 | Skor + salah + skip = 10 | Ruleset/storan berasingan; rekod lama dikekalkan |
