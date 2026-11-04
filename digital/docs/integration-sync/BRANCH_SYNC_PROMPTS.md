# GeoMath — prompt sambungan branch selepas integrasi

Tarikh audit: 4 November 2026. Repository sumber: `unDead41/geodecoder` (private).

**Rujukan integrasi sumber:**

- Head `main-digitalized` yang disahkan: `main-digitalized remote terkini (rekodkan SHA penuh semasa fetch)`.
- Keputusan penyelarasan branch: `Rujuk resit ref selepas operasi remote disahkan.`.
- Titik asas lapan calon yang diaudit: `391df985eea4fee15d9859e678068b1a3f613cba`.

## Keputusan penyelarasan semua branch fitur Digital

Selepas suite sumber gabungan lulus, rancangan penyelarasan ialah memajukan `main-digitalized` secara biasa dan **fast-forward semua 26 branch fitur `digital*`/`digitalized*`** kepada hasil integrasi yang sama. Setiap head asal mesti terbukti ancestor kepada commit sasaran sebelum ref dimajukan. Periksa semula expected head tepat sebelum operasi dan rekod bacaan remote selepasnya. Jika branch berubah serentak atau bukan lagi ancestor, hentikan kemas kini branch itu dan integrasikan commit baharunya dahulu.

Ini merge upstream secara fast-forward yang mengekalkan semua commit asal. Ia tidak menggantikan sejarah dengan snapshot. Nama branch menerangkan tanggungjawab kerja berikutnya; semuanya menerima asas aplikasi bersama, termasuk offline, UI, modul, CRUD dan transport yang diterima. Suite integrasi pada SHA gabungan yang sama boleh menjadi satu bukti bersama; fast-forward tulen tidak memerlukan 26 salinan implementasi atau 26 ulangan suite yang identik.

| Kumpulan | Branch fitur yang termasuk dalam 26 fast-forward |
|---|---|
| Core dan kelas (4) | `digitalized-classroom-crud`, `digitalized-core-backend`, `digitalized-core-backend-scaling`, `digitalized-core-portal` |
| Permainan (3) | `digitalized-game-duel`, `digitalized-game-duel-ui-refresh`, `digitalized-game-language` |
| Modul (7) | `digitalized-module-content`, `digitalized-module-design`, `digitalized-module-explore-ui-refresh`, `digitalized-module-guided`, `digitalized-module-labs-ui-refresh`, `digitalized-module-pelan-pengiraan`, `digitalized-module-studio-ui-refresh` |
| Utility (7) | `digitalized-utility-auth-email`, `digitalized-utility-help-support`, `digitalized-utility-offline-sync`, `digitalized-utility-preferences`, `digitalized-utility-profile`, `digitalized-utility-save-resume`, `digitalized-utility-security` |
| UX (4) | `digitalized-ux-design-system`, `digitalized-ux-motion-audio`, `digitalized-ux-ui-upgrade`, `digitalized-ux-usability` |
| Nama sedia ada dikekalkan (1) | `digitalize/security-activeSession` |

**Pengecualian tunggal keluarga Digital ialah `digitalized-release-legacy`**, yang kekal pada head sejarah `71db77c0206de664e50fa57ff57e1825af13f938`. Jangan menerima prompt kemas kini fitur pada branch beku itu. `frozenInventory` juga kekal sebagai inventori sejarah walaupun ref fitur telah dimajukan. Branch firmware/perkakasan, konsep dan repository awam berada di luar penyelarasan ini. Nama `digitalize/security-activeSession` dikekalkan; operasi ini bukan penamaan semula.

Sebelum sync, branch lama mungkin belum mempunyai offline/PWA. Selepas semua resit fast-forward disahkan, ketiadaan offline pada snapshot lama tidak lagi memerlukan prompt implementasi berasingan. Pemilik `digitalized-utility-offline-sync` menyediakan satu implementasi bersama; branch lain menggunakan adapter itu. Modul iframe kekal tanpa Auth/database sendiri. Prompt sambungan di bawah digunakan hanya bagi kerja berikutnya atau regresi yang masih ditemui.

Push sumber private, penerbitan mirror `unDead41/geodecoder-digital`, Pages, pemasangan SQL dan deployment Edge ialah hasil operasi berlainan. Resit salah satu tidak membuktikan yang lain selesai.

## Prompt bersama — salin dan tukar BRANCH_KERJA

