# Sumber, SHA, status dan pembetulan rujukan

Semakan: **4 November 2026, Asia/Kuala_Lumpur**. Ini snapshot dokumentasi,
bukan pengesahan keadaan ketika pembangun membacanya kemudian.
Semakan remote head, ancestry dan handoff dilakukan secara baca sahaja;
tiada branch ditukar, dipush atau diintegrasikan bagi menyediakan pakej ini.

## Baseline dan branch yang diperhatikan

| Branch | Remote SHA penuh yang dibaca |
|---|---|
| `digitalized-classroom-crud` | `1f0dedca55fd8d1291f5ea5c0b2fc74c059d4324` |
| `digitalized-core-backend-scaling` | `5904e4856c0fbab86224cd0a4f63ced77e707018` |
| `digitalized-game-duel-ui-refresh` | `02f7614b0b28b7b867836bb2f83fbfc4437888cb` |
| `digitalized-module-explore-ui-refresh` | `3ac761ce138c0286f144a74b16e25eed6906c1f7` |
| `digitalized-module-labs-ui-refresh` | `dcb5ef6f6ae2a56d52ce0f7f99893d8050d043e2` |
| `digitalized-module-studio-ui-refresh` | `0a1304652ff74b5e82aecdf416092fe57dda2131` |
| `digitalized-utility-offline-sync` | `b1125588ade0c18168f2fd0116d3e9084dfdd3ed` |
| `digitalized-ux-ui-upgrade` | `fc50b3ed51c14774f3f75e8098df3988f4c6a07f` |
| `main` | `25836eb1a6f24459aace8a3980ae880a13e3b488` |
| `main-digitalized` | `391df985eea4fee15d9859e678068b1a3f613cba` |
| `ui/ux-redesign-concept` | `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd` |

Digital baseline **2.8.0**, modul **1.6.0** pada `391df985eea4fee15d9859e678068b1a3f613cba`.
Firmware `main` diperhatikan pada `25836eb1a6f24459aace8a3980ae880a13e3b488` dengan keluaran
v2.0.2; nombor firmware1.1.3 dalam sesetengah dokumen Digital lama ialah
rekod sejarah, bukan firmware terkini. App tidak mengubah firmware.

Perbandingan terhadap main-digitalized yang diperiksa:

| Candidate | Ahead / behind | Makna yang disahkan |
|---|---|---|
| offline-sync | 1 / 0 | Head berada satu commit di hadapan baseline; belum termasuk dalam head main-digitalized yang diperiksa |
| classroom-crud | 1 / 0 | Sama: source tambahan pada branch sendiri |
| backend-scaling | 2 / 0 | Source implementation dan dokumentasi tambahan pada branch sendiri |

Ketiga-tiga merge base ialah `391df985eea4fee15d9859e678068b1a3f613cba`. UI branch lain disenaraikan sebagai
ref yang diperhatikan; perbandingan ancestry dan ujian gabungan mereka perlu
diulang ketika kickoff. Dokumen ini tidak memperakukan semua kerja branch
tersebut telah dipasang pada backend hosted atau diterbitkan pada laman.

## Sumber domain canonical

