# GeoDecoder

Versi semasa: **v2.0.0**.
Rujukan kemas kini: [SOR versi](docs/SOR_VERSIONING.md) dan [changelog](CHANGELOG.md).

Kuiz geometri 3D menggunakan ESP32 klasik/WROOM-32, dua pembaca MFRC522,
LCD I2C 20x4, dua butang dan dua RGB empat kaki.

**Aliran kerja utama: VS Code + PlatformIO IDE.** Build, Upload dan Serial
Monitor tersedia terus dalam VS Code. Arduino IDE tidak diperlukan.

## Panduan PDF

- [Bentangan untuk membina lima bongkah, dua set](print_labels/GeoDecoder_Bentangan_2_Set_Tanpa_Tulisan_A4.pdf):
  20 halaman A4 landskap untuk digunting, dilipat dan digam. Kedua-dua set
  sudah dikecilkan 20% daripada ukuran sebelumnya, dengan tab gam lebih lebar.
  Cetak pada **Actual size / 100%**, satu muka; matikan **Fit to page**.
  Gunting garisan luar dan lipat pada garis hitam nipis. Semua sisi satu tona,
  tapak bawah lebih gelap, tab gam kelabu; tiada tulisan atau garis putus-putus.
- [Panduan lengkap A-Z](tutorial/GeoDecoder_Panduan_A-Z.pdf): 45 halaman
  bergambar untuk sambungan, persediaan komputer, ujian, pendaftaran RFID
  dan penggunaan GeoDecoder.
- [Cara bermain untuk murid](tutorial/GeoDecoder_Cara_Bermain_Murid.pdf):
  21 halaman bergambar tanpa nombor halaman, menggunakan bahasa mudah dan
  istilah matematik berpandukan KSSM/DSKP.

