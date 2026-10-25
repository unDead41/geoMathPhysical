# GeoDecoder - pakej perkongsian

Versi semasa: **v1.1.1**. Pakej **1.1.1-sharing.2**.
Sumber firmware: main [`aa6e5d722038a0f229a9521efcc7cda58d62a9bd`](https://github.com/unDead41/geodecoder/commit/aa6e5d722038a0f229a9521efcc7cda58d62a9bd).
Semua fail `main/`, `src/main.cpp` dan `platformio.ini` sama tepat dengan sumber itu.
Installer tidak mengubah firmware atau pendaftaran UID.

Sasaran: Windows 10/11 **x64**, PowerShell 5.1+, Internet, ESP32 klasik
WROOM-32/32E. Board C3/S3, ARM Windows dan RGB NeoPixel bukan sasaran pakej ini.
Arduino IDE dan Git tidak diperlukan. Build boleh dibuat tanpa board.

## Pasang dengan satu arahan

1. Dapatkan ZIP pakej GeoDecoder sharing terkini daripada pemilik projek.
   Repo private; ZIP baharu mengandungi kod projek dan enam PDF termasuk tutorial A-Z dan cara bermain murid. Penerima
   tidak memerlukan akses repo, akaun atau token GitHub. Dependency vendor
   dimuat turun berasingan oleh installer daripada sumber rasmi.
2. Klik kanan ZIP > **Extract All**. Masuk folder `geodecoder-sharing` yang
   mengandungi `setupGeoDecoder.ps1`, kemudian buka PowerShell di situ.
3. Jalankan sebagai pengguna biasa:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setupGeoDecoder.ps1
```

Installer mengesahkan SHA-256, menyalin ke `%USERPROFILE%\geodecoder-sharing`,
menyediakan Python jika perlu, PlatformIO Core **6.1.18** dalam virtualenv
berasingan, VS Code User Setup dan extension PlatformIO IDE; memilih
 environment/COM, Build, kemudian membuka workspace yang betul.
Pilih **1/Enter = RGB**, **2 = LED biasa**. Tanpa board, Build boleh selesai;
pilih COM kemudian. **Tiada Upload automatik.**

Pemasangan menggunakan installer rasmi Python/VS Code dan terma vendor
masing-masing. Tiada perubahan execution policy kekal atau tetapan VS Code global
oleh skrip. Group Policy organisasi mungkin memerlukan bantuan pentadbir.
Dependency pertama memerlukan Internet/ruang cakera dan boleh mengambil masa
beberapa minit; tiada had masa siap dijanjikan.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setupGeoDecoder.ps1 -Environment esp32dev-rgb -BuildBoth
```

Pilihan: `-Destination "D:\Projek\geodecoder-sharing"`, `-Port COM5` (ganti nombor
sebenar), `-NoPrompt` (pilihan tersimpan atau RGB kali pertama), `-NoOpen`.
Jalankan semula arahan sama jika terganggu. Fail sama digunakan semula;
suntingan sumber dan fail peribadi tidak ditindih. Untuk sumber disunting atau
pakej baharu, pilih destinasi baharu. Folder projek Git/peribadi ditolak.

## Build, Upload dan Monitor

Buka `GeoDecoder.local.code-workspace` dalam folder pemasangan. Jika diminta
Workspace Trust, semak asal ZIP dan pilih Trust jika dipercayai.
**Terminal > Run Task > GeoDecoder: Build / Upload / Monitor / Configure / Ports**.
`Ctrl+Shift+B` menjalankan Build. Atau jalankan satu arahan pada satu masa
melalui PowerShell dalam folder projek:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\geodecoder.ps1 -Action Ports
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\geodecoder.ps1 -Action Configure
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\geodecoder.ps1 -Action Build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\geodecoder.ps1 -Action Upload
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\geodecoder.ps1 -Action Monitor
```

`Configure` memilih environment dan COM; muat semula VS Code selepas menukar
environment. `-Environment` atau `-Port` pada Build/Upload/Monitor mengatasi
pilihan tersimpan untuk arahan itu sahaja. Jika beberapa port USB wujud, pilih
port board melalui **Device Manager > Ports**. Satu port USB yang dikesan belum
membuktikan ia ESP32 sasaran. Upload hanya berlaku atas arahan Upload.

| Environment | Perkakasan | Pin |
|---|---|---|
| `esp32dev` | Dua LED biasa | R1=25, R2=26 |
| `esp32dev-rgb` | Dua RGB empat kaki | R1 R/G/B=13/14/25; R2=16/17/26 |

`platformio.ini` asal: `espressif32@6.12.0`, board `esp32dev`, framework Arduino,
Arduino ESP32 2.0.17 yang dipilih platform, `MFRC522@1.4.12`, `hd44780@1.3.2`.
Serial **115200 baud**. Contoh COM: `platformio.local.ini.example`.
Installer menghasilkan `platformio.local.ini` pada PC ini. Gunakan Configure
untuk mengubah fail yang diurus installer; fail COM manual tidak ditindih.
PlatformIO Project Tasks > environment > General > Build/Upload/Monitor juga tersedia.

## Langkah fizikal

Ikut [SAMBUNGAN.md](SAMBUNGAN.md): RC522 3.3 V, LCD 5 V melalui penukar aras I2C,
GND bersama. RGB default common cathode, butang active LOW. Jika modul berbeza,
semak polariti dalam `main/config.h` dan Build semula. Jangan ubah pin tanpa
memadankan wayar. Sambung kabel USB **data**, tutup Monitor lain, kemudian Upload.
Jika `Connecting...` berulang, tahan **BOOT** sehingga penulisan bermula, kemudian
lepaskan. Tekan **EN/RESET** selepasnya jika perlu.

Jika COM tiada, cuba kabel/port lain dan semak cip USB-UART pada board.
Pasang driver pengeluar sepadan sahaja:
[CP210x Silicon Labs](https://www.silabs.com/developer-tools/usb-to-uart-bridge-vcp-drivers)
atau [CH340/CH341 WCH](https://www.wch-ic.com/downloads/CH341SER_EXE.html).
Installer tidak meneka driver bagi board yang belum dikenal pasti.
Jalankan Configure semula jika COM berubah.

Dalam Monitor, taip satu per satu dengan Enter: `version`, `pins`, `status`,
`test/rfid/check`. Imbas kad pada kedua-dua pad; READY sahaja ialah respons
register, belum membuktikan bacaan antena. Kalibrasi: `R1RGB`, `R2RGB`,
`R1Purple`, `R2Purple`, `test/led/random`, `ButtonTest`, satu arahan setiap kali.
Keluar dengan `test/stop`. Diagnostik runtime tidak mendaftarkan kad atau
memberi markah. Semua arahan: [COMMANDS.md](COMMANDS.md), `help`, `test/help`.

## Daftar kad dan main

Jika `tags` menunjukkan pasangan kad lama lengkap, tidak perlu daftar semula.
Untuk jawapan baharu: taip `assign r1 kubus`, dekatkan bahagian bawah bongkah
kubus yang mempunyai kad RFID pada R1; taip `assign r2 kubus`, imbas kad RFID
yang ditampal cetakan bentangan kubus di R2. Ulang satu per satu untuk
`piramid`, `silinder`, `kon`, `kuboid`. Setiap slot memerlukan kad berlainan.
Pilih jenis lengkap, misalnya `use kubus piramid silinder`.

Menu: NEXT mula, HINT cara main. Setiap soalan memerlukan **R1 bongkah dahulu,
kemudian R2 bentangan sepadan**; +1 selepas kedua-duanya betul. Biru menunggu,
hijau betul, merah salah, ungu hint. Angkat kad sebelum imbasan seterusnya.
NEXT ketika soalan melangkau; tiga kelipan selepas betul/langkau menjeda masa.
Keputusan menunjukkan skor dan masa akhir. NEXT main semula; HINT menu.

Setup/Build tidak menyentuh board. Upload biasa mengekalkan UID bagi partition
asal projek; jangan gunakan Erase Flash. Board dengan partition tersuai perlu
disemak sebelum Upload. Arahan `unassign` masih tersedia untuk penggunaan guru
secara sengaja; installer tidak menghantarnya.

## Fail yang dihantar

Senarai tepat setiap fail dan SHA-256 berada dalam `package.json`.

| Lokasi | Kandungan |
|---|---|
| `main/`, `src/main.cpp` | Source/header firmware termasuk diagnostik runtime |
| `platformio.ini`, `platformio.local.ini.example` | Board/library dipin, contoh COM |
| `setupGeoDecoder.ps1`, `setup.ps1`, `geodecoder.ps1`, `scripts/common.ps1` | Installer dan arahan pengguna |
| `.vscode/`, `.gitignore`, `.gitattributes` | Task, cadangan extension, peraturan fail |
| `README.md`, `SAMBUNGAN.md`, `COMMANDS.md`, `package.json` | Panduan, wayar, Serial, identiti pakej |
| `print_labels/GeoDecoder_Kad_RFID_A4.pdf` | Kad campuran, 2 halaman |
| `print_labels/GeoDecoder_Kad_2D_Kiri_Kanan_A4.pdf` | Bentangan kiri/kanan, 2 halaman |
| `print_labels/GeoDecoder_Kad_3D_Kiri_Kanan_A4.pdf` | Model kiri/kanan, 2 halaman |
| `docs/lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf` | LCD soalan/hint, tepat 15 halaman |
| `tutorial/GeoDecoder_Panduan_A-Z.pdf` | Tutorial pengguna lengkap A-Z, 45 halaman |
| `tutorial/GeoDecoder_Cara_Bermain_Murid.pdf` | Cara bermain bergambar untuk murid, 21 halaman tanpa nombor halaman |

Kad sumber versi 2 (16 Oktober 2026): tiada nama jawapan atau arahan "ikut LED".
Cetak **A4, Actual size / 100%**, matikan Fit to page; semak garis 50 mm dahulu.
LCD sumber versi 4 (24 Oktober 2026).

**[Buka tutorial lengkap GeoDecoder A-Z](tutorial/GeoDecoder_Panduan_A-Z.pdf)** — 45 halaman A4 bergambar, edisi 25 Oktober 2026, meliputi firmware v1.1.1 dan installer sharing. Ikut urutan sambungan, setup Windows, Build/Upload, ujian komponen, pendaftaran kad dan satu pusingan permainan.

**[Buka cara bermain GeoDecoder untuk murid](tutorial/GeoDecoder_Cara_Bermain_Murid.pdf)** — 21 halaman A4 melintang, tanpa nombor halaman. Gambar simulasi menunjukkan bongkah 3D sebenar dengan kad RFID di bawahnya untuk R1 dan kad RFID yang ditampal cetakan bentangan untuk R2. Label LED R1/LED R2, butang NEXT/HINT, petunjuk ungu, jawapan salah/betul, langkau, skor, masa dan bermain semula diterangkan melalui gambar. Bahasa mudah untuk murid Tingkatan 1; istilah matematik dirujuk kepada KSSM Matematik Tingkatan 2, DSKP SP 6.1.1 dan 6.2.1.

**Contoh prisma segi tiga ialah simulasi penerangan sahaja.** Firmware v1.1.1 masih menyokong kubus, kuboid, piramid berasaskan segi empat sama, silinder dan kon; jawapan prisma belum tersedia. Rajah prisma dalam panduan tidak menambah bahan kepada tiga PDF kad cetak asal. Gunakan bongkah dan kad bentangan yang guru sediakan; guru perlu menguji bacaan kad RFID di bawah setiap bongkah sebenar. Peraturan butang, R1/R2, lampu, markah dan masa disemak dengan source sharing; gambar ini bukan bukti ujian perkakasan fizikal.

**Nama installer utama ialah `setupGeoDecoder.ps1`.** Fail kecil `setup.ps1` dikekalkan sebagai alias supaya arahan dalam PDF sedia ada masih berfungsi. Kedua-duanya menjalankan installer yang sama dan menerima pilihan yang sama. Mesej installer kini menunjukkan tutorial yang disertakan.

Branch sharing mempunyai tree minimum tetapi masih mempunyai sejarah main.
Beri **ZIP bersih** kepada penerima yang tidak patut menerima sejarah repo.
Jangan merge sharing ke main. ZIP tiada `.git`, sejarah pembangunan, fixture/
ujian developer, UID sebenar, token, toolchain, cache, output build atau COM peribadi.

Pakej 1.1.1-sharing.2 disemak melalui 16 senario simulasi aliran installer pada
Linux PowerShell 7.4.13 (mode argumen Legacy); operasi pemasangan Windows
menggunakan pengganti terkawal. Muat turun sebenar installer Python dan VS Code
dari URL skrip berjaya. Pemasangan aplikasi dan pengesahan melalui stor sijil
Windows sebenar, Upload USB serta perkakasan fizikal masih belum diuji.
