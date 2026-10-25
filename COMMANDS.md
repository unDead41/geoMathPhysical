# Arahan Serial

115200 baud, Newline atau Both NL & CR. Huruf besar/kecil dan ruang tambahan diterima.
Arahan maksimum 159 aksara. Baris terlalu panjang ditolak sepenuhnya.

| Arahan | Fungsi |
|---|---|
| help | Senaraikan semua arahan, alias dan contoh |
| version | Versi firmware yang sedang berjalan dan environment LED/RGB |
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
| unassign all | Buang semua sepuluh UID bongkah dan bentangan, termasuk jenis tidak aktif |
| unassign kubus | Buang kedua-dua UID R1/R2 untuk kubus sahaja |
| unassign piramid | Buang kedua-dua UID R1/R2 untuk piramid sahaja |
| unassign silinder | Buang kedua-dua UID R1/R2 untuk silinder sahaja |
| unassign kon | Buang kedua-dua UID R1/R2 untuk kon sahaja |
| unassign kuboid | Buang kedua-dua UID R1/R2 untuk kuboid sahaja |
| unassign kubu | Alias unassign kubus |
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
| status | Versi firmware, mod aplikasi, perkakasan, UID terakhir, markah dan jenis aktif |
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

- version/help/current/tags/status/pins/score/bank tidak mengubah kuiz.
- check uid menjeda kuiz; play menyambung markah/soalan, tetapi pasangan perlu diimbas semula dari R1.
- Perubahan melalui assign/unassign/use/set menyimpan NVS lalu membatalkan round lama.
- Pendaftaran gagal kerana kad pendua/UID salah/NVS gagal tidak mengubah mapping.
- Pendaftaran imbas berhenti selepas satu simpanan berjaya. Gunakan stop untuk membatalkan.
- UID sudah digunakan di slot lain: unassign slot lama dahulu.
- Memilih jumlah jenis yang belum cukup pasangan UID akan ditolak, tanpa perubahan separa.

## Padam tagging untuk daftar semula

Hantar satu arahan setiap baris. Contohnya, `unassign all` memadam semua
pendaftaran; `unassign piramid` memadam pasangan bongkah/R1 dan bentangan/R2
piramid sahaja. Nama English seperti `unassign cube` juga diterima.
Gunakan `unassign r1 piramid` jika mahu memadam kad bongkah sahaja.

Pemadaman berlaku terus dan disimpan dalam NVS; `tags` menunjukkan slot kosong
sebagai `BELUM DAFTAR`. Pilihan jenis aktif dikekalkan. Daftar semula pasangan
jenis aktif melalui `assign`, atau pilih jenis lain yang masih lengkap melalui
`use`, sebelum bermain. UID jenis lain kekal apabila satu pasangan dipadam.

Semua slot yang diminta disimpan dalam satu write. Write gagal atau tidak
lengkap tidak mengesahkan perubahan RAM atau membatalkan round. Selepas
berjaya, round lama dikosongkan, pendaftaran/semakan imbas dibatalkan dan menu
dibuka. Arahan salah atau argumen tambahan ditolak tanpa perubahan. Semasa
ujian komponen, keluar dengan `test/stop` dahulu sebelum memadam tagging.

## Main secara fizikal

