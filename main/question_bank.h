#pragma once
#include "domain/types.h"

// Setiap soalan: kad bongkah R1, kemudian kad bentangan R2.
// Medan reader kekal metadata asal; tahap runtime menentukan pad.
// Baris pertama LCD kekal untuk nombor soalan, masa dan skor.
// Setiap soalan dan hint menggunakan tiga baris ASCII, maksimum 20 aksara.
// Ayat mengutamakan kefahaman; tidak perlu memenuhi ruang dengan perkataan tambahan.
// V=isi padu, L=luas permukaan, j=jejari, t=tinggi, s=tinggi sendeng.
// Nama jawapan tidak dipaparkan dalam soalan atau hint.
const Question QUESTIONS[] = {
  {"P1", Shape::PYRAMID, 0,
   {"Bongkah apakah ini?", "Tapak persegi dengan", "4 muka segi tiga."},
   {"HINT: Muka sisi akan", "bertemu pada puncak", "apabila dilipat."},
   "Bongkah apakah ini? Tapak persegi dengan 4 muka segi tiga."},
  {"P2", Shape::PYRAMID, 0,
   {"V=a^2*t/3; t=tinggi", "a=sisi tapak persegi", "Bongkah apakah ini?"},
   {"HINT: a^2 ialah luas", "tapak. Fikir bentuk", "muka sisi bongkah."},
   "V=a^2*t/3; t=tinggi a=sisi tapak persegi Bongkah apakah ini?"},
  {"P3", Shape::PYRAMID, 1,
   {"Pilih bentangan bagi", "1 segi empat sama", "dan 4 segi tiga."},
   {"HINT: Lipat sisinya", "di sisi petak hingga", "bertemu di 1 puncak."},
   "Pilih bentangan bagi 1 segi empat sama dan 4 segi tiga."},
  {"S1", Shape::CYLINDER, 0,
   {"Tin minuman ada dua", "tapak bulatan sama.", "Bongkah apakah ini?"},
   {"HINT: 2 tapak bulat", "sama saiz disambung", "oleh sisi melengkung"},
   "Tin minuman ada dua tapak bulatan sama. Bongkah apakah ini?"},
  {"S2", Shape::CYLINDER, 0,
   {"V=pi*j^2*t", "L=2*pi*j*(j+t)", "Bongkah apakah ini?"},
   {"HINT: j=jejari dan", "t=tinggi. Tapak atas", "dan bawah sama saiz."},
   "V=pi*j^2*t L=2*pi*j*(j+t) Bongkah apakah ini?"},
  {"S3", Shape::CYLINDER, 1,
   {"Pilih bentangan:", "2 bulatan sama saiz,", "1 segi empat tepat."},
   {"HINT: Lengkungkan", "segi empat itu; dua", "bulatan jadi tapak."},
   "Pilih bentangan: 2 bulatan sama saiz, 1 segi empat tepat."},
  {"K1", Shape::CUBE, 0,
   {"Enam muka berbentuk", "segi empat sama.", "Bongkah apakah ini?"},
   {"HINT: 12 rusuk sama", "panjang. Setiap muka", "sama bentuk dan saiz"},
   "Enam muka berbentuk segi empat sama. Bongkah apakah ini?"},
  {"K2", Shape::CUBE, 0,
   {"V=a^3; L=6*a^2", "a=panjang rusuk", "Bongkah apakah ini?"},
   {"HINT: Panjang, lebar", "serta tinggi sama", "bagi bongkah ini."},
   "V=a^3; L=6*a^2 a=panjang rusuk Bongkah apakah ini?"},
  {"K3", Shape::CUBE, 1,
   {"Pilih bentangan:", "6 segi empat sama,", "semuanya sama saiz."},
   {"HINT: Bayangkan muka", "dilipat jadi kotak", "tanpa muka bertindih"},
   "Pilih bentangan: 6 segi empat sama, semuanya sama saiz."},
  {"C1", Shape::CONE, 0,
   {"V=pi*j^2*t/3", "j=jejari; t=tinggi.", "Bongkah apakah ini?"},
   {"HINT: Lihat tapaknya", "yang bulat. Sisinya", "mengecil ke puncak."},
   "V=pi*j^2*t/3 j=jejari; t=tinggi. Bongkah apakah ini?"},
  {"C2", Shape::CONE, 0,
   {"L=pi*j*(j+s)", "j=jejari; s=tinggi", "sendeng. Bentuk apa?"},
   {"HINT: Tinggi sendeng", "diukur ikut sisi", "dari tapak ke puncak"},
   "L=pi*j*(j+s) j=jejari; s=tinggi sendeng. Bentuk apa?"},
  {"C3", Shape::CONE, 1,
   {"Pilih bentangan yang", "ada 1 sektor bulatan", "dan 1 bulatan."},
   {"HINT: Rapatkan sisi", "lurus pada sektor.", "Bulatan jadi tapak."},
   "Pilih bentangan yang ada 1 sektor bulatan dan 1 bulatan."},
  {"B1", Shape::CUBOID, 0,
   {"Kotak ini mempunyai", "3 ukuran berbeza.", "Bongkah apakah ini?"},
   {"HINT: Lihat panjang,", "lebar serta tinggi.", "Muka berhadapan sama"},
   "Kotak ini mempunyai 3 ukuran berbeza. Bongkah apakah ini?"},
  {"B2", Shape::CUBOID, 0,
   {"V=p*l*t; p,l,t ialah", "3 ukuran berbeza.", "Bongkah apakah ini?"},
   {"HINT: p=panjang,", "l=lebar, t=tinggi.", "Lihat kotak kasut."},
   "V=p*l*t; p,l,t ialah 3 ukuran berbeza. Bongkah apakah ini?"},
  {"B3", Shape::CUBOID, 1,
   {"Kotak: 6cm x 4cm", "dengan tinggi 3cm.", "Pilih bentangannya."},
   {"HINT: Padankan muka", "yang sama saiz, lalu", "lipat menjadi kotak."},
   "Kotak: 6cm x 4cm dengan tinggi 3cm. Pilih bentangannya."},
};
constexpr uint8_t QUESTION_COUNT = sizeof(QUESTIONS) / sizeof(QUESTIONS[0]);
static_assert(QUESTION_COUNT == 15, "Bank mesti mempunyai 15 soalan.");
static_assert(QUESTION_COUNT == SHAPE_COUNT * QUESTIONS_PER_SHAPE, "Tiga soalan bagi setiap jenis.");

// Setiap jenis aktif diberi peluang dahulu; baki tempat diisi dengan ID unik.
// Semua 5 jenis aktif: tepat 1 soalan rawak per jenis dalam pusingan 5 soalan.
inline uint8_t bankBuildRound(uint8_t activeMask, uint8_t *out, RandomIndex randomIndex) {
  if (!randomIndex || !out || !activeMask || (activeMask & ~ALL_SHAPES_MASK)) return 0;
  uint8_t pool[QUESTION_COUNT] = {}, poolSize = 0;
  for (uint8_t i = 0; i < QUESTION_COUNT; ++i)
    if (activeMask & (1U << uint8_t(QUESTIONS[i].answer))) pool[poolSize++] = i;
  for (uint8_t n = poolSize; n > 1; --n) {
    const uint8_t pick = randomIndex(n), value = pool[n - 1];
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
    const uint8_t pick = randomIndex(n), value = out[n - 1];
    out[n - 1] = out[pick]; out[pick] = value;
  }
  return length;
}

