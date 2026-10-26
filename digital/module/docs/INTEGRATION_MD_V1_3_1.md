# Integrasi reka bentuk modul pada MD — v1.3.1

Arahan pengguna pada 26 Oktober 2026 membenarkan hasil chat reka bentuk ini
dipush ke branch penerbitan. Branch sebenar ialah **main-digitalized (MD)**;
tiada branch main-digitalize dicipta. Tiga utility akaun baru diberikan sebagai
prompt dalam chat ini dan tidak termasuk dalam perubahan modul ini.

## Rujukan tepat

| Peranan | SHA penuh | Versi |
|---|---|---|
| MD sebelum integrasi | 8c12818565d8b5531216ec0a24fa8a93a583bf35 | Modul 1.3.0 |
| Reka bentuk yang disatukan | 2a62091fe72f88c59b2f3ca393a29fc3f1b47263 | Modul 1.2.1 |
| Sumber fungsi makmal dalam MD | ee7c7ee983ce32bc9681c60424df184f29e8a80b | Modul 1.3.0 |
| Asas bersama | 931a0150397bfb3fd79ef3c8da6684167d1c6aad | Modul 1.2.0 |
| Main dibaca sebelum kerja | a059979d97926b82cafd4aa5cf3fe59da04a55bb | Firmware 1.1.3 |

Worktree sendiri digunakan pada branch tempatan digitalize-module-design-integration.
Had dua subagent dipatuhi: seorang menggabungkan labs.mjs; seorang menggabungkan
ujian serta menyemak sumber/markup/build secara bebas. Commit integrasi berparent
MD dan commit reka bentuk. Ref MD dikemas kini menggunakan expected SHA tanpa force.

## Hasil gabungan

- Token warna, keadaan interaksi, tipografi, ruang, radius, kawalan, ikon dan
  tempoh animasi disatukan melalui design-system.mjs, CSS terjana dan ui.mjs.
- Kelajuan, panduan langkah, galeri, kad isi A/B dan pilihan jumlah menggunakan
  komponen bersama. Sembilan bentangan siap, editor kubus, semua mod isi padu,
  nota dan empat makmal kekal.
- Jeda/sambung menyimpan garis masa easing asal. Pertukaran kelajuan mengubah
  kadar garis masa yang sama. Pertukaran aktiviti menyimpan animasi untuk
  sambungan eksplisit; masa tersembunyi tidak ditambah ketika disambung.
- Kamera penerokaan turut berhenti ketika Jeda. Butang arah, penanda pilihan,
  pembingkaian geometri tetap dan kawalan kembali ke model dikekalkan.
- Versi 1.3.1 dipaparkan berhampiran logo. HTML dibina semula daripada gabungan
  sumber; fail binaan lama tidak disalin menindih fungsi v1.3.0.

geometry.mjs, lab-geometry.mjs, lessons.mjs, preset-nets.mjs dan volume-lab.mjs
adalah identik dengan MD sebelum integrasi. Rumus, ukuran, cantuman, unjuran dan
pengiraan kekal. Perubahan penerbitan ini berada di digital/module/; setiap blob
MD di luar subtree itu dikekalkan, termasuk permainan BM/BI, index penerbitan,
kuiz, analitik dan firmware. Push branch tidak membuktikan GitHub Pages telah
redeploy atau konfigurasi Pages berubah.

## Pengesahan baharu

Output mentah berada di ../evidence/integration-md-v1.3.1/.

| Semakan | Keputusan |
|---|---|
| Suite MD sebelum perubahan | 139 lulus, 0 gagal |
| Build gabungan | Lulus; satu HTML mandiri 204224 byte |
| Suite gabungan | **148 lulus**, 0 gagal, 0 skipped |
| Check modul | Lulus sintaks, ID, versi, token, ikon, kontras dan tiada rangkaian/storan runtime |
| Checker versi akar | Lulus firmware/README/changelog 1.1.3 |
| git diff --check | Lulus |
| DESIGN lint rasmi | 0 error, 5 warning metadata warna diwarisi |
| Premium strict | Exit 1: **72 affordance.actionless-button**, 0 owner tidak selesai |
| Pelayar susun atur | 24 kes asas: enam bahagian × 320/390/768/1280px; tiada overflow, teks <12px atau kawalan biasa <44px |
| Pelayar keadaan tambahan | 3 semakan DOM; 24 rekod interaksi/keadaan, lihat JSON |
| Sumber modular | 5 pilihan bongkah, 37 laluan ikon SVG, 0 placeholder tertinggal |

