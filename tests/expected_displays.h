// LCD copy: R1 questions retained, R2 questions indirect, hints guide thinking.
struct ExpectedDisplay {const char* id; uint8_t reader; const char* question[3]; const char* hint[3];};
const ExpectedDisplay EXPECTED_DISPLAYS[] = {
  {"P1", 0, {"Bongkah apakah ini?", "5 muka, 5 bucu dan", "8 rusuk."}, {"HINT: Fikir susunan", "muka yang bertemu", "pada bucu yang sama."}},
  {"P2", 0, {"V=a^2*t/3", "a=sisi tapak persegi", "t=tinggi. Bongkah?"}, {"HINT: Nilai a^2", "mewakili luas tapak.", "Tafsir faktor 1/3."}},
  {"P3", 1, {"Tapak persegi:a=6cm", "t=5cm; V=60cm^3", "Cari bentangannya."}, {"HINT: Luas tapak", "darab tinggi dahulu;", "banding dengan V."}},
  {"S1", 0, {"Tin minuman ada dua", "tapak bulatan sama.", "Bongkah apakah ini?"}, {"HINT: Hubungkan", "bentuk tapak dengan", "permukaan sisinya."}},
  {"S2", 0, {"V=pi*r^2*t", "L=2*pi*r*(r+t)", "Bongkah apakah ini?"}, {"HINT: Asingkan L", "kepada luas tapak", "dan luas sisinya."}},
  {"S3", 1, {"Jejari=3cm; t=4cm", "V=36*pi cm^3", "Cari bentangannya."}, {"HINT: Kira pi*r^2*t", "Banding dengan V", "sebelum pilih kad."}},
  {"K1", 0, {"6 muka segi empat", "sama dan sepadan.", "Bongkah apakah ini?"}, {"HINT: Lakarkan satu", "muka, lalu bayang", "bentuk tertutupnya."}},
  {"K2", 0, {"V=a^3; L=6*a^2", "a = panjang rusuk", "Bongkah apakah ini?"}, {"HINT: Bezakan a^2", "dan a^3 dalam", "kedua-dua rumus itu."}},
  {"K3", 1, {"6 muka rata;", "V=125cm^3,L=150cm^2", "Cari bentangannya."}, {"HINT: Uji ukuran", "yang memenuhi V dan", "luas yang diberi."}},
  {"C1", 0, {"Ada satu tapak bulat", "dan satu puncak.", "Bongkah apakah ini?"}, {"HINT: Lakarkan tapak", "dan titik puncaknya.", "Fikir bentuk sisi."}},
  {"C2", 0, {"V=pi*r^2*t/3", "L=pi*r*(r+s)", "Bongkah apakah ini?"}, {"HINT: t=tinggi tegak", "s=tinggi condong.", "Bezakan dua ukuran."}},
  {"C3", 1, {"Jejari=3cm; t=4cm", "V=12*pi cm^3", "Cari bentangannya."}, {"HINT: Luas tapak", "darab tinggi dahulu;", "banding dengan V."}},
  {"B1", 0, {"Bentuk kotak kasut,", "p, l dan t berbeza.", "Bongkah apakah ini?"}, {"HINT: Bandingkan", "panjang, lebar dan", "tinggi yang diberi."}},
  {"B2", 0, {"V=plt; L=2(pl+pt+lt)", "p, l dan t berbeza.", "Bongkah apakah ini?"}, {"HINT: p=panjang,", "l=lebar, t=tinggi.", "Semak setiap ukuran."}},
  {"B3", 1, {"Tapak:6cm x 4cm", "t=3cm; V=72cm^3", "Pilih bentangannya."}, {"HINT: Bayang ruang", "yang diisi penuh", "dengan ukuran itu."}},
};
