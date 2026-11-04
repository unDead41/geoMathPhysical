# Kontrak data, akaun, kelas dan Duel

Status berbeza antara baseline dan candidate. Semua nama endpoint/payload di
bawah datang daripada sumber yang dipin dalam SOURCES_AND_STATUS. Semak semula
capability dan deployment sebenar ketika mula; jangan menganggap SQL dalam Git
telah dipasang. Tiada database baharu diperlukan hanya untuk menukar UI ke Flutter.

## Pemilik dan identiti

Supabase Auth mengendalikan sesi; gateway GeoDecoder mengekalkan semakan
username, role dan ownership sebenar. Native app tidak menggantikan aliran
username dengan signup terus yang memintas aturan gateway. Role bukan
metadata boleh sunting yang dipercayai klien.

Gunakan binding `(userId, sessionId, epoch, scope)` bagi operasi. Token refresh
sah dalam sesi sama tidak dianggap pertukaran pengguna. Ambil credential semasa
secara terkawal ketika request bermula; request A tidak boleh menggunakan token B
selepas await. Setelah actor/room bertukar, batalkan/abaikan respons lewat.

| Kontrak baseline | Penggunaan |
|---|---|
| Edge `geodecoder-auth` | Tindakan auth/username canonical; native SDK turut mengendalikan sesi/callback melalui adapter yang disahkan |
| RPC `geo_action(action,payload)` | Kelas, bilik, jemputan, heartbeat dan event permainan kelas |
| RPC `geo_module_progress(action,payload)` | Rekod latihan modul; owner disahkan pelayan |
| RPC `geo_security_sessions` | Senarai sesi sebenar; tiada single-device revoke rekaan |
| Edge `geodecoder-duel` | Duel protocol 2; token capability dan projection pelayan |
| RPC candidate `geo_offline_sync` | Rekod formatif tertangguh; hanya selepas capability/deployment disahkan |

Nama method Dart dalam pelan ialah **antara muka app baharu**, bukan nama RPC
baharu. Adapter mesti mengekalkan exact wire format sumber, bukan meneka
parameter daripada jadual ringkasan ini.

## Kelas baseline

Tindakan source termasuk `snapshot`, `create_class`, `invite`, `accept_invite`,
`create_room`, `rotate_pin`, `join_pin`, `join_room`, `set_room`, `start_attempt`
dan `heartbeat`; projection permainan kelas ialah kontrak lain yang mesti
diambil daripada gateway sebenar ketika memindahkan engine.

- PIN kelas menyertai kelas. PIN bilik menyertai kelas dan bilik tersebut.
- Guru hanya mengurus kelas/bilik sendiri. Student hanya melihat skop semasa
  yang dibenarkan. Current membership disemak semula, termasuk Realtime.
- Status bilik: open→playing→closed; closed terminal. Waiting players tidak
  dipaparkan sebagai telah menjawab atau mendapat markah kosong yang final.
- Satu attempt/student/room, dipulihkan daripada server selepas reopen.
- Ranking: skor tertinggi, kemudian answering elapsed paling singkat; masa
  waiting/review tidak dicampur sebagai masa menjawab.
- Pending command menggunakan ID tindakan sama; duplicate tidak menambah skor.
- Baseline dashboard15 s/heartbeat20 s ialah rekod sumber, bukan arahan untuk
  membuka satu timer pada setiap widget. Candidate scaling mempunyai policy
  bersama yang perlu digunakan selepas integrasi.

## Candidate classroom CRUD — tambahan kepada 48 mockup

Snapshot mengiklankan `classroom_crud:1`. Tanpa capability ini, kawalan baharu
tidak boleh diaktifkan. Signature payload yang disahkan:

| Action | Payload tepat |
|---|---|
| rename_class | class_id, expected_revision, name |
| rename_room | room_id, expected_revision, name |
| archive_class / restore_class | class_id, expected_revision |
| archive_room / restore_room | room_id, expected_revision |
| delete_class | class_id, expected_revision |
| delete_room | room_id, expected_revision |
| remove_member | class_id, user_id, expected_revision |
| cancel_invite | invite_id |
| decline_invite | invite_id |

