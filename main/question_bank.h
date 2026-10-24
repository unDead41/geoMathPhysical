#pragma once

// Satu jawapan setiap soalan. R1=bongkah; R2=bentangan.
// Soalan R1 dikekalkan; R2 memerlukan tafsiran sebelum memilih bentangan.
// Hint membimbing langkah fikir tanpa menyatakan nama jawapan atau kepingan.
// ASCII pi, *, ^ digunakan supaya serasi dengan ROM LCD 20x4.
const Question QUESTIONS[] = {
  {"P1", Shape::PYRAMID, 0,
   {"Bongkah apakah ini?", "5 muka, 5 bucu dan", "8 rusuk."},
   {"HINT: Fikir susunan", "muka yang bertemu", "pada bucu yang sama."},
   "Bongkah apakah ini? 5 muka, 5 bucu dan 8 rusuk."},
  {"P2", Shape::PYRAMID, 0,
   {"V=a^2*t/3", "a=sisi tapak persegi", "t=tinggi. Bongkah?"},
   {"HINT: Nilai a^2", "mewakili luas tapak.", "Tafsir faktor 1/3."},
   "V=a^2*t/3 a=sisi tapak persegi t=tinggi. Bongkah?"},
  {"P3", Shape::PYRAMID, 1,
   {"Tapak persegi:a=6cm", "t=5cm; V=60cm^3", "Cari bentangannya."},
   {"HINT: Luas tapak", "darab tinggi dahulu;", "banding dengan V."},
   "Tapak persegi:a=6cm t=5cm; V=60cm^3 Cari bentangannya."},
  {"S1", Shape::CYLINDER, 0,
   {"Tin minuman ada dua", "tapak bulatan sama.", "Bongkah apakah ini?"},
   {"HINT: Hubungkan", "bentuk tapak dengan", "permukaan sisinya."},
   "Tin minuman ada dua tapak bulatan sama. Bongkah apakah ini?"},
  {"S2", Shape::CYLINDER, 0,
   {"V=pi*r^2*t", "L=2*pi*r*(r+t)", "Bongkah apakah ini?"},
   {"HINT: Asingkan L", "kepada luas tapak", "dan luas sisinya."},
   "V=pi*r^2*t L=2*pi*r*(r+t) Bongkah apakah ini?"},
  {"S3", Shape::CYLINDER, 1,
   {"Jejari=3cm; t=4cm", "V=36*pi cm^3", "Cari bentangannya."},
   {"HINT: Kira pi*r^2*t", "Banding dengan V", "sebelum pilih kad."},
   "Jejari=3cm; t=4cm V=36*pi cm^3 Cari bentangannya."},
  {"K1", Shape::CUBE, 0,
   {"6 muka segi empat", "sama dan sepadan.", "Bongkah apakah ini?"},
   {"HINT: Lakarkan satu", "muka, lalu bayang", "bentuk tertutupnya."},
   "6 muka segi empat sama dan sepadan. Bongkah apakah ini?"},
  {"K2", Shape::CUBE, 0,
   {"V=a^3; L=6*a^2", "a = panjang rusuk", "Bongkah apakah ini?"},
   {"HINT: Bezakan a^2", "dan a^3 dalam", "kedua-dua rumus itu."},
   "V=a^3; L=6*a^2 a = panjang rusuk Bongkah apakah ini?"},
  {"K3", Shape::CUBE, 1,
   {"6 muka rata;", "V=125cm^3,L=150cm^2", "Cari bentangannya."},
   {"HINT: Uji ukuran", "yang memenuhi V dan", "luas yang diberi."},
   "6 muka rata; V=125cm^3,L=150cm^2 Cari bentangannya."},
  {"C1", Shape::CONE, 0,
   {"Ada satu tapak bulat", "dan satu puncak.", "Bongkah apakah ini?"},
   {"HINT: Lakarkan tapak", "dan titik puncaknya.", "Fikir bentuk sisi."},
   "Ada satu tapak bulat dan satu puncak. Bongkah apakah ini?"},
  {"C2", Shape::CONE, 0,
   {"V=pi*r^2*t/3", "L=pi*r*(r+s)", "Bongkah apakah ini?"},
   {"HINT: t=tinggi tegak", "s=tinggi condong.", "Bezakan dua ukuran."},
   "V=pi*r^2*t/3 L=pi*r*(r+s) Bongkah apakah ini?"},
  {"C3", Shape::CONE, 1,
   {"Jejari=3cm; t=4cm", "V=12*pi cm^3", "Cari bentangannya."},
   {"HINT: Luas tapak", "darab tinggi dahulu;", "banding dengan V."},
   "Jejari=3cm; t=4cm V=12*pi cm^3 Cari bentangannya."},
  {"B1", Shape::CUBOID, 0,
   {"Bentuk kotak kasut,", "p, l dan t berbeza.", "Bongkah apakah ini?"},
   {"HINT: Bandingkan", "panjang, lebar dan", "tinggi yang diberi."},
   "Bentuk kotak kasut, p, l dan t berbeza. Bongkah apakah ini?"},
  {"B2", Shape::CUBOID, 0,
   {"V=plt; L=2(pl+pt+lt)", "p, l dan t berbeza.", "Bongkah apakah ini?"},
   {"HINT: p=panjang,", "l=lebar, t=tinggi.", "Semak setiap ukuran."},
   "V=plt; L=2(pl+pt+lt) p, l dan t berbeza. Bongkah apakah ini?"},
  {"B3", Shape::CUBOID, 1,
   {"Tapak:6cm x 4cm", "t=3cm; V=72cm^3", "Pilih bentangannya."},
   {"HINT: Bayang ruang", "yang diisi penuh", "dengan ukuran itu."},
   "Tapak:6cm x 4cm t=3cm; V=72cm^3 Pilih bentangannya."},
};
constexpr uint8_t QUESTION_COUNT = sizeof(QUESTIONS) / sizeof(QUESTIONS[0]);
static_assert(QUESTION_COUNT == 15, "Bank mesti mempunyai 15 soalan.");
static_assert(QUESTION_COUNT == SHAPE_COUNT * QUESTIONS_PER_SHAPE, "Tiga soalan bagi setiap jenis.");

