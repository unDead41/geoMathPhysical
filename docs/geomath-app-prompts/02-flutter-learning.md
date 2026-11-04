# Prompt 2 — Belajar, Makmal dan Studio Flutter

Ini arahan implementasi hingga feature berfungsi, diuji dan dipush. Repository:
`https://github.com/unDead41/geodecoder`. Ref arahan: `app`.
Branch kerja: **`app-learning`**. Baca [COMMON_RULES.md](COMMON_RULES.md) sepenuhnya.

## Kebergantungan dan sempadan

Mula selepas Prompt 1 menghasilkan READY pada `origin/app-foundation`.
Baca `apps/geomath_flutter/docs/FOUNDATION_CONTRACT.md`, READY marker dan handoff;
sahkan bukti serta hash, bukan nama marker sahaja. Gunakan **SHA foundation yang
sama dengan Prompt 3**, rekod SHA dalam handoff, dan cipta worktree sendiri.
Jika belum READY, buat audit sumber bebas dan laporkan dependency; jangan
mencipta scaffold/theme/router/session/database pendua.

Miliki `apps/geomath_flutter/lib/features/learning/**`, `assets/module/**`,
`tools/module/**`, `test/features/learning/**`, `integration_test/learning_*.dart`,
`lib/dev/learning_main.dart` dan dokumen/evidence branch sendiri. Gunakan kontrak
frozen. Jangan edit pubspec/lockfile, lib/core, router/composition, l10n aggregate,
root schema/asset registry atau `digital/**` yang sedang dimiliki chat lain.
Hantar perubahan shared melalui integration request; feature mesti boleh diuji
dan dipratonton melalui contribution pada foundation sedia ada.

## Enam subagen awal

1. Source export, bundle offline, WebView bridge dan provenance.
2. Teroka3D, stable face IDs/warna, enam pandangan2D, nota dan kalkulator.
3. Bina Bentangan serta makmal Isi Padu, termasuk mod lanjutan.
4. Luas Permukaan/Terbitkan Rumus dan Bongkah Gabungan, termasuk bekas/rongga.
5. Pelan&Dongakan, parser semakan pengiraan, draft dan rekod refleksi.
6. Ujian geometri/bridge/lifecycle, visual, accessibility dan semakan bebas.

Mulakan 6 subagen serentak selepas skop fail ditetapkan. Worker tools/bridge dan setiap
makmal menggunakan subfolder sendiri. Lead menyelesaikan integration dalam
feature. Tambah/guna semula agen jika perlu dalam slot runtime sebenar; tiada
had jumlah kumulatif yang ditetapkan.

## Skop paparan dan UX

Siapkan ID **25–36 dan41** daripada screen_catalog, iaitu 13 paparan milik chat ini:
hab Belajar; Teroka3D; Pandangan2D; nota; kalkulator; Bina Bentangan; Isi Padu;
Luas Permukaan/Rumus; Bongkah Gabungan; hab makmal; Pelan&Dongakan; semakan
langkah pengiraan; rekod latihan kendiri.

Gunakan widget shell/button/field/sheet/status/toolbar/legend yang sama daripada
foundation. Native Flutter mengurus navigasi dan preferences; renderer/aktiviti
geometri canonical berjalan dalam local WebView yang berinteraksi sebenar.
Jangan menjadikan seluruh website sebagai satu WebView tanpa UX feature, atau
menggunakan PNG mockup sebagai skrin. Jangan merosakkan matematik demi rupa PNG.

## Sumber, renderer dan warna muka

Audit source SHA yang dipin dalam foundation dan perubahan canonical terkini.
Jika ada keperluan naik content version, rekod migration/parity dan minta lead
integrasi menyelaraskan source lock; jangan feature menukar pin secara senyap.

Sumber utama termasuk `digital/module/src/content.mjs`, `geometry.mjs`,
`learning-mesh.mjs`, `renderer.mjs`, `projection-geometry.mjs`,
`calculation-steps.mjs` dan module progress/settings/frame adapters.
`digital/module/tools/build.mjs` menghasilkan HTML modul self-contained.
Build dalam snapshot scratch: script juga boleh menulis design-token generated
web, yang tidak boleh dicommit dalam branch app.

Kekalkan semua11 ID:
`cube`, `cuboid`, `pyramid`, `cylinder`, `cone`, `triangular-prism`, `tetrahedron`,
`pentagonal-prism`, `hexagonal-prism`, `sphere`, `hemisphere`.
Jangan hanya menggunakan `buildMesh()` kerana ia tidak mewakili katalog penuh.

Warna muka kubus/kuboid mengikuti stable physical ID:

| Face ID | Arah asal | Hex |
|---|---|---|
| 0 | Depan | `#4C8DFF` |
| 1 | Kanan | `#F69B45` |
| 2 | Belakang | `#E9799B` |
| 3 | Kiri | `#42B883` |
| 4 | Atas | `#F4C95D` |
| 5 | Bawah | `#9B7EDC` |

Resolver berdasarkan `(shapeId, stableFaceId)`, bukan posisi skrin atau normal
selepas animasi. Muka asal kekal warnanya semasa rotate, unfold dan views.
Gunakan label/legend untuk perbandingan arah; model lain ikut muka/permukaan
sebenar. Jalur tessellation pada satu permukaan melengkung tidak menjadi muka
baharu. Sfera tidak diberikan bentangan tepat rekaan. Palette belajar tidak
mengubah kad permainan neutral yang digunakan Prompt 3.