```text
Sambung GeoMath dalam repository private unDead41/geodecoder pada BRANCH_KERJA.
Tugas: selaraskan branch ini dengan main-digitalized remote terkini sambil
mengekalkan semua fitur branch dan integrasi yang telah diterima, kemudian
semak bahagian milik branch ini. Head integrasi rujukan ialah
main-digitalized remote terkini (rekodkan SHA penuh semasa fetch); baca semula remote kerana head mungkin sudah bergerak.
Semua 26 branch fitur dijadualkan menerima asas gabungan yang sama; periksa
resit Rujuk resit ref selepas operasi remote disahkan. dahulu. digitalized-release-legacy kekal beku dan
bukan BRANCH_KERJA. Kekalkan nama digitalize/security-activeSession apabila
itulah branch yang dipilih.

1. Baca AGENTS.md, digital/docs/BRANCH_ARCHITECTURE.md,
   digital/docs/OFFLINE_SYNC.md dan handoff terkini branch. Rekod SHA remote
   main-digitalized dan BRANCH_KERJA sebelum perubahan. Gunakan checkout/worktree
   tersendiri; kekalkan perubahan pengguna yang belum dicommit.
2. Bandingkan ancestry dan commit unik. Jika BRANCH_KERJA sudah mengandungi
   upstream, jangan cipta merge atau commit kosong. Jika branch ialah ancestor
   upstream, gunakan fast-forward. Jika diverged, merge main-digitalized ke
   BRANCH_KERJA dan selesaikan konflik pada sumber, mengekalkan kedua-dua fitur.
   Jangan reset, force-push, menulis semula sejarah atau cherry-pick semula fitur
   yang sudah ada. Jangan kemas kini ref branch lain.
3. Offline/PWA, IndexedDB outbox dan deferred sync mempunyai satu implementasi
   bersama yang sudah diterima daripada digitalized-utility-offline-sync.
   Gunakan adapter itu. Kekalkan partition tetamu/akaun, session binding,
   acknowledged IDs dan retry idempotent. Jangan tambah queue, service worker,
   preference store atau sambungan database modul yang bersaing.
4. Kekalkan semua UI baharu, CRUD, network policy, bahasa/tetapan dan modul lain
   dalam fail komposisi bersama. Selaraskan hook kecil; jangan pilih satu fail
   penuh atau generated HTML branch lama untuk menindih integrasi.
5. Jalankan semakan khusus BRANCH_KERJA daripada jadual sambungan audit.
   Bagi modul yang berubah, bina/check modul dahulu, selaraskan vendor pin dan
   provenance yang sah, kemudian bina aplikasi induk. Jangan edit bundle/HTML
   generated dengan tangan atau menyalin pin dari calon branch tunggal.
6. Jalankan suite sedia ada yang berkaitan serta build/check integrasi. Bagi
   gabungan modul: cd digital/module; npm test; npm run build; npm run check.
   Bagi induk: cd digital; npm test; npm run design:check; npm run build;
   npm run prepare:pages; npm run check. Gunakan npm ci apabila dependency belum
   tersedia. Gunakan runner pelayar sedia ada untuk aliran yang terkesan.
   Nyatakan kegagalan, halangan dan bukti emulasi dengan tepat.
7. Baca semula head BRANCH_KERJA sebelum push. Jika ia bergerak, semak dan merge
   perubahan sah dahulu. Commit perubahan yang perlu dan push BRANCH_KERJA
   sahaja secara normal/expected-head; sahkan SHA remote selepas push.
8. Beri resit ringkas: SHA asas/upstream, branch sebelum/selepas, commit unik
   yang dikekalkan, konflik dan penyelesaiannya, fail berubah, keputusan ujian
   sebenar serta baki kerja. Bezakan sync sumber daripada pengaktifan live.

Skop ini tidak menerbitkan mirror/Pages, menjalankan migration hosted,
deploy Edge, mengubah Auth/SMTP, pelan berbayar atau firmware. Sediakan
keperluan rollout secara berasingan jika diperlukan.
```

## Tambahan semakan mengikut BRANCH_KERJA

Salin baris yang sepadan bersama prompt di atas. Sync menyampaikan fitur bersama kepada semua branch; prompt ini tidak bermakna setiap branch masih kekurangan offline. Tambah kod baharu hanya bagi regresi sebenar atau keperluan yang belum dipenuhi.

