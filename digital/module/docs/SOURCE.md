# Asas sumber dan polisi branch

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

