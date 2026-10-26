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

Untuk database sedia ada selepas email v2.2:

1. Jalankan `backend/profile_v2_3.sql` sebagai owner.
2. Jalankan `backend/module_progress_v2_4.sql` sebagai owner.
3. Deploy frontend v2.6.0 selepas kedua-duanya berjaya.

Schema untuk pemasangan baharu sudah merangkumi kedua-dua definisi. Backend
Duel kekal berasingan di `backend/duel/`; jangan menggantikannya dengan schema
kelas atau sebaliknya. Security/preferences tidak memerlukan perubahan Auth
dashboard baharu. SMTP dan URL redirect email ialah keperluan deployment
terdahulu yang berasingan.

Tugasan penyelarasan ini menyediakan kod/migration dan menguji fixture.
Ia tidak menukar kata laluan akaun sebenar atau memasang migration hosted
secara tersembunyi. Kegagalan cloud mengekalkan rekod setempat dan boleh dicuba semula.

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

Repository sumber private dan repository frontend public kekal berasingan.
GitHub Pages awam memerlukan source branch `main-digitalized` ditetapkan pada
repository frontend. Push sumber sahaja tidak menukar tetapan Pages.

## Had bukti

Unit/geometri, DOM simulasi, database fixture dan pelayar sebenar dilaporkan
berasingan. Tiada dakwaan telefon fizikal, screen reader, audio manusia,
penghantaran email, beban kelas besar atau ujian ESP32. Ketiadaan suara tempatan
mengekalkan transkrip. Hasil Auth dalam fixture tidak membuktikan perubahan
kata laluan atau logout peranti sebenar.
