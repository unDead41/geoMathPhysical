# Tempo, galeri bentangan dan isi padu v1.3.0

Tarikh: 26 Oktober 2026 (Malaysia). Branch: digitalize-module.
Asas: 931a0150397bfb3fd79ef3c8da6684167d1c6aad, modul v1.2.0.
Rujukan penuh dan versi main/sharing/digitalize: SOURCE.md.
Perubahan hanya digital/module/, tanpa peraturan kuiz, skor atau analitik.

## Fungsi yang boleh dicuba

- Pilih Makmal interaktif. Lalai Perlahan 0.5×; Sangat perlahan 0.25× dan Biasa
  1× tersedia. Lipatan/bukaan penuh ialah 8/16/4 saat. Satu tuangan lalai 5.2 saat,
  cantuman 3.2 saat. Kelajuan kekal merentas makmal. Satu Jeda/Sambung berdekatan
  model menyimpan destinasi; gerakan tidak bersambung sendiri apabila kembali.
- Galeri sembilan bentangan siap: kubus, kuboid, piramid segi empat sama,
  silinder, kon, prisma segi tiga/segi lima/segi enam dan piramid segi tiga.
  Prisma tambahan bertapak poligon sekata. Warna/nombor kekal, label boleh
  dipilih untuk sorotan. Susun petak kubus masih membuka editor asal.
- Isi padu kini mempunyai pilihan satu atau dua bongkah daripada sembilan bentuk.
  Bentuk dan ukuran A/B bebas. +1 cm³ ke A, ke B atau ke setiap A dan B;
  penuhkan satu/kedua-duanya, peluncur isi dan kosongkan. Pilihan A/B menentukan
  jumlah isi sebenar. Kapasiti kosong dipaparkan berasingan. A di kiri/mint,
  B di kanan/biru; satu bongkah A di tengah. Kedua-duanya berkongsi skala cm.
- Kiub unit melengkapkan lapisan separa dahulu dan penuh secara beransur. Tiga
  tuangan asal serta isi semula masih tersedia. Panduan menerangkan langkah
  seterusnya. Pemilihan luas menunggu bentangan rata; semakan muka luar menunggu
  cantuman lengkap. Editor dikunci ketika terlipat dan dibuka semula apabila rata.

## Ketepatan dan pengujian automatik

**139/139 lulus:** 33 geometri asal, 15 nota, 19 matematik empat makmal,
14 galeri bentangan, 12 isi padu pilihan, 43 aplikasi dan 3 renderer.

Suite penuh menjalankan geometri sebenar dan skrip HTML keluaran, bukan salinan
logik animasi. Log TAP: ../evidence/pace-v1.3.0-tests.tap.

- Empat poligon baharu: topologi tertutup F/V/E betul (setiap rusuk dikongsi dua
  muka), seluruh bentangan pada satu satah tanpa pertindihan luas. Semua 101
  bingkai per bentuk mengekalkan panjang sisi, luas, warna/ID dan dua titik engsel.
- Sembilan kapasiti diuji terhadap nilai analitik bebas pada ukuran bukan default.
  Isi mesh cecair yang benar-benar dilukis dikira menggunakan tetrahedron pada
  f=0.1/0.5/1. Toleransi lengkung 0.2%; jumlah menggunakan nilai penuh.
- Paras kon/piramid h×(1−∛(1−f)), bukannya h×f. Bentangan silinder/kon terus
  menggunakan pembangunan analitik sedia ada, bukan panel poligon berengsel.
- +1 cm³ ke satu/kedua-duanya, had kapasiti, jumlah A/B/tiada, satu bongkah,
  input isi langsung, pertukaran bentuk, fokus keyboard, kelajuan, pause/resume,
  berpindah makmal dan reduced motion diuji pada HTML gabungan sebenar.
- Ujian geometri/nota/renderer asal diluluskan semula. Checker mandiri menyemak
  sintaks inline, ID, CSP, tiada rangkaian/storan/CDN, token dan versi seragam.
  Checker repo mengesahkan firmware masih v1.1.3.

## Perkara yang dibetulkan semasa QA

- Ukuran contoh silinder dalam nota ialah tinggi 10 cm, sedangkan slider perbandingan
  ialah 1–8 cm. Defaults perbandingan kini dihadkan kepada julat sebenar (tinggi
  8 cm), supaya nilai slider, ringkasan, mesh dan rumus sepadan. Nota asal kekal.
- Sorotan label galeri memulihkan fokus keyboard selepas butang dibina semula.
- Isi positif di bawah 0.01 cm³ dipaparkan < 0.01, bukannya sifar. Range mempunyai
  aria-valuetext dengan peratus isi padu dan cm³. Jumlah juga kelihatan dekat model.
- Bentangan siap yang belum dilipat mempunyai mesej neutral. Ketika bergerak/
  dijeda, mesej menyatakan keadaan semasa; warna ralat tidak digunakan untuk
  bentangan yang sah dan belum dilipat.

## Pengesahan pelayar sebenar

Chrome cloud melalui HTTP pada HTML keluaran. Rekod DOM, log dan hash screenshot:
[pace-v1.3-browser.json](../evidence/pace-v1.3-browser.json).

- +1 cm³ ke A sahaja menghasilkan 1; kemudian +1 ke A dan B menghasilkan 3.
  Pilih B sahaja menghasilkan 1; mod satu bongkah mengekalkan A=2 dan menyembunyikan B.
