> Rekod sumber terdahulu. Untuk aliran, struktur fail, bukti dan had semasa v2.4.0, lihat [EASE_OF_USE.md](EASE_OF_USE.md).

# Rich text GeoDecoder Digital

## Skop dan reka bentuk

Permintaan pengguna: kemas kini rich text permainan dan push hanya ke
`digital-richText`. Tafsiran pelaksanaan: paparan matematik dan teks pembelajaran
yang lebih jelas dalam BM/BI. Soalan, hint, semakan jawapan dan rumus menggunakan
renderer setempat yang sama. Sokongan cetak tebal, italik dan baris baharu
disediakan untuk kandungan pembelajaran. Nama pemain kekal sebagai teks biasa.

Asas: `main-digital` pada `71db77c0206de664e50fa57ff57e1825af13f938`,
digital v1.2.0. Branch BM/BI: `b8f7360fc15cb7b23666b092ade8e1d2058878bb`.
`main` diperiksa pada `a059979d97926b82cafd4aa5cf3fe59da04a55bb`, firmware
v1.1.3. Versi digital: v1.3.0 untuk fungsi rich text baharu yang serasi.
Worktree sendiri digunakan; sumber digital dipadankan dengan blob asas remote.
Fail firmware/aset lain dikekalkan melalui tree asas GitHub.

Pilihan pelaksanaan: MathML setempat memberikan pecahan dan kuasa dengan struktur
matematik serta label bacaan BM/BI. KaTeX/MathJax menambah dependency/binaan
font yang tidak diperlukan oleh rumus bank ini. Penggantian simbol sahaja tidak
memberikan pecahan berstruktur. Pilihan MathML ialah keputusan pelaksanaan.

## Pelan pelaksanaan

- [x] Tambah ujian tingkah laku: pecahan/keutamaan operasi, kuasa, unit, escape
  kandungan, penegasan istilah dan bacaan dwibahasa; sahkan kegagalan awal.
- [x] Bina renderer kecil tanpa dependency, kamus bacaan BM/BI dan gaya responsif.
- [x] Gunakan renderer dalam soalan/hint, kunci rumus dan penerangan semakan.
  Pertukaran bahasa kekal pada lapisan paparan; enjin, bank dan storan tidak berubah.
- [x] Uji suite sebenar, 15 soalan kedua-dua bahasa, 320/390px/desktop, permainan
  berjalan dan HTML offline. Simpan bukti paparan dan keputusan ujian.
- [x] Bina semula HTML digital dan root `index.html`, semak versi/diff dan
  semakan kod bebas. Penerbitan menggunakan commit berturutan daripada SHA asas
  remote; hanya ref `digital-richText` boleh ditulis. SHA sebenar dilaporkan
  selepas semakan ref remote.

## Perkara yang diperiksa

- Bahagian pengangka keseluruhan dibahagi 3, bukan hanya faktor terakhir.
- `tepi`, `overlapping` dan perkataan biasa tidak rosak oleh penukaran simbol.
- HTML/atribut daripada teks di-escape sebelum menjadi markup terkawal.
- Rumus BI dan BM membawa nilai, simbol dan jawapan yang sama.
- Label bacaan matematik sepadan bahasa, pecahan muat skrin kecil dan pertukaran
  bahasa tidak mengubah kemajuan atau analitik.

## Kontrak renderer

- `formatRichText(text, language = 'ms')` menghasilkan HTML terkawal untuk
  kandungan pembelajaran. `formatMathText(text, language = 'ms')` menggunakan
  pemformat matematik/unit yang sama tanpa penegasan istilah atau sintaks gaya.
  Bahasa yang disokong: `ms` dan `en`; nilai lain menggunakan BM.
- Tatabahasa rumus: nombor perpuluhan bertitik, pemboleh ubah satu huruf, token
  `pi`, kurungan, `=`, `+`, `-`, `*`/`×`, `/` dan `^`. Keutamaan operasi
  dikekalkan, termasuk seluruh pengangka `a^2*t` atau `pi*j^2*t` dibahagi 3.
  Had parser: 256 aksara dan kedalaman 32. Ini bukan parser LaTeX atau algebra penuh.
- Rumus utama menggunakan MathML dengan saiz pecahan yang boleh dibaca;
  pecahan/kuasa turut digunakan dalam hint dan semakan akhir. Setiap rumus
  mempunyai `role="math"` dan label bacaan tersusun dalam bahasa pilihan.
