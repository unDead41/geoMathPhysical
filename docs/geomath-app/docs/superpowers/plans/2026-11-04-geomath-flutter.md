# GeoMath Flutter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Jika mekanisme itu tidak tersedia, baca AGENTS dan laksanakan urutan serta pintu semakan yang sama secara native; jangan berhenti hanya kerana nama pakej bantuan tidak tersedia. Delegasi mematuhi kebenaran pengguna dalam sesi pelaksanaan.

**Goal:** Menghasilkan app GeoMath dengan UX mudah alih, matematik canonical,
offline kendiri dan integrasi akaun/kelas/Duel yang memelihara kontrak sebenar.

**Architecture:** Cadangan Flutter native untuk shell dan feature akaun,
kelas serta permainan. Modul geometri dibundel melalui WebView dan bridge
terhad; repository mengawal data, sesi dan outbox. Enjin solo Dart perlu
parity dengan JS sebelum digunakan; mod online tidak mengira markah sendiri.

**Tech Stack:** Flutter/Dart Material 3, Router SDK, ChangeNotifier/ValueNotifier;
candidate webview_flutter, supabase_flutter, sqflite, flutter_secure_storage.
Versi dipilih dan dikunci semasa kickoff selepas semakan platform.

**Spec:** [SOR](../../../SOR.md), [Architecture](../../../ARCHITECTURE.md),
[Data](../../../DATA_BACKEND_CONTRACT.md), [Offline](../../../OFFLINE_SYNC.md),
[Design](../../../DESIGN_SYSTEM.md), [Screens](../../../SCREEN_CATALOG.md).

## Global Constraints

- Source base direfresh; baseline rekod 391df985eea4fee15d9859e678068b1a3f613cba.
- 11 model modul;5 shape permainan termasuk cone;15 bank;quiz 10/practice 15.
- R1→R2, single attempt, +1 pair; feedback 900/1200/review 1800 ms ikut core.
- Duel protocol 2; PIN 10 min/match 15 min; masa pelayan, pending sequence sama.
- Progress protocol 1, settings version 1; tiada credential dalam WebView.
- Projection scale 1:1/1:2 dan tolerance 0.06 cm inklusif; parser 480/180/28/12/1e30.
- Palet muka ikut ID; BM/English; text 100/125/150%; sentuh sasaran 48 dp.
- Outbox batch 20, cap 2000/owner; guest/classroom/Duel/auth/CRUD tidak diantrikan.
- Tiada auto-push/merge/deploy; source code, APK dan hosted rollout bukti berbeza.

## Review Focus

1. App dibunuh OS semasa simpan/ack: Tugas 2/7/9 mesti memelihara transaction,
   ID event dan snapshot sah tanpa double score.
2. Akaun A bertukar ke B ketika request/bridge berjalan: Tugas 2/4/8/9/10 mesti
   menolak respons A dan tidak mengirim queue A menggunakan sesi B.
3. WebView memuat aset rosak, message palsu atau navigasi luar: Tugas 3/4 mesti
   fail dengan jelas tanpa fallback kepada JS remote yang tidak dipin.
4. Backend lebih lama daripada UI atau keahlian ditarik: Tugas 8/10 mesti
   capability-gate, bersihkan cache lama dan kekalkan draf/pending yang sah.
5. App kembali daripada background semasa Duel atau review solo: Tugas 7/10/11
   membezakan baki clock solo daripada deadline Duel yang terus berjalan.

## Antara muka app cadangan

Nama berikut ialah kontrak Dart baharu untuk menyatukan tugasan, bukan API yang
telah wujud. Semua jenis didefinisikan dalam Tugas 2 dan diperluas dalam owning
feature: `Result<T>`, `AppFailure(code,message,retryAfter)`, `ActorBinding`
(userId?,sessionId?,epoch,scope), immutable `AppPreferences`, `ModuleRecord`,
`SoloState`, `ClassSnapshot`, `DuelSnapshot`, `OfflineEvent` dan `SyncState`.
Token/password tidak menjadi property state UI tersebut.

