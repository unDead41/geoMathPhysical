# Prompt 4 — Integrasi, Jalankan Android dan APK

Ini arahan implementasi/integrasi hingga app benar-benar boleh dijalankan dan
hasilnya boleh diuji pengguna. Repo: `https://github.com/unDead41/geodecoder`.
Ref arahan: `app`. Branch kerja: **`app-integration`**.
Baca dan laksanakan [COMMON_RULES.md](COMMON_RULES.md) sepenuhnya.

## Kebergantungan dan kuasa penerbitan

Mula selepas `app-foundation`, `app-learning` dan `app-cloud-game` mempunyai
handoff dan sudah dipush. Inspect SHA remote sebenar, READY marker, freeze
version/hash dan test evidence. Prompt 2/3 mesti berasaskan foundation yang
sama; jika kontrak berlainan, selesaikan secara eksplisit sebelum gabungan.
Gunakan worktree sendiri daripada `origin/app` terkini, bukan checkout chat lain.

Prompt ini membenarkan push `app-integration`, kemudian **fast-forward `app`**
selepas verification. Ia tidak membenarkan push main/main-digitalized/sharing,
Pages/mirror, store, backend migration, Auth/SMTP atau production deployment.

## Enam subagen awal

1. Audit graph/ancestry/provenance/dependency requests dan cadangan merge; lead
   sahaja menulis root dependencies/router/platform/global registry.
2. Coverage48 screens/16 EX states, navigation, Back dan consistency UI.
3. Learning/11model/warna/bridge/math/asset-offline serta parity checks.
4. Auth/classroom/CRUD/roles/deep links/negative authorization.
5. Solo save/outbox/actor switching/Duel lifecycle dan idempotency.
6. Android run/build/performance, screenshot sebenar dan release handoff.

Mulakan 6 subagen serentak selepas sempadan fail ditetapkan. Worker ujian/evidence mempunyai
fail sendiri; root menjadi integrator tunggal. Agen tambahan dibenarkan tanpa
had jumlah kumulatif yang ditetapkan, mengikut slot runtime sebenar.

## 1. Integrasi sumber dan shared files

Fetch refs terkini dan gabungkan foundation, learning dan cloud-game pada
worktree integrasi dengan mengekalkan ancestry, perubahan sah dan handoff.
Jangan mengganti seluruh tree dengan snapshot feature. Selesaikan conflicts
daripada behavior sebenar serta tests, bukan memilih ours/theirs secara pukal.

Terapkan `docs/integration_requests/*.json` satu demi satu: dependencies/lockfile,
feature route/DI/localisation registrations, migration registry/order, aset serta
Android deep-link/platform setup. Semua screens menggunakan theme, preferences,
auth/session owner, transaction storage, polling policy dan audio owner sama.
Jangan ship provider duplicate, queue listener kedua atau profile role klien.

Hubungkan `FormativeRecordWriter` sebenar kepada learning dan solo: local
reflection/history+queue satu transaction, guest kekal local, actor epoch lama
diabaikan. Daftarkan feature pada entry point production `lib/main.dart`;
preview yang compile sendiri sahaja tidak bermakna feature telah integrated.
Selesaikan compile errors dan platform requirements pada hasil gabungan.

Semak source lock/bank/module versions/hashes selepas merge. Generated bundle
app menggunakan source pinned, bukan runtime-fetch branch bergerak. Buang
spike/development wiring yang diganti; debug preview boleh kekal terasing tetapi
production tidak memaparkan development placeholder bagi feature yang dikira siap.
Jangan menimpa web/firmware atau arkib perancangan asal.

## 2. Matriks produk dan visual

Hasilkan `apps/geomath_flutter/docs/SCREEN_ACCEPTANCE.md` dan JSON sepadan:
semua ID01–48 sertaEX01–EX16 mesti mempunyai owner, route/state sebenar,
implementation path, status, test/screenshot evidence dan batas capability.
State/variant boleh berkongsi route; jangan mencipta dummy48 pageclasses.

Semak native shell dan UI seluruh app berdasarkan12 mockup boards serta
UX_CONTRACT. Antara flow yang mesti boleh dicapai:

- Guest→utama→Belajar→11model→makmal→rekod→reopen offline.
- Guest→solo→R1/R2→feedback/review→hasil/analisis→resume/leaderboard yang sah.
- Login/signup/confirmation/recovery→profil/security/sessions;
  provider Google/phone mengikut capability semasa, termasuk first profile.
- Guru→kelas/bilik/ahli/jemputan/monitor/hasil dan pelajar→PIN/attempt sama.
- Guest atau account→Duel→lobi→Sedia→match→disconnect/resync→result/forfeit.
- Tetapan/help/report serta CRUD conflict, pending sync, storage failure,
  expired session, revoked access dan missing backend capability.

Gunakan screenshots **hasil kod app** pada320/390/430dp dan tablet768dp,
BM/English, light/dark/kontras, teks100/125/150%, reduced motion. Ambil set yang
mewakili setiap feature dan state penting; audit semua48 IDs, tanpa mendakwa
gambar placeholder sebagai siap. Periksa keyboard, safe areas, TalkBack, target48dp,
tap alternatif, back/appbar/system gesture dan draft confirmation.