| BRANCH_KERJA | Tambahan prompt khusus |
|---|---|
| `digitalized-ux-ui-upgrade` | Semak Home → mod → panduan → resume, checkpoint sebenar dan penggantian sesi, kawalan putar/Jeda, WebGL/Canvas/SVG fallback, aset Three.js dibundel serta berhenti animasi pada tab tersembunyi. Pastikan hook solo completion memanggil offline sekali bagi satu attempt dan `tools/standalone.mjs` menghasilkan pakej PWA lengkap. Uji BM/English, 320/390 px, dark, teks 150% dan reduced motion. |
| `digitalized-game-duel`, `digitalized-game-duel-ui-refresh` | Semak create/join, PIN, lobby/ready/countdown, R1/R2, review, result dan New duel dengan network policy semasa. Kekalkan protocol 2, sequence/payload retry yang sama, markah/jam server dan waiting-result sebenar. Duel kekal memerlukan Internet; jangan queue/replay tindakannya melalui offline utility. Jalankan runner Duel/UI yang diserahkan dan semak offline/reconnect serta late ACK. |
| `digitalized-module-content`, `digitalized-module-explore-ui-refresh` | Semak shell/navigation/wrapper bersama Modul 2/3, 11 model, enam pandangan, nota/kalkulator, input invalid dan fokus. Bahasa/resize/tetapan tidak mereset kamera, ukuran, π atau draf. Pastikan iframe daripada aplikasi yang sudah siap dicache masih boleh dibuka offline. Selaraskan versi/pin daripada modul gabungan; v1.6.1 dalam calon ini bukan pin automatik keluaran gabungan. |
| `digitalized-module-guided`, `digitalized-module-labs-ui-refresh` | Semak empat makmal/hab, playback/kamera, advanced mode, draf/Undo dan aliran Ramal → Cuba → Semak → Terangkan. Uji refleksi melalui parent offline adapter, kekal selepas reopen dan sync tanpa menurunkan pencapaian. Kekalkan geometri, cetakan SVG/mm dan scope CSS makmal; jangan tambah storan/rangkaian dalam iframe. |
| `digitalized-module-pelan-pengiraan`, `digitalized-module-studio-ui-refresh` | Semak Pelan & Dongakan Kaedah 1, skala/garis/Undo/toleransi asal, wizard pengiraan dan invalidasi langkah seterusnya. Rekod empat refleksi mesti mengekalkan fokus/draf dan membersihkan paparan pada pertukaran akaun. Offline tidak secara automatik menjadikan draf studio/checkpoint sync merentas peranti; kekalkan skop simpanan yang didokumenkan. |
| `digitalized-utility-offline-sync` | Semak konflik hook app/cloud/module-progress/builder dengan UI dan scaling. Uji pemasangan separa cache, reload offline, kedua-dua audio lengkap, IndexedDB reopen/storage failure, tetamu, tukar akaun/logout, token luput, late ACK, dedup, missing RPC, retry/backoff dan update yang menunggu reload pengguna. Semak module/solo completion sebenar. Classroom, Duel, security dan support tidak masuk outbox. Jalankan runner offline browser serta ujian SQL/transport yang sedia ada. |
| `digitalized-core-backend-scaling` | Semak cloud cache/invalidation/coalescing bersama structured error CRUD dan RPC owner/session-bound offline; kekalkan local module save serta satu pemilik sync. Uji stale-response selepas room/account switch, refreshed JWT, snapshot tanpa presence write, heartbeat bounded, 429/Retry-After dan terminal Duel. Semak migration guards/rollback terhadap definisi gabungan, tanpa mengubah migration sejarah atau menjalankan load pada production. Browser scaling terdahulu terhalang; perlukan bukti baharu sebelum mendakwa ia lulus. |
| `digitalized-core-portal`, `digitalized-classroom-crud` | Semak capability gate backend lama, rename/conflict/revision, archive/restore, delete kosong sahaja, remove member tanpa padam attempt/progress, invite lama, session switch dan refresh gagal. Semak kelas/room yang telah ditarik akses tidak muncul daripada cache scaling. Tindakan CRUD kekal online dan tidak direplay melalui offline queue. Jalankan runner SQL/portal/CRUD browser; semak semula kegagalan reference gallery terdahulu secara berasingan. |
| `digitalized-game-language` | Semak semua salinan BM/English, rich text/MathML, label ARIA dan status offline baharu. Kekalkan ID soalan/analitik serta teks pengguna secara literal; pertukaran bahasa tidak mengubah sesi atau jawapan. |
| `digitalized-module-design`, `digitalized-ux-design-system` | Gunakan token pusat dan adapter terjana yang sama. Semak drift, tema/kontras, fokus dan reflow pada semua region modul gabungan; kekalkan palet muka geometri berasingan daripada status UI. |
| `digitalized-ux-motion-audio`, `digitalized-ux-usability` | Semak lifecycle animasi/audio, tutorial, pause, tab tersembunyi dan reduced motion melalui preferences canonical. Kedua-dua audio perlu lengkap dalam cache PWA; kekalkan panduan keyboard, fokus dan jambatan tetapan iframe. |
| `digitalized-utility-profile`, `digitalized-utility-preferences` | Semak pemilik nama/avatar serta satu rekod preferences, preview/draf/unsaved changes dan penukaran akaun. Offline owner label tidak memberikan autoriti mengubah profil; bahasa/saiz/tema tidak mereset permainan/modul. |
| `digitalized-utility-security`, `digitalize/security-activeSession` | Semak reauthentication, recovery, senarai sesi dan log keluar melalui SDK/RPC sah. Offline label bukan sesi Auth yang sah. Pertukaran akaun/logout membersihkan draf sensitif dan tidak menghantar outbox pemilik lain; jangan replay operasi keselamatan apabila online semula. |
| `digitalized-utility-save-resume` | Semak slot tetamu/setiap akaun, resume/discard dan storan gagal tanpa menambah percubaan atau markah. Checkpoint tempatan dan sejarah completed attempt dalam offline outbox mempunyai skop berbeza; jangan gandakan completion selepas resume. |
| `digitalized-utility-help-support` | Semak tutorial/Bantuan serta preview/salin/muat turun laporan BM/English. Laporan kekal tanpa penghantaran automatik; support bukan jenis event offline sync. |
| `digitalized-utility-auth-email` | Semak lapan templat BM/English, escaped content dan pautan yang disokong tanpa menukar kontrak Auth. Push templat tidak mengaktifkan SMTP dan tidak membuktikan email dihantar. |
| `digitalized-core-backend` | Gunakan prompt backend terperinci di bawah untuk pendaftaran migration, pemasangan baharu dan history gate; jangan menyalin manifest/historical schema branch lama. |