- Kesemua sembilan bentuk isi padu dipilih dan dipenuhkan melalui range sebenar.
  Silinder selepas pembaikan menunjukkan j=7/t=8 dan 1231.50 cm³, sepadan kawalan.
- Dua bekas prisma segi tiga dan piramid segi tiga diisi serentak; pause mengekalkan
  nilai pecahan pada dua bacaan bebas, kemudian resume mencapai penuh. Pada kedua-dua
  bekas 50%, jumlah ialah 10.3923 cm³; penuh 20.7846 cm³.
- Keempat-empat bentuk pengayaan selesai dilipat. Piramid segi tiga dijeda pada
  progress 0.24823 dan disambung ke 1. Prisma segi enam turut dibuka semula ke 0.
  Semua sembilan pilihan galeri diperiksa pada hujung rata/tertutup dan label 6,
  6, 5, 3, 2, 5, 4, 7, 8 mengikut bentuk yang direkodkan.
- Unit kiub melengkapkan lapisan separa 1→36 dan penuh 216/216. Kon dan piramid
  masing-masing menghasilkan 33.33%, 66.67%, 100% selepas tiga tuangan/refill;
  tuangan tambahan disekat. Deadline automasi waitFor luput pada tuangan pertama,
  tetapi bacaan DOM berikutnya mengesahkan hasil dan kesemua tiga tuangan.
- Pemilihan luas dikunci sebelum rata dan diaktifkan selepas animasi. Lima jumlah
  ialah 96, 108, 96, 747.70, 75.40 cm². Gabungan kubus+piramid memberi 240/264;
  silinder+kon 188.50/207.35 (cm²/cm³). Semakan muka luar tepat memberi penerangan.
- Semua empat makmal: iframe 320px client/scroll=310/310; 390px=380/380;
  768px=758/758. Gutter scrollbar mengambil 10px. Tiada limpahan mendatar.
- Suntikan matchMedia reduced motion selepas iframe dimuat menunjukkan auto=false,
  playing=false, reducedMotion=true. Fill eksplisit pada 390px masih berfungsi.
  Bacaan sebelum navigasi iframe selesai dilabel sebagai pemerhatian awal sahaja.
- Log aplikasi main/workbench yang diperiksa tidak menunjukkan error/warning;
  metadata chrome-extension dikecualikan. Ini bukan ujian Edge/peranti fizikal.

Screenshot akhir: satu bongkah, dua bongkah dijeda, bentangan prisma segi enam
rata dan paparan telefon. Tiada imej janaan atau edit raster. Screenshot telefon
mengekalkan workbench kelihatan untuk membezakan ujian iframe daripada peranti.

## Semakan bebas

Dua subagent membuat semakan baca sahaja selepas kebenaran pengguna. Semakan
geometri menjalankan 59 ujian berkaitan; semakan interaksi menjalankan 43 ujian
aplikasi. Kedua-duanya tidak menemui blocker dan tidak mengubah fail. Bilangan
itu mengulang sebahagian suite 139, bukan tambahan kepada jumlah suite penuh.
Ketepatan ayat resolusi lengkung README diperjelas: pentas/bentangan utama 144
jalur, bekas makmal isi padu 96 dan thumbnail 64.

## Audit reka bentuk

DESIGN.md lint: 0 error, 6 orphan-token warning (token benar-benar digunakan dalam
CSS, tetapi frontmatter components tidak menyenaraikannya). Log disimpan.
Auditor strict: 67 laporan affordance.actionless-button sahaja. Regex auditor
mengenali onclick inline, bukan bind/addEventListener luaran. Semua butang literal
memiliki handler sebenar dalam shipped-script binding test dan aliran utama
pelajar diuji dalam pelayar. Laporan mentah dipelihara; tiada handler kosong,
butang palsu atau pelumpuhan fungsi untuk menyembunyikan dapatan. Jangan mendakwa
strict audit lulus. Select/Listbox kekal native mengikut kontrak UI sedia ada.

## Batas sebenar

- Pembina bebas kekal kubus; bentuk tambahan ialah bentangan sah yang disediakan.
  Tidak menyokong bentuk cekung/poligon arbitrari, sfera, eksport pola skala,
  tab gam atau ketebalan kertas. Tiada pengesanan pelanggaran kertas setiap
  bingkai; validasi akhir dan sambungan tegar diuji.
- Simulasi isi menunjukkan paras dan isipadu ideal; bekas tidak dituang secara
  fizikal dan tiada simulasi aliran/tumpahan. Lengkung dilukis dengan tessellation.
- Pengayaan bentuk tambahan tidak menambah Shape ID kuiz. Rujukan KSSM/DSKP
  terperinci dalam CURRICULUM.md; ini bukan liputan seluruh Bab 6 atau gred TP.
- Ujian pelayar menggunakan Chrome cloud dan HTTP. Cold-open file:// disekat
  oleh polisi browser ujian, jadi ia belum disahkan secara sebenar. HTML ialah
  satu fail klasik inline dan disemak tanpa pergantungan rangkaian/storan.
- Edge, sentuhan/peranti telefon fizikal, screen reader dan reduced motion OS
  sebenar belum diuji. Workbench iframe dan suntikan matchMedia dikenal pasti
  sebagai kaedah QA, bukan bukti peranti/OS sebenar. Tiada dakwaan FPS terukur.
