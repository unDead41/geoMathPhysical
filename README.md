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

1. Menu: kedua-dua RGB bertukar warna perlahan setiap 1,000 ms. NEXT memulakan
   pusingan baharu pada skor 0 dan masa 00:00; HINT membuka cara bermain.
2. **Setiap soalan memerlukan dua kad: R1 bongkah dahulu, kemudian R2 bentangan
   yang sepadan.** R1 biru/R2 padam pada permulaan. R1 betul belum mendapat markah;
   R1 kekal hijau dan R2 menjadi biru. Tahap aktif turut ditulis pada header LCD.
3. Salah: pembaca aktif merah selama notis, kemudian kembali biru/kuning.
   Cuba semula pada tahap sama; R1 kekal hijau jika sedang menjawab bentangan.
4. HINT membuka/menutup petunjuk dan menjadikan pembaca aktif kuning. Masa terus
   berjalan; imbasan masih diterima dan markah tidak ditolak.
5. Dua kad betul: **+1 sekali sahaja**, kedua-dua RGB hijau berkelip tiga kali.
   NEXT melangkau mana-mana tahap: **+0**, kedua-duanya merah berkelip tiga kali.
6. Setiap kelipan ialah 150 ms ON + 150 ms OFF; jumlah 900 ms. Stopwatch dijeda
   sepanjang kelipan. Jawapan/NEXT/HINT diabaikan; loop aplikasi terus berjalan.
7. Soalan seterusnya bermula pada R1 biru/R2 padam dan masa bersambung.
   Angkat kad sebelum mengimbas semula, termasuk kad yang sudah berada di R2.
8. Pada tindakan akhir, masa dibekukan dahulu. Selepas tiga kelipan, LCD
   menunjukkan skor, peratus dan masa akhir; RGB bertukar warna setiap 150 ms.
9. Keputusan: NEXT memulakan pusingan baharu, HINT kembali ke menu perlahan.

Environment default `esp32dev` kekal untuk **LED biasa**. Warna bukan padam
menjadi LED ON; label tahap/notis LCD menerangkan tindakan. Pada tahap R2,
R1 kekal ON. Menu/keputusan mempunyai dua LED ON; tiga kelipan tetap digunakan.
Gunakan `esp32dev-rgb` hanya apabila pemasangan RGB siap.
Panduan penuh: [flow dua kad dan RGB](docs/GAME_FLOW_RGB.md).

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
| `main/config.h` | Tetapan board: GPIO, polariti dan timing peranti |
| `main/domain/` | Model, peraturan, validasi UID dan engine kuiz bebas Arduino |
| `main/application/` | API aplikasi, snapshot baca sahaja dan port perkakasan |
| `main/presentation/` | View LCD daripada snapshot dan kontrak Serial |
| `main/hardware/` | Kontrak driver dan peristiwa input |
| `main/question_bank.h` | 15 soalan dan hint bagi lima jenis bongkah |
| `main/*.ino` | Implementasi modul aplikasi serta adapter RFID/LCD/butang/LED/NVS |
| `tests/` | Ujian native dengan perkakasan simulasi |
| `SAMBUNGAN.md` | Jadual wayar asal |
| `COMMANDS.md` | Senarai penuh arahan Serial |
| `contoh display LCD/` | Pratonton LCD daripada pakej asal |
| `print_labels/` | PDF kad cetakan daripada pakej asal |

Rujuk [panduan architecture](docs/ARCHITECTURE.md) sebelum mengubah modul.
Engine kuiz menerima masa sebagai nilai; application menerima adapter melalui
`AppPorts`. RFID/butang menghantar callback dan LCD menerima bingkai siap.

Edit modul dalam `main/`; `src/main.cpp` menggunakan tab yang sama, tanpa
salinan kedua logik permainan. `main/main.ino` masih boleh dibuka dalam
Arduino IDE jika diperlukan.

## Pengesahan dan kemas kini

Ujian simulasi memerlukan Python 3 dan G++:

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
```

Setiap arahan menjalankan 11 kes teras/application tanpa Arduino dan 36 kes
integrasi firmware. Mod `--separate-modules` mengkompil setiap tab secara
berasingan supaya header serta kebergantungan modul turut disahkan.

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