- Teks asal dengan `**tebal**`, `_italik_` dan baris baharu menghasilkan
  `strong`, `em` dan `br`. Gaya satu lapisan sahaja; tiada pautan, imej, HTML
  mentah atau gaya bersarang daripada kandungan. Asterisk tunggal kekal sebagai
  pendaraban apabila berada dalam rumus.
- Padanan istilah menggunakan frasa terpanjang dan sempadan perkataan Unicode
  daripada `RICH_TERMS` dalam kamus pusat. `MATH_SPEECH` menyimpan bacaan operasi
  BM/BI. Istilah dan bacaan ini hanya mempengaruhi paparan, bukan penentu jawapan.
- Berikan teks asal sekali sahaja kepada renderer. Jangan format output HTML
  kali kedua. Nama pemain/kelas kekal menggunakan `textContent`/`escapeHtml`.
- Untuk modul akan datang: import renderer yang sama, berikan locale aplikasi
  dan ID kandungan yang stabil. Sokongan akar/punca, subskrip, unary negatif dan
  ungkapan di luar subset perlu ditambah serta diuji sebelum digunakan.

## Pengesahan — 26 Oktober 2026 (Malaysia)

| Semakan | Keputusan |
|---|---|
| `npm test` | 53/53 lulus, termasuk 10 ujian formatter; ujian awal rich text gagal sebelum pelaksanaan, regresi fallback turut melalui gagal→lulus |
| `npm run standalone` + `npm run check` | Lulus: versi v1.3.0 sepadan, sintaks HTML tunggal, 82 ID unik, rujukan ARIA, kesetiaan bank dan HTML root sama tepat |
| `npm run test:browser` | 8/8 senario Chromium lulus: daftar, dialog, permainan, storan, analitik/CSV, bahasa, telefon dan offline |
| `npm run test:rich-text` | Semua 15 soalan dilihat melalui dua pusingan sebenar; 120 paparan BM/BI pada 1365px, 390px dan 320px; tiada limpahan atau rumus terpotong |
| Peraturan/pemuliharaan state | Pusingan 9/10 (satu salah R2) dan 10/10, 10 hint setiap pusingan; kad terpilih/diterima, susunan, warna dan skor kekal ketika tukar bahasa; rekod tersimpan/peratus analitik tidak ditulis semula |
| HTML offline | Pecahan berfungsi dalam BM/BI pada `file://`, sifar permintaan HTTP dan sifar ralat runtime; nama menyerupai HTML kekal teks |
| Diff/pemeriksaan bebas | Enjin hanya berubah nombor versi; bank, storage, ID jawapan dan peraturan kekal. Isu kecil fallback rumus tidak lengkap dibetulkan dan disemak semula |

Ujian Playwright ialah dependency pembangunan berasingan:

```sh
PLAYWRIGHT_MODULE_PATH=/path/to/playwright PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npm run test:rich-text
```

Bukti ialah tangkapan Chromium sebenar, dengan animasi dibekukan ketika
tangkapan untuk memudahkan bacaan; pemuliharaan node animasi diuji sebelum itu.

| Paparan | BM | English |
|---|---|---|
| Pecahan desktop | [BM](rich-text-evidence/fraction-desktop-ms.png) | [English](rich-text-evidence/fraction-desktop-en.png) |
| Rumus dan hint telefon | [BM](rich-text-evidence/formula-mobile-ms.png) | [English](rich-text-evidence/formula-mobile-en.png) |
| Semakan jawapan telefon | [BM](rich-text-evidence/correction-mobile-ms.png) | [English](rich-text-evidence/correction-mobile-en.png) |

Had pengesahan: pelayar sebenar yang diuji ialah Chromium desktop dengan
emulasi viewport telefon; Safari/Firefox, peranti telefon fizikal dan sebutan
pembaca skrin sebenar belum diuji. Label akses diperiksa pada DOM dan ujian
unit. Tiada rakaman pertuturan baharu. Had pengesahan edisi rasmi BPK dalam
`DWI_LANGUAGE.md` masih terpakai. Tiada firmware dibina atau hardware diuji.
Push branch ini tidak mengaktifkan GitHub Pages; status penerbitan direkodkan
dalam [DIGITAL_PUBLISHING.md](../../docs/DIGITAL_PUBLISHING.md).

## Rujukan teknikal

- [W3C MathML Core](https://www.w3.org/TR/mathml-core/): `mfrac`, `msup`, `mrow`.
- [W3C ARIA6](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA6.html): contoh
  objek `role="math"` dengan label bacaan.
- Istilah kurikulum kekal mengikut [glosari BM/BI](DWI_GLOSSARY.md) dan
  [rujukan serta had pengesahan DSKP](DWI_LANGUAGE.md).