## Aktiviti dan ketepatan

- Teroka: rotate/zoom/reset camera/pilih muka, buka/cantum, pause/resume,
  reduced motion. Enam pandangan2D ialah projection sebenar, berbeza daripada net.
- Nota/kalkulator: semua bentuk, unit, dimensi, π modes dan formula canonical;
  kubus a=4 cm menghasilkan96 cm²/64 cm³. Jangan mengganti simbol parser kepada
  `s` hanya kerana mockup menggunakan simbol itu.
- Empat makmal mengekalkan Ramalkan→Cuba→Semak→Terangkan serta semua galeri,
  studio bentangan, pemindahan isi padu, bekas terbuka/rongga yang source sokong.
- Projection: lima projek asas dan dua susunan kiub; Kaedah1, depan+Z, pelan+Y,
  sisi kanan+X; sisi kanan di kiri depan dan pelan di bawah depan. Skala1:1/1:2,
  garis/bulatan/jenis garis/Undo; tolerance inklusif0.06 cm pada lukisan.
- Semakan pengiraan: Rumus→Gantian nilai→Pengiraan→Unit; input480 aksara,
  token/node180, depth28, kuasa magnitud maksimum12, finite bound1e30;
  parser canonical tanpa eval atau eksekusi kod.
- Rekod hanya empat activity `net`, `volume`, `area`, `composite`, dengan had
  teks canonical240/600/600. Completed memerlukan penjelasan sah; rekod ialah
  refleksi kendiri, bukan TP/XP/grade. Projection/calculation bukan activity
  tambahan secara automatik. Draf dan checkpoint aktiviti kekal jenis berasingan.

## Bridge, persistence dan offline

Kekalkan module progress `protocol:1` dan settings `version:1`; envelope native
baharu tidak menggantikan format itu. Validate message source/instance/nonce,
schema, size dan native actor epoch. Abaikan malformed, replay atau instance
lama. JS tidak memilih owner atau meminta RPC arbitrari, dan tidak menerima JWT.
WebView hanya boleh memuat aset dipercayai; pautan luar melalui tindakan native.

Preferences native satu pemilik: jangan reset camera/dimensi/folding/tab/draft
apabila tema/bahasa/teks berubah. Background menghentikan audio/auto-rotation;
reopen mengekalkan checkpoint yang dibenarkan. Account switch mengasingkan draft
dan rekod melalui kontrak foundation; jangan data A muncul dalam B.

Simpan refleksi melalui `FormativeRecordWriter` frozen. Foundation guest writer
membolehkan preview offline. Prompt 3 menyediakan signed-in writer dan outbox;
jangan membina queue sync kedua di learning. Durable receipt sahaja boleh
memaparkan saved. EX11 storage failure mesti dapat dicapai daripada learning.
Paparkan rekod melalui `FormativeRecordReader` frozen dengan DTO/schema sama,
bukan query SQL atau table refleksi kedua. Simpan hash bundle dalam submanifest
feature `assets/module/manifest.json`; registry pusat menggunakan extension point
foundation dan tidak memegang salinan hash bundle lama yang perlu diubah chat ini.

Bundle HTML/JS/audio yang digunakan, hash/schema/content version dan fallback
aset rosak. Cold start dan aktiviti mesti berfungsi tanpa CDN, website service
worker atau GitHub runtime. Overlay/app adapter yang diperlukan untuk palette,
bridge/mobile UX mestilah deterministic, source-pinned dan diuji.

## Ujian dan hasil

Tambah `learningFeature()` contribution sebenar serta preview entry point yang
menggunakan repository/controllers yang sama dengan production. Jalankan pada
Android dengan `flutter run -t lib/dev/learning_main.dart -d <device-id>`.

Uji semua11 model; palette selepas rotate/fold/views; cylinder/cone/sphere curved
surfaces; formula/unit/π; projection dua skala dan tolerance boundary; parser
malicious/oversized inputs; semua fasa makmal; valid/invalid reflection; actor
switch, expired module instance, storage failure, asset corruption dan reopen.
Bandingkan fixture dengan modul sebenar. Canonical tests/build/check dijalankan
dalam snapshot source yang digunakan apabila exporter/domain berubah.

Jalankan formatter, `flutter analyze`, `flutter test test/features/learning`,
integration tests WebView sebenar dan
`flutter build apk --debug -t lib/dev/learning_main.dart`. Build preview feature
ini membuktikan contribution learning dimuatkan, berbeza daripada foundation main.
Ambil screenshot hasil
kod pada telefon/tablet, BM/English, light/dark/kontras serta teks150%; semak
TalkBack, tap alternatif, draw/rotate/scroll gesture dan system Back.
Bezakan emulator/telefon/hosted; jika platform test tidak tersedia, rekod blocker.

Isi `docs/integration_requests/app-learning.json`: contribution entry, routes,
localisation delegates, migrations, assets, dependencies dan platform needs
(senaraikan kosong apabila tiada). Lengkapkan screen status25–36/41,
SOR L01–L08/U02, ujian dan evidence dalam
`docs/handoffs/app-learning/LATEST.md`. Catat foundation SHA/contract hashes.

Commit dan push **hanya `app-learning`** selepas scoped checks serta
`git diff --check`; sahkan remote head dan lapor cara run preview. Jangan
push app, branch web, firmware, backend atau Pages. Prompt 3 boleh bekerja
serentak, dan Prompt 4 akan menyambungkan contribution pada app utama.
