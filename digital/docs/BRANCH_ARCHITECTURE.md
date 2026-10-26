# Seni bina branch GeoDecoder Digital

Tarikh keputusan: 26 Oktober 2026. Nama branch penerbitan tepat ialah
`main-digitalized`. Dokumen ini menetapkan pemetaan nama, sempadan komponen dan
aliran penerbitan. Kod integrasi, native rename, migration hosted dan pengaktifan
Pages telah diselesaikan. Inventori sebelum migrasi dan resit operasi berada
dalam [branch-registry.json](branch-registry.json).

## Dua repository, satu sumber pembangunan

| Peranan | Repository / branch | Kandungan dan tanggungjawab |
|---|---|---|
| Sumber pembangunan private | `unDead41/geodecoder` / `main-digitalized` | Satu integrasi Digital: aplikasi, modul, backend, ujian, dokumentasi dan hasil binaan yang diperlukan. Semua perubahan Digital disatukan di sini. |
| Penerbitan awam | `unDead41/geodecoder-digital` / `main-digitalized` aktif | Salinan frontend yang telah dibina: `index.html`, audio, `.nojekyll`, README penerbitan dan `release.json`. Sumber Pages `main-digitalized /(root)` telah disimpan dan dibaca semula. |
| Firmware | `unDead41/geodecoder` / `main`, `sharing`, branch perkakasan sedia ada | Sumber ESP32 dan pakej perkongsian. Nama, sejarah, GPIO, format simpanan dan versi firmware tidak berubah oleh migrasi Digital. |

Pada inventori awal, Pages awam menggunakan `main-digital`, manakala sumber
private sudah mempunyai `main-digitalized`. Kini Pages awam juga menggunakan
branch bernama `main-digitalized`. Menukar atau menolak kod ke branch private
tidak menukar tetapan Pages atau kandungan repository awam. Penerbitan mesti
menyatakan **repository serta branch**, kerana nama branch yang sama berada dalam
dua repository berbeza. Visibility sumber private dikekalkan.

`main-digital` private ialah sejarah persediaan lama. Ia berlainan daripada
`main-digital` dalam repository awam yang menghidangkan keluaran sebelum migrasi.
Jangan menukar Pages kepada branch legacy private itu.

## Keadaan penerbitan yang disahkan

| Operasi | Rekod 26 Oktober 2026 |
|---|---|
| Push kod integrasi private | Selesai pada `6246d06ab492a5b0ab3edb3d5ee7b25bcc84b081`, daripada sejarah `main-digitalized` sedia ada. |
| Pin sumber modul v1.5.0 | `fc9bda734f8b59825271a7cc4b91c101cb30bdde`. |
| Frontend mirror awam | Branch `main-digitalized` aktif pada `f5e5e13edd4c3627282cdaca78870c13399ac915`; metadata deployment diperbaharui tanpa menukar payload aplikasi yang diuji. |
| Native rename branch pembangunan | Kesemua 11 native rename selesai; setiap head mengekalkan SHA beku dan semua 11 ref lama sudah tiada. |
| Tetapan Pages | `main-digitalized /(root)` disimpan pada repository awam dan disahkan selepas reload. Workflow `40272514912` selesai `completed/success`; HTTP live sepadan hash artifak. |
| Migration hosted | `geodecoder_profile_and_module_progress_v2_6`, versi `20261026050330`, berjaya pada GeoDecoder Digital `fkrlwzxvyufndavlpzbp` selepas kebenaran pengguna yang jelas. Hosted verify profile/progress PASS; fixture sintetik ROLLBACK. |

Pengaktifan Pages dan migration hosted disahkan dengan bukti berasingan.
Bilangan rekod sebenar kekal profiles2/classes0/rooms0/attempts0/progress0.
Penolakan kelulusan automatik pada peringkat persediaan ialah rekod sejarah;
pengguna kemudian memberikan kebenaran jelas sebelum migration dilaksanakan. Rujuk
[penerbitan semasa](../../docs/DIGITAL_PUBLISHING.md) dan
[rekod Pages](GITHUB_PAGES.md) untuk perbezaan payload, tetapan sebenar dan
hasil pengesahan live dan prosedur penerbitan. SHA di atas merekodkan commit
payload yang telah disahkan;
commit dokumentasi susulan boleh memajukan head branch.

