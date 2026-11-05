# GeoMath Flutter screen acceptance

App `0.1.0+1`; 2026-11-06 (Malaysia). **48 screen IDs and 16 supplemental states are mapped to real implementation paths.** This mapping does not claim 64 completed Android or hosted acceptance results.

`ready` means the cited integrated evidence demonstrates the stated scope. `partial` means implemented with an outstanding acceptance item. `blocked` means a required implementation or execution prerequisite is unavailable. Feature-branch tests and foundation READY evidence remain inherited evidence; they do not certify the combined production app.

The [JSON matrix](SCREEN_ACCEPTANCE.json) is authoritative for exact implementation paths, test pointers, receipts, capability limits and screenshot lists. An empty screenshot list means no integrated Android capture has been attached. Route names below are actual contribution names; several state IDs intentionally share one route.

## Screens 01–48

| ID | Screen | Owner | Actual route and state | Status |
|---|---|---|---|---|
| 01 | Utama | app-foundation / app-integration | `/` — HomeScreen; native hero and feature shortcuts | partial |
| 02 | Pilih permainan | app-cloud-game | `/play` — SoloPlayPage / quiz or practice setup | partial |
| 03 | Sambung permainan | app-cloud-game | `/play/resume` — SoloResumePage / saved slot | partial |
| 04 | Cara bermain | app-foundation / app-integration | `/guide` — GuideScreen; finite neutral R1/R2 demonstration, replay and reduced motion | partial |
| 05 | Kuiz 10 | app-cloud-game | `/play/solo` — SoloGamePage / SoloMode.quiz | partial |
| 06 | Latihan 15 | app-cloud-game | `/play/solo` — SoloGamePage / SoloMode.practice | partial |
| 07 | Semakan jawapan | app-cloud-game | `/play/solo` — SoloGamePage / feedback and review | partial |
| 08 | Keputusan dan analisis | app-cloud-game | `/play/solo` — SoloGamePage._result / detailed answer analysis | partial |
| 09 | Papan skor kuiz setempat | app-cloud-game | `/play/scores` — SoloScoresPage / local quiz scores | partial |
| 10 | Cipta/sertai Duel | app-cloud-game | `/duel` — DuelScreen._entry | partial |
| 11 | Lobi Duel | app-cloud-game | `/duel/lobby` — DuelScreen._lobby / waiting and countdown | partial |
| 12 | Duel berlangsung | app-cloud-game | `/duel/match` — DuelScreen._match / validated server projection | partial |
| 13 | Keputusan Duel | app-cloud-game | `/duel/result` — DuelScreen._result | partial |
| 14 | Log masuk | app-cloud-game | `/auth/login` — AuthScreenMode.login | partial |
| 15 | Daftar akaun | app-cloud-game | `/auth/signup` — AuthScreenMode.signup | partial |
| 16 | Pemulihan akaun | app-cloud-game | `/auth/recover` — AuthScreenMode.recover / email recovery link | partial |
| 17 | Dashboard guru | app-cloud-game | `/classes` — ClassroomScreen._dashboard / server role teacher | partial |
| 18 | Ahli dan jemputan kelas | app-cloud-game | `/classes` — ClassroomScreen._class / members and invitations | partial |
| 19 | Pantau bilik | app-cloud-game | `/classes` — ClassroomScreen._room / teacher monitor | partial |
| 20 | Keputusan bilik | app-cloud-game | `/classes` — ClassroomScreen._room / closed-room board | partial |
| 21 | Dashboard pelajar | app-cloud-game | `/classes` — ClassroomScreen._dashboard / server role student | partial |
| 22 | Bilik pelajar | app-cloud-game | `/classes` — ClassroomScreen._room and _game / same attempt | partial |
| 23 | Profil saya | app-cloud-game | `/profile` — ProfileScreen / server profile or completion | partial |
| 24 | Kata laluan dan keselamatan | app-cloud-game | `/account/security` — AuthScreenMode.security | partial |
| 25 | Teroka 3D | app-learning | `/learn/explore` — LearningExplorePage; eleven physical-face-colour models | partial |
| 26 | Pandangan 2D | app-learning | `/learn/views` — LearningViewsPage; six views and stable model | partial |
| 27 | Nota pembelajaran | app-learning | `/learn/notes/:shapeId` — LearningNotesPage; canonical notes for selected model | partial |
| 28 | Kalkulator ukuran | app-learning | `/learn/calculator/:shapeId` — LearningCalculatorPage; canonical measurements and units | partial |
| 29 | Bina bentangan | app-learning | `/learn/labs/net` — LearningNetPage; predict/try/check/explain and persisted draft | partial |
| 30 | Makmal isi padu | app-learning | `/learn/labs/volume` — LearningVolumePage; advanced volume modes and reflection | partial |
| 31 | Luas permukaan dan rumus | app-learning | `/learn/labs/area` — LearningAreaPage; surface area/derive formula modes | partial |
| 32 | Bongkah gabungan | app-learning | `/learn/labs/composite` — LearningCompositePage; canonical composite construction | partial |
| 33 | Hab makmal | app-learning | `/learn/labs` — LearningLabsHub; shared lab cards | partial |
| 34 | Pelan dan Dongakan | app-learning | `/learn/projection` — LearningProjectionPage; plan/elevation, scales and tolerance | partial |
| 35 | Semakan langkah pengiraan | app-learning | `/learn/calculation` — LearningCalculationPage; bounded canonical parser | partial |
| 36 | Rekod latihan kendiri | app-learning | `/learn/records` — LearningRecordsPage; shared canonical reflection reader | partial |
| 37 | Tetapan penggunaan | app-foundation / app-integration | `/settings` — PreferencesScreen; language/theme/contrast/text/motion/audio | partial |
| 38 | Tema gelap halaman utama | app-foundation / app-integration | `/` — HomeScreen with dark preference; same route/state | partial |
| 39 | Pusat bantuan | app-foundation / app-integration | `/help` — HelpScreen; offline guide and report navigation | partial |
| 40 | Lapor masalah dan pratonton | app-foundation / app-integration | `/report` — ReportScreen; local report form, preview, redaction, copy and TXT export | partial |
| 41 | Hab Belajar | app-learning | `/learn` — LearningHub; links to explore/labs/studio/records | partial |
| 42 | Cipta kelas | app-cloud-game | `/classes` — ClassroomScreen._createClass / _ClassroomInputDialog | partial |
| 43 | Cipta bilik | app-cloud-game | `/classes` — ClassroomScreen._createRoom / _ClassroomInputDialog | partial |
| 44 | Sertai kelas/bilik melalui PIN | app-cloud-game | `/classes` — ClassroomScreen._joinPin / PIN validation | partial |
| 45 | Sahkan e-mel | app-cloud-game | `/auth/verify` — AuthScreenMode.confirmation / email link | partial |
| 46 | Kata laluan baharu | app-cloud-game | `/auth/reset` — AuthScreenMode.reset / verified recovery only | partial |
| 47 | Sesi aktif | app-cloud-game | `/account/sessions` — SessionsScreen / sanitized active session list | partial |
| 48 | Sambungan Duel terganggu | app-cloud-game | `/duel/match` — DuelScreen._connection / unknown outcome and resync | partial |