// Setiap jenis aktif diberi peluang dahulu; baki tempat diisi dengan ID unik.
// Semua 5 jenis aktif: tepat 1 soalan rawak per jenis dalam pusingan 5 soalan.
inline uint8_t bankBuildRound(uint8_t activeMask, uint8_t *out) {
  if (!out || !activeMask || (activeMask & ~ALL_SHAPES_MASK)) return 0;
  uint8_t pool[QUESTION_COUNT] = {}, poolSize = 0;
  for (uint8_t i = 0; i < QUESTION_COUNT; ++i)
    if (activeMask & (1U << uint8_t(QUESTIONS[i].answer))) pool[poolSize++] = i;
  for (uint8_t n = poolSize; n > 1; --n) {
    const uint8_t pick = uint8_t(random(n)), value = pool[n - 1];
    pool[n - 1] = pool[pick]; pool[pick] = value;
  }
  uint8_t length = 0, seenShapes = 0;
  bool selected[QUESTION_COUNT] = {};
  for (uint8_t i = 0; i < poolSize && length < ROUND_TARGET; ++i) {
    const uint8_t q = pool[i], bit = uint8_t(1U << uint8_t(QUESTIONS[q].answer));
    if (seenShapes & bit) continue;
    out[length++] = q; selected[q] = true; seenShapes |= bit;
  }
  for (uint8_t i = 0; i < poolSize && length < ROUND_TARGET; ++i)
    if (!selected[pool[i]]) { out[length++] = pool[i]; selected[pool[i]] = true; }
  for (uint8_t n = length; n > 1; --n) {
    const uint8_t pick = uint8_t(random(n)), value = out[n - 1];
    out[n - 1] = out[pick]; out[pick] = value;
  }
  return length;
}
