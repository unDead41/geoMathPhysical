# Audit awal dan pelan integrasi audio

Status: **cadangan untuk fasa selepas 30 MP3 tersedia**. Belum ada pemain,
komponen audio atau API audio dalam firmware. Model komponen sebenar, bekalan,
storan, pembesar suara dan sambungan masih perlu disahkan.
Rujukan: main v1.1.3, `a059979d97926b82cafd4aa5cf3fe59da04a55bb`.

## Dapatan daripada projek sebenar

`main/config.h`, `main/main.ino`, `main/buttons.ino`, `main/app.ino`,
`main/quiz.ino`, `main/application/ports.h`, `main/domain/types.h`,
`platformio.ini` dan `SAMBUNGAN.md` telah diperiksa.

| Perkara sebenar | Dapatan dan implikasi audio |
|---|---|
| Board | ESP32 klasik/WROOM-32, `esp32dev`, satu environment `esp32dev-rgb` |
| Library produksi | MFRC522 dan hd44780; tiada decoder/pemain audio |
| Composition root | `setup()` memasang `AppPorts`; tiada audio port atau audio driver |
| Loop | Serial → butang → RFID → aplikasi → RGB → LCD → yield; tiada `delay()` untuk main balik |
| Soalan aktif | `quizCurrentQuestion()->id`; `QuizData.index` hanya kedudukan dalam round |
| HINT | `quizHint()` menukar `showHint`; hint dikira sekali setiap soalan |
| R1 betul | `quizOnScan()` menukar pembaca kepada R2; engine menutup hint |
| Skip/pasangan betul | `advancePending` selama enam separuh kelipan, jumlah 900 ms; jam dijeda |
| Butang biasa | `buttonsUpdate()` menghantar tindakan apabila tekanan stabil selepas debounce 40 ms |
| Tekanan panjang | Dilaporkan oleh diagnostik komponen; tiada tindakan ulang audio dalam permainan |
| Storan | NVS untuk registry UID; tiada filesystem audio, kad SD atau partition audio dikonfigurasi |

Tiada bukti dalam repo bahawa speaker, amplifier, DFPlayer, kad microSD
atau storan audio lain sudah dipasang pada alat fizikal. Ini had bukti repo,
bukannya dakwaan pemeriksaan alat secara langsung.

## Audit pin: jangan terus salin contoh UART16/17

| Fungsi sekarang | GPIO yang sudah diperuntukkan |
|---|---|
| RFID R1 SS / R2 SS / RST bersama | 5 / 27 / 4 |
| SPI RFID SCK / MISO / MOSI | 18 / 19 / 23 |
| LCD I2C SDA / SCL | 21 / 22 |
| NEXT / HINT | 32 / 33 |
| RGB R1 R/G/B | 13 / 14 / 25 |
| RGB R2 R/G/B | 16 / 17 / 26 |
| UART0 untuk upload dan Serial Monitor | 1 / 3; jangan kongsi dengan pemain |
| Flash modul | 6–11; jangan gunakan untuk audio |
| GPIO input sahaja | 34–39; tidak boleh menjadi UART TX atau output I2S |
| Pin strapping yang belum diperuntukkan di atas | 0 / 2 / 12 / 15; bukan pin audio yang sudah diluluskan |

GPIO16/17 boleh digunakan pada WROOM tetapi **sudah digunakan RGB R2 dalam
projek ini**. Jangan mencuri pin tersebut untuk UART2. GPIO25/26 juga sudah
menjadi saluran biru RGB; DAC dalaman bukan laluan bebas. Pemeriksaan config
menunjukkan tiada pin output bukan strapping yang lapang sambil mengekalkan
UART0 dan semua sambungan sekarang. Ini inferens daripada peta pin, bukan
arahan menukar wiring. Pendedahan GPIO pada board sebenar tetap perlu diperiksa.

Rujukan pengeluar:
[batas GPIO ESP32](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/gpio.html)
dan [perbezaan pin WROOM/WROVER](https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html).

## Pilihan yang munasabah untuk dinilai

| Pilihan | Kelebihan | Keperluan dan batas |
|---|---|---|
| Pemain pada PC melalui USB Serial | Tiada GPIO tambahan; guna speaker PC dan fail canonical | Memerlukan PC serta companion yang belum dibina; satu pemilik port COM sahaja; pembukaan port boleh reset board bergantung tetapan DTR/RTS |
| DFPlayer Mini + microSD + speaker, melalui bridge I2C–UART | Decoder/storan pada modul; boleh mengekalkan semua pin sedia ada dengan berkongsi bus I2C | Memerlukan modul bridge, contohnya SC16IS750, pada aras 3.3 V/alamat berbeza; audit driver, bekalan dan bus LCD dahulu |
| DFPlayer terus UART atau decoder I2S pada ESP32 | Reka bentuk umum yang boleh memainkan audio luar talian | Tiada peruntukan pin selamat yang sudah dipersetujui; I2S juga memerlukan output/storan/decoder. Jangan implement dengan mengubah pin lama secara senyap |