## 3. Ujian teknikal dan lifecycle

Jalankan suite yang relevan selepas gabungan, bukan menganggap PASS branch
berasingan membuktikan integrated app. Sekurang-kurangnya:

1. Offline fresh install/cold start/reopen: module/solo/audio bundled berfungsi;
   missing/corrupt asset tidak dilabel ready. Kelas/Duel mempunyai online-required.
2. Semua11 model; warna stable melalui rotate/fold/views; game assets neutral;
   kubus a=4→96/64; projection scale1:1/1:2/tolerance0.06 boundary; parser limits.
3. Solo JS parity dengan RNG/time eksplisit, R1/R2 single attempt, review timing,
   process death dan restore pada setiap stage; result/history idempotent.
4. Guest→A→B/logout semasa request/flush/bridge berjalan; tiada cross-owner data
   atau stale callback. DB write gagal/queue full/partial-invalid-missing ack,
   expiry/unavailable/429/Retry-After dan no silent eviction.
5. Deep links cold/warm/duplicate/reused/expired/recovery; role/membership,
   CRUD revisions/archive/closed/delete-empty/remove-member; read-only cache dan
   access revocation. Provider absent tidak memberikan fake success.
6. Dua klien Duel dengan lost ack/duplicate same-seq/reconnect/background/
   durable review/deadline/forfeit. Official scoring daripada server sahaja.

Hosted tests memerlukan staging/project yang sudah dibenarkan serta config
sebenar. Ketiadaannya direkodkan sebagai blocked/unverified, bukan diganti oleh
production deployment automatik. Local fixture PASS tidak membuktikan SMS,
Google consent, live Duel atau backend capacity.

## 4. Jalankan app dan hasil APK

Rekod Flutter/Dart/Java/Android SDK/device OS/WebView versions dan exact source.
Dari `apps/geomath_flutter/`, jalankan command sebenar:

```text
flutter --version
flutter doctor -v
flutter pub get
dart format --output=none --set-exit-if-changed lib test integration_test
flutter analyze
flutter test
flutter devices
flutter test integration_test -d <device-id>
flutter run -d <device-id>
flutter build apk --debug
```

`<device-id>` diganti device yang benar-benar disenaraikan. Sesuaikan test target
kepada fail runner yang wujud. Jika toolchain tersedia, bina release APK dengan
config yang sah dan `flutter build apk --release`; rekod mode/signing sebenar.
Jangan mengaku production-signed/store-ready daripada debug keystore. Jangan
commit keystore, credentials, local.properties, `.dart_tool`, build cache atau
APK binary ke Git. Sediakan APK sebagai deliverable berasingan yang disimpan
secara persisten mengikut environment, dengan SHA256 dan pautan fail sebenar.

Jika SDK/emulator belum tersedia, selesaikan pemasangan rutin apabila boleh.
Jika terhalang, siapkan kerja bebas, lapor command yang blocked dan jangan
mendakwa app telah dijalankan. Bezakan emulator, telefon fizikal, APK build,
hosted backend dan iOS. iOS/store bukan syarat tersembunyi tugasan Android ini.

Tulis `apps/geomath_flutter/README.md` dan `docs/RUN_ANDROID.md` yang menerangkan:
prerequisites sebenar, clone/branch/folder, Flutter setup/pub get, config public,
emulator/USB device, command run/install/build, offline behavior, missing backend
capability serta cara mengambil log yang tidak mengandungi secret. Pengguna
boleh copy command untuk menjalankan app tanpa meneka folder atau entrypoint.

## 5. Serahan dan push akhir

Hasilkan status jujur `ready`, `partial` atau `blocked` bagi setiap acceptance
item. Jangan melaporkan app lengkap48 paparan jika feature masih placeholder
atau cloud dependency belum dibuktikan. Milestone offline boleh diterbitkan
dengan status cloud yang jelas; senaraikan baki sebenar dan bukti yang diperlukan.

Lengkapkan `docs/handoffs/app-integration/LATEST.md`: refs/SHA sumber, contract
version, tests/exit status, screenshots, APK hashes/config requirements, limits,
integration decisions dan next steps. Kemas kini APP.md daripada perancangan
kepada status implementasi yang **benar-benar dicapai**, tanpa mengubah sejarah
arkib `docs/geomath-app/`. Jalankan root version consistency dan diff checks;
app version berasingan dan firmware tidak dibump.

Commit dan push `app-integration`, sahkan remote head/tree. Fetch `app` sekali
lagi; jika ia bergerak, gabungkan perubahan sah pada worktree integrasi dan
ulang semakan terkesan, push semula `app-integration` dan sahkan SHA baharu.
Selepas semua semakan berkaitan lulus, fast-forward
`app` kepada commit integrated yang sama melalui push biasa tanpa force.
Jika gate kritikal gagal, push hanya branch integrasi berstatus belum lulus
dan selesaikan blocker sebelum memajukan app; jangan overwrite ref lain.

Jawapan akhir memberikan link GitHub `app`, app version + actual SHA, cara run
ringkas, screenshot dan APK yang benar-benar wujud, tests yang benar-benar
dijalankan serta baki hosted/telefon jika ada. Tiada deployment luar skop.
