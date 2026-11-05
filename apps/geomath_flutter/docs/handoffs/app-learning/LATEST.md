# GeoMath Flutter — Belajar, Makmal dan Studio

Status: **IMPLEMENTED_PENDING_FLUTTER_CI_AND_ANDROID_PREVIEW**.
App `0.1.0+1`; kontrak foundation `1.0.0`; modul canonical `1.6.2`.
Tarikh: 5 November 2026, Asia/Kuala_Lumpur. Branch: `app-learning`.

## Asas yang disahkan

Foundation READY yang digunakan: `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`.
Lead menyemak 101 hash runtime, hash kontrak/source lock/lockfile dan hasil CI
foundation `41973098124` yang berjaya. Bukti Android foundation tidak dianggap
bukti Android feature learning ini. Chat `app-cloud-game` masih audit-only pada
semakan awal resume; ia mesti menggunakan SHA READY **yang sama** ini.

- Kontrak SHA-256: `0a31f7aef121a151ee91a4ae92250fd893ad62108f27a9389b5fa5ed9a918356`.
- Source lock SHA-256: `cf7d5e6a54c6da65d70f97caae26cff059de558f3fd56db97245252358220452`.
- Lockfile SHA-256: `9ba313c3af1f80193c6c0a61c2e38fcee51f1b5aabb8404ebdccfd04210f542c`.
- Sumber matematik: `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital `2.9.1`.
- HTML canonical kekal 572718 byte, SHA-256
  `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`.

[Integration request](../../integration_requests/app-learning.json) dan
[provenance](source-provenance.json) menyenaraikan entry sebenar, route, empat
namespace bahasa, migrasi checkpoint dan manifest aset semasa. `pubspec`,
lockfile, core, router/composition global, shared record schema, neutral game
cards dan source lock tidak diubah. Tiada queue atau reflection table kedua.

## Implementasi

`learningFeature()` ialah contribution production yang sama digunakan oleh
`lib/dev/learning_main.dart`. Hab Belajar/Makmal, native shell, navigasi,
selector/toolbar, notis simpan dan rekod ialah Flutter. Renderer, formula,
makmal, lukisan unjuran dan parser berjalan dalam WebView aset setempat sebenar.
Tiada PNG mockup dijadikan skrin atau website/CDN/service worker runtime.

| ID | Paparan / route | Status kod |
|---|---|---|
| 25 | Teroka 3D — `/learn/explore` | Implemented; Android pending |
| 26 | Pandangan 2D — `/learn/views` | Implemented; Android pending |
| 27 | Nota — `/learn/notes/:shapeId` | Implemented; Android pending |
| 28 | Kalkulator — `/learn/calculator/:shapeId` | Implemented; Android pending |
| 29 | Bentangan — `/learn/labs/net` | Implemented; Android pending |
| 30 | Isi padu — `/learn/labs/volume` | Implemented; Android pending |
| 31 | Luas/Rumus — `/learn/labs/area` | Implemented; Android pending |
| 32 | Gabungan — `/learn/labs/composite` | Implemented; Android pending |
| 33 | Hab makmal — `/learn/labs` | Implemented; Android pending |
| 34 | Pelan&Dongakan — `/learn/projection` | Implemented; Android pending |
| 35 | Langkah pengiraan — `/learn/calculation` | Implemented; Android pending |
| 36 | Rekod — `/learn/records` | Implemented; Android pending |
| 41 | Hab Belajar — `/learn` | Implemented; Android pending |

Kesemua 11 model, enam pandangan, unit/π, gallery/studio/editor bentangan,
unit/pour/comparison/transfer isi padu, closed/container/cavity luas dan roof/
rocket gabungan kekal menggunakan canonical. Kaedah 1, dua skala, toleransi
inklusif 0.06 cm dan parser terbatas tidak dipindahkan atau dipermudahkan.

Palet menggunakan ID fizikal; cube/cuboid 0–5 ialah biru/jingga/merah jambu/
hijau/kuning/ungu yang diluluskan. Composite/cavity mengikut constituent dan
permukaan sebenar. Vertex arrays, urutan vertex, formula dan pemarkahan asal
tidak ditukar. Sfera/hemisfera tidak ditawarkan bentangan rata tepat.

Progress `protocol:1`, settings `version:1` dan frozen native envelope v1/65536
byte kekal berasingan. Private typed feature actions/checkpoints menolak key,
source, urutan, saiz dan bentuk tidak sah; checkpoint maksimum 2 MiB supaya
Undo canonical penuh boleh dipelihara. Private readiness ACK foundation kekal.

Draf/checkpoint berasingan dalam namespace migrasi `learning_checkpoints:1`,
partition actor + scope + slot, melalui transaction database foundation. Hanya
empat refleksi canonical menggunakan shared reader/writer; saved memerlukan
durable receipt. EX11 mengekalkan draf dan retry. Checkpoint rosak/gagal dibaca
tidak ditindih oleh autosave sebelum recovery atau pilihan draf baharu.

Workflow nota/kalkulator membawa ukuran dan π melalui handler canonical.
Native route seed terikat `ActorBinding`, sekali guna, dan tidak dihantar kepada
JS sebagai identity. Reopen memilih snapshot memori terkini hanya untuk actor
yang sama, atau repository actor semasa. Back berkongsi owner foundation dan
menunggu checkpoint; tema/bahasa/teks mengekalkan instance. Actor baharu tidak
menerima draf, receipt atau callback actor lama.

## Pengesahan sebenar dan had

| Semakan | Hasil sesi resume |
|---|---|
| Canonical `digital/module: npm test` | 341/341 PASS |
| Build/check canonical dalam snapshot | PASS; source-built HTML tidak berubah |
| Frozen + learning bundle + surface Node suites | 40/40 PASS |
| Dart↔JS checkpoint schema parity | PASS 1 test / 24 kes, termasuk Undo 3×30×200 |
| Feature-only export | PASS; deterministik, tiada shared export ditulis |
| Dart 3.13.7 formatter | PASS; Flutter lint package belum tersedia setempat |
| Scoped whitespace / hash / JSON | Disemak lead sebelum push |
| Flutter analyze / unit/widget tests | Menunggu hosted CI |
| Learning preview APK / actual Android WebView | NOT RUN / NOT BUILT |
| Telefon/tablet/screenshots/TalkBack/gestures | NOT RUN; tiada bukti app palsu |

Ujian Flutter ditulis untuk catalogue corruption, 13 route/l10n, responsive
320/430/768 dp dan 150%, SQLite rollback/reopen/actor, reader/writer dan EX11.
Empat integration cases menggunakan WebView sebenar termasuk workflow seed A→B
dan Reopen. Ia belum dianggap PASS. Fail runner dan receipt di
[evidence/README.md](evidence/README.md).

SDK Flutter setempat tiada. Muat turun URL rasmi pinned 3.47.9 dan metadata
release memulangkan HTTP404 dalam persekitaran ini; Dart 3.13.7 tersedia untuk
format/parity. Tiada adb/Android SDK/peranti/KVM setempat dibuktikan. Workflow
sedia ada pada `app-learning` menjalankan analyze/tests/main APK/foundation
smoke; ia tidak membuktikan target preview learning secara automatik.

Flow PNG berjaya dibaca dan disahkan. Semua 12 papan mockup >1 MiB tidak dapat
dibaca melalui connector: respons base64 kosong dan fallback blob bukan UTF-8.
Tiada dakwaan visual parity papan atau screenshot telefon daripada pemeriksaan
kod. Matriks native BM/English/light/dark/contrast/150% masih perlu dijalankan.

SVG bentangan dan pautan kurikulum menggunakan native select/copy yang nyata.
Native file picker SVG, cetakan/PDF dan pembukaan pelayar OS memerlukan adapter
platform integrator; channel foundation sedia ada hanya report TXT. Kod ini
tidak menamakan salinan clipboard sebagai fail tersimpan atau cetakan berjaya.

## Jalankan dan integrasikan

```sh
cd apps/geomath_flutter
flutter pub get
flutter analyze
flutter test test/features/learning
node --test tools/contracts/verify_exports.test.mjs test/foundation/native_adapter_contract.test.mjs test/features/learning/bundle/*.test.mjs test/features/learning/surface/*.test.mjs
node --test test/features/learning/studio/*.test.mjs
flutter run -t lib/dev/learning_main.dart -d <device-id>
flutter build apk --debug -t lib/dev/learning_main.dart
bash docs/handoffs/app-learning/evidence/run_learning_android.sh
```

Integrator mendaftarkan `learningFeature()` bersama contribution lain, mengekalkan
SHA foundation di atas dan extension writer/outbox Prompt 3. Jalankan runner
learning pada Android sebenar/emulator; ambil screenshots phone/tablet dan
TalkBack/manual gesture checks, kemudian kemas kini status berdasarkan bukti.
Tiada backend, Pages, store, main atau main-digitalized diterbitkan oleh kerja ini.

Enam worker menyerahkan commit private; hanya lead mempush `app-learning`:
`aca297246a3d88fe2087c5fdfeb2d4f9997dfaf0`,
`9d39f72718a114fec9b67e63f9f5c772a3d35559`,
`c246ff2853271d55625b15c438a8077e2051b6d6`,
`0463585de07ee0e9c65a768400343a95d402f0f9`,
`b112ee1ed0a18ebbbcfccd7fc7a7d4e06dd5b2ea`,
`3e17040a5ccec8283b179273c17e2a1651003ab7`,
`1b0e14a07ee9e3d52c797bad3f3aed8f6fd3c6d5`.
Audit sebelum foundation dikekalkan dalam [audit/PREFOUNDATION.md](audit/PREFOUNDATION.md).
