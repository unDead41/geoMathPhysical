# GeoDecoder

Kuiz geometri 3D menggunakan ESP32 klasik/WROOM-32, dua pembaca MFRC522,
LCD I2C 20x4, dua butang dan dua LED biasa atau dua RGB empat kaki.

**Aliran kerja utama: VS Code + PlatformIO IDE.** Build, Upload dan Serial
Monitor tersedia terus dalam VS Code. Arduino IDE tidak diperlukan.

## 1. Buka projek dalam VS Code

Pasang [PlatformIO IDE](https://marketplace.visualstudio.com/items?itemName=platformio.platformio-ide)
melalui Extensions (`Ctrl+Shift+X`), kemudian tunggu pemasangan selesai.

Clone repo, contohnya melalui terminal VS Code:

```powershell
cd "$env:USERPROFILE\Desktop"
git clone https://github.com/unDead41/geodecoder.git
cd geodecoder
code .
```

Untuk repo private, log masuk akaun GitHub sendiri apabila Git meminta.
Jika tidak menggunakan Git CLI, pilih **Source Control > Clone Repository**,
masukkan URL repo dan buka folder yang diklon.

Buka **folder `geodecoder` yang mengandungi `platformio.ini`**. PlatformIO
akan memasang platform ESP32 dan library yang ditetapkan secara automatik.
Pemasangan pertama memerlukan Internet dan mengambil masa lebih lama.
Jangan cipta projek PlatformIO baharu atau pindahkan hanya satu fail `.ino`.

## 2. Pilih LED dan Build

Dalam panel PlatformIO > **Project Tasks**, pilih environment yang sepadan:

| Environment | Perkakasan |
|---|---|
| `esp32dev` (default) | Dua LED biasa: GPIO25 dan GPIO26 |
| `esp32dev-rgb` | Dua RGB empat kaki: R1=25/13/14, R2=26/16/17 |

Pilih **General > Build** di bawah environment itu. Build boleh dijalankan
tanpa ESP32 disambungkan. Tunggu keputusan `SUCCESS`.

RGB menggunakan common cathode secara default. Jika common anode ke 3V3,
ubah `RGB_COMMON_ANODE` kepada `true` dalam `main/config.h`.

## 3. Upload ke ESP32

1. Sambungkan ESP32 klasik/WROOM-32 kepada komputer menggunakan kabel USB data.
2. Tutup Serial Monitor lain yang sedang menggunakan port tersebut.
3. Pilih **General > Upload** di bawah environment yang dipilih tadi.
4. Jika tersekat pada `Connecting...`, tahan **BOOT** sehingga sambungan
   bermula, kemudian lepaskan. Selepas upload, tekan **EN/RESET** jika perlu.
5. Jika port tidak dikesan, semak Device Manager untuk nombor COM dan driver
   USB-UART yang sepadan dengan cip pada board.

Port biasanya dikesan automatik. Jika perlu memilih port sendiri, salin
`platformio.local.ini.example` sebagai `platformio.local.ini` dan gantikan
`COM5` dengan port sebenar. Jangan ubah `platformio.ini` untuk COM komputer
sendiri.

Upload firmware biasa tidak memadam ruang NVS yang menyimpan UID. Elakkan
**Erase Flash** atau `pio run -t erase` jika mahu mengekalkan pendaftaran kad.
Namespace `geomath_q2`, key `registry`, ID bongkah dan format simpanan asal
dikekalkan. Jika board pernah menggunakan susunan partition tersuai, semak
susunan itu sebelum upload.

## 4. Uji perkakasan dan daftar kad

Buka **General > Monitor** bagi environment yang sama. Kelajuan ditetapkan
kepada **115200 baud**, dan arahan dihantar selepas menekan Enter.

Taip satu per satu:

```text
help
pins
status
tags
current
check uid 1
```

Imbas kad di R1 untuk menyemak bacaan. Kemudian:

```text
check uid 2
```

Imbas kad di R2. Taip `stop` selepas selesai menyemak.
Jika UID lama masih ada, tidak perlu mendaftarkannya semula.
Untuk kad baharu, taip arahan dan imbas satu kad yang betul setiap kali:

```text
assign r1 kubus
assign r2 kubus
```

Ulang secara berasingan untuk `piramid`, `silinder`, `kon` dan `kuboid`.
R1 ialah kad bongkah; R2 ialah kad bentangan. Setiap slot mesti menggunakan
UID yang berbeza. Jangan tampal semua arahan `assign` serentak.

Jika hanya tiga jenis lengkap, aktifkan hanya jenis itu, contohnya:

```text
use kubus piramid silinder
```

Jika kesemua lima pasangan kad sudah lengkap:

```text
use kubus piramid silinder kon kuboid
```

LCD dan butang boleh diuji di menu walaupun pendaftaran belum lengkap:
tekan **HINT** untuk enam halaman cara main. Untuk memulakan kuiz, kedua-dua
RFID mesti READY dan semua jenis aktif mesti mempunyai UID R1 serta R2.

## 5. Main dan semak keputusan

1. Tekan **NEXT** pada menu untuk memulakan pusingan.
2. Ikut LED pembaca yang menyala dan imbas **satu** kad jawapan.
3. Tekan **HINT** untuk buka/tutup petunjuk bagi soalan semasa.
4. Tekan **NEXT** jika mahu melangkau dengan +0 markah.
5. Selepas soalan terakhir, LCD memaparkan skor, peratus dan masa akhir.
6. Masa akhir kekal; **NEXT** memulakan pusingan baharu dan **HINT** ke menu.

Dalam mod RGB: biru=menunggu imbasan, hijau=betul, merah=salah/kad tidak sah.
Angkat kad sebelum mengimbas untuk soalan seterusnya.

## Arahan terminal PlatformIO

Buka **PlatformIO > Quick Access > Miscellaneous > PlatformIO Core CLI**
dalam VS Code. Terminal ini menyediakan arahan `pio` walaupun ia tiada
dalam PATH terminal biasa.

```text
pio run -e esp32dev
pio run -e esp32dev -t upload
pio device monitor -e esp32dev
```

Untuk dua RGB, gantikan `esp32dev` dengan `esp32dev-rgb` dalam ketiga-tiga
arahan. `Ctrl+C` menutup Monitor. Untuk melihat port: `pio device list`.

## Struktur kod

| Fail/folder | Tujuan |
|---|---|
| `platformio.ini` | Board, library, pilihan LED dan Serial Monitor |
| `src/main.cpp` | Menggabungkan tab asal untuk build PlatformIO |
| `main/main.ino` | `setup()` dan `loop()` sahaja |
| `main/config.h` | GPIO, polariti butang/LED, struktur dan deklarasi |
| `main/question_bank.h` | 15 soalan dan hint bagi lima jenis bongkah |
| `main/*.ino` | Modul RFID, LCD, butang, kuiz, serial, LED dan UID |
| `tests/` | Ujian native dengan perkakasan simulasi |
| `SAMBUNGAN.md` | Jadual wayar asal |
| `COMMANDS.md` | Senarai penuh arahan Serial |
| `contoh display LCD/` | Pratonton LCD daripada pakej asal |
| `print_labels/` | PDF kad cetakan daripada pakej asal |

Edit tab dalam `main/`; `src/main.cpp` menggunakan tab yang sama, tanpa
salinan kedua logik permainan. `main/main.ino` masih boleh dibuka dalam
Arduino IDE jika diperlukan.

Lihat [semua 15 paparan soalan dan hint semasa](docs/LCD_QUESTION_REVIEW.md)
untuk semakan teks LCD. Gambar dalam `contoh display LCD/` ialah bahan pakej
asal; bank runtime terkini berada dalam `main/question_bank.h`.

## Pengesahan dan kemas kini

Ujian simulasi memerlukan Python 3 dan G++:

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
```

Ujian simulasi menyemak logik; ia tidak membuktikan sambungan wayar, bekalan
kuasa, bacaan antena atau paparan LCD fizikal. Lihat `VERIFICATION.md` untuk
keputusan semakan import ini dan ujian fizikal yang masih perlu dibuat.

Untuk mengambil kemas kini selepas perubahan sendiri telah di-commit:

```text
git pull --ff-only
```

Kemudian Build dan Upload semula melalui environment yang sama.

Rujukan rasmi:
[PlatformIO untuk VS Code](https://docs.platformio.org/en/latest/integration/ide/vscode.html),
[ESP32 Dev Module](https://docs.platformio.org/en/latest/boards/espressif32/esp32dev.html).