## Pemetaan nama dan head beku

Format branch kerja ialah `digitalized-<kategori-utama>-<subkategori>`:
huruf kecil, nombor dan tanda sempang. Kategori yang digunakan ialah `core`,
`game`, `ux`, `module`, `utility` dan `release`. `main-digitalized` ialah pengecualian
tetap sebagai branch integrasi/penerbitan.

Semua SHA di bawah ialah **head sebelum migrasi**, bukan bukti head semasa selepas
kerja baharu. Migrasi nama mengekalkan objek commit dan keseluruhan sejarahnya.

| Nama asal (private) | Nama baharu | Skop utama | SHA penuh sebelum migrasi |
|---|---|---|---|
| `digitalize` | `digitalized-core-portal` | Portal, akaun, kelas, room, komposisi aplikasi dan kontrak backend bersama | `adc51627eaaace5d9543c7e033d2994986c8715d` |
| `digital-dwi` | `digitalized-game-language` | BM/English, kamus, istilah, label dan paparan bahasa | `b8f7360fc15cb7b23666b092ade8e1d2058878bb` |
| `digital-richText` | `digitalized-game-duel` | Duel; sejarah ini turut mengandungi rich text dan latihan | `8373fd4bae11847c3a3099ee6f61e2756d99349b` |
| `digitalize-ease-of-use` | `digitalized-ux-usability` | Home, tetamu, panduan, maklum balas, kebolehcapaian dan jambatan tetapan modul | `51a0a0f852c1796e6e491c9abd91c2b776ecfffe` |
| `digitalize-module` | `digitalized-module-content` | Geometri, nota, makmal, bentangan dan kandungan pembelajaran | `694c2c9623a76be1b885611e2c90575b734d0b00` |
| `digitalize-module-design` | `digitalized-module-design` | Token, komponen, susun atur dan aksesibiliti modul | `2a62091fe72f88c59b2f3ca393a29fc3f1b47263` |
| `digitalize-module-upgrade` | `digitalized-module-guided` | Aktiviti berpandu, rekod refleksi dan sambungan kemajuan ke portal | `4c3a165613fd310e5e7e889e793065d4818250b2` |
| `digitalize-utility-profile` | `digitalized-utility-profile` | Profil sendiri, avatar dan perubahan nama paparan | `3e48d322e146f75a7407afcc9467b12561700646` |
| `digitalize-utility-security` | `digitalized-utility-security` | Kata laluan, pengesahan semula dan log keluar global | `80309ab7bdcddd6a96317f3088d0d8378d121a1f` |
| `digitalize-utility-preferences` | `digitalized-utility-preferences` | Satu rekod pilihan peranti, audio dan lalai pembelajaran | `5c9699a1962103c1edcb906f383015c60dbad21c` |
| `main-digital` | `digitalized-release-legacy` | Sejarah persediaan penerbitan private; rujukan sahaja | `71db77c0206de664e50fa57ff57e1825af13f938` |
| `main-digitalized` | `main-digitalized` | Integrasi Digital sedia ada; nama dikekalkan | `5f577d63f17067a8488e17cafcbcb25d5872360b` |

Nama `digitalized-game-duel` menerangkan pemilik perubahan baharu, bukan dakwaan
bahawa semua commit lamanya hanya berkaitan Duel. Sejarah rich text dan latihan
dikekalkan. Jika kerja baharu memerlukannya, cipta
`digitalized-game-rich-text` atau `digitalized-game-practice` daripada
`main-digitalized` semasa; jangan memecah atau menulis semula sejarah lama.

## Kontrak migrasi tanpa kehilangan sejarah

1. Baca semula head remote tepat sebelum operasi. Jika SHA berubah daripada
   inventori beku, semak perubahan baharu dan kemas kini pelan terlebih dahulu.
2. Gunakan penamaan semula branch native apabila tersedia. Selepasnya, baca semula
   ref baharu dan sahkan ia menunjuk SHA asal yang tepat. Rekod juga keadaan ref
   lama, kerana penamaan semula dan penciptaan alias mempunyai hasil berbeza.
