# Sambungan ESP32 klasik WROOM-32/32E

Semua nombor ialah nombor GPIO. Putuskan bekalan semasa memasang wayar.

## Dua RC522 / MFRC522

| Pin pada RC522 | Reader 1 / Pad A | Reader 2 / Pad B |
|---|---|---|
| SDA / SS | GPIO5 | GPIO27 |
| SCK | GPIO18 | GPIO18 |
| MOSI | GPIO23 | GPIO23 |
| MISO | GPIO19 | GPIO19 |
| RST | GPIO4 | GPIO4 |
| 3.3V | Rail 3.3 V | Rail 3.3 V |
| GND | GND bersama | GND bersama |
| IRQ | Tidak disambung | Tidak disambung |

Label SDA pada RC522 ialah SS untuk mod SPI; ia bukan SDA LCD.
Peta ini mengikut gambar wiring pengguna: SS1=5, SS2=27 dan RST=4.
GPIO27 ialah SS untuk R2; jangan sambungkan RST ke GPIO27 untuk versi ini.
SPI disambung terus kerana ESP32 dan RC522 menggunakan logik 3.3 V.
Jangan bekalkan RC522 dengan 5 V. Pastikan wayar SPI pendek dan bekalan stabil.
Kod mengaktifkan satu antena pada satu masa untuk mengurangkan pertindihan medan.
Letakkan pad dengan ruang antara antena; uji jarak bacaan kad sebenar.

## LCD 20x4 I2C 5 V

Gunakan **penukar aras dua hala untuk I2C**, misalnya modul BSS138.
Backpack LCD 5 V lazimnya mempunyai pull-up ke 5 V, maka SDA/SCL tidak disambung terus ke ESP32.

| Sambungan | Dari | Ke |
|---|---|---|
| Rujukan rendah | ESP32 3V3 | LV penukar aras |
| Rujukan tinggi | Rail 5 V | HV penukar aras |
| Ground | GND bersama | GND penukar aras dan LCD |
| SDA sebelah rendah | GPIO21 | LV1 |
| SDA sebelah tinggi | HV1 | SDA LCD |
| SCL sebelah rendah | GPIO22 | LV2 |
| SCL sebelah tinggi | HV2 | SCL LCD |
| Kuasa LCD | Rail 5 V | VCC LCD |

Bekalkan board melalui USB. Jika menggunakan header 5V/VIN untuk LCD, sahkan label/peta kuasa board
menunjukkan pin itu menyediakan 5 V daripada USB. Jangan gabungkan dua sumber kuasa 5 V tanpa
perlindungan/panduan board. Semua GND mesti bersama.
RC522 boleh menggunakan regulator 3.3 V board jika kapasitinya mencukupi.
Jika menggunakan regulator luar untuk RC522, gunakan output 3.3 V terkawal dan GND bersama;
jangan selarikan dua output regulator 3.3 V.

Library hd44780 mengesan alamat dan pemetaan backpack; tiada keperluan meneka 0x27/0x3F.
Laraskan potensiometer kontras jika lampu LCD hidup tetapi tulisan tidak nampak.

## Dua modul butang tiga pin

| Pin modul | Butang 1 | Butang 2 |
|---|---|---|
| S / OUT | GPIO32 (B1 / Next) | GPIO33 (B2 / Hint) |
| + / VCC | 3V3 | 3V3 |
| - / GND | GND | GND |

Default: **active LOW**. Kod menggunakan INPUT_PULLUP pada GPIO32/33 supaya idle HIGH.
Modul mesti serasi dengan 3.3 V. Resistor pull-up luar 10 kOhm boleh digunakan jika diperlukan
oleh modul atau pemasangan; ia bukan syarat pin seperti peta GPIO34/35 yang lama.

Jika modul active HIGH:
- Tukar BUTTON_PRESSED_LEVEL berkaitan kepada HIGH dalam config.h.
- Kod akan menggunakan INPUT_PULLDOWN secara automatik pada input itu.
- Jangan pasang pull-up luar untuk modul yang memerlukan idle LOW.

Apabila kedua-dua butang dilepaskan, arahan status sepatutnya menunjukkan RELEASED.
Jika kekal PRESSED, sahkan polariti modul dan sambungan S / VCC / GND sebelum bermain.

