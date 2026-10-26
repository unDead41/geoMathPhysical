# Asas sumber dan polisi branch

## Integrasi MD v1.3.1 — 26 Oktober 2026

Pengguna kemudian membenarkan push hasil reka bentuk ke branch penerbitan.
Branch sebenar ialah `main-digitalized` (MD), dibaca pada
`8c12818565d8b5531216ec0a24fa8a93a583bf35`. Reka bentuk
`2a62091fe72f88c59b2f3ca393a29fc3f1b47263` digabungkan dengan semua fungsi
makmal v1.3.0 daripada `ee7c7ee983ce32bc9681c60424df184f29e8a80b`.
Hasil modul ialah v1.3.1. Semua blob MD di luar `digital/module/` dipelihara.
Lihat [laporan integrasi dan batasan ujian](INTEGRATION_MD_V1_3_1.md).

## Sejarah sumber terdahulu

- Repo: https://github.com/unDead41/geodecoder
- Branch asal: `digitalize`.
- SHA penuh asal ketika kerja bermula: `cd47ebd7dbcbab709b9f61a2122f7492f2b74113`.
- Tree asal: `b3c94a777ed9a9ec1b63267aba0e83b736a5edee`.
- Versi permainan pada asas ini: v1.0.0.
- Main yang diperiksa: `a059979d97926b82cafd4aa5cf3fe59da04a55bb`, firmware v1.1.3.
- Bank sebenar: `main/question_bank.h`, blob `6e956f0a264bca7d3bd0fb0e0a4c63f8af9214b2`.
- AGENTS.md, docs/SOR_VERSIONING.md, README.md, docs/ARCHITECTURE.md dan sumber
  digital/dist/{app,art,core,style,index} dibaca sebelum pelaksanaan.
- `digitalize-module` belum wujud ketika semakan awal. Worktree sendiri dibina
  daripada commit digitalize yang tepat. Snapshot Git tree dan commit asal
  disahkan dengan hash Git, termasuk metadata +0800 pada commit asal.
- Akses Git biasa tidak tersedia; pembacaan dan penerbitan remote melalui GitHub
  connector. Objek tree asal dipelihara ketika menambah folder modul.

Sebelum penerbitan, digitalize bergerak kepada v1.1.0. Asas branch modul
diselaraskan secara fast-forward kepada `55a79849d5007ec53a9b877cd20877c9bf15aa8d`
(tree `9e2eff4806c8d41c8af847e3f42007074affb567`). Bank bongkah dan token visual
disahkan tidak berubah. Seluruh perubahan satu percubaan/analisis v1.1.0
dipelihara tanpa mengubahnya; tiada import runtime daripada permainan.

Arahan pengguna mengehadkan semua perubahan dan penerbitan kepada
`digitalize-module`. Semua fail baharu berada dalam `digital/module/`.
Main, sharing dan digitalize tidak ditolak, digabung atau dipadam.
Permainan Digital dan firmware kekal mengikut blob asas; tiada perubahan peraturan,
markah, bank soalan, storan atau analitik.

Versi awal modul ialah v1.0.0, satu sumber dalam `src/content.mjs`, dipaparkan
berhampiran logo sebagai V1.0.0. SemVer mengikut SOR: MINOR untuk fungsi serasi,
PATCH untuk pembaikan. Modul mempunyai saluran versi bebas seperti aplikasi
Digital sedia ada. Tidak menaikkan header firmware untuk branch modul.
Jika kelak digabung ke main, pemilik integrasi wajib menyemak main terkini,
menetapkan versi main seterusnya dan menjalankan checker repo.

## Sambungan nota v1.1.0 — 26 Oktober 2026

Branch sedia ada disambung pada 3dde97e6c203012cf9e92c6e5cb86f9820f2ad97,
tree 6ff431238a15984855e4a212ce13e46fefadc024 (modul v1.0.0).
Ref digitalize masih 55a79849d5007ec53a9b877cd20877c9bf15aa8d, permainan v1.1.0.
Main disemak semula sebelum penerbitan: a059979d97926b82cafd4aa5cf3fe59da04a55bb,
firmware v1.1.3. Sharing pada semakan ialah
01b549a26861ef5f093d4c2c630700de37008d6b.

