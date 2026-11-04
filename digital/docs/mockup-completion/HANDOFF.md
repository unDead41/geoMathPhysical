# Handoff dan prompt integrasi

Branch hasil: `digitalized-ux-mockup-completion`. Asas yang dipelihara:
`ef697c86a5bfdf5a5658c3df92bce1d7f3f88652` (Digital2.9.0, termasuk offline,
CRUD dan scaling). Modul 1.6.2 dipin kepada sumber tepat
`7bba111209e15697cb4b704f6cef7c0fb120aa55`, blob
`3af0469979d878c8e605d093db1be0c0649c6509`. Semua perubahan backend/SQL masih
byte-identical; protokol Duel 2, outbox pemilik/sesi dan geometri kekal.

## Prompt selepas reka bentuk disemak

```text
Integrasikan hasil reka bentuk GeoMath yang telah diluluskan daripada
digitalized-ux-mockup-completion ke main-digitalized terkini.

Fetch semula dan rekod SHA penuh kedua-duanya. Baca AGENTS.md, polisi versi,
BRANCH_ARCHITECTURE.md, docs/mockup-completion serta rekod integration-sync.
Gunakan worktree sendiri. Pelihara semua perubahan sah yang masuk selepas
ef697c86a5bfdf5a5658c3df92bce1d7f3f88652, terutamanya offline/outbox,
CRUD/scaling, Auth dan kerja branch lain. Jangan menyalin keseluruhan folder
daripada branch lama sehingga memadam fungsi baharu. Selesaikan konflik pada
pemilik view/komponen sebenar dan kekalkan token pusat serta pin modul tepat.

Semak nombor versi cadangan 2.9.1/1.6.2 terhadap upstream semasa. Jalankan ujian
app/modul, build/check, browser aliran sebenar, offline dan semakan40 paparan.
Laporkan branch yang belum memasukkan upstream dan sediakan prompt kemas kini
khususnya; jangan menindih branch kerja aktif atau force-push.

Berikan resit commit, hash artifak dan perbezaan visual terkawal. Penerbitan Pages
dan deployment backend memerlukan skop penerbitan yang telah diberi pengguna;
jangan menganggap push sumber private bermaksud laman awam sudah berubah.
```

Fail sumber yang ditukar tertumpu pada pemilik view/CSS/copy, versi dan hasil
binaan. `tests/mockup-review.*` ialah alat QA sahaja dan tidak dibundel.
