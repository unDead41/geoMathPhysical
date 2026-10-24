> Historical document from the supplied ZIP. Some counts, interfaces and results describe earlier revisions. Current setup: `README.md`; current behaviour: `main/`; current checks: `VERIFICATION.md` and `tests/run_tests.py`.

# Pengesahan GeoDecoder ESP32

Tarikh: 16 Oktober 2026.

## Kompilasi sasaran sebenar

- Arduino CLI 1.3.1.
- esp32 by Espressif Systems 3.3.12.
- Board / FQBN: ESP32 Dev Module / esp32:esp32:esp32.
- MFRC522 1.4.12 dan hd44780 1.3.2.
- Kedua-dua binaan menggunakan --warnings all; tiada warning dalam log.

| Binaan | Keputusan | Flash aplikasi | RAM global |
|---|---|---:|---:|
| Default, RGB dimatikan | Exit 0 | 333,031 / 1,310,720 byte (25%) | 24,324 / 327,680 byte (7%) |
| RGB diaktifkan | Exit 0 | 333,327 / 1,310,720 byte (25%) | 24,324 / 327,680 byte (7%) |

Peratus flash ialah peratus partition aplikasi, bukan semua flash board.
RAM global tidak merangkumi semua penggunaan stack/heap semasa runtime.

Arahan semakan setara daripada folder projek:

    arduino-cli compile --fqbn esp32:esp32:esp32 --warnings all main
    arduino-cli compile --fqbn esp32:esp32:esp32 --warnings all --build-property compiler.cpp.extra_flags=-DGEODECODER_RGB_ENABLED=1 main

## Ujian host pada kod tab yang sama

tests/integration_test.cpp memasukkan fail .ino sebenar, bukan salinan logik kuiz.
Stub hanya menggantikan sempadan perkakasan: Serial, GPIO, RF, I2C/LCD dan Preferences.
Ujian dijalankan dengan GCC C++17, AddressSanitizer dan UndefinedBehaviorSanitizer.
Leak detection dimatikan kerana batasan persekitaran proses ujian.

- Ujian bank: lulus untuk 100 seed dengan mask dua, tiga dan lima jenis.
- 29 senario integrasi: lulus dengan RGB=0.
- 29 senario integrasi yang sama: lulus dengan RGB=1.

Senario yang disemak:

1. Default tiga jenis memerlukan enam UID sebenar; round mempunyai lima soalan.
2. UID 4/7/10 byte; leading zero dikekalkan; panjang dan aksara salah ditolak.
3. UID pendua dan gagal write NVS tidak mengubah data RAM.
4. Pendaftaran dan pilihan jenis kekal selepas simulasi restart.
5. NVS gagal dibuka tidak melaporkan edit, termasuk edit tanpa perubahan, sebagai tersimpan.
6. Blob salah saiz, versi, panjang UID, UID pendua dan mask tidak sah ditolak.
7. Magic simpanan rosak kembali kepada default kosong dengan selamat.
8. Satu pad sahaja menunggu; pasangan tepat memberi satu markah sekali sahaja.
9. Pasangan sepadan tetapi salah untuk soalan semasa tetap salah; pembetulan diterima.
10. UID tidak dikenali dan kad pada reader salah membatalkan jawapan lama pad itu.
11. Hint mengekalkan baris soalan dan dikira sekali bagi setiap soalan.
12. B1 mengosongkan jawapan, memberi sifar bagi skip dan membuka ringkasan round.
13. Parser: huruf besar/kecil, CRLF, ruang, input separa, argumen tambahan dan overflow.
14. Pemilihan N jenis gagal tanpa perubahan separa jika pasangan UID tidak cukup.
15. Mod UID tidak memberi markah; pendaftaran hanya menerima reader diminta dan berhenti selepas berjaya.
16. Timeout pendaftaran tidak menyekat loop atau mengubah data.
17. Keenam-enam kad boleh didaftarkan melalui aliran capture.
18. Kad dipegang pada pad tidak menjawab soalan baharu sehingga diangkat dan diimbas semula.
19. Mod UID reader khusus mengekalkan rekod kedua-dua reader berasingan.
20. Kad melalui PLAY -> UID_SCAN -> PLAY masih perlu diangkat sebelum menjawab.
21. Butang bertindak semasa ditekan selepas debounce, tanpa repeat ketika ditahan; rollover millis disemak.
22. RGB dimatikan tidak menyentuh pin simpanan; RGB aktif menunjukkan warna keputusan.
23. LCD gagal dan reader offline masih membenarkan arahan Serial.
24. UID 10 byte kekal penuh pada Serial; LCD menggunakan mesej mesra murid.
25. Butang fizikal: boot ke menu, cara bermain, mula tanpa melangkau, pusingan lengkap dan main semula.
26. Butang mula tidak boleh memintas pendaftaran belum lengkap atau reader offline.
27. NEXT membatalkan capture dan kembali daripada semakan kad ke menu tanpa mendaftar kad secara tidak sengaja.
28. Jam masa termasuk pembayang, dijeda dalam menu dan dibekukan pada jawapan terakhir; main semula bermula sifar.
29. Jam masa kekal betul merentasi rollover millis; langkau soalan terakhir turut membekukan masa.

Semakan host:

    python3 tests/run_tests.py

## Semakan reka bentuk label

