# GeoDecoder Digital v2.2.0

Email signup dengan pengesahan, login email/username, pautan terlupa kata laluan, pengesahan dua medan kata laluan baharu, resend dengan cooldown, ralat pautan luput, dan pemulihan kod untuk akaun lama. Trigger Auth menyediakan profil secara atomik dan hanya memproses namespace GeoDecoder; peranan kekal pada profil peribadi. Database aplikasi lain yang berkongsi Auth tidak diprovisikan oleh trigger ini.

Muzik menu `rest_site_bg` dan muzik modul/game `when_open_map_bg` datang daripada lampiran pengguna. Durasi penuh: 180.062s dan 167.184s; MP3 96 kbps stereo, 44.1 kHz, jumlah 4,167,575 bytes. Satu elemen Audio, volume 0.22, menunggu user gesture, preference hidup/mati disimpan, tab tersembunyi dijeda. Bunyi kesan kuiz kekal berasingan.

Home membuka modul sebenar v1.1.0 dalam iframe `allow-scripts allow-popups`, tanpa akses asal parent. Sumber pin: `unDead41/geodecoder`, `digitalize-module`, commit `92c12c3a07ec250c03a73decaf52a654fc26d502`, path `digital/module/GeoDecoder_Modul_V1.html`, Git blob `2ad2f482dd6b356cd4842b7f4fab911b11b59521`. Kandungan/geometri asal tidak diubah. Parent mengurus muzik dan membuang iframe apabila ditutup.

Semakan tempatan: 79/79 unit tests, build, pemeriksa 98 ID/ARIA/aset/sintaks/bank. Checker menangkap dan membetulkan pengembangan `$&` dalam replacement string pembina; replacement kini menggunakan callback. Kedua-dua audio didekod penuh tanpa ralat. SQL email signup/rollback/ACL/role/lookup dan suite kelas/bilik penuh lulus pada projek hosted, semua fixture dibatalkan.

Pratonton sebenar memaparkan email signup, email/username login, email-only forgotten-password, dan iframe modul dengan kawalan geometri/nota. Pembungkus iframe menukar pautan fragment kepada `about:srcdoc#...`; klik Panduan disahkan kekal dalam modul selepas pembetulan. Fail vendor asal kekal byte-identical. Tiada credential sebenar dimasukkan atau email reset sebenar dihantar dalam ujian browser. Custom SMTP serta tetapan Site URL/redirect dashboard masih memerlukan penyelesaian selepas pemilik log masuk; lihat EMAIL_SETUP.md. Laporan ini tidak mendakwa penghantaran email end-to-end sudah lulus.

Semakan kod tambahan mengesan borang reset hilang selepas reload. Intent per-tab kini mengandungi UUID pengguna/sesi dan luput 30 minit sahaja; tiada token atau kata laluan. Restore mengesahkan sesi dengan Auth, dipadankan kepada sesi semasa, dan dibuang selepas reset/logout. Ujian turut mengesahkan respons lama tidak membenarkan reset selepas akaun bertukar.