Kedua-dua PDF ialah salinan tepat daripada `sharing` pada commit
[`de86754`](https://github.com/unDead41/geodecoder/commit/de86754fb042e12c9254eb883621febf6f055a31).
Panduan disemak terhadap firmware v1.1.1. **PDF belum dikemas kini untuk
flow v2.0.0**: urutan ikut fokus, salah tamat +0, penerangan LCD dan NEXT
untuk teruskan. Rujuk flow semasa di bawah sebelum menyediakan video/tutorial. Mulai v1.1.3, Build sentiasa RGB:
langkau langkah memilih LED/environment dalam PDF dan terus Build/Upload.

Bahagian installer A-Z menggunakan `setup.ps1` dalam pakej
[`sharing`](https://github.com/unDead41/geodecoder/tree/sharing).
Dapatkan installer bersama ZIP branch itu. Untuk folder `main`, ikut
langkah VS Code + PlatformIO di bawah.

Cara bermain murid menunjukkan bongkah 3D dengan kad RFID di bawahnya untuk
R1, serta kad RFID yang ditampal cetakan bentangan untuk R2. Contoh prisma
segi tiga ialah simulasi penerangan; bank firmware masih menggunakan lima
jenis bongkah asal. Guru perlu menguji bacaan RFID pada bongkah sebenar.

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

## 2. Terus Build

Projek mempunyai **satu environment sahaja, `esp32dev-rgb`, dan ia default**.
Klik tanda **Build** di bar bawah PlatformIO atau **Project Tasks > esp32dev-rgb >
General > Build**. Build boleh dijalankan tanpa ESP32 disambungkan. Tunggu `SUCCESS`.
Kumpulan Default dan `esp32dev-rgb` menjalankan konfigurasi RGB yang sama;
pengguna tidak perlu memilih jenis LED.

Pin RGB R/G/B: **R1=13/14/25, R2=16/17/26**. Jika fail tempatan
`platformio.local.ini` lama menetapkan `default_envs = esp32dev`, buang baris
override itu atau tukar kepada `esp32dev-rgb`; kekalkan tetapan COM sendiri.

RGB menggunakan common cathode secara default. Jika common anode ke 3V3,
ubah `RGB_COMMON_ANODE` kepada `true` dalam `main/config.h`.

## 3. Upload ke ESP32

1. Sambungkan ESP32 klasik/WROOM-32 kepada komputer menggunakan kabel USB data.
2. Tutup Serial Monitor lain yang sedang menggunakan port tersebut.
3. Klik **Upload** di bar bawah PlatformIO atau **Project Tasks > esp32dev-rgb > General > Upload**.
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

Buka **Monitor** di bar bawah PlatformIO atau **Project Tasks > esp32dev-rgb > General > Monitor**. Kelajuan ditetapkan
kepada **115200 baud**, dan arahan dihantar selepas menekan Enter.

Taip satu per satu:

```text
version
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

Untuk daftar semula, `unassign all` memadam semua tagging R1/R2.
`unassign kubus`, `unassign piramid`, `unassign silinder`, `unassign kon` atau
`unassign kuboid` memadam pasangan jenis itu sahaja. `unassign kubu` juga
diterima sebagai alias kubus. Taip `tags` untuk menyemak slot kosong, kemudian
daftar kad semula. Arahan ini terus menyimpan perubahan dan membatalkan round
lama; pilihan jenis aktif dikekalkan. Panduan penuh: [COMMANDS.md](COMMANDS.md).

Jika hanya tiga jenis lengkap, aktifkan hanya jenis itu, contohnya:

```text
use kubus piramid silinder
```

Jika kesemua lima pasangan kad sudah lengkap:

```text
use kubus piramid silinder kon kuboid
```

LCD dan butang boleh diuji di menu walaupun pendaftaran belum lengkap:
tekan **HINT** untuk lapan halaman cara main. Untuk memulakan kuiz, kedua-dua
RFID mesti READY dan semua jenis aktif mesti mempunyai UID R1 serta R2.

## 5. Main dan semak keputusan

1. Menu: kedua-dua RGB bertukar warna perlahan setiap 1,000 ms; warna R1/R2
   sentiasa berlainan dan setiap LED bertukar daripada warna sebelumnya. NEXT memulakan
   pusingan baharu pada skor 0 dan masa 00:00; HINT membuka cara bermain.
2. **Urutan mengikut fokus soalan:** soalan bongkah memerlukan R1 bongkah
   kemudian R2 bentangan; soalan bentangan memerlukan R2 bentangan kemudian
   R1 bongkah. Reader pertama biru, kedua padam. Kad pertama betul menjadi
   hijau dan mengaktifkan reader kedua biru; belum mendapat markah.
3. **Salah pada mana-mana tahap memuktamadkan soalan pada +0.** Masa terus
   dijeda, kedua-dua RGB merah berkelip berterusan (150 ms ON/OFF), dan LCD
   menunjukkan jawapan serta sebab. Tekan **NEXT/TERUSKAN (B1, GPIO32)** untuk
   membuka soalan seterusnya. Tiada percubaan semula bagi soalan itu.
4. HINT membuka/menutup petunjuk ungu pada reader aktif; reader yang sudah
   betul kekal hijau. Masa berjalan dan kad masih diterima ketika hint.
   HINT/kad/retry diabaikan selepas jawapan salah dimuktamadkan.
5. Dua kad sepadan: **+1 sekali sahaja**, tiga kelipan hijau serentak. NEXT
   ketika masih menjawab: **+0**, tiga kelipan merah serentak.
6. Kelipan betul/langkau: 150 ms ON + 150 ms OFF, tiga kali, jumlah 900 ms;
   masa dijeda tepat pada tindakan. Input dalam urutan ini diabaikan.
   Selepas 900 ms, soalan baharu dibuka secara automatik dan masa bersambung.
   Kelipan salah kekal menunggu NEXT tanpa had masa.
7. Soalan baharu mengosongkan kemajuan dan mengikuti fokusnya sendiri.
   Angkat kad lama sebelum imbasan baharu pada setiap tahap. Kad pertama
   tidak wajib kekal di reader semasa mengimbas kad kedua.
8. Pada soalan terakhir, masa beku pada kad kedua betul, kad salah atau
   tindakan langkau. Betul/langkau membuka keputusan selepas 900 ms;
   salah menunggu NEXT. LCD keputusan menunjukkan skor, peratus dan masa.
   Pasangan RGB rawak berlainan warna bertukar setiap 150 ms.
9. Keputusan: NEXT memulakan pusingan baharu, HINT kembali ke menu perlahan.

UID belum didaftarkan dan kad dengan peranan salah ialah bantuan pemasangan,
bukan jawapan salah: notis 1,200 ms pada reader aktif, masa terus berjalan,
markah/tahap tidak berubah. Minta guru semak `status`, `check uid` atau
`assign`. Reader tidak READY tidak menghasilkan jawapan dan menghalang mula
atau sambung kuiz sehingga masalah diselesaikan.

Satu build RGB mengendalikan semua warna dan petunjuk R1/R2 di atas.
Panduan penuh: [flow dua kad dan RGB](docs/GAME_FLOW_RGB.md).

## Uji komponen melalui Serial Monitor

Fungsi daripada branch `testing/components` kini tersedia dalam `main`.
Ujian terus melalui Serial 115200 baud:

```text
test/help
test/rfid/r1
test/rfid/r2
R1Red
R1Green
R1Yellow
R1RGB
R2Red
R2Green
R2Yellow
R2RGB
ButtonTest
test/stop
```

Hantar satu arahan dan uji komponennya sebelum memilih arahan lain. Ujian aktif
menjeda permainan tanpa menukar pendaftaran kad. `test/stop` kembali ke menu.
Untuk warna sebenar, Build/Upload `esp32dev-rgb` dengan pin RGB pengguna terkini.
`R1RGB`/`R2RGB` mengulang semua tujuh warna mengikut turutan setiap 500 ms:
merah, hijau, biru, kuning, sian, magenta (ungu) dan putih. Gunakan
`R1Random`/`R2Random` untuk warna rawak pada satu LED. Gunakan `test/led/random`
untuk kedua-duanya serentak: warna R1/R2 sentiasa berlainan dan setiap LED
tidak mengulang warna sebelumnya. Warna tunggal kekal menyala.
`R1Purple`/`R2Purple` menguji ungu yang sama seperti hint permainan.
`R1Blue`/`R2Blue` menguji saluran biru, `R1Off`/`R2Off` memadam.
`ButtonTest` memantau kedua-dua butang; `NEXTTest` atau `HINTTest` memilih satu.
Tekan/lepas kurang 1 saat untuk `SHORT_PRESS`; tahan sekurang-kurangnya 1 saat
untuk `LONG_PRESS` sekali sahaja. Serial menunjukkan GPIO, tempoh dan kiraan.
Panduan lengkap dan contoh output: [COMPONENT_TESTS.md](docs/COMPONENT_TESTS.md).

## Arahan terminal PlatformIO

Buka **PlatformIO > Quick Access > Miscellaneous > PlatformIO Core CLI**
dalam VS Code. Terminal ini menyediakan arahan `pio` walaupun ia tiada
dalam PATH terminal biasa.

```text
pio run
pio run -t upload
pio device monitor
```

Ketiga-tiga arahan terus menggunakan satu build RGB. `Ctrl+C` menutup Monitor.
Untuk melihat port: `pio device list`.

## Semak versi firmware yang diupload

Pada boot/reset ESP32, Serial 115200 baud memaparkan:

```text
[FIRMWARE] GeoDecoder v2.0.0 | ESP32 | env=esp32dev-rgb
```

Jika Monitor dibuka selepas banner berlalu, taip `version`; `status` turut
menunjukkan identiti yang sama.
Arahan ini boleh dibaca semasa bermain atau semasa ujian komponen.

Bandingkan versi itu dengan **Versi semasa** pada README GitHub bagi commit
yang kamu pull. `git log -1 --oneline` mengenal pasti commit komputer.
Pull mengemas kini PC; Build dan Upload mengemas kini ESP32. Jika nombor masih
lama selepas pull, Upload semula environment yang betul. Rujuk [SOR versi](docs/SOR_VERSIONING.md).

## Struktur kod

| Fail/folder | Tujuan |
|---|---|
| `platformio.ini` | Board, library, pilihan LED dan Serial Monitor |
| `src/main.cpp` | Menggabungkan tab asal untuk build PlatformIO |
| `main/main.ino` | `setup()` dan `loop()` sahaja |
| `main/config.h` | Tetapan board: GPIO, polariti dan timing peranti |
| `main/firmware_version.h` | Satu sumber nombor versi firmware |
| `main/domain/` | Model, peraturan, validasi UID dan engine kuiz bebas Arduino |
| `main/application/` | API aplikasi, snapshot baca sahaja dan port perkakasan |
| `main/presentation/` | View LCD daripada snapshot dan kontrak Serial |
| `main/hardware/` | Kontrak driver dan peristiwa input |
| `main/question_bank.h` | 15 soalan dan hint bagi lima jenis bongkah |
| `main/*.ino` | Implementasi modul aplikasi serta adapter RFID/LCD/butang/LED/NVS |
| `tests/` | Ujian native dengan perkakasan simulasi |
| `SAMBUNGAN.md` | Jadual wayar asal |
| `COMMANDS.md` | Senarai penuh arahan Serial |
| `docs/lcd/` | PDF 15 halaman dan set PNG paparan LCD terkini |
| `print_labels/` | PDF kad RFID dan bentangan untuk membina bongkah |
| `tutorial/` | PDF panduan A-Z dan cara bermain murid bergambar |

Rujuk [panduan architecture](docs/ARCHITECTURE.md) sebelum mengubah modul.
Engine kuiz menerima masa sebagai nilai; application menerima adapter melalui
`AppPorts`. RFID/butang menghantar callback dan LCD menerima bingkai siap.

Edit modul dalam `main/`; `src/main.cpp` menggunakan tab yang sama, tanpa
salinan kedua logik permainan. `main/main.ino` masih boleh dibuka dalam
Arduino IDE jika diperlukan.

Lihat [semua 15 paparan soalan dan hint semasa](docs/LCD_QUESTION_REVIEW.md),
[PDF dokumentasi A4](docs/lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf)
dan [set 15 PNG](docs/lcd/GeoDecoder_15_Contoh_LCD_PNG.zip).
Bahan cetakan terkini disenaraikan dalam [indeks aset](docs/ASSETS.md).
Kad RFID: [set campuran model dan bentangan](print_labels/GeoDecoder_Kad_RFID_A4.pdf),
[bentangan 2D kiri/kanan](print_labels/GeoDecoder_Kad_2D_Kiri_Kanan_A4.pdf) dan
[model 3D kiri/kanan](print_labels/GeoDecoder_Kad_3D_Kiri_Kanan_A4.pdf).
Cetak kad pada **Actual size / 100%**. Bank runtime berada dalam
`main/question_bank.h`.

## Pengesahan dan kemas kini

Ujian simulasi memerlukan Python 3 dan G++:

```text
python tests/run_tests.py
python tests/run_tests.py --rgb
python tests/run_tests.py --entrypoint src/main.cpp
python tests/run_tests.py --entrypoint src/main.cpp --rgb
python tests/run_tests.py --separate-modules
python tests/run_tests.py --separate-modules --rgb
python tools/check_version.py
```

Setiap arahan `tests/run_tests.py` menyemak keselarasan versi, menjalankan
14 kes teras/application tanpa Arduino dan 75 kes integrasi firmware.
Mod `--separate-modules` mengkompil setiap tab secara
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


