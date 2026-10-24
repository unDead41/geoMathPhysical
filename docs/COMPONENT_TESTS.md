# Ujian komponen melalui Serial Monitor

Tersedia dalam **main**, digabungkan daripada branch `testing/components`
commit `36d999a9016cf0389005cede7567b654c462b03d`. Firmware ini merangkumi ujian
komponen, flow dua kad dan pin RGB terkini. Branch asal dikekalkan.

## Buka dan upload sekali

Dalam terminal VS Code pada folder projek:

```text
git fetch origin
git switch main
git pull --ff-only origin main
```

Selepas main dikemas kini, pilih environment di PlatformIO Project Tasks:

| Environment | Pemasangan |
|---|---|
| `esp32dev` (default) | LED biasa R1=GPIO25, R2=GPIO26; hanya ON/OFF |
| `esp32dev-rgb` | RGB1 R/G/B=16/17/26; RGB2 R/G/B=13/14/25 |

Pilih **Build**, kemudian **Upload**, kemudian **Monitor**, kelajuan **115200 baud**.
Hantar satu arahan setiap baris dengan Enter/Newline. Selepas firmware ini diupload,
ujian komponen seterusnya boleh dipilih melalui Serial tanpa menukar kod/upload lagi.
UID sedia ada kekal; jangan gunakan Erase Flash untuk upload rutin.

Mulakan dengan:

```text
test/help
```

`test`, `test/rfid`, `test/led` dan `test/button` turut membuka senarai arahan.
Huruf besar/kecil dan ruang sebelum/selepas path diterima. Path yang tidak sah,
segmen kosong, trailing slash dan argumen tambahan ditolak tanpa menukar ujian aktif.

## RFID

```text
test/rfid/status
test/rfid/check
test/rfid/r1
test/rfid/r2
test/rfid/all
test/stop
```

Jalankan **satu arahan**, uji sehingga selesai, kemudian pilih arahan seterusnya.

| Arahan | Perkara yang diuji |
|---|---|
| `test/rfid/status` | Status firmware/connection tersimpan daripada boot atau probe terakhir; tidak menukar sesi |
| `test/rfid/check` | Baca semula VersionReg kedua-dua MFRC522 melalui SPI, lapor keadaan terkini, kemudian imbas kedua-dua pembaca |
| `test/rfid/r1` | Imbas UID pada R1 sahaja; R2 tidak membaca |
| `test/rfid/r2` | Imbas UID pada R2 sahaja; R1 tidak membaca |
| `test/rfid/all` | Kedua-dua pembaca, menggunakan giliran antena sedia ada; alias `test/rfid/scan` |

Contoh output: `R1 firmware=0x92 READY`, kemudian `[R1] UID: ... | bytes=4 | count=1`.
READY bermaksud respons register dikesan; ia belum membuktikan antena boleh membaca
kad. Imbas kad sebenar untuk mengesahkan UID. `0x00` atau `0xFF NOT FOUND` menandakan
tiada respons register yang sah mengikut driver semasa.

Kad tidak berdaftar juga boleh diuji. Ujian ini **tidak mendaftarkan kad**, tidak
memberi markah dan tidak mengubah mapping UID. Kad boleh sudah berada pada pad
ketika ujian dimulakan. Angkat dan imbas semula untuk bacaan seterusnya; memegang
kad pada pad tidak membanjiri monitor dengan UID yang sama.

Semasa ujian RFID, LED pembaca dipilih menjadi biru jika READY, merah jika offline.
Jika bekalan/wayar baru dibetulkan tetapi UID masih tidak boleh dibaca, reset board
untuk inisialisasi reader, kemudian ulang `test/rfid/check` dan ujian UID.

## LED atau RGB

```text
test/led/r1/red
test/led/r1/green
test/led/r1/blue
test/led/r2/red
test/led/r2/green
test/led/r2/blue
test/led/all/yellow
test/led/cycle
test/led/blink
test/led/off
test/stop
```

