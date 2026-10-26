# GeoDecoder Digital — GitHub Pages

Sumber canonical ialah repository private `unDead41/geodecoder`, branch
**main-digitalized**. Frontend awam diterbitkan secara berasingan dalam
`unDead41/geodecoder-digital`. Branch mirror aktif juga **main-digitalized**,
folder **/(root)**. Repository sumber kekal private.

**Status 26 Oktober 2026:** kod Digital v2.6.0/modul v1.5.0 telah diterbitkan ke
branch sumber dan **sudah live di Pages**. Tetapan **main-digitalized /(root)**
telah disimpan dan dibaca semula selepas reload. Migration hosted profile/progress
berjaya selepas kebenaran pengguna; workflow, hash HTTP dan smoke test live
disahkan seperti rekod di bawah.

## Commit dan payload aktif

| Rujukan | Nilai disahkan |
|---|---|
| Commit kod integrasi private | `6246d06ab492a5b0ab3edb3d5ee7b25bcc84b081` |
| Sumber modul v1.5.0 | `fc9bda734f8b59825271a7cc4b91c101cb30bdde` |
| Commit mirror awam `main-digitalized` | `f5e5e13edd4c3627282cdaca78870c13399ac915` |
| Index mirror, daripada `digital/artifacts/site-index.html` | 1,097,468 bait; SHA256 `c37c2b1fcac5abb51263a67a14332779b9b01cdb96d39e264465b2934c306960` |
| Git blob index mirror | `fb91b41ab062ace14acd9589c2c463774b4b0593` |
| Git blob `assets/audio/menu.mp3` | `84aa7525f2c4a04cfd8ac750ad79fec77353e32f` |
| Git blob `assets/audio/map.mp3` | `0ef77140fbee08967839da0b1a1fa6770e337c18` |

Payload frontend mula disediakan pada commit
`2058c89ff77521be0d57115744554b44372ec3aa`; kedua-dua audio dikekalkan. Commit
awam semasa mengemas kini metadata deployment tanpa menukar payload aplikasi
yang telah diuji. `release.json` merekodkan sumber, versi, hash, pengesahan kod
serta flag `pagesSourceChanged`, `profileMigrationApplied` dan
`moduleProgressMigrationApplied` yang kini **true**.

`main-digital` private ialah sejarah persediaan yang dipetakan kepada
`digitalized-release-legacy`. Ia bukan branch `main-digital` dalam repository
awam yang menghidangkan keluaran lama sebelum pertukaran ini. Nyatakan repository
bersama nama branch
ketika menyemak atau mengubah tetapan.

## Fail penerbitan dan pengesahan

Mirror menyertakan `index.html`, `assets/audio/menu.mp3`, `assets/audio/map.mp3`,
`.nojekyll`, README penerbitan dan `release.json`. Index Pages membenamkan CSS/JS
serta modul, tetapi audio dimuat selepas interaksi pertama. Fail offline
berasingan membenamkan kedua-dua audio. Root index dalam sumber private sepadan
byte demi byte dengan artifak offline, bukannya index Pages yang lebih kecil.
Tiada backend, firmware, credential server atau rekod pengguna diterbitkan ke
mirror.

Jalankan daripada akar sumber private selepas modul/pin canonical disahkan:

```sh
cd digital
npm test
npm run build
npm run prepare:pages
npm run check
```

`prepare:pages` menyediakan root index private; ia tidak melakukan push mirror
atau mengubah Pages. Salin `artifacts/site-index.html` ke index mirror, sertakan
aset yang diperlukan, dan kemas kini metadata keluaran. Gunakan expected-head
ketika menolak frontend supaya head yang bergerak tidak ditimpa.

## Deployment v2.6.0 yang disahkan