Semua UI/modul: kekalkan satu pemilik design token dan preferences, ID geometri/soalan, peraturan R1 → R2/+1 dan sempadan markah authoritative. Jalankan aliran desktop/telefon, BM/English, light/dark, teks 100/150%, keyboard dan reduced motion yang terkesan.

## Prompt sambungan backend — daftar migration dan lengkapkan pemasangan baharu

```text
Sambung GeoMath pada digitalized-core-backend dalam unDead41/geodecoder.
Terima main-digitalized remote terkini mengikut prompt BRANCH_KERJA di atas.
Sediakan pakej backend gabungan untuk rollout yang akan disemak kemudian.
Tugas ini membenarkan perubahan sumber, ujian lokal dan push branch kerja;
ia tidak membenarkan migration hosted, Edge deploy, penerbitan frontend,
perubahan Auth/SMTP, email ujian, automation production atau pelan berbayar.

Baca AGENTS.md, BRANCH_ARCHITECTURE, operations/README dan RECHECK_HANDOFF,
backend/scaling/README, backend/classroom-crud/README serta OFFLINE_SYNC.
Rekod SHA asas, source diff dan keadaan remote sebelum bekerja.

Jurang khusus yang perlu ditutup:
- Scaling calon berada di digital/backend/scaling/supabase/migrations/
  20261104014211_geodecoder_scaling_v1.sql.
- CRUD calon sudah berada di supabase/migrations/
  20261104014958_geodecoder_classroom_crud.sql.
- Offline masih di digital/backend/offline-sync.sql.
- supabase/hosted-history.json merekod 11 migration yang telah dipasang;
  backend-history.test.mjs kini menjangka CRUD sahaja sebagai pending.

1. Periksa keadaan hosted secara baca sahaja jika sambungan tersedia: eksport
   version/name/statements, routine definitions/grants/RLS dan Edge versions.
   Jalankan history gate terhadap eksport baharu. Jika akses tiada, teruskan
   penyediaan lokal dan tandakan semakan hosted belum dibuat. Jangan ubah 11
   fail/hash sejarah atau menambah calon belum deployed ke hosted-history.json.
2. Daftarkan scaling dalam direktori canonical supabase/migrations dengan
   versi yang disemak; kekalkan provenance daripada calon 20261104014211.
   Daftarkan offline sebagai migration additive baharu dengan timestamp CLI
   unik selepas CRUD. Jika mana-mana versi sudah deployed, kekalkan bytesnya
   dan tambah migration susulan; jangan sunting sejarah hosted.
   Tetapkan satu pemilik SQL dan kemas kini runner/import/dokumen supaya fail
   nested/standalone tidak menjadi salinan executable yang boleh drift atau
   terpasang dua kali. Kekalkan bukti/hash source asal dalam handoff.
3. Wujudkan senarai calon berasingan, contohnya supabase/pending-migrations.json,
   yang merekod version/name/path/hash, prasyarat, urutan dan status candidate.
   Urutan awal untuk diuji ialah 11 baseline hosted → scaling → CRUD → offline.
   Sahkan dengan kod sebenar; scaling mengawal MD5 private.geo_action dan
   Duel gateway, sementara CRUD memperkenalkan wrapper/snapshot/grants baharu.
   Kekalkan MD5 guard gagal secara tertutup jika upstream tidak sepadan.
4. Kemas kini digital/backend/schema.sql serta laluan pemasangan baharu yang
   didokumenkan supaya database kosong memperoleh kontrak akhir yang sama
   dengan upgrade berurutan: kelas/profil/security/module progress, Duel2,
   scaling, CRUD dan offline RPC. Nyatakan prerequisite dan entrypoint tepat.
   Jangan mengarahkan schema lama dijalankan pada database sedia ada selepas
   migration baharu. Elakkan pemasangan fungsi canonical dua kali melalui
   fail yang mengembalikan definisi lama.
5. Tambah pengesahan gabungan yang bermakna pada database disposable:
   (a) replay 11 hosted lalu semua calon dalam urutan canonical;
   (b) pemasangan kosong melalui entrypoint fresh-install yang didokumenkan;
   (c) padankan kontrak akhir, routine/grant/RLS dan jalankan suite sebenar.
   Semak khusus snapshot tanpa presence write, heartbeat yang terbatas pada
   current membership/room, akses pelajar yang dibuang, archive/retention,
   Duel sequence/score/deadline, owner/session-bound offline RPC dan dedup.
   Jadual auth.sessions/JWT untuk offline ialah fixture lokal yang jelas.
6. Kemas kini backend-history.test.mjs untuk pending set canonical yang tepat.
   Kekalkan check-history.mjs gagal tanpa eksport hosted baharu dan apabila
   version/name/hash sejarah berbeza. Tambah semakan calon yang menolak version
   pendua, hash drift, urutan/prasyarat salah dan SQL lokal tidak berdaftar;
   calon tidak boleh dipersembahkan sebagai migration sudah deployed.
7. Semak rollback/roll-forward gabungan. Rollback scaling lama mengharapkan
   routine tepat dan tidak boleh menimpa wrapper CRUD/perubahan kemudian.
   Uji guard penolakan terhadap keadaan kemudian; sediakan tindakan pemulihan
   yang memelihara pengguna, kelas, attempt, progress dan offline receipts.
8. Dari digital jalankan suite sedia ada yang terkesan, termasuk history gate,
   backend-history, scaling-database, classroom-crud-backend dan offline-backend,
   kemudian npm test/build/check yang berkaitan. Rekod ujian disposable,
   kegagalan dan halangan dengan tepat. SQL lokal bukan bukti hosted deploy.
9. Kemas kini README/operator plan/handoff supaya daftar calon, fresh-install,
   upgrade, fresh history export, dry-run, backup/restore dan receipt selepas
   deployment konsisten. Kekalkan automatic_branching=false dan
   deploy_to_production=false. Push digitalized-core-backend sahaja selepas
   membaca semula expected head dan sahkan SHA remote.

Serahkan diff sumber, versi/path/hash calon, urutan migration yang lulus,
bukti kesetaraan fresh-install/upgrade, keputusan ujian dan pelan rollout
yang boleh disemak. Jangan isi hosted deployment receipt atau menukar
hosted-history.json seolah-olah operasi live sudah berlaku.
```

