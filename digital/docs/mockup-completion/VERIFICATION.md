# Pengesahan calon v2.9.1

Asas: ef697c86a5bfdf5a5658c3df92bce1d7f3f88652. Rujukan konsep:
4d83561667cf74fbe5cd6144ce5e3e7f660a75cd. Modul 1.6.2 dipin kepada
7bba111209e15697cb4b704f6cef7c0fb120aa55; blob 3af0469979d878c8e605d093db1be0c0649c6509.

| Pengesahan | Hasil | Bukti |
|---|---|---|
| Unit/integrasi aplikasi |497/497 lulus, tiada gagal/batal/langkau | [TAP](evidence/checks/runtime-final-app-complete.tap) |
| Unit/integrasi modul akhir |341/341 lulus, tiada gagal/batal/langkau | [TAP](evidence/checks/runtime-final-module-after-account.tap) |
| Adapter modul yang dipin |10/10 lulus | [log](evidence/checks/final-vendor-tests.log) |
| Binaan/alias/ID/ARIA/token | lulus;200 ID unik, alias identik dan modul terasing | [semakan aplikasi](evidence/checks/app-check.log), [modul](evidence/checks/module-check.log) |
| Browser kegunaan | semua 13 kes unik disahkan melalui run dan run semula yang didokumenkan | [laporan](evidence/checks/final-built-browser-review.md), [liputan](evidence/checks/final-built-browser-coverage.json) |
| Bantuan/laporan |7/7 senario lulus, byte salinan/muat turun dan konteks disahkan | laporan browser yang sama |
| Duel binaan akhir |5 kumpulan pemeriksaan lulus; protokol 2/SQL sebenar pada fixture tempatan;18 gambar | [keputusan](evidence/checks/duel-built-results.json), [telefon12](evidence/checks/12-duel-mobile-en-dark-150.png), [seri13](evidence/checks/13-draw-mobile-en-dark-150.png) |
| CRUD kelas |4/4 kumpulan Chromium lulus, termasuk konflik/refresh/retry/fokus | handoff workspace; suite SQL turut termasuk dalam497 |
| Nota semua 11 bentuk | model/bentangan terlukis; sfera/hemisfera mempunyai keterangan tiada bentangan rata tepat | [log pixel renderer](evidence/checks/notes-model-check.log) |
| Komposisi visual |40 desktop +15 keadaan telefon, diteliti satu demi satu; tambahan tatal modul/utility | [ulasan visual](evidence/VISUAL_REVIEW.md), [perbandingan 10 papan](evidence/comparison/README.md) |

Browser kegunaan meliputi 216 kombinasi layout, 90 paparan rich-text merentasi
15 ID soalan, tiada permintaan HTTP(S) ketika standalone offline, dan tatal formula
melalui papan kekunci hingga hujung kanan pada BM/EN 320px. Rumus tidak dikecilkan
atau diubah untuk melepasi ujian. Kes yang lulus dikekalkan; kes yang terjejas
oleh susun atur baharu diuji semula selepas selector dan fixture diperbetulkan.

## Pemeliharaan fungsi dan batas bukti

[Semakan bebas](runtime-independent-review.md) mengesahkan 119 fail domain,
offline/cloud, CRUD, sesi, SQL/backend dan geometri identik byte dengan asas.
core/content hanya berubah nombor versi. Paparan rekod accessibility.mjs
menggunakan mesh kanonik dan tidak menukar protokol kemajuan. Firmware tidak
berubah. Rekod setiap fail ada dalam [scope proof](evidence/checks/runtime-independent-scope.json).

Semua akaun, kelas, sesi, nama dan skor QA ialah sintetik. Browser menjalankan
Chromium 151 pada desktop/touch emulation, dengan backend PGlite/Edge tempatan
untuk aliran kelas/Duel. Ini tidak mendakwa ujian pada peranti fizikal/Safari
atau deployment backend hosted. Lihat manifest untuk hash input dan keadaan
setiap gambar. [Hash binaan](evidence/checks/build-hashes.json) membezakan
HTML standalone, bundle laman dan modul vendor.

Audit statik mempunyai batas nyata: konfigurasi aplikasi menunjuk dist yang
diabaikan alat; keputusan 0 itu tidak dianggap bukti aplikasi bersih. Audit
modul menandakan 98 butang kerana alat hanya mengenali handler inline dan tidak
menganalisis binding.mjs. Semua 98 disahkan mempunyai binding sumber dan click
listener Chromium sebenar;9 aliran wakil turut diuji. Tiada onclick palsu
ditambah untuk mendiamkan alat. [Disposition lengkap](evidence/checks/static-audit-disposition.md)
mengekalkan semua ID, lokasi sumber/listener serta keputusan asal.

Perbezaan visual terkawal direkodkan, termasuk dialog native, borang sebenar
yang lebih panjang, Kaedah 1, enam pandangan ortografik sebenar dan pemilikan
rekod refleksi. Hasil ini menyelaraskan komposisi; ia tidak mendakwa salinan
piksel atau tiada perbezaan langsung.

Tiada push ke main/main-digitalized, deployment SQL/Edge/Auth/SMTP atau penerbitan
Pages dilakukan oleh kerja ini. Semua binaan disediakan secara tempatan untuk
branch semakan.