- Satu halaman A4, enam label, setiap label 85.6 x 54 mm.
- Enam SVG vektor berasingan serta satu bingkai induk boleh diedit.
- PDF akhir dirender dan diperiksa secara visual: tiada teks bertindih/terpotong.
- Label R1/R2, A/B, nama bentuk dan warna pasangan konsisten.
- Bentangan kubus disahkan sebagai enam muka dengan normal lipatan berbeza, bukan sekadar enam petak rawak.
- Piramid: tapak segi empat sama dengan empat muka segi tiga kongruen.
- Silinder: dua bulatan sama saiz; panjang segi empat tepat sama dengan lilitan bulatan.
- Garis lipatan dibuat sebagai segmen vektor putus-putus supaya kekal jelas dalam PDF.
- Helaian mempunyai tanda potong dan garis semakan 50 mm untuk cetakan 100%.

## Semakan bebas

Semakan kod bebas selesai tanpa penemuan Critical/Important asal.
Satu penemuan simpanan NVS tanpa perubahan dinaikkan ke penting dan dibetulkan:
ujian regresi dilihat gagal sebelum pembetulan, kemudian lulus bersama seluruh suite.
Regresi resume dengan kad dipegang dan variasi simpanan rosak turut ditambah.
Semantik kaunter salah dikekalkan dan diterangkan dalam README; ia mengira kombinasi berubah, bukan setiap bacaan RF berulang.

## Had pengesahan

Belum diuji pada perkakasan fizikal pengguna. Ujian ini tidak mengesahkan voltan sebenar, regulator,
gangguan RF, orientasi/tag yang sesuai, ketahanan simpanan ketika kuasa terputus atau saiz kad sebenar.
Ikut langkah semakan perkakasan dan cetakan dalam README.

## Pembetulan pin mengikut gambar wiring pengguna

- Ketidakpadanan dikenal pasti daripada dua gambar pengguna: wiring sebenar SS1=5, SS2=27,
  RST=4 dan B1/B2=32/33; versi terdahulu menggunakan SS1/SS2=25/26, RST=27 dan B1/B2=34/35.
- config.h dan panduan sambungan kini mengikut wiring pengguna, termasuk LCD SDA/SCL=21/22.
- GPIO32/33 menggunakan INPUT_PULLUP untuk modul active LOW, atau INPUT_PULLDOWN apabila
  polariti berkaitan ditetapkan HIGH. Tetapan active LOW asal dikekalkan.
- Pin R/G/B simpanan dipindahkan kepada 25/13/14 dan 26/16/17; RGB kekal dimatikan secara default.
- Enam belas penetapan GPIO disemak tanpa pertindihan, selain wayar SPI/RST yang memang dikongsi.
- Stub dan semakan butang sedia ada diselaraskan dengan wiring ini; tiada senario ujian baharu ditambah.
- Ujian host dijalankan semula: bank 100 seed serta 24 senario bagi setiap RGB=0 dan RGB=1 lulus.
- Kedua-dua kompilasi sasaran dijalankan semula dengan --warnings all: exit 0, tiada warning;
  saiz binaan terkini berada dalam jadual di atas.
- Kejayaan membaca kad pada pemasangan sebenar masih perlu diuji selepas upload pembetulan ini.

## Kemaskini label - GeoDecoder

- Semua enam kad dan bingkai induk menggunakan GeoDecoder.
- Blok sifat bentuk, garis hiasan di atas blok itu dan label kategori berulang dibuang.
- Lencana atas: PAD A MODEL 3D atau PAD B BENTANGAN 2D.
- Arahan bawah: IMBAS KE PAD A atau IMBAS KE PAD B.
- Garisan model ditebalkan dan digelapkan. Semua garisan kubus dilukis selepas isian.
- Piramid kini menggunakan unjuran ortografik bersudut supaya bucu belakang dan rusuk depan boleh dibezakan.
- Saiz enam label kekal 85.6 x 54 mm; helaian A4 dan garis semakan 50 mm diperiksa semula.
- PDF akhir dirender dan diperiksa: tiada pertindihan teks atau garisan model yang terputus.
- Geometri, saiz kad, garisan model dan susunan cetakan dikekalkan semasa penjenamaan GeoDecoder.

## Menu murid dan jam masa GeoDecoder

- Boot membuka menu, termasuk apabila semua kad sudah didaftarkan. B1/NEXT mula atau sambung;
  B2/HINT membuka cara bermain. Nama GeoDecoder digunakan pada LCD, Serial, dokumentasi dan label.
- LCD 20x4 memaparkan soalan bernombor, arahan PAD A/B, skor dan jam masa; maklumat teknikal guru berada di Serial.
- Ringkasan menunjukkan markah, peratus dan masa akhir. NEXT main semula; HINT kembali ke menu.
- Masa berhenti pada jawapan betul terakhir atau apabila soalan terakhir dilangkau. Pembayang dan retry
  dikira dalam masa; menu jeda dan penyelenggaraan tidak dikira. Pusingan baharu mereset skor dan masa.
- Ujian aliran menu dilihat gagal pada versi yang auto-mula ketika boot, kemudian lulus selepas pembetulan.
- Ujian jam masa dilihat gagal kerana masa belum dipaparkan, kemudian lulus selepas pelaksanaan.
- Namespace geomath_q2, kunci registry, versi dan bentuk RegistryData dikekalkan; ujian menggunakan
  simpanan yang sama memastikan enam UID dimuatkan tanpa pendaftaran semula.
- Pratonton LCD dijana daripada tab .ino sebenar dengan stub perkakasan yang sama, kemudian diperiksa visual.
- PDF satu halaman A4 dan enam SVG dijana semula dengan jenama GeoDecoder dan diperiksa visual.
