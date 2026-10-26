# GeoDecoder Digital v2.3.0 — Modul v1.2.0

Tarikh: 26 Oktober 2026 (Malaysia). Asas digitalize: `cd3039175c240dee9bbdfa57491e1fbc17e321a1`. Modul diambil tepat daripada commit `931a0150397bfb3fd79ef3c8da6684167d1c6aad`, branch `digitalize-module`, path `digital/module/GeoDecoder_Modul_V1.html`, Git blob `5f58d2df981c7a21cc063a4958e898a46b6134fe`.

Home → **Teroka modul pembelajaran → Makmal interaktif** kini membuka Bina Bentangan, Makmal Isi Padu, Terbitkan Rumus dan Bongkah Gabungan. Modul masih menggunakan kamera, kawalan animasi, nota dan geometri asalnya. Pembungkus parent mengurus iframe dan muzik map; keluar ke Home membuang iframe dan mengembalikan muzik menu.

Pakej vendor tidak diubah. `vendor/module-release.json` merekodkan sumber dan blob; pemeriksa build mengesahkan hash tepat, versi dalam HTML dan import aplikasi. Source branch modul tidak ditulis semula. Source runtime akaun, kelas, database dan peraturan skor tidak diubah oleh integrasi ini. Status SMTP/redirect untuk penghantaran email daripada keluaran terdahulu kekal berasingan.

Pengesahan tempatan: sumber modul dibina semula pada folder pengesahan berasingan dan menghasilkan blob yang sama, 100/100 ujian modul serta pemeriksa mandiri lulus. Suite aplikasi digital 81/81 dan pemeriksa build/98 ID/ARIA/aset/pin modul lulus. Ujian modul meliputi geometri, rumus, pemuliharaan isi padu, pergerakan muka, slider dan kitar hayat aktiviti. Ia ialah ujian Node dengan adapter DOM; bukti pelayar deployment dicatat berasingan selepas penerbitan.

## Semakan penerbitan sebenar

Kod digitalize: `01696af497cd7fca8e299f9c1b8a6407333ce276`. Penerbitan public main-digital: `8cce135102618ffad2c1de46063fcb5042ba0907`. Workflow https://github.com/unDead41/geodecoder-digital/actions/runs/40249504326 completed/success. HTTP200, HTML625381bytes, SHA256 `18bb17822161439fd4566a1c81e0871494f9e9d0a1053b36ab4757d935cfc999` sepadan dengan binaan. Branch digitalize-module masih pada pin931a0150397bfb3fd79ef3c8da6684167d1c6aad; tiada perubahan di luar digital/ pada branch integrasi.

Chrome sebenar pada URL HTTPS live memaparkan DigitalV2.3.0 dan modulV1.2.0. Home → Teroka modul → Makmal interaktif membuka semua empat pilihan. Bina Bentangan memulakan lipatan dan melaporkan susunan sah; tab seterusnya menghentikan playback. Penuhkan pada ukuran3×2×3 memberikan18/18kiub dan18cm³; Pilih semua permukaan pada kubus sisi4 memberikan96cm² danL=6a². Bongkah Gabungan dibuka dengan hasil264cm³ serta penerangan240cm² pada contoh asal. State parent menunjukkan map/playing sepanjang modul. Satu screenshot sebenar menunjukkan versi, empat pilihan makmal, model dan grid.

Semakan ini ialah smoke test integrasi desktop, berasingan daripada100ujian modul dan81ujian aplikasi. Ia tidak mengulangi seluruh audit sentuhan/mobile atau mendakwa ujian fizikal. SMTP/redirect email masih status tetapan pemilik daripada keluaran sebelumnya; integrasi modul ini tidak mengubahnya.
