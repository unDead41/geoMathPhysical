# GeoDecoder Digital BM / English

Tarikh semakan: 25 Oktober 2026, Malaysia. Branch kerja: `digital-dwi`.
Versi digital cadangan: **v1.1.0**; firmware kekal **v1.1.3**. Versi digital ini
belum diterbitkan ke `main`. Polisi nombor mengikuti `docs/SOR_VERSIONING.md`;
versi digital datang daripada `dist/core.mjs`, diselaraskan dengan package,
README, changelog digital dan lencana paparan. Jangan naikkan nombor firmware
untuk menggambarkan perubahan digital pada branch ini.

## Rujukan kod yang dibaca

| Rujukan | SHA penuh | Versi / kegunaan |
|---|---|---|
| `digitalize` | `cd47ebd7dbcbab709b9f61a2122f7492f2b74113` | Digital v1.0.0; sumber kerja |
| `main` | `a059979d97926b82cafd4aa5cf3fe59da04a55bb` | Firmware v1.1.3; bank 15 soalan |
| `sharing` | `01b549a26861ef5f093d4c2c630700de37008d6b` | SHA pemeriksaan awal; tiada perubahan |

`digital-dwi` dibuat terus daripada SHA `digitalize` di atas. `digitalize-bm-bi`
digantikan oleh arahan akhir pengguna untuk menggunakan `digital-dwi`.
GitHub connector mengambil sumber pada SHA tetap; 30 blob teks disahkan dengan
hash Git sebelum penyuntingan dalam checkout berasingan. Commit bootstrap
tempatan bukan sejarah repository remote. Publication menggunakan tree asal dan
satu parent remote sebenar supaya fail firmware/PDF yang tidak disentuh kekal.

Peraturan asas yang dikekalkan: 10 soalan unik, dua bagi setiap lima bongkah;
R1 dahulu kemudian R2, +1 hanya bagi pasangan lengkap, cubaan semula selepas
salah, petunjuk tanpa penalti, langkau +0, maklum balas 900 ms dan skor setempat.
Permintaan had satu percubaan/animasi/analitik dalam chat lain belum berada pada
commit asas ini. Branch bahasa tidak mengubah atau mendakwa telah melaksanakan
perubahan permainan tersebut. Tiada pengubahsuaian kepada branch modul.

## Kontrak bahasa

- `dist/i18n.mjs`: `createI18n(storage)`, `translate(language,key,params)`,
  `localizeQuestion(question,language)`, `shapeName(shape,language)`,
  `MESSAGES`, `SHAPE_COPY`, `QUESTION_COPY`, `LANGUAGE_KEY`.
  `dist/format.mjs` menyediakan `escapeHtml()` dan `formatMathText()` untuk
  pemformatan matematik yang tidak merosakkan perkataan BM/BI.
- Kod locale ialah `ms` dan `en`; paparan pilihannya **Bahasa Melayu / English**.
  Default `ms`, disimpan melalui kunci `geodecoder.digital.language`. Storage
  ditolak/tidak tersedia tidak menghalang pertukaran dalam sesi.
- Kekalkan ID `P1..P3`, `S1..S3`, `K1..K3`, `C1..C3`, `B1..B3` dan shape ID.
  `Game` menerima `QUESTIONS` asal; teks paparan tidak menentukan jawapan.
- Kunci mesej biasa menggunakan teks sumber BM yang dibekukan sebagai ID,
  mengikut gaya gettext; kedua-dua nilai BM dan BI berada dalam kamus.
  Jangan menukar ID tersebut semata-mata untuk menyunting ayat paparan.
  Mesej berparameter menggunakan ID semantik seperti `question.counter`.
- Simbol `V`, `L`, `j`, `t`, `s`, `a`, `p`, `l`, nombor dan rumus dikekalkan
  dalam BI. Contohnya `j = radius`, `t = height`; jangan menukar simbol tanpa
  menyelaraskan formula, rajah dan jawapan. English/DLP lazim menggunakan simbol
  lain dalam sesetengah contoh, tetapi makna simbol ditakrifkan bagi soalan ini.
- Pembetulan BM pada lapisan paparan sahaja: persegi dijelaskan sebagai segi
  empat sama; rusuk diselaraskan kepada tepi; sisi melengkung dijelaskan sebagai
  permukaan melengkung. Fail bank dan snapshot rujukan asal dikekalkan.
- Satu elemen pemilih bahasa dipindahkan ke kepala dialog semasa dialog modal
  dibuka, kemudian dikembalikan ke navigasi. Tiada pemilih kedua. Refresh bahasa
  tidak memanggil tindakan `scan`, `toggleHint`, `update`, `skip`, `resume` atau
  memulakan `Game` baharu. Kad terpilih/diterima, order dan masa kekal.
- Keputusan dilukis semula oleh `renderResult()` tanpa `store.save()`. Hanya
  `finishGame()` menyimpan sekali. Kunci skor lama dikekalkan; rekod digital
  v1.0.0 dan v1.1.0 dibaca bersama. Kategori tersimpan kekal `Murid` / `Pelajar`;
  label BI ialah Pupil / Student, termasuk eksport CSV.
