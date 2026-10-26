# GeoDecoder Digital v2.2.0

Email signup dengan pengesahan, login email/username, pautan terlupa kata laluan, pengesahan dua medan kata laluan baharu, resend dengan cooldown, ralat pautan luput, dan pemulihan kod untuk akaun lama. Trigger Auth menyediakan profil secara atomik dan hanya memproses namespace GeoDecoder; peranan kekal pada profil peribadi. Database aplikasi lain yang berkongsi Auth tidak diprovisikan oleh trigger ini.

Muzik menu `rest_site_bg` dan muzik modul/game `when_open_map_bg` datang daripada lampiran pengguna. Durasi penuh: 180.062s dan 167.184s; MP3 96 kbps stereo, 44.1 kHz, jumlah 4,167,575 bytes. Satu elemen Audio, volume 0.22, menunggu user gesture, preference hidup/mati disimpan, tab tersembunyi dijeda. Bunyi kesan kuiz kekal berasingan.

Home membuka modul sebenar v1.1.0 dalam iframe `allow-scripts allow-popups`, tanpa akses asal parent. Sumber pin: `unDead41/geodecoder`, `digitalize-module`, commit `92c12c3a07ec250c03a73decaf52a654fc26d502`, path `digital/module/GeoDecoder_Modul_V1.html`, Git blob `2ad2f482dd6b356cd4842b7f4fab911b11b59521`. Kandungan/geometri asal tidak diubah. Parent mengurus muzik dan membuang iframe apabila ditutup.

Semakan tempatan: 81/81 unit tests, build, pemeriksa 98 ID/ARIA/aset/sintaks/bank. Checker menangkap dan membetulkan pengembangan `$&` dalam replacement string pembina; replacement kini menggunakan callback. Kedua-dua audio didekod penuh tanpa ralat. SQL email signup/rollback/ACL/role/lookup dan suite kelas/bilik penuh lulus pada projek hosted, semua fixture dibatalkan.

Pratonton sebenar memaparkan email signup, email/username login, email-only forgotten-password, dan iframe modul dengan kawalan geometri/nota. Pembungkus iframe menukar pautan fragment kepada `about:srcdoc#...`; klik Panduan disahkan kekal dalam modul selepas pembetulan. Fail vendor asal kekal byte-identical. Tiada credential sebenar dimasukkan atau email reset sebenar dihantar dalam ujian browser. Custom SMTP serta tetapan Site URL/redirect dashboard masih memerlukan penyelesaian selepas pemilik log masuk; lihat EMAIL_SETUP.md. Laporan ini tidak mendakwa penghantaran email end-to-end sudah lulus.

Semakan kod tambahan mengesan borang reset hilang selepas reload. Intent per-tab kini mengandungi UUID pengguna/sesi dan luput 30 minit sahaja; tiada token atau kata laluan. Restore mengesahkan sesi dengan Auth, dipadankan kepada sesi semasa, dan dibuang selepas reset/logout. Ujian turut mengesahkan respons lama tidak membenarkan reset selepas akaun bertukar.

Keluaran public `e92330fd0f8bd9e08d78f4827766e5266d85f939` diterbitkan melalui Pages workflow 40228391375 completed/success. Edge auth v3 ACTIVE, projek ACTIVE_HEALTHY. Smoke check CORS204 dan inputinvalid400 lulus tanpa mencipta akaun. Bacaan semula61fail sumber sepadan dan tiada fail di luar digital/ berubah. HTML live dan audio200, hash sepadan. Guest1markah dan pertukaran menu/map disahkan dalamChrome sebenar. Butang toggle diuji oleh12unitmusic tests; percubaan semakan lanjut browser selepas Panduan terhalang permission iframe extension.

Hotfix semakan browser: pointerdown muzik tidak lagi memulakan audio sebelum butang mute memproses klik. Ikon dikekalkan semasa perubahan status playback supaya sasaran klik tidak dibuang di tengah gesture. Dua ujian regresi baharu lulus; jumlah81/81.

## Semakan akhir v2.2.0

Kod sumber: `390ab00fec1997efe2ad15188f2148ecd5f1b630`. Public: `686a4593d28522f2b7de960c252771f9b654f55c`. Workflow https://github.com/unDead41/geodecoder-digital/actions/runs/40229448318 completed/success. HTML live200/570119bytes/SHA256 `442ab480d7881f2f340a4557913f6805509eb6ff2427daeb5efc50d7b0f3881c` sepadan binaan. Semua62fail sumber sepadan dan repository asal kekal private.

Chrome sebenar pada keluaran akhir: klik pertama Matikan muzik menghasilkan off; Hidupkan muzik menghasilkan playing. Borang login email/username, terlupa kata laluan email-only, dan signup dengan email dipaparkan. Screenshot akhir blank signup disimpan sebagai bukti; tiada credential pengguna dimasukkan. Guest1markah serta menu/map game/module telah disahkan pada penerbitan awal dengan controller muzik yang sama; hotfix akhir membetulkan gesture toggle sahaja. 81/81 ujian dan pemeriksa statik lulus. SMTP serta Site URL/redirect dashboard masih perlu diselesaikan oleh pemilik selepas log masuk; inbox delivery tidak diuji atau didakwa.
