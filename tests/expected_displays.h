// Reviewed LCD copy for all 15 question and hint screens.
struct ExpectedDisplay {const char* id; uint8_t reader; const char* question[3]; const char* hint[3];};
const ExpectedDisplay EXPECTED_DISPLAYS[] = {
  {"P1", 0, {"Bongkah apakah ini?", "Tapak persegi dengan", "4 muka segi tiga."}, {"HINT: Muka sisi akan", "bertemu pada puncak", "apabila dilipat."}},
  {"P2", 0, {"V=a^2*t/3; t=tinggi", "a=sisi tapak persegi", "Bongkah apakah ini?"}, {"HINT: a^2 ialah luas", "tapak. Fikir bentuk", "muka sisi bongkah."}},
  {"P3", 1, {"Pilih bentangan bagi", "1 segi empat sama", "dan 4 segi tiga."}, {"HINT: Lipat sisinya", "di sisi petak hingga", "bertemu di 1 puncak."}},
  {"S1", 0, {"Tin minuman ada dua", "tapak bulatan sama.", "Bongkah apakah ini?"}, {"HINT: 2 tapak bulat", "sama saiz disambung", "oleh sisi melengkung"}},
  {"S2", 0, {"V=pi*j^2*t", "L=2*pi*j*(j+t)", "Bongkah apakah ini?"}, {"HINT: j=jejari dan", "t=tinggi. Tapak atas", "dan bawah sama saiz."}},
  {"S3", 1, {"Pilih bentangan:", "2 bulatan sama saiz,", "1 segi empat tepat."}, {"HINT: Lengkungkan", "segi empat itu; dua", "bulatan jadi tapak."}},
  {"K1", 0, {"Enam muka berbentuk", "segi empat sama.", "Bongkah apakah ini?"}, {"HINT: 12 rusuk sama", "panjang. Setiap muka", "sama bentuk dan saiz"}},
  {"K2", 0, {"V=a^3; L=6*a^2", "a=panjang rusuk", "Bongkah apakah ini?"}, {"HINT: Panjang, lebar", "serta tinggi sama", "bagi bongkah ini."}},
  {"K3", 1, {"Pilih bentangan:", "6 segi empat sama,", "semuanya sama saiz."}, {"HINT: Bayangkan muka", "dilipat jadi kotak", "tanpa muka bertindih"}},
  {"C1", 0, {"V=pi*j^2*t/3", "j=jejari; t=tinggi.", "Bongkah apakah ini?"}, {"HINT: Lihat tapaknya", "yang bulat. Sisinya", "mengecil ke puncak."}},
  {"C2", 0, {"L=pi*j*(j+s)", "j=jejari; s=tinggi", "sendeng. Bentuk apa?"}, {"HINT: Tinggi sendeng", "diukur ikut sisi", "dari tapak ke puncak"}},
  {"C3", 1, {"Pilih bentangan yang", "ada 1 sektor bulatan", "dan 1 bulatan."}, {"HINT: Rapatkan sisi", "lurus pada sektor.", "Bulatan jadi tapak."}},
  {"B1", 0, {"Kotak ini mempunyai", "3 ukuran berbeza.", "Bongkah apakah ini?"}, {"HINT: Lihat panjang,", "lebar serta tinggi.", "Muka berhadapan sama"}},
  {"B2", 0, {"V=p*l*t; p,l,t ialah", "3 ukuran berbeza.", "Bongkah apakah ini?"}, {"HINT: p=panjang,", "l=lebar, t=tinggi.", "Lihat kotak kasut."}},
  {"B3", 1, {"Kotak: 6cm x 4cm", "dengan tinggi 3cm.", "Pilih bentangannya."}, {"HINT: Padankan muka", "yang sama saiz, lalu", "lipat menjadi kotak."}},
};