Format penuh: **test/led/target/action**. Target ialah `r1`, `r2` atau `all`.
Jika target ditinggalkan (`test/led/red`), kedua-duanya diuji.

| Action | Hasil yang perlu dilihat |
|---|---|
| `red`, `green`, `blue` | Semak saluran R/G/B secara individu |
| `yellow` | R dan G bersama |
| `cyan` | G dan B bersama |
| `magenta` | R dan B bersama |
| `white` | R, G dan B bersama |
| `off` | Padam dan kekal padam sehingga arahan lain atau test/stop |
| `cycle` | Merah → hijau → biru → kuning → sian → magenta → putih, 500 ms setiap warna, berulang |
| `blink` | Putih 250 ms ON + 250 ms OFF, berulang |

Hanya target dipilih menyala; LED lain padam. Output ujian tidak ditimpa warna
menu. Serial menyebut warna yang sedang diminta supaya warna fizikal boleh
dibandingkan. Dalam mod LED biasa, semua warna selain OFF menjadi ON dan mesej
menerangkannya. Pilih `esp32dev-rgb` untuk benar-benar memeriksa warna.

## Butang

```text
test/button/status
test/button/all
test/button/next
test/button/hint
test/button/reset
test/status
test/stop
```

`status` membaca keadaan sekali tanpa memulakan watch. `all` memantau kedua-dua
butang; `next` hanya NEXT/GPIO32; `hint` hanya HINT/GPIO33. `reset` mengosongkan
kiraan dan memulakan watch kedua-duanya. Pertukaran watch juga bermula dari 0.

Contoh output:

```text
[TEST BUTTON] NEXT GPIO32 raw=LOW stable=TEKAN count=1
[TEST BUTTON] NEXT GPIO32 raw=HIGH stable=LEPAS count=1
```

`raw` ialah aras elektrik sebenar; `stable` ialah bacaan selepas debounce 40 ms.
Default active LOW: dilepaskan HIGH, ditekan LOW. Kiraan bertambah pada tekanan
stabil sahaja. Tahan satu butang: kiraan kekal satu. Lepaskan dan tekan lagi:
kiraan bertambah. Perubahan raw ketika sentuhan melantun boleh muncul tetapi
tidak dikira sebagai tekanan baharu sebelum stabil.

Dalam watch butang, LED berkaitan hijau ketika butang ditekan stabil, padam
ketika dilepaskan. Kedua-dua butang tidak menjalankan permainan/menu semasa
apa-apa ujian komponen aktif, termasuk butang yang tidak dipilih untuk watch.

## Berhenti atau tukar ujian

```text
test/status
test/stop
```

`stop` juga menamatkan sesi ujian. Ujian berterusan sehingga dihentikan atau
diganti dengan arahan ujian lain. Keluar mengembalikan menu; ia tidak menyambung
permainan secara automatik. Lepaskan butang sehingga stabil sebelum menekannya
untuk bermain. Tekanan yang masih dipegang tidak dibawa ke menu/pusingan baharu.

Masa/markah permainan kekal dijeda dan UID/NVS tidak ditulis oleh ujian. Semasa
ujian aktif, `help`, `pins`, `status`, `tags`, `current`, `bank` dan `score` boleh
dibaca. Jalankan `test/stop` dahulu sebelum `play`, `next`, `hint`, `check uid`,
`assign` atau perubahan registry. Semua arahan guru lama kekal tersedia selepas
keluar. NEXT pada menu memulakan round baharu; Serial `play` boleh menyambung
soalan yang dijeda dengan pasangan kad baharu dari R1.

LCD 20x4 memaparkan UJIAN KOMPONEN, komponen/target dan arahan keluar. Menu akan
dipaparkan semula selepas test/stop. Flow permainan dan bank soalan tidak berubah.

Rekod [VERIFICATION.md](../VERIFICATION.md) membezakan simulasi, build ESP32,
upload USB dan ujian fizikal. Kejayaan build/simulasi tidak membuktikan keadaan
wayar, warna fizikal atau prestasi antena pada board pengguna.
