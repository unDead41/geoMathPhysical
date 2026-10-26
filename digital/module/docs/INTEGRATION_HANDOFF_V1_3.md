# Handoff integrasi reka bentuk dengan modul v1.3.0

Ini handoff sahaja; integrasi belum dilakukan dalam tugasan reka bentuk ini.
Pengguna menetapkan hasil pada branch baharu `digitalize-<nama sesuai>`; destinasi
hasil ialah `digitalize-module-design`. Branch sumber lain tidak diubah.

## Snapshot yang berbeza

| Peranan | SHA penuh | Versi |
|---|---|---|
| Asas reka bentuk yang diaudit/dikod | 931a0150397bfb3fd79ef3c8da6684167d1c6aad | 1.2.0 |
| Hasil reka bentuk branch ini | lihat commit penerbitan branch | 1.2.1 |
| Source modul selari, dilihat sebelum push | ee7c7ee983ce32bc9681c60424df184f29e8a80b | 1.3.0 |

Perbandingan GitHub mengesahkan satu commit tambahan pada source v1.3.0:
`feat(module): expand nets and volume labs with guided slow playback (v1.3.0)`.
Ia menambah sembilan bentangan preset sah, pilihan isi satu/dua bongkah dan jumlah
isi dipilih, pacing perlahan, pause/resume dan langkah aktiviti. Branch reka bentuk
ini belum mengandungi fungsi baharu tersebut. Tiada perubahan source v1.3.0 hilang;
ia kekal pada digitalize-module, bukan diganti dengan fail HTML v1.2.1.

## Cara menyatukan kemudian

Baca kedua-dua head sebenar dan gunakan worktree tersendiri. Lakukan integrasi
pada branch hasil yang dibenarkan pengguna. Jangan menyalin seluruh labs.mjs
v1.2.1 ke atas v1.3.0 atau menggantikan HTML binaan sahaja.

| Kawasan | Perlindungan semasa resolusi |
|---|---|
| labs.mjs | Kekalkan 9 preset, satu/dua isi dan pacing perlahan v1.3.0; sesuaikan shared playbackButton, elapsed resume, cancellation dan fixed framing kepada state v1.3.0 |
| index.html | Kekalkan semua pilihan/medan/penerangan v1.3.0; pindahkan ikon, toolbar, label dan panel bersama |
| style.css | Gunakan token/primitif reka bentuk; masukkan gaya khusus kawalan baharu v1.3.0 tanpa menghapus interaksi |
| app.mjs, ui.mjs | Kekalkan source icon hydration, section cancellation, explicit resume selepas hidden dan kawalan keyboard/arah |
| preset-nets.mjs, volume-lab.mjs | Ambil helper baru v1.3.0; semak geometri/isi padu sebagai domain, jangan ubah demi layout |
| tools/build.mjs | Sertakan kedua-dua helper baharu serta design-system/ui sebelum app; build satu HTML semula |
| content/package/badge/README/changelog | Pilih nombor seterusnya daripada versi gabungan sebenar; jangan mendakwa v1.2.1 menggantikan v1.3.0 |
| tests/ | Pelihara suite preset/volume v1.3.0 dan regresi ikon/framing/pause reka bentuk; kira jumlah sebenar selepas gabungan |
| docs dan evidence | Kekalkan sejarah kedua-dua cabang, tambah laporan baharu dengan base SHA dan bukti gabungan sebenar |

Source v1.3.0 melaporkan 139 ujian; reka bentuk ini meluluskan 107 ujian pada asas
v1.2.0. Angka itu tidak membuktikan gabungan lulus. Jalankan build, seluruh suite,
check, versi dan ujian browser 320/390/768/1280 terhadap hasil gabungan. Pastikan
preset, jumlah isi dipilih, Main/Jeda/Sambung/reset, tab tersembunyi, reduced motion,
seretan dan alternatif keyboard kekal berfungsi. Ambil screenshot gabungan baharu.
