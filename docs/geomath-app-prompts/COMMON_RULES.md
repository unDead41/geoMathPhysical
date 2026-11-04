# Kontrak bersama empat chat GeoMath Flutter

Dokumen ini sebahagian daripada keempat-empat prompt. Arahan pengguna terkini
mengatasi snapshot dan cadangan lama. Pasting prompt pelaksanaan memberi skop
membina serta push branch yang dinyatakan; ia tidak memberi skop deployment lain.

## Produk dan sumber

1. Gunakan repository **unDead41/geodecoder** yang sama. App berada dalam
   `apps/geomath_flutter/`; dokumentasi persediaan dalam `docs/geomath-app/`.
   Jangan cipta repo atau database baharu sebagai sebahagian kerja ini.
2. Baca root `AGENTS.md`, `docs/SOR_VERSIONING.md`, `APP.md`, pakej app
   `README.md`, `SOR.md`, `ARCHITECTURE.md`, `UX_CONTRACT.md`, `DESIGN_SYSTEM.md`,
   `SCREEN_CATALOG.md`, `SOURCES_AND_STATUS.md`, `TEST_PLAN.md` dan pelan sedia ada.
   Lihat 12 PNG mockup akhir dan aliran dalam `docs/geomath-app/assets/`.
3. Semak remote `app`, `main-digitalized`, `main` dan sumber feature berkaitan.
   Catat SHA penuh, versi, dirty state dan worktree. Snapshot sumber lama
   `391df...` bukan status integrasi semasa; baca
   `digital/docs/integration-sync/README.md`, `SQL_ORDER.md` dan handoff terkini.
4. Sasaran kerja awal: **Android dahulu**, Flutter native untuk shell, akaun,
   kelas dan permainan; modul geometri canonical dibundel offline melalui
   WebView. Ini keputusan asas pelaksanaan yang perlu diuji dalam spike Prompt 1.
   Jika spike menunjukkan halangan nyata, rekod ADR dan pilih adapter yang
   mengekalkan skop; jangan mengurangkan matematik atau meminta keputusan rutin.
5. Semua path/interfaces Flutter di sini ialah cadangan baharu sehingga Prompt 1
   membekukannya. Jika app sudah wujud ketika kickoff, sambung corak dan versi
   sahnya; jangan menjana projek baharu di atas kod sedia ada.

## Enam subagen dan pemilikan

Selepas audit asas, mulakan **6 subagen serentak** jika slot runtime tersedia.
Pengguna membenarkan agen tambahan mengikut keperluan tanpa had jumlah kumulatif
yang ditetapkan. Bilangan aktif mengikut kapasiti runtime; gunakan semula worker
atau tunggu slot apabila penuh. Setiap agen mendapat skop fail, hasil dan ujian
yang jelas. Elakkan delegasi rekursif tanpa subtugasan yang berasingan.

Setiap worker menggunakan worktree/branch private sendiri dan menyerahkan commit
kepada lead. Gunakan nama seperti `app-learning-worker-1-<session>`, bukan
`app-learning/worker-1` apabila `app-learning` wujud. Hanya lead menggabungkan dan
push branch sasaran. Jangan checkout, reset, stash atau membuang kerja chat lain.

| Pemilik | Kawasan yang boleh diubah |
|---|---|
| Prompt 1, kemudian Prompt 4 | `lib/main.dart`, `lib/app/**`, `lib/core/**`, `pubspec.yaml`, lockfile, platform runners, workflow Flutter, global route/DI/l10n/schema/asset registration |
| Prompt 1 | `features/home/**`, `features/preferences/**`, `features/help/**`, token exporter, bank/golden/neutral-game-card exports dalam `assets/contracts/**` |
| Prompt 2 selepas foundation freeze | `features/learning/**`, `assets/module/**`, `tools/module/**`, ujian dan preview learning |
| Prompt 3 selepas foundation freeze | `features/auth/**`, `profile/**`, `classroom/**`, `solo/**`, `duel/**`, `sync/**`, ujian dan preview cloud/game |
| Setiap chat | Handoff, bukti dan integration request dalam subfolder branch sendiri |

Path feature di atas relatif kepada `apps/geomath_flutter/lib/`.
Jangan edit `digital/**`, firmware atau arkib `docs/geomath-app/**` untuk
membetulkan UI Flutter. Baca source canonical dan eksport dalam snapshot scratch
yang dipin. Fail generated web yang terhasil semasa build tidak masuk commit app.

## Foundation freeze dan kerja selari

Prompt 1 menyediakan `apps/geomath_flutter/docs/FOUNDATION_CONTRACT.md` serta
`FOUNDATION_READY.json`. Kontrak typed minimum:

- `Result<T>` / `AppFailure`, termasuk unavailable, stale, unauthorized,
  conflict, storage failure dan retry-after yang boleh dipaparkan.
- `ActorBinding`: user ID nullable, stable guest/owner partition, session ID,
  epoch dan scope. Tiada credential dalam binding. Auth repository mempunyai
  current binding dan stream; token refresh sesi sama tidak menukar actor.
- `SessionStore` dilindungi; concrete Auth adapter milik Prompt 3.
- `PreferencesRepository`: bahasa BM/English, tema light/dark/system,
  text scale 1.0/1.25/1.5, kontras, reduced motion dan audio.
- `AppDatabase.transaction<T>(...)` dengan transaction handle yang boleh
  menyimpan rekod dan event outbox secara atomik. Feature migrations mempunyai
  namespace/versi unik; registry dan urutan global hanya satu pemilik.
- `FormativeRecordWriter.saveReflection(...)` dan `saveCompletedSolo(...)`
  dengan DTO canonical, actor binding dan receipt durable/failed yang jelas.
  Foundation menyediakan guest/local implementation sebenar; Prompt 3
  menyediakan implementation signed-in + queue melalui interface sama.
- `FormativeRecordReader.watchReflections(ActorBinding)` dan
  `readCompletedSolo(ActorBinding)`, dengan DTO/schema rekod yang sama seperti
  writer. Bekukan pemilikan jadual/migrasi rekod bersama; Prompt 2 tidak mencipta
  SQL/read model refleksi kedua yang berbeza daripada writer/sync Prompt 3.
- `FeatureContribution`: route, localisations, migrations dan service factories;
  composition root menerima senarai contribution. Feature mempunyai preview
  entry point sendiri tanpa menukar router global.
- Clock/RNG injectable, `GeometryCardProvider` dengan aset neutral canonical,
  module bridge port, lifecycle/back policy serta single audio owner.

Uji preview bootstrap dengan service, migration dan localisation contributions
serta routes, supaya kedua-dua feature boleh run tanpa root edits. Registry aset
pusat menunjuk submanifest feature (contoh `assets/module/manifest.json` milik
Prompt 2), dengan semakan hash fail dalaman. Hash aset awal dalam READY ialah
snapshot foundation; perubahan bundle milik feature direkodkan dalam submanifest
dan handoff tanpa menukar kontrak frozen atau menduplikasi hash lama di pusat.

Prompt 1 menetapkan signatures/DTO sebenar dan ujian kontrak dalam fail freeze;
Prompt 2/3 membaca serta menggunakannya, bukan mencipta salinan jenis sendiri.
`FOUNDATION_READY.json` merekod status, contract version/hashes, source SHA,
asset hashes, SDK dan bukti analyze/test/debug-build/device-smoke.
Jangan simpan SHA commit fail itu sendiri dalam fail yang sama; head sebenar
disahkan selepas push dan dilaporkan dalam jawapan penerbitan.

Prompt 2 dan 3 bermula daripada **SHA READY yang sama** pada `app-foundation`.
Jika belum READY, teruskan audit bebas dan nyatakan dependency; jangan bina
foundation kedua atau mengaku boleh run. Jika perlu perubahan shared contract,
hantar `docs/integration_requests/<branch>.json` dalam folder app, menyenaraikan
dependency, route, l10n, migration, asset, platform atau API change dan sebabnya.
Jangan mengubah fail milik chat lain secara senyap.

Foundation menyediakan dependency yang memang digunakan, slot aset dan extension
points untuk kedua-dua feature. Permintaan baharu tidak boleh menyebabkan preview
feature gagal compile: gunakan kemampuan SDK sedia ada atau extension point yang
telah tersedia; perubahan global yang benar-benar wajib perlu diselesaikan oleh
pemilik foundation sebelum freeze baharu, bukan dikaburkan sebagai feature siap.

## UI/UX bersama

- Ikut mockup mobile dan kontrak; semua feature nampak dibina oleh pasukan sama.
  Jana pemetaan token Dart daripada `digital/design-system/tokens.mjs` yang
  dipin, dengan provenance. Palet muka berasingan datang daripada
  `docs/geomath-app/face_colors.json`. Jangan setiap feature memilih warna sendiri.
- Satu shell dengan destinasi Utama, Belajar, Main, Kelas dan Profil; satu set
  button, field, sheet, dialog, notice, loading/error/empty/success, toolbar dan
  legend. Data/logic tidak ditulis dalam widget asas.
- Sasaran sentuhan 48 dp; saiz telefon 320/390/430 dp dan tablet 768 dp;
  BM/English, tema cerah/gelap/kontras, teks100/125/150%, safe area, keyboard,
  TalkBack/semantics, alternatif kepada drag dan reduced motion.
