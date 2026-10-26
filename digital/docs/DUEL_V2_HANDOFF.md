# Handoff integrasi — Duel protocol 2

Branch sumber: **digitalized-game-duel** dalam **unDead41/geodecoder**.
Asas integrasi: **790d989d666e64f3beabb507cd4140b832696367**
(`main-digitalized`, Digital v2.6.0). Head Duel terdahulu:
**8373fd4bae11847c3a3099ee6f61e2756d99349b**; ia sudah termasuk dalam asas
integrasi (29 commit di hadapan, 0 di belakang). Firmware main yang diperiksa:
**a059979d97926b82cafd4aa5cf3fe59da04a55bb**, v1.1.3.

Commit pelaksanaan: **resit SHA sebenar ditambah selepas commit kod dicipta**.
Commit resit susulan hanya mengemas kini dokumen handoff ini. Jangan menganggap
SHA asas di atas sebagai commit hasil kerja.

## Perubahan tingkah laku

- Soalan aktif tidak membawa jawapan, ID asal/future selection atau hint yang
  belum diminta. Soalan lengkap disimpan untuk pembetulan dan analisis sahaja.
- Backend menyimpan fasa review; refresh tidak melangkau salah/langkau. Tindakan
  advance idempoten mengekalkan sela 900/1800 ms serta skor/masa tamat asal.
- UI mengambil keputusan scan daripada snapshot pelayan. Lost ACK, request lama,
  polling bertindih dan terminal ACK selepas deadline tidak menggandakan skor
  atau membiarkan permainan terkunci.
- R1 salah selepas refresh tidak dilabel diterima. Lobi/perlawanan mempunyai baki
  masa, status selesai/forfeit/anggaran tidak hadir, Home resume, ralat live dan
  panduan guru. Tetapan BM/EN, saiz teks, motion dan audio sedia ada digunakan.
- Enam PDF diaudit; 15 item dipetakan kepada sumber/SP/halaman sebenar. B1/B2
  salinan Duel diperjelas sebagai contoh kuboid. Skor bukan TP rasmi.

Peraturan asal kekal: dua pemain, sepuluh soalan sama, dua per bentuk, R1→R2,
pasangan betul +1, satu percubaan, hint tanpa penalti, skor kemudian masa pelayan.
Rematch dalam bilik sama, bank parametrik dan kandungan T3 ialah cadangan P2,
bukan perubahan senyap dalam pakej ini.

## Fail utama

| Bahagian | Fail |
|---|---|
| Transport/recovery | `digital/dist/duel.mjs` |
| Adapter keadaan dan enjin bersama | `digital/dist/duel-state.mjs`, `core.mjs` |
| UI dan bahasa | `digital/dist/app.mjs`, `index.html`, `i18n.mjs`, `style.css` |
| Edge | `digital/backend/duel/functions/geodecoder-duel/{index.ts,handler.mjs,questions.mjs}` |
| Migration tunggal | `digital/backend/duel/supabase/migrations/20261026091324_duel_durable_review_v2.sql` |
| Verifikasi/rollback | `digital/backend/duel/{verify-v2.sql,rollback-v2.sql,verify-local.mjs}` |
| Ujian aliran sebenar | `digital/tests/duel-v2.browser.mjs`, `duel-v2-fixture.mjs`; `test:duel` menunjuk fixture terasing |
| Sumber Matematik | [DUEL_CONTENT_AUDIT.md](DUEL_CONTENT_AUDIT.md) |
| Audit dan deployment | [DUEL_AUDIT_2026-10-26.md](DUEL_AUDIT_2026-10-26.md), [DUEL_V2.md](DUEL_V2.md) |

Source canonical permainan masih `digital/dist/*.mjs`. Bundle, root index dan
empat alias HTML dibina semula; jangan mengedit bundle atau menyalin seluruh
folder dist daripada branch lama ketika menyelesaikan konflik.

## Pengesahan terkini

