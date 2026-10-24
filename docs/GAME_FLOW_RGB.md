# Flow GeoDecoder: dua kad dan dua RGB

Setiap soalan memerlukan **kad model/gambar bongkah di R1 dahulu, kemudian
kad bentangan di R2**. Kedua-duanya mesti mewakili jenis bongkah jawapan
soalan yang sama. Ini menggantikan peraturan lama satu kad setiap soalan.

## Warna mengikut tahap

| Keadaan | RGB R1 | RGB R2 | Markah / masa |
|---|---|---|---|
| Menu atau enam halaman cara main | Warna rawak perlahan | Warna rawak perlahan | Masa berhenti; tukar warna setiap 1,000 ms |
| Mula soalan; menunggu bongkah | Biru | Padam | Masa berjalan |
| Hint bongkah dibuka | Kuning | Padam | Masa berjalan; tiada potongan markah |
| Bongkah salah / kad tidak sah | Merah | Padam | Cuba semula R1; tiada markah |
| Bongkah betul; menunggu bentangan | Hijau kekal | Biru | Belum mendapat markah; masa berjalan |
| Hint bentangan dibuka | Hijau kekal | Kuning | Masa berjalan |
| Bentangan salah / kad tidak sah | Hijau kekal | Merah | Cuba semula R2 sahaja |
| Kedua-duanya betul | Hijau berkelip bersama | Hijau berkelip bersama | +1 sekali sahaja; masa dijeda |
| NEXT melangkau mana-mana tahap | Merah berkelip bersama | Merah berkelip bersama | +0; masa dijeda |
| Keputusan akhir | Warna rawak pantas | Warna rawak pantas | Masa akhir beku; tukar warna setiap 150 ms |

Warna rawak dipilih secara berasingan bagi dua RGB daripada biru, hijau,
merah, kuning, sian, magenta dan putih. Setiap kemas kini memilih warna lain
daripada warna sebelumnya. Putaran warna tidak membaca kad atau memberi markah.

## Menu dan pusingan baharu

**NEXT** pada menu memulakan pusingan baharu dengan skor 0 dan masa 00:00.
**HINT** membuka cara bermain; HINT seterusnya menggerakkan enam halaman,
kemudian kembali ke menu. NEXT kekal tidak aktif ketika panduan dibuka.
Putaran warna perlahan berterusan dalam panduan.

Kedua-dua pembaca mesti READY dan semua jenis aktif mesti mempunyai pasangan
UID lengkap. Jika belum, LCD memaparkan `Minta bantuan guru`.

Bank semasa kekal 15 soalan. Pusingan memilih sehingga lima ID unik; apabila
lima jenis aktif, satu soalan dipilih bagi setiap jenis. Teks, hint, ID dan
pilihan jenis aktif dikekalkan. Semua soalan, termasuk yang metadata lamanya
menyasarkan bentangan, kini dijawab melalui kedua-dua tahap R1 kemudian R2.

## Menjawab satu soalan

1. R1 biru dan R2 padam. Baca soalan dan imbas kad bongkah di R1.
2. Jika salah, R1 merah selama notis 1,200 ms. Kemudian kembali biru, atau
   kuning jika hint masih dibuka. Soalan dan tahap kekal; angkat kad dan cuba lagi.
3. Jika betul, R1 kekal hijau dan R2 menjadi biru. Hint yang sedang dibuka
   ditutup. Soalan sama; **tiada markah diberikan pada tahap ini**.
4. Pilih kad bentangan sepadan dan imbas di R2. R2 belum menerima jawapan
   sebelum tahap R1 selesai. Kad yang sudah berada di R2 perlu diangkat dahulu.
5. Jika bentangan salah, R2 merah selama notis 1,200 ms; R1 kekal hijau.
   Cuba semula bentangan sahaja. R2 kemudian kembali biru/kuning mengikut hint.
6. Apabila bentangan betul, tambah satu markah sekali sahaja dan jalankan
   urutan hijau di bawah. Input berulang tidak boleh menambah markah lagi.

Kad belum berdaftar ditolak. Kad yang berdaftar untuk peranan lain juga ditolak,
walaupun jenis bongkahnya betul. UID dan pendaftaran asal kekal digunakan.

## Hint

