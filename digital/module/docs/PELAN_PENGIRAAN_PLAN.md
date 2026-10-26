# Pelan pelaksanaan v1.6.0

Arahan pengguna membenarkan pelaksanaan terus hingga diuji dan dipush. Branch kerja sahaja: `digitalized-module-pelan-pengiraan`. Asas remote diperiksa pada 26 Oktober 2026: `main-digitalized` = `790d989d666e64f3beabb507cd4140b832696367`, modul 1.5.0; branch hasil belum wujud. Remote firmware main: `a059979d97926b82cafd4aa5cf3fe59da04a55bb`. Tiada perubahan firmware, kuiz, akaun atau protokol simpanan.

## Reka bentuk dan pemilikan

Kekalkan HTML mandiri, token, DOM selamat, renderer dan rumus sedia ada. Dua seksyen tambahan menggunakan kontrak `open(shape?)`, `close()`, `refreshLanguage()` dengan bahasa daripada host yang sama. Tiada pencapaian baharu disuntik ke empat refleksi protokol 1.

- Ejen studio memiliki `src/projection-geometry.mjs`, `src/projection-studio.mjs`, `src/projection-studio.css` dan `tests/projection*.test.mjs` sahaja. Jawapan daripada geometri model, alat grid/keyboard, semakan setara, model 3D, susunan Bab 7.
- Ejen pengiraan memiliki `src/calculation-steps.mjs`, `src/calculation-workshop.mjs`, `src/calculation-workshop.css` dan `tests/calculation*.test.mjs` sahaja. Rumus 11 bentuk daripada `calculateMeasures`, parser terhad, diagnostik langkah, unit dan π.
- Ejen utama memiliki integrasi `app.mjs`, `index.html`, `tools/build.mjs`, dokumen/versi, ujian integrasi/pelayar dan hasil HTML. Semak perubahan dua ejen sebelum commit.

## Tugasan dan bukti

- [x] Semak remote, worktree, kod/dokumen dan julat PDF yang dibenarkan.
- [x] Baseline modul: 244 ujian lulus.
- [x] Ujian dahulu untuk unjuran ortografik, skala, keterlihatan dan segmen setara; kemudian studio dengan panduan dan latihan.
- [x] Ujian dahulu untuk 22 pasangan rumus, algebra setara, input tidak selamat, kesilapan sasaran, π/unit/pembundaran; kemudian semakan empat langkah.
- [x] Sambung seksyen melalui satu pemilik navigasi, tetapan induk, nota dan kalkulator; bina HTML.
- [x] Jalankan regresi modul/aplikasi yang berkaitan; uji pelayar 320/390/768/1280, tema, bahasa, papan kekunci dan reduced motion. Simpan screenshot sebenar.
- [ ] Dokumentasi sumber, toleransi, batasan dan handoff; commit dan push branch hasil sahaja; sahkan SHA remote.

## Semakan fokus

Lukisan dipecah atau diterbalikkan mesti tetap setara; garisan nampak mengatasi garisan terlindung bertindih. Arah sisi dipilih tetap kanan-ke-kiri dan dongakan sisi di kiri dongakan depan (buku BM/EN p.183, PDF193). Perubahan ukuran/aktiviti membuang semakan lama tanpa merosakkan refleksi terdahulu. Parser mesti terhad panjang/kedalaman, tidak menjalankan kod. Nilai penuh digunakan sehingga pembundaran akhir dan unit persegi/padu ditukar dengan faktor yang betul. Tetapan/bahasa tidak memadam jawapan murid.
