# Pengesahan modul v1.3.0

Cadangan branch `digitalize-module-upgrade`, 26 Oktober 2026. Firmware main v1.1.3
kekal. Perubahan ini hanya pada modul; tiada push, merge atau penerbitan awam.

## Hasil automatik

- `npm run build`: HTML mandiri dibina, 194684 bait.
- `npm test`: **121/121** lulus (100 ujian asal, 21 tambahan).
- `npm run check`: sintaks, ID, CSP, versi, token reka bentuk dan tiada dependency,
  panggilan rangkaian atau storan pelayar runtime lulus.

Ujian ditulis sebelum helper gerbang/sejarah/jam wujud: suite pertama gagal
`ERR_MODULE_NOT_FOUND`. Dua regresi tambahan gagal terhadap kod sebenar yang
dihantar sebelum pembetulan: perubahan jawapan masih membenarkan penerangan,
dan penekanan Semak berulang menghantar mesej pendua. Kedua-duanya kini lulus.

Ujian geometri asal masih mengesahkan 35 heksomino/11 bentangan sah, permukaan
tegar, luas serta pemuliharaan isi padu tuangan pada bingkai pertengahan. Tiada
matematik geometri diubah. Ujian renderer menyemak lukisan melalui port Canvas.
Ujian aplikasi menjalankan skrip HTML keluaran sebenar dalam adapter DOM kecil.

## Aliran yang disahkan dalam skrip keluaran

- Ramalan kosong dan tab terbuka tidak membuka pintu penyelesaian.
- Bentangan memerlukan pembaikan manual selepas ramalan, lipatan sah penuh dan
  jawapan tentang enam arah berbeza; contoh sah sahaja tidak menggantikan cabaran.
- Isi padu memerlukan kapasiti penuh atau tiga tuangan dan jawapan konsep tepat.
- Luas memerlukan bentangan penuh, setiap muka dipilih dan sebutan rumus muka 1.
- Gabungan memerlukan cantuman, pilihan semua muka luar dan dua tapak ditolak.
- Setiap aktiviti memerlukan penerangan tidak kosong; edit membatalkan semakan,
  sementara ulang/undur mengekalkan pencapaian yang sudah disimpan.
- Sejarah berhad disalin, dijeda tanpa lonjakan dan langkah tuangan menamatkan
  callback sekali sahaja; 0.5× dan langkah penerokaan utama turut diuji.
- Ready/protokol 1, penolakan sumber asing, token sesi terkini, tema induk,
  pemulihan tanpa echo dan draf dikosongkan ketika token sesi berubah.
- Tema/fokus tempatan, fallback suara, tiada autoplay dan stop selepas keluar
  aktiviti/halaman tersembunyi. Suara tiruan ujian mewakili API, bukan audio sebenar.

## Had pengesahan

Pelayar bersepadu selepas integrasi akan diuji oleh pemilik tugas induk. Laporan
ini tidak mendakwa pemeriksaan pelayar 320px, sentuhan fizikal, suara dipasang,
pembacaan screen reader atau audio sebenar. CSS disediakan bagi 320px, focus,
dark/light dan reduced motion; port DOM bukan bukti visual. Suara BM setempat
mungkin tiada; teks kekal dan mesej ketersediaan jelas. Tiada ujian firmware,
USB atau perkakasan diperlukan oleh perubahan modul ini.

Pengesahan integrasi akhir, termasuk pelayar dan viewport sempit, direkodkan
dalam `../../docs/RELEASE_V2_4.md`. Laporan ini mengekalkan batas bukti unit modul.

Rekod kemajuan ialah latihan refleksi kendiri. Gerbang UI menguji pemerhatian dan
jawapan konsep, tetapi pelayan/rekod dipulihkan tidak membuktikan penguasaan.
Tuangan ialah aras dan isi padu ideal, bukan simulasi fizik aliran bendalir.
