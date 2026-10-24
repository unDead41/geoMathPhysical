# Aset cetakan dan paparan LCD

Disemak pada 25 Oktober 2026. Gunakan fail di bawah untuk cetakan dan dokumentasi.

## Kad RFID siap potong

| Fail | Kandungan | Halaman |
|---|---|---:|
| [Set RFID campuran](../print_labels/GeoDecoder_Kad_RFID_A4.pdf) | 5 model 3D dan 5 bentangan 2D | 2 |
| [Bentangan 2D kiri dan kanan](../print_labels/GeoDecoder_Kad_2D_Kiri_Kanan_A4.pdf) | Dua salinan setiap bentangan | 2 |
| [Model 3D kiri dan kanan](../print_labels/GeoDecoder_Kad_3D_Kiri_Kanan_A4.pdf) | Dua salinan setiap model | 2 |

Ketiga-tiganya menggunakan versi sumber 2, terakhir dikemas kini pada
16 Oktober 2026. Kad mempunyai garis potong dan tiada nama bongkah atau arahan
"ikut LED". Cetak pada kertas A4 menggunakan **Actual size / 100%** dan matikan
**Fit to page**. Saiz kad ialah 85.6 x 54 mm; semak garis ukuran 50 mm sebelum
memotong.

## Dokumentasi LCD

| Fail | Kandungan |
|---|---|
| [PDF LCD 15 halaman](lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf) | Semua 15 soalan dan hint, satu pasangan paparan pada setiap halaman A4 landskap |
| [Set 15 PNG](lcd/GeoDecoder_15_Contoh_LCD_PNG.zip) | Gambar padanan bagi setiap halaman |
| [Semakan teks LCD](LCD_QUESTION_REVIEW.md) | Teks empat baris dan penerangan notasi |

PDF dan ZIP menggunakan versi sumber 4, terakhir dikemas kini pada
24 Oktober 2026. PDF mempunyai tepat **15 halaman**, dan ZIP mengandungi tepat
**15 gambar PNG**. Susunan soalan: P1-P3, C1-C3, K1-K3, B1-B3, S1-S3.

Semakan penggantian ini mengesahkan semua 90 baris soalan dan hint dalam PDF
sepadan dengan `main/question_bank.h` pada commit `797a21f`. Setiap halaman
menggunakan reka letak tetap dan petunjuk simbol yang sama.

## Semakan aset

- Semua PDF dibuka semula dan bilangan/saiz halaman disahkan.
- Enam halaman kad dan 15 halaman LCD diperiksa secara visual.
- Teks kad disemak untuk ketiadaan nama jawapan dan arahan LED.
- ZIP PNG lulus semakan integriti dan mempunyai 15 nama fail soalan yang unik.
- Sembilan gambar pratonton lama dikeluarkan daripada tree semasa.
- Kod firmware, konfigurasi board dan pendaftaran UID tidak disentuh oleh
  kemas kini aset ini.
