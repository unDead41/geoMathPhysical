# GeoMath Flutter — app-cloud-game

**Status: BLOCKED_FOUNDATION — audit sumber sahaja; feature Flutter belum dibina.**

Arahan pelaksanaan: `docs/geomath-app-prompts/03-flutter-cloud-game.md` dan
`COMMON_RULES.md` pada `app` commit
`38f061af963256528d5060ff076bae9ee05eafc3`. Kedua-duanya menghendaki
`app-foundation` READY sebelum implementasi; jika belum READY, audit bebas
dibenarkan tanpa membina scaffold pendua.

## Gate dan provenance

| Ref | SHA yang disahkan melalui GitHub |
|---|---|
| `app` | `38f061af963256528d5060ff076bae9ee05eafc3` |
| `main` | `25836eb1a6f24459aace8a3980ae880a13e3b488` · firmware v2.0.2 |
| `main-digitalized` | `37bc2cd262cc0a54e8ee31339ea37471c1ecfda5` · Digital 2.9.1 |
| `digitalized-utility-auth-providers` | `28ba888ccaae12f842dd4abae618a51cb60cd1f2` |
| `app-foundation` | HTTP 404 pada ref dan canonical READY lookup terakhir |
| `app-learning` | `5ab7102193e070d853c1622f2ae038b2b37a833d` · audit sahaja, `WAITING_FOUNDATION_READY` |

Foundation SHA, contract version/hash dan asset hashes belum tersedia.
SHA foundation yang sama dengan Belajar **belum boleh dipilih atau disahkan**.
Branch Belajar muncul semasa audit ini berjalan; handoff dan integration request
terkininya dibaca pada SHA di atas, kedua-duanya masih mempunyai foundation SHA
null dan implementationStarted=false. Rujukan worker kepada dua ref yang tiada
ialah semakan awal; readback akhir ini menggantikannya untuk status semasa.
Lokasi marker yang diperlukan ialah
`apps/geomath_flutter/docs/FOUNDATION_READY.json`, bersama
`docs/FOUNDATION_CONTRACT.md` dan handoff foundation pada commit yang sama.
`SOURCE_AUDIT.json` menyimpan bukti gate dan perbandingan blob canonical.

Worktree lead: `/workspace/scratch/7395917c0f68/worktrees/app-cloud-game`;
enam worker menggunakan worktree dan branch private berasingan, serentak.
Tree asas Git dipulihkan melalui API dan hash commit/tree disahkan tepat;
397 daripada 1130 blob dimaterialisasikan dalam sparse checkout. Mockup PNG
tidak dimuatkan dan tiada semakan visual atau screenshot app didakwa.
Perubahan audit hanya dalam subfolder handoff dan integration request branch ini.

## Hasil audit

| Pemilik | Hasil |
|---|---|
| Auth/profil/sesi | [Kontrak auth dan provider](audit/01-auth.md), sempadan actor, recovery/callback dan penggunaan protected session |
| Kelas/CRUD | [Payload dan authorization](audit/02-classroom.md), PIN, revision, UUID jemputan, attempt dan sejarah |
| Solo | [Enjin dan persistence](audit/03-solo.md), [trace JS sebenar](audit/03-solo-trace.json) dengan draw RNG dan jam eksplisit |
| Duel | [Protocol 2](audit/04-duel.md), projection, pending sequence, review, lifecycle dan deadline pelayan |
| Sync | [Rekod dan outbox](audit/05-sync.md), transaksi, pengasingan owner, ack dan polisi retry |
| UI/penerimaan | [Pelan penerimaan](audit/06-acceptance.md), [29 paparan + 16 EX states](audit/06-screen-matrix.json) |

Semua paparan native ditanda `BLOCKED_FOUNDATION`, `implemented: false`.
EX11 dipaparkan oleh learning apabila port writer gagal; cloud-game memiliki
kontrak kegagalan persistence. Tiada class/widget placeholder dikira siap.

Perbandingan app dengan Digital terkini mendapati bank, solo-save, gateway
kelas, Duel dan modul offline yang diaudit mempunyai blob yang sama.
`core.mjs` berubah pada literal versi 2.9.0→2.9.1 sahaja; active-sessions
mempunyai perubahan persembahan. Pin foundation tetap mesti disahkan semula.

Perkara yang mesti ditangani semasa adaptasi native:

- Login lama yang lambat tidak boleh mengambil alih akaun baharu; mutation
  perlu diserialkan dan response terikat epoch/identiti operasi. Audit auth
  mereproduksi risiko adoption pada source yang dipin.
- Gateway signup sekarang menetapkan URL confirmation web. Native memerlukan
  kontrak redirect yang dibenarkan atau handoff web-ke-app yang disahkan;
  perubahan manifest sahaja tidak menukar pautan email.
- RPC kelas ialah `geo_action(action,payload)`. Revision hanya pada mutasi
  management yang disenaraikan; batal/tolak jemputan menerima `invite_id`
  sahaja. Unknown outcome memerlukan refresh/reconcile sebelum retry.
- RPC sync ialah `geo_offline_sync(action,payload)`: `push` dengan `{events}`,
  `history` dengan `{}`. Rekod tempatan dan event pending mesti ditulis dalam
  satu transaksi database; listener selepas save tidak memenuhi syarat ini.
- Native retry perlu mempunyai had, menghormati `Retry-After`, mengekalkan
  permanent failure sebagai berhenti, dan membatalkan hasil lifecycle lama.
  Probe source menunjukkan jurang yang disenaraikan dalam audit sync.
- Token capability Duel serta pending payload/seq perlu protected dan durable;
  fallback memori web tidak membuktikan simpanan native yang dilindungi.
- Trace Solo ialah `PROVISIONAL_AUDIT_ONLY`; ia bukan eksport foundation atau
  bukti parity Dart. Semua draw/clock dan identity bank perlu dipadankan semula.

## Pengesahan sebenar

Ujian yang dijalankan ialah suite sumber JavaScript/SQL setempat. Perincian
command, exit status dan skop berada dalam setiap audit; suite bertindih tidak
dijumlahkan sebagai bilangan ujian unik. Ringkasan dan hash evidence direkodkan
dalam `VERIFICATION.json` selepas semakan lead.

Root `python tools/check_version.py` lulus untuk label firmware **v1.1.3 yang
diwarisi oleh branch app**. Ia tidak mengubah atau menerbitkan firmware main
v2.0.2. `git diff --check` dan semakan skop digunakan sebelum penerbitan audit.

Flutter/Dart/adb tidak ditemui pada PATH lead semasa audit. `flutter analyze`,
formatter Dart, unit/widget/database native, Android integration, preview
`lib/dev/cloud_game_main.dart`, APK dan screenshot **belum dijalankan/dibina**.
Tiada dakwaan Google consent, SMS delivery, hosted migration, Auth/Realtime,
Duel dua klien staging atau kapasiti 5,000 pengguna daripada suite sumber.

## Sambung selepas READY

1. Baca marker, kontrak serta handoff foundation yang sebenar. Sahkan hashes
   dan bukti analyze/test/debug-build/device smoke; nama READY sahaja tidak cukup.
2. Tetapkan **SHA penuh foundation yang sama dengan app-learning** dan catat
   dalam kedua-dua handoff. Jangan memilih moving HEAD secara berasingan.
3. Gabungkan commit foundation itu ke branch audit ini melalui merge biasa
   tanpa force, kemudian sediakan worktree feature daripada SHA yang dipersetujui.
   Branch ini sekarang berasaskan ref arahan untuk audit sahaja, bukan asas
   implementasi native yang telah diluluskan.
4. Gunakan DTO, ports, dependency lock dan contribution APIs yang dibekukan;
   bina auth/profile/classroom/solo/duel/sync serta preview native. Lengkapkan
   [integration request](../../integration_requests/app-cloud-game.json) dengan
   registration/migration/l10n/platform sebenar.
5. Jalankan ujian wajib Prompt 3 dan
   `flutter build apk --debug -t lib/dev/cloud_game_main.dart`, ambil screenshot
   Android BM/English/light/dark/150% dan asingkan blocker hosted.
6. Kemas kini matriks kepada status yang dibuktikan, push hanya `app-cloud-game`
   tanpa force dan baca semula head remote. Jangan menerbitkan branch/app lain.

Tiada command run app tersedia pada handoff ini kerana pakej Flutter foundation
belum wujud. Langkah seterusnya ialah memperoleh hasil READY foundation yang
dikehendaki oleh arahan asal; ia bukan permintaan kelulusan pengguna baharu.