Pengguna telah memberi kebenaran jelas untuk migration hosted dan pengaktifan
Pages. Migration gabungan **geodecoder_profile_and_module_progress_v2_6**, versi
**20261026050330**, berjaya pada projek Supabase GeoDecoder Digital
`fkrlwzxvyufndavlpzbp`. Kandungan profile/progress menggunakan hash SQL yang sama
dengan semakan sebelum deployment. Pengesahan hosted `verify_profile.sql` dan
`verify_module_progress.sql` kedua-duanya **PASS**; semua fixture sintetik
**ROLLBACK**. Bilangan rekod sebenar sebelum/selepas kekal profiles **2**, classes
**0**, rooms **0**, attempts **0**, progress **0**.

Settings → Pages dalam repository **unDead41/geodecoder-digital** telah disimpan
sebagai **Deploy from a branch → main-digitalized → /(root)**. Reload tetapan
mengesahkan sumber itu kekal. Workflow
[40272514912](https://github.com/unDead41/geodecoder-digital/actions/runs/40272514912)
untuk commit awam semasa selesai **completed/success**. Deployment awal v2.6.0
pada commit `2058c89ff77521be0d57115744554b44372ec3aa` juga berjaya melalui
[40272415997](https://github.com/unDead41/geodecoder-digital/actions/runs/40272415997).

[URL HTTPS sebenar](https://undead41.github.io/geodecoder-digital/) memberi
**HTTP 200**, **1,097,468 bait**, SHA256
`c37c2b1fcac5abb51263a67a14332779b9b01cdb96d39e264465b2934c306960`:
sepadan payload yang diuji. Kedua-dua MP3 memberikan **HTTP 200**. Ini pengesahan
live, berasingan daripada hasil build/check setempat.

Chrome pada URL live mengesahkan:

- Tetamu **Practice15**: piramid R1 dan bentangan padan R2 memberi **1/15**.
- Modul **v1.5.0** dibuka; butang Tetapan modul membuka dialog parent yang sama.
- English serta saiz teks150% disegerakkan. Computed font parent dan modul
  berubah **16→24px**; lebar/scroll modul desktop **1204/1204px**. Tetapan
  dipulihkan kepada BM/100% selepas ujian.

Tiada dakwaan perubahan kata laluan akaun sebenar, logout peranti, penghantaran
email, aliran guru/pelajar dengan akaun sebenar atau ujian telefon fizikal.
SMTP serta Site URL/redirect allowlist email kekal keperluan berasingan;
kejayaan migration dan Pages tidak membuktikan email sampai.

Untuk keluaran seterusnya, sahkan migration yang diperlukan dan kontrak hosted,
kemas kini mirror melalui expected-head, kekalkan source Pages di atas, kemudian
semak workflow bagi SHA baharu serta hash dan aliran pengguna pada HTTPS sebenar.

Rujukan aktif: [penerbitan semasa](../../docs/DIGITAL_PUBLISHING.md),
[RELEASE_V2_6.md](RELEASE_V2_6.md), [BRANCH_ARCHITECTURE.md](BRANCH_ARCHITECTURE.md)
dan [EMAIL_SETUP.md](EMAIL_SETUP.md).

## Riwayat persediaan v2.6.0

Semakan kelulusan automatik pada peringkat awal menolak migration hosted kerana
kebenaran pengguna belum jelas; tindakan dan pertukaran Pages ditahan ketika itu.
Selepas pengguna memberi kebenaran jelas, migration dan pengaktifan diselesaikan
seperti rekod semasa. Flag false pada metadata commit persediaan `2058c89` dan
rekod Pages lama `main-digital` ialah sejarah, bukan status aktif. Workflow lama
`40249504326` merujuk v2.3.0 sahaja.

## Bukti keluaran terdahulu

Semua seksyen berikut ialah rekod sejarah daripada penerbitan `main-digital`
awam sebelum integrasi ini. SHA, workflow dan ujian lamanya dikekalkan sebagai
bukti keluaran berkenaan; ia bukan arahan branch aktif atau pengesahan v2.6.0.

## Penerbitan v2.2.0 disahkan — sejarah

Sumber kod: `a692a2d2be8002f4c9bf7a9b8a504185c00265ba`. Commit public: `e92330fd0f8bd9e08d78f4827766e5266d85f939`. Workflow https://github.com/unDead41/geodecoder-digital/actions/runs/40228391375 completed/success. HTTP index dan kedua-dua MP3 memberikan 200; hash HTML live sepadan binaan.

Chrome pada URL live memaparkan V2.2.0. Guest berjaya bermain dan satu pasangan tepat memberi 1 markah. Data paparan muzik menunjukkan menu/playing pada Guest, map/playing pada game dan modul, serta menu/playing apabila kembali Home. Modul sebenar dengan kawalan dan nota dipaparkan. Navigasi Panduan dalam iframe berjaya mencapai about:srcdoc#panduan, tetapi extension browser menolak pemeriksaan lanjut pada URL frame tersebut kerana manifest permission. Ujian panduan dalam pratonton cloud sudah lulus. Tiada dakwaan console bersih atau penghantaran email sebenar.

## Semakan akhir v2.2.0 — sejarah

Kod sumber: `390ab00fec1997efe2ad15188f2148ecd5f1b630`. Public: `686a4593d28522f2b7de960c252771f9b654f55c`. Workflow https://github.com/unDead41/geodecoder-digital/actions/runs/40229448318 completed/success. HTML live200/570119bytes/SHA256 `442ab480d7881f2f340a4557913f6805509eb6ff2427daeb5efc50d7b0f3881c` sepadan binaan. Semua62fail sumber sepadan dan repository asal kekal private.

Chrome sebenar pada keluaran akhir: klik pertama Matikan muzik menghasilkan off; Hidupkan muzik menghasilkan playing. Borang login email/username, terlupa kata laluan email-only, dan signup dengan email dipaparkan. Screenshot akhir blank signup disimpan sebagai bukti; tiada credential pengguna dimasukkan. Guest1markah serta menu/map game/module telah disahkan pada penerbitan awal dengan controller muzik yang sama; hotfix akhir membetulkan gesture toggle sahaja. 81/81 ujian dan pemeriksa statik lulus. SMTP serta Site URL/redirect dashboard masih perlu diselesaikan oleh pemilik selepas log masuk; inbox delivery tidak diuji atau didakwa.

## Penerbitan v2.3.0 disahkan — sejarah

Kod digitalize: `01696af497cd7fca8e299f9c1b8a6407333ce276`. Penerbitan public main-digital: `8cce135102618ffad2c1de46063fcb5042ba0907`. Workflow https://github.com/unDead41/geodecoder-digital/actions/runs/40249504326 completed/success. HTTP200, HTML625381bytes, SHA256 `18bb17822161439fd4566a1c81e0871494f9e9d0a1053b36ab4757d935cfc999` sepadan dengan binaan. Branch digitalize-module masih pada pin931a0150397bfb3fd79ef3c8da6684167d1c6aad; tiada perubahan di luar digital/ pada branch integrasi.

Chrome sebenar pada URL HTTPS live memaparkan DigitalV2.3.0 dan modulV1.2.0. Home → Teroka modul → Makmal interaktif membuka semua empat pilihan. Bina Bentangan memulakan lipatan dan melaporkan susunan sah; tab seterusnya menghentikan playback. Penuhkan pada ukuran3×2×3 memberikan18/18kiub dan18cm³; Pilih semua permukaan pada kubus sisi4 memberikan96cm² danL=6a². Bongkah Gabungan dibuka dengan hasil264cm³ serta penerangan240cm² pada contoh asal. State parent menunjukkan map/playing sepanjang modul. Satu screenshot sebenar menunjukkan versi, empat pilihan makmal, model dan grid.

Semakan ini ialah smoke test integrasi desktop, berasingan daripada100ujian modul dan81ujian aplikasi. Ia tidak mengulangi seluruh audit sentuhan/mobile atau mendakwa ujian fizikal. SMTP/redirect email masih status tetapan pemilik daripada keluaran sebelumnya; integrasi modul ini tidak mengubahnya.