148 ujian merangkumi semua 139 ujian v1.3.0, tujuh regresi reka bentuk dan dua
regresi kelajuan dengan animasi dijeda/disimpan. Ujian geometri sedia ada kekal,
termasuk semua 35 hexomino dan engsel prisma tambahan.

Pelayar menguji sembilan galeri, slider Home/End, kawalan arah, jeda/sambung,
kelajuan, isi satu/dua bongkah, jumlah A sahaja, input nota salah/reset, luas kon
dan permukaan luar gabungan. Contoh gabungan menghasilkan 240 cm² dan 264 cm³.
Contoh A=27 cm³ dan B=24 cm³ menghasilkan jumlah 51 cm³; memilih A sahaja 27 cm³.

Premium strict gagal secara mentah kerana parser tidak mengesan binding
addEventListener/bind dalam modul JavaScript luar. Semua 72 finding ialah jenis
itu; keputusan ini bukan strict PASS. Ujian skrip keluaran memeriksa binding
sebenar semua butang literal selepas bahagian lazy dibuka. Tiada handler kosong
atau onclick palsu ditambah untuk mengaburi auditor.

## Screenshot sebenar

[Manifest dan hash](../evidence/integration-md-v1.3.1/manifest.json).

| Fail | Keadaan |
|---|---|
| md-before-v1.3.0.jpg | MD sebelum integrasi, galeri prisma segi enam |
| md-after-flat-v1.3.1-1793012651.jpg | Bentangan rata dan widget selepas integrasi |
| md-after-volume-v1.3.1.jpg | Dua isi penuh serta jumlah 51 cm³ |
| md-after-phone320-v1.3.1.jpg | Viewport iframe 320px; fixture reduced motion dilabel |

Semua imej ialah tangkapan Chromium, bukan mockup. Posisi tatal gambar sebelum
dan selepas berbeza. Satu tangkapan tambahan tidak terselaras ke workspace dan
tidak dimasukkan dalam manifest atau pautan hasil.

## Batasan sebenar

- Saiz ujian ialah viewport CSS iframe Chromium; tiada telefon/tablet fizikal,
  Safari/Edge, pembaca skrin, matriks zoom 200% atau pensijilan FPS.
- Reduced motion dibekalkan melalui fixture matchMedia, bukan tetapan OS.
  CSS media query diperiksa dalam sumber.
- Seretan menggunakan pointer sintetik dan stub capture sementara dalam QA.
  Tiada sentuhan fizikal/pinch dibuktikan.
- Tab tersembunyi disahkan oleh ujian skrip sebenar dengan port DOM/jam;
  visibilitychange tab OS sebenar tidak dibuktikan dalam cloud.
- Native select dipilih dalam pelayar dan slider dikendalikan melalui papan
  kekunci; geometri popup OS semua platform tidak disahkan.
- CSP/bundle membuktikan tiada kebergantungan rangkaian runtime. Penggunaan
  file-origin pada peranti benar-benar terputus Internet tidak diuji di cloud.
- Satu tindakan ketika iframe fixture sedang reload tamat masa. Snapshot
  kemudian mengesahkan keadaan siap dan ulangan tindakan lulus.

DESIGN_V1_2_1.md dan INTEGRATION_HANDOFF_V1_3.md kekal sebagai sejarah snapshot
sebelum arahan push MD ini. Status integrasi semasa direkod dalam laporan ini,
bukan angka ujian lama kedua-dua cabang.
