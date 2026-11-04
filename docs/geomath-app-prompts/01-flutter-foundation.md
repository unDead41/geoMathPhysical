# Prompt 1 — GeoMath Flutter Foundation

Ini arahan **implementasi** apabila dipaste ke chat pelaksanaan. Teruskan daripada
audit hingga kod, ujian, bukti run dan push branch; hasil bukan pelan sahaja.

Repository: `https://github.com/unDead41/geodecoder`.
Ref arahan: `app`. Branch kerja: **`app-foundation`**.
Lokasi app: **`apps/geomath_flutter/`**.
Baca dan laksanakan [COMMON_RULES.md](COMMON_RULES.md) sepenuhnya.

## Tujuan dan persediaan

Bina asas app Flutter yang benar-benar boleh dijalankan pada Android, dengan
UI bersama yang mengikut mockup GeoMath dan kontrak yang membolehkan dua chat
feature bekerja serentak kemudian. Mulakan daripada `origin/app` terkini dalam
worktree sendiri. Jika branch kerja sudah wujud, inspect perubahan dan sambung
tanpa reset. Rekod main/main-digitalized/app SHA dan semak source terkini.

Gunakan Android dahulu dan native Flutter shell; spike modul geometri canonical
dibundel offline dalam WebView. Selesaikan pilihan rutin dengan ADR berasaskan
bukti. Jangan memulakan port semua mesh/parser ke Dart untuk mendapatkan app awal.

## Enam subagen awal

Mulakan 6 subagen serentak selepas audit dan pembahagian fail:

1. Toolchain, scaffold Android, dependency inventory dan cadangan CI.
2. Design tokens, widgets, BM/English, accessibility dan native preference UI.
3. Feature registration, navigation/back, lifecycle serta audio ownership.
4. Actor/session/transaction/persistence contracts dan ujian isolation.
5. Source export, bank/golden/neutral assets dan spike modul WebView offline.
6. Semakan bebas terhadap requirement coverage, build, kontrak dan bukti run.

Bilangan kumulatif agen tambahan tidak dihadkan oleh prompt ini; ikut kapasiti
runtime. Lead satu-satunya penulis akhir fail shared; worker menyerahkan commit
atau patch melalui worktree sendiri, bukan mengubah pubspec/router serentak.

## Kerja yang mesti disiapkan

### 1. Toolchain dan app runnable

- Inspect Flutter, Dart, Java, Android SDK, emulator/device dan Android WebView.
  Pilih stable SDK/package yang disokong semasa pelaksanaan, rekod versi sebenar.
  Jangan hard-code nombor SDK lama daripada snapshot dokumen.
- Jika folder app belum wujud, jana Android Flutter project dalam lokasi itu.
  Nama paparan **GeoMath**. Pilih application ID development yang konsisten,
  rekod sebagai belum identiti store muktamad. Versi app baharu boleh bermula
  `0.1.0+1`; jika sudah ada versi sah, teruskan tanpa downgrade.
- Sediakan `main.dart`, `lib/app/app.dart`, `app_router.dart`,
  `app_dependencies.dart`; bootstrap guest boleh digunakan tanpa Internet/config
  cloud. Env tidak lengkap mesti menghasilkan capability-unavailable, bukan crash.
- Sediakan README run untuk Windows/Android Studio/VS Code dan CLI; simpan
  contoh config public tanpa secret. CI Flutter mempunyai path filters dan
  command yang sama dengan pemeriksaan tempatan. Jangan ubah workflow web.

### 2. UI bersama dan paparan milik foundation

Siapkan **01,04,37,38,39,40**: utama, panduan, tetapan, variant gelap, bantuan
dan laporan masalah setempat. Ambil shell/token/spacing/typography/komponen
daripada reka bentuk yang telah dipersetujui; centralized dan reuse.

Sediakan native destinations Utama/Belajar/Main/Kelas/Profil, button/field,
shape picker/toolbar/face legend, sheet/dialog/notice serta states biasa.
Tab feature yang belum dipasang dilabel pembangunan belum lengkap dengan jelas;
placeholder tidak dikira feature siap. Semua skrin milik foundation berfungsi.

Preferences satu pemilik dan durable: BM/English; cerah/gelap/sistem, kontras,
teks100/125/150%, reduced motion dan audio. Help report mempunyai preview,
copy/select/TXT yang benar-benar tersedia pada Android; tiada auto-send/tiket.

### 3. Bekukan kontrak sebelum dua chat bermula

Implement interface dan DTO yang disenaraikan COMMON_RULES, dengan nama/path
sebenar dalam `docs/FOUNDATION_CONTRACT.md`. Buat test kontrak yang memeriksa
behavior, bukan menyalin implementation. Sekurang-kurangnya:

- Actor binding/session epoch dan protected session port; guest partition stabil.
- `Result/AppFailure`, policy rangkaian, clock/RNG injectable dan lifecycle.
- Transaction database, migration contribution unik, reflection/solo writer port
  serta reader actor-bound dengan DTO/schema bersama; local guest writer tidak
  mengaku saved sebelum durable commit. Bekukan pemilik jadual rekod bersama.
