# GeoDecoder — kemas kini LCD 20x4

**Untuk VS Code + PlatformIO, ikut [README.md](README.md).** Buka folder repo yang mengandungi `platformio.ini`, kemudian pilih Build, Upload dan Monitor daripada Project Tasks. Pilih `esp32dev` untuk LED biasa atau `esp32dev-rgb` untuk dua RGB.

Panduan di bawah ialah rujukan pakej Arduino asal. Kod lengkap dalam folder `main`. Jika menggunakan Arduino IDE, buka **`main/main.ino`**. Semua tab `.ino` dan `.h` dalam folder itu mesti digunakan bersama; gantikan seluruh folder lama supaya tiada campuran versi.

## Muat naik

1. Extract ZIP ini ke folder baharu.
2. Buka `main/main.ino` dan pilih **ESP32 Dev Module** untuk ESP32 klasik/WROOM-32 seperti kod asal.
3. Gunakan library **MFRC522** dan **hd44780** (Bill Perry), serta library bawaan ESP32 **Preferences**, **SPI** dan **Wire**.
4. Pilih mod LED dalam `main/config.h` seperti di bawah, kemudian Verify dan Upload.
5. UID lama dimuatkan daripada NVS asal. Kekalkan NVS semasa upload untuk menggunakan pendaftaran yang telah dibuat.

Pemetaan GPIO, ID bongkah, ruang NVS `geomath_q2`, key `registry`, magic dan versi simpanan dikekalkan.

## LED biasa atau RGB

Default menyokong dua LED biasa yang menggunakan pin asal:

| LED/pembaca | GPIO |
|---|---:|
| LED R1 — bongkah | 25 |
| LED R2 — bentangan | 26 |

Jika dua RGB sudah dipasang, ubah satu baris dalam `config.h`:

```cpp
#define GEODECODER_RGB_ENABLED 1
```

| RGB | R | G | B |
|---|---:|---:|---:|
| R1 | 25 | 13 | 14 |
| R2 | 26 | 16 | 17 |

`RGB_COMMON_ANODE = false` untuk common ke GND; gunakan `true` jika common anode. Setiap saluran LED memerlukan resistor seperti sambungan asal.

Semasa soalan, hanya LED pembaca yang diperlukan menyala. Dalam mod RGB:
biru menandakan tempat imbas; kuning untuk hint atau notis langkau; hijau
untuk jawapan betul; merah untuk jawapan salah/kad tidak sah. Selepas notis
salah tamat, warna kembali biru atau kuning jika hint masih dibuka.
Kedua-dua RGB hijau pada keputusan akhir, sebagai tanda pusingan selesai.

Panduan penuh **[flow RGB satu per satu](docs/GAME_FLOW_RGB.md)** menerangkan
menu, butang, imbasan, hint, percubaan semula, langkau dan keputusan.

## Aktifkan semua lima bongkah

Jika semua sepuluh UID sudah didaftarkan, buka Serial Monitor **115200 baud**, pilih Newline, kemudian jalankan sekali:

```text
current
use kubus piramid silinder kon kuboid
```

Selepas itu permainan boleh dimulakan dengan butang fizikal. Pilihan ini disimpan dalam NVS.

Tetapan jenis aktif daripada firmware lama dikekalkan. Jika dahulu hanya tiga jenis aktif, bank permainan menggunakan jenis itu sehingga arahan `use` di atas dijalankan. Jika UID belum lengkap, gunakan `tags`, `help` dan arahan `assign r1 <jenis>` / `assign r2 <jenis>` seperti sebelum ini.

Setiap jenis mempunyai UID bongkah R1 dan UID bentangan R2 untuk menyokong semua jenis soalan. **Satu soalan hanya memerlukan satu kad pada pembaca yang ditunjukkan LED.**

## Butang dan paparan

| Keadaan | NEXT / B1 / GPIO32 | HINT / B2 / GPIO33 |
|---|---|---|
| Menu utama | Mula pusingan baharu | Buka cara main halaman 1/6 |
| Cara main | Kekal pada panduan | Maju satu halaman; selepas 6/6 kembali ke menu |
| Soalan atau hint | Langkau dengan +0 markah | Buka hint; tekan lagi untuk kembali ke soalan |
| Notis betul/langkau | Tunggu notis selesai | Tunggu notis selesai |
| Keputusan akhir | Mula semula pada Q1, masa 00:00 dan skor 0 | Kembali ke menu |

