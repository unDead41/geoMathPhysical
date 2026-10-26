> Rekod sejarah v2.4.0. Untuk penyelarasan tetapan permainan/modul v2.5.0,
> lihat [MODULE_SETTINGS.md](MODULE_SETTINGS.md); perihalan modul berasingan di bawah ialah keadaan sebelum kemas kini itu.

# GeoDecoder Digital v2.4.0 — kemudahan penggunaan

Tarikh: 26 Oktober 2026 (Malaysia). Branch serahan:
**digitalize-ease-of-use**. Skop ialah semua lapan cadangan ease of use yang
diterima pengguna, bersama aliran Duel. Maksimum dua subagent digunakan untuk
QA bebas; pelaksanaan dan serahan kekal dimiliki satu branch.

## Sumber yang diselaraskan

| Sumber | Rujukan |
|---|---|
| Platform akaun/kelas/muzik/modul v2.3.0 | digitalize `adc51627eaaace5d9543c7e033d2994986c8715d` |
| Root tree platform sebenar | `4784a88681a72a90a8e84e6c0e994b4e40890a94` |
| BM/BI, rich text, latihan15, Duel v1.5.0 | digital-richText `8373fd4bae11847c3a3099ee6f61e2756d99349b` |
| Modul v1.2.0 | digitalize-module `931a0150397bfb3fd79ef3c8da6684167d1c6aad` |
| Blob modul dipinkan | `5f58d2df981c7a21cc063a4958e898a46b6134fe` |
| Firmware rujukan v1.1.3 | main `a059979d97926b82cafd4aa5cf3fe59da04a55bb` |

Semakan ref terakhir turut melihat digitalize-module v1.3.0 pada
`ee7c7ee983ce32bc9681c60424df184f29e8a80b`. Keluaran ini kekal menggunakan
blob modul v1.2.0 yang sudah dipinkan dan diuji; v1.3.0 belum digabungkan.

Sumber tempatan dimaterialisasikan dan disemak hash terhadap snapshot GitHub.
Serahan menggunakan tree asas remote sebenar supaya fail firmware/aset yang
tidak dimaterialisasikan tetap terpelihara. SHA serahan sebenar disahkan selepas
branch remote dibuat/dikemas kini, dan dilaporkan bersama hasil akhir.

## Lapan perubahan

| Perubahan | Tingkah laku akhir |
|---|---|
| Tetamu ringkas | Nama panggilan2–60 aksara sahaja; kategori Tetamu/kelas kosong. Profil lama Murid/Pelajar kekal sah. |
| Menu | Home: Main, Belajar, Akaun & kelas. Main: Kuiz10, Latihan15, Duel. |
| Tutorial | Tiga langkah bergambar sebelum permainan tetamu pertama; boleh tutup, langkau dan buka semula. Jam solo belum bermula. |
| Langkah aktif | R1/R2 dan langkah1/2 ditonjolkan; pengimbas aktif menamakan tindakan imbas pilihan. |
| Telefon | Arahan sentuh kad→sentuh pengimbas; drag dan Tab/Enter/Space turut kekal. Pilihan belum menggunakan percubaan. |
| Tetapan | Satu dialog untuk BM/English, tema/system, muzik, bunyi, teks100/125/150% dan animasi. Sesi/kad/skor kekal. |
| Keputusan | Markah/tindakan dahulu, analisis dalam disclosure. Latih soalan salah menggunakan tepat ID salah/langkau asal dalam mod setempat. |
| Mesej ralat | Bahasa dipilih, sebab/tindakan berikutnya, status belum disahkan yang jujur dan retry dengan ID sama. Tiada butiran SQL kepada murid. |

Duel menonjolkan cipta/sertai, kongsi PIN dan kedua-dua pemain Sedia. Kedua-dua
pemain menerima sepuluh ID/susunan yang sama. Skor dan keputusan milik pelayan;
markah lebih tinggi menang, kemudian masa tamat lebih pantas. Pertukaran
bahasa/settings tidak memulakan semula Duel. Tutorial tidak melambatkan
perlawanan yang sudah bermula; bantuan semasa Duel menjelaskan jam pelayan
terus berjalan.

## Data dan sempadan integrasi

- Satu Game untuk kuiz, latihan15, latihan semula dan Duel. Tiada teks
  terjemahan digunakan sebagai penentu jawapan atau kunci analitik.
- Latihan semula boleh mempunyai1–15 soalan unik. Ia tidak menghantar jawapan/skor ke papan
  skor kuiz, classroom atau Duel dan tidak mengubah keputusan asal. Heartbeat
  akaun sedia ada boleh terus berjalan jika pengguna sudah log masuk.