Versi modul dinaikkan MINOR kepada v1.1.0 untuk fungsi nota serasi. Sumber nombor
kekal src/content.mjs; package, badge, README dan CHANGELOG modul diselaraskan.
Sumber geometri, renderer, bank soalan dan permainan tidak diubah. Semua fail
kemas kini hanya di digital/module/. Modul tidak digabung semula dari branch lain.

Nota asal menambah Bab 6.3/6.4 berdasarkan dokumen KPM yang dipautkan dalam
CURRICULUM.md. Semakan PDF meliputi halaman cetak 52–53 (halaman PDF 64–65).
Tiada kandungan buku teks atau ilustrasi pihak ketiga disalin.

## Sambungan empat makmal v1.2.0 — 26 Oktober 2026

Branch sedia ada disambung pada 92c12c3a07ec250c03a73decaf52a654fc26d502,
tree 5cb8156ce9bb4d0f75b5d247e3e1242eaf6e4ac9 (modul v1.1.0).
Main disemak: a059979d97926b82cafd4aa5cf3fe59da04a55bb, firmware v1.1.3.
Digitalize kini 8c36d3a572ca53231747b5adc952f9c0dca6d012, permainan v2.0.0
(seperti digital/dist/core.mjs sebenar); itu bukan asas baharu bagi sambungan ini.
Modul meneruskan branch sendiri, tanpa mengimport perubahan kuiz/backend.

Versi modul v1.2.0 ialah MINOR serasi. Pengguna memilih aktiviti cadangan 1–4:
bina bentangan kubus, makmal isi padu, terbitkan rumus luas permukaan, dan bongkah
gabungan. Sumber geometri sedia ada diberi parameter ukuran pilihan; laluan lama
kekal default dan semua ujian geometri asal diluluskan semula. Renderer ditambah
mesh tersuai, bekas bergaris, pemilihan beberapa muka dan fit ortografik seragam.
Semua perubahan kekal di digital/module/. Main/sharing/digitalize tidak diubah.

Semakan sebelum push: digitalize bergerak kepada b0000bf8f9b969c5596f75e3af70c8dfc3fc1631 sementara kerja makmal berjalan. Branch modul masih pada asas 92c12c3a07ec250c03a73decaf52a654fc26d502 dan disambung tanpa mengubah branch permainan.
Versi digitalize pada semakan b0000bf8f9b969c5596f75e3af70c8dfc3fc1631 ialah v2.1.0, disahkan daripada core.mjs.

## Sambungan tempo, bentangan siap dan isi padu v1.3.0 — 26 Oktober 2026

Branch sedia ada disambung pada **931a0150397bfb3fd79ef3c8da6684167d1c6aad**,
tree **c1ced5c619397170a5bf7e0f601f6bbafed1a52f** (modul v1.2.0).
Ref berkaitan difetch melalui GitHub connector sebelum perubahan:

- main: a059979d97926b82cafd4aa5cf3fe59da04a55bb, firmware v1.1.3.
- sharing: 01b549a26861ef5f093d4c2c630700de37008d6b, firmware v1.1.3.
- digitalize: 01696af497cd7fca8e299f9c1b8a6407333ce276, permainan v2.3.0,
  disahkan daripada digital/dist/core.mjs pada SHA itu.
- digitalize-module: 931a0150397bfb3fd79ef3c8da6684167d1c6aad, modul v1.2.0.

Perubahan meneruskan branch dan worktree sendiri. Rujukan digitalize terkini
bukan asas baharu dan perubahan kuiz/backendnya tidak diimport. Lima Shape ID
projek kekal. Bentuk pengayaan hanya dalam galeri/makmal, tidak masuk bank soalan.
SemVer modul naik MINOR kepada v1.3.0 kerana fungsi baharu serasi. Sumber versi
kekal src/content.mjs, diselaraskan dengan package, badge, README dan CHANGELOG.
Tiada perubahan firmware atau nombor saluran permainan. Semua fail kemas kini
terhad kepada digital/module/; push menggunakan expected head branch modul.