## Prompt berasingan — audit kesiapsiagaan live

```text
Audit kesiapsiagaan rollout GeoMath daripada main-digitalized remote terkini.
Kerja ini ialah audit dan penyediaan pakej yang boleh disemak. Gunakan branch
kerja tersendiri untuk pembetulan sumber jika perlu; jangan deploy hosted,
publish frontend, menghantar email, mengubah Auth/SMTP atau membeli pelan.

Baca digital/backend/operations/README.md dan RECHECK_HANDOFF.md,
digital/backend/scaling/README.md, digital/backend/classroom-crud/README.md,
digital/docs/OFFLINE_SYNC.md serta handoff masing-masing. Periksa keadaan
hosted semasa secara baca sahaja melalui sambungan sedia ada.

1. Padankan history gate dengan eksport statement hosted baharu, senarai
   migration, routine/grant/RLS dan Edge source/version sebenar. 11 migration
   dalam rekod lama ialah baseline audit, bukan jaminan keadaan semasa.
   Jangan ganti manifest semasa dengan manifest 9-entry branch backend lama.
2. Semak pakej pendaftaran migration dan fresh-install daripada prompt backend
   di atas: urutan scaling + CRUD + offline, grants, RPC, fingerprint guards
   dan rollback yang telah diuji pada database disposable. Scaling
   menyemak MD5 private.geo_action dan Duel gateway; CRUD mengubah snapshot,
   gateway/grants. Jangan andaikan tiga ujian branch berasingan membuktikan
   urutan gabungan selamat. Kekalkan sejarah hosted immutable.
3. Sediakan pakej frontend digital/artifacts/pwa lengkap, termasuk sw.js,
   manifest, ikon dan audio. Prosedur mirror lama index/audio sahaja perlu
   diselaraskan. Senaraikan pemeriksaan HTTPS scope/cache, RPC unavailable,
   pending → acknowledged, owner history dan session aktif selepas rollout.
4. Senaraikan bukti live yang masih diperlukan: dua sesi guru/pelajar sebenar,
   Realtime access revocation/reconnect, Auth dan recovery, serta backup/restore
   terasing. SMTP memerlukan pemilik mengisi credential terus dalam dashboard;
   jangan minta atau simpan App Password dalam chat/Git. Penghantaran email
   ujian memerlukan penerima milik pengguna dan arahan hantar yang jelas.
5. Sediakan rancangan staging/load dengan target, resource/budget, fixtures
   terasing dan guards sedia ada. Bezakan 5,000 mixed users daripada 5,000
   Duel players; kedua-duanya belum dibuktikan oleh ujian lokal. Tambah beban
   Realtime/fan-out dan student writes sebelum dakwaan kapasiti kelas.

Berikan pakej review dengan SHA sumber, diff, urutan operasi, keputusan lokal,
prasyarat dan langkah pengesahan/rollback. Nyatakan operasi live yang belum
dilaksanakan. Pelaksanaan rollout memerlukan arahan berasingan yang menyatakan
projek/persekitaran dan tindakan yang dibenarkan.
```

