# Audit kandungan Matematik Duel — 26 Oktober 2026

Audit ini menggunakan enam PDF yang dilampirkan oleh pemilik projek dan kod sebenar pada asas integrasi `790d989d666e64f3beabb507cd4140b832696367`. Kod dibaca: `digital/dist/questions.mjs`, `i18n.mjs`, `art.mjs`, `format.mjs`, `core.mjs`, `app.mjs`, serta seed Duel dalam `backend/duel/schema.sql`. Tiada perubahan pada firmware atau bank canonical dibuat oleh audit ini.

## Sumber dan kaedah halaman

Nombor **PDF** di bawah ialah indeks halaman satu-asas dalam fail lampiran, bukan label halaman dalaman pembaca PDF. Nombor **bercetak** ialah nombor yang kelihatan pada muka surat buku. Fail buku Tingkatan 2 mempunyai **dua muka surat bercetak dalam satu halaman PDF**; buku Tingkatan 3 mempunyai satu muka surat bercetak bagi setiap halaman PDF. Offset tidak boleh disalin antara kedua-dua set.

| ID sumber | Fail lampiran sebenar | Bahagian yang diperiksa |
|---|---|---|
| D2 | DSKP KSSM MATEMATIK TINGKATAN 2.pdf | Bab 6.0, bercetak 52–54; PDF 64–66 |
| BM2 | Matematik Tingkatan 2 KSSM.pdf | Bab 6, pengenalan serta seksyen 6.1–6.4, bercetak 98–117; PDF 54–63 |
| EN2 | Mathematics Form 2 KSSM.pdf | Chapter 6, seksyen sepadan, bercetak 98–117; PDF 54–63 |
| BM3 | Matematik Tingkatan 3 KSSM.pdf | Isi kandungan dan Bab 7 terpilih: 7.1, bercetak 170–171/PDF 180–181; 7.2, bercetak 182–184/PDF 192–194 |
| EN3 | Mathematics Form 3 KSSM.pdf | Isi kandungan dan Chapter 7, seksyen sepadan, bercetak 170–171/PDF 180–181 serta 182–184/PDF 192–194 |
| D3 | DSKP-KSSM-MATEMATIK-TINGKATAN-3.pdf | Bab 7.0, bercetak 58–60; PDF 70–72 |

Teks digunakan untuk menemukan seksyen; paparan PDF yang dirender diperiksa bagi jadual Standard Pembelajaran T2, bentangan, rumus luas permukaan dan isi padu. Sumber diparafrasa untuk traceability; tiada bab atau bank latihan buku disalin secara pukal.

## Skop kurikulum yang disahkan

Skop bank Duel semasa ialah **Tingkatan 2, Bab 6: Bentuk Geometri Tiga Dimensi**. Lima pilihan aktif ialah kubus, kuboid, piramid bertapak segi empat sama, silinder dan kon. Skop ini ialah sebahagian bab; ia belum meliputi sfera, semua jenis prisma, semua bentangan yang sah, gabungan bongkah atau penyelesaian masalah luas/isi padu.

| Standard | Lokasi DSKP yang disahkan | Hubungan sebenar dengan permainan |
|---|---|---|
| T2 6.1.1 | D2 bercetak 52, PDF 64 | Mengenal sifat serta membezakan contoh bongkah. Bank meliputi subset bentuk yang dinyatakan dalam standard. |
| T2 6.2.1 | D2 bercetak 52, PDF 64 | Memadankan contoh bentangan dengan bongkah. Pemilihan kad sahaja belum membuktikan murid boleh melukis bentangan atau membina model. |
| T2 6.3.1 | D2 bercetak 52, PDF 64 | Mengenal rumus luas permukaan pada K2, S2 dan C2. Tiada bukti penguasaan menerbitkan rumus atau menghitung luas hanya daripada jawapan ini. |
| T2 6.4.1 | D2 bercetak 53, PDF 65 | Mengenal hubungan rumus isi padu pada P2, S2, K2, C1 dan B2. Mengenal rumus ialah sokongan pembelajaran, bukan bukti murid telah menerbitkannya. |
| T2 6.4.2 | D2 bercetak 53, PDF 65 | Konteks rumus yang digunakan selaras; permainan semasa tidak meminta pengiraan nilai isi padu, maka jangan label item sebagai penilaian penuh standard ini. |
| T3 7.1.1–7.1.2 | D3 bercetak 58, PDF 70 | Peluasan berasas untuk unjuran ortogon; **belum diuji oleh 15 item semasa**. |
| T3 7.2.1 | D3 bercetak 58, PDF 70 | Peluasan pelan/dongakan mengikut skala; memerlukan tugasan/rajah baharu yang membezakan pandangan, bukan sekadar kad bentangan. |
| T3 7.2.2–7.2.3 | D3 bercetak 59, PDF 71 | Peluasan mensintesis objek dan menyelesaikan masalah; **belum termasuk dalam Duel**. |

