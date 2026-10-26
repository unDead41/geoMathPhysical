# GeoDecoder Digital v1.1.0 — pengesahan

Tarikh rujukan Malaysia: 25 Oktober 2026. Destinasi: `digitalize` sahaja.
Main firmware v1.1.3: `a059979d97926b82cafd4aa5cf3fe59da04a55bb`.
Asas digital: `cd47ebd7dbcbab709b9f61a2122f7492f2b74113`.

## Automatik

- `npm test`: **35/35 PASS**.
- 500 seed pemilihan: 10 soalan unik, dua bagi setiap lima bongkah.
- 500 pusingan × sembilan pertukaran: setiap pilihan R1/R2 bertukar kedudukan.
- 500 urutan × 10 soalan: setiap bongkah bertukar warna; lima warna unik setiap
  rak; warna R1/R2 bagi jawapan yang sama berbeza. Fallback RNG diuji.
- Salah R1/R2 menamatkan satu percubaan dan mengunci input; tiada retry/markah
  berganda. Semakan tidak meneruskan sendiri, minimum 1800 ms, pause/resume
  mengekalkan tempoh. Betul meneruskan selepas 900 ms.
- 100 pusingan sempurna melalui enjin sebenar: 10/10, masa beku selepas tamat.
  Pusingan campuran membezakan betul, salah dan langkau.
- Analisis: R2 belum dicuba tidak dikira salah; petunjuk tidak mengurangkan
  ketepatan; topik berdasarkan kandungan bank, termasuk kedua-dua rumus kon.
- Storan: keputusan enjin dengan jawapan salah sah dan butiran setiap soalan
  kekal selepas repository reload. Skor retry lama berasingan, tidak dipadam
  semasa save baharu dan tidak masuk ranking. Erase kedua-dua kumpulan diuji
  dengan storan palsu. Ruleset mengekalkan keserasian apabila versi app naik.
- Ranking/idempotence/50 rekod/JSON rosak/storage exception/CSV BOM, quote dan
  formula injection turut diuji.
- `npm run standalone` dan `npm run check`: **PASS**. JavaScript sebaris sah,
  80 ID unik, sasaran ARIA lengkap, bank sepadan dan semua rajah SVG tersedia.
- Audit UI strict: **0 errors, 0 warnings**, `premium-audit.json`.
- Lint DESIGN.md: **0 errors**, enam amaran token yang dipetakan melalui CSS
  tetapi belum dirujuk dalam objek komponen frontmatter. Tiada token runtime
  berubah; pemeriksa token CSS/Design lulus.

## Pelayar sebenar — Chrome

HTML tunggal yang sama diuji melalui preview HTTP:

- Borang kosong memberi ralat inline dan fokus nama.
- R1 salah: 0 markah, semua jawapan/hint/skip terkunci, pasangan sebenar
  dan penerangan dipaparkan; butang terus tersedia selepas tempoh semakan.
- Selepas meneruskan, DOM mengesahkan semua sepuluh pilihan berpindah tempat
  dan setiap bongkah/bentangan bertukar palet.
- R1 betul dan R2 salah melalui Enter: R1 kekal diterima, R2 salah, 0 markah.
- Seretan tetikus sebenar ke R1 dan R2 berjaya dan memberi satu markah.
- Satu pusingan lengkap: **7/10**, dua salah (satu R1, satu R2), satu langkau,
  dua soalan menggunakan hint. Analisis sepadan: R1 8/9, R2 7/8; Kubus/Silinder
  masing-masing 1/2, Kuboid/Piramid 2/2, Kon satu betul dan satu langkau.
- Skor 7/10 kekal selepas reload; skor retry V1 lama kelihatan dalam disclosure
  berasingan dan tidak mengatasi ranking mod baharu.
- Iframe viewport 390×844: borang, permainan, semakan, pause/resume, kawalan
  jeda animasi dan keputusan diperiksa. Hiasan perspective grid yang melimpah
  telah diklip pada scene. Lebar scroll/client selepas pembetulan **380/380**
  CSS px (gutter 10 px), termasuk keputusan dan analisis.
- Pusingan telefon yang melangkau semua soalan: **0/10**, sepuluh langkau,
  sifar salah; R1/R2 menunjukkan Belum dicuba, tanpa peratus ketepatan palsu.
- Kawalan Jeda animasi menukar label kepada Sambung animasi dan kelas runtime;
  penyingkiran gerakan melalui prefers-reduced-motion turut disemak dalam CSS.

## Had sebenar

- Bukan ujian peranti sentuhan fizikal atau ujian semua versi Chrome/Edge/Safari.
- Pembukaan terus protokol file:// disekat oleh polisi pelayar kawalan; tidak
  dicuba melalui jalan pintas. HTML tidak mempunyai dependency luaran atau
  import/fetch runtime, tetapi polisi localStorage fail bergantung pada pelayar.
- Penjana CSV lulus ujian. Klik mencetuskan event download, namun perolehan fail
  oleh pelayar kawalan mengembalikan Download failed. Muat turun CSV lengkap
  belum disahkan dalam pelayar ini; punca aplikasi tidak dibuktikan.
- Tiga kelipan LED diuji melalui enjin; tiada video/rakaman kadar bingkai dibuat.
- Tiada backend, akaun, analitik luaran atau data ujian dibenamkan dalam HTML.
  Modul penuh animasi membuka geometri bukan sebahagian keluaran ini.
- Tiada website deployment, perubahan firmware, push main atau sharing.
