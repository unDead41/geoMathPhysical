# Integrasi Modul v1.5.0 — main-digitalized

Tarikh: 26 Oktober 2026. Dokumen ini merekod perubahan modul dalam integrasi
`main-digitalized`. Penerbitan remote dan deployment direkod oleh pemilik integrasi;
ujian setempat sahaja tidak membuktikan kedua-duanya berlaku.

## Sumber tepat

| Sumber | SHA penuh | Peranan |
|---|---|---|
| main-digitalized | 5f577d63f17067a8488e17cafcbcb25d5872360b | Asas modul v1.4.0 |
| digitalize-module | 694c2c9623a76be1b885611e2c90575b734d0b00 | Subtree modul identik dengan asas MD |
| digitalize-module-design | 2a62091fe72f88c59b2f3ca393a29fc3f1b47263 | Reka bentuk telah diserap dalam v1.4.0 |
| digitalize-module-upgrade | 4c3a165613fd310e5e7e889e793065d4818250b2 | Gerbang latihan, sejarah dan akses v1.3.0 |

Tree `digital/module` asas MD dan module ialah
`3a9449c60f010a67e65aa6255986811e6be7a915`. Sumber guided/accessibility upgrade
dipadankan dengan blob penerbitan; snapshot tempatan bukan digunakan sebagai
pengganti keseluruhan subtree. Rumus, geometri asas, nota 11 bentuk, helper
preset/studio/volume/transfer dan sumber Bab 6/Bab 7 dipelihara.

## Hasil dan batas latihan

Aliran Ramalkan → Cuba → Semak → Terangkan memerlukan ramalan tidak kosong,
eksperimen sebenar, jawapan konsep tepat dan penerangan tidak kosong. Rekod ialah
refleksi kendiri; bukan skor kuiz, bukti penguasaan atau gred TP.

| Aktiviti | Latihan berpandu | Mod penerokaan tambahan yang kekal |
|---|---|---|
| Bentangan | Baiki susunan kubus bertindih, lipat sah, semak enam arah | Galeri sembilan dan studio tujuh poliedron/cetakan/11 net kubus |
| Isi padu | Kiub unit atau tiga tuangan kon/piramid | Semua 11 bentuk A/B, cm³/mL/L, baki dan limpahan |
| Luas | Lima bongkah tertutup asal, semua muka dan sebutan rumus muka 1 | Enam bentuk tambahan, bekas terbuka/tertutup dan rongga tembus |
| Gabungan | Kedua-dua gabungan, semua permukaan luar dan dua tapak dalaman | Ukuran dan gerakan berterusan sedia ada |

UI menyatakan batas ketika memilih mod penerokaan dan melumpuhkan gerbang latihan
untuk mod tersebut. Tiada bentuk atau aktiviti v1.4 dibuang. Contoh siap tidak
menggantikan pembaikan kubus secara manual. Pengiraan dan pemuliharaan isi tidak
diubah untuk mengikuti gerbang latihan.

Undo mempunyai 30 keadaan setiap aktiviti, termasuk isi A/B/lejar, sambungan
studio dan pemilihan bengkel luas. Hook sebelum mutasi meliputi kawalan langsung
studio/workshop. Undo membatalkan callback yang terkesan, mengembalikan keadaan
sebelum edit dan membatalkan semakan draf; pencapaian terdahulu kekal. Reset kamera
tidak mengubah eksperimen. Ulang aktiviti mereset latihan yang disokong sahaja.

`LabMotion` menerima easing sedia ada; playback dan Next menggunakan cursor sama.
Lalai 0.5× dan pilihan 0.25×/1× dipelihara. Jeda, sambungan, pertukaran aktiviti,
masa tersembunyi, sasaran dan callback sekali sahaja menggunakan kontrak MD.
Tema gelap menggunakan sumber token yang sama, dan renderer mengekalkan fitMesh.

## Sambungan aplikasi induk

`window.__geodecoderModuleHost.media` menyediakan pilihan gerakan efektif.
`start(refresh)` dipanggil sekali selepas modul lengkap dimulakan. Refresh
mengekalkan input, eksperimen dan kedudukan jeda; perubahan label/putaran berlaku
hanya apabila nilai berkaitan berubah. Aplikasi induk memiliki terjemahan BM/BI,
saiz teks, kontras dan sambungan preferensi. Modul mandiri berfungsi tanpa host.

`ModuleAccess` menggunakan protokol 1 sedia ada untuk tema/refleksi, sumber
`window.parent` dan token sesi. Pemulihan tidak mengeluarkan echo dan tidak membuka
gerbang eksperimen. Sesi baharu membuang draf serta callback aktiviti tertunda.
Suara setempat memerlukan `localService === true`, bahasa BM/BI yang sepadan serta
audio diaktifkan. Teks kekal, tiada autoplay dan perubahan aktiviti/settings atau
halaman tersembunyi menghentikan suara. Tiada storan atau rangkaian ditambah pada
runtime modul mandiri.

## Pengesahan

- Suite gabungan: **244/244 lulus**, 0 gagal, 0 skip. Ini merangkumi 215 ujian MD,
  21 ujian guided asal dan lapan regresi integrasi. Ujian yang sebelum ini
  mengandaikan fill serta playback linear disesuaikan kepada pacing/easing MD.
- Build dan checker: sintaks HTML sebenar, dependency/rangkaian/storan, ID,
  lifecycle, versi, ikon, token terjana dan kontras teks/batas cerah serta gelap.
- Regresi baharu menjalankan HTML keluaran sebenar melalui port DOM/jam: skop,
  Undo A/B/studio/workshop, cursor Next/easing, sesi baharu, startup host/settings,
  bahasa suara dan audio dimatikan.
- Sumber geometri v1.4 terus diuji: semua 35 heksomino/11 net sah, engsel tegar,
  isi padu mesh, pemuliharaan pindahan, luas rongga dan cetakan mm.

Ujian port DOM/jam bukan pemeriksaan visual atau ujian peranti fizikal. Ujian
pelayar gabungan aplikasi direkod oleh pemilik integrasi. Tiada tuntutan audio
sebenar, suara terpasang, sentuhan fizikal, pembaca skrin, cetakan fizikal, Edge
atau sesi file:// offline baharu dibuat daripada suite automatik ini. Had
geometri/cetakan v1.4 dalam LABS_V1_4.md terus terpakai. Firmware tidak diubah.
