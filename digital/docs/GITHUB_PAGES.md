# GeoDecoder Digital — GitHub Pages

Laman: https://undead41.github.io/geodecoder-digital/ . Repository public `unDead41/geodecoder-digital`, branch `main-digital`, source Pages `/(root)`, HTTPS. Pakej ini v2.2.0. `release.json` pada repository laman merekodkan SHA sumber/penerbitan serta hash HTML/aset.

Sumber pembangunan kekal pada repository private `unDead41/geodecoder`, branch `digitalize`. Branch `main-digital` dalam repository private ialah persediaan lama, bukan source Pages live. Visibility repository asal tidak perlu diubah. Modul dipinkan daripada commit `92c12c3a07ec250c03a73decaf52a654fc26d502` pada `digitalize-module`; branch modul asal tidak diubah.

## Fail penerbitan

`index.html` datang daripada `artifacts/site-index.html`, dengan CSS/JS dan modul dibenamkan. `assets/audio/menu.mp3` dan `assets/audio/map.mp3` dimuat selepas interaksi pertama; sertakan kedua-duanya bersama `.nojekyll`, `README.md` dan `release.json`. Tiada backend, firmware, credential server atau rekod pengguna diterbitkan. HTML muat turun berasingan membenamkan kedua-dua audio untuk kegunaan offline.

## Kemas kini

1. Uji sumber: `npm test`, `npm run build`, `npm run check`.
2. Deploy migration/Edge Function yang berubah, selepas semakan keselamatan dan keserasian.
3. Salin site-index dan kedua-dua audio; kemas kini release.json. Commit frontend sahaja ke repository laman `main-digital` menggunakan expected-head lease.
4. Tunggu workflow Pages bagi SHA baharu completed/success. Semak URL HTTPS sebenar: versi, Guest/game, modul/panduan, borang email, pertukaran muzik dan toggle.

Push ke repository private sahaja tidak menyegerakkan laman. Tiada token baharu atau automation cross-repository diwujudkan. Penghantaran email umum memerlukan custom SMTP dan Site URL/redirect allowlist: lihat EMAIL_SETUP.md. Kejayaan build tidak membuktikan email sampai.

## Penerbitan v2.2.0 disahkan

Sumber kod: `a692a2d2be8002f4c9bf7a9b8a504185c00265ba`. Commit public: `e92330fd0f8bd9e08d78f4827766e5266d85f939`. Workflow https://github.com/unDead41/geodecoder-digital/actions/runs/40228391375 completed/success. HTTP index dan kedua-dua MP3 memberikan 200; hash HTML live sepadan binaan.

Chrome pada URL live memaparkan V2.2.0. Guest berjaya bermain dan satu pasangan tepat memberi 1 markah. Data paparan muzik menunjukkan menu/playing pada Guest, map/playing pada game dan modul, serta menu/playing apabila kembali Home. Modul sebenar dengan kawalan dan nota dipaparkan. Navigasi Panduan dalam iframe berjaya mencapai about:srcdoc#panduan, tetapi extension browser menolak pemeriksaan lanjut pada URL frame tersebut kerana manifest permission. Ujian panduan dalam pratonton cloud sudah lulus. Tiada dakwaan console bersih atau penghantaran email sebenar.

## Semakan akhir v2.2.0

Kod sumber: `390ab00fec1997efe2ad15188f2148ecd5f1b630`. Public: `686a4593d28522f2b7de960c252771f9b654f55c`. Workflow https://github.com/unDead41/geodecoder-digital/actions/runs/40229448318 completed/success. HTML live200/570119bytes/SHA256 `442ab480d7881f2f340a4557913f6805509eb6ff2427daeb5efc50d7b0f3881c` sepadan binaan. Semua62fail sumber sepadan dan repository asal kekal private.

Chrome sebenar pada keluaran akhir: klik pertama Matikan muzik menghasilkan off; Hidupkan muzik menghasilkan playing. Borang login email/username, terlupa kata laluan email-only, dan signup dengan email dipaparkan. Screenshot akhir blank signup disimpan sebagai bukti; tiada credential pengguna dimasukkan. Guest1markah serta menu/map game/module telah disahkan pada penerbitan awal dengan controller muzik yang sama; hotfix akhir membetulkan gesture toggle sahaja. 81/81 ujian dan pemeriksa statik lulus. SMTP serta Site URL/redirect dashboard masih perlu diselesaikan oleh pemilik selepas log masuk; inbox delivery tidak diuji atau didakwa.
