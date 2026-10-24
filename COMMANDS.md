# Arahan Serial

115200 baud, Newline atau Both NL & CR. Huruf besar/kecil dan ruang tambahan diterima.
Arahan maksimum 159 aksara. Baris terlalu panjang ditolak sepenuhnya.

| Arahan | Fungsi |
|---|---|
| help | Senaraikan semua arahan, alias dan contoh |
| current | Jenis aktif, kiraan, pool dan status UID lengkap |
| current bongkah | Alias current |
| current kubus | Alias current, mengikut istilah asal pengguna |
| set bongkah N | Pilih N jenis pertama yang berpasangan UID lengkap, N=1..5 |
| set kubus N | Alias set bongkah N |
| use kubus piramid silinder | Pilih nama jenis aktif; boleh 1..5 jenis |
| check uid | Mod imbas kedua-dua reader; tiada pemarkahan |
| check uid all | Alias check uid |
| check uid 1 | Imbas R1 sahaja |
| check uid 2 | Imbas R2 sahaja |
| assign r1 kubus | Tunggu satu kad bongkah kubus di R1, maksimum 30 saat |
| assign r2 kubus | Tunggu satu kad bentangan kubus di R2 |
| assign r1 kubus 04 A1 B2 C3 | Simpan/tukar UID terus; nombor ini contoh sahaja |
| unassign r1 kubus | Buang pendaftaran slot ini |
| tags | Semua UID/peranan bagi lima jenis |
| play | Mula atau sambung kuiz yang dijeda |
| stop | Jeda kuiz dan masa, atau batal capture; kembali menu, antena OFF |
| round new | Mula round baharu dan kosongkan markah round |
| next | Sama seperti NEXT / B1: mula, sambung, seterusnya atau menu mengikut skrin |
| hint | Sama seperti HINT / B2: cara bermain, pembayang atau menu mengikut skrin |
| retry | Reset pasangan soalan semasa dari R1 dan minta imbas semula; markah round kekal |
| clear | Alias retry; tidak memadam pendaftaran UID |
| score | Markah round, masa bermain, bilangan kombinasi salah dan soalan guna hint |
| status | Mod aplikasi, perkakasan, UID terakhir, markah dan jenis aktif |
| pins | Paparkan GPIO yang digunakan |
| bank | Lima belas soalan, jenis jawapan dan pembayang untuk guru |

Nama jenis: kubus, piramid, silinder, kon, kuboid.
Nama English juga diterima: cube, pyramid, cylinder, cone, cuboid.
Piramid merujuk khusus kepada piramid bertapak segi empat sama.

## UID terus

Empat, tujuh atau sepuluh byte disokong. Contoh format:

    assign r1 kubus 04 A1 B2 C3
    assign r1 kubus 04:A1:B2:C3
    assign r1 kubus 04A1B2C3

Semua di atas ialah contoh; gunakan UID yang dibaca daripada kad sebenar.
Untuk mendaftarkan tanpa menaip UID, gunakan assign r1 kubus dan imbas kad.

## Kesan terhadap round

- help/current/tags/status/pins/score/bank tidak mengubah kuiz.
- check uid menjeda kuiz; play menyambung markah/soalan, tetapi pasangan perlu diimbas semula dari R1.
- Perubahan melalui assign/unassign/use/set menyimpan NVS lalu membatalkan round lama.
- Pendaftaran gagal kerana kad pendua/UID salah/NVS gagal tidak mengubah mapping.
- Pendaftaran imbas berhenti selepas satu simpanan berjaya. Gunakan stop untuk membatalkan.
- UID sudah digunakan di slot lain: unassign slot lama dahulu.
- Memilih jumlah jenis yang belum cukup pasangan UID akan ditolak, tanpa perubahan separa.

## Main secara fizikal

Menu utama: NEXT mula pusingan baharu, HINT cara bermain. Serial `play` boleh menyambung pusingan yang dijeda. Soalan: NEXT langkau +0 markah, HINT buka/tutup pembayang.
Ringkasan: NEXT main semula, HINT menu. Semakan/pendaftaran: NEXT kembali menu atau batal.
Setiap soalan wajib R1 bongkah kemudian R2 bentangan sepadan; +1 hanya setelah kedua-duanya betul. Masa berjalan ketika menjawab/hint/notis salah, dijeda sepanjang tiga kelipan 900 ms, dan berhenti pada tindakan terakhir. Menu/penyelenggaraan menjeda masa. NEXT/HINT semasa kelipan diabaikan. Rujuk [flow dua kad](docs/GAME_FLOW_RGB.md).
Serial mengekalkan maklumat teknikal guru; LCD memaparkan arahan murid sahaja.

## Ujian komponen

Taip `test/help` untuk arahan berformat slash seperti `test/rfid/r1`,
`test/rfid/r2`, `test/rfid/check`, `test/led/r1/red`, `test/led/cycle` dan
`test/button/all`. `test/status` menunjukkan sesi; `test/stop` atau `stop`
kembali ke menu. Semasa ujian, permainan/markah/masa dijeda dan tiada UID
pernah didaftarkan secara automatik. Arahan guru yang mengubah state memerlukan
keluar ujian dahulu; arahan baca sahaja kekal tersedia.

Rujuk [panduan ujian komponen](docs/COMPONENT_TESTS.md) untuk semua target,
warna, timing, watch butang dan maksud output RFID.