3. Pelaksanaan ini menggunakan native rename sahaja. Jika akses itu tidak
   tersedia, catat halangan dan kekalkan ref sedia ada. Jangan menggantikannya
   dengan penciptaan alias atau pemadaman branch lama.
4. Jangan force-push, reset branch lama kepada hasil integrasi atau mengalihkan
   tag keluaran. Penamaan semula tidak memerlukan commit kandungan baharu.
5. `main-digitalized` private dikemas kini dengan commit integrasi yang mempunyai
   head sedia adanya sebagai parent/ancestor. Salinan fail sahaja tidak membuktikan
   ancestry. Jika patch diintegrasi secara terpilih, rekod SHA sumber dan cara
   penyelesaian konflik; jangan mendakwa semua branch telah di-merge melalui Git.
6. Isi resit hanya selepas bacaan remote: repository, tindakan, nama asal/baharu,
   SHA sebelum/selepas dan keputusan semakan. Inventori beku tidak diganti dengan
   head keluaran baharu; kedua-duanya perlu boleh diaudit.

Branch firmware `main`, `sharing`, `codex/*` dan `testing/components` berada di
luar pemetaan ini. Registry menyimpan SHA awalnya supaya penerbitan boleh
memeriksa bahawa kerja Digital tidak mengubah ref tersebut.

## Pemilikan kod dan sempadan komponen

Pemilikan merujuk tanggungjawab perubahan, bukan salinan fail berasingan pada
setiap branch. Terdapat satu versi canonical bagi setiap komponen dalam
`main-digitalized`. Jadual ini ialah kontrak kerja; ia tidak mendakwa semua fail
komposisi sedia ada telah dipecahkan menjadi pakej baharu.

| Pemilik | Sumber utama | Sempadan |
|---|---|---|
| `core-portal` | `digital/dist/app.mjs`, `portal.mjs`, `cloud.mjs`, `core.mjs`, `storage.mjs`; `digital/backend/auth/` | `app` dan `portal` memasang komponen dan mengurus navigasi. Peraturan permainan dalam `core` kekal bebas DOM/rangkaian. `cloud` ialah adapter API/Auth. `storage` mengurus rekod setempat. |
| `game-language` | `i18n.mjs`, `portal-copy.mjs`, `account-copy.mjs`, `module-copy.mjs`, `module-language.mjs`; dokumentasi DWI | Terjemah salinan/label melalui ID stabil; kekalkan jawapan, formula, ID bongkah dan nombor. Fail salinan khusus sesuatu fitur disemak bersama pemilik fitur itu. |
| `game-duel` | `duel.mjs`, `format.mjs`; `digital/backend/duel/`; ujian Duel/rich text/latihan | Duel mempunyai gateway/schema tersendiri. Formatter mengeluarkan markup terbatas selepas escaping; teks pengguna tidak menjadi HTML dipercayai. Pemarkahan room kelas dan Duel tidak dipindahkan kepada klien. |
| `ux-usability` | `usability.mjs`, `usability-ui.mjs`, `usability-copy.mjs`, `usability.css`, `module-settings.mjs`, `module-frame.mjs` | Panduan, fokus, ralat dan lifecycle iframe; gunakan pemilik preferences bersama. Jambatan tetapan tidak menulis rekod kemajuan atau data akaun. |
| `module-content` | `digital/module/src/geometry.mjs`, `content.mjs`, `lessons.mjs`, `lab-geometry.mjs`, `renderer.mjs`, `notes.mjs`, `labs.mjs`, fail makmal/bentangan | Miliki geometri, pengiraan dan kandungan. Formula/ID tidak diubah untuk susun atur atau terjemahan. Runtime pengajaran terbenam tidak mengambil alih Auth atau rangkaian portal. |
| `module-design` | `digital/module/src/design-system.mjs`, `ui.mjs`, `style.css`, `net-tools.css`, `accessibility.mjs`; dokumen reka bentuk modul | Token dan komponen visual modul. `design-tokens.css` dijana daripada `design-system.mjs`. Warna muka geometri kekal berasingan daripada token status UI. |
| `module-guided` | `digital/module/src/guided.mjs`; `digital/dist/module-progress.mjs`, `module-progress-view.mjs`; `backend/module_progress_v2_4.sql` | Aliran Ramal/Cuba/Semak/Terangkan dan rekod refleksi. Parent mengurus storan/awan; child mengurus aktiviti. Rekod latihan bukan markah kuiz, TP atau penguasaan disahkan. |
| `utility-profile` | `profile-view.mjs`; `backend/profile_v2_3.sql` | Nama/avatar pengguna sendiri. Identiti, role dan kebenaran ditentukan backend. `snapshot` dan dispatcher bersama disepadukan oleh pemilik skema di bawah. |
| `utility-security` | `account-security.mjs`, `security-view.mjs`; ujian SDK/sesi | Adapter Auth melalui SDK, pembersihan medan sensitif dan perlindungan pertukaran sesi. Jangan simpan kata laluan dalam rekod preferences, storan aplikasi atau mesej iframe. |
| `utility-auth-email` | `digital/backend/email/`, `digital/tools/email-templates.mjs` | Reka bentuk dan salinan e-mel Auth. Branch `digitalized-utility-auth-email` bermula pada integrasi `790d989d666e64f3beabb507cd4140b832696367`. Pemasangan templat hosted berasingan daripada push sumber; tidak mengubah credentials, Auth flows atau kuota. |
| `utility-preferences` | `preferences.mjs`; integrasi `music.mjs`, `theme.mjs` dan dialog tetapan | Satu pemilik normalisasi dan simpanan pilihan peranti. Bahasa mempunyai pemilik `i18n`; tema mempunyai pemilik `theme`. Pengguna fitur membaca adapter pemilik itu dan tidak mencipta rekod tetapan bersaing. |