- Classroom dan Duel mempunyai pemilik masa berbeza: classroom mengira masa
  menjawab dengan semakan dikecualikan; Duel mengira masa dinding pelayan.
  Kedua-duanya terus berjalan semasa menu/tab/sambungan terganggu.
- Skor/key legacy, CSV dan profil Murid/Pelajar dikekalkan. Tetamu baharu tidak
  memerlukan kategori atau kelas; alias literal tidak diterjemahkan.
- Bahasa, tema dan muzik menggunakan kunci sedia ada. Preferensi tambahan
  `geodecoder.digital.preferences.v1` hanya menyimpan bunyi, animasi, saiz teks
  dan status panduan. Storan disekat tidak menghalang permainan.
- Menukar bahasa mengekalkan draf form, validasi dan kata laluan dalam DOM
  sementara sahaja. Kata laluan tidak dimasukkan ke storan, HTML attribute,
  log atau laporan. Render latar/konteks lain kekal tidak menyalin secret.
- Kod Auth/SQL classroom, cloud transport/config, muzik, bank soalan dan blob
  modul dipinkan tidak berubah. Semakan hash meliputi15 fail dilindungi.
- Backend Duel aktif yang sedia ada digunakan tanpa migrasi/deployment baharu.
  Salinan sumbernya diasingkan dalam `backend/duel/`, supaya `backend/schema.sql`
  dan `backend/auth/` classroom tidak ditindih. verify_jwt Duel kekal true.
- Modul iframe v1.2.0 kekal byte-identik. Ia mempunyai bahasa/kawalan dalaman
  sendiri; tetapan parent tidak mendakwa menggantikan kawalan tersebut.

## Pengesahan

| Semakan | Bukti |
|---|---|
| Baseline platform | 81/81 unit, build/check PASS sebelum integrasi |
| Suite akhir | 139/139 unit PASS, sifar gagal |
| Binaan | esbuild dan checker PASS;144 ID unik, ARIA/aset, bank dan hash modul |
| Tutorial/settings/input | Pelayar sebenar: nama sahaja, tutup/langkau/buka semula, persist, bahasa/tema/teks tanpa reset, keyboard/touch/drag dan storan disekat PASS |
| Kuiz→latihan semula | Tepat3 ID salah/langkau, skor/rekod asal tidak berubah; keputusan collapsed/expanded320/390px125/150% kedua-dua bahasa PASS |
| Latihan15 | 15/15 offline dan campuran10/15 (3 salah2langkau) PASS; semua15 ID,90 paparan rich text, sifar permintaan HTTP pada offline |
| Layout | 216 semakan Home/game/result/Settings pada BM/English, cerah/gelap,100/125/150%,320/390/desktop PASS |
| Classroom UI | Auth, guru/pelajar, nama literal, keputusan lengkap→review setempat dan kegagalan/retry diuji melalui transport fixture yang dinyatakan dalam manifest QA |
| Duel live | Satu perlawanan10–9 sebenar; max2, ID/mula sama, privasi, delayed/lost ACK, reloadR1, Settings dan pemenang pelayan sama PASS |
| Duel→review | Satu ID salah, token/polling dibuang, tiada panggilan Duel/classroom atau skor kuiz; keputusan pelayan asal sama PASS |
| Pemulihan Duel live | Sesi luput, validasi PIN BM/BI, salin PIN dan menyerah kalah PASS, exit0 tanpa runtime error |
| PostgreSQL terasing | Lima kumpulan Edge→SQL/role/TTL/rate-limit/idempotency pada sumber Duel dipindahkan PASS |
| Firmware/SOR | Checker v1.1.3 PASS; tiada firmware/bank/pin/NVS diubah |

Ujian classroom di sini ialah UI sebenar dengan respons transport terkawal,
bukan dakwaan menghantar email atau mencipta kelas produksi baharu. Unit asal
Auth/cloud turut dikekalkan. Backend Duel menggunakan endpoint sebenar dan
dua konteks pelayar berasingan tanpa service key dalam klien.

Percubaan skrip Duel penuh pertama meluluskan semua assertion gameplay tetapi
proses berakhir1 akibat skrip seeding QA yang cuba mengakses storan iframe
sandbox. Seeding dihadkan kepada origin aplikasi; pemulihan/forfeit dijalankan
semula secara terpilih dan berakhir0. Perlawanan lengkap tidak diulang hanya
untuk membetulkan harness. Tiada perubahan produk untuk memintas sandbox.

Ujian pelayar panjang dipecahkan kepada batch bernama supaya setiap keputusan
dan exit boleh disemak. Kedua-dua kes latihan15 selesai pada binaan integrasi
sebelumnya; batch panjang itu berakhir kemudian tanpa ringkasan akhir. Kes
latihan yang sudah selesai tidak diulang selepas pembaikan khusus portal,
dialog dan layout keputusan; aturan Game/matematik tidak berubah. Manifest
merekodkan batas ini. Bukti debug disimpan berasingan daripada paparan final.

