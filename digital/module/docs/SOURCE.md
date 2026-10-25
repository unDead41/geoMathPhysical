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