Nama fail aplikasi tanpa direktori dalam jadual merujuk `digital/dist/`;
awalan `backend/` merujuk `digital/backend/`. Walaupun direktorinya bernama
`dist`, fail `.mjs` dan template
`index.html` di situ ialah sumber aplikasi yang disunting. Sebaliknya,
`app.bundle.js`, HTML standalone, `artifacts/site-index.html`, HTML modul dan
`module/src/design-tokens.css` ialah hasil binaan.

Fail komposisi bersama (`app.mjs`, `portal.mjs`, `cloud.mjs`, `index.html` dan
CSS utama) mempunyai satu pemilik integrasi bagi setiap perubahan. Fitur boleh
menambah helper dan ujian miliknya, kemudian menyerahkan hook kecil kepada
pemilik integrasi. Jangan menyalin keseluruhan fail komposisi daripada branch
lama kerana tindakan itu boleh membuang fitur yang sudah digabungkan.

## Pemilik skema dan kontrak data

`core-portal` ialah pemilik integrasi `digital/backend/schema.sql`,
`private.geo_action`, `private.snapshot`, API awam bersama, grant dan RLS.
Pemilik fitur menyediakan perubahan sempit serta migrasi/ujian; pemilik integrasi
menggabungkannya sekali dalam definisi akhir.

- `schema.sql` ialah keadaan lengkap bagi pemasangan baharu. Migrasi bernama
  ialah perubahan bagi pemasangan sedia ada. Kedua-duanya mesti menghasilkan
  kontrak akhir yang sama.
- Migrasi yang telah diterbitkan disimpan sebagai sejarah. Jika migrasi lama
  menggantikan keseluruhan fungsi bersama, jangan menjalankannya semula selepas
  migrasi lebih baharu sehingga versi akhir fungsi disemak; ia boleh membuang
  tindakan fitur lain. Tambah migrasi susulan yang menggabungkan definisi akhir.
- `profile_v2_3.sql` menyentuh `private.snapshot` dan `private.geo_action`;
  `module_progress_v2_4.sql` menambah kontrak kemajuan tersendiri; Duel memiliki
  schema `geodecoder_duel` dan gateway sendiri. Gabungan mesti mengekalkan ketiga-
  tiga kontrak, termasuk keistimewaan minimum dan sempadan pemilikan akaun.
- Jangan menambah medan klien untuk menetapkan ID pemilik, role, markah atau
  tempoh menjawab authoritative. Rekod kemajuan modul kekal berasingan daripada
  `room_progress` dan markah Duel.
