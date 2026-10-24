# Architecture GeoDecoder

Architecture ini menggunakan teras C++11 kecil yang boleh dijalankan tanpa
Arduino. Modul aplikasi menerima masa, RNG, log, storan dan kawalan pembaca
melalui `AppPorts`. `main/main.ino` memasang semua adapter sekali dalam
`setup()` dan menjalankan kemas kini tanpa `delay()`.

## Peta kod

| Lokasi | Tanggungjawab |
|---|---|
| `main/domain/rules.h` | Bilangan jenis/soalan, masa notis dan polisi kuiz |
| `main/domain/types.h` | Model nilai, state kuiz dan kontrak byte NVS |
| `main/domain/quiz_engine.h` | Pemarkahan, hint, skip, peralihan soalan dan jam |
| `main/domain/registry.h` | UID, nama bongkah, validasi blob dan carian peranan |
| `main/question_bank.h` | Sumber utama 15 soalan/hint; pemilihan menerima RNG |
| `main/application/*.h` | API modul, snapshot baca sahaja dan port luaran |
| `main/app.ino` | Menu, mod main/semakan/pendaftaran dan tindakan pengguna |
| `main/quiz.ino` | Menjalankan engine dan menterjemah peralihan kepada port/log |
| `main/tag_registry.ino` | Operasi daftar/pilih jenis; sahkan write sebelum menerima RAM |
| `main/app_ports.ino` | Port yang dipasang oleh setup dan pemformatan log |
| `main/presentation/lcd_view.h` | Membina empat baris LCD daripada snapshot |
| `main/presentation/lcd_frame.h` | Nilai bingkai 4 x 20 aksara untuk driver |
| `main/serial_commands.ino` | Input/output guru dan pemetaan arahan kepada API aplikasi |
| `main/hardware/*.h` | Kontrak driver dan callback input |
| `main/rfid.ino`, `buttons.ino`, `rgb_leds.ino` | SPI, debounce dan output GPIO |
| `main/lcd_display.ino` | I2C serta menulis baris LCD yang berubah |
| `main/nvs_storage.ino` | Adapter Preferences untuk byte registry |
| `main/config.h` | Tetapan board: GPIO, polariti dan timing peranti |
| `main/main.ino` | Composition root, pemasangan port dan loop |
| `src/main.cpp` | Entry PlatformIO yang menggunakan tab yang sama |

## Aturan kebergantungan

- Domain menggunakan standard C++ sahaja. Masa diberi sebagai nilai; ia tidak
  memanggil `millis()`, Serial, GPIO atau Preferences.
- Application bergantung pada domain dan port. `app.ino`, `quiz.ino`,
  `tag_registry.ino` dan `app_ports.ino` boleh dilink tanpa Arduino.
- View LCD membaca `LcdViewState` dan menghasilkan `LcdFrame` tanpa I2C.
  Driver LCD menerima bingkai; ia tidak memilih soalan atau menukar skor.
- Driver RFID/butang menghantar `InputEvents`. Hanya composition root
  menghubungkan peristiwa itu dengan tindakan aplikasi.
- Log guru boleh menggunakan status hardware melalui adapter Serial.
- Tiada dependency produksi baharu dan tiada peruntukan heap dalam teras/port
  yang ditambah oleh refactor ini.

Setiap modul mempunyai satu pemilik state. Pengguna modul membaca
`appState()`, `quizState()` dan `registryState()` sebagai rujukan const.
Perubahan state dilakukan melalui tindakan aplikasi atau kaedah engine.
Elakkan `extern` state mutable dalam header dan elakkan `const_cast` dalam
kod produksi. Fixture regresi lama menggunakan cast dalam utiliti ujian sahaja;
ujian teras baharu menggunakan API engine sebenar.

Tab `.ino` dikekalkan sebagai modul integrasi untuk satu sumber firmware.
Setiap tab menyertakan header sendiri. Ujian `--separate-modules` mengkompil
setiap tab sebagai translation unit C++ berasingan untuk mengesan kebergantungan
tersembunyi pada susunan import.

## Kontrak perkakasan dan data

`Shape` kekal CUBE=0, PYRAMID=1, CYLINDER=2, CONE=3, CUBOID=4, NONE=255.
`Uid` ialah 11 byte. `RegistryData` ialah 120 byte, offset `tags` ialah 8.
Semakan semasa kompilasi menghalang perubahan ABI tanpa migrasi yang disengajakan.
Adapter menggunakan namespace `geomath_q2`, key `registry`, magic
`0x474D5132` dan versi storan `1`. Write gagal tidak mengesahkan data RAM baharu.

`esp32dev` menggunakan LED biasa; `esp32dev-rgb` mengaktifkan RGB empat kaki.
Semua pin asal, soalan, hint, skor, masa akhir, arahan Serial dan aliran bermain
dikekalkan. R1 ialah bongkah dan R2 ialah bentangan.

## Panduan perubahan seterusnya

- Ubah ayat soalan/hint dalam `question_bank.h`.
- Ubah peraturan kuiz dalam domain dan uji melalui `tests/domain.cpp`.
- Ubah aliran aplikasi melalui API application; gunakan snapshot const.
- Ubah susunan/teks skrin dalam view LCD; perubahan wayar dalam config/driver.
- Adapter baharu dipasang dalam `setup()`; domain tidak perlu tahu library adapter.
- Jalankan ujian berkaitan dan build environment yang terkesan. Rujuk
  `tests/README.md` dan `VERIFICATION.md`.