## Supplemental states EX01–EX16

| ID | State | Owner | Actual route and state | Status |
|---|---|---|---|---|
| EX01 | Sunting nama kelas | app-cloud-game | `/classes` — _ManagementDialog / editClass rename_class | partial |
| EX02 | Sunting nama bilik | app-cloud-game | `/classes` — _ManagementDialog / editRoom rename_room | partial |
| EX03 | Pengesahan arkib | app-cloud-game | `/classes` — _ManagementDialog / archive_class or archive_room | partial |
| EX04 | Senarai arkib / restore | app-cloud-game | `/classes` — _dashboard archive filter / restore_class or restore_room | partial |
| EX05 | Pengesahan padam rekod kosong | app-cloud-game | `/classes` — _ManagementDialog / delete_class or delete_room | partial |
| EX06 | Keluarkan ahli kelas | app-cloud-game | `/classes` — _class / removeMember and expected_revision | partial |
| EX07 | Batal/tolak jemputan | app-cloud-game | `/classes` — _invitation / cancel_invite or decline_invite | partial |
| EX08 | Conflict revision / refresh | app-cloud-game | `/classes` — _ManagementDialog / refreshManagement explicit revision adoption | partial |
| EX09 | Senarai pending sync | app-cloud-game | `/sync` — SyncScreen / pending count, events and retry | partial |
| EX10 | Login semula untuk sync | app-cloud-game | `/sync` — SyncScreen / needsAuth and current-owner sign-in | partial |
| EX11 | Storan gagal/penuh | app-cloud-game | `/sync` — SyncScreen.unsaved + solo save failure + shared writer failed receipt | partial |
| EX12 | Keluar Duel / forfeit | app-cloud-game | `/duel/match` — DuelScreen._confirmLeave / forfeit | partial |
| EX13 | Draf belum disimpan | app-cloud-game | `/profile` — ProfileScreenState.requestLeave / save discard stay | partial |
| EX14 | Pemulihan akaun legacy | app-cloud-game | `/auth/legacy-recovery` — AuthScreenMode.legacyRecovery / recoverLegacy exact 32hex source code | partial |
| EX15 | Cache read-only / akses ditarik | app-cloud-game | `/classes` — ClassroomScreen stale notice / denial purges selected data | partial |
| EX16 | Backend capability belum tersedia | app-cloud-game | `/auth/login` — Auth unavailable; classroom capability absent; Duel protocol stop; sync unavailable pending kept | partial |

