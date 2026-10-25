# Rujukan GeoDecoder Digital V2

- Repository asal: https://github.com/unDead41/geodecoder
- Branch diperiksa: main
- SHA penuh: a059979d97926b82cafd4aa5cf3fe59da04a55bb
- Versi firmware: v1.1.3
- Tarikh semakan: 25 Oktober 2026 (Asia/Kuala_Lumpur)
- Bank: main/question_bank.h, blob 6e956f0a264bca7d3bd0fb0e0a4c63f8af9214b2
- Aliran: docs/GAME_FLOW_RGB.md; architecture: docs/ARCHITECTURE.md.
- AGENTS.md, SOR_VERSIONING.md, README.md dan bank semasa dibaca sebelum pembangunan.

Versi digital semasa ialah aplikasi web berasingan v2.0.0. Firmware/main/sharing tidak diubah.
Pengguna meminta 10 markah; versi digital memilih dua soalan unik bagi setiap lima
bongkah daripada bank 15 soalan. Susunan soalan dan pilihan diacak. Ini perbezaan
sengaja daripada pusingan firmware 5 soalan. R1→R2, +1 bagi pasangan betul,
hint tanpa penalti, skip +0 serta jam berhenti sepanjang 3 kelipan 150 ms ON/OFF
dikekalkan. Arahan susulan pengguna menggantikan retry dengan satu percubaan:
salah pada mana-mana tahap memberi +0 dan membuka semakan sebelum meneruskan.

Asas digital v1.0.0: `cd47ebd7dbcbab709b9f61a2122f7492f2b74113`.
Semakan semula main pada sesi sambungan: SHA/firmware kekal seperti di atas.
Rujukan pelan dan perubahan kontrak: `UPGRADE_V1_1.md`.

Latihan sendiri mengekalkan papan skor setempat, CSV dan pengesahan pemadaman.
V2 menambah akaun guru/pelajar, kelas, jemputan username, PIN dan keputusan room pada
Supabase hosted. Markah dan masa room ditentukan oleh database. Masa menjawab room
terus berjalan ketika jeda/tab tersembunyi; maklum balas/semakan tetap dikecualikan.
Asas V2: digitalize v1.1.0, SHA 55a79849d5007ec53a9b877cd20877c9bf15aa8d.
