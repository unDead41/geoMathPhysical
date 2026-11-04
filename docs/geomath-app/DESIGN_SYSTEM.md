# Sistem reka bentuk dan kontrak warna muka

Satu frontend owner, komponen yang sama dan token terpusat. Arah visual:
cerah, navy, primary biru, kad bersempadan, jarak yang jelas dan ilustrasi
geometri. Bentuk, data dan state sebenar datang daripada controller.

## Token UI

| Peranan | Rujukan asas | Polisi app |
|---|---|---|
| Primary | #215FF0 | Derive daripada token Digital semasa, bukan salin literal setiap widget |
| Ink | #18334B | Pemetaan light/dark/strong contrast melalui theme |
| Background | #F3F7FB | Safe-area dan surface konsisten |
| Surface | #FFFFFF | Kad/panel; dark mempunyai nilai semantic sendiri |
| Success | #127957 | Maklum balas, bukan gred penguasaan |
| Accent | #FFCB66 | Penekanan sekunder |

Source owner: `digital/design-system/tokens.mjs`. Cadangan exporter menjana
theme adapter Dart; jangan mencipta fork CSS atau hard-code token berulang.
Fon sistem mengurangkan kebergantungan offline. Radius kad 18–22 dp dalam
konsep ialah panduan, bukan alasan mengubah semua token sedia ada tanpa audit.

## Komponen bersama

`GeoMathScaffold`, `DestinationNav`, `SectionHeader`, `ActionButton`,
`LabeledField`, `ChoiceChips`, `StatusNotice`, `SyncStatusBadge`,
`ConfirmationSheet`, `UnsavedChangesDialog`, `EmptyState`, `RetryPanel`,
`ShapeSelector`, `ModelToolbar` dan `FaceLegend` ialah nama cadangan.

API komponen menerima label l10n, state busy/disabled/error dan callback typed.
Tiada callback yang menulis terus ke backend daripada widget asas. Seluruh app
menggunakan ikon, ukuran medan, dialog dan kebiasaan fokus yang sama.

## Warna geometri — kehendak pengguna terkini

Warna muka berasingan daripada warna status dan primary UI. Bagi kubus/kuboid:

| Semantic | ID muka canonical | Warna | Hex |
|---|---:|---|---|
| Depan | 0 | Biru | #4C8DFF |
| Kanan | 1 | Jingga | #F69B45 |
| Belakang | 2 | Merah jambu | #E9799B |
| Kiri | 3 | Hijau | #42B883 |
| Atas | 4 | Kuning | #F4C95D |
| Bawah | 5 | Ungu | #9B7EDC |

Token dalam `face_colors.json` ialah **palet cadangan yang diluluskan melalui
permintaan mockup**, bukan dakwaan palet ini sudah dipasang pada source web.
Source `geometry.mjs` pada baseline masih mempunyai FACE_COLORS berlainan.
Implementasikan adapter berdasarkan `shape + stableFaceId`; jangan mengubah
mesh, susunan vertex, unit, ID atau aturan folding untuk menukar warna.

Nama kiri/kanan merujuk muka asal model. Kamera yang bergerak tidak menukar
warna pada muka itu. Default contoh: atas kuning, depan biru dan kanan jingga.
Muka yang kelihatan di kiri skrin boleh jadi **Depan**, bukan semestinya Kiri.
Jangan mewarnakan semula daripada normal selepas kamera/animasi diputar.

Warna yang sama mengikuti panel tersebut semasa bentangan dibuka, ditutup dan
disemak melalui pandangan2D. `FaceLegend` serta label Atas/Depan/Kanan atau
nama muka sebenar menyediakan rujukan selain warna.

## Bentangan contoh yang sah

Net kubus contoh mempunyai jalur menegak empat petak: **kuning, biru, ungu,
merah jambu**, dengan **hijau di kiri** dan **jingga di kanan** petak biru.
Jumlahnya enam. Kedudukan net lain datang daripada preset canonical; warna
mengikuti face ID, bukan koordinat petak atau tekaan daripada PNG.

Pandangan kubus: Atas kuning; Bawah ungu; Depan biru; Belakang merah jambu;
Kiri hijau; Kanan jingga. Bentangan dan pandangan ialah dua representasi
berbeza. Beberapa ikon/raster kecil masih bersifat ilustrasi; jangan tracing
geometri daripada imej.

## Bentuk lain

- Piramid bertapak segi empat mempunyai 1 tapak dan 4 muka segi tiga. Tiada muka
  rata di puncak yang dinamakan Atas. Gunakan Tapak/Sisi depan/kanan/belakang/kiri.
- Prisma n-sisi mempunyai n+2 muka; dua tapak dan n muka sisi. Katalog prism
  tidak dipaksa kepada enam nama muka kubus.
- Silinder: dua tapak bulatan dan satu permukaan melengkung. Cadangan atas
  kuning, bawah ungu, permukaan melengkung biru/teal.
- Kon: tapak dan permukaan melengkung; sektor ialah development permukaan
  melengkung, bukan segi tiga.
- Sfera: satu permukaan melengkung. Hemisfera tertutup: satu permukaan
  melengkung dan satu tapak. Tessellation strips bukan muka baharu atau rusuk.

Renderer mungkin mempunyai banyak polygon dengan ID permukaan yang sama.
Semua patch bagi satu permukaan sebenar mengekalkan warna yang sama; jangan
membuat jalur pelangi yang mengajar bilangan muka palsu.

## Penilaian berbanding penerokaan

Dalam pembelajaran, warna muka membantu perbandingan model/net/pandangan.
Dalam kuiz/Duel/kelas, semua pilihan masih perlu dibandingkan berdasarkan
bentuk. Guna palet seragam pada thumbnail bongkah dan bentangan pilihan
neutral; jangan memberi satu pasangan betul corak warna yang unik.
Pilihan, permutasi dan key pemarkahan canonical tidak ditukar untuk gaya.

Semak kontras label terhadap setiap hue dalam light/dark dan teks besar.
Garis luar kekal jelas. Elakkan glow/particle atau pergerakan keseluruhan
yang mengganggu perbandingan muka. Ini tidak memerlukan imej PBR berat atau
renderer3D baharu; source renderer memberi warna kepada setiap face.