- Semua terjemahan disertakan dalam HTML tunggal. Tiada API terjemahan,
  font luaran atau permintaan rangkaian diperlukan untuk bermain.

## Kontrak untuk `digitalize-module`

Import fungsi di atas; gunakan locale tunggal aplikasi. Kunci `view.top`,
`view.bottom`, `view.front`, `view.back`, `view.left`, `view.right`, `view.plan`,
`view.frontElevation`, `view.sideElevation`, `animation.unfold`, `animation.fold`,
`animation.play`, `animation.pause`, `animation.reset` tersedia untuk integrasi.
Ia tidak bermaksud UI/animasi modul telah dibina pada branch bahasa.

`view.plan` ialah pandangan atas ortogon. Jangan melabel pandangan bawah sebagai
pelan atau menganggap putaran model perspektif menghasilkan dongakan ortogon.
Label kanan/kiri perlu mengikut arah model yang ditetapkan modul.

## Audio

Sumber asas hanya menggunakan nada osilator Web Audio untuk tindakan permainan;
tiada rakaman pertuturan soalan/hint BM atau BI dalam pakej digital ini. Nada
neutral digunakan dalam kedua-dua bahasa. Integrasi audio kemudian perlu
memetakan `{locale, questionId, role}` kepada fail bahasa yang benar-benar ada;
jika tiada, jangan memainkan pertuturan bahasa lain secara senyap. Tiada fail
ElevenLabs atau branch audio diubah di sini.

## Rujukan kurikulum dan status sumber

Dokumen asal KPM/Bahagian Pembangunan Kurikulum diutamakan. Koleksi sekolah
yang diberikan pengguna menyenaraikan edisi BM dan DLP, tetapi viewer terbenam
tidak memberikan teks halaman secara terus. Salinan dokumen asal pada mirror
berikut digunakan untuk menyemak kandungan; mirror bukan hos rasmi KPM.
Tarikh muat naik mirror tidak dianggap tahun edisi atau bukti kurikulum terbaharu.

| ID | Tajuk / edisi yang dikenal pasti | Halaman / standard yang dibaca | Pautan |
|---|---|---|---|
| R0 | Koleksi DSKP Matematik sekolah, BM dan DLP | Indeks dokumen; tiada tuntutan istilah daripada indeks sahaja | https://sites.google.com/moe-dl.edu.my/e-panitiamt/dokumen-standard-kurikulum-dan-pentaksiran/dskp-mata-pelajaran-terkini |
| R1 | DSKP KSSM Matematik Tingkatan 2, edisi BM | Halaman bercetak 52, viewer 64; 6.1.1 sifat bongkah, 6.2.1 bentangan, 6.3.1 luas permukaan | https://fliphtml5.com/mozgb/cwav/DSKP_KSSM_Matematik_Tingkatan_2/64/ |
| R2 | DSKP KSSM Mathematics Form 2, edisi BI | Halaman bercetak 50, viewer 62; standard 6.1.1, 6.2.1, 6.3.1 sepadan | https://fliphtml5.com/kqyri/iqio/9_DSKP_KSSM_Mathematics_Form_2/62/ |
| R3 | Buku Teks Matematik Tingkatan 2 (KSSM), BM | Bab 6, halaman bercetak 102, viewer 110; bentangan dan bentuk 2D penyusunnya | https://fliphtml5.com/zfzzp/akft/Buku_Teks_Matematik_Tingkatan_2_(KSSM)/110/ |
| R4 | Buku Teks Digital KSSM Mathematics Form 2, BI/DLP | Bab 6, halaman bercetak 100 dan 106, viewer 108 dan 114; dimensi, bentuk, slant height, curved surface, sector, circular base | https://fliphtml5.com/ffacx/eglx/Buku-Teks-Digital-KSSM-Mathematics-Form-2/108/ ; https://fliphtml5.com/ffacx/eglx/Buku-Teks-Digital-KSSM-Mathematics-Form-2/114/ |
| R5 | DSKP KSSM Mathematics Form 3 v2, BI | Halaman bercetak 58, viewer 70; 7.1.1 unjuran ortogon dan 7.2.1 plans and elevations | https://fliphtml5.com/kqyri/vcym/DSKP_KSSM_Mathematics_Form_3_v2/70/ |
| R6 | DSKP KSSM Matematik Tingkatan 3, BM | Halaman bercetak 58; topik 7.0 Pelan dan Dongakan, standard 7.1.1 dan 7.2.1 | https://asiemodel.net/wp-content/uploads/2022/08/002-DSKP-KSSM-MATEMATIK-TINGKATAN-3.pdf |

Tahun cetakan/edisi terbaharu dokumen R1–R4 belum disahkan daripada salinan
rasmi terus di hos BPK. R5 menyokong penamaan topik; semua label arah tambahan
ialah bahasa penerangan, bukan dakwaan bahawa setiap label disebut secara
verbatim dalam DSKP. Semakan akhir guru Matematik masih sesuai, terutama aras
bahasa dan pengertian kategori Murid/Pelajar mengikut konteks sekolah.

Glosari: [DWI_GLOSSARY.md](DWI_GLOSSARY.md). Bukti: [DWI_VERIFICATION.md](DWI_VERIFICATION.md).
