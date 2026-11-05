# GeoMath Flutter — Belajar, Makmal dan Studio

Status: **HOST_VERIFIED_APK_BUILT_ANDROID_SMOKE_BLOCKED**. App `0.1.0+1`, foundation contract `1.0.0`, canonical module `1.6.2`. Branch `app-learning`; 5 November 2026, Asia/Kuala_Lumpur.

13 paparan telah diimplementasi dan APK preview universal berjaya dibina. Pengesahan WebView Android serta pembaikan navigasi bersama masih diperlukan sebelum penerimaan integrasi.

## Asas dan pemilikan

Foundation READY: `9a1f49a7c92d13bb70b7fd1420c34629a7785f9e`, SHA yang sama diwajibkan untuk `app-cloud-game`. Kontrak SHA256 `0a31f7aef121a151ee91a4ae92250fd893ad62108f27a9389b5fa5ed9a918356`; source lock `cf7d5e6a54c6da65d70f97caae26cff059de558f3fd56db97245252358220452`; lockfile `9ba313c3af1f80193c6c0a61c2e38fcee51f1b5aabb8404ebdccfd04210f542c`. Ketiga-tiga hash kekal.

Sumber matematik: `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5`, Digital2.9.1. HTML canonical kekal572718 byte, SHA256 `7ddd5d60a25fbdf73c20f9f8e8fc0db4253e582fb50d17c944307b8f682066c4`.

`learningFeature()` dan `lib/dev/learning_main.dart` menggunakan contribution, controller dan repository production yang sama. Tiada perubahan core/router global/pubspec/lockfile/shared reflection schema, neutral game cards, firmware atau source Digital. Export feature dilakukan dalam snapshot canonical berasingan. [Provenance](source-provenance.json) merekod hash submanifest semasa.

## Paparan

| ID | Paparan / route | Status |
|---|---|---|
|25|Teroka3D — `/learn/explore`|Implemented; Android pending|
|26|Pandangan2D — `/learn/views`|Implemented; Android pending|
|27|Nota — `/learn/notes/:shapeId`|Implemented; Android pending|
|28|Kalkulator — `/learn/calculator/:shapeId`|Implemented; Android pending|
|29|Bentangan — `/learn/labs/net`|Implemented; Android pending|
|30|Isi padu — `/learn/labs/volume`|Implemented; Android pending|
|31|Luas/Rumus — `/learn/labs/area`|Implemented; Android pending|
|32|Gabungan — `/learn/labs/composite`|Implemented; Android pending|
|33|Hab makmal — `/learn/labs`|Implemented; Android pending|
|34|Pelan & Dongakan — `/learn/projection`|Implemented; Android pending|
|35|Langkah pengiraan — `/learn/calculation`|Implemented; Android pending|
|36|Rekod — `/learn/records`|Implemented; Android pending|
|41|Hab Belajar — `/learn`|Implemented; Android pending|

Native Flutter mengurus shell, navigasi, preferences, selector/toolbar, notis dan rekod; WebView aset setempat menjalankan renderer/parser/aktiviti canonical. Semua11 model, palet stable physical face ID, enam pandangan, ukuran/unit/pi, mod makmal lanjutan, projection dua skala/toleransi0.06cm dan parser terbatas dikekalkan. PNG rujukan tidak dijadikan skrin app.

## Pembaikan resume

Draf prediction/explanation/answer yang belum dihantar kini kekal apabila menukar makmal, termasuk medan yang sengaja dikosongkan. Navigation origin ditangkap sebelum handler canonical bertukar seksyen, disahkan dan disimpan di bawah actor semasa sebelum native routing. Jika penyimpanan origin gagal tetapi pemulihan dokumen berjaya, Retry menyimpan draf hidup itu; ia tidak membaca semula checkpoint lama. Input WebView disekat semasa initialize/transfer/recovery.

Manifest mesti sepadan dengan source, module, private API dan versi/had checkpoint native. Checkpoint closed-container canonical serta Undo diuji silang Dart/JS. Peraturan protocol progress1, settings1, envelope native1/65536 byte dan private checkpoint2MiB kekal berasingan.