DSKP T2 bercetak 54/PDF 66 menerangkan prestasi daripada pengetahuan asas hingga masalah bukan rutin. Markah Duel semasa tidak wajar ditukar terus menjadi TP rasmi atau dakwaan KBAT. Tahap mudah/sederhana di bawah ialah penilaian editorial untuk pemilihan kad, bukan tahap yang telah ditentusahkan melalui kajian murid.

## Matriks audit 15 item sebenar

Semua item memerlukan R1 mengenal bongkah kemudian R2 memilih bentangan yang sepadan. SP bagi R2 ialah sokongan 6.2.1 walaupun prompt utama berkaitan sifat atau rumus.

| ID | Jawapan sah | Konsep dan tahap editorial | Jejak sumber BM/EN dan halaman | Standard utama serta keputusan |
|---|---|---|---|---|
| P1 | Piramid bertapak segi empat sama | Tapak persegi + empat muka segi tiga; mudah | BM2/EN2 bercetak 100–101/PDF 55 (sifat), 103/PDF 56 (rajah tapak segi empat sama) | 6.1.1; betul dalam pilihan aktif. Nama khusus piramid tapak persegi sudah digunakan dalam label UI. |
| P2 | Piramid bertapak segi empat sama | V = a²t/3; sederhana | BM2/EN2 bercetak 111/PDF 60 dan 113/PDF 61 | 6.4.1 (pengenalan rumus); betul apabila a ialah panjang sisi tapak dan t tinggi tegak. |
| P3 | Piramid bertapak segi empat sama | Satu petak dan empat segi tiga; mudah | BM2/EN2 bercetak 102–103/PDF 56, 104/PDF 57 | 6.2.1; betul bagi bentangan sah yang disediakan, bukan dakwaan sebarang susunan lima poligon boleh dilipat. |
| S1 | Silinder | Dua tapak bulatan kongruen pada contoh tin; mudah | BM2/EN2 bercetak 101/PDF 55 | 6.1.1; betul. Hint digital menggunakan satu permukaan melengkung, selaras istilah. |
| S2 | Silinder tertutup | V = πj²t dan L = 2πj(j+t); sederhana | BM2/EN2 bercetak 105/PDF 57 (luas), 111/PDF 60 dan 113/PDF 61 (isi padu) | 6.3.1 + 6.4.1; rumus betul untuk model silinder tegak tertutup. Legenda j/t memang diberi UI. |
| S3 | Silinder | Dua bulatan dan satu segi empat tepat; mudah | BM2/EN2 bercetak 103/PDF 56, 105/PDF 57 | 6.2.1; betul bagi silinder tegak tertutup yang dipaparkan. |
| K1 | Kubus | Enam muka segi empat sama; mudah | BM2/EN2 bercetak 100–101/PDF 55 dan 104–105/PDF 57 | 6.1.1; betul. Hint 12 tepi sama panjang sah. |
| K2 | Kubus | V = a³ dan L = 6a²; sederhana | BM2/EN2 bercetak 107/PDF 58 (luas), 111/PDF 60 (prisma/kuboid; kes panjang=lebar=tinggi) | 6.3.1 + sokongan 6.4.1; kedua-dua rumus sah. a³ ialah pengkhususan p×l×t, bukan petikan tepat rumus yang didakwa dari halaman buku. |
| K3 | Kubus | Enam petak sama saiz dalam bentangan sah; mudah | BM2/EN2 bercetak 102–104/PDF 56–57 dan 105/PDF 57 | 6.2.1; SVG menyediakan enam petak dan susunan boleh dilipat. |
| C1 | Kon | V = πj²t/3; sederhana | BM2/EN2 bercetak 112–113/PDF 61 | 6.4.1; betul. t tinggi tegak, berbeza daripada s tinggi sendeng. |
| C2 | Kon tertutup | L = πj(j+s); sederhana | BM2/EN2 bercetak 106/PDF 58 dan 109/PDF 59 | 6.3.1; betul dan setara πj²+πjs. Hint digital menerangkan s pada garis lurus di permukaan melengkung. |
| C3 | Kon | Sektor bulatan + satu bulatan; mudah | BM2/EN2 bercetak 103/PDF 56 dan 106/PDF 58 | 6.2.1; betul. Sektor bukan segi tiga, dan lengkok mesti sepadan lilitan tapak. |
| B1 | Kuboid contoh dengan tiga ukuran tidak sama | Sifat kotak contoh; mudah | BM2/EN2 bercetak 100–101/PDF 55 (prisma), 107/PDF 58 (contoh kuboid) | Sokongan 6.1.1; jawapan yang dimaksudkan betul dalam pilihan aktif. Perkataan "3 ukuran berbeza" mesti difahami sebagai sifat contoh ini, bukan definisi semua kuboid. |
| B2 | Kuboid contoh dengan tiga ukuran tidak sama | V = p×l×t; sederhana | BM2/EN2 bercetak 111/PDF 60 | Sokongan 6.4.1; rumus betul. p/l/t ialah panjang/lebar/tinggi. Jangan mengajar bahawa semua kuboid wajib mempunyai tiga ukuran berlainan. |
| B3 | Kuboid 6 cm × 4 cm × 3 cm | Memadankan bentangan contoh; mudah–sederhana | BM2/EN2 bercetak 102–104/PDF 56–57 (kaedah bentangan), 107/PDF 58 (pasangan muka kuboid) | 6.2.1; ukuran 6×4×3 ialah contoh asal bank, bukan soalan yang disalin dari buku. Nisbah segi empat SVG sepadan. |

