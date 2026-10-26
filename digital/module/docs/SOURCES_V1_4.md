# Sumber setempat Modul v1.4.0

Pengguna memberikan enam PDF. Skop pembacaan isi dihadkan kepada dua bab di
bawah serta halaman DSKP bab tersebut. Carian tajuk digunakan untuk menentukan
sempadan; tiada isi bab lain digunakan. Nombor PDF ialah kedudukan bermula 1;
buku Tingkatan 2 menggunakan spread dua halaman dalam satu halaman PDF.

| Fail | Skop | Halaman PDF | Halaman bercetak |
|---|---|---|---|
| 01-DSKP-KSSM-MATEMATIK-TINGKATAN-2.pdf | Tingkatan 2 · Bab 6 | 63–66 | 51–54 |
| 02-Matematik-Tingkatan-2-KSSM.pdf | Tingkatan 2 · Bab 6 | 54–64 | 98–119 |
| 03-Mathematics-Form-2-KSSM.pdf | Tingkatan 2 · Chapter 6 | 54–64 | 98–119 |
| 04-Matematik-Tingkatan-3-KSSM.pdf | Tingkatan 3 · Bab 7 | 178–207 | 168–197 |
| 05-Mathematics-Form-3-KSSM.pdf | Tingkatan 3 · Chapter 7 | 178–207 | 168–197 |
| 06-DSKP-KSSM-MATEMATIK-TINGKATAN-3.pdf | Tingkatan 3 · Bab 7 | 69–72 | 57–60 |

## Identiti fail

Nama, saiz, jumlah halaman dan SHA-256 dicatat dalam
[evidence/sources-v1.4.json](../evidence/sources-v1.4.json). Buku penuh, teks
penuh bab dan rajah berhak cipta tidak diterbitkan bersama kod. Contoh, rajah
SVG dan ayat modul ditulis semula khusus untuk aktiviti.

## Kandungan yang digunakan

- Tingkatan 2 Bab 6: sifat, bentangan, luas dan isi padu. DSKP 6.1.1/6.2.1,
  6.3.1–6.3.3 serta 6.4.1–6.4.3. Contoh poligon sekata ialah pengayaan terpilih.
- Tingkatan 3 Bab 7: unjuran ortogon 7.1, normal berserenjang dengan satah,
  rupa dari satu arah dan beza objek dengan unjuran. 7.2 dibaca dalam bab
  yang dibenarkan tetapi latihan pelan/dongakan berskala belum diimplementasi.
- BM menggunakan j/t; EN menggunakan r/h untuk jejari/tinggi. Modul BM kekal
  j/t/s, luas tapak A dan apotem diterangkan berasingan. cm²/cm³ ialah unit
  persegi/padu yang sah; tidak dilabel sebagai unit yang tidak sah.

## Semakan ketepatan sumber

1. Buku EN Tingkatan 2, halaman 111 (PDF 60), aktiviti rumus piramid memerlukan
   isi kubus dibahagi enam untuk sebuah piramid berkenaan. Pengangka yang
   tersalah melabel isi piramid tidak disalin ke modul.
2. Contoh 13 halaman 115 (PDF 62), kedua-dua bahasa: pembundaran pertengahan
   menghasilkan hasil darab yang tidak sepadan. Dengan π = 22/7, kiraan penuh
   memberi 1440.476190… L, lalu 1440 L kepada liter terdekat. Modul mengira
   dengan nilai penuh sebelum membundarkan paparan.
3. EN halaman 117 (PDF 63), latihan 8: konteks BM ialah luas tapak, bukan jumlah
   luas permukaan. Rumus prisma menggunakan luas tapak × tinggi.
4. Sfera tiada bentangan rata tepat. Hemisfera: 2πj² bagi bahagian melengkung,
   3πj² apabila tapak bulatan termasuk; V = ⅔πj³. Paras isi menggunakan isi
   tembereng sfera secara analitik, bukan interpolasi linear tinggi.

Ralat cetakan ini hanya menjadi panduan semakan. Modul tidak memaparkan salinan
soalan atau dakwaan bahawa semua kandungan buku sudah diliputi.
