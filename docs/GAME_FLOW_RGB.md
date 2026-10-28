# Flow GeoDecoder v2.0.0: urutan ikut fokus dan salah dimuktamadkan

Dokumen ini menggantikan aturan lama R1 sentiasa dahulu dan salah boleh cuba
semula. Sumber runtime ialah `main/question_bank.h` dan pure `QuizEngine`.

## Peranan dan urutan

R1 sentiasa **bongkah**; R2 sentiasa **bentangan**. Tiada perubahan wayar/GPIO.
`Question.focus` bertip menentukan urutan, tanpa mencari perkataan dalam teks:

| Fokus metadata | Kad pertama | Kad kedua |
|---|---|---|
| SOLID: soalan ciri/formula bongkah (P1/P2, S1/S2, K1/K2, C1/C2, B1/B2) | Bongkah R1 | Bentangan R2 |
| NET: soalan bentangan (P3, S3, K3, C3, B3) | Bentangan R2 | Bongkah R1 |

Kedua-dua kad mesti mewakili jenis jawapan **soalan yang sama**. Kad pertama
betul belum mendapat markah. Ini imbasan berurutan: kad pertama boleh diangkat
sebelum kad kedua diimbas; tiada syarat kedua-duanya kekal di atas pad serentak.

Reader pertama biru, kedua padam. Selepas kad pertama betul, reader itu kekal
hijau dan reader kedua biru. Header LCD menunjukkan reader aktif:

```text
Q1/5 R2 00:14   S0/5
Pilih bentangan bagi
1 segi empat sama
dan 4 segi tiga.
```

Ruang kosong LCD dipad di sebelah kanan. Semua isi soalan/hint asal kekal.
Bank mempunyai 15 soalan dan pusingan sehingga lima ID unik; lima jenis aktif
memberi tepat satu soalan rawak setiap jenis.

## Warna dan masa

| Keadaan | R1 | R2 | Masa / keputusan |
|---|---|---|---|
| Menu / 8 halaman cara main | Rawak perlahan | Rawak perlahan | Berhenti; sela 1,000 ms |
| Fokus bongkah, tahap pertama | Biru | Padam | Berjalan |
| Bongkah betul, tahap kedua | Hijau | Biru | Berjalan; +0 setakat ini |
| Fokus bentangan, tahap pertama | Padam | Biru | Berjalan |
| Bentangan betul, tahap kedua | Biru | Hijau | Berjalan; +0 setakat ini |
| HINT | Ungu jika aktif, hijau jika sudah betul | Ungu jika aktif, hijau jika sudah betul | Berjalan |
| Mana-mana jawapan salah | Merah kelip bersama | Merah kelip bersama | +0 muktamad; dijeda hingga NEXT |
| Kad kedua betul | Hijau kelip bersama | Hijau kelip bersama | +1 sekali; dijeda 900 ms |
| NEXT ketika menjawab | Merah kelip bersama | Merah kelip bersama | +0; dijeda 900 ms |
| Keputusan akhir | Rawak pantas | Rawak pantas | Beku; sela 150 ms |

Ungu ialah MAGENTA, saluran merah + biru. HINT membuka/menutup petunjuk,
imbasan masih diterima, tiada potongan markah. Petunjuk tahap pertama ditutup
apabila kad pertama betul. Statistik hint dikira sekali setiap soalan.

Pasangan warna rawak sentiasa berlainan antara R1/R2 dan setiap LED turut
mengelakkan warnanya sendiri sebelum ini. Polisi serta timing diagnostik
`test/led/random` (500 ms) dikekalkan. Warna hiasan tidak memberi markah.

## Dua kad betul atau langkau

Kad kedua betul memberi **+1 sekali sahaja**. NEXT semasa masih menjawab
melangkau dengan **+0**, termasuk selepas kad pertama betul. Skor terkumpul
sebelumnya kekal. Masa dijeda tepat pada tindakan tersebut.

Kedua-dua LED berkelip serentak, hijau untuk betul atau merah untuk langkau:

| Umur tindakan | Output |
|---|---|
| 0..<150 ms | ON |
| 150..<300 ms | OFF |
| 300..<450 ms | ON |
| 450..<600 ms | OFF |
| 600..<750 ms | ON |
| 750..<900 ms | OFF |
| 900 ms | Soalan baharu / keputusan akhir |

Tepat tiga kelipan, jumlah 900 ms. Loop terus berjalan tanpa `delay()`.
Kad/NEXT/HINT/retry diabaikan dalam urutan automatik ini. Tekanan yang bermula
ketika urutan disekat tidak dibawa ke soalan/keputusan selepasnya.

Soalan baharu mengosongkan kemajuan, menutup hint, memilih reader pertama
mengikut fokusnya sendiri dan menyambung masa ketika dibuka. Reader baharu
memerlukan tiga poll kosong sebelum diarm semula. Kad yang diletakkan terlalu
awal atau tidak diangkat tidak boleh menjawab tahap/soalan seterusnya.

## Salah pada mana-mana tahap