## Dua RGB - boleh dipasang kemudian

| Saluran | RGB1 / R1 bongkah | RGB2 / R2 bentangan |
|---|---|---|
| R | GPIO16 | GPIO13 |
| G | GPIO17 | GPIO14 |
| B | GPIO26 | GPIO25 |

Pemetaan RGB ini mengikut sambungan pengguna: RGB1 B=26, G=17, R=16;
RGB2 B=25, G=14, R=13. RGB1 ialah petunjuk bongkah/R1 dan RGB2 bentangan/R2.
GPIO32/33 dikhaskan untuk butang.

Pemasangan LED biasa asal berasingan: LED R1 pada GPIO25 dan LED R2 pada GPIO26.
Environment `esp32dev` mengekalkan pin itu melalui `LED_PINS`; `esp32dev-rgb`
menggunakan `RGB_PINS` R/G/B dalam jadual di atas. GPIO25/26 ialah saluran B
dalam pemasangan RGB, jadi pin LED biasa tidak lagi diambil daripada saluran R.

Untuk setiap saluran: GPIO -> resistor 330 Ohm -> kaki R/G/B.
Jumlah enam resistor, satu bagi setiap saluran.
Kenal pasti pin LED menggunakan datasheet; susunan kaki bergantung pada model.

Default **common cathode**: kaki common ke GND; RGB_COMMON_ANODE = false.
Jika **common anode**: kaki common ke 3V3 dan RGB_COMMON_ANODE = true.
Jangan sambung common anode terus ke 5 V dengan sambungan GPIO ini.

Dalam VS Code, pilih **Project Tasks > esp32dev-rgb > Build / Upload** apabila
kedua-dua RGB sudah dipasang. Environment ini menetapkan
`GEODECODER_RGB_ENABLED=1`. Jika menggunakan Arduino IDE, ubah default macro
tersebut dalam `main/config.h`.

Petunjuk RGB bagi flow dua kad:

| Keadaan | RGB R1 | RGB R2 |
|---|---|---|
| Menu / cara main | Warna rawak setiap 1,000 ms | Warna rawak setiap 1,000 ms |
| Menunggu bongkah | Biru | Padam |
| Hint bongkah | Kuning | Padam |
| Bongkah salah / UID tidak sah | Merah sementara | Padam |
| Bongkah betul; menunggu bentangan | Hijau kekal | Biru |
| Hint bentangan | Hijau kekal | Kuning |
| Bentangan salah / UID tidak sah | Hijau kekal | Merah sementara |
| Kedua-dua kad betul | Hijau berkelip 3 kali bersama | Hijau berkelip 3 kali bersama |
| Langkau pada mana-mana tahap | Merah berkelip 3 kali bersama | Merah berkelip 3 kali bersama |
| Semakan UID / pendaftaran | Biru jika pembaca ini aktif | Biru jika pembaca ini aktif |
| Keputusan akhir | Warna rawak setiap 150 ms | Warna rawak setiap 150 ms |

Notis salah ialah 1,200 ms, kemudian pembaca aktif kembali biru/kuning.
Kelipan ialah 150 ms ON + 150 ms OFF, tiga kali, jumlah 900 ms; stopwatch
berhenti sepanjang urutan itu. Menu/keputusan tidak menerima jawapan.

Dalam environment LED biasa, hanya GPIO25/26 dipandu. Semua warna selain
padam menghasilkan ON. Maka tahap R2 mengekalkan kedua-dua LED ON, dan
menu/keputusan juga ON; rujuk header R1/R2 dan notis LCD untuk tindakan.
Timing tiga kelipan dikekalkan. Lihat [flow penuh](docs/GAME_FLOW_RGB.md).

RGB dalam kod ini ialah LED biasa empat kaki, bukan WS2812/NeoPixel.
GPIO16/17 dalam peta ini khusus board WROOM; ia tidak bebas pada sesetengah WROVER/PSRAM.

## Rujukan pengeluar

- ESP32 GPIO dan batasan input: https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html
- Peta WROOM / WROVER: https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html
- MFRC522: https://www.nxp.com/docs/en/data-sheet/MFRC522.pdf
- Preferences/NVS: https://docs.espressif.com/projects/arduino-esp32/en/latest/api/preferences.html

