# Prompt 3 — Akaun, Kelas, Permainan dan Sync Flutter

Ini arahan implementasi hingga app feature berfungsi, diuji dan dipush.
Repo: `https://github.com/unDead41/geodecoder`. Ref arahan: `app`.
Branch kerja: **`app-cloud-game`**. Baca [COMMON_RULES.md](COMMON_RULES.md) sepenuhnya.

## Asas dan pemilikan

Mula selepas `origin/app-foundation` READY; baca kontrak/handoff dan sahkan gate.
Gunakan **SHA foundation yang sama dengan Prompt 2** dalam worktree sendiri.
Jika belum READY, audit source bebas dan lapor dependency tanpa scaffold pendua.

Miliki folder app `lib/features/auth/**`, `profile/**`, `classroom/**`,
`solo/**`, `duel/**`, `sync/**`; feature tests; `lib/dev/cloud_game_main.dart`;
feature-local migration/localisation contributions; integration request/handoff.
Concrete AuthRepository/gateway/record writer/outbox implementation berada dalam
feature data folders dan di-inject melalui kontrak foundation.
Jangan ubah root pubspec/router/composition/lib/core/schema order/shared theme,
`digital/**`, platform manifests atau folder learning semasa kerja selari.

Skop paparan **02–03,05–24,42–48** berjumlah29. Miliki juga **EX01–EX16**,
dengan EX11 dipaparkan oleh learning apabila port persistence mengembalikan
kegagalan. Foundation memiliki tetapan/bantuan01/04/37–40; guna semula feature itu.

## Enam subagen awal

1. Auth, protected session adoption, provider/recovery/deep links/profile completion.
2. Guru/pelajar, kelas/bilik/PIN, membership/invites/CRUD dan authorization.
3. Native solo engine, JS parity, save/resume/analysis/leaderboard.
4. Duel protocol2, transport, projection, pending command dan lifecycle.
5. SQLite record writer/outbox, ownership/reconciliation, retry/cache/network policy.
6. Shared-style screen assembly, preview, negative tests, visual dan semakan bebas.

Mulakan 6 subagen serentak selepas menetapkan fail. Setiap worker folder sendiri;
shared adapters di bawah worker yang ditetapkan, lead mengintegrasikan commit.
Tambah subagen mengikut keperluan tanpa had jumlah kumulatif yang ditetapkan,
tertakluk slot aktif runtime. Jangan enam agen mengubah fail sama.

## Audit canonical dahulu

Baca SOR G01–G06/D01–D03/C01–C05/O01–O05/N01–N03, kontrak backend/offline dan
source `digital/dist/core.mjs`, `questions.mjs`, `solo-save.mjs`, `cloud.mjs`,
`duel.mjs`, `duel-state.mjs`, `offline-sync.mjs`, `offline-db.mjs`,
`offline-runtime.mjs`, `offline-records.mjs`, `account-security.mjs`,
`active-sessions.mjs`; `digital/docs/DUEL_V2.md`, `OFFLINE_SYNC.md`,
classroom-CRUD API, integration-sync README dan SQL_ORDER.

Web offline/CRUD/scaling sudah dalam source integrasi yang diperiksa semasa
penyediaan prompt. Adapt behavior native; jangan implement web offline sekali lagi.
Hosted activation ialah dependency berasingan daripada source Git.

Audit juga head terkini **`digitalized-utility-auth-providers`** dan fail
`digital/docs/AUTH_PROVIDERS.md`, handoff provider serta migration yang berkaitan.
Ketika prompt ditulis, source Google/phone/profile completion berada pada branch
itu, belum asas app. Rekod SHA yang digunakan; jangan merge keseluruhan branch
atau menimpa kerja auth chat lain secara membuta tuli.

## 1. Auth, profil dan sesi

Implement email/username login, signup, confirmation, recovery/reset password,
profil draft/save/discard, keselamatan dan sesi mengikut gateway canonical.
Username3–24, nama2–60, password10–128 jika validator semasa masih menetapkannya.
Role daripada server, bukan metadata/form route sahaja.

Guna existing GeoMath backend dan config public yang sah. Guest local tetap
boleh digunakan jika config cloud tiada. Tiada service-role atau client secret.
Session persistence protected dan satu owner; mutasi login/logout/provider
serialized. Semua async terikat user/session/epoch/scope, termasuk response
refresh/callback yang tiba selepas account switch.

