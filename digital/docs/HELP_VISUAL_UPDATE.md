# Bantuan visual v2.7.1 (cadangan)

Asas kerja: c47ba4236bbf717a484b0639ac6976b604e3a13b pada
`digitalized-utility-help-support`. Remote main-digitalized diperiksa pada
2e5c70cf4176f99a82376697081c0b6ed4b1368a, v2.7.0. Kerja ini menyambung
branch bantuan sahaja. Semasa integrasi, pelihara save/resume dan Duel baharu
dalam main; ambil sumber bantuan dan bina semula artifak pada integrasi terkini.
Jangan menindih seluruh frontend main dengan artifak branch ini.

Permintaan pengguna: kurangkan membaca, gunakan gambar dan animasi pendek.
Pilihan pelaksanaan: SVG geometri aplikasi sebenar + CSS setempat. Video luar
memerlukan muat turun/hosting; raster pula kurang tepat untuk arahan R1/R2.
Demonstrasi menggunakan contoh kubus tetap, bukan jawapan soalan semasa.

- Tiga langkah tutorial bergambar: bongkah/R1, bentangan/R2, pasangan/+1.
- Klip 4.8 saat berjalan sekali, bukan loop tanpa henti. Jeda/Sambung/Main
  semula mengawal demonstrasi sahaja. Tiada timer/action permainan dihantar.
- Tujuh panduan mengutamakan panel visual. Butiran panjang dan panduan
  papan kekunci dibuka apabila perlu; kandungan terperinci kekal tersedia.
- OS prefers-reduced-motion dan pilihan Kurangkan animasi aplikasi memberikan
  ilustrasi statik dengan label yang sama. Tiada audio autoplay atau video luar.
- Satu renderer dan satu delegated listener digunakan tutorial dan bantuan.
  Tiada timer baharu, backend atau storan pengguna untuk demonstrasi.

Pengesahan: suite aplikasi 256/256, tujuh senario bantuan/laporan Chromium,
serta help-visuals.browser.mjs (4.8s, satu ulangan, Jeda/Main semula, R1/R2/+1,
reduced motion OS/aplikasi, telefon 320px/150%). Build, check dan checker
firmware lulus. Ujian pelayar emulasi, bukan telefon fizikal/Safari.

Perintah: npm test; npm run build; npm run prepare:pages; npm run check;
node tests/help-support.browser.mjs; node tests/help-visuals.browser.mjs.
prepare:pages membina fail setempat sahaja; tiada penerbitan awam.