- Penerbitan frontend, pemasangan SQL, deployment Edge Function dan tetapan Auth
  ialah operasi berasingan. Rekod yang mana benar-benar dilaksanakan; fail SQL
  dalam Git tidak membuktikan database hosted sudah dikemas kini.

Tetapan peranti mempunyai satu rekod `geodecoder.digital.preferences.v1`.
Adapter format lama disatukan melalui normalisasi yang sama. Sesi akaun,
skor setempat dan kemajuan modul mempunyai pemilik serta ruang simpanan sendiri;
pertukaran akaun tidak boleh menyalin rekod tetamu secara senyap.

Jambatan preferences dan jambatan progress modul ialah dua protokol berlainan.
Setiapnya mengesahkan window sumber, versi dan instance/session semasa. Jangan
gunakan listener umum yang menerima sebarang `postMessage`. Iframe pengajaran
tidak menerima credential dan tidak menulis terus ke database.

## Aliran kerja selepas migrasi

1. Mulakan daripada `main-digitalized` remote terkini dan catat SHA asas. Branch
   yang baru dinamakan semula masih berada pada head sejarahnya; nama baharu
   tidak menjadikannya setara dengan integrasi terkini.
2. Untuk menyambung branch itu, gabungkan integrasi terkini dan selesaikan
   konflik sambil mengekalkan semua fitur yang telah diterima. Untuk tugasan
   berasingan, cipta branch `digitalized-<kategori>-<subkategori>` baharu daripada
   integrasi terkini. Jangan reset branch sejarah atau menggunakan snapshot lama
   sebagai pangkalan aplikasi baharu.
3. Tetapkan pemilik fail sebelum kerja serentak. Perubahan bebas boleh berjalan
   pada helper/ujian berlainan; perubahan pada fail komposisi atau dispatcher
   skema yang sama diselaraskan oleh seorang pemilik integrasi.
4. Buat perubahan pada sumber dan jalankan pengesahan yang berkenaan. Bina modul
   dahulu apabila modul berubah, kemas kini pin/provenance vendor daripada hasil
   yang disahkan, kemudian bina aplikasi. Jangan menampal HTML/bundle generated.
5. Sebelum mengintegrasi, baca semula head remote dan semak diff terhadap asas.
   Jika head berubah, gabungkan perubahan sah dahulu. Gunakan kemas kini normal
   atau operasi berasaskan expected-head; jangan menimpa kerja yang bergerak.
6. Selepas integrasi, terbitkan hanya hasil frontend yang sudah diuji ke mirror
   awam. `release.json` merekodkan repository/branch/SHA sumber dan hash HTML/aset.
   Rekod SHA commit penerbitan dalam resit selepas commit wujud; jangan cuba
   memasukkan SHA commit itu sendiri ke fail sebelum commit berkenaan dicipta.
7. Sahkan prasyarat backend bagi keluaran tersebut dan konfigurasi Pages pada
   repository awam menunjuk `main-digitalized`
   dan `/(root)`, workflow selesai berjaya, URL HTTPS sebenar serta hash HTML/aset.
   Pertukaran nama branch sahaja tidak membuktikan Pages telah bertukar.

Semakan biasa apabila aplikasi atau modul berubah:

```sh
cd digital/module
npm test
npm run build
npm run check
cd ..
npm test
npm run build
npm run prepare:pages
npm run check
```

Pilih senario pelayar mengikut perubahan: BM/English, tetamu/kuiz/latihan/Duel,
portal/profil/keselamatan, tetapan, modul dan kemajuan. Ujian DOM/simulasi tidak
membuktikan penghantaran email, aliran akaun production, prestasi telefon fizikal
atau ujian ESP32. Nyatakan bukti yang benar-benar dijalankan.

Versi Digital dan modul mengikut sumber versinya sendiri. Dasar
[SOR firmware](../../docs/SOR_VERSIONING.md) masih terpakai apabila menerbitkan
firmware ke `main`; kerja dokumentasi/branch Digital ini tidak menaikkan versi
firmware. Kekalkan rujukan firmware v1.1.3 pada
`a059979d97926b82cafd4aa5cf3fe59da04a55bb` sehingga keluaran firmware lain
benar-benar diterbitkan.

## Resit dan keadaan operasi