Draf/checkpoint kekal dalam namespace `learning_checkpoints:1`, terasing actor/scope/slot. Hanya empat refleksi canonical menggunakan shared writer/reader; saved memerlukan durable receipt. Rekod refleksi menggunakan CTA jujur Buka aktiviti/Open activity; ia membuka mod canonical lalai dan bukan pemilih checkpoint terkini. Tiada outbox atau jadual refleksi kedua.

## Bukti sebenar

[Bukti dan receipt resume](evidence/resume-20261105/result.json) mengandungi commands, exit status, hash runtime, hash log dan metadata APK.

| Semakan | Keputusan |
|---|---|
|Flutter3.47.9/Dart3.13.7 analyze|PASS;0 issues|
|Kesemua unit/widget Flutter|139/139 PASS|
|Source/bridge/surface/checkpoint Node|46/46 PASS; termasuk25 kes parity Dart/JS|
|Formatter|109 fail;0 perubahan|
|Feature-only canonical export|PASS; HTML/source lock/lockfile kekal|
|Learning preview APK universal|PASS; ARM64/ARMv7/x86_64 engines|
|ZIP CRC, current bundled asset bytes, v2 signature|PASS|
|Android WebView/screenshots/TalkBack/gestures|NOT RUN; emulator segfault sebelum boot|

341 ujian canonical terdahulu disimpan sebagai bukti sumber yang tidak berubah; angka itu tidak ditambah kepada ujian Flutter atau digunakan sebagai bukti Android. SOR L01–L08/U02 masih memerlukan penerimaan Android/visual sebenar. Ujian host responsive/BM-English/tema/150% tidak menggantikan TalkBack atau gesture pada peranti.

Build awal yang kehabisan ruang menghasilkan APK tidak lengkap. Output packaging itu dibuang, APK dibina semula, kemudian keseluruhan ZIP CRC, tiga engine ABI, kandungan canonical dan tandatangan v2 disahkan. Receipt APK akhir sahaja ialah artifak sah; tiada SDK/build output/credential dimasukkan ke Git.

## Baki integrasi wajib

1. `GeoMathRouter.select` kini reset laluan tanpa menunggu contributed leave guard. Edit diikuti tap destinasi bawah sebelum autosave2s boleh kehilangan perubahan terkini. Pemilik `app-integration` mesti menunggu BackPolicy sebelum reset dan menguji storage failure Stay/Leave. Fail shared tidak diubah oleh feature ini.
2. Emulator API35 tanpa KVM terhenti sebelum boot; tiada telefon tersedia. Jalankan learning-specific Android suite, capture paparan phone/tablet/BM-English/tema/150%, dan uji TalkBack, rotate/draw/scroll, lifecycle serta system Back. Tiada screenshot app palsu disediakan.

SVG dan pautan menggunakan native preview/select/copy yang dilabel dengan benar. Native SVG file picker/printing serta OS URL opener ialah adapter platform tambahan dalam [integration request](../../integration_requests/app-learning.json). Tiada dakwaan fail SVG tersimpan atau cetakan berjaya melalui clipboard.

## Sambung dan jalankan

```sh
cd apps/geomath_flutter
flutter pub get
flutter analyze
flutter test
flutter run -t lib/dev/learning_main.dart -d <android-device>
flutter build apk --debug -t lib/dev/learning_main.dart
bash docs/handoffs/app-learning/evidence/run_learning_android.sh <android-device>
```

Integrator mendaftarkan `learningFeature()` dengan contribution lain pada SHA foundation di atas. Workflow sedia ada membina main/foundation smoke; bukti feature Android memerlukan target learning sebenar. [Audit sebelum foundation](audit/PREFOUNDATION.md) dan bukti lama dikekalkan sebagai sejarah. Hanya `app-learning` diterbitkan; tiada Pages/backend/store atau branch lain dipush.