Cadangan awal: gunakan PC jika mahu menguji kesesuaian 30 suara dahulu.
Untuk alat mandiri dengan syarat pin kekal, nilai pemain luaran melalui bridge
I2C–UART selepas model modul diketahui. Jangan membeli berdasarkan jadual ini
sebagai wiring siap; ia perbandingan seni bina yang belum diuji fizikal.

DFPlayer menyediakan main balik MP3 melalui arahan UART dan microSD.
NXP mendokumenkan SC16IS750 sebagai bridge I2C/SPI ke UART. Pemilihan gabungan
tersebut ialah inferens reka bentuk untuk kekangan pin GeoDecoder.
Sumber: [DFRobot DFR0299](https://wiki.dfrobot.com/dfr0299/),
[penamaan fail DFR0299](https://wiki.dfrobot.com/dfr0299/docs/20906),
[NXP SC16IS750](https://www.nxp.com/docs/en/data-sheet/SC16IS740_750_760.pdf).
Semak aras logik modul, bekalan amplifier dan GND bersama; jangan tarik
SDA/SCL ESP32 ke 5 V. Sambungan LCD sedia ada menggunakan level shifter.

Jika DFPlayer dipilih, kekalkan nama `<ID>_soalan.mp3`/`<ID>_hint.mp3` sebagai
master. Sediakan salinan deployment `/mp3/0001.mp3` hingga `/mp3/0030.mp3`
dengan jadual tetap yang disemak sekali, bebas susunan round dan susunan copy.
Gunakan arahan folder bernombor yang tepat, bukan menganggap `play(1)` sama
dengan `P1_soalan.mp3`. Jadual angka belum dikunci kerana pemain belum dipilih.

## Kontrak main balik yang dicadangkan

Jadual ini ialah behavior sasaran; ia **belum dilaksanakan**.
Audio dimuat turun dahulu dan dimainkan setempat; tiada keperluan API
ElevenLabs atau Internet semasa kuiz.

| Peristiwa diterima oleh aplikasi | Tindakan audio sasaran |
|---|---|
| Round/soalan baharu benar-benar bermula | Batalkan klip lama; main `<ID>_soalan.mp3` sekali |
| Cetak Serial/LCD berulang | Tiada main semula; fungsi render/log bukan pencetus audio |
| HINT diminta dan `showHint` menjadi true | Hentikan klip semasa; main `<ID>_hint.mp3` sekali |
| HINT ditutup | Hentikan hint; tiada main soalan automatik |
| R1 betul → R2 | ID sama: jangan ulang soalan; hentikan hint yang ditutup engine |
| Jawapan salah / UID salah / reader salah | Tiada klip baharu; tidak mengubah polisi retry atau markah |
| NEXT diterima sebagai skip / pasangan R2 betul | Hentikan audio serta-merta; jangan tunggu kelipan selesai |
| Dalam `advancePending` | Abaikan permintaan audio tambahan sebagaimana NEXT/HINT sekarang |
| Tamat/menu/stop/semakan UID/enroll/ujian komponen/config berubah | Hentikan audio dan kosongkan permintaan tertunda |
| Serial play menyambung kuiz selepas stop | Buat sesi audio baharu; main soalan semasa sekali selepas resume diterima |
| `retry`/`clear` diterima | Batalkan audio lama ketika percubaan pasangan direset; tiada ulangan automatik |
| Permintaan ulang yang sah | Hentikan klip semasa; ulang dari awal hint jika sedang dibuka, selain itu soalan |
| Klip tamat / SD tiada / fail rosak / modul gagal | Senyap dan lapor guru; permainan, RFID, LCD, RGB dan jam diteruskan |

Cadangan awal untuk ulang/henti manual ialah arahan Serial baharu
`audio repeat`, `audio stop`, `audio status`. **Arahan ini belum wujud**.
`audio stop` hanya menghentikan suara; jangan menyamakan dengan `stop` sedia
ada yang menghentikan mod permainan. Permintaan manual hanya sah semasa
PLAY/QUESTION dan bukan kelipan/diagnostik. Jangan gunakan nombor pusingan
untuk memilih fail atau menerima ID soalan lain sebagai ulang.

NEXT pendek kekal langkau; HINT pendek kekal buka/tutup. Jangan terus
menambah HINT tahan lama untuk ulang: driver kini mengeluarkan HINT pada
awal tekanan stabil, jadi hint akan terbuka sebelum tempoh tahan dicapai.
Jika kawalan murid tanpa PC diperlukan, reka gesture yang membezakan
tekan/lepas dengan jelas dan persetujuan behavior terlebih dahulu, atau
gunakan input tambahan yang diaudit. Jangan menganggap diagnostik long press
sudah menjadi fungsi gameplay.

## Penempatan adapter dan urusan masa

- Domain/`Question`/`RegistryData` kekal bebas audio dan format NVS kekal.
  Tambah kontrak audio kecil di application; bind adapter hanya di composition
  root seperti `AppPorts` sekarang. API yang disebut di sini ialah cadangan,
  bukannya API yang sudah tersedia.
- Hantar peristiwa selepas tindakan engine diterima, bukan pada setiap
  loop, `quizPrintQuestion()`, penulisan LCD atau perubahan warna LED.
- Identiti permintaan ialah `(round_generation, question_generation, id,
  jenis, request_generation)`. Jangan banding ID sahaja: P1 boleh muncul lagi
  dalam round baharu dan completion lama tidak boleh menghentikan P1 yang baharu.
- Satu klip aktif dan paling banyak satu permintaan terbaharu. STOP/cancel
  membatalkan pending PLAY. STOP → jarak arahan minimum mengikut datasheet →
  PLAY dijadualkan dengan timestamp, tanpa `delay()` atau menunggu audio habis.
- Adapter dipam melalui tick berhad kerja. Parser UART/I2C dan retry mempunyai
  timeout serta had percubaan; jangan buat gelung menunggu ACK, SD atau BUSY.
  Bila pemulihan modul berjaya, jangan main pending lama; semak semula generation.
- Jam terus berjalan semasa bacaan soalan/hint. Hanya polisi engine sedia ada
  mengurus jeda 900 ms, stop dan keputusan. Jangan memanjangkan/menolak masa
  kerana klip lebih panjang atau modul belum bersedia.
- Rujuk poll RFID 35 ms/settle 6 ms dan debounce 40 ms dalam `config.h`
  ketika menetapkan bajet tick. Ukur latensi loop sebenar dengan audio aktif;
  bukan menganggap decoder luaran sahaja menjamin tiada sekatan.

Audit library wajib: kod rasmi
[DFRobotDFPlayerMini.cpp](https://github.com/DFRobot/DFRobotDFPlayerMini/blob/master/DFRobotDFPlayerMini.cpp)
mempunyai laluan ACK dengan penantian dan beberapa arahan menggunakan delay.
Jangan menyalin contoh `while(true)`/reset/waitAvailable ke loop permainan.
Pin versi library ketika implementasi dan semak laluan penghantaran sebenar,
termasuk apabila ACK dimatikan. Tiada library baharu dipasang oleh pakej ini.

## Pengesahan selepas audio dan perkakasan tersedia

1. Fail: semua 30 MP3 ada, codec/tempoh sah dan didengar satu demi satu;
   metadata suara/model direkod, rumus tidak berubah dan tiada jawapan dibaca.
2. Native dengan fake audio: mulakan ID rawak, hint hanya atas permintaan,
   stop/hide/skip/R2 tepat/menu/diagnostik, ulang, retry, resume, fail hilang,
   ACK timeout serta peristiwa lama selepas soalan/round bertukar.
3. Lindungi flow: semua soalan tetap R1 → R2, +1 sekali, kelipan 900 ms,
   penolakan input ketika kelipan, warna hint ungu dan NVS/UID kekal sama.
4. Jalankan suite semasa AGENTS: pure domain, entry PlatformIO RGB dan modul
   berasingan RGB apabila application/header berubah; `pio run` untuk ESP32.
5. Fizikal: semak bekalan/boot, aras logik, sambungan speaker mengikut modul,
   kad SD/fail yang dicabut/rosak, bunyi klik, latensi STOP, ulang berturut,
   imbas kedua-dua reader sambil audio/hint berjalan dan stopwatch sebenar.
6. Rekod native, build ESP32, upload USB dan ujian fizikal secara berasingan.
   Semak main/versi semula dan push hanya branch kerja untuk review seterusnya.

Keputusan akhir modul, wiring, format deployment dan gesture ulang masih
bergantung pada audio serta komponen yang akan digunakan. Tiada pin, flow,
ID, jawapan, pendaftaran kad atau byte NVS diubah dalam pakej persediaan ini.