## Bukti paparan dan semakan bebas

- [Manifest 13 kes pelayar, provenance dan hash paparan](ease-evidence/final/case-results.json).
- [Home BM desktop](ease-evidence/final/home-bm-desktop.png) dan [English telefon](ease-evidence/final/home-en-mobile.png).
- [Tutorial BM](ease-evidence/final/tutorial-bm-mobile.png) dan [Settings English, teks150%](ease-evidence/final/settings-en-mobile-150.png).
- [Langkah R1](ease-evidence/final/game-r1-bm-mobile.png) dan [langkah R2](ease-evidence/final/game-r2-bm-mobile.png).
- [Keputusan ringkas](ease-evidence/final/quiz-result-collapsed.png), [analisis320px150%](ease-evidence/final/quiz-review-expanded-en-320-150.png) dan [latihan satu soalan](ease-evidence/final/review-one-question-result-en-320-150.png).
- [Rich text BM](ease-evidence/final/rich-fraction-mobile-ms.png) dan [English](ease-evidence/final/rich-fraction-mobile-en.png).
- [Duel BM](ease-evidence/duel/lobby-bm.png), [English telefon](ease-evidence/duel/game-en-mobile.png) dan [keputusan pelayan](ease-evidence/duel/result-en-mobile.png).
- [Log unit](ease-evidence/logs/ease-finished-unit.log), [layout](ease-evidence/logs/ease-layout-final.log), [classroom fixture](ease-evidence/logs/ease-classroom-green.log), [Duel penuh termasuk kegagalan harness](ease-evidence/logs/ease-duel-live.log), [pemulihan Duel](ease-evidence/logs/ease-duel-recovery.log) dan [SQL terasing](ease-evidence/logs/ease-duel-local.log).

Dua penyemak bebas memeriksa UI/state dan integrasi Duel. Tiada penemuan
material tertunggak selepas regresi dibetulkan. Semakan visual akhir
mengekalkan identiti GeoDecoder, hierarki tindakan dan kawalan yang jelas
pada desktop serta320px/390px. Keputusan review tidak mencemarkan skor asal.

## Regresi yang ditemui dan dibetulkan

1. Bahasa menukar render form sehingga validasi/kata laluan hilang: transient
   secret preservation khusus locale dan pemulihan ralat/aria-invalid. RED→GREEN.
2. Native close event lama mengosongkan Settings yang dibuka semula: cleanup
   segerak dan guard event basi. Reproduksi3/5 serta regresi deterministik→GREEN.
3. Heading/grid Home dan medal keputusan memaksa lebar minimum pada320px
   teks besar: minmax0, wrapping dan metrik dua lajur mobile. Matrix216→GREEN.
4. Keputusan classroom lengkap dibuka tanpa pernah merender soalan:
   visualPlan belum wujud. Inisialisasi sebelum analisis; fixture→GREEN.
5. Notis sambungan mempunyai suffix BM dalam English: segmen notis canonical
   diterjemah berasingan dan kekal boleh diterjemah semula.
6. Tukar bahasa selepas snapshot gagal kehilangan butang Muat semula/Log keluar:
   render kegagalan dikongsi oleh catch dan stale-state recovery.

## Jalankan semula

```sh
cd digital
npm ci
npm test
npm run build
npm run check
npm run test:browser
```

Playwright dan Chromium dibekalkan berasingan melalui
`PLAYWRIGHT_MODULE_PATH`/`PLAYWRIGHT_CHROMIUM_PATH`. Browser named cases dan
manifest bukti berada dalam `tests/` serta `docs/ease-evidence/`.
`npm run test:duel` menghubungi backend live dengan alias QA sintetik;
`DUEL_RECOVERY_ONLY=1` atau `DUEL_SMOKE_ONLY=1` mengehadkan senario.
Verifier SQL menggunakan PGlite luar repo, bukan dependency produksi.

## Had dan penerbitan

Telefon diuji melalui viewport/touch Chromium, bukan telefon fizikal. Safari,
Firefox dan ujian beban satu kelas penuh belum dilakukan. Masa rangkaian boleh
mempengaruhi masa tamat Duel. Pilihan storan/reload bergantung pada pelayar.
Konfigurasi SMTP/redirect sedia ada bukan perubahan atau pengesahan kerja ini.

Semakan UI mengekalkan identiti GeoDecoder, geometri dan warna sedia ada.
Tindakan utama lebih jelas dan butiran pembelajaran masih boleh dibuka.
Serahan ditujukan kepada branch sahaja; laman awam/main-digital tidak
diterbitkan semula oleh kerja ini. SHA remote dan versi disahkan selepas push.
