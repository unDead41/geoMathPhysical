# SOR GeoDecoder: versi firmware dan rujukan GitHub

Berkuat kuasa 25 Oktober 2026. Baca dokumen ini **sebelum sebarang kemas kini**.
Versi pertama yang diberi nombor ialah **v1.0.0**; sejarah sebelumnya kekal
sebagai entri bertarikh, bukan versi yang direka kemudian.

## 1. Format dan sumber utama

Gunakan **vMAJOR.MINOR.PATCH**, contohnya `v1.0.0`, `v1.0.1`, `v1.1.0` dan
`v2.0.0`. Setiap bahagian ialah integer tanpa sifar tambahan di hadapan.
Bilangan digit tidak dihadkan kepada dua; `v1.12.103` juga sah.

`main/firmware_version.h` ialah **satu sumber nombor runtime**:

```cpp
#define GEODECODER_VERSION "1.0.0"
#define GEODECODER_VERSION_TAG "v" GEODECODER_VERSION
```

Banner boot, arahan `version` dan output `status` mesti mengambil nilai daripada
header ini. Jangan salin nombor ke dalam fungsi Serial atau mengubah versi NVS
untuk menaikkan versi firmware.

## 2. Bila nombor dinaikkan

| Bahagian | Jenis perubahan | Contoh |
|---|---|---|
| PATCH | Pembaikan serasi, pembetulan soalan/ayat, dokumentasi, aset dan penentukuran kecil | v1.0.0 → v1.0.1 |
| MINOR | Fungsi baharu yang mengekalkan penggunaan sedia ada, termasuk arahan Serial baharu | v1.0.1 → v1.1.0 |
| MAJOR | Perubahan yang memutuskan keserasian penggunaan, kontrak atau data sedia ada | v1.1.0 → v2.0.0 |

Setiap **kemas kini yang diterbitkan ke main** mesti mempunyai versi lebih tinggi
daripada main sebelumnya, termasuk kemas kini dokumen/aset sahaja. Satu keluaran
yang mengandungi beberapa commit boleh menaikkan versi sekali. Jangan naikkan
versi bagi setiap simpan fail atau setiap arahan ujian.

Apabila MINOR naik, PATCH kembali 0. Apabila MAJOR naik, MINOR dan PATCH kembali
0. Perubahan format data masih memerlukan pelan migrasinya sendiri; nombor versi
firmware tidak menggantikan migrasi.

## 3. Branch dan kemas kini serentak

1. Baca AGENTS.md, SOR ini dan main sebenar; catat branch, SHA dan versi asas.
2. Tetapkan nombor cadangan mengikut skop akhir. Versi branch masih cadangan
   sehingga commit berkenaan benar-benar diterbitkan ke main.
3. Sebelum merge/push, semak main sekali lagi. Jika branch lain sudah menggunakan
   nombor itu, pilih nombor seterusnya daripada main terkini dan selaraskan semula.
4. Selesaikan konflik sambil mengekalkan perubahan sah daripada main. Jangan
   menindih main yang bergerak atau menggunakan semula nombor keluaran lama.
5. Setiap laporan akhir menyatakan **versi, branch, SHA commit, perubahan dan
   pengesahan sebenar**, termasuk had ujian fizikal jika berkaitan.

## 4. Perkara yang mesti sepadan di GitHub

Dalam keluaran yang sama, kemas kini bersama:

- `main/firmware_version.h`: nombor canonical tanpa awalan v.
- `README.md`: satu baris `Versi semasa: **vMAJOR.MINOR.PATCH**.`
- `CHANGELOG.md`: entri versi terbaharu di atas sejarah lama, tarikh Malaysia,
  ringkasan perubahan dan perkara yang perlu pengguna lakukan.

README/changelog pada **commit yang diterbitkan** ialah rujukan GitHub. Jika tag
atau GitHub Release dicipta, namanya mesti sama tepat, contohnya `v1.0.0`, dan
menunjuk commit keluaran sebenar. Jangan mendakwa tag/release sudah dibuat tanpa
menyemaknya. Jangan memindahkan tag keluaran lama kepada kod baharu.

