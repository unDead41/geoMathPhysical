# GeoDecoder - pakej perkongsian

Versi semasa: **v2.0.0**. Pakej **2.0.0-sharing.1**.
Sumber firmware: main [`c368e8c951478360c89f99b8a3c9944a62761049`](https://github.com/unDead41/geodecoder/commit/c368e8c951478360c89f99b8a3c9944a62761049).
Semua fail `main/` dan `src/main.cpp` sama tepat dengan sumber itu.
`platformio.ini` menggunakan nama environment khusus sharing; board, pin dan dependency kekal sama.
Installer tidak mengubah firmware atau pendaftaran UID.

Sasaran: Windows 10/11 **x64**, PowerShell 5.1+, Internet, ESP32 klasik
WROOM-32/32E. Board C3/S3, ARM Windows dan RGB NeoPixel bukan sasaran pakej ini.
Arduino IDE dan Git tidak diperlukan. Build boleh dibuat tanpa board.

## Pasang dengan satu arahan

1. Dapatkan ZIP pakej GeoDecoder sharing terkini daripada pemilik projek.
   Repo private; ZIP baharu mengandungi kod projek dan tujuh PDF termasuk bentangan bongkah, tutorial A-Z dan cara bermain murid. Penerima
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
berasingan, VS Code User Setup dan extension PlatformIO IDE; memilih COM,
Build RGB, kemudian membuka workspace yang betul. **Satu build sahaja**:
`esp32dev-sharing-rgb`, ditetapkan secara automatik tanpa soalan jenis LED.
Tanpa board, Build boleh selesai; pilih COM kemudian. **Tiada Upload automatik.**

Pemasangan menggunakan installer rasmi Python/VS Code dan terma vendor
masing-masing. Tiada perubahan execution policy kekal atau tetapan VS Code global
oleh skrip. Group Policy organisasi mungkin memerlukan bantuan pentadbir.
Dependency pertama memerlukan Internet/ruang cakera dan boleh mengambil masa
beberapa minit; tiada had masa siap dijanjikan.

Pilihan: `-Destination "D:\Projek\geodecoder-sharing"`, `-Port COM5` (ganti nombor
sebenar), `-NoPrompt` (COM tersimpan/dikesan atau sambung tanpa board), `-NoOpen`.
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

`Configure` memilih COM sahaja; RGB ditetapkan secara automatik.
`-Port` pada Build/Upload/Monitor mengatasi pilihan tersimpan untuk arahan itu
sahaja. Jika beberapa port USB wujud, pilih
port board melalui **Device Manager > Ports**. Satu port USB yang dikesan belum
membuktikan ia ESP32 sasaran. Upload hanya berlaku atas arahan Upload.

| Environment | Perkakasan | Pin |
|---|---|---|
| `esp32dev-sharing-rgb` (default tunggal) | Dua RGB empat kaki | R1 R/G/B=13/14/25; R2=16/17/26 |

`platformio.ini` asal: `espressif32@6.12.0`, board `esp32dev`, framework Arduino,
Arduino ESP32 2.0.17 yang dipilih platform, `MFRC522@1.4.12`, `hd44780@1.3.2`.
Serial **115200 baud**. Contoh COM: `platformio.local.ini.example`.
Installer menghasilkan `platformio.local.ini` pada PC ini. Gunakan Configure
untuk mengubah fail yang diurus installer; fail COM manual tidak ditindih.
PlatformIO Project Tasks > environment > General > Build/Upload/Monitor juga tersedia.

Nama ini khusus untuk branch `sharing`. Terus klik **Build / Upload** di bar
bawah PlatformIO. **Default** ialah kumpulan automatik yang menggunakan build
RGB tunggal yang sama; tiada konfigurasi kedua untuk dipilih. Checkout Git
dan pemasangan ZIP sama-sama default kepada RGB.

Pilihan `-Environment` lama dalam arahan PowerShell masih diterima, tetapi
semua nama lama dipadankan kepada build RGB tunggal. `-BuildBoth` lama turut
diterima dan membina RGB sekali sahaja. Langkau langkah memilih LED dalam PDF.
CLI PlatformIO terus boleh menggunakan `pio run`, `pio run -t upload` dan
`pio device monitor`, tanpa `-e` atau pemilihan environment.
Tetapan lama yang diurus installer ditukar apabila menjalankan `geodecoder.ps1`
atau setup semula, sambil mengekalkan COM. Fail INI yang disunting pengguna
dilindungi; jika menetapkan `default_envs` secara manual, tukar nama environment
pada baris itu sendiri dan kekalkan tetapan COM/pin yang diperlukan.

Serial Monitor mencetak `GeoDecoder v2.0.0 | ESP32 | env=esp32dev-rgb`.
Label hardware Serial sama dengan main; nama tugas sharing dibezakan di atas.

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

Menu: NEXT mula pusingan baharu pada skor 0 dan 00:00; HINT membuka lapan
halaman cara main. R1 kekal bongkah, R2 kekal bentangan. Urutan ikut fokus:

| Soalan | Kad pertama | Kad kedua |
|---|---|---|
| Bongkah: ciri atau formula | Bongkah di R1 | Bentangan sepadan di R2 |
| Bentangan | Bentangan di R2 | Bongkah sepadan di R1 |

Reader pertama biru, kedua padam. Kad pertama betul menjadi hijau dan reader
kedua biru; belum mendapat markah. HINT membuka/menutup petunjuk ungu pada
reader aktif, yang sudah betul kekal hijau. Masa berjalan ketika menjawab/hint.
Angkat kad lama sebelum imbasan seterusnya; kedua-duanya tidak wajib kekal di
reader serentak.

**Salah pada mana-mana tahap memuktamadkan +0.** Skor terdahulu kekal; masa
dijeda tepat pada scan salah. Kedua-dua RGB merah berkelip bersama berterusan
150 ms ON/OFF, LCD menunjukkan jawapan dan sebab sehingga
**NEXT/TERUSKAN = B1/GPIO32** ditekan. HINT ialah B2/GPIO33. Warna fizikal
butang tidak mengubah pemetaan. Contoh sebenar K1:

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
6 muka segi empat
sama saiz dan bentuk
```

Nama dan dua baris sebab tersedia bagi semua 15 soalan, termasuk formula dan
bentangan. Soalan/hint biasa tidak mendedahkan nama jawapan. HINT, kad,
`retry`/`clear` tidak membuka percubaan baharu selepas salah. `stop`/`play`,
semakan guru dan diagnostik mengekalkan keputusan; `play` memulihkan penerangan
salah dengan masa beku. NEXT meneruskan terus ke soalan baharu serta menyambung
masa; pada soalan terakhir, NEXT membuka keputusan tanpa menyambung masa.

Dua kad betul memberi **+1 sekali sahaja**, tiga kelipan hijau serentak.
NEXT ketika masih menjawab kekal langkau **+0**, tiga kelipan merah serentak.
Kedua-duanya 150 ms ON + 150 ms OFF, tiga kali (900 ms); masa dijeda tepat
pada tindakan. Selepas 900 ms, automatik buka soalan seterusnya ikut fokus
sendiri dan sambung masa, atau keputusan akhir yang kekal beku. Input dalam
900 ms diabaikan dan butang ditahan tidak dibawa ke soalan berikut.

UID belum didaftar/peranan kad salah ialah notis bantuan 1,200 ms pada reader
aktif, bukan soalan salah; skor/tahap kekal dan masa terus berjalan. Minta guru
semak `status`, `check uid` atau `assign`. Reader tidak READY menghalang mula/
sambung; kegagalan membaca bukan jawapan salah.

Menu/panduan: RGB rawak setiap 1,000 ms. Keputusan: setiap 150 ms. Pasangan
warna sentiasa berlainan dan setiap LED mengelak warna sebelumnya. LCD keputusan
menunjukkan skor, peratus dan masa akhir; NEXT main semula, HINT menu.

**PDF/tutorial masih edisi lama.** Sebelum merakam video, rujuk flow v2.0.0 di
atas atau [handoff video/tutorial main](https://github.com/unDead41/geodecoder/blob/main/docs/TUTORIAL_FLOW_V2_HANDOFF.md).
PDF A-Z, cara bermain murid dan 15 LCD/PNG memerlukan kemas kini urutan,
keputusan salah, penerangan LCD, lapan halaman panduan serta aturan masa.
PDF kad/bentangan cetak dan semua aset tutorial sedia ada dikekalkan.

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
| `print_labels/GeoDecoder_Bentangan_2_Set_Tanpa_Tulisan_A4.pdf` | Dua set bentangan untuk membina lima bongkah, 20 halaman |
| `print_labels/GeoDecoder_Kad_RFID_A4.pdf` | Kad campuran, 2 halaman |
| `print_labels/GeoDecoder_Kad_2D_Kiri_Kanan_A4.pdf` | Bentangan kiri/kanan, 2 halaman |
| `print_labels/GeoDecoder_Kad_3D_Kiri_Kanan_A4.pdf` | Model kiri/kanan, 2 halaman |
| `docs/lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf` | LCD soalan/hint, tepat 15 halaman |
| `tutorial/GeoDecoder_Panduan_A-Z.pdf` | Tutorial pengguna lengkap A-Z, 45 halaman |
| `tutorial/GeoDecoder_Cara_Bermain_Murid.pdf` | Cara bermain bergambar untuk murid, 21 halaman tanpa nombor halaman |

**[Buka bentangan untuk membina bongkah](print_labels/GeoDecoder_Bentangan_2_Set_Tanpa_Tulisan_A4.pdf)** —
20 halaman A4 landskap, dua set lima bongkah. Kedua-dua set sudah dikecilkan
20% daripada ukuran sebelumnya; tapak terkecil 6 cm. Tab gam lebih lebar,
semua sisi satu tona dan hanya tapak bawah gelap. Tiada tulisan atau garis
putus-putus. Cetak **satu muka, Actual size / 100%**, matikan **Fit to page**;
gunting garisan luar dan lipat pada garis hitam nipis, kemudian gam tab kelabu
ke dalam. Semak ruang kunci RFID sebenar sebelum menutup tapak.

Kad sumber versi 2 (16 Oktober 2026): tiada nama jawapan atau arahan "ikut LED".
Cetak **A4, Actual size / 100%**, matikan Fit to page; semak garis 50 mm dahulu.
LCD sumber versi 4 (24 Oktober 2026).

**[Buka tutorial lengkap GeoDecoder A-Z](tutorial/GeoDecoder_Panduan_A-Z.pdf)** — 45 halaman A4 bergambar, edisi 25 Oktober 2026, meliputi firmware v1.1.1 dan installer sharing. Ikut urutan sambungan, setup Windows, Build/Upload, ujian komponen, pendaftaran kad dan satu pusingan permainan.

**[Buka cara bermain GeoDecoder untuk murid](tutorial/GeoDecoder_Cara_Bermain_Murid.pdf)** — 21 halaman A4 melintang, tanpa nombor halaman. Gambar simulasi menunjukkan bongkah 3D sebenar dengan kad RFID di bawahnya untuk R1 dan kad RFID yang ditampal cetakan bentangan untuk R2. Label LED R1/LED R2, butang NEXT/HINT, petunjuk ungu, jawapan salah/betul, langkau, skor, masa dan bermain semula diterangkan melalui gambar. Bahasa mudah untuk murid Tingkatan 1; istilah matematik dirujuk kepada KSSM Matematik Tingkatan 2, DSKP SP 6.1.1 dan 6.2.1.

**Contoh prisma segi tiga ialah simulasi penerangan sahaja.** Firmware v2.0.0 masih menyokong kubus, kuboid, piramid berasaskan segi empat sama, silinder dan kon; jawapan prisma belum tersedia. Rajah prisma dalam panduan tidak menambah bahan kepada tiga PDF kad cetak asal. Gunakan bongkah dan kad bentangan yang guru sediakan; guru perlu menguji bacaan kad RFID di bawah setiap bongkah sebenar. Peraturan butang, R1/R2, lampu, markah dan masa disemak dengan source sharing; gambar ini bukan bukti ujian perkakasan fizikal.

**Nama installer utama ialah `setupGeoDecoder.ps1`.** Fail kecil `setup.ps1` dikekalkan sebagai alias supaya arahan dalam PDF sedia ada masih berfungsi. Kedua-duanya menjalankan installer yang sama dan menerima pilihan yang sama. Mesej installer kini menunjukkan tutorial yang disertakan.

Branch sharing mempunyai tree minimum tetapi masih mempunyai sejarah main.
Beri **ZIP bersih** kepada penerima yang tidak patut menerima sejarah repo.
Jangan merge sharing ke main. ZIP tiada `.git`, sejarah pembangunan, fixture/
ujian developer, UID sebenar, token, toolchain, cache, output build atau COM peribadi.

Pakej **2.0.0-sharing.1** menggunakan satu build RGB dan firmware sama tepat
dengan main v2.0.0. Tujuh PDF serta installer sedia ada dikekalkan. Tree kekal
minimum (58 fail): tiada ujian/development docs/cache/build ditambah. Manifest
memadankan senarai 57 payload, checksum dan SHA main sumber sebenar.

Pengesahan firmware: 14/14 kes pure core/application/view dan 75/75 integrasi
lulus merentas enam konfigurasi native main, termasuk entry PlatformIO RGB dan
modul berasingan. Entry RGB sharing turut diuji menggunakan harness main.
`pio run` default berjaya pada kedua-dua branch. Ujian ini simulasi/kompilasi;
tiada upload USB, ujian Windows installer sebenar atau ujian board fizikal.