`AppPreferences`: language ms/en; theme light/dark/system; textScale 1.0/1.25/1.5;
strongContrast, reducedMotion, musicEnabled dan soundEnabled sebagai boolean.
`ModuleLaunch`: section, shapeId pilihan dan dimensions/π context yang disahkan.
section ialah field wrapper cadangan; audit seam navigasi `app.mjs` sebelum
mendedahkannya. Ia bukan permission menambah command arbitrari pada protocol 1.
Unsupported section memberi Result failure, bukan klik selector DOM secara buta.

## Milestone A — foundation dan Belajar offline

### Tugas 1 — Tetapkan asas integrasi dan spike telefon

**Files:** source-read SOURCES_AND_STATUS; create
`apps/geomath_flutter/docs/SOURCE_LOCK.md`, `pubspec.yaml`, `lib/main.dart`,
`integration_test/module_spike_test.dart` dalam checkout kerja sendiri.

**Interfaces:** consumes release Digital yang disahkan; produces app yang
memuat satu modul setempat dan resit SDK/device/asset SHA.

- [ ] Semak remote, hak fail dan status offline/CRUD/scaling/UI; tentukan base
  integrasi dan catat sebab tidak mengambil branch yang belum diterima.
- [ ] Sahkan Android-first/hibrid atau skop port penuh dengan pengguna ketika
  kickoff. Pin SDK/dependency dan app bundle identifier development sendiri.
- [ ] Tulis spike integration yang membuka aset tanpa Internet, putar kubus dan
  buka/cantum bentangan; uji missing asset menghasilkan ralat yang boleh pulih.
- [ ] Jalankan spike pada emulator dan telefon. Jika tidak lulus, selesaikan
  bridge/rendering dahulu sebelum membina semua 48 paparan.
- [ ] Commit feature branch hanya jika diberi arahan commit dalam sesi itu.

### Tugas 2 — State, simpanan dan sempadan actor

**Files:** create `lib/core/result.dart`, `core/session/actor_binding.dart`,
`core/session/auth_repository.dart`, `core/session/session_store.dart`,
`core/storage/app_database.dart`; tests `test/core/actor_storage_test.dart`.

**Interfaces:** `AuthRepository.bindings: Stream<ActorBinding>`;
`SessionStore` menyimpan/memadam sesi dilindungi; `AppDatabase` memberi
transaction kepada store feature tanpa credential.

- [ ] Ujian: A→B ketika save/ack menangguh tidak menerapkan hasil A kepadaB;
  transaction gagal tidak meninggalkan rekod tanpa pending event.
- [ ] Jalankan test sasaran dan pastikan gagal sebelum membina storage/state.
- [ ] Implement Result/AppFailure, actor epoch dan schema version migrations;
  asingkan SDK session persistence daripada SQLite perniagaan.
- [ ] Jalankan `flutter test test/core/actor_storage_test.dart`; expected PASS
  bagi rollback, reopened DB, logout, denied storage dan late response.

### Tugas 3 — Export aset dan kontrak canonical

**Files:** coordinate `digital/tools/export-mobile-contracts.mjs`;
create `assets/contracts/manifest.json`, `assets/contracts/questions.json`,
`assets/module/`; tests `test/contracts/source_manifest_test.dart`.

**Interfaces:** immutable manifest dengan source SHA, module version, ruleset,
bank hash, file hashes dan content schema; `ContentCatalog.load()` menghasilkan
Result catalog yang telah disahkan.

- [ ] Uji bank 15unik/3 each bagi lima SHAPES yang tepat,11module IDs dan setiap
  bundled file wujud/hash tepat. Corrupt byte mesti ditolak.
- [ ] Export daripada source JS/build rasmi, bukan PNG atau bank ditaip semula.
  Jangan ubah fail generated Digital secara manual untuk menyokong app.
- [ ] Bina source/module suites; jalankan source_manifest test dan offline
  install/reopen test. Pin keseluruhan dependency aset, termasuk audio.

### Tugas 4 — ModuleHostBridge selamat dan stateful

**Files:** create `lib/features/learning/module_host_bridge.dart`,
`assets/module/native_wrapper.html`, `test/learning/module_bridge_test.dart`,
`integration_test/module_bridge_test.dart`.

