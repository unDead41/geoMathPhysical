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