## Nota untuk integrator

- Sebelum penyelarasan, `digitalized-core-backend` pada `b3ae71c5ff8072dabeba1f19119a911a13195bf8` mempunyai addendum dokumentasi `digital/backend/operations/RECHECK_HANDOFF.md`. Addendum disepadukan sambil mengekalkan config/history/functions terkini; selepas fast-forward, sambungan backend bermula daripada hasil gabungan, bukan snapshot lamanya.
- Offline source branch mempunyai SQL additive `digital/backend/offline-sync.sql`; source push tidak memasang RPC itu. Jika RPC belum ada, pending mesti kekal dan status tidak boleh mendakwa synced.
- Pengesahan UI branch ialah bukti branch pada SHA yang direkodkan. Ia perlu semakan integrasi baharu selepas shared files digabungkan. Kegagalan lama tetap dilaporkan: browser scaling terhalang, reference gallery CRUD belum selesai dan audit statik modul mengeluarkan actionless-button findings walaupun controller diuji.
- Panduan ini berpandukan bacaan GitHub pada SHA calon dan senarai 27 ref `digital*` (26 fitur + satu legacy) sebelum sync. Rancangan fast-forward masih menunggu resit akhir root; ia tidak mendakwa ref, Pages atau deployment baharu sudah disahkan. Masukkan resit akhir sebenar di bahagian atas.
