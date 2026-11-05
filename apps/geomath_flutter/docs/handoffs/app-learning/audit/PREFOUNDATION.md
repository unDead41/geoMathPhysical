# GeoMath Flutter — Belajar, Makmal dan Studio

**Status: WAITING_FOUNDATION_READY. Audit sahaja; feature Flutter belum dibina.**
Semakan: 4 November 2026, Asia/Kuala_Lumpur. Branch sasaran: `app-learning`.

## Dependency yang menyekat pelaksanaan

Semakan GitHub terhadap `app-foundation` memulangkan HTTP 404, "No commit found
for the ref app-foundation". Carian branch juga belum menemukannya. Oleh itu
`FOUNDATION_READY.json`, `FOUNDATION_CONTRACT.md`, handoff, kontrak/hash, source
lock serta bukti Android foundation belum boleh disahkan. SHA yang sama dengan
chat `app-cloud-game` juga belum dapat ditetapkan.

Prompt 2 dan COMMON_RULES membenarkan audit sumber bebas ketika belum READY.
Enam subagen dimulakan serentak dalam enam worktree/private branch berasingan;
masing-masing menyerahkan commit laporan kepada lead. Tiada scaffold, theme,
router, session, database, writer/reader, outbox atau signature foundation kedua
dibina. Tiada `learningFeature()` atau preview runnable dituntut tersedia.

| Ref / versi | Sumber yang diperiksa |
|---|---|
| `app` — asas arahan/audit | `38f061af963256528d5060ff076bae9ee05eafc3` |
| `main-digitalized` — calon audit bebas | `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` |
| Versi calon audit Digital / modul | `2.9.1` / `1.6.2` daripada package dan content sebenar |
| `main` firmware | `25836eb1a6f24459aace8a3980ae880a13e3b488`, `2.0.2` daripada header sebenar |
| `app-foundation` / versi kontrak / hash | Belum tersedia; semua nilai kekal null/kosong |
| Versi aplikasi / source lock foundation | Belum tersedia; calon audit bukan pin yang dibekukan |

SHA `391df...` dalam arkib persediaan bukan status integrasi semasa. README
integration-sync/SQL_ORDER turut dibaca; hasil sumber dan hosted deployment ialah
bukti berasingan. Tiada operasi hosted diperlukan atau dilakukan oleh audit ini.

## Hasil audit dan pemilikan

| Worker | Laporan | Penemuan utama untuk pelaksanaan selepas freeze |
|---|---|---|
| 1 | [Bundle dan bridge](audit/01-bundle-bridge.md) | Bundle self-contained boleh dibina; bare top-level WebView memerlukan adapter native sebenar, envelope bounded dan semakan replay/actor |
| 2 | [Teroka, pandangan, nota, kalkulator](audit/02-explore-math.md) | API sebenar `learningMesh()` meliputi 11 model; `buildMesh()` hanya lima; palet web asal belum sama dengan palet app |
| 3 | [Bentangan dan isi padu](audit/03-net-volume.md) | Kekalkan gallery/studio/transfer/comparison serta sempadan aktiviti berpandu; checkpoint/history perlu diasingkan mengikut actor |
| 4 | [Luas dan gabungan](audit/04-area-composite.md) | Semua model, bekas/rongga dan gabungan dikekalkan; palette composite mesti mengikut constituent dan permukaan sebenar |
| 5 | [Studio dan rekod](audit/05-studio-records.md) | Parser/projection canonical boleh diguna semula; normalisasi rekod parent lebih ketat daripada validasi UI; checkpoint berasingan daripada refleksi |
| 6 | [Pengesahan bebas](audit/06-verification.md) | Bukti ujian sumber berasingan daripada senarai ujian native yang masih disekat |

[source-provenance.json](source-provenance.json) merekodkan Git blob, SHA-256,
versi dan 46 input penting daripada snapshot 183 fail yang disahkan. Input
matematik, renderer dan adapter yang diuji sepadan dengan commit calon audit.
Perubahan commit ini hanya dokumen/evidence dalam pemilikan `app-learning`;
`digital/**`, firmware dan semua fail bersama Flutter tidak diubah.

