# GeoDecoder Digital v2.6.0 · Modul v1.5.0

Tarikh: 26 Oktober 2026 (Malaysia). Destinasi: **main-digitalized**.
Arahan pengguna terkini membenarkan integrasi semua kerja digital, sehingga
lima subagen (tiga integrasi dan dua pengurusan branch). Main firmware, sharing,
serta branch sumber tidak ditimpa oleh penerbitan gabungan.

## Sumber beku yang disemak

| Branch pada awal integrasi | SHA penuh |
|---|---|
| main-digitalized | `5f577d63f17067a8488e17cafcbcb25d5872360b` |
| digitalize | `adc51627eaaace5d9543c7e033d2994986c8715d` |
| main-digital | `71db77c0206de664e50fa57ff57e1825af13f938` |
| digital-dwi | `b8f7360fc15cb7b23666b092ade8e1d2058878bb` |
| digital-richText | `8373fd4bae11847c3a3099ee6f61e2756d99349b` |
| digitalize-ease-of-use | `51a0a0f852c1796e6e491c9abd91c2b776ecfffe` |
| digitalize-module | `694c2c9623a76be1b885611e2c90575b734d0b00` |
| digitalize-module-design | `2a62091fe72f88c59b2f3ca393a29fc3f1b47263` |
| digitalize-module-upgrade | `4c3a165613fd310e5e7e889e793065d4818250b2` |
| digitalize-utility-profile | `3e48d322e146f75a7407afcc9467b12561700646` |
| digitalize-utility-security | `80309ab7bdcddd6a96317f3088d0d8378d121a1f` |
| digitalize-utility-preferences | `5c9699a1962103c1edcb906f383015c60dbad21c` |

`main-digitalized` sedia ada menjadi sejarah induk integrasi. Asas aplikasi
yang dipilih ialah ease-of-use v2.5.0; ia sudah mengekalkan BM/English, rich
text, latihan15 dan Duel daripada richText. Modul bermula pada v1.4.0 yang
sudah diterbitkan ke MD, termasuk penyelarasan reka bentuk. Guided/progress
v1.3.0 diadaptasi di atas modul itu, bukan menggantikannya dengan salinan lama.

## Tingkah laku gabungan

- Kuiz10, latihan15, semakan soalan salah, satu percubaan, analitik, Duel PIN,
  akaun guru/pelajar, kelas dan room dikekalkan.
- Modul mengekalkan preset/studio bentangan, nota dan pandangan luas, perbandingan
  isi padu serta bekas/rongga. Empat aktiviti berpandu menambah ramalan,
  pemerhatian, semakan konsep dan penerangan. Mod penerokaan yang tidak dinilai
  dilabel dengan jelas.
- Satu lifecycle iframe membawa tetapan bahasa/teks/gerakan serta pilihan
  pembelajaran; native startup bridge menggantikan hooks carian teks kod.
  Tema dan rekod latihan menggunakan protokol konteks berasingan.
- Nama/avatar profil disimpan hanya bagi identiti log masuk. Username, role,
  email/pengesahan dan kelas ialah maklumat baca sahaja.
- Halaman profil/keselamatan eksklusif. Keluar atau menukar identiti membatalkan
  permintaan lama dan mengosongkan medan kata laluan. Reauthentication
  menggunakan klien sementara tanpa menukar sesi utama.
- Rekod tetamu dan akaun dipisahkan. Guru hanya membaca ahli kelas miliknya.
  Rekod latihan ialah refleksi kendiri, bukan markah penilaian/TP.
- Semua alias HTML dan root `index.html` menggunakan satu keluaran gabungan.
  `.nojekyll` kekal disertakan.

## Database dan deployment

**Deployment hosted selesai dan disahkan pada 26 Oktober 2026.** Pengguna
memberi kebenaran jelas untuk kedua-dua migration serta pengaktifan Pages.
Projek sedia ada **GeoDecoder Digital** (`fkrlwzxvyufndavlpzbp`) digunakan.

Kedua-dua fail yang diuji dipasang dalam satu transaksi melalui migration
`geodecoder_profile_and_module_progress_v2_6`, versi **20261026050330**.
Cache schema PostgREST dimuat semula. Kolum avatar, jadual kemajuan dan RPC
tersedia; RLS aktif, RPC authenticated dibenarkan dan akses terus jadual ditolak.

| Migration dipasang | SHA256 fail yang diuji |
|---|---|
| [profile_v2_3.sql](../backend/profile_v2_3.sql) | `d73f8dbe5c451140b5c718c3009bd100a81ae5029ee85cfe60bcd5f84972200f` |
| [module_progress_v2_4.sql](../backend/module_progress_v2_4.sql) | `f22ab14e1298a36c0ce27400b76472218b40e04b0689a1813b708e5df7c6cf2b` |