**Interfaces:** `ModuleHostBridge.open(ModuleLaunch,ActorBinding)` dan
`updatePreferences(AppPreferences)` mengembalikan `Future<Result<void>>`;
`records: Stream<ModuleRecord>`; `close(): Future<void>`.

- [ ] Uji fake source/instance/session, unknown command, oversize message,
  stale A message, dan dua bridge protocol yang tidak boleh bercampur.
- [ ] Implement wrapper allowlist dan adapter protocol sumber; tidak menerima
  owner atau raw RPC daripada JS. Kunci navigasi kepada aset dipercayai.
- [ ] Uji semua 11 model, state kamera/dimensi/draf selepas preference change,
  memory/lifecycle dan tiada credential melalui channel.
- [ ] Lulus T02/T03 pada WebView sebenar; unit Dart sahaja tidak cukup.

### Tugas 5 — Design system, shell dan warna muka

**Files:** create `lib/core/design/geomath_theme.dart`, `face_palette.dart`,
`core/widgets/`, `features/preferences/`, `lib/app/app_router.dart`;
test `test/design/palette_navigation_test.dart`.

**Interfaces:** `PreferencesRepository.watch(): Stream<AppPreferences>` dan
`save(AppPreferences): Future<Result<void>>`; `FacePalette.forFace(shape,id)`
menghasilkan warna tanpa membaca yaw/pitch kamera.

- [ ] Uji ID 0blue/1orange/2pink/3green/4yellow/5purple untuk cube/cuboid,
  tiada warna tertukar selepas rotation/unfold, dan semua props l10n kekal.
- [ ] Implement komponen bersama dan adapter token; bina shell/route typed.
- [ ] Uji BM/English, light/dark, text 150%, tap 48 dp, keyboard/back dan
  safe-area 320–430 dp. Snapshot/golden hanya untuk elemen visual yang stabil.

### Tugas 6 — Lengkapkan feature Belajar

**Files:** `features/learning/learning_screen.dart`, `learning_records_screen.dart`,
`module_repository.dart`; test `integration_test/learning_flow_test.dart`.

**Interfaces:** `ModuleRepository.save(ModuleRecord,ActorBinding)` dan
`read(ActorBinding)`; module launch context daripada route/dimensi canonical.

- [ ] Tulis integrasi 25→26→27→28→35 dan 33→29–32→36 serta 34, dengan state
  kamera/draf/ukuran terpelihara. Test semua advanced modes yang disokong.
- [ ] Uji projection exactly 0.06 inclusive dan parser boundary melalui source
  sebenar; jangan port checker hanya untuk memudahkan styling.
- [ ] Implement UI routes dan rekod empat refleksi. Tiada activity ID baharu
  untuk projection/calculation. Lulus T03–T05 sebelum Milestone A diterima.

## Milestone B — permainan kendiri dan akaun

### Tugas 7 — Port solo dengan parity dan simpan/sambung

**Files:** `features/solo/domain/solo_engine.dart`, `solo_store.dart`,
`score_repository.dart`, UI 05–09; tests `test/solo/golden_parity_test.dart`,
`integration_test/solo_resume_test.dart`.

**Interfaces:** `SoloEngine.dispatch(SoloAction,int nowMs): SoloState`;
`restore(SoloSnapshot,ActorBinding): Result<SoloState>`; result attemptId kekal.

- [ ] Jana fixtures JS seeded melalui core sebenar; uji setiap peralihan R1/R2,
  salah/skip/hint/advance/finish, clock dan round selection terhadap Dart.
- [ ] Jalankan parity test dahulu; implement sehingga state sepadan selepas
  setiap tindakan, bukan skor akhir sahaja.
- [ ] Implement snapshot owner/schema/ruleset/bank validation, review remainder,
  atomic checkpoint dan leaderboard kuiz max 50 yang idempotent.
- [ ] Uji OS kill/reopen, bad snapshot, bank mismatch, A→B dan duplicate result;
  lulus T06/T07 sebelum menghidupkan permainan untuk pengguna.

