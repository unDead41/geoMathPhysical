# Architecture GeoDecoder

Architecture ini menggunakan teras C++11 kecil yang boleh dijalankan tanpa
Arduino. Modul aplikasi menerima masa, RNG, log, storan dan kawalan pembaca
melalui `AppPorts`. `main/main.ino` memasang semua adapter sekali dalam
`setup()` dan menjalankan kemas kini tanpa `delay()`.

## Peta kod

| Lokasi | Tanggungjawab |
|---|---|
| `main/domain/rgb_random.h` | Pemilih warna rawak daripada calon yang mengecualikan warna sebelumnya dan LED pasangan; bebas perkakasan |
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
| `main/firmware_version.h` | Versi firmware untuk adapter Serial; bebas perkakasan |
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

Satu build default `esp32dev-rgb` mengaktifkan RGB empat kaki; board ID kekal `esp32dev`.
Semua pin asal, bank soalan/hint, format UID dan arahan guru dikekalkan.
Flow mengikut Question.focus: SOLID memerlukan R1 kemudian R2; NET memerlukan
R2 kemudian R1. R1 kekal bongkah, R2 kekal bentangan.

## Panduan perubahan seterusnya

- Baca [SOR versi](SOR_VERSIONING.md) dan semak versi main sebelum sebarang
  kemas kini. Nombor runtime datang daripada `firmware_version.h`; adapter
  Serial menggunakannya pada boot, `version` dan `status`. Versi firmware
  berasingan daripada versi format storan UID/NVS.
- Ubah ayat soalan/hint dalam `question_bank.h`.
- Ubah peraturan kuiz dalam domain dan uji melalui `tests/domain.cpp`.
- Ubah aliran aplikasi melalui API application; gunakan snapshot const.
- Ubah susunan/teks skrin dalam view LCD; perubahan wayar dalam config/driver.
- Adapter baharu dipasang dalam `setup()`; domain tidak perlu tahu library adapter.
- Jalankan ujian berkaitan dan build environment yang terkesan. Rujuk
  `tests/README.md` dan `VERIFICATION.md`.

## Flow dua kad dan output masa

`Question.focus` ialah metadata bertip SOLID/NET. Teks soalan tidak dianalisis
untuk memilih urutan. `QuizData.stage` memilih peranan aktif, sementara
`firstAccepted` menyimpan kemajuan pertama tanpa menganggap R1 sentiasa dahulu.
Reader pertama betul mengaktifkan reader kedua; hanya pasangan memberi +1.

State QUESTION menerima jawapan/hint/skip. Betul/langkau memasuki
`advancePending`, enam separuh langkah 150 ms untuk tiga kelipan 900 ms.
Salah berdaftar memasuki `QuizPhase::WRONG_ANSWER`: konteks soalan dikekalkan,
clock dipause pada timestamp scan, `update(now)` hanya meneruskan kelipan merah
bersama tanpa auto-advance. `continueAfterWrong(now)` hanya dipanggil oleh NEXT;
ia membuka soalan baharu serta resume, atau SUMMARY yang kekal beku.
`resume`, `retry`, `submit`, `skip` dan `toggleHint` tidak menerima state salah.

`appPlay(false)` memulihkan state salah selepas stop/semakan/diagnostik tanpa
membina pusingan baharu. `quizArmCurrentReader()` menghentikan kedua-dua reader
ketika salah. `appInputBlocked()` hanya menyekat urutan automatik betul/langkau,
supaya NEXT kekal berfungsi pada penerangan salah. Debounce sedia ada memberi
satu tindakan setiap tekanan stabil dan memerlukan lepasan untuk tekanan baharu.

View salah menggunakan header tetap, `shapeShortLabel(question.answer)` dan dua
baris `Question.explanation`. Nama PIRAMID diringkaskan agar muat selepas
"Jawapan: "; bentuk tapak diterangkan dalam sebab. Soalan/hint biasa hanya
membaca `lines`/`hint`. Notis UNKNOWN_UID/WRONG_PAD kekal boleh dipulihkan tanpa
mengubah skor/tahap/clock; ralat sambungan tidak dihantar sebagai jawapan.

`quiz.ino` menukar mod pembaca ketika tahap berubah dan memanggil port
`requireFreshCards()`. Adapter memerlukan tiga poll kosong sebelum menerima
kad semula; kad R2 yang diletakkan terlalu awal tidak boleh terus menjawab.
Butang terus disampel semasa kelipan supaya tekanan yang bermula ketika input
tersekat tidak tersimpan untuk skrin berikutnya.

`app.ino` memiliki warna hiasan menu/keputusan: masa dan RNG datang melalui
AppPorts; render warna tidak mengubah skor. Hardware memetakan warna logik
kepada saluran RGB atau satu pin LED biasa. `main/main.ino` dan `loop()` tidak
perlu diubah. Tiada library/dependency produksi baharu.

View menambah label R1/R2 pada ruang header dan mengekalkan tiga baris isi bank.
Panduan terkini: [GAME_FLOW_RGB.md](GAME_FLOW_RGB.md).

## Pin LED biasa dan pemasangan RGB

`config.h` mengasingkan `LED_PINS` daripada `RGB_PINS`. Laluan LED biasa
R1=GPIO25/R2=GPIO26 dikekalkan untuk semakan native sahaja. Build `esp32dev-rgb` menggunakan RGB1/R1
R=13, G=14, B=25 dan RGB2/R2 R=16, G=17, B=26, mengikut sambungan pengguna.
Driver memilih pemetaan mengikut environment tanpa mengubah peraturan permainan.
Arahan Serial `pins` melaporkan pin yang digunakan oleh environment aktif.

## Component diagnostics

`component_tests.ino` is an outer hardware integration utility with private session
state and a contract in `hardware/component_tests.h`. It reuses existing RFID,
button and output adapters; neither domain nor pure application gains a hardware
dependency. The Serial adapter routes test paths and gates normal mutation
commands during tests. Composition setup combines diagnostic/game button blocking
and keeps scanned diagnostic UIDs away from the application scoring handler.

The existing output tick drives nonblocking diagnostic updates and selects test
LED/LCD output while a session owns it. The main loop remains unchanged. Starting
calls appStop to pause/cancel capture; stopping also requires stable button release.
`rfidCheckConnections()` refreshes version registers while RF scanning is stopped;
UID scans, rather than a version response alone, establish card-reading behaviour.
See [COMPONENT_TESTS.md](COMPONENT_TESTS.md) for the command contract.

Serial also routes one-token calibration shortcuts (R1Red/R1RGB, their R2
equivalents, ButtonTest/NEXTTest/HINTTest) into the same diagnostic controller.
R1RGB/R2RGB use the complete ordered seven-colour cycle; R1Random/R2Random
retain random output. Purple aliases map to MAGENTA, the gameplay hint colour
(red + blue). Random LED state advances once per 500 ms tick; rendering only reads its colour.
Short/long gesture timing and counters belong to that controller and consume the
existing debounced button snapshots. A held input must be released before it
can start a gesture. These reports do not alter normal application button events,
and all game actions remain blocked while a component session owns the outputs.


Random menu/help/result colours and component diagnostics share the pure
`pickRandomRgbColor` candidate selector. R1 excludes its own previous colour;
R2 excludes its own previous colour and the newly selected R1 colour. Each
reader uses one bounded RNG call over 5..7 candidates; there is no retry loop.
The component session stores random colours per reader and logs each target.
Rendering reads these values without making additional RNG calls.
