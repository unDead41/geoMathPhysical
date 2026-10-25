# GeoDecoder Digital v1.0.0 — pengesahan

Tarikh: 25 Oktober 2026, Malaysia. Sumber firmware main v1.1.3:
`a059979d97926b82cafd4aa5cf3fe59da04a55bb`. Branch destinasi `digitalize`.

## Automatik

- `npm test`: **25/25 PASS**.
- 500 seed: sepuluh ID unik, dua soalan bagi setiap lima bongkah.
- 100 pusingan lengkap melalui engine sebenar: 10/10, satu markah bagi
  pasangan, masa terakhir dibekukan, tiada gandaan markah daripada input berulang.
- R2 sebelum R1, peranan kad salah, retry R1/R2, hint ungu, skip selepas R1,
  pause/resume, enam langkah 150 ms dan had 900 ms diuji.
- Storan: persist/reload, ID idempotent, ranking, 50 rekod, data rosak,
  storage exception, penggabungan rekod dua instance, erase dan CSV selamat diuji.
- `npm run standalone`: menghasilkan HTML tunggal, semua kod/soalan/SVG/CSS sebaris.
- `npm run check`: syntax HTML inline JavaScript, 65 ID unik, rujukan ARIA,
  kesetiaan bank, 10 rajah SVG dan palet DESIGN.md/CSS semuanya PASS.
- Auditor frontend strict: **0 errors, 0 warnings**; `premium-audit.json`.

## Pelayar sebenar

Chrome melalui pratonton fail HTML tunggal yang sama:

- Borang kosong memaparkan ralat inline dan fokus nama; borang sah membuka game.
- Drag bongkah salah mengekalkan R1; drag piramid betul membuka R2 tanpa markah;
  drag bentangan sepadan memberi +1.
- Pusingan sepuluh soalan diselesaikan menggunakan Enter pada pilihan/pengimbas.
  Keputusan sebenar: 10/10, 9 jawapan cubaan pertama, 1 cubaan salah R2,
  1 soalan menggunakan hint, semakan sepuluh pasangan dan papan skor.
- Panduan modal dijeda; Escape menutupnya dan memulangkan fokus.
- Papan skor menunjukkan keputusan sebenar selepas reload. Eksport CSV
  menghasilkan event download. Dialog padam diperiksa dan dibatalkan.
- Paparan 390x844 menggunakan iframe viewport: borang, permainan, skip,
  tetingkap pause dan susun atur skrin kecil diperiksa. Lebar kandungan game
  sama dengan lebar viewport (380 CSS px selepas gutter); tiada overflow sisi.
- Label akses Papan skor pada mod ikon sahaja dibetulkan selepas pemeriksaan.

## Had sebenar

Bukan ujian perkakasan ESP32. Tidak menguji pelayar fizikal Windows/iOS/Android,
atau sentuhan jari sebenar; sokongan sentuhan menggunakan Pointer Events.
Fail HTML diperiksa sebagai satu sumber penuh melalui HTTP pada Chrome;
semua dependency telah diinline, tetapi polisi localStorage bagi file://
bergantung pada pelayar. Fallback memori dan notis kegagalan disediakan.
Rekod setempat, bukan papan skor internet dan bukan sistem penilaian peperiksaan.
Tiada rekod ujian atau data peribadi dibenamkan dalam artifak HTML.

Versi semasa ialah preview HTML V1, seperti diminta. Tiada laman web diterbitkan.