### Tugas 8 — Auth, profil, keselamatan dan callback

**Files:** `features/auth/`, `features/profile/`, `core/network/account_gateway.dart`,
native deep-link config; tests `integration_test/auth_profile_test.dart`.

**Interfaces:** AuthRepository mengeluarkan ActorBinding sah; method signIn,
signup/recover melalui gateway canonical; `ProfileRepository.save(...)`
menerima binding semasa dan mengembalikan Result profil.

- [ ] Uji server-owned role, username/email, sesi luput, cold-start/reused/expired
  recovery link, draf belum disimpan dan response selepas logout.
- [ ] Implement adapter SDK/gateway, secure session persistence, screens 14–16,
  23–24,45–47 dan pengesahan keluar skop sebenar.
- [ ] Jalankan T08 dengan fixture dahulu. Ujian real email/hosted Auth hanya
  setelah staging dan kebenaran ditetapkan; jangan menganggap fixture sebagai live.

### Tugas 9 — Sync rekod formatif berakaun

**Files:** `core/storage/outbox_repository.dart`,
`features/learning/module_sync_repository.dart`, `core/network/offline_gateway.dart`;
tests `test/offline/outbox_test.dart`, `integration_test/offline_reopen_test.dart`.

**Interfaces:** `OutboxRepository.enqueue(OfflineEvent,ActorBinding)` menghasilkan
`Future<Result<void>>`; `flush(ActorBinding): Future<SyncState>`;
`changes: Stream<SyncState>`. Wire payload ikut source geo_offline_sync.

- [ ] Uji batch 20, cap 2000, ack subset/duplikat/hilang, ID content conflict,
  owner switch, DB ack gagal, crash transaction dan missing backend capability.
- [ ] Implement atomic durable queue dan bounded retry; tiada guest auto-transfer
  atau credential. UI membezakan storage-failed daripada synced.
- [ ] Lulus T11 semasa app offline/reopen. Tiada background force-stop promise;
  current live game/auth/CRUD tidak masuk queue.

## Milestone C — kelas, Duel dan utiliti lengkap

### Tugas 10 — Gateway online dan shared policy

**Files:** `core/network/network_policy.dart`, `classroom_gateway.dart`,
`duel_gateway.dart`, `features/classroom/classroom_repository.dart`,
`features/duel/duel_repository.dart`; tests `test/network/gateway_contract_test.dart`.

**Interfaces:** `ClassroomRepository.apply(ClassCommand,ActorBinding)` returns
`Future<Result<ClassSnapshot>>`; `DuelRepository.send(DuelCommand,ActorBinding)`
returns `Future<Result<DuelSnapshot>>`. Guest Duel capability kekal disokong.

- [ ] Uji exact wire action/payload, revision conflict, capability absent,
  membership denial, retry same pending seq, coalesced reads dan old epoch.
- [ ] Implement transport berdasarkan source integrasi yang dipin, termasuk
  policy scaling yang diterima; jangan menaikkan polling setiap widget.
- [ ] Uji two-client dropped ack, durable review dan server deadline; lulus
  T09/T10/T11 sebelum UI menulis operasi online sebenar.

### Tugas 11A — UI pengurusan guru

**Files:** `features/classroom/teacher/` untuk 17–20/42–43 dan EX01–EX08;
`integration_test/teacher_flow_test.dart`.

**Interfaces:** Consume ClassroomRepository.apply daripada Tugas 10 dan form/
confirmation components Tugas 5; menghasilkan state pengurusan yang typed.

- [ ] Uji owner/outsider, capability lama, revision conflict, invitation UUID
  lama, archive/restore terminal dan retention selepas remove member.
- [ ] Implement list, form dan confirmation menggunakan repository; tiada SQL
  atau RPC raw dalam widget. Disabled mesti benar-benar menghalang tindakan.
- [ ] Jalankan T09 dan test ini dalam BM/English/dark/text 150%; current draft
  dan fokus mesti kekal ketika refresh gagal atau konflik dipaparkan.

### Tugas 11B — UI pelajar dan percubaan kelas

