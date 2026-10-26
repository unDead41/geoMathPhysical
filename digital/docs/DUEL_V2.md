# Duel protocol 2 — kontrak dan deployment terselaras

Candidate pada `digitalized-game-duel`, berasaskan aplikasi v2.6.0. Nombor
release gabungan perlu dinaikkan oleh chat integrasi sebelum penerbitan.
Modul v1.5.0, firmware, bank offline dan identiti GeoDecoder dikekalkan.

## Sempadan tanggungjawab

| Pemilik | Fail |
|---|---|
| Pengangkutan/token/retry/polling | `dist/duel.mjs` |
| Validasi dan adaptasi snapshot kepada enjin bersama | `dist/duel-state.mjs`, `dist/core.mjs` |
| Lobi, input, semakan dan keputusan | `dist/app.mjs`, `index.html`, `i18n.mjs`, `style.css` |
| Peraturan, masa, sequence dan durable review | Gateway PostgreSQL dalam migration Duel v2 |
| Projection awam dan kandungan dua bahasa | `backend/duel/functions/geodecoder-duel/handler.mjs`, `questions.mjs` |

`Game.scan/skip/advance` lokal tidak boleh mengubah Duel. UI menggunakan
`applyDuelAcknowledgement(..., snapshot)` selepas backend mengesahkan tindakan.
Quiz/Practice/Classroom mengekalkan aliran masing-masing dan enjin Game yang sama.

## Wire contract

Setiap POST menyertakan `protocol:2`, token pemain dan medan tindakan v1 sedia
ada. `advance` menambah `{action:'advance', roomId, token, seq, questionIndex}`;
indeks ialah item yang baru disemak, `answered-1`. Sequence retry sama sentiasa
mengekalkan payload sama. Ia tidak mengubah skor atau masa tamat pemain.

Kejayaan menyertakan `protocol:2`, room tanpa `questionIds`, `me.reviewPending`,
`room.lobbyExpiresAt`, `currentQuestion` dan medan ringkasan sebelumnya.
`currentQuestion` hanya tersedia apabila bermain, belum selesai dan review tidak
pending. Bentuknya `{id:'duel-N', index:N, topic, copy:{ms:{prompt,lines,hint?},en:{...}},formulaKey?}`.
Tiada ID asal, `shape`, sumber atau kesukaran editorial dalam soalan aktif.
Hint hanya dihantar apabila `hintUsed` disahkan pelayan.

`me.answers` hanya mengandungi item diselesaikan, dengan ID asal, jawapan dan
`question` dua bahasa untuk pembetulan/analisis. Data lawan kekal ringkasan;
tiada token, sequence, jawapan, attempts atau hint lawan. Room countdown tidak
mendedahkan prompt. Hints, scan dan skip tidak dibenarkan semasa durable review.

Selepas jawapan: `answered` dan skor diselesaikan, `review_pending=true`,
`next_ready_at=server_now+900` (betul) atau `+1800` (salah/langkau). Feedback
betul menghantar advance secara automatik; semakan salah/langkau memerlukan
butang teruskan. Reload memulihkan fasa dan baki minimum yang sama. Advance
item terakhir masih sah selepas room complete supaya semakan terakhir tidak
terkunci. Deadline/forfeit memuktamadkan baki di backend dan membersihkan review.

Header `X-GeoDecoder-Duel-Protocol: 2` turut berada pada error dan didedahkan
melalui CORS. Permintaan v1 mendapat HTTP426 `client_update_required`; database
yang belum dimigrasi mendapat HTTP503 `backend_update_required`. Klien v2 pada
Edge v1 memaparkan backend-update apabila menerima penolakan format lama.
Jangan fallback kepada projection v1 yang mendedahkan pilihan soalan.

## Sebelum pemilik backend deploy

Kerja ini **tidak** menjalankan migration production, deploy Edge, perubahan
Auth/SMTP atau penerbitan Pages. Selaraskan dahulu dengan chat Audit Backend
Supabase dan integrator. Pastikan tiada kerja Duel lain menggunakan gateway
yang sama; bandingkan definisi routine dengan asas audit, bukan overwrite rutin
backend bersama. Sebaiknya selesaikan perlawanan aktif sebelum pertukaran versi.