Menu utama: NEXT mula pusingan baharu, HINT cara bermain. Serial `play` boleh menyambung pusingan yang dijeda. Soalan: NEXT langkau +0 markah, HINT buka/tutup pembayang.
Ringkasan: NEXT main semula, HINT menu. Semakan/pendaftaran: NEXT kembali menu atau batal.
Setiap soalan wajib R1 bongkah kemudian R2 bentangan sepadan; +1 hanya setelah kedua-duanya betul. Masa berjalan ketika menjawab/hint/notis salah, dijeda sepanjang tiga kelipan 900 ms, dan berhenti pada tindakan terakhir. Menu/penyelenggaraan menjeda masa. NEXT/HINT semasa kelipan diabaikan. Rujuk [panduan permainan](README.md#daftar-kad-dan-main).
Serial mengekalkan maklumat teknikal guru; LCD memaparkan arahan murid sahaja.

## Ujian komponen

Arahan ringkas untuk kalibrasi (satu arahan setiap baris):

| Arahan | Hasil |
|---|---|
| `R1Red`, `R1Green`, `R1Blue`, `R1Yellow`, `R1Cyan`, `R1Magenta`, `R1Purple`, `R1White` | Warna pilihan kekal pada RGB1; RGB2 padam |
| `R2Red`, `R2Green`, `R2Blue`, `R2Yellow`, `R2Cyan`, `R2Magenta`, `R2Purple`, `R2White` | Warna pilihan kekal pada RGB2; RGB1 padam |
| `R1RGB`, `R2RGB` | Turutan merah → hijau → biru → kuning → sian → magenta/ungu → putih; 500 ms setiap warna, ulang setiap 3,500 ms |
| `R1Random`, `R2Random` | Warna rawak pada target, 500 ms setiap warna; berterusan |
| `R1Off`, `R2Off` | Kedua-dua output padam kerana target diminta OFF dan target lain sentiasa padam |
| `ButtonTest` | Pantau short/long press NEXT dan HINT |
| `NEXTTest`, `HINTTest` | Pantau satu butang sahaja |

`Purple` ialah alias `Magenta` (merah + biru), sama seperti warna hint permainan.
Huruf besar/kecil tidak penting. Warna rawak bertukar kepada warna berbeza setiap
langkah. `test/led/random` atau `test/led/all/random` memainkan kedua-dua RGB
serentak dengan warna R1/R2 sentiasa berlainan. Setiap warna turut mengelakkan
warna sebelumnya pada LED yang sama; Serial melabel warna R1 dan R2 secara
berasingan. `test/led/r1/random`, `test/led/r2/random` dan `test/led/random`
menyediakan versi slash. `ButtonTest` ialah alias `test/button/all`.
`SHORT_PRESS` dilapor apabila dilepaskan sebelum 1,000 ms; `LONG_PRESS` sekali
apabila tahan mencapai 1,000 ms, diikuti tempoh akhir ketika dilepaskan.
Masa diukur antara keadaan stabil selepas debounce 40 ms; tiada auto-repeat.
Arahan `next`/`hint` untuk permainan kekal seperti sedia ada selepas keluar ujian.

Taip `test/help` untuk arahan berformat slash seperti `test/rfid/r1`,
`test/rfid/r2`, `test/rfid/check`, `test/led/r1/red`, `test/led/cycle` dan
`test/button/all`. `test/status` menunjukkan sesi; `test/stop` atau `stop`
kembali ke menu. Semasa ujian, permainan/markah/masa dijeda dan tiada UID
pernah didaftarkan secara automatik. Arahan guru yang mengubah state memerlukan
keluar ujian dahulu; arahan baca sahaja kekal tersedia.

Gunakan `test/help` untuk semua target, warna dan watch butang.
READY ialah respons register; imbas kad sebenar untuk mengesahkan bacaan antena.

## Versi yang sedang berjalan

`version` boleh dibaca semasa kuiz atau ujian komponen tanpa mengubahnya.
Banner ini juga muncul semasa boot dan pada permulaan output `status`:

```text
[FIRMWARE] GeoDecoder v1.1.1 | ESP32 | env=esp32dev-rgb
```

`env=esp32dev` menandakan LED biasa. Semak versi dengan README GitHub pada
commit yang diupload. Jika Monitor dibuka selepas boot, taip `version`.
Dalam Project Tasks branch sharing, padanan nama ialah `esp32dev-sharing`
(LED biasa) dan `esp32dev-sharing-rgb` (RGB); label Serial firmware v1.1.1 kekal seperti di atas.
Rujukan sumber dan versi terdapat dalam README.md dan package.json.