| Sumber | Digunakan untuk |
|---|---|
| [core.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/dist/core.mjs) | SHAPES, bank selection, single attempt, clocks/constants |
| [questions.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/dist/questions.mjs) | Bank15 soalan dan ID canonical |
| [solo-save.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/dist/solo-save.mjs) | Snapshot, restore, owner/ruleset/bank |
| [duel.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/dist/duel.mjs) | Transport, guest capability, pending command |
| [DUEL_V2.md](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/docs/DUEL_V2.md) | Projection, review, sequence dan protocol 2 |
| [cloud.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/dist/cloud.mjs) | RPC/auth/session binding |
| [module-progress.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/dist/module-progress.mjs) | Empat activity IDs, validation dan progressprotocol1 |
| [module-settings.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/dist/module-settings.mjs) | Settings bridge version 1/source/instance |
| [content.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/module/src/content.mjs) | Semua 11 model dan istilah muka |
| [geometry.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/module/src/geometry.mjs) | ID muka, views, folding dan palet lama |
| [renderer.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/module/src/renderer.mjs) | Per-face color dan renderer sebenar |
| [projection-geometry.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/module/src/projection-geometry.mjs) | Kaedah 1, skala, toleransi dan primitive checker |
| [calculation-steps.mjs](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/module/src/calculation-steps.mjs) | Parser terhad, symbol dan had input |
| [Token UI](https://github.com/unDead41/geodecoder/blob/391df985eea4fee15d9859e678068b1a3f613cba/digital/design-system/tokens.mjs) | Satu owner sistem reka bentuk web |
| [Kontrak konsep](https://github.com/unDead41/geodecoder/blob/4d83561667cf74fbe5cd6144ce5e3e7f660a75cd/digital/docs/uiux-redesign-concept/IMPLEMENTATION_CONTRACT.md) | Peraturan mengatasi ilustrasi, sempadan sumber dan pemilikan |

## Candidate yang tidak boleh tercicir

| Candidate | Rujukan yang dibaca | Status / batas bukti |
|---|---|---|
| Offline | [handoff](https://github.com/unDead41/geodecoder/blob/b1125588ade0c18168f2fd0116d3e9084dfdd3ed/digital/docs/handoffs/digitalized-utility-offline-sync/LATEST.md) dan [kontrak](https://github.com/unDead41/geodecoder/blob/b1125588ade0c18168f2fd0116d3e9084dfdd3ed/digital/docs/OFFLINE_SYNC.md) | Durable queue/reflections/solo history; source dan local/browser fixture checks dilapor; tiada hosted rollout atau force-stop background guarantee |
| CRUD | [handoff](https://github.com/unDead41/geodecoder/blob/1f0dedca55fd8d1291f5ea5c0b2fc74c059d4324/digital/docs/classroom-crud/HANDOFF.md) dan [API](https://github.com/unDead41/geodecoder/blob/1f0dedca55fd8d1291f5ea5c0b2fc74c059d4324/digital/backend/classroom-crud/README.md) | Rename/archive/restore/delete-empty/member/invites; product/CRUD browser tests dilapor; reference-gallery timeout belum selesai; tiada production migration |
| Scaling | [handoff](https://github.com/unDead41/geodecoder/blob/5904e4856c0fbab86224cd0a4f63ced77e707018/digital/docs/handoffs/digitalized-core-backend-scaling/LATEST.md) | Network/cache/policy/SQL/load harness candidate; local correctness dilapor; real browser blocked pada handoff; tiada kapasiti 5,000 disahkan |

Angka ujian dalam handoff ialah laporan pemilik branch pada SHA tersebut.
Penyediaan pakej ini tidak menjalankan semula suite aplikasi itu. Hosted
migration history, actual Edge config, Auth email dan latest public deployment
tidak diaudit di sini. Jangan menyamakan source push dengan deployment.

## Pembetulan dan batas mockup

| ID | Perbezaan | Aturan implementasi |
|---|---|---|
| E01 | Beberapa pilihan kuiz/Duel PNG menunjukkan Prisma | Gunakan SHAPES canonical cube/cuboid/pyramid/cylinder/**cone**. Prisma hanya katalog pembelajaran melainkan bank diubah melalui skop baharu |
| E02 | Raster net/garis/occlusion atau thumbnail kecil boleh tidak tepat | Render daripada mesh/preset/projection canonical; jangan trace polygon atau ambil jawapan daripada PNG |
| E03 | Cube formula pada sesetengah PNG menggunakan s untuk rusuk | Untuk parser canonical gunakan a bagi rusuk kubus:6a²/a³. s digunakan bagi tinggi sendeng dalam konteks lain; jangan tukar parser untuk meniru gambar |
| E04 | UI/warna48 paparan belum source Flutter | Warna muka ialah spesifikasi baharu; baseline geometry.mjs masih palet lama. Tiada APK atau widget tree dalam pakej |
| E05 |40 desktop frames pada concept branch berbeza daripada 48 mobile frames pakej ini | Guna PNG mobile akhir untuk UX app; contract/domain sumber tetap menang |
| E06 | CRUD/offline menambah state selepas mockup dibuat | Bina EX01–EX16 dengan komponen bersama; capability-gate backend lebih lama |
| E07 | Ikon lonceng, angka, tarikh, PIN dan email dalam mockup | Data/ilustrasi contoh; bukan notifikasi push atau data seed sebenar |
| E08 |3tab mobile Pelan/Depan/Sisi boleh menyembunyikan susunan serentak | Kekalkan koordinat dan susunan Kaedah 1 pada paparan bersama/export |
| E09 | Palet terang dalam PNG mempunyai shading/anti-alias | Hex dalam face_colors.json ialah token implementasi; tidak mensyaratkan semua pixel PNG tepat sama |

## Rujukan rasmi platform yang dibaca

| Rujukan | Kegunaan terhad |
|---|---|
| [Flutter architecture](https://docs.flutter.dev/app-architecture/guide) | Pembahagian view/viewmodel/repository/service |
| [Flutter offline-first](https://docs.flutter.dev/app-architecture/design-patterns/offline-first) | Satu repository mengatur local dan remote; polisi produk ditentukan SOR |
| [Supported platforms](https://docs.flutter.dev/reference/supported-platforms) | Semak OS/SDK semasa memilih target |
| [webview_flutter](https://pub.dev/packages/webview_flutter) | WebView rasmi untuk platform yang diiklankan; jangan infer sokongan Windows/web |
| [Supabase Flutter](https://supabase.com/docs/reference/dart/introduction) | SDK client Auth/RPC/Realtime; tidak menggantikan gateway ownership |
| [Native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) | Callback pengesahan/pemulihan app |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Authorization server-side, berasingan daripada UI role |
| [sqflite](https://pub.dev/packages/sqflite) | Candidate SQLite transaction/migration untuk mobile |
| [flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage) | Candidate persistence sesi dilindungi; semak konfigurasi versi sebenar |

Cadangan architecture/SDK tidak bermaksud dependency ini telah dipasang atau
dipin. Changelog Supabase Markdown tidak berjaya dibaca melalui pengambil web
dalam semakan ini; semak changelog semasa kickoff sebelum menulis integrasi.
Jangan menggunakan API/config lama daripada ingatan.

Fail PDF KSSM pengguna tidak disalin ke pakej. Pemetaan kurikulum dan halaman
khusus perlu dirujuk kepada sumber pembelajaran repository/PDF sebenar,
bukan diada-adakan daripada reka bentuk.