Registry membezakan `frozenInventory`, `targetContract` dan
`operationReceipts`. Jadual pemetaan ialah keputusan seni bina. Kejayaan rename,
push integrasi, pertukaran Pages dan deployment backend mesti
direkodkan secara individu selepas pengesahan remote. Ruang resit kosong bermaksud
belum ada pengesahan operasi dalam rekod ini.

Halangan akses GitHub awal dan rekod `operationStateAtAuthoring` ialah keadaan
ketika dokumen mula ditulis. Ia tidak menggantikan resit operasi yang disahkan
kemudian. Pengendali menyatukan resit native rename daripada setiap kumpulan
sebelum menetapkan status agregat. Push sumber, penyediaan mirror, rename,
pengaktifan Pages dan migration backend tetap memerlukan rekod berasingan.

**Semakan akhir 26 Oktober 2026:** kesemua **11 native rename selesai**.
Setiap nama baharu menunjuk SHA beku yang tepat; kesemua 11 ref lama sudah tiada.
Tujuh ref firmware/perkakasan di luar penerbitan tidak berubah. Sumber gabungan
v2.6.0 telah dipush ke `main-digitalized`; mirror awam branch bernama sama
aktif pada `f5e5e13edd4c3627282cdaca78870c13399ac915`. Migration hosted versi
`20261026050330` berjaya dan Pages `main-digitalized /(root)` telah disimpan;
workflow `40272514912`, HTTP/hash dan smoke test Chrome live disahkan. Lihat
[resit rename akhir](integration-evidence/branch-migration-final.json),
[bacaan ref remote](integration-evidence/remote-branches-final.json),
[bukti senarai branch](integration-evidence/branch-architecture-1792990066721.jpg)
dan [resit penerbitan](integration-evidence/publication-v2.6.json).

## Utiliti native rename

Jalankan daripada direktori `digital`. Utiliti membaca pemetaan terus daripada
`docs/branch-registry.json`; tiada senarai nama kedua untuk diselaraskan.
Ia memerlukan credential GitHub yang dibekalkan melalui `GH_TOKEN` atau
`GITHUB_TOKEN` dalam environment. Credential tidak menjadi argumen arahan,
fail registry atau kandungan output.

```sh
node tools/organize-branches.mjs
node tools/organize-branches.mjs --apply
```

Arahan pertama ialah dry-run baca sahaja. Arahan kedua melaksanakan native rename
selepas semua sumber dan destinasi lulus preflight. Utiliti mengesahkan repository,
nama yang dikecualikan, pemetaan unik dan SHA beku; perubahan SHA, kedua-dua ref
hilang atau perlanggaran destinasi menghentikan operasi sebelum rename pertama.
Destinasi yang sudah mempunyai SHA tepat dan sumber yang sudah tiada boleh
diiktiraf sebagai `already-renamed` untuk penyambungan selamat.

Utiliti membaca ref Git tepat tanpa mengikuti redirect nama branch, menyemak
semula setiap pasangan sebelum POST, kemudian mengesahkan SHA destinasi dan
ketiadaan ref lama. API native rename tidak mempunyai parameter expected-SHA
yang atomik: perubahan serentak antara semakan dan POST masih tidak boleh
dikunci sebagai satu transaksi. Hentikan push lain pada branch terlibat ketika
melaksanakan rename.

Output ialah JSON Lines: `preflight` menyenaraikan rancangan, setiap `receipt`
merekodkan hasil selepas bacaan semula ref tepat, dan `complete` merumuskan jumlah
yang ditukar, sudah ditukar dan masih menunggu. Jika proses berhenti selepas
sebahagian rename, resit terdahulu yang sudah disahkan kekal sah; kekalkannya dan
jalankan semula preflight. Utiliti tidak cuba rollback, mencipta alias atau
memadam ref. POST rename tidak diulang secara automatik. Error disanitasi dan
proses keluar dengan kod 1.

Utiliti ini tidak menolak kod integrasi, mengubah Pages atau deploy backend.
Pengendali menyalin hasil yang disahkan ke rekod penerbitan/`operationReceipts`
tanpa menggantikan inventori beku. Semak utiliti dengan:

```sh
node --test tests/branch-organization.test.mjs
```