Adapt Google/phone hanya mengikut current SDK/native callback dan capability
sebenar. SMS source semasa menggunakan OTP6 digit dan resend cooldown60s;
email confirmation/recovery menggunakan pautan. Jangan menggunakan email OTP
rekaan bagi menggantikan aliran source. OTP transient, tidak masuk SQLite/log.
Native deep link diuji bagi cold/warm start, expired/reused/duplicate callback
serta recovery session; raw route tidak memberikan hak menukar password.

Candidate `geo_complete_profile(username,display_name,role)` memerlukan identiti
provider yang disahkan dan tidak menukar role profil sedia ada; semak kontrak
terkini dan gunakan backend gate. Jika provider/RPC belum aktif, paparkan
unavailable dengan tindakan yang sesuai. Jangan meminta/menghantar SMS sebenar,
mengubah OAuth/SMTP/secrets atau menjalankan hosted migration sebagai kesan
sampingan implementasi ini. Sediakan keperluan native callback/platform kepada
integrator, termasuk allowlist/config yang masih diperlukan.

## 2. Kelas, bilik dan CRUD

Siapkan dashboard guru/pelajar, cipta/sertai kelas dan bilik, ahli/jemputan,
monitor, keputusan, resume attempt yang sama dan validation PIN.
PIN kelas/bilik mengikut source (snapshot24h); bilik closed tidak dibuka semula.
Kelas sentiasa online dan server-authoritative; satu attempt mengikut kontrak.

CRUD capability `classroom_crud:1` dan integer `expected_revision`:
rename kelas/bilik, archive/restore, delete-empty, remove member,
cancel/decline invitation. Preserve attempt/history; restore tidak menghidupkan
kod lama atau membuka closed room. UUID invitation setiap issuance dipelihara.
`expected_revision` hanya bagi rename/archive/restore/delete/remove-member;
`cancel_invite` dan `decline_invite` menerima `invite_id` sahaja. Ikut payload
source tepat kerana field tambahan ditolak; jangan menambah revision pada invite.
Conflict mengekalkan draf dan refresh eksplisit. Mutasi timeout dengan unknown
outcome perlu refresh/reconcile sebelum retry, bukan overwrite atau replay liar.
Membership/permission diperiksa server; access denial membersihkan cache/subscription
yang berkenaan. Test dua actor/dua kelas, bukan owner happy-path sahaja.

## 3. Solo native dengan parity

Gunakan bank eksport foundation dan native Dart engine yang diuji terhadap
golden trace **enjin JS sebenar**, dengan RNG draw stream/clock eksplisit.
Jangan menganggap `Random(seed)` Dart sama dengan RNG JavaScript.