HINT membuka petunjuk bank bagi soalan semasa; HINT sekali lagi kembali kepada
soalan. Hanya pembaca yang menunggu jawapan menjadi kuning. Murid boleh mengimbas
ketika hint dibuka. Masa terus berjalan dan hint tidak menolak markah. Statistik
hint dikira sekali bagi setiap soalan walaupun dibuka pada kedua-dua tahap.

## Tiga kelipan dan stopwatch

Betul kedua-dua kad menghasilkan hijau; NEXT pada tahap bongkah **atau**
bentangan menghasilkan merah dengan +0, termasuk jika R1 sudah betul.
Kedua-dua LED menggunakan urutan yang sama serentak:

| Masa sejak tindakan | Kedua-dua LED |
|---|---|
| 0 hingga kurang 150 ms | ON |
| 150 hingga kurang 300 ms | OFF |
| 300 hingga kurang 450 ms | ON |
| 450 hingga kurang 600 ms | OFF |
| 600 hingga kurang 750 ms | ON |
| 750 hingga kurang 900 ms | OFF |
| 900 ms | Buka soalan baharu atau keputusan akhir |

Stopwatch dijeda pada tindakan betul/langkau dan kekal dijeda sepanjang urutan.
Loop aplikasi terus memproses kemas kini tanpa `delay()`. Jawapan, NEXT dan HINT
diabaikan sepanjang kelipan. Debounce butang menahan tekanan yang bermula dalam
urutan itu sehingga butang dilepaskan; tekanan tersebut tidak dibawa ke skrin baru.

Soalan seterusnya bermula semula di R1 biru, R2 padam, hint tertutup dan kemajuan
dua kad kosong. Stopwatch bersambung apabila soalan dibuka. Kad yang masih berada
di pembaca mesti diangkat dan diimbas semula; ia tidak boleh menjawab secara automatik.

## Keputusan akhir

Pada soalan terakhir, masa akhir dibekukan **tepat ketika bentangan betul atau
NEXT ditekan**, kemudian tiga kelipan diselesaikan dahulu. Selepas 900 ms,
LCD menunjukkan skor, peratus dan masa akhir. Contoh:

```text
  PUSINGAN SELESAI
Skor: 4/5 (80%)
Masa akhir: 02:18
NEXT:Lagi HINT:Menu
```

Putaran rawak pantas setiap 150 ms berterusan sepanjang paparan keputusan;
stopwatch kekal berhenti. NEXT memulakan pusingan baharu pada 0 dan 00:00,
R1 biru/R2 padam. HINT kembali ke menu dengan putaran perlahan 1,000 ms.

## LCD dan mod LED biasa

LCD kekal 20x4. Baris atas menambah tahap aktif tanpa mengurangkan tiga baris
soalan/hint, contohnya `Q1/5 R1 00:14   S0/5` kemudian
`Q1/5 R2 00:18   S0/5`. Isi bank tidak diubah oleh kerja flow ini.

Environment **esp32dev** kekal default untuk LED biasa GPIO25/26. Dalam mod ini,
semua warna selain padam dipetakan kepada LED ON: R1 sahaja pada tahap pertama,
kedua-duanya ON pada tahap bentangan, dan tiga kelipan ON/OFF pada tamat/langkau.
Di menu/keputusan kedua-dua LED biasa kekal ON kerana tiada saluran warna;
label R1/R2 serta notis LCD menerangkan tindakan. Pin G/B tidak digunakan.

Apabila pemasangan RGB empat kaki siap, Build/Upload environment
**esp32dev-rgb** dalam VS Code + PlatformIO. GPIO dan polariti sedia ada kekal;
rujuk [SAMBUNGAN.md](../SAMBUNGAN.md). Tiada pertukaran board atau format NVS.

## Fungsi guru

`check uid`, `check uid 1/2` dan `assign` kekal tersedia tanpa pemarkahan.
Semakan/pendaftaran menggunakan biru pada pembaca yang dipilih. `stop` menjeda
masa; Serial `play` menyambung soalan tetapi memerlukan pasangan baharu dari R1.
`retry`/`clear` memulakan semula percubaan pasangan dari R1 tanpa menolak markah.
Perubahan pendaftaran/jenis aktif membatalkan pusingan lama seperti sebelumnya.
Jangan gunakan erase flash untuk upload rutin jika mahu mengekalkan UID.

Simulasi, build ESP32, upload USB dan ujian fizikal dilaporkan berasingan dalam
[rekod pengesahan](../VERIFICATION.md).