### Keputusan teknikal yang mesti dibawa ke implementasi

- Kekalkan semua 11 ID dan resolver `(shapeId, stableFaceId)`. Warna wajib bagi
  cube/cuboid: 0 `#4C8DFF`, 1 `#F69B45`, 2 `#E9799B`, 3 `#42B883`,
  4 `#F4C95D`, 5 `#9B7EDC`. Mesh, legend, diagram, views dan net perlu sepadan.
- Permukaan melengkung mempunyai banyak patch dengan ID sama; jangan menambah
  muka palsu. Net editor, cavity dan composite mempunyai semantik ID tersendiri;
  jangan menggunakan indeks sel atau modulo enam sebagai arah fizikal.
- Canonical context reset bukan reset semua state: ukuran/kamera/sejarah Undo
  boleh kekal. Host native perlu membatalkan dokumen dan callback lama ketika
  actor bertukar, lalu memulihkan checkpoint partition yang dibenarkan sahaja.
- Progress `protocol:1` dan settings `version:1` kekal. Sampul native mesti
  mengikat source/instance/nonce/actor/epoch, saiz dan replay tanpa memberi JWT,
  owner pilihan JS atau RPC arbitrari kepada WebView.
- Rekod empat aktiviti sahaja melalui frozen writer/reader; durable receipt
  menentukan label disimpan. Storage-denied mesti membawa EX11, dan signed-in
  queue tetap milik Prompt 3. Draf/checkpoint bukan rekod refleksi atau grade.
- Mod lanjutan exploratory tidak direka semula menjadi aktiviti berpandu atau
  activity ID tambahan. Kekalkan sempadan source, parser dan matematik sebenar.

## Status 13 paparan dan SOR

Semua baris berikut ialah **BLOCKED_FOUNDATION**, belum route berdaftar atau UI
Flutter yang boleh dijalankan. Route cadangan sebenar disimpan dalam
[integration request](../../integration_requests/app-learning.json).

| ID | Paparan | Status |
|---|---|---|
| 25 | Teroka 3D | BLOCKED_FOUNDATION |
| 26 | Pandangan 2D | BLOCKED_FOUNDATION |
| 27 | Nota pembelajaran | BLOCKED_FOUNDATION |
| 28 | Kalkulator ukuran | BLOCKED_FOUNDATION |
| 29 | Bina bentangan | BLOCKED_FOUNDATION |
| 30 | Makmal isi padu | BLOCKED_FOUNDATION |
| 31 | Luas permukaan / rumus | BLOCKED_FOUNDATION |
| 32 | Bongkah gabungan | BLOCKED_FOUNDATION |
| 33 | Hab makmal | BLOCKED_FOUNDATION |
| 34 | Pelan dan Dongakan | BLOCKED_FOUNDATION |
| 35 | Semakan langkah pengiraan | BLOCKED_FOUNDATION |
| 36 | Rekod latihan kendiri | BLOCKED_FOUNDATION |
| 41 | Hab Belajar | BLOCKED_FOUNDATION |

| SOR | Bukti audit tersedia | Penerimaan Flutter |
|---|---|---|
| L01 | Katalog / mesh 11 model | Belum diuji |
| L02 | Source rotate/zoom/fold/pause/lifecycle | Belum diuji |
| L03 | Enam unjuran sebenar dan no-net sfera | Belum diuji |
| L04 | Formula, unit, π; cube a=4 memberi 96/64 | Belum diuji |
| L05 | Empat makmal dan semua mod source dipetakan | Belum diuji |
| L06 | Kaedah 1, dua skala, tolerance inklusif 0.06 cm | Belum diuji |
| L07 | Parser canonical dan had keselamatan dipetakan | Belum diuji |
| L08 | Empat refleksi / completion / normalisasi | Belum diuji |
| U02 | Stable IDs disahkan; adapter palet belum dibina | Belum diuji |

## Pengesahan sebenar

