# Handoff video/tutorial GeoDecoder v2.0.0

Tarikh Malaysia: 28 Oktober 2026. Rujukan flow ialah firmware main/sharing
v2.0.0 dan [GAME_FLOW_RGB.md](GAME_FLOW_RGB.md). Bahan tutorial sedia ada
dikekalkan; dokumen ini menjadi rujukan untuk suntingan seterusnya.

## Perkara yang mesti ditunjukkan

| Fokus soalan | Urutan imbasan | Warna awal R1/R2 | Selepas kad pertama betul |
|---|---|---|---|
| Bongkah: ciri/formula | Bongkah R1 -> bentangan R2 | Biru / padam | Hijau / biru, +0 dahulu |
| Bentangan | Bentangan R2 -> bongkah R1 | Padam / biru | Biru / hijau, +0 dahulu |

R1 dan R2 mengekalkan peranan fizikalnya. Kedua-dua kad mesti sepadan dengan
jenis jawapan soalan yang sama. Kad pertama boleh diangkat; tidak perlu kedua-dua
kad berada pada reader serentak. Kad yang sudah diletakkan terlalu awal atau
tidak diangkat tidak menjawab tahap/soalan seterusnya secara automatik.

**Butang:** NEXT/TERUSKAN ialah B1, GPIO32. HINT ialah B2, GPIO33. Default active
LOW dengan debounce 40 ms. Jangan menukar label mengikut warna fizikal butang.
Satu tekanan stabil memberi satu tindakan; menahan NEXT tidak melangkau dua soalan.

**Hint:** HINT membuka/menutup petunjuk. Reader aktif ungu (merah+biru), reader
yang sudah betul kekal hijau. Masa berjalan, imbasan diterima, tiada potongan markah.
Soalan/hint biasa tidak memaparkan nama jawapan atau penerangan salah.

## Jawapan salah

Salah pada kad pertama atau kedua terus +0 muktamad. Skor sebelumnya kekal.
Masa dijeda tepat pada scan salah. Kedua-dua LED merah berkelip serentak
**150 ms ON + 150 ms OFF berterusan hingga NEXT**; jangan tunjuk auto-advance
900 ms untuk keadaan salah. HINT/kad/retry tidak membuka peluang markah semula.

Paparan LCD sebenar K1; baris maksimum 20 aksara ASCII, ruang kanan dipad:

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
6 muka segi empat
sama saiz dan bentuk
```

Semua 15 sebab berbeza mengikut soalan: lihat
[penerangan LCD sebenar](LCD_QUESTION_REVIEW.md#penerangan-salah-sebenar-bagi-15-soalan).
Contoh formula C2:

```text
SALAH +0 NEXT:Terus
Jawapan: KON
L=tapak+luas sisi
pi*j^2 + pi*j*s
```

NEXT menghentikan merah, membuka soalan baharu dan menyambung masa. Jika
soalan terakhir, NEXT membuka keputusan akhir dan masa kekal beku.
Stop/play atau semakan guru mengekalkan keputusan salah; play memulihkan
penerangan tanpa markah baharu. Diagnostik boleh mengambil alih paparan untuk
penyelenggaraan; selepas kembali play, keputusan masih dikunci.

UID tidak didaftarkan/peranan kad salah ialah notis bantuan 1,200 ms pada
reader aktif, bukan keputusan soalan salah. Masa berjalan, tahap/skor kekal;
minta bantuan guru. Reader tidak membaca atau tidak READY juga bukan jawapan.

## Betul, langkau dan masa

- Kad kedua betul: +1 sekali sahaja, kedua-dua LED hijau tiga kali.
- NEXT ketika masih menjawab: +0, kedua-dua LED merah tiga kali.
- Kedua-duanya 150 ms ON + 150 ms OFF, tepat tiga kitaran, jumlah 900 ms.
  Masa dijeda pada tindakan; kad/NEXT/HINT diabaikan sepanjang urutan.
- Selepas 900 ms, automatik ke soalan berikut ikut fokus sendiri dan masa
  bersambung. Soalan terakhir terus ke keputusan dengan masa beku pada tindakan.
- Salah menunggu NEXT selama mana pun tidak menambah masa. Pada soalan terakhir,
  masa beku pada scan salah, bukan pada NEXT yang kemudian ditekan.

Menu: NEXT mula baharu (0 markah, 00:00); HINT melayari lapan halaman cara main.
Warna rawak menu/panduan setiap 1,000 ms; keputusan setiap 150 ms. R1/R2
sentiasa berlainan warna dan setiap LED turut mengelakkan warnanya sebelum ini.
Keputusan memaparkan skor, peratus dan masa akhir; NEXT main semula, HINT menu.

## Bahan yang masih perlu dikemas kini

- `tutorial/GeoDecoder_Panduan_A-Z.pdf`: flow, contoh LCD, butang, masa,
  lapan halaman cara main dan satu build RGB (sebahagian edisi lama masih memilih LED).
- `tutorial/GeoDecoder_Cara_Bermain_Murid.pdf`: dua urutan, salah tamat +0,
  merah berterusan, jawapan/sebab dan NEXT/TERUSKAN.
- `docs/lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf` dan
  `docs/lcd/GeoDecoder_15_Contoh_LCD_PNG.zip`: header soalan bentangan R2 dahulu,
  kemudian tambah 15 penerangan salah. Isi soalan/hint asal masih sama.
- Video/tutorial yang menggunakan flow lama perlu rakaman/suntingan bahagian
  tersebut. Tiada fail video baharu diterbitkan bersama kemas kini firmware ini.

Tujuh PDF sedia ada, termasuk bentangan bongkah daripada kerja tutorial terkini,
dikekalkan tanpa perubahan. Aset cetakan kad/bentangan tidak memerlukan perubahan
kerana flow ini. Simulasi dan build bukan bukti ujian papan sebenar; USB upload
serta bacaan RFID/LCD/warna/button fizikal masih perlu disahkan pada pemasangan.
