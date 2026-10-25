# Rekod semakan pakej audio — 25 Oktober 2026

Branch sasaran: `codex/question-audio-elevenlabs`.
Asas branch dan main yang diperiksa:
`a059979d97926b82cafd4aa5cf3fe59da04a55bb`, firmware **v1.1.3**.
Blob bank runtime: `6e956f0a264bca7d3bd0fb0e0a4c63f8af9214b2`.
Main dan branch mempunyai bank yang sama. Tiada perbezaan maksud ditemui
antara teks bacaan pengguna dengan soalan/hint runtime.

## Skop yang disemak

- AGENTS, SOR versi, README, architecture, flow RGB dan bank runtime dibaca.
  Wiring, config, entry point, AppPorts, butang, aplikasi dan peralihan kuiz
  diperiksa untuk menyokong audit awal.
- 15 ID dan 30 ayat pengguna dikekalkan tepat dalam manifest serta fail teks.
  Setiap baris CSV turut dibaca semula dan dibandingkan dengan skrip asal.
- Snapshot LCD, jawapan enum dan metadata reader dipadankan dengan bank.
  Tiada ID/jawapan/bank/pin/flow/peraturan skor atau format NVS diubah.
- 20 fail sumber yang dibaca secara tempatan, selain README/CHANGELOG yang
  sengaja ditambah pautan/nota branch, dipadankan dengan hash blob Git asal.
  Perubahan remote dibina berasaskan tree asal; hanya pakej audio, satu alat
  Python, README dan CHANGELOG dimasukkan ke perubahan.

## Hasil semakan tempatan

```text
python tools/question_audio.py
[AUDIO PENDING] 0/30 files; 0/30 manually approved.
[SCRIPTS OK] 15 runtime IDs, 30 speech-only scripts, original LCD/answers and filenames match.

python tools/check_version.py
[VERSION OK] GeoDecoder v1.1.3 | firmware = README = CHANGELOG
```

Semakan pakej tambahan menggunakan folder fixture sementara: **20/20 lulus**.
Ralat yang dijangka mesti menghasilkan exit code 1; ia dikira lulus apabila
checker menolak input yang salah dengan sebab yang sepadan.

| Kumpulan semakan | Bilangan | Hasil |
|---|---:|---|
| 30 teks pengguna tepat dan pembacaan semula CSV secara bebas | 1 | PASS |
| Pakej persediaan tanpa MP3 diterima | 1 | PASS |
| Mod audio wajib menolak 30 klip yang belum ada | 1 | PASS |
| Bank drift, ID hilang/berganda, LCD berubah dan jawapan berubah ditolak | 5 | PASS |
| Nama fail salah, nama jawapan/ID dalam suara dan status QA tidak sah ditolak | 4 | PASS |
| Eksport teks diubah, hilang atau berlebihan ditolak | 3 | PASS |
| MP3 kosong dan MP3 dengan nama tambahan ditolak | 2 | PASS |
| Gate ffprobe menerima MP3 sintetik sah dan menolak MP3 rosak | 2 | PASS |
| Eksport `--write` diulang tanpa mengubah satu byte pun | 1 | PASS |

Ujian format menggunakan salinan MP3 senyap sintetik 0.1 saat dalam direktori
sementara sahaja. Fail fixture itu dipadam apabila ujian tamat dan **tidak**
dimasukkan ke repo atau dianggap 30 rakaman GeoDecoder. `ffprobe` memeriksa
stream MP3/tempoh; ia tidak menjamin semua audio dapat didengar dengan betul.

## Versi dan batas pengesahan

Firmware kekal **v1.1.3**. Tiada main/sharing diterbitkan oleh kerja ini.
Checker keselarasan dijalankan; semakan kenaikan terhadap v1.1.3 tidak
diperlukan untuk commit branch persediaan yang tidak menerbitkan keluaran main.
Cadangan PATCH dokumen/aset ialah v1.1.4 jika main masih v1.1.3 ketika
integrasi; nombor itu belum dikunci atau diterbitkan.

| Tahap | Status sebenar |
|---|---|
| Teks, pemetaan, eksport dan alat semakan | Disemak seperti di atas |
| MP3 pengguna | **Belum diterima: 0/30** |
| Mendengar bacaan/sebutan/kelantangan | Belum boleh dibuat |
| Simulasi firmware | Tidak dijalankan semula: firmware tidak berubah, mengikut skop AGENTS |
| Build ESP32 | Tidak dijalankan untuk pakej dokumen/skrip ini |
| Upload USB / alat fizikal | Tidak dibuat |
| Pemain audio dan integrasi runtime | Belum dilaksanakan; pelan dalam INTEGRATION.md |

Main/branch diperiksa semula sebelum penerbitan branch. Commit akhir dan
remote branch hendaklah disahkan selepas push dan dinyatakan dalam handoff.