## Evidence and capability bounds

- Foundation READY `9a1f49a`: native Home/preferences/help/report and foundation Android/WebView evidence. This is an inherited receipt for the foundation source.
- Learning `8a55274`: thirteen implemented feature routes, host Dart/JS/SQLite tests and valid preview APK. Feature handoff reports Android WebView acceptance blocked.
- Cloud/game `33e6734`: native Auth/profile/classroom/Solo/Duel/sync source, feature host tests, 304 guest/unconfigured route/profile host combinations and valid preview APK. Hosted Auth/permissions/sync/two-client Duel and Android execution remain separate.
- Requested integrated visual profiles:320/390/430/768dp;BM/English;light/dark/strong contrast;text100/125/150%;reduced motion. The previous host sweep does not establish complete populated-state, keyboard,TalkBack,gesture or real Android coverage.
- Offline UI and local Solo/module/records are distinct from configured hosted features. Google/native callbacks require proven platform and hosted capability;SMS is absent. No provider,SMTP,SQL,Edge,Pages or store deployment is part of this acceptance.

## Integrated checks and remaining acceptance

- Production main registers learning and cloud/game contributions once, awaits startup, and resolves one shared actor/database/preferences/audio/writer/sync owner.
- PASS within cited host/inherited Android scope: destination reset/Back, draft persistence and storage-failure Stay/Leave.
- PASS: corrected-source494host tests,50canonical checks,26tool checks,debug/release builds,3 affected real-WebView cases and32 normal-main captures. Baseline functional and corrected Solo Android receipts are inherited separately.
- Provider/callback capability remains disabled until platform and hosted allowlist/cold/warm/replayed/recovery acceptance is established.

Exact per-item source/test/capability mapping is stored in JSON so an integration device receipt can promote only the states it actually demonstrates. Full readiness must not be inferred from source presence or preview compilation.


## Verified offline milestone

[Native correction and production capture CI](https://github.com/unDead41/geodecoder/actions/runs/42082666643) passed on `377a444b7ff6956de8f40b617a40dcbcb9a4a837`. Its three real-WebView cases revalidate the sole changed native runtime file;169 other runtime files match the functional baseline. The earlier full workflow remains failed and is not relabelled green. Thirty accepted originals combine with two corrected390/430cube originals of the identical APK; the rejected original32-set remains blocked. Four profiles cover320/390/430/768dp,BM/English,light/dark/high contrast,100/125/150% text and reduced motion.32 original PNGs do not mean32 boots or all64 states. Guest screenshots do not establish populated classrooms, Google consent,live permissions or two-client Duel. Exact scopes/hashes and per-item limits are in JSON.
