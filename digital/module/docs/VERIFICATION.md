# Pengesahan Modul GeoDecoder v1.0.0

Keputusan akhir: **45/45 ujian automatik lulus dan 21 screenshot sebenar disimpan**.
Laporan membezakan geometri/unit, simulasi DOM, pelayar sebenar dan peranti fizikal.

## Isu yang ditemui dan dibetulkan

Buka/cantum daripada keadaan berhenti boleh tamat pada bingkai pertama: delta
masa pertama ialah 0, dan syarat lama menganggap kedua-dua hujung sebagai selesai.
Regresi dijalankan sebelum pembetulan: 5 daripada 7 ujian kitar hayat gagal,
termasuk buka, cantum, cycle, reduced motion dan menutup net untuk views.
Syarat kini menguji hujung destinasi mengikut arah. Semua 45 ujian akhirnya lulus. Dua regresi tambahan membuktikan jeda/sambung
mengekalkan arah menutup dan destinasi buka satu hala; kedua-duanya gagal sebelum
pembetulan penyimpanan keadaan jeda.

Ujian DOM menjalankan skrip sebenar dalam HTML keluaran dengan adapter DOM kecil;
Canvas tidak dilukis dalam suite itu. Geometri diuji berasingan, dan lukisan serta
kawalan diperiksa dalam Chrome sebenar. Ia bukan pengganti ujian sentuhan fizikal.


## Semakan statik UI

`audit_project.py --mode strict` mengeluarkan 12 finding `affordance.actionless-button`.
Punca diperiksa dalam auditor: ia hanya mengenal atribut inline onclick/@click,
tanpa menjejak addEventListener dalam fail JavaScript berasingan. Kesemua 12
butang literal mempunyai handler sebenar dalam src/app.mjs. Ini false positive
statik yang disemak; tidak mendakwa audit strict bersih. Kod tidak menambah handler
inline kosong, type=submit palsu atau disabled palsu untuk memuaskan checker.
Bukti fungsi datang daripada ujian kitar hayat dan pelayar, bukan keputusan auditor.
Carian sumber untuk alert/confirm/prompt, innerHTML, fetch dan localStorage kosong.


Pemeriksaan lanjutan menemui dua isu paparan: penjadualan kamera boleh membuat
lebih daripada satu requestAnimationFrame, dan label permukaan melengkung boleh
ditutup jalur berjiran. Regresi gagal dahulu (1 kes gelung, 2 kes label), kemudian
lulus selepas gelung dipastikan tunggal dan label lengkung dilukis selepas jalur
permukaan dengan semakan permukaan nampak. Tiada perubahan geometri analitik.

Kamera menunjukkan proses lipatan dari sudut serong, kemudian menghadap bentangan
rata. Ini membantu membezakan perubahan kedalaman daripada gambar yang membesar.
Semua kamera tetap ortografik.

DESIGN.md dilint dengan @google/design.md: 0 ralat, 6 amaran token dokumentasi
warisan yang tidak dirujuk secara eksplisit oleh peta komponen. Runtime token
warna disemak berasingan oleh tools/check.mjs dan sepadan identiti sedia ada.

## Keputusan akhir