Revision ialah integer JSON bukan negatif. Nama trimmed2–60 Unicode characters
mengikut server; unknown fields dan supplied owner IDs ditolak. Native Dart
mesti menyamakan validator dengan server, termasuk emoji/surrogate pair.

Archive memelihara rekod, membatalkan PIN skop itu dan menghalang aktiviti
baharu. Restore tidak membuka semula closed room atau menjana PIN lama.
Archive kelas/bilik atau remove member dihalang ketika skop berkaitan sedang
bermain. Delete hanya bagi kelas tanpa ahli/bilik/jemputan atau bilik tanpa
ahli/attempt/progress serta tidak playing. Pelayan ialah keputusan akhir.

Remove member mengekalkan sejarah attempt/answers/scores/reflections. Ia bukan
ban akaun: PIN sah atau jemputan baharu boleh memberi akses semula kepada
attempt asal. Guru boleh rotate PIN apabila relevan.

Setiap issuance jemputan mendapat UUID baharu. Dialog lama tidak membatalkan,
menerima atau menolak jemputan baharu. `conflict` memerlukan refresh eksplisit
sambil mengekalkan draf. Selepas network timeout, refresh dahulu sebelum
mengulang operasi berbahaya yang hasilnya tidak diketahui.

## Duel

Duel tetamu kekal disokong mengikut transport canonical. Jangan memaksa
login akaun hanya kerana native app menggunakan SDK Auth. Player capability
token ialah credential Duel tersendiri; simpan secara terlindung dan ikut
header/config gateway yang telah diaudit. Jangan menukar verify_jwt atau
authorization backend untuk memintas ralat integrasi app.

Setiap POST mengekalkan `protocol:2`, token pemain dan payload action sebenar.
`advance` membawa action, roomId, token, seq dan questionIndex yang telah
disemak. Jangan mengubah sequence ketika retry atau menukar payload di bawah
ID/seq sama. Aktif question projection tidak membawa jawapan/ID bank dalaman.
Data lawan ialah ringkasan sahaja, bukan token, hint atau senarai jawapan.

Betul: advance selepas900 ms yang diluluskan pelayan. Salah/langkau: durable
review sekurang-kurangnya1800 ms dan Teruskan. Reload memulihkan fasa/baki yang
sama. PIN 10 min, match 15 min dan kira detik3 s ialah kontrak source. Masa Duel
terus berjalan ketika OS background atau terputus sambungan. Forfeit dimuktamadkan
pelayan; local timeout tidak menulis skor final sesuka hati.

Selepas reconnect, hantar semula pending command **yang sama** jika kontrak
membenarkannya, kemudian reconcile snapshot. Tiada outbox offline live actions.
Status protocol/backend-update tidak dianggap network error yang diulang tanpa
had. Hormati Retry-After, terminal stop dan policy candidate scaling.

## Auth, callback dan rahsia

Pengesahan e-mel dan pemulihan menggunakan redirect/deep link yang disahkan,
bukan6 digit OTP rekaan. App perlu allowlist redirect di native config dan
backend apabila deployment diberi kebenaran. Flow callback expired/reused,
cold start dan app belum login diuji sebelum release.

Simpan sesi melalui SessionStore terlindung dan adapter persistence SDK yang
disemak. SQLite perniagaan/outbox, WebView, log dan laporan tidak mengandungi
password/access token/refresh token. Publishable key bukan authorization role;
service-role/secret key tidak dibundel dalam app. Private gateway dan RLS tetap
menghadkan actor, ownership dan current membership walaupun UI disunting.

## Fail berkaitan untuk audit kickoff

`digital/dist/cloud.mjs`, `account-security.mjs`, `active-sessions.mjs`,
`duel.mjs`, `duel-state.mjs`, `module-progress.mjs`; gateway dan migration
candidate yang dipin. Jangan replay historical schema.sql/dispatcher lama di
atas migration baharu. Semak migration history dan routine guards sebelum
sebarang hosted rollout yang dibenarkan.
