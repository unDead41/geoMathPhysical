# Pemetaan KSSM dan DSKP

Dokumen dirujuk ialah dokumen KPM; salinan di luar BPK dikenal pasti sebagai
salinan dokumen, bukan sumber standard baharu. Semua ayat modul ialah penerangan
semula. Tidak mendakwa modul diluluskan KPM atau meliputi keseluruhan DSKP.

| Rujukan | Aktiviti modul | Batas skop |
|---|---|---|
| Tingkatan 2, SP 6.1.1, muka surat cetak 52 / PDF 64 | Putar lima bongkah; banding permukaan rata/melengkung, rusuk dan bucu | Hanya bongkah tegak dalam projek; tidak meliputi prisma lain atau sfera |
| Tingkatan 2, SP 6.2.1, halaman sama | Buka, jeda, jejaki muka, cantum; kenal sektor kon dan segi empat tepat silinder | Galeri sembilan bentuk dan editor kubus; belum melukis semua jenis bentangan |
| Tingkatan 2, SP 6.3.1, muka surat cetak 52 / PDF 64 | Nota menghubungkan luas setiap bahagian bentangan dengan rumus luas permukaan; lima contoh berpandu dan pengiraan ukuran | Bongkah tegak tertutup; bukan derivasi semua jenis prisma |
| Tingkatan 2, SP 6.3.3, muka surat cetak 53 / PDF 65 | Kotak kubus berbumbung piramid: abaikan kedua-dua muka yang bercantum; penukaran unit persegi | Satu contoh asal; belum merangkumi semua jenis masalah gabungan |
| Tingkatan 2, SP 6.4.1–6.4.2, muka surat cetak 53 / PDF 65 | Nota luas tapak × tinggi, hubungan satu pertiga piramid/kon dengan prisma/silinder, contoh berpandu dan aktiviti mengubah ukuran | Simulasi tiga tuangan ideal; bukan eksperimen fizikal atau pembuktian penuh rumus |
| Tingkatan 2, SP 6.4.3, halaman sama | Contoh tambah isi padu kubus dan piramid, cm³ kepada mL/L, panduan cm³/m³ | Masalah dan unit terpilih; tiada pentaksiran TP |
| Tingkatan 3, SP 7.1.1–7.1.2, muka surat cetak 58 | Enam arah kamera ortografik dan perbandingan unjuran dengan objek | Pengayaan pengenalan; bukan latihan lukisan formal atau penskoran TP |

Bahasa BM dipermudah pada aras Tingkatan 1. Kandungan sifat/bentangan itu sendiri
ialah topik DSKP Tingkatan 2; jangan menamakannya standard Tingkatan 1.

## Sumber yang disemak

1. BPK, KPM: DSKP KSSM Matematik Tingkatan 2, senarai rasmi yang dicapai:
   https://bpk.moe.gov.my/kurikulum/kssm/kssm-tingkatan-2
2. Pautan fail rasmi:
   https://bpk.moe.gov.my/kurikulum/kssm/kssm-tingkatan-2/341-dskp-kssm-matematik-tingkatan-2/file
   Pautan ini menghala ke Google Drive dan tidak dapat diekstrak dalam sesi ini.
   Kandungan halaman SP disemak melalui salinan PDF dokumen KPM:
   https://asiemodel.net/wp-content/uploads/2022/08/058-DSKP-KSSM-Tingkatan-2-Matematik-v2-2_021117_Cover.pdf
3. DSKP KSSM Matematik Tingkatan 3, dokumen KPM pada hos pendidikan negeri Pahang,
   halaman cetak 58 / SP 7.1.1–7.1.2:
   https://sman.pahang.edu.my/system/documents/attachments/000/000/168/original/002_DSKP_KSSM_MATEMATIK_TINGKATAN_3.pdf?1544929347=
4. Konteks projek: `../../../main/question_bank.h` pada SHA dalam SOURCE.md.

## Konvensyen istilah