**Files:** `features/classroom/student/` untuk 21–22/44, classroom game adapter;
`integration_test/student_flow_test.dart`.

**Interfaces:** Consume ClassSnapshot dan command repository Tugas 10. Reuse
komponen permainan Tugas 7 untuk visual sahaja; authority kekal server.

- [ ] Uji PIN kelas/bilik, terima/tolak jemputan, waiting→teacher start,
  satu attempt selepas reopen dan akses ditarik ketika page terbuka.
- [ ] Implement route/state pelajar dan context game kelas tanpa memasukkan
  hasilnya ke leaderboard kuiz atau outbox live actions.
- [ ] Jalankan T09 dan test ini; dua akaun fixture mesti mempunyai sempadan
  data/clock/ranking yang betul sebelum integrasi hosted yang dibenarkan.

### Tugas 11C — UI Duel, review dan forfeit

**Files:** `features/duel/presentation/` untuk 10–13/48 dan EX12;
`integration_test/duel_flow_test.dart`.

**Interfaces:** Consume DuelRepository.send dan DuelSnapshot Tugas 10; tiada
local SoloEngine.dispatch untuk menilai Duel.

- [ ] Uji dua pemain Sedia, countdown, durable review, dropped ack, background,
  expired lobby/match dan system back/gesture yang memerlukan forfeit confirm.
- [ ] Implement lobby/game/result/reconnect dengan timer pelayan, pilihan
  neutral dan pending state yang tidak membenarkan jawapan berganda.
- [ ] Jalankan T10 pada dua client berasingan, termasuk seorang guest. Tiada
  Pause yang membekukan deadline atau rematch yang tidak disokong gateway.

### Tugas 11D — Tetapan, bantuan dan laporan setempat

**Files:** `features/preferences/presentation/` untuk 37/38,
`features/help/` untuk 39/40; `integration_test/help_report_test.dart` dan
`integration_test/app_flow_test.dart` untuk smoke navigation merentasi milestone.

**Interfaces:** Consume PreferencesRepository Tugas 5 dan context snapshot yang
telah ditapis; laporan tidak mempunyai API penghantaran.

- [ ] Uji settings tanpa reset aktiviti, demo terhingga 4.8 s, laporan wajib,
  preview/copy/TXT, clipboard failure dan tiada network send.
- [ ] Implement menggunakan komponen bersama; tiada tiket/chat/push baharu.
- [ ] Jalankan T01/T12 dan app_flow smoke, BM/English/dark/text 150%, termasuk
  kembali daripada help kepada draf dan permainan dengan clock mod yang betul.

## Milestone D — keluaran yang boleh dibuktikan

### Tugas 12 — Semakan keseluruhan, telefon dan handoff

**Files:** app version/lockfiles, source manifest, `docs/handoffs/<branch>/LATEST.md`,
release evidence dan known deviations; ikut HANDOFF_TEMPLATE.

**Interfaces:** Source lock + versi SDK + APK/aset SHA + keputusan suite +
capability/deployment receipt yang berasingan.

- [ ] Jalankan flutter analyze, flutter test, integration_test dan build release
  yang dirancang dalam TEST_PLAN. Simpan command/exit status sebenar.
- [ ] Uji telefon fizikal dan profil startup/frame/memory/audio/lifecycle.
  Rekod source web/module suites yang turut dijalankan selepas integration.
- [ ] Uji approved hosted permissions/Auth/Realtime/sync; staging load berasingan
  sebelum sebarang dakwaan 5,000 pengguna. Jangan publish jika scope bukti belum jelas.
- [ ] Lengkapkan handoff dan screenshot hasil kod sebenar. Commit/push/release
  hanya mengikut arahan sesi; tiada blanket permission daripada pelan ini.

## Pelaksanaan separa yang sah

Milestone A boleh menjadi app Belajar offline yang boleh diuji, B menambah solo
dan akaun, C melengkapkan skop online, D mengesahkan keluaran. Setiap milestone
mesti menamakan fungsi belum siap. Jangan menanda seluruh 48 paparan siap daripada
navigation placeholder atau screenshot yang diletakkan dalam WebView.
