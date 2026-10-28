# Handoff video/tutorial GeoDecoder v2.0.1

Tarikh Malaysia: 28 Oktober 2026. Rujukan flow ialah firmware main/sharing
v2.0.1 dan [GAME_FLOW_RGB.md](GAME_FLOW_RGB.md). Bahan tutorial sedia ada
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

Menu: NEXT mula baharu (0 markah, 00:00); HINT melayari 15 halaman cara main.
Warna rawak menu/panduan setiap 1,000 ms; keputusan setiap 150 ms. R1/R2
sentiasa berlainan warna dan setiap LED turut mengelakkan warnanya sebelum ini.
Keputusan memaparkan skor, peratus dan masa akhir; NEXT main semula, HINT menu.

## Bahan yang masih perlu dikemas kini

- `tutorial/GeoDecoder_Panduan_A-Z.pdf`: flow, contoh LCD, butang, masa,
  15 halaman cara main dan satu build RGB (sebahagian edisi lama masih memilih LED).
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

## Paparan lengkap untuk suntingan PDF/video

Bingkai berikut dieksport terus daripada buildLcdFrame, QUESTIONS dan
LCD_INSTRUCTIONS firmware v2.0.1. Ini simulasi teks, bukan gambar LCD fizikal.
Ruang kanan dipendekkan dalam Markdown; firmware memadatkan setiap baris
hingga tepat 20 aksara. Teks sumber dan semua baris disemak ASCII <=20.

## Menu sebenar

```text
     GeoDecoder
 Jom uji minda 3D!
NEXT: Mula bermain
HINT: Cara bermain
```

## Cara Main pada LCD

HINT dari menu membuka halaman 1; setiap HINT maju satu halaman. NEXT diabaikan sepanjang panduan. HINT selepas halaman terakhir kembali ke menu.

### Halaman 1

```text
CARA MAIN 1/15
Soalan bongkah:
R1 dahulu -> R2
HINT: Seterusnya
```

### Halaman 2

```text
CARA MAIN 2/15
Soalan bentangan:
R2 dahulu -> R1
HINT: Seterusnya
```

### Halaman 3

```text
CARA MAIN 3/15
Biru: Menunggu kad
Reader kedua padam
HINT: Seterusnya
```

### Halaman 4

```text
CARA MAIN 4/15
Kad pertama betul:
Hijau kekal; +0
HINT: Seterusnya
```

### Halaman 5

```text
CARA MAIN 5/15
Dua kad sepadan:
Betul kedua-dua: +1
HINT: Seterusnya
```

### Halaman 6

```text
CARA MAIN 6/15
Kelip hijau 3 kali
Auto soalan baharu
HINT: Seterusnya
```

### Halaman 7

```text
CARA MAIN 7/15
Satu kad salah: +0
Dua LED kelip merah
HINT: Seterusnya
```

### Halaman 8

```text
CARA MAIN 8/15
Merah berterusan
Lihat jawapan+sebab
HINT: Seterusnya
```

### Halaman 9

```text
CARA MAIN 9/15
NEXT/TERUSKAN:
Ke soalan seterusnya
HINT: Seterusnya
```

### Halaman 10

```text
CARA MAIN 10/15
Masa jeda: Kelipan
hijau & skrin salah
HINT: Seterusnya
```

### Halaman 11

```text
CARA MAIN 11/15
HINT: Petunjuk ungu
Pada reader aktif
HINT: Seterusnya
```

### Halaman 12

```text
CARA MAIN 12/15
HINT lagi: Soalan
Masa hint berjalan
HINT: Seterusnya
```

### Halaman 13

```text
CARA MAIN 13/15
NEXT: Langkau (+0)
3 kelip merah, jeda
HINT: Seterusnya
```

### Halaman 14

```text
CARA MAIN 14/15
Soalan akhir tamat:
Paparan keputusan
HINT: Seterusnya
```

### Halaman 15

```text
CARA MAIN 15/15
Angkat & imbas baru
Kad ikut LED biru
HINT: Menu utama
```

## Semua penerangan salah (15 soalan)

### P1 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: PIRAMID
Tapak persegi dan
4 muka segi tiga.
```

### P2 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: PIRAMID
V=luas tapak*t/3
Tapak persegi: a^2
```

### P3 - R2 kemudian R1

```text
SALAH +0 NEXT:Terus
Jawapan: PIRAMID
1 segi empat sama,
4 segi tiga dilipat.
```

### S1 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: SILINDER
2 tapak bulat sama;
sisi melengkung.
```

### S2 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: SILINDER
V=luas tapak*t
L=2*pi*j^2+2*pi*j*t
```

### S3 - R2 kemudian R1

```text
SALAH +0 NEXT:Terus
Jawapan: SILINDER
2 bulatan sama saiz;
1 segi empat tepat.
```

### K1 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
6 muka segi empat
sama saiz dan bentuk
```

### K2 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
V=a*a*a; a=rusuk
L=6 muka, tiap a^2
```

### K3 - R2 kemudian R1

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
6 petak sama saiz
dilipat jadi 6 muka.
```

### C1 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: KON
V=luas tapak*t/3
Tapak bulat: pi*j^2
```

### C2 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: KON
L=tapak+luas sisi
pi*j^2 + pi*j*s
```

### C3 - R2 kemudian R1

```text
SALAH +0 NEXT:Terus
Jawapan: KON
1 sektor jadi sisi;
1 bulatan jadi tapak
```

### B1 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: KUBOID
Panjang,lebar,tinggi
3 ukuran berbeza.
```

### B2 - R1 kemudian R2

```text
SALAH +0 NEXT:Terus
Jawapan: KUBOID
V=luas tapak*t
Tapak=p*l; tinggi=t
```

### B3 - R2 kemudian R1

```text
SALAH +0 NEXT:Terus
Jawapan: KUBOID
2 muka setiap saiz:
6x4, 6x3 dan 4x3 cm
```

## Contoh soalan, hint, betul dan keputusan

K1 bermula dengan R1 biru dan R2 padam:

```text
Q1/5 R1 00:14   S0/5
Enam muka berbentuk
segi empat sama.
Bongkah apakah ini?
```

HINT: R1 ungu, R2 padam; masa terus berjalan:

```text
Q1/5 R1 00:19   S0/5
HINT: 12 rusuk sama
panjang. Setiap muka
sama bentuk dan saiz
```

Kad pertama betul: R1 hijau, R2 biru, skor masih 0:

```text
Q1/5 R2 00:20   S0/5
Enam muka berbentuk
segi empat sama.
Bongkah apakah ini?
```

Kad kedua betul: +1 dan kelipan hijau bersama 900 ms; masa beku:

```text
Q1/5 R2 00:21   S1/5
Jawapan betul!
Markah: +1
Ke soalan seterusnya
```

Keputusan contoh daripada satu betul dan empat langkau:

```text
  PUSINGAN SELESAI
Skor: 1/5 (20%)
Masa akhir: 00:21
NEXT:Lagi HINT:Menu
```