1. Sahkan projek `fkrlwzxvyufndavlpzbp`, schema `geodecoder_duel`, Edge
   `geodecoder-duel` dan `verify_jwt=true`. Inventori semasa v1 ada dalam audit.
2. Semak dan apply **hanya** fail
   `backend/duel/supabase/migrations/20261026091324_duel_durable_review_v2.sql`
   melalui migration workflow pemilik backend. Ia dicipta oleh CLI Supabase
   2.122.0, menambah satu column/constraint dan mengganti empat routine Duel.
   `schema.sql` ialah bootstrap sejarah; jangan jalankan semula pada production.
3. Jalankan `backend/duel/verify-v2.sql` sebagai satu transaksi sehingga
   `ROLLBACK`. Ia menggunakan hash/alias/PIN fixture rawak, tidak rekod pengguna.
   Hasil yang dijangka: notice `Duel v2 rollback verification passed`; tiada
   bilik/pemain/rate bucket fixture tersimpan selepas tamat transaksi.
4. Deploy Edge bernama sama dengan **tiga fail** dalam direktori
   `backend/duel/functions/geodecoder-duel/`: `index.ts`, `handler.mjs`,
   `questions.mjs`. Entry point kekal `index.ts`; `verify_jwt` kekal **true**.
   Rahsia runtime sedia ada digunakan; tiada nilai rahsia perlu disalin ke Git.
   `config.toml` sedia ada tidak diubah. Jika menggunakan MCP deploy, sertakan
   ketiga-tiga kandungan fail dan `verify_jwt:true` secara eksplisit.
5. Sahkan versi/header/error gate, satu match dua sesi dengan fixture yang
   dibersihkan, duplicate/retry, deadline dan reconnect pada endpoint hosted.
   Semak log/advisor dan sahkan direct table/RPC anon/authenticated masih ditolak.
6. Serahkan resit deployment sebenar kepada integrator. Selepas backend siap,
   integrator boleh mengambil candidate, menaikkan versi aplikasi, membina semua
   alias HTML dan memilih masa penerbitan. Chat Duel tidak merge/publish Pages.

Jangan menggunakan `supabase db push` secara umum pada folder ini: ia bukan
salinan keseluruhan migration history projek bersama. Fail SQL tunggal perlu
dipadankan dengan history pemilik backend. CLI config folder lama juga bukan
struktur init Supabase penuh; jangan meneka path deployment.

## Rollback dan keserasian

`backend/duel/rollback-v2.sql` dipersiap dan diuji secara terasing. Pulihkan
**Edge v1 dan frontend v1 bersama**, kemudian jalankan rollback SQL di bawah
penyelarasan pemilik backend apabila tiada klien v2 aktif. Ia memulihkan empat
routine lama dan membuang column fasa baharu; jawapan/skor/bilik sedia ada tidak
dipadam. Default column baharu false memelihara rekod lama ketika upgrade,
tetapi tab HTML v1 mesti refresh/diganti kerana protocol gate sengaja fail-closed.

Token/PIN/sessionStorage key dan project ref kekal, jadi sesi yang sah boleh
dipulihkan. Dua soalan per bentuk, skor dan tiebreaker kekal. B1/B2 hanya
diperjelas pada salinan Duel; keputusan lengkap menyimpan salinan yang benar-benar
dilihat, manakala latihan soalan salah menggunakan ID bank offline sedia ada.

Rujukan rasmi disemak: changelog Supabase (termasuk perubahan TLS dan PG17.11),
dokumentasi Edge auth/API keys melalui `search_docs`. Tiada perubahan tersebut
memerlukan penukaran `verify_jwt` untuk patch ini. Laporan ujian terbaharu dan
had multi-connection/production berada dalam [handoff](DUEL_V2_HANDOFF.md).

## Jalankan semula secara terasing

```sh
cd digital
npm ci
npm test
PGLITE_MODULE="$PWD/node_modules/@electric-sql/pglite/dist/index.js" node backend/duel/verify-local.mjs
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npm run test:duel
npm run build
npm run prepare:pages
npm run check
```

`test:duel` kini sentiasa menggunakan fixture localhost yang ditutup selepas
ujian; tiada endpoint production dipanggil. Playwright mesti tersedia pada
runtime ujian atau melalui `PLAYWRIGHT_MODULE_PATH`. Untuk menguji laman hosted,
gunakan pelan smoke terselaras di atas; skrip live lama bukan resit v2.
