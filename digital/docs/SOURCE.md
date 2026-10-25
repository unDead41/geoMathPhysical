# Rujukan GeoDecoder Digital V1

- Repository asal: https://github.com/unDead41/geodecoder
- Branch diperiksa: main
- SHA penuh: a059979d97926b82cafd4aa5cf3fe59da04a55bb
- Versi firmware: v1.1.3
- Tarikh semakan: 25 Oktober 2026 (Asia/Kuala_Lumpur)
- Bank: main/question_bank.h, blob 6e956f0a264bca7d3bd0fb0e0a4c63f8af9214b2
- Aliran: docs/GAME_FLOW_RGB.md; architecture: docs/ARCHITECTURE.md.
- AGENTS.md, SOR_VERSIONING.md, README.md dan bank semasa dibaca sebelum pembangunan.

Versi digital ialah aplikasi web berasingan v1.0.0. Firmware/main/sharing tidak diubah.
Pengguna meminta 10 markah; versi digital memilih dua soalan unik bagi setiap lima
bongkah daripada bank 15 soalan. Susunan soalan dan pilihan diacak. Ini perbezaan
sengaja daripada pusingan firmware 5 soalan. R1→R2, +1 bagi pasangan betul,
retry tanpa penalti, hint tanpa penalti, skip +0 serta jam berhenti sepanjang
3 kelipan 150 ms ON/OFF dikekalkan. Ketepatan cubaan pertama dilaporkan berasingan.

Papan skor setempat bagi setiap pelayar, tanpa akaun/backend atau penyegerakan antara peranti.
Nama, kategori Murid/Pelajar, kelas dan keputusan hanya disimpan pada peranti ini.
Rekod boleh dieksport sebagai CSV dan dipadam melalui pengesahan dalam aplikasi.
