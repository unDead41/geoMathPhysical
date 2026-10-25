# Audio soalan dan hint GeoDecoder — ElevenLabs

Pakej skrip semakan 1, disediakan pada 25 Oktober 2026 (Malaysia).
Branch kerja: `codex/question-audio-elevenlabs`.
Rujukan main dan asas branch: **v1.1.3**, commit
`a059979d97926b82cafd4aa5cf3fe59da04a55bb`.

**Skrip sudah disediakan; audio sebenar belum dijana atau diterima.**
Ijamm menjana suara dalam ElevenLabs. Tiada API key, panggilan TTS berbayar,
modul pemain, storan audio atau fungsi main balik ditambah kepada firmware.

## Bahan yang boleh terus digunakan

| Bahan | Kegunaan |
|---|---|
| [SCRIPTS.md](SCRIPTS.md) | Semua 15 soalan dan 15 hint, satu blok bacaan bagi setiap klip |
| [30 fail teks](../../audio/elevenlabs/scripts/) | Isi fail boleh disalin sepenuhnya ke ruangan bacaan ElevenLabs |
| [MAPPING.md](MAPPING.md) | ID tetap → tiga baris LCD asal → skrip suara → nama MP3 |
| [mapping.csv](../../audio/elevenlabs/mapping.csv) | Pemetaan 30 baris untuk semakan dalam spreadsheet |
| [manifest.json](../../audio/elevenlabs/manifest.json) | Sumber skrip, snapshot bank, nama fail dan status rakaman |
| [Folder klip](../../audio/elevenlabs/clips/) | Tempat menyimpan 30 MP3 sebenar selepas dijana |
| [INTEGRATION.md](INTEGRATION.md) | Audit awal perkakasan dan cadangan kawalan main balik |
| [VERIFICATION.md](VERIFICATION.md) | Bukti semakan pakej dan batas pengesahan |

Susunan eksport ialah P1–P3, C1–C3, K1–K3, B1–B3, S1–S3 seperti permintaan.
Susunan fizikal bank ialah P, S, K, C, B. Susunan pusingan pula dirawakkan.
Ketiga-tiganya dihubungkan menggunakan **ID teks**, bukan indeks array atau
label `Q1/5` pada LCD. `Question.reader` ialah metadata lama; semua ID masih
memerlukan R1 bongkah dahulu dan R2 bentangan sepadan.

## Semakan maksud sebelum menjana

Main dan branch yang dibaca mempunyai SHA dan blob bank yang sama.
Tiada perbezaan maksud ditemui antara 30 ayat pengguna dengan bank runtime.
Semua ayat suara pengguna dikekalkan tepat. Teks LCD tidak diubah.

| Penyesuaian bacaan | Semakan |
|---|---|
| P1/P2: `persegi` → `segi empat sama` | Istilah seerti; bilangan muka dan bentuk tapak kekal |
| P2: `a^2*t/3` | Kuasa dua panjang sisi tapak, darab tinggi, kemudian bahagi tiga |
| C1: `pi*j^2*t/3` | Pi darab jejari kuasa dua darab tinggi, kemudian bahagi tiga |
| C2: `pi*j*(j+s)` | Pi darab jejari, didarab **hasil tambah** jejari dan tinggi sendeng |
| K2: `a^3` dan `6*a^2` | Isi padu rusuk kuasa tiga; luas permukaan enam darab rusuk kuasa dua |
| B2: `p*l*t` | Panjang darab lebar darab tinggi; tiga ukuran berbeza kekal disebut |
| B3: `6cm x 4cm`, tinggi `3cm` | Enam sentimeter panjang, empat sentimeter lebar, tiga sentimeter tinggi |
| S2: `pi*j^2*t` dan `2*pi*j*(j+t)` | Kuasa dua hanya pada jejari; hasil tambah jejari dan tinggi kekal berkurung |
| C2 hint: `dari tapak` → `dari tepi tapak` | Memperjelas lokasi tinggi sendeng sepanjang sisi |
| S3 hint: `segi empat itu` → `segi empat tepat itu` | Merujuk muka yang sudah dinyatakan dalam soalan |

Nama bongkah jawapan tidak hadir dalam teks bacaan. Perkataan `kotak`,
`kotak kasut` dan `tin minuman` ialah analogi asal yang memang terdapat dalam bank.
Jika main/bank berubah kemudian, laporkan perbezaan dahulu; jangan mengubah
maksud skrip atau bank hanya untuk meluluskan checker.

## Cara menjana 30 klip