- Penggantian tema/bahasa/saiz teks tidak mereset kamera, ukuran, draf,
  unfolding atau kemajuan. Navigation/back/lifecycle mesti konsisten.
- PNG ialah rujukan reka bentuk. Paparan mesti berupa widget/interaksi sebenar,
  bukan screenshot yang dijadikan skrin app. 48 ID termasuk variant/dialog/state,
  bukan keperluan mewujudkan 48 class halaman berasingan.

## Invariants produk

- Sebelas model pembelajaran dikekalkan. Lima game shapes ialah cube, cuboid,
  pyramid, cylinder dan **cone**. Prisma dalam PNG tidak menggantikan Kon.
- Warna kubus/kuboid: face0 depan `#4C8DFF`;1 kanan `#F69B45`;
  2 belakang `#E9799B`;3 kiri `#42B883`;4 atas `#F4C95D`;5 bawah `#9B7EDC`.
  Gunakan stable physical face ID, label dan legend. Model lain ikut permukaan
  sebenar; tessellation jalur melengkung bukan muka baharu. Game/net neutral.
- Kubus parser menggunakan `a`: a=4 cm memberi96 cm² dan64 cm³.
  Mesh, formula, projection, parser dan bank diambil daripada source canonical.
- Semua request/response/bridge terikat actor/session/epoch/scope; respons lewat
  tidak boleh mengubah akaun/room/instance baharu. Auth/role/markah online sah
  daripada pelayan; route guards tidak menggantikan authorization.
- Hanya refleksi modul dan solo history lengkap yang dibenarkan masuk outbox
  formatif. Local event dan queue ditulis dalam **satu transaction**. Guest tidak
  auto-upload. Auth/CRUD/PIN/live kelas/Duel/help report tidak diantrikan.
- Tiada service-role/client secret/password/JWT dalam WebView, outbox, log,
  screenshot, handoff atau laporan masalah. Sesi berada dalam protected store.
- Backend sedia ada digunakan. Google/SMS/native callback hanya diaktifkan
  berdasarkan capability/config sebenar; ketiadaan provider mempunyai UI jujur.
  Tiada tuntutan SMS delivery/Google consent/hosted migration daripada mock tests.

## Pengesahan, serahan dan Git

Jalankan semakan sesuai skop: formatter, analyze, meaningful unit/widget tests,
integration tests pada Android yang benar-benar tersedia, build APK serta
canonical fixture checks apabila source/export berubah. Jangan memasang stub
yang menyembunyikan plugin gagal atau memalsukan screenshot hasil app.

Jika Flutter/SDK/device belum ada, semak dokumentasi rasmi dan pasang secara
rutin apabila persekitaran membenarkan. Teruskan kerja bebas sambil merekod
blocker. Jangan mendakwa run/PASS bagi command yang tidak dapat dijalankan.
Kejayaan APK build, emulator, telefon fizikal dan hosted service dilapor berasingan.

Handoff setiap branch:
`apps/geomath_flutter/docs/handoffs/<branch>/LATEST.md`, meliputi base/tested
source SHA, freeze version/hashes, fail, commands/exit status, screenshot app
sebenar, integration requests, unresolved blockers dan langkah sambung.
Final head sebenar dilaporkan selepas readback remote. CI menjalankan fail
benar-benar berubah; cache tidak mencampurkan akaun atau config persekitaran.

Prompt 1–3 push **hanya branch masing-masing**. Prompt 4 boleh push
`app-integration`, kemudian fast-forward `app` selepas semakan gabungan.
Push biasa tanpa force; jika ref bergerak, fetch dan gabungkan perubahan sah
pada worktree sendiri lalu ulang semakan terkesan. Jangan reset remote chat lain.

Jangan push/merge `main`, `main-digitalized`, `sharing`, mirror/Pages, store atau
deploy backend/Auth/SMTP/production migrations. App version berasingan daripada
versi dokumen dan firmware. Root `python tools/check_version.py` menyemak versi
warisan; jangan bump firmware untuk branch app. Jangan claim iOS atau kapasiti
5,000 pengguna tanpa binaan/ujian platform dan pengukuran yang berasingan.

## Rujukan rasmi untuk kickoff

Semak versi SDK/package sebenar, pin lockfile dan rekod tarikh sumber:

- [Flutter architecture](https://docs.flutter.dev/app-architecture/recommendations)
- [Flutter installation](https://docs.flutter.dev/get-started/install)
- [Android build/run](https://docs.flutter.dev/deployment/android)
- [webview_flutter](https://pub.dev/packages/webview_flutter)
- [Supabase Dart](https://supabase.com/docs/reference/dart/introduction)
- [Native auth callbacks](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

Rujukan platform menerangkan API; SOR dan source sebenar menetapkan aturan GeoMath.