- Soalan normal menggunakan **satu kad bongkah pada R1**; soalan bentangan menggunakan **satu kad bentangan pada R2**.
- Jawapan betul memberi **+1 sekali sahaja**, diikuti notis kira-kira satu saat sebelum beralih secara automatik.
- Jawapan salah memberi peluang mencuba semula soalan yang sama. NEXT sentiasa boleh digunakan untuk langkau soalan belum selesai dengan +0.
- Angkat kad sebelum mengimbasnya untuk soalan baharu. Kad yang terus diletakkan tidak dikira sebagai jawapan baharu.
- Tekanan yang dibuat semasa notis tidak dibawa ke soalan atau keputusan berikutnya.
- Baris pertama permainan: `Q1/5    00:14   S0/5`. Tiga baris bawah memaparkan soalan atau hint, maksimum 20 aksara sebaris.
- Masa terus berjalan ketika membaca soalan, hint dan notis antara soalan. Masa berhenti tepat apabila soalan terakhir dijawab betul atau dilangkau.
- Lima halaman panduan pertama tidak mengandungi `HINT: Seterusnya`; halaman terakhir mengekalkan `HINT: Menu utama` seperti gambar rujukan.
- Keputusan akhir memaparkan skor, peratus dan masa akhir.

## Bank soalan

| Bongkah | Sifat/objek harian — R1 | Formula — R1 | Bentangan — R2 |
|---|---|---|---|
| Piramid tapak segi empat sama | P1 | P2 | P3 |
| Silinder | S1 | S2 | S3 |
| Kubus | K1 | K2 | K3 |
| Kon | C1 | C2 | C3 |
| Kuboid | B1 | B2 | B3 |

Kesemua 10 soalan bongkah R1 dikekalkan, termasuk P1 tentang muka/bucu/rusuk dan P2 tentang rumus. Lima soalan bentangan R2 diubah supaya murid mentafsir ukuran, isi padu atau luas permukaan sebelum memilih kad bentangan. Soalan R2 tidak menyebut nama bongkah. Semua 15 hint membimbing langkah berfikir tanpa menyatakan jawapan atau menyenaraikan kepingan bentangan.

Setiap soalan dan hint menggunakan tiga baris, maksimum 20 aksara ASCII sebaris. `V` ialah isi padu, `L` luas permukaan keseluruhan, `t` tinggi tegak, `a` panjang sisi tapak persegi atau rusuk mengikut soalan, `r` jejari, dan `s` tinggi condong. `pi`, `*` dan `^` digunakan untuk keserasian LCD.

Contoh P3:

```text
Tapak persegi:a=6cm
t=5cm; V=60cm^3
Cari bentangannya.
```

Hint P3:

```text
HINT: Luas tapak
darab tinggi dahulu;
banding dengan V.
```

Dengan lima jenis aktif, setiap pusingan mengandungi lima soalan rawak: satu daripada setiap jenis. ID soalan tidak berulang dalam pusingan itu. Jika hanya sebahagian jenis diaktifkan, pusingan menggunakan sehingga lima ID unik; satu jenis sahaja mempunyai tiga soalan.

## Arahan Serial dikekalkan

`help`, `pins`, `status`, `tags`, `bank`, `current`, `use`, `set bongkah`, `check uid`, `assign`, `unassign`, `play`, `stop`, `next`, `hint`, `retry`, `clear`, `score`, `round new` masih tersedia. Serial `stop` menjeda permainan untuk penyelenggaraan dan `play` boleh menyambung; NEXT pada menu memulakan pusingan baharu.

## Sambungan asal

| Komponen | GPIO |
|---|---|
| RFID R1 SS / R2 SS | 5 / 27 |
| RFID RST bersama | 4 |
| SPI SCK / MISO / MOSI | 18 / 19 / 23 |
| LCD SDA / SCL | 21 / 22 |
| NEXT / HINT | 32 / 33 |

## Semakan

Folder `tests` menjalankan kod `.ino` sebenar dengan simulasi sambungan peranti. `python3 tests/run_tests.py` menyemak mod LED biasa; tambah `--rgb` untuk RGB. Persekitaran memerlukan Python 3 dan G++.

Semakan native C++ dan simulasi merangkumi menu/panduan, semua 15 soalan dan hint, pemarkahan satu imbasan, langkau, masa/keputusan akhir, pembaca tunggal, kad yang tidak diangkat, butang fizikal, LED dan pemuatan NVS. Keputusan semakan repo terkini berada dalam `VERIFICATION.md`; upload dan ujian fizikal boleh dibuat terus melalui PlatformIO dalam VS Code.
