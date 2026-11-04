# Offline dan penyelarasan tertangguh untuk app

Rujukan wajib: O01–O05 dalam SOR dan candidate web
`digitalized-utility-offline-sync`. Ini spesifikasi adaptasi native, bukan
dakwaan IndexedDB/service worker sudah berjalan dalam Flutter.

## Apa yang boleh berlaku tanpa Internet

| Data/tindakan | Offline | Apabila online |
|---|---|---|
| Modul 11 model, nota, makmal, studio, kiraan | Aset lengkap dalam binary/content pack | Tidak perlu panggilan pelayan untuk mengira |
| Kuiz/latihan/review solo | Enjin dan bank dibundel; checkpoint setempat | Hanya sejarah lengkap berakaun yang dibenarkan dihantar |
| Empat refleksi modul | Local save per owner | Candidate RPC menyelaras secara idempotent |
| Guest | Setempat sahaja | Tiada silent transfer ke akaun |
| Dashboard/keputusan cached | Read-only berlabel jika polisi membenarkan | Revalidate membership/session; bersihkan jika akses ditarik |
| Signup/login/password/CRUD/PIN | Memerlukan rangkaian | Hantar hanya melalui tindakan aktif yang sah |
| Kelas/Duel | Tiada permainan offline | Ambil status pelayan dan pulih pending live command mengikut protokol |
| Laporan masalah | Draf, preview, salin, TXT | Kekal tiada auto-send |

PWA web memerlukan cache aset dahulu. Native app membundel modul/audio yang
diperlukan dan memeriksa manifest semasa install/start. Jangan mensyaratkan
service worker untuk membaca aset tempatan dalam WebView. Optional content
download kemudian mesti atomik dan tidak merosakkan aktiviti berjalan.

## Local database cadangan

| Entiti | Kunci / tujuan |
|---|---|
| solo_checkpoints | owner + slot; snapshot/ruleset/bank hash/schema |
| quiz_scores | owner + attempt_id; maksimum 50 rekod kuiz setempat |
| module_reflections | owner + activity; canonical validated record |
| practice_history | owner + attempt_id; keputusan formatif lengkap |
| outbox | owner + event_id; immutable canonical payload + pending metadata |
| cached_snapshots | owner + scope + cache schema + updated_at; read-only |

SQLite transaction menyimpan rekod dan outbox bersama. Credential berada di
SessionStore berasingan, bukan jadual di atas. Draf studio mempunyai lifecycle
sendiri; jangan menamakannya cloud-saved hanya kerana refleksi sudah synced.

## Wire event candidate yang dikekalkan

Local event: `{owner,id,kind,content_version:1,payload}`. Owner ialah UUID akaun;
ID dibenarkan 1–160 aksara `[A-Za-z0-9:_.-]`; kind `module` atau `solo`.
Request keluar membuang `owner`; server menerbitkannya daripada sesi Auth.
Ambil bentuk request action RPC tepat daripada `cloud.mjs`/SQL semasa integrasi.

Module payload: activity net/volume/area/composite; stage
prediction/experiment/check/explanation; prediction≤ 240, result≤ 600,
explanation≤ 600; trim/validation canonical. Completed hanya pada explanation
dengan penerangan yang sah. Stage/result/completed tidak merosot ketika merge.

Solo payload: attempt_id, mode quiz/practice/review, ruleset, score, total,
mistakes, hints, skipped, elapsed_ms. Ruleset `single-attempt-v1`; quiz total 10,
practice 15, review 1–15; score+mistakes+skipped=total; elapsed 0–604800000 ms.
Ini rekod latihan tidak disahkan, bukan markah pertandingan atau kelas.

## Algoritma penghantaran

1. Sahkan actor dan content sebelum menyimpan. Jika storan gagal, kekalkan event
   dalam memory sepanjang sesi dan tunjuk amaran; jangan melabel durable save.
2. Ambil maksimum 20 pending owner semasa. Maksimum 2000 event pending/owner;
   apabila penuh, beri kegagalan jelas dan jangan buang event lama senyap.
3. Ikat send pada user/session/epoch dan gunakan satu flush flight sahaja.
4. Server deduplicate ID dan tolak payload berlainan di bawah ID sama.
5. Validasi `accepted` sebagai subset ID batch tanpa duplikasi. Delete/ack hanya
   ID yang benar-benar diterima, dalam transaction owner yang betul.
6. Ack hilang atau response tidak sah: simpan event dan ulang ID sama.
   Partial ack: keluarkan accepted sahaja, kekalkan yang lain.
7. Retry transient error dengan exponential backoff+jitter berhad; patuhi
   Retry-After. Auth expired, validation failure dan capability tiada menghentikan
   auto-retry sehingga keadaan berkaitan diselesaikan.
8. Abaikan response selepas actor/epoch berubah. App foreground/reopen atau
   Cuba semula boleh mencetus flush; tiada janji kerja selepas force-stop OS.

State UI: local, pending, syncing, synced, needs-auth, unavailable, blocked,
storage-failed. `synced` memerlukan ack sah dan tiada pending/unsaved event,
bukan sekadar network connectivity menunjukkan Wi-Fi.

## Lifecycle dan pemulihan

Remembered owner membantu memilih ruang setempat ketika offline; ia bukan
bukti authorization server. Explicit logout dan pertukaran akaun ialah sempadan
yang mengatasi remembered identity. Guest/A/B tidak berkongsi cache, draf atau
outbox. Tidak auto-upload rekod A menggunakan sesi B.

Checkpoint solo dipulih melalui replay/snapshot validation canonical, bukan
percaya score JSON. Schema/ruleset/bank mismatch memberikan pilihan jelas.
Auto checkpoint baseline 5 s membantu masa aktif; proses dibunuh OS boleh hilang
perubahan selepas checkpoint terakhir. Ukur semula native, jangan janji tiada
kehilangan pada force-stop.

Apabila RPC candidate belum dipasang, paparkan unavailable dan kekalkan queue.
Jangan fallback kepada upload sebagai markah rasmi atau endpoint arbitrari.
Selepas API aktif, uji hosted ownership/idempotency/reconnect dengan kebenaran
dan fixture yang dibersihkan. Source candidate sahaja tidak membuktikan rollout.