Satu **kad jawapan berdaftar dengan peranan betul tetapi jenis salah** terus
memuktamadkan soalan sebagai salah, sama ada kad pertama atau kedua. +0;
skor sebelumnya kekal. Tiada percubaan semula untuk soalan itu.

1. Pada timestamp scan salah, masa dijeda serta-merta dan kedua-dua reader
   dihentikan. Hint ditutup.
2. State `WRONG_ANSWER` memegang soalan/jawapan sebenar. Kedua-dua LED merah
   berkelip bersama 150 ms ON + 150 ms OFF **berterusan tanpa had kitaran**.
3. LCD kekal menunjukkan jawapan serta sebab. Kad/HINT/retry/clear tidak
   menukar keputusan, skor, soalan atau masa.
4. **NEXT/TERUSKAN = B1, GPIO32**, active LOW mengikut config asal. Ia tetap
   diterima dalam keadaan ini. Warna fizikal butang bukan sumber pemetaan.
5. NEXT menghentikan kelipan dan terus membuka soalan berikutnya; masa
   bersambung pada pembukaan. Satu tekanan ditahan hanya satu tindakan.
6. Jika soalan terakhir, NEXT membuka keputusan akhir; masa tidak bersambung.

Contoh sebenar K1 pada LCD 20x4 (ruang kanan dipad oleh driver):

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
6 muka segi empat
sama saiz dan bentuk
```

Nama dibina daripada enum jawapan sebenar, bukan kad salah yang diimbas.
Dua baris sebab tersimpan pada setiap soalan. Semua 15 penerangan dan panduan
LCD diuji untuk ASCII dan had 20 aksara. Senarai bingkai:
[LCD_QUESTION_REVIEW.md](LCD_QUESTION_REVIEW.md). Soalan/hint biasa tidak
membaca medan jawapan/penerangan untuk dipaparkan.

## UID, peranan dan masalah pembaca

UID belum didaftarkan (`UNKNOWN_UID`) atau kad untuk peranan lain (`WRONG_PAD`)
ialah notis bantuan, **bukan keputusan jawapan salah**. Reader aktif merah
sementara 1,200 ms, kemudian kembali biru/ungu; reader yang sudah betul kekal
hijau. Markah, tahap dan kiraan salah tidak berubah; masa terus berjalan.
Murid boleh mengimbas kad yang sah. Serial meminta bantuan guru/`assign` atau
mengikut reader aktif; LCD menerangkan kad belum didaftar/ikut LED.

Pembaca tanpa respons tidak menghasilkan jawapan. Mula/sambung permainan
memerlukan kedua-duanya READY; mesej Serial meminta semak status, bekalan dan
SPI. `status`, `check uid`, `test/rfid/check` dan pendaftaran kekal tersedia.
READY ialah respons register, bukan bukti antena membaca kad sebenar.

## Menu, keputusan dan penyelenggaraan

NEXT pada menu memulakan pusingan baharu (skor 0, 00:00). HINT menggerakkan
lapan halaman panduan lalu kembali ke menu; NEXT tidak keluar daripada panduan.

Pada soalan terakhir, masa akhir dibekukan ketika kad kedua betul, kad salah
atau langkau disahkan. Betul/langkau menyelesaikan tiga kelipan dahulu; salah
menunggu NEXT. Kemudian paparan sebenar, contohnya:

```text
  PUSINGAN SELESAI
Skor: 4/5 (80%)
Masa akhir: 02:18
NEXT:Lagi HINT:Menu
```

NEXT pada keputusan memulakan pusingan baharu. HINT kembali ke menu perlahan.
`stop`, semakan UID dan diagnostik menjeda kuiz. `play` menyambung soalan yang
masih boleh dijawab dengan pasangan baharu ikut fokus. **Jika sudah salah,
play memulihkan penerangan salah dan mengekalkan masa beku**. Retry/clear
hanya berfungsi ketika masih menjawab. `round new` ialah reset pusingan baharu
secara sengaja; perubahan pendaftaran/jenis aktif juga membatalkan pusingan
seperti kontrak terdahulu. Tiada jalan untuk menambah markah pada soalan salah.

## Build dan bahan tutorial

Satu RGB default: `esp32dev-rgb` di main, `esp32dev-sharing-rgb` di sharing.
Kedua-duanya label Serial `env=esp32dev-rgb`, versi firmware sama. R1 RGB
R/G/B=13/14/25, R2=16/17/26. NEXT=GPIO32, HINT=GPIO33. UID/NVS, board klasik
ESP32 dan dependency dipin kekal. Upload rutin tidak memerlukan erase flash.

PDF A-Z, cara bermain murid, PDF 15 LCD dan set PNG masih edisi terdahulu.
Ia perlu kemas kini bagi urutan ikut fokus, salah +0 yang menunggu NEXT,
penerangan LCD, lapan halaman panduan dan masa beku. Video/tutorial perlu
merekod semula bahagian tersebut. PDF kad/bentangan cetak tidak berubah oleh
flow ini; aset baharu daripada kerja tutorial lain dikekalkan.

Simulasi, kompilasi ESP32, upload USB dan ujian fizikal dilaporkan berasingan
dalam [VERIFICATION.md](../VERIFICATION.md).