Ujian SQL hosted [verify_profile.sql](../backend/verify_profile.sql) dan
[verify_module_progress.sql](../backend/verify_module_progress.sql) kedua-duanya
**PASS**. Profil sendiri, medan identiti/role yang tidak boleh ditukar, metrik
room, pemilikan rekod dan kelas, validasi payload, pencapaian tidak boleh
undur, serta sekatan anon/jadual terus diuji. Semua fixture Auth/kelas/rekod
di-rollback. Sebelum dan selepas ujian: dua profil sedia ada; sifar kelas,
room, percubaan dan rekod kemajuan. Tiada kata laluan akaun sebenar diubah.

Semakan advisor merekodkan INFO RLS tanpa policy pada 17 jadual private/RPC-only;
kebenaran akses terus authenticated disahkan tiada. Amaran sedia ada
[leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
kekal di luar skop migration. Tiada dakwaan semua amaran keselamatan sudah selesai.

Penolakan kelulusan automatik terdahulu ialah sejarah sebelum kebenaran khusus
pengguna diterima. Ia diselesaikan melalui kebenaran tersebut, kemudian operasi
migration asal dilaksanakan; tiada laluan pemintasan digunakan.

GitHub Pages awam kini menggunakan **main-digitalized /(root)** pada
`unDead41/geodecoder-digital`. Commit public akhir
`f5e5e13edd4c3627282cdaca78870c13399ac915` mempunyai workflow
[40272514912](https://github.com/unDead41/geodecoder-digital/actions/runs/40272514912)
**completed/success**. HTML HTTPS live memberi 200 dan hash sepadan tepat dengan
binaan yang diuji; kedua-dua MP3 dan `release.json` juga memberi 200.

Pada Chrome live: Home → tetamu Release QA → Practice15 → piramid R1 dan
bentangan sepadan R2 memberi **1/15**. Modul **v1.5.0** dibuka; Settings modul
membuka dialog parent. English dan 150% diterima kedua-duanya, computed font
16px →24px, modul client/scroll1204/1204; BM/100% dipulihkan selepas ujian.
Ujian akaun/RPC hosted melalui fixture SQL tidak membuktikan login/password
provider sebenar atau penghantaran email.

Resit lengkap dan screenshot sebenar:
[deployment-v2.6-20261026.json](integration-evidence/deployment-v2.6-20261026.json).
Schema pemasangan baharu sudah merangkumi kontrak sama. Backend Duel kekal
berasingan; SMTP dan URL redirect email tidak diubah oleh deployment ini.

## Binaan yang boleh diulang

```sh
cd digital
npm ci
npm test
npm run build
npm run prepare:pages
npm run check
cd module
npm test
npm run build
npm run check
```

`prepare:pages` memeriksa kesamaan alias sebelum menulis root index. Pin modul
dan Git blob canonical berada dalam `vendor/module-release.json`.
Dependency runtime kekal dipin. JSDOM/PGlite hanya digunakan untuk ujian.

## Pengesahan keluaran

- **248/248** ujian aplikasi dan **244/244** ujian modul lulus: jumlah **492**,
  sifar gagal dan sifar skip. Log penuh: [aplikasi](integration-evidence/app-tests.log)
  dan [modul](integration-evidence/module-tests.log).
- Kedua-dua build/check lulus. Checker aplikasi mengesahkan 150 ID, ARIA, bank,
  pin dan aset; firmware checker mengekalkan v1.1.3. Alias dan root index identik.
- Semakan bebas dan regresi SDK sebenar dengan storan Auth dikongsi menemui lalu
  membetulkan risiko payload akaun A dihantar dengan JWT B. RPC kini menyemak
  SDK sebenar, mengikat token permintaan dan pemilik paparan; respons lama ditolak.
  Reset recovery diikat kepada sesi disahkan, termasuk refresh yang sah.
- Pelayar cloud Chrome pada pratonton sebenar: Home → tetamu → Practice15 →
  panduan → R1 kubus → R2 bentangan kubus memberi **1/15**. Rich text, urutan
  pembaca dan pilihan mod tersedia. Tiada Auth/room sebenar digunakan.
- Modul V1.5 terbenam menerima BM/English, tema gelap dan reduced motion.
  Rekod tetamu 4/4 dipulihkan. Settings mengekalkan modul semasa bahasa/teks berubah.
- Pepijat skala fon diperbetulkan pada kedua-dua style block: CSS computed body
  **16px pada100% →24px pada150%**, dimensi model tidak ditukar oleh penyesuai.
- Harness viewport CSS sebenar: aplikasi320px client/scroll310/310; aplikasi390px
 380/380; modul terbenam masing-masing266/266 dan336/336. Keempat-empat makmal
  pada320px150% kekal266/266; dialog Settings244/244. Tiada overflow mendatar
  dalam senario ini. Ini viewport berbingkai, bukan telefon fizikal.
- Label profil icon-only kini mempunyai aria-label terjemahan. Suara tempatan
  tiada pada pelayar ujian; butang dimatikan dengan transkrip/fallback jelas.
- Ujian PostgreSQL fixture menguji kedua-dua susunan migration, akses kelas,
  pemilikan profil dan rekod, serta larangan menukar peranan/menulis terus.
  Ini PGlite/fixture rollback, bukan deployment atau Auth hosted sebenar.

Artifak standalone/root: **6654237 bait**, SHA256
`aef9b6e51c7b02fb80aa0a10a9ef154e3b81edffadda5bbe634c4bb9d437ea34`.
Website dengan audio on-demand: **1097468 bait**, SHA256
`c37c2b1fcac5abb51263a67a14332779b9b01cdb96d39e264465b2934c306960`.
Modul canonical: **315817 bait**, SHA256
`45bfc66bd7f1edaca7672c618ce6833c3f1e87a38ba3a334df18a0b11413d5c7`.
Sumber pin modul: `fc9bda734f8b59825271a7cc4b91c101cb30bdde`.

Laporan branch lama dikekalkan sebagai bukti sejarah, bukan pengesahan keluaran ini.

## Pengurusan branch

Nama pembangunan canonical mengikuti `digitalized-<kategori>-<subkategori>`;
`main-digitalized` kekal pengecualian khusus penerbitan. Rujuk
[BRANCH_ARCHITECTURE.md](BRANCH_ARCHITECTURE.md) untuk pemetaan beku dan
status operasi sebenar. Rename memelihara SHA dan sejarah; tiada pemadaman ref
atau salinan alias digunakan untuk menyamar sebagai rename.

Kesemua **11 native rename sudah selesai** dan disahkan semula melalui senarai
remote penuh: semua SHA asal sepadan, semua nama lama tiada, dan tujuh ref
firmware/perkakasan tidak berubah. Pemetaan beku kekal; head branch kerja tidak
direset kepada hasil integrasi. Resit lengkap:
[branch-migration-final.json](integration-evidence/branch-migration-final.json).

Repository sumber private dan repository frontend public kekal berasingan.
GitHub Pages awam memerlukan source branch `main-digitalized` ditetapkan pada
repository frontend. Push sumber sahaja tidak menukar tetapan Pages.

## Resit penerbitan kod

| Operasi | Hasil disahkan |
|---|---|
| Kod integrasi `unDead41/geodecoder` / `main-digitalized` | `6246d06ab492a5b0ab3edb3d5ee7b25bcc84b081`; tree `839b68bfb6323bac386eed9b4b33a68e873a0808` |
| Ancestry sumber | Kesemua 11 head sumber beku ialah parent tambahan commit integrasi; sejarah MD terdahulu melalui commit modul `fc9bda734f8b59825271a7cc4b91c101cb30bdde` |
| Resit penamaan branch sebelum deployment | `0d51bda7d63f3a88865a0922230eda175eb47177`; kandungan runtime kekal sama |
| Frontend public semasa | `unDead41/geodecoder-digital` / `main-digitalized` / `f5e5e13edd4c3627282cdaca78870c13399ac915` |
| Pages disimpan dan dibaca semula | `Deploy from a branch`, **main-digitalized**, **/(root)** |
| Workflow akhir | `40272514912`, **completed/success** |
| Database hosted | Migration **20261026050330** berjaya; kedua-dua suite SQL hosted PASS dan fixture di-rollback |

Commit dokumentasi/resit susulan boleh memajukan head sumber tanpa mengubah
blob aplikasi yang diuji. SHA kod mengenal pasti payload v2.6; SHA commit resit
sendiri dilaporkan selepas commit itu wujud. `release.json` public kini
merekodkan kedua-dua migration dan pertukaran Pages sebagai dilaksanakan.

## Had bukti

Unit/geometri, DOM simulasi, database fixture dan pelayar sebenar dilaporkan
berasingan. Tiada dakwaan telefon fizikal, screen reader, audio manusia,
penghantaran email, beban kelas besar atau ujian ESP32. Ketiadaan suara tempatan
mengekalkan transkrip. Hasil Auth dalam fixture tidak membuktikan perubahan
kata laluan atau logout peranti sebenar.