| Lapisan | Keputusan sebenar |
|---|---|
| Geometri | 33/33: topologi, ketegaran muka, sambungan, bentangan, luas, metrik lengkung, kamera dan 1001 tahap/bongkah |
| Kitar hayat aplikasi | 10/10 daripada HTML sebenar dengan adapter DOM: buka/cantum, jeda/sambung, reduced motion, tab tersembunyi, pemilihan dan satu gelung |
| Renderer | 2/2: label lengkung tidak ditutup jalur berjiran |
| Jumlah | **45/45**, tiada gagal/dilangkau; output `../evidence/tests.tap` |
| Build/check | Sintaks, ID DOM, versi, token serta tiada import/aset/fon/network/storage luaran lulus |
| Checker repo | Firmware v1.1.3 = README = CHANGELOG; firmware tidak diubah |
| Chrome sebenar | Lima bentuk buka/cantum; Main/Jeda mengekalkan 50%; seretan 70px/25px; anak panah, +/−, reset, slider Home/End/PageUp, label dan self-check diuji |
| Pandangan | Semua 30 butang arah dicuba. Grid menggunakan enam unjuran tepat; kamera utama bergerak semasa peralihan. Kuboid kanan selepas peralihan mencapai yaw π/2, pitch 0 |
| Responsif | Iframe 390px/scrollWidth380, 320px/320, 768px/758; tiada limpahan mendatar. Scroll dan pertukaran arah telefon dicuba |
| Tanpa server | Selepas server preview dihentikan, memilih Kon dan slider 100% masih berfungsi; 0 elemen runtime luaran |
| Console | Tiada log asal modul; log metadata extension pelayar dikenal pasti berasingan |
| Bukti | **21 screenshot Chrome sebenar**, bytes asal; saiz, resolusi dan SHA-256 dalam `../evidence/screenshots.json` |

SHA-256 HTML:
`af4749fbe4b95de2a839daa921a83fbc143109b9b10e5c0b4ff9e212a9b2c7c5`.
Saiz: 63,792 bait. Fail yang diberikan ialah HTML yang sama seperti QA.

## Bukti visual

- [Model kubus](../evidence/screenshots/desktop-cube-final.png)
- [Bentangan kubus](../evidence/screenshots/cube-net-final.png)
- [Bentangan kuboid](../evidence/screenshots/cuboid-net-final.png)
- [Bentangan piramid](../evidence/screenshots/pyramid-net-final.png)
- [Silinder separa terbuka](../evidence/screenshots/cylinder-half-final.png)
- [Bentangan silinder](../evidence/screenshots/cylinder-net-final.png)
- [Kon separa terbuka](../evidence/screenshots/cone-half-final.png)
- [Bentangan kon](../evidence/screenshots/cone-net-final.png)
- [Enam pandangan kon](../evidence/screenshots/cone-views.png)
- [Telefon 390px](../evidence/screenshots/phone-390-views-crop.png)
- [Telefon 320px](../evidence/screenshots/phone-320-views-crop.png)

Sesetengah screenshot pilihan arah menangkap peralihan kamera utama; grid enam
gambar kecil sentiasa unjuran ortografik tetap. Screenshot model/notes yang tidak
terkesan dipelihara sepanjang QA. Semua screenshot lengkung akhir dirakam semula
selepas pembetulan label. Screenshot membuktikan keadaan, bukan ukuran FPS/video.

## Batasan sebenar

- Chrome sebenar menggunakan preview HTTP bagi HTML keluaran yang sama.
  Cold-open `file://`, Edge berasingan, Android/iOS fizikal dan pinch sebenar belum diuji.
- Reduced motion diuji melalui adapter matchMedia dan pemeriksaan CSS: tiada spin
  awal/tween kamera, playback pilihan, preference/tab berubah menghentikan gerakan.
  Tetapan reduced-motion OS sebenar belum diuji.
- Telefon diuji dalam iframe dengan lebar CSS sebenar/input tetikus; bukan peranti
  sentuh atau pengukuran kadar bingkai telefon.
- Lengkung dilukis 144 jalur daripada model analitik. Satu bentangan sah/bentuk;
  belum ada semua variasi, tab gam, ketebalan kertas, garis terlindung atau latihan
  pelan/dongakan mengikut skala.
- Renderer menggunakan depth sorting. Tiada penanda aras FPS pelbagai GPU/CPU;
  kesinambungan diperiksa tanpa menjanjikan FPS tertentu untuk semua peranti.
- Audit statik mempunyai 12 false positive seperti diterangkan di atas. Tidak
  dilaporkan sebagai strict PASS. Lint DESIGN: 0 ralat/6 amaran token dokumentasi.
- Tiada perubahan kuiz/skor/analitik/firmware atau penerbitan branch lain.
  Seluruh Digital v1.1.0 dipelihara melalui tree asas terkini.
