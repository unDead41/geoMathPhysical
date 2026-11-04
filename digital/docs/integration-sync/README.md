# GeoMath Digital — integrasi dan penyelarasan branch

Tarikh: **4 November 2026**, Malaysia. Repository sumber private:
`unDead41/geodecoder`; branch integrasi **main-digitalized**.
Versi sumber **v2.9.0**, modul **v1.6.1**.

Lapan branch fitur dan satu addendum backend digabungkan daripada sumber sebenar
berasaskan `391df985eea4fee15d9859e678068b1a3f613cba`. Semua kepala sumber
dikekalkan sebagai ancestor integrasi, termasuk tiga branch modul melalui
snapshot modul `18b1e3e56c8dfd703392f6f70f29daffbafbf204`.
[INPUTS.json](INPUTS.json) merekodkan SHA sebelum perubahan dan sempadan ref.
Commit sumber diuji dan dipush: `b01a3250b571ae10d1dc412cc93755921f91798b`.
[REMOTE_RECEIPT.json](REMOTE_RECEIPT.json) mengesahkan main-digitalized dan
26 branch fitur pada commit itu. Commit dokumentasi susulan boleh memajukan
head tanpa mengubah payload yang diuji.

| Gabungan | Hasil |
|---|---|
| UI utama | Home, pilihan mod, panduan dan resume sebenar; aset 3D dikongsi |
| Duel | Cipta/sertai, lobi, pertarungan dan keputusan menggunakan controller/protocol asal |
| Tiga modul | Shell/Teroka/nota/kalkulator, makmal, pelan/pengiraan/rekod; semua 11 bongkah dan matematik asal |
| Offline | Pakej PWA lengkap, cache aset awam, IndexedDB outbox dan penyelarasan rekod kendiri mengikut pemilik/sesi |
| CRUD kelas | Rename, archive/restore, delete kosong, keluarkan ahli dan urus undangan dengan hak akses/retention |
| Transport/scaling | Cache singkat, request coalescing, polling/backoff, simpanan modul segera dan heartbeat berkala |
| Backend addendum | Panduan operasi terkini tanpa menggantikan history/config/dispatcher integrasi |

Offline mempunyai satu implementasi dalam sumber bersama. Selepas menerima
upstream, branch kerja menggunakan adapter itu; tiada keperluan membina sistem
offline sekali lagi. Duel dan tindakan kelas kekal memerlukan Internet.

## Penyelesaian konflik yang diuji

- Hook `app`, `cloud`, `module-progress`, bahasa dan builder digabungkan pada
  sumber; bundle dan alias HTML dijana semula daripada gabungan itu.
- Satu laluan outbox menyimpan rekod modul dengan segera. Cache/session checks
  mengekalkan ralat rangkaian sementara tanpa membenarkan respons akaun lama.
- Wrapper CRUD mengendalikan snapshot sebelum lock mutasi dan menulis heartbeat
  selepas 15 saat, sambil mengekalkan membership, room scope dan rekod percubaan.
- Gabungan tiga region modul mengekalkan geometri/parser asal; navigasi telefon
  mengalir semula pada teks besar supaya dokumen tidak melimpah.
- Navigasi kelas membersihkan destinasi tertunda. Skip link memfokuskan landmark
  utama tanpa bertembung dengan route permainan `#main`.
- Ujian induk mengesahkan disclosure rekod yang kini menggunakan
  `aria-labelledby`, tajuk English sebenar dan empat tindakan aktiviti.

## Pengesahan gabungan

Suite penuh aplikasi: **482/482 lulus**, 0 gagal/skip, concurrency 1.
Suite modul: **341/341 lulus**, 0 gagal/skip. Build, prepare:pages dan check
aplikasi serta build/check modul lulus. `prepare:pages` menulis artifak setempat.

Pelayar Chromium setempat menguji Explore (64 keadaan), Labs (202 semakan),
Studio (48 keadaan dan empat aliran sebenar), CRUD (empat kumpulan), Duel UI
(lima kumpulan termasuk 18 layout) dan offline (tujuh senario). Resit akhir
serta skop solo/usability direkodkan dalam [VERIFICATION.json](VERIFICATION.json).
Kesemua tujuh kes solo dan skop usability navigation/quiz-review turut lulus;
percubaan touch awal dan retry fokus direkodkan dalam `ui-browser-attempts.json`.
PGlite menguji kedua-dua urutan SQL gabungan, kebenaran, replay/owner dan
snapshot baca sahaja. Semakan bebas meluluskan skop dan kualiti selepas dua
pembetulan navigasi; lihat [integration-final-review.md](integration-final-review.md).

Percubaan suite aplikasi terdahulu lulus 481/482 dan menemui assertion label
lama pada rekod modul. Ujian diselaraskan kepada kontrak disclosure baharu,
lulus 5/5 secara fokus dan diulang dalam suite penuh yang lulus di atas.
Kegagalan itu dikekalkan sebagai bukti percubaan, bukan dikira lulus.

## Branch dan sambungan kerja

Semua **26 branch fitur Digital** menerima hasil integrasi melalui fast-forward
yang menyemak head asal. `digitalize/security-activeSession` mengekalkan namanya.
`digitalized-release-legacy` kekal sejarah; registry migrasi/frozenInventory
mengekalkan rekod asal. Resit remote akhir disimpan berasingan daripada inventori.

[BRANCH_SYNC_PROMPTS.md](BRANCH_SYNC_PROMPTS.md) menyediakan prompt sambungan
bersama, semakan khusus pemilik fitur dan prompt backend yang masih diperlukan.

## Baki kerja backend dan live

**Sumber telah disatukan; pengaktifan hosted belum dilakukan oleh kerja ini.**
Scaling/offline masih memerlukan pendaftaran migration canonical, semakan history
hosted baharu dan persediaan rollout. Normal root migration push kini hanya
memasukkan calon CRUD. Laluan pemasangan lengkap yang diuji ialah 11 archive
diikuti tiga calon; lihat [SQL_ORDER.md](SQL_ORDER.md). Jangan isi resit hosted
untuk SQL yang belum dipasang.

Penerbitan awam perlu menggunakan keseluruhan `digital/artifacts/pwa/`, termasuk
worker, manifest, ikon dan kedua-dua audio. Prosedur mirror lama index/audio
sahaja perlu diselaraskan. Push sumber private tidak mengaktifkan PWA live.

Tiada migration production, deployment Edge, perubahan Auth/SMTP, penghantaran
email, pembelian pelan atau penerbitan mirror/Pages dilakukan di sini.
Ujian setempat tidak membuktikan 5,000 pengguna serentak, Auth/Realtime production
atau peranti fizikal. Ref firmware, perkakasan, konsep dan mirror awam disemak
berasingan daripada branch sumber Digital.