Semak keselarasan:

```text
python tools/check_version.py
```

Untuk keluaran selepas v1.0.0, sahkan nombor meningkat daripada versi main yang
sebenarnya dibaca; contoh apabila main sebelumnya ialah v1.0.0:

```text
python tools/check_version.py --previous-version v1.0.0
```

Semakan ini juga dipanggil oleh `tests/run_tests.py`. Ia menyemak nombor dan
dokumen; ia tidak menggantikan ujian firmware atau memastikan branch sudah merge.

## 5. Identiti pada Serial Monitor

Pada boot/reset, selepas Serial 115200 bermula, firmware menunjukkan contohnya:

```text
[FIRMWARE] GeoDecoder v1.0.0 | ESP32 | env=esp32dev-rgb
```

Mulai v1.1.3, hanya build RGB diterbitkan: `esp32dev-rgb` dalam main dan
`esp32dev-sharing-rgb` dalam sharing; kedua-duanya memaparkan label hardware
Serial `env=esp32dev-rgb` yang sama. `version` mencetak identiti sama
tanpa menukar permainan, timer, reader, ujian komponen atau UID. `status` turut
mencetaknya. Arahan baca ini tersedia semasa kuiz dan ujian komponen.

Membuka Monitor selepas board sudah boot mungkin terlepas banner. Taip `version`
untuk mendapatkan nombor tanpa reset; tekan EN/RESET jika mahu melihat banner
permulaan semula. LCD murid tidak perlu memaparkan maklumat developer ini.

## 6. Cara memadankan PC, GitHub dan ESP32

1. PC: `git branch --show-current` dan `git log -1 --oneline` menunjukkan sumber
   yang sedang dibuka. Bandingkan versi README pada commit itu dengan GitHub.
2. Terus Build dan Upload; satu environment RGB ditetapkan sebagai default.
   Jangan tambah semula pilihan LED/environment pada pemasangan pengguna.
3. Buka Monitor 115200, taip `version` dan bandingkan nombor serta environment.
4. `git pull` mengemas kini fail PC. ESP32 menerima versi baharu selepas Build
   dan Upload; nombor lama selepas pull biasanya bermaksud board masih menjalankan
   firmware lama. Dokumen/aset sahaja juga menaikkan nombor keluaran, maka board
   perlu dibuild/upload semula jika mahu labelnya sama dengan keluaran tersebut.

Versi yang sama tidak membuktikan semua pengubahsuaian tempatan identik.
Nyatakan SHA, branch dan perubahan belum commit semasa audit. Untuk memadankan
keluaran rasmi, gunakan commit keluaran yang bersih; pakej sharing menyatakan
SHA main sumbernya dan menggunakan firmware bernombor sama.

## 7. Pengesahan sebelum diterbitkan

- Semak nombor dan changelog dengan checker; semak kenaikan terhadap main lama.
- Jalankan ujian yang diwajibkan AGENTS.md untuk skop perubahan. Dokumen/aset
  sahaja tidak memerlukan keseluruhan ujian firmware; checker tetap wajib.
- Jika firmware berubah, uji entry PlatformIO dan environment terkesan; jalankan
  mod modul berasingan apabila header/modul berubah. Build default tunggal pada
  setiap branch yang diubah dan semak versi firmware sama dalam main/sharing.
  Semakan native LED biasa boleh dikekalkan sebagai keserasian developer;
  ia bukan environment kedua untuk pengguna.
- Perubahan label versi tidak memadam atau mendaftar semula UID/NVS. Kekalkan
  kontrak data dan pin yang telah diluluskan.
- Rekod simulasi, kompilasi ESP32, upload USB dan ujian fizikal secara berasingan.
- Sahkan commit remote selepas push, kemudian laporkan versi dan SHA sebenar.