| Semakan | Keputusan sebenar |
|---|---|
| `npm test` | **277/277 PASS**, termasuk pemarkahan, sequence, durable review, tie/time, projection, lifecycle, kandungan dan keserasian akaun/modul |
| `backend/duel/verify-local.mjs` | **5/5 kumpulan PASS**: SQL/rollback, Edge→SQL, rate limits, global quotas, TTL/cleanup |
| `npm run test:duel` | **13 semakan PASS**, dua context Chromium sebenar, handler dan database terasing; tiada runtime error |
| Regresi browser bersama | **13/13 PASS**, termasuk 216 kombinasi layout Home/game/result/Settings, navigasi, keyboard/touch/drag, storan disekat dan Classroom read-only fixture |
| Practice khusus | **2/2 PASS**, semua 15 ID, campuran betul/salah/langkau, 90 paparan rich text BM/EN dan standalone offline tanpa HTTP(S) |
| Build / prepare lokal / checker | **PASS**, 156 ID unik, ARIA references, bank dan 10 SVG; semua alias/root sama byte |
| SOR firmware | **PASS v1.1.3**, firmware tidak diubah |
| Migration + rollback | **PASS secara terasing**, rekod fixture lama dipelihara; verifikasi SQL memulangkan fixture kepada keadaan asal |
| Production | **Bacaan sahaja**, Edge masih v1/verify_jwt=true, column review_pending belum dipasang |

Ujian browser merangkumi PIN tidak sah, pemain ketiga, mula bersama, pilihan
soalan disembunyikan, ACK tertunda ketika menu terbuka, reload selepas R1,
lost-ACK R2, offline/reconnect, review R1/R2 selepas reload, match penuh 10–9,
rematch PIN baharu, forfeit, deadline dan ACK diterima-sebelum-deadline tetapi
replay-selepas-deadline. Keyboard Enter, BM/EN, 390 px dan 320 px pada 150%
diuji. Screenshot sebenar dan log berada dalam `duel-v2-evidence/`.

Fixture regresi bersama diperbarui kepada kawalan motion-select semasa,
bacaan module-progress read-only dan startup iframe yang asinkron; tiada kawalan
UI lama ditambah semula untuk menjadikan ujian lulus.

Runtime: Node **24.22.1**, Chromium Headless Shell **134.0.6998.35**, PGlite
**0.5.11 / PostgreSQL 18.6**. Hosted ialah PostgreSQL **17.11**; pemilik backend
masih perlu menjalankan verifikasi terselaras pada hosted. Permintaan serentak
PGlite tidak membuktikan contention multi-connection PostgreSQL. Offline ialah
emulasi pelayar; peranti fizikal/pembaca skrin/latensi sekolah belum diuji.

## Wajib sebelum mengaktifkan candidate

1. Pemilik Audit Backend Supabase menyemak/apply migration tunggal, menjalankan
   `verify-v2.sql` hingga rollback dan deploy **tiga fail Edge** pada projek
   **fkrlwzxvyufndavlpzbp**, schema **geodecoder_duel**, fungsi **geodecoder-duel**.
   Kekalkan **verify_jwt=true**. Jangan menjalankan semula bootstrap schema.sql,
   menukar Auth/SMTP, atau membuat db push menyeluruh daripada folder ini.
2. Jalankan hosted smoke dengan fixture yang dibersihkan: dua sesi, replay,
   deadline, reconnect, salah R1/R2, forfeit serta direct-role denial. Sahkan
   protocol header2 dan tiada future IDs/answer key dalam snapshot aktif.
3. Integrator fetch kedua-dua branch, semak main-digitalized terkini, merge secara
   terpilih sambil memelihara perubahan portal/profil/tetapan dan naikkan nombor
   release gabungan. Label aplikasi candidate masih asas **v2.6.0**; ia bukan
   penerbitan rasmi baharu. Modul v1.5.0 dan firmware v1.1.3 tidak perlu ditukar.
4. Bina semula dan jalankan semakan selepas konflik diselesaikan. Repository
   penerbitan **unDead41/geodecoder-digital**/Pages tidak disentuh chat ini;
   penerbitan awam ialah langkah integrator yang berasingan.

Protocol 2 sengaja fail-closed: frontend baharu pada Edge lama menunjukkan
backend-update; frontend v1 pada Edge v2 mendapat client-update. Selaraskan
pertukaran versi selepas perlawanan aktif selesai. Rollback perlu memulihkan
frontend/Edge v1 bersama SQL rollback, bukan menukar verify_jwt.

Bank offline tetap boleh dipelajari/diperiksa oleh murid. Perlindungan ini
menutup metadata jawapan dan pemilihan masa depan dalam protokol; ia bukan
dakwaan bahawa bank latihan yang diketahui menjadi bank peperiksaan rahsia.

**Chat Duel tidak merge ke main-digitalized, tidak mengubah repo penerbitan,
tidak deploy Edge dan tidak menjalankan migration production.**