- Muka: permukaan rata; gunakan “permukaan” untuk jumlah rata + melengkung.
- Silinder: 2 permukaan rata, 1 melengkung, 2 rusuk melengkung, 0 bucu.
- Kon: 1 permukaan rata, 1 melengkung, 1 rusuk melengkung, 1 bucu/puncak.
- Piramid projek: tapak segi empat sama, 4 muka segi tiga; 5 muka, 8 rusuk, 5 bucu.
- Pandangan 2D ialah unjuran dari satu arah, bukannya seluruh permukaan dibuka.
- Bentangan memaparkan seluruh permukaan pada satu satah.
- Aktiviti Cuba fikir memberi maklum balas dan peluang mencuba semula; ia tidak
  mengubah atau merekod skor/analitik kuiz GeoDecoder.
- L ialah luas permukaan; l huruf kecil ialah lebar. t sentiasa tinggi tegak;
  s ialah tinggi sendeng. j ialah jejari, bukannya diameter.
- Rumus piramid menggunakan tapak segi empat sama dan puncak di atas pusat tapak.
  s = √(t² + (a/2)²). Untuk kon tegak, s = √(t² + j²).
- Contoh dan ayat nota ialah penulisan asal. DSKP dirujuk semula pada
  26 Oktober 2026 untuk skop Bab 6. Standard 6.3.2 (sfera), sfera dalam isi padu
  dan prisma lain tidak diajar dalam modul lima bongkah ini.

## Makmal v1.2.0

- SP 6.2.1: murid membina susunan muka kubus dan memeriksa lipatannya. Variasi
  grid disahkan secara geometri. Skop bina sendiri ialah kubus; bentangan lima
  bongkah kekal tersedia dalam makmal luas dan Teroka 3D.
- SP 6.3.1: luas setiap permukaan dipilih, dijumlah dan dihubungkan dengan rumus;
  ukuran di makmal mengubah mesh sebenar. Rumus piramid terhad tapak segi empat sama.
- SP 6.4.1–6.4.2: lapisan kiub unit dan tiga pemindahan ideal kon/piramid kepada
  silinder/prisma dengan luas tapak dan tinggi sama. Ini visualisasi hubungan,
  bukan pembuktian eksperimen bendalir fizikal.
- SP 6.3.3 dan 6.4.3: gabungan penuh kubus+piramid serta silinder+kon; dua muka
  bersama dikecualikan untuk luas luar dan dua isi padu ditambah. Aktiviti tidak
  meliputi semua masalah gabungan atau semua standard Bab 6.

## Bentangan siap dan isi pilihan v1.3.0

- SP 6.2.1 disokong oleh sembilan contoh bentangan sah. Lima bongkah projek kekal;
  pengayaan menambah prisma tegak bertapak segi tiga/segi lima/segi enam sekata dan
  piramid tegak bertapak segi tiga sama sisi (4 muka segi tiga, 6 rusuk, 4 bucu).
  Murid boleh memilih muka, melipat, membuka, menjeda dan menjejak sambungan.
  Editor bina sendiri kekal untuk kubus sahaja; ini bukan pembina poligon bebas.
- SP 6.4.1–6.4.3 disokong oleh isi satu/dua bekas, ukuran bebas bagi A/B,
  penambahan 1 cm³ dan jumlah isi yang dipilih. Prisma tambahan menggunakan
  V = luas tapak × t; piramid segi tiga menggunakan V = ⅓ × luas tapak × t.
  Luas tapak poligon sekata dikira analitik daripada sisi, tidak didakwa rumus
  wajib yang telah dipelajari semua murid. Tidak meliputi sfera.
- Bezakan peratus isi daripada peratus tinggi. Pada piramid/kon, 50% isi tidak
  menghasilkan 50% tinggi. Ukuran/isi sebenar dan kapasiti kosong dipaparkan
  berasingan, dengan unit cm³. Tiada markah atau tuntutan tahap penguasaan.