- Lima shapes: cube/cuboid/pyramid/cylinder/**cone**. Kuiz10=2 setiap bentuk;
  latihan15=semua15=3 setiap bentuk, tiada ulang dalam pusingan.
- Pilih kad belum scan/attempt. R1 solid dahulu, kemudian R2 net. Salah mana-mana
  stage atau langkau memberi0 dan menamatkan soalan; pasangan lengkap betul+1.
  R2 yang belum dicuba ialah notAttempted, bukannya salah.
- Hint percuma dicatat sekali setiap soalan. Kekalkan BLINK_MS900,
  WRONG_MS1200, REVIEW_MS1800. WRONG_MS bukan auto-next; betul advance selepas
  feedback900, salah/langkau menunggu Teruskan selepas minimum review1800.
- Solo clock berhenti ketika dialog/background; checkpoint menyimpan baki
  feedback/review, bukan deadline wall-clock yang terus habis semasa ditutup.
- Satu slot per guest/akaun/peranti, confirm sebelum ganti; validate actor,
  schema, ruleset dan exact bank identity. Corrupt/incompatible ada recovery UI.
- Keputusan/analysis, latihan ID salah/langkau dan papan skor kuiz local max50.
  Latihan/review/kelas/Duel tidak masuk leaderboard kuiz; hasil asal tidak diubah.

Gunakan `GeometryCardProvider` neutral foundation; tiada dependency kepada
learning branch yang belum siap. Completed history disimpan melalui writer
bersama; duplicate finalization tidak menghasilkan dua rekod/event.

## 4. Duel server-authoritative

Protocol2, dua pemain,10 soalan bersama; countdown3s selepas kedua-duanya Sedia.
PIN lobi10min, match15min mengikut source. Tetamu boleh Duel melalui capability
token berasingan daripada Supabase login; simpan protected, bukan WebView/outbox.

Gunakan wire contract sebenar: protocol/room/token/seq/questionIndex apabila
berkenaan. Pending command yang unknown outcome diulang dengan **payload dan
seq sama**. Jangan generate seq baharu untuk retry. UI memakan validated server
projection; local solo engine tidak scan/skip/advance atau mengubah skor Duel.

Review durable: betul menghantar `advance` automatik selepas gate pelayan900ms;
salah/langkau melalui Teruskan selepas minimum1800ms. `advance` untuk review
soalan terakhir masih dibenarkan apabila room complete. Server clock
terus semasa dialog/background/disconnect. Foreground/resume menyelaraskan
pending/projection; satu polling owner dan single-flight refresh. Abaikan response
room/epoch lama, hormati Retry-After dan berhenti apabila protocol tidak serasi.

`currentQuestion` aktif tidak mendedahkan shape, jawapan atau ID bank asal.
Data lawan hanya ringkasan tanpa token, seq, answers, attempts atau hint.
Jangan membawa jawapan solo ke UI Duel aktif. Keluar memerlukan forfeit confirmation; close
screen bukan pause. Pending command live Duel kekal mekanisme tersendiri,
bukan outbox formative offline.

## 5. Data native dan offline sync

Implement `FormativeRecordWriter` signed-in yang juga dipakai learning selepas
integrasi. Refleksi/history dan event pending ditulis **dalam satu transaction
database**. Jangan enqueue melalui listener selepas local save.

- Queue owner-partitioned; guest tidak auto-upload atau dipindahkan kepada akaun.
  Actor A tidak dihantar menggunakan token B selepas await.
- Hanya refleksi net/volume/area/composite dan completed solo formative history.
  Tiada auth/CRUD/PIN/kelas/Duel/support action dalam queue, tiada official score
  daripada payload client. Content version/ruleset/schema dan validation dikekalkan.
- Max20 per batch dan2000 pending/owner; immutable ID+payload, idempotency dan
  individual ack. Delete hanya ID diterima; partial/missing/invalid ack mengekalkan
  pending. Same ID berlainan content ditolak; queue full tidak silent-evict.
- Expired session→needs-auth; missing RPC→unavailable+pending kekal;
  transient bounded retry/backoff/jitter/Retry-After; validation/permanent failure
  berhenti auto-retry. Foreground/reopen ialah trigger utama; tiada janji selepas
  force-stop. Connectivity signal bukan bukti server menerima event.
- Request coalescing, short cache, cancellation/stale response guard dan bounded
  polling; revoked access dan conflict tidak ditutup oleh cached success.

Gunakan feature-local migration declarations dalam namespace yang foundation
tempah. Jangan mengubah migration history/deployment stream web atau menjalankan
`schema.sql` lama ke backend hosted.

## Ujian, preview dan serahan

Sediakan feature contributions dan preview `lib/dev/cloud_game_main.dart` yang
menggunakan real repository/controller. Jalankan preview pada Android; ubah
config melalui mekanisme foundation sahaja. Mock transport khusus ujian mesti
berlabel dan tidak menjadi implementation production.

Ujian wajib merangkumi wrongR1/wrongR2/prematureR2/double-tap/hint/skip/+1,
parity JS→Dart, kill/reopen pada kedua stage/feedback/review, actor isolation,
corrupt bank/schema dan duplicate result; Duel lost ack/duplicate seq/reconnect/
durable review/server deadline/forfeit/429/protocol mismatch; auth stale callback/
logout/expired/reused recovery/provider unavailable; CRUD non-owner/revision/
closed/archive/remove-member/stale invitation; atomic write failure/DB reopen/
queue full/partial-invalid-missing ack/needs-auth/content mismatch.

Jalankan analyze, formatter, meaningful feature unit/widget/database tests,
Android integration tests dan
`flutter build apk --debug -t lib/dev/cloud_game_main.dart`, serta screenshot BM/English/light/dark/
teks150%. Hosted auth/CRUD/sync serta Duel dua klien staging diuji hanya apabila
persekitaran sah tersedia; laporkan blocker secara berasingan daripada local PASS.
Jangan claim Google consent/SMS delivery/5000 pengguna daripada mock atau APK build.

Isi `docs/integration_requests/app-cloud-game.json`, termasuk feature registrations,
platform deep-link/permission requests, dependencies, l10n, schema contributions,
capability/config needs. Kemas kini matriks29 paparan dan16 EX states. Lengkapkan
`docs/handoffs/app-cloud-game/LATEST.md`, foundation SHA/hashes, cara run,
commands/evidence dan batas hosted. Commit dan push **hanya `app-cloud-game`**,
sahkan remote head. Prompt 4 akan integrasikan bersama learning ke `app`.