## BM/English, unit dan rajah

- BM semasa menggunakan **segi empat sama**, **segi empat tepat**, **segi tiga**, **sektor bulatan**, **jejari**, **tinggi tegak/tinggi**, dan **tinggi sendeng**. EN menggunakan **square**, **rectangle**, **triangle**, **sector of a circle**, **radius**, **height**, **slant height**, dan **apex**. Piramid ini dilabel khusus **square-based pyramid**, selaras contoh.
- Simbol j/t dikekalkan dalam English supaya rumus serta ID stabil antara bahasa; pada S2, `app.mjs` memaparkan legenda radius/height. Ini bukan simbol hilang. Penukaran kepada r/h hanya dalam EN tidak diperlukan untuk membetulkan matematik dan boleh menambah risiko parser/penyelarasan.
- `format.mjs` memaparkan `6cm x 4cm` sebagai unit berjarak dan tanda ×; formula menggunakan MathML, pecahan dan kuasa. Teks sumber padat bukan bukti paparan unit rosak. Pengiraan luas memerlukan unit² dan isi padu unit³ jika item berangka ditambah kelak; item semasa meminta padanan, bukan jawapan nombor.
- Kubus SVG: enam petak pada bentangan; satu lajur dengan petak atas/bawah dan baris empat, susunan sah.
- Kuboid SVG: lebar muka asas 48 dan 32, tinggi 24; nisbah **6:4:3**, tepat untuk contoh B3. Ia mempunyai tiga pasang muka yang sepadan.
- Piramid SVG: satu tapak segi empat sama dan empat segi tiga di sisi; model menunjukkan puncak serta sisi terlindung dengan garis putus.
- Kon SVG: jejari sektor 82.5, sudut sektor kira-kira 120°, jejari tapak 27.5. Panjang lengkok sektor 82.5×(2π/3) = 55π, sama dengan lilitan tapak 2π×27.5 = 55π; rajah ini konsisten.
- Silinder SVG: lebar bentangan 148 dan jejari tapak 23.5. 2π×23.5 ≈147.655, perbezaan pembundaran kira-kira 0.23%. Sesuai sebagai skema pemilihan; jangan gunakan piksel rajah itu sebagai latihan mengukur lilitan yang memerlukan skala tepat.
- Sesuatu rajah perspektif tidak semestinya dilukis mengikut skala. Jika ukuran hendak dinilai, berikan label panjang yang jelas; jangan meminta murid mengukur skrin.