Semua command Node menggunakan calon sumber yang dipin di atas, bukan kod app.
Suite bertindih antara worker; bilangan tidak dijumlahkan sebagai ujian unik.

| Command / skop | Hasil |
|---|---|
| `digital/module: npm test` | 341/341 lulus, exit 0; disahkan dua worker |
| `digital/module: npm run build` | Exit 0; 572718 byte, output sepadan byte demi byte dengan source |
| `digital/module: npm run check` | Exit 0; standalone syntax/network-storage boundary/CSP/token/contrast |
| `digital: node --test tests/module-*.test.mjs` | 32/32 lulus, exit 0; DOM/adapter sumber, bukan Android WebView |
| Suite fokus worker 2 / 3 / 4 / 5 | 153 / 172 / 186 / 110 lulus; command dan probe tambahan dalam laporan masing-masing |
| Whitespace, JSON, pautan dan sempadan fail audit | Disemak lead sebelum penerbitan |

SHA-256 HTML binaan:
`7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`.
Hash log dan command tepat pengesahan bebas tersedia dalam
[source-test-result.json](audit/source-test-result.json).

SDK setempat diperiksa: Flutter `3.47.9`, Dart `3.13.7`. Ini bukan pin SDK
foundation yang belum tersedia. `flutter analyze`, `flutter test`, integration
WebView Android, `flutter run`, APK preview, telefon/tablet, screenshot native,
TalkBack, system Back/gesture, teks 150% dan cold-start offline **belum dijalankan**.
Semakan 12 PNG dan peta aliran untuk implementasi visual juga belum selesai.
Tiada screenshot sumber web digunakan sebagai bukti app Flutter.

## Langkah sambung tanpa meneka kontrak

1. Dapatkan head `origin/app-foundation` yang diterbitkan. Baca kontrak, READY dan
   handoff; sahkan setiap hash serta bukti analyze/test/build/device-smoke yang
   dirujuk. Nama marker atau label READY sahaja tidak mencukupi.
2. Tetapkan SHA READY yang **sama** dengan `app-cloud-game` dan rekodkan dalam
   handoff/source provenance. Integrasikan SHA itu ke worktree `app-learning`
   sambil mengekalkan commit audit yang sudah diterbitkan; jangan force-push.
3. Banding source lock foundation dengan calon audit `37bc2cd...`. Jika berbeza,
   semak semula delta/fixtures. Hantar source-lock migration/parity request jika
   content version perlu dinaikkan; jangan mengubah pin shared secara senyap.
4. Guna frozen contributions, preferences, bridge/lifecycle/back/audio, actor,
   storage, writer/reader dan asset submanifest extension. Semak 12 PNG+flow,
   kemudian implement exporter/adapter dan 13 paparan dalam pemilikan learning.
5. Isi integration request dengan entry `learningFeature()`, route, delegate,
   migration, aset, dependency dan platform need **yang benar-benar digunakan**.
   Array kini kosong kerana implementasi belum wujud; ia bukan pengisytiharan
   bahawa feature lengkap tidak memerlukan pendaftaran.
6. Jalankan formatter, analyze, feature tests, WebView integration sebenar dan
   `flutter build apk --debug -t lib/dev/learning_main.dart`. Run pada Android:
   `flutter run -t lib/dev/learning_main.dart -d <device-id>`. Kedua-dua command
   ini ialah langkah masa depan; entry point belum dicipta dalam audit ini.
7. Uji matriks visual/lifecycle/offline/storage/corruption/actor/parser/projection
   daripada worker 6, simpan screenshot hasil kod, kemudian push hanya
   `app-learning` selepas scoped checks dan readback head remote.

Rujukan API rasmi dibaca pada 4 November 2026:
[Flutter install](https://docs.flutter.dev/install),
[architecture](https://docs.flutter.dev/app-architecture/recommendations),
[Android run/build](https://docs.flutter.dev/deployment/android) dan
[webview_flutter](https://pub.dev/packages/webview_flutter). Rujukan ini tidak
menggantikan versi dependency atau signatures dalam freeze sebenar.
