# Chat: GeoMath — Duel UI/UX

Branch kerja tepat: `digitalized-game-duel-ui-refresh`.

Repository: https://github.com/unDead41/geodecoder
Asas kod: `main-digitalized` remote terkini.
Ref konsep: `ui/ux-redesign-concept`.
Folder konsep: `digital/docs/uiux-redesign-concept/`.

Ini arahan pelaksanaan UI. Teruskan berdasarkan sumber sebenar dan selesaikan pilihan teknikal rutin sendiri.

## Sebelum mengubah kod

1. Fetch asas, branch kerja dan ref konsep; rekod SHA penuh serta versi sebenar. Gunakan folder/worktree sendiri. Jika branch kerja sudah ada, semak sejarah dan sambung perubahan sah tanpa reset/force-push.
2. Baca AGENTS.md, docs/SOR_VERSIONING.md, digital/docs/BRANCH_ARCHITECTURE.md, digital/DESIGN.md, digital/UX-CONTRACT.md dan digital/docs/DESIGN_SYSTEM.md.
3. Pada ref konsep, baca README.md, manifest.json, IMPLEMENTATION_CONTRACT.md dan OWNERSHIP.md. Baca prompt ini sepenuhnya. Sahkan SHA-256 gambar rujukan sebelum menjadikannya asas visual. Kod semasa kekal asas pelaksanaan; jangan merge seluruh branch konsep ke atas kod terkini.
4. Periksa controller, template, CSS, token dan ujian sebenar sebelum merancang perubahan. Simpan semua ciri yang telah diterima.

## Peraturan bersama

Ikut gaya konsep GeoMath: latar putih/biru muda, navy, tindakan biru, panel kemas dan ruang kerja geometri. Gunakan design system pusat; jangan cipta palette, preference store, header induk atau engine kedua. Identiti paparan GeoMath tidak mengubah ID/storage/API/protokol GeoDecoder.

Bina DOM/CSS dan interaksi sebenar. Rajah matematik mesti datang daripada renderer/data canonical, bukan PNG konsep. Teks, nombor, bentuk dan keadaan contoh dalam gambar tidak menggantikan kontrak runtime. Kekalkan BM/English, light/dark/system, teks 100/125/150%, kontras, reduced motion, keyboard dan touch.

Commit dan push **hanya ke branch kerja yang dinyatakan**. Jangan push/merge `main`, `main-digitalized`, `sharing`, branch lain atau mirror `geodecoder-digital`. Jangan publish Pages/Sites, deploy backend/Edge, migration atau mengubah Auth/SMTP. Jangan force-push atau menukar checkout chat lain.

## Rujukan visual dan skop

Buka `images/03-scoreboard-and-duel.png`, paparan **10, 11, 12**, dan `images/04-account-and-duel-result.png`, paparan **13**. Paparan 09 ialah rujukan gaya sahaja; papan skor solo bukan skop perubahan.

Laksanakan:
- Cipta/sertai Duel: pilihan jelas, PIN enam digit dengan input accessible, pending/error yang boleh dipulihkan.
- Lobi: PIN/salin, dua slot pemain, status menunggu/sedia/terputus dan countdown yang benar-benar berasal daripada state.
- Pertarungan: lawan, markah, soalan dan masa mudah dilihat; pad R1/R2 serta semua lima bongkah/lima bentangan boleh dicapai. Petunjuk, pemilihan, review dan sambung semula kekal.
- Keputusan: pemenang/seri/forfeit, markah/masa dan tindakan sebenar yang disokong; semakan jawapan serta latihan salah jika controller menyokongnya. Jangan memaparkan rematch atau kembali lobi palsu.

## Audit dan sempadan kod

Baca digital/docs/DUEL.md, DUEL_V2.md, DUEL_V2_HANDOFF.md serta sumber dist/duel.mjs, duel-state.mjs, app.mjs, core.mjs, index.html, i18n.mjs, CSS dan ujian Duel.

Ubah hanya bahagian persembahan Duel dan hook kecil yang diperlukan. Scope selector supaya Home, kuiz, latihan, kelas dan hasil chat UI lain tidak berubah. Jangan menyalin seluruh app.mjs/index.html daripada branch lama.

Kekalkan protokol 2, transport/token, sequence/idempotency, server-authoritative score/time, durable review, current-question projection dan fail-closed version gate. Jangan bocorkan jawapan atau soal akan datang ke klien. UI tidak menilai scan Duel secara lokal.

R1 bongkah → R2 bentangan; satu pasangan betul +1. Kekalkan semua lima pilihan setiap shelf, warna/posisi bebas, single attempt, hint dan feedback sedia ada. PIN lobi 10 minit, match 15 minit; jam tidak berhenti ketika dialog/tab tersembunyi/disconnect. 900ms betul dan minimum 1800ms salah/langkau kekal berasaskan acknowledgement pelayan.

## Pengesahan dan serahan

Dari digital: jalankan `npm run design:check`, `npm test`, `npm run test:duel`, `npm run build`, `npm run prepare:pages`, `npm run check`. Prepare Pages ini penyediaan fail setempat sahaja, bukan izin publish. Gunakan fixture localhost sedia ada, dua browser contexts dan tiada match production.

Semak create/join/ready/countdown, double click, salah PIN, PIN tamat, pending/retry, disconnect/reload pada fasa R1/R2/review, keputusan seri/forfeit serta BM/English, tema, keyboard dan mobile 390px. Pastikan kuiz/latihan tidak regresi.

Sertakan screenshot hasil kod (desktop/mobile), fail diubah, base/concept/final SHA penuh, keputusan ujian dan had sebenar dalam `digital/docs/handoffs/digitalized-game-duel-ui-refresh/LATEST.md`. Push branch ini sahaja; berikan link branch dan SHA remote yang dibaca semula.
