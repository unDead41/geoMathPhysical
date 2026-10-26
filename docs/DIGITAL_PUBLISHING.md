# GeoDecoder Digital — penerbitan semasa

Kod gabungan Digital **v2.6.0** dan modul **v1.5.0** telah diterbitkan ke sumber
private `unDead41/geodecoder`, branch **main-digitalized**. Frontend pada branch
bernama sama dalam mirror awam **sudah aktif di GitHub Pages**. Migration hosted
profile/progress telah dipasang selepas kebenaran pengguna yang jelas.
Firmware kekal **v1.1.3**.
Tarikh semakan: 26 Oktober 2026 (Malaysia).

## Rekod keluaran dan status sebenar

| Perkara | Rekod disahkan | Status |
|---|---|---|
| Kod integrasi private | `unDead41/geodecoder` / `main-digitalized` / `6246d06ab492a5b0ab3edb3d5ee7b25bcc84b081` | Push sumber selesai; commit dokumentasi susulan boleh memajukan head tanpa menukar identiti payload ini. |
| Sumber modul canonical | `fc9bda734f8b59825271a7cc4b91c101cb30bdde` | Modul v1.5.0 dipin dalam keluaran gabungan. |
| Frontend awam aktif | `unDead41/geodecoder-digital` / `main-digitalized` / `f5e5e13edd4c3627282cdaca78870c13399ac915` | Metadata deployment dikemas kini; payload aplikasi yang telah diuji dikekalkan. |
| Tetapan Pages yang disimpan | Repository awam, `main-digitalized`, `/(root)` | Save selesai; tetapan dibaca semula selepas reload. |
| Workflow Pages terakhir yang disahkan | [40272514912](https://github.com/unDead41/geodecoder-digital/actions/runs/40272514912) | `completed/success` untuk commit awam semasa. Deployment awal v2.6.0 juga berjaya melalui [40272415997](https://github.com/unDead41/geodecoder-digital/actions/runs/40272415997). |
| Migration profile/progress hosted | `geodecoder_profile_and_module_progress_v2_6`, versi `20261026050330` | Berjaya pada projek GeoDecoder Digital `fkrlwzxvyufndavlpzbp`, menggunakan SQL profile/progress dengan hash yang telah disemak. |
| Pengesahan PostgreSQL hosted | `verify_profile.sql` dan `verify_module_progress.sql` | Kedua-duanya PASS; semua fixture sintetik di-ROLLBACK. |

Bilangan rekod sebenar sebelum/selepas pengesahan kekal: profiles **2**, classes
**0**, rooms **0**, attempts **0**, progress **0**. Migration struktur/kontrak
telah digunakan; fixture ujian tidak dikekalkan. `release.json` awam kini
merekodkan flag Pages/profile/progress sebagai true.

HTTP live memberikan **200**, **1,097,468 bait** dan SHA256
`c37c2b1fcac5abb51263a67a14332779b9b01cdb96d39e264465b2934c306960`,
sepadan artifak yang diuji. Kedua-dua MP3 juga HTTP 200. Chrome pada URL sebenar
mengesahkan Practice15: piramid R1 bersama bentangan padan di R2 memberi **1/15**.
Modul v1.5.0 dan butang Tetapan yang membuka dialog parent berfungsi. English dan
150% disegerakkan; computed font parent/modul berubah **16→24px**. Lebar/scroll
modul ialah **1204/1204px** dalam senario desktop ini. Tetapan dipulihkan kepada
BM/100% selepas semakan.

URL awam kekal [GeoDecoder Digital](https://undead41.github.io/geodecoder-digital/).
Push ke repository private atau kewujudan branch mirror tidak mengubah tetapan
Pages. Sumber private kekal private; mirror mengandungi frontend sahaja. Backend,
fixture akaun, credential server dan rekod pengguna tidak disalin ke mirror.

## Binaan dan sumber artifak

Bina modul dahulu apabila sumber modul berubah, sahkan hasilnya dan kemas kini
pin/provenance vendor mengikut prosedur integrasi. Kemudian jalankan dari akar
repository sumber:

```sh
cd digital
npm ci
npm test
npm run build
npm run prepare:pages
npm run check
```

`prepare:pages` menyediakan root `index.html` dalam repository sumber; ia tidak
menolak fail ke mirror awam atau menukar tetapan GitHub Pages.

| Artifak | Kegunaan | Rekod payload v2.6.0 |
|---|---|---|
| `digital/artifacts/GeoDecoder_Digital_V2.html` | Fail offline canonical; root `index.html` private dan semua alias HTML mesti byte-identik dengannya | 6,654,237 bait; SHA256 `aef9b6e51c7b02fb80aa0a10a9ef154e3b81edffadda5bbe634c4bb9d437ea34` |
| `digital/artifacts/site-index.html` | `index.html` pada mirror Pages; audio dimuat selepas interaksi | 1,097,468 bait; SHA256 `c37c2b1fcac5abb51263a67a14332779b9b01cdb96d39e264465b2934c306960` |
| Modul canonical | HTML modul v1.5.0 yang dipin | 315,817 bait; SHA256 `45bfc66bd7f1edaca7672c618ce6833c3f1e87a38ba3a334df18a0b11413d5c7` |

Mirror awam menyertakan `index.html`, `assets/audio/menu.mp3`,
`assets/audio/map.mp3`, `.nojekyll`, README penerbitan dan `release.json`.
Versi offline membenamkan kedua-dua audio; payload Pages menggunakan fail audio
berasingan. Oleh itu hash index private dan index mirror memang berbeza.

## Kemas kini keluaran seterusnya

1. Sahkan head remote dan payload sumber yang hendak diterbitkan. Jalankan ujian,
   build/check serta senario pelayar yang berkaitan. Rekod versi, SHA dan hash.
2. Semak migration yang sudah dipasang dan gunakan perubahan backend yang
   diperlukan bagi keluaran seterusnya; sahkan kontrak akhirnya. Profile/progress
   v2.6.0 pada projek hosted di atas sudah dipasang. Database baharu menggunakan
   schema lengkap; database sedia ada menggunakan migration yang berkenaan.
   Backend Duel kekal berasingan. SMTP dan redirect email masih prasyarat
   berasingan, bukan hasil daripada push frontend.
3. Pastikan commit mirror `main-digitalized` mengandungi payload frontend yang
   betul. Gunakan expected-head ketika mengemas kini mirror; jangan menimpa head
   yang berubah. `release.json` merekodkan SHA sumber dan hash payload. SHA commit
   penerbitan direkodkan selepas commit itu wujud.
4. Kekalkan Settings → Pages pada repository **awam**: Source **Deploy from a
   branch**, branch **main-digitalized**, folder **/(root)**. Jika konfigurasi
   berubah, simpan dan baca semula tetapan; pemilih tanpa Save bukan pengesahan.
5. Tunggu workflow bagi SHA mirror baharu selesai berjaya. Semak URL HTTPS,
   versi, hash HTML/aset dan aliran pengguna yang berkenaan. Catat ujian hosted
   sebenar berasingan daripada fixture dan pratonton.

Kod telah lulus **248 ujian aplikasi +244 ujian modul**, build/check dan senario
Chrome yang direkodkan dalam [RELEASE_V2_6.md](../digital/docs/RELEASE_V2_6.md).
Bukti kod, migration hosted dan smoke test live di atas direkodkan secara
berasingan. Tiada dakwaan penghantaran email, perubahan kata laluan akaun sebenar,
logout peranti, aliran kelas dengan akaun sebenar atau ujian telefon fizikal.
Pemetaan branch dan pemilik komponen berada dalam
[BRANCH_ARCHITECTURE.md](../digital/docs/BRANCH_ARCHITECTURE.md); rekod Pages serta
bukti keluaran terdahulu berada dalam [GITHUB_PAGES.md](../digital/docs/GITHUB_PAGES.md).

## Bukti sejarah persediaan lama

Pada peringkat persediaan v2.6.0, semakan kelulusan automatik menolak migration
hosted kerana kebenaran pengguna belum jelas. Tindakan ditahan ketika itu.
Selepas pengguna memberi kebenaran jelas, migration dan pengaktifan Pages
diselesaikan seperti rekod semasa di atas. Flag false pada commit persediaan
`2058c89ff77521be0d57115744554b44372ec3aa` dan resit awal ialah sejarah,
bukan status deployment terkini.

Persediaan private terdahulu menggunakan branch `main-digital`, kini dipetakan
kepada `digitalized-release-legacy`. Sumber BM/English ialah `digital-dwi` pada
`b8f7360fc15cb7b23666b092ade8e1d2058878bb`, berasaskan `digitalize` v1.1.0 pada
`55a79849d5007ec53a9b877cd20877c9bf15aa8d`. Artifak digital ketika itu v1.2.0;
firmware rujukan v1.1.3. Rekod DWI menyatakan 45 ujian dan lapan senario Chrome.

Ketika persediaan itu, Settings Pages repository private menunjukkan keperluan
naik taraf pelan atau menjadikan repository public. Branch sahaja tidak
mengaktifkan hosting. Penyelesaian yang diterima ialah mirror frontend public
berasingan; visibility sumber dan langganan tidak diubah. Rekod lama itu bukan
arahan menggunakan `main-digital` bagi keluaran baharu dan bukan dakwaan pelan
GitHub semasa.
