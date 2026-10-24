# Flow permainan GeoDecoder dengan dua RGB

RGB 1 berada di pembaca **R1 untuk kad bongkah**. RGB 2 berada di pembaca
**R2 untuk kad bentangan**. Satu soalan memerlukan **satu imbasan jawapan**.

| Warna | Maksud |
|---|---|
| Padam | Pembaca tidak diperlukan, atau permainan di menu |
| Biru | Imbas jawapan pada pembaca ini |
| Kuning | Hint sedang dibuka, atau notis langkau pada LCD |
| Merah | Jawapan salah, kad tidak berdaftar atau jenis kad tidak sesuai |
| Hijau pada satu pembaca | Jawapan betul |
| Hijau pada kedua-dua pembaca | Pusingan tamat; rujuk skor pada LCD |

Kuning untuk hint dan langkau dibezakan melalui tulisan pada LCD.
Hijau pada akhir permainan menandakan pusingan selesai walaupun skor 0/5.

## 1. Hidupkan permainan

LCD membuka menu utama. Kedua-dua RGB padam dan masa belum berjalan.

```text
     GeoDecoder
  Jom uji minda 3D!
NEXT: Mula bermain
HINT: Cara bermain
```

Jika pembaca tidak dikesan atau UID jenis aktif belum lengkap, baris kedua
memaparkan `Minta bantuan guru`. Selesaikan pendaftaran melalui Serial dahulu.

## 2. Lihat cara bermain jika perlu

Tekan **HINT** di menu untuk membuka enam halaman panduan. Tekan HINT lagi
untuk halaman berikutnya; selepas halaman keenam, kembali ke menu.
NEXT tidak memulakan kuiz ketika panduan masih dibuka. Kedua-dua RGB padam.
Panduan mod RGB menerangkan tempat imbas, warna, butang dan markah.

## 3. Tekan NEXT untuk mula

Pusingan baharu bermula dengan skor 0 dan masa 00:00. Masa terus berjalan
ketika murid membaca, menggunakan hint dan mencuba semula.

Pusingan mengandungi sehingga lima soalan rawak tanpa ID berulang. Apabila
semua lima jenis diaktifkan, terdapat lima soalan, satu bagi setiap jenis.
Pilihan jenis aktif dan UID yang telah disimpan dikekalkan.

## 4. Baca soalan dan ikut RGB biru

Hanya pembaca yang diperlukan menyala biru:

- **RGB 1 biru:** pilih satu kad bongkah dan imbas di R1.
- **RGB 2 biru:** pilih satu kad bentangan dan imbas di R2.

RGB pembaca yang lain padam. Kad pada pembaca yang tidak aktif tidak diproses.
Nombor soalan, masa semasa dan skor berada pada baris pertama LCD; tiga
baris bawah digunakan sepenuhnya untuk soalan.

## 5. Jika perlukan hint

Tekan **HINT**. Tiga baris soalan bertukar kepada petunjuk dan RGB pembaca
aktif menjadi **kuning**. Murid masih boleh mengimbas jawapan semasa hint
dibuka. Masa terus berjalan; hint tidak menolak markah.

Tekan HINT lagi untuk kembali kepada soalan yang sama; RGB kembali biru.
Penggunaan hint dikira sekali bagi soalan itu, walaupun dibuka berulang kali.

## 6. Jika jawapan salah

RGB pembaca aktif menjadi **merah selama kira-kira 1.2 saat** dan LCD
meminta murid mencuba lagi. Soalan kekal dan skor tidak berkurang.
Angkat kad, pilih jawapan lain dan imbas semula.

Selepas notis tamat, warna kembali **biru**, atau **kuning** jika hint
masih dibuka. Murid boleh mencuba semula; masa terus berjalan.

Kad tidak berdaftar juga menghasilkan merah tetapi LCD meminta bantuan guru.
Kad bongkah yang diimbas ketika pembaca memerlukan bentangan, atau
sebaliknya, ditolak tanpa memberikan markah.

## 7. Jika jawapan betul

RGB pembaca aktif menjadi **hijau selama kira-kira satu saat**.
LCD memaparkan `Jawapan betul!` dan `Markah: +1`.

Markah diberi sekali sahaja. Selepas notis itu, soalan seterusnya dibuka
secara automatik. RGB pembaca yang diperlukan untuk soalan baharu menjadi
biru. Angkat kad sebelum mengimbasnya untuk soalan baharu.

## 8. Jika mahu langkau

Tekan **NEXT** ketika soalan belum selesai. RGB pembaca aktif menjadi
**kuning selama kira-kira satu saat** dan LCD memaparkan
`Soalan dilangkau.` serta `Markah: +0`.

Kemudian permainan beralih secara automatik. Tekanan NEXT/HINT semasa
notis betul atau langkau tidak dibawa ke soalan berikutnya.

## 9. Ulang sehingga soalan terakhir

Setiap soalan mengikut urutan yang sama: baca, pilih kad, ikut RGB dan imbas.
Jawapan salah tidak menamatkan soalan; betul atau langkau menamatkannya.
Masa terus berjalan antara soalan, termasuk notis yang berkaitan.

## 10. Lihat keputusan akhir

Selepas soalan terakhir dijawab betul atau dilangkau, masa dibekukan tepat
pada tindakan itu. Selepas notis ringkas, kedua-dua RGB menyala **hijau**.
LCD memaparkan skor, peratus dan masa akhir, contohnya:

```text
  PUSINGAN SELESAI
Skor: 4/5 (80%)
Masa akhir: 02:18
NEXT:Lagi HINT:Menu
```

Masa akhir kekal walaupun murid membiarkan paparan keputusan terbuka.

## 11. Main semula atau kembali ke menu

- **NEXT:** pusingan baharu, skor 0 dan masa 00:00. Pembaca aktif kembali biru.
- **HINT:** kembali ke menu; kedua-dua RGB padam.

## Mengaktifkan selepas pemasangan siap

Selagi RGB belum siap dipasang, terus gunakan environment **esp32dev**
untuk dua LED biasa. Selepas siap, pilih **esp32dev-rgb** dalam VS Code /
PlatformIO, kemudian Build dan Upload. Environment default tidak ditukar.

| RGB | R | G | B |
|---|---:|---:|---:|
| RGB 1 / R1 | GPIO25 | GPIO13 | GPIO14 |
| RGB 2 / R2 | GPIO26 | GPIO16 | GPIO17 |

Gunakan resistor berasingan pada setiap saluran dan sambungan common yang
betul mengikut [SAMBUNGAN.md](../SAMBUNGAN.md). RGB biasa empat kaki digunakan.
Dalam mod LED biasa, warna ditunjukkan sebagai LED menyala; tulisan LCD
menjelaskan hint, betul, salah dan langkau.

Mod guru melalui Serial berasingan: `check uid 1/2` menyalakan biru pada
pembaca dipilih, `check uid` pada kedua-duanya, dan `assign` hanya pada
pembaca pendaftaran. Tiada markah diberikan dalam mod itu.

Ujian simulasi dan build firmware tidak menggantikan ujian pada ESP32 sebenar.