## Penemuan dan keutamaan

| Keutamaan | Bukti | Tindakan yang berasas |
|---|---|---|
| P1 kandungan/pelaporan | Lima bentuk dan 15 item tidak mewakili semua Bab 6; tiada item T3. Semua formula diminta sebagai pengecaman, bukan pengiraan. | Labelkan sebagai latihan padanan T2 Bab 6. Jangan dakwa penguasaan penuh SP, TP rasmi, KBAT atau liputan T3 daripada keputusan Duel. |
| P2 bahasa | B1/B2 mengehadkan contoh kepada tiga ukuran berbeza. Kuboid secara umum boleh mempunyai dua ukuran yang sama (contoh buku bercetak 107). | Jika menyunting salinan digital, jelaskan "Dalam contoh ini, panjang, lebar dan tinggi tidak sama"; pelihara ID serta jawapan. Elakkan definisi umum "kuboid mesti tiga ukuran berbeza". |
| P2 variasi | Pemilihan seragam dua item bagi setiap bentuk mengawal liputan bentuk, tetapi kon mempunyai dua item rumus berbanding satu rumus bagi bentuk lain. | Semua pemain tetap menerima item yang sama dalam satu perlawanan. Jangan ubah taburan/peraturan tanpa cadangan konkrit; boleh rancang bank kesukaran yang berlabel apabila ada data murid. |
| P2 peluasan | T3 Bab 7 SP7.1–7.2 memang disahkan oleh kedua-dua buku dan DSKP. | Rancang mod/pek berasingan untuk unjuran, pelan dan dongakan selepas kontrak rajah/pandangan/skala disediakan. Jangan memasukkan kad T3 sebagai bentangan kerana konsep berbeza. |

Tiada jawapan bentuk atau rumus sedia ada yang dibuktikan salah oleh audit ini. Pembetulan besar pada bank atau peraturan tidak diperlukan untuk menstabilkan Duel. Ujian kebolehbacaan telefon, pembaca skrin dan penggunaan sebenar oleh murid masih perlu direkod oleh pemilik UI; semakan sumber dan geometri ini tidak menggantikannya.

## Pakej kandungan backend yang disediakan

`backend/duel/functions/geodecoder-duel/questions.mjs` menyediakan `DUEL_QUESTIONS`, keyed by original ID, serta katalog enam sumber `DUEL_SOURCES`. Modul berdikari ini tiada import frontend atau API runtime. Kedua-dua salinan bahasa dibekukan daripada `localizeQuestion` semasa penyediaan sahaja. S2 membawa legenda rumus BM/EN sedia ada. B1/B2 menyatakan ukuran berlainan sebagai **contoh ini / this example**; ID, jawapan, angka dan rumus kekal. Firmware serta bank offline tidak berubah.

Setiap rekod mempunyai bentuk jawapan dan metadata sumber yang **hanya untuk pelayan**. Handler mesti membina payload paparan yang membenarkan medan tertentu sahaja; jangan memulangkan seluruh rekod, sumber ID atau jawapan kepada pemain sebelum soalan diselesaikan. Metadata standard menggunakan `alignment: partial_support`; `difficulty.basis: team_estimate` dan `studentValidated: false` mengelakkan dakwaan kesukaran telah ditentusahkan oleh buku atau kajian murid.

Ujian khusus `node --test tests/duel-content.test.mjs` menyemak 15 ID, jawapan/topic canonical, BM/EN, formula/angka, pembetulan B1/B2, legenda S2 dan hubungan halaman bercetak/PDF. Enam ujian khusus lulus pada sumber ini; ini bukan laporan ujian permainan dua sesi atau deployment.