Semakan sebelum penerbitan: digitalize bergerak lagi kepada
adc51627eaaace5d9543c7e033d2994986c8715d. core.mjs pada SHA itu masih v2.3.0
(blob 74abef3da499bdafe1cd19cca04b1aab74357dc4). Main dan sharing kekal pada
SHA di atas; head module yang dijadikan expected-head masih 931a0150397bfb3fd79ef3c8da6684167d1c6aad.
Tiada perubahan branch permainan diserap ke dalam kemas kini modul ini.

## Peluasan v1.4.0 dan integrasi reka bentuk MD — 26 Oktober 2026

Asas kerja sambungan: digitalize-module
**ee7c7ee983ce32bc9681c60424df184f29e8a80b**, tree
**19c42988a65e32f74ee5eeafc8c59c694b393e58**, modul v1.3.0.
Worktree sendiri /dev/shm/geodecoder-module-69ae/work. Maksimum dua subagent
digunakan: katalog nota dan studio/cetakan; semakan bebas menggunakan ejen sama.

Ref difetch sebelum kerja dan disemak semula sebelum penerbitan:

| Branch | SHA penuh | Versi rujukan |
|---|---|---|
| main | a059979d97926b82cafd4aa5cf3fe59da04a55bb | firmware v1.1.3 |
| sharing | 01b549a26861ef5f093d4c2c630700de37008d6b | firmware v1.1.3 |
| digitalize | adc51627eaaace5d9543c7e033d2994986c8715d | Digital v2.3.0 |
| digitalize-module | ee7c7ee983ce32bc9681c60424df184f29e8a80b | modul v1.3.0 |
| digitalize-module-design | 2a62091fe72f88c59b2f3ca393a29fc3f1b47263 | reka bentuk v1.2.1 |
| main-digital | 71db77c0206de664e50fa57ff57e1825af13f938 | Digital BM/BI v1.2.0 |
| main-digitalized mula | 8c12818565d8b5531216ec0a24fa8a93a583bf35 | modul v1.3.0 |
| main-digitalized terkini | 42c7d29bbdaedb7bb0824c2d10222752c385ab6f | modul v1.3.1 |

Arahan kemudian pengguna secara eksplisit membenarkan push ke
**main-digitalized (MD)**. Had awal hanya digitalize-module kini ditambah MD;
main/sharing/digitalize/main-digital/design tidak diubah. Kerja reka bentuk
v1.3.1 yang tiba pada MD ketika pembangunan digabung secara tiga hala ke fail
modul, termasuk token/ikon/widget, framing stabil dan easing jeda/sambung.
Tiada fail destinasi di luar digital/module ditindih. Penerbitan setiap ref
menggunakan expected SHA dan tanpa force.

Versi fungsi serasi baharu ialah v1.4.0, dipaparkan V1.4.0 berhampiran logo.
Permainan, bank soalan, skor, analitik dan firmware tidak berubah. MODEL_ORDER
sebelas bentuk hanya katalog pembelajaran tempatan; Shape ID kuiz kekal lima.
Enam sumber PDF setempat serta julat dua bab dicatat dalam SOURCES_V1_4.md.

## Integrasi latihan v1.5.0 — 26 Oktober 2026

Sasaran yang dibenarkan ialah branch sedia ada `main-digitalized`, dibaca pada
`5f577d63f17067a8488e17cafcbcb25d5872360b`. Subtree v1.4.0 pada SHA itu identik
dengan `694c2c9623a76be1b885611e2c90575b734d0b00`. Latihan/akses daripada
`4c3a165613fd310e5e7e889e793065d4818250b2` diport pada sumber ini; reka bentuk
`2a62091fe72f88c59b2f3ca393a29fc3f1b47263` telah diserap dalam asas.
Semua nota/bentuk/makmal luas kekal. Lihat GUIDED_V1_5.md untuk skop penilaian,
kontrak induk dan bukti ujian gabungan. SHA penerbitan akhir ditetapkan pemilik
integrasi selepas semakan dan tidak direka daripada snapshot tempatan.