- Preferences, feature routes/localisations/services/migrations contribution,
  modular root composition dan preview injection untuk chat feature.
- Module bridge dengan identity/epoch/lifecycle; `GeometryCardProvider` neutral.

Tempah dependency dan extension points yang digunakan Prompt 2/3: local WebView,
Supabase adapter, SQLite, protected storage serta ujian tempatan yang serasi.
Commit `pubspec.lock`. Pilih satu state/routing approach; default SDK
ChangeNotifier/Listenables + repository/view-model sesuai kecuali bukti lain.
Tiada feature mencipta preferences/auth/database/theme kedua.

Sediakan kedua-dua preview bootstrap yang boleh dipakai melalui contribution
tanpa mengedit root. Prompt 2 akan memiliki `lib/dev/learning_main.dart`;
Prompt 3 akan memiliki `lib/dev/cloud_game_main.dart`. DTO yang belum dikodkan
tidak boleh ditulis seolah-olah sudah interface sah.
Contract-test pendaftaran services, migrations dan localisations selain routes.
Sediakan submanifest aset per-feature supaya perubahan bundle learning selepas
freeze tidak memerlukan Prompt 2 menyunting aggregate manifest pusat.

### 4. Source lock, golden fixtures dan spike sebenar

Sediakan `docs/SOURCE_LOCK.md` dan mesin-readable lock dengan SHA canonical,
version bank/ruleset/module/schema dan hash aset. Build source dalam snapshot
scratch supaya generated `digital/**` tidak masuk commit app.

- Eksport bank15 canonical, istilah/11model, token UI serta fixture engine JS
  dengan tindakan, RNG draw stream eksplisit dan clock input. Jangan menganggap
  seed RNG Dart sepadan dengan JavaScript. Sediakan game-card/net assets neutral
  daripada source canonical dan provider yang boleh digunakan Prompt 3 tanpa
  menunggu Prompt 2; bukan gambar mockup sebagai jawapan.
- Bina baseline modul lengkap melalui build source sebenar. Learning 11 model
  datang melalui `learning-mesh.mjs`/`studySolidMesh`, bukan `buildMesh` lima bentuk
  sahaja. Bundle local HTML/JS dan hash; app tidak load website/GitHub/CDN runtime.
- Spike memaparkan model canonical sebenar dengan putar/bentangan dan satu mesej
  bridge tervalidasi pada Android. Progress protocol1, settings version1 dan
  envelope native app mesti kekal kontrak berasingan. Jangan hantar credential.
- Selepas freeze, `features/learning/**`, `assets/module/**` dan `tools/module/**`
  diserahkan kepada Prompt 2; foundation tidak mengubahnya serentak lagi.

## Lima keadaan yang mesti diuji

1. Theme/language/text berubah semasa model diputar: state model tidak reset.
2. App cold start offline dan aset module hilang/rosak: hanya aset sah dilabel ready.
3. Response/bridge epoch lama tiba selepas logout/actor switch: diabaikan.
4. Storage write gagal/queue belum ada: UI tidak mendakwa rekod durable/synced.
5. Back gesture/keyboard/text150% pada 320 dp: tindakan dan confirmation boleh dicapai.

## Pintu READY dan pengesahan

Dari folder app, jalankan command sebenar berikut mengikut toolchain tersedia:

```text
flutter --version
flutter doctor -v
flutter pub get
dart format --output=none --set-exit-if-changed lib test integration_test
flutter analyze
flutter test
flutter build apk --debug
flutter devices
flutter run -d <device-id>
```

Folder/target test mesti benar-benar wujud; tambah integration smoke test
WebView pada Android dan jalankannya dengan device ID sebenar. Uji offline,
reopen, preferences, secure bridge dan ambil screenshot app hasil kod sebenar.
Jika environment membenarkan, selesaikan pemasangan SDK/emulator rutin; jika
terhalang, teruskan kerja bebas dan lapor blocker tanpa memalsukan run.

Tulis `docs/FOUNDATION_READY.json` hanya dengan status yang benar. READY memerlukan
analyze/tests/debug-build lulus dan device smoke sebenar; sebut emulator atau
telefon yang digunakan. Rekod hashes kontrak/aset, command/exit status dan bukti.
Jika belum boleh menjalankan gate itu, marker `blocked` beserta sebabnya;
Prompt 2/3 tidak membina foundation pendua. Jangan janji semua48 paparan siap.

Lengkapkan `docs/handoffs/app-foundation/LATEST.md`. Jalankan root version
consistency checker dan `git diff --check`; semak fail dalam scope. Commit dan
push **hanya `app-foundation`**, sahkan remote SHA, lapor versi app, cara run,
bukti, status READY dan SHA foundation yang perlu dipakai kedua-dua chat.