1. Buka [ElevenLabs Text to Speech](https://elevenlabs.io/text-to-speech/malay).
   Pilih suara dengan sebutan Bahasa Melayu Malaysia yang jelas dan model
   yang menyokong bahasa itu dalam akaun. Kekalkan suara/model untuk semua klip.
2. Cuba P2 soalan, C2 soalan dan S2 soalan terlebih dahulu. Dengar bacaan rumus,
   khususnya `kuasa dua`, `kuasa tiga`, `dibahagi tiga` dan `hasil tambah`.
   Cadangan penyampaian projek: tenang seperti guru, kelajuan sederhana,
   sebutan penuh dan jeda pendek antara ayat. Laras melalui tetapan suara
   yang tersedia; jangan tampal arahan gaya ke dalam teks bacaan.
3. Buka satu fail dalam `audio/elevenlabs/scripts/`. Salin **isi sahaja**.
   Fail `.txt` sudah mengandungi bacaan sahaja, tanpa label `Soalan:`,
   `Hint:`, ID atau nama fail. `Petunjuk:` ialah sebahagian bacaan hint.
4. Jana **satu klip untuk satu fail teks**. Jangan gabungkan soalan dan hint,
   dan jangan gabungkan semua 30 skrip dalam satu rakaman.
5. Muat turun sebagai **MP3 sebenar**, kemudian namakan tepat seperti mapping:
   `P1_soalan.mp3`, `P1_hint.mp3`, dan seterusnya. Menukar sambungan `.wav`
   menjadi `.mp3` tanpa penukaran audio bukan eksport MP3.
6. Simpan semua MP3 dalam `audio/elevenlabs/clips/`. Nama huruf besar/kecil
   perlu sama. Jangan tambah `(1)`, `final`, nombor pusingan atau nama jawapan.
7. Dengar setiap klip sampai habis. Semak perkataan, nombor, tertib operasi,
   kelantangan, tiada potongan awal/akhir, dan tiada ayat tambahan/ID yang dibaca.
   Jika perlu, jana semula klip berkenaan dengan nama canonical yang sama.
8. Catat `generation.voice_name`, `voice_id` jika diketahui, `model`, `settings`
   sebenar dan `generated_at` dalam manifest. Jangan isi API key. Tukar status
   setiap klip kepada `generated_pending_listen`, kemudian `approved` hanya
   selepas didengar. Medan `status` peringkat pakej ialah ringkasan manual.

Panduan rasmi menerangkan input teks, pemilihan suara, penjanaan dan muat turun
MP3; sokongan dan tetapan berbeza mengikut model/akaun. Lihat
[panduan TTS ElevenLabs](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech).
Pilihan gaya di atas ialah cadangan projek, bukannya nilai optimum yang sudah diuji.

## Semak fail pada komputer

Dari folder repo yang mengandungi `platformio.ini`:

```text
python tools/question_audio.py
python tools/check_version.py
```

Semakan pertama memastikan 15 ID, snapshot LCD/jawapan, 30 skrip, mapping dan
nama fail sepadan. `AUDIO PENDING 0/30` adalah betul sebelum MP3 dijana.
Ia **bukan** bukti audio siap atau audio sudah dimainkan.

Selepas semua MP3 diterima, gunakan FFmpeg yang menyediakan `ffprobe`:

```text
python tools/question_audio.py --require-audio
```

Jika MP3 berada dalam folder lain:

```text
python tools/question_audio.py --require-audio --audio-dir "C:/GeoDecoderAudio"
```

Mod ini memerlukan 30 MP3 sebenar, memeriksa codec dan tempoh positif.
Ia tidak menilai sebutan, bunyi atau ketepatan bacaan; semakan mendengar
setiap klip tetap diperlukan. Ia tidak meluluskan perkakasan atau timing permainan.

Untuk mengeksport semula selepas **manifest sudah disemak**:

```text
python tools/question_audio.py --write
```

Checker menolak bank yang berubah sebelum eksport. Semak semula main,
laporkan perubahan makna jika ada, dan kemas kini snapshot/hash hanya selepas
semakan yang sewajarnya. Jangan edit 30 fail teks atau mapping secara berasingan.

## Versi dan handoff

Pakej branch ini mengekalkan nombor firmware **v1.1.3** kerana firmware tidak
berubah dan tiada keluaran main diterbitkan. Mengikut SOR, cadangan keluaran
dokumen/aset sahaja ialah **v1.1.4** jika main masih v1.1.3 ketika integrasi.
Fungsi main balik baharu lazimnya memerlukan kenaikan MINOR; nombor akhirnya
ditentukan daripada main sebenar pada waktu integrasi. Ini bukan tag/release.

Semua commit/push kerja ini hanya ke `codex/question-audio-elevenlabs`.
Selepas Ijamm menyediakan 30 MP3 dan model komponen audio, langkah seterusnya
ialah audit audio/perkakasan akhir, pilih adapter dan bina integrasi mengikut
[pelan](INTEGRATION.md). Tiada perubahan pada main atau sharing dalam skop ini.
