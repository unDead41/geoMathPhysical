# Audit Duel GeoDecoder Digital — 26 Oktober 2026

Pemilik kerja: `digitalized-game-duel`. Asas integrasi dibaca melalui connector
GitHub pada SHA **790d989d666e64f3beabb507cd4140b832696367**, Digital v2.6.0,
modul v1.5.0, firmware v1.1.3. Head Duel lama ialah
**8373fd4bae11847c3a3099ee6f61e2756d99349b**. Perbandingan remote menunjukkan
integrasi 29 commit di hadapan dan 0 di belakang; head Duel lama ialah merge
base. Kerja ini menyambung keseluruhan integrasi, bukan menggantikannya dengan
fail Duel lama. Semakan remote terakhir sebelum handoff direkod dalam handoff.

`AGENTS.md`, `docs/SOR_VERSIONING.md`, README, seni bina, UX, kontrak backend
dan kod sebenar diperiksa. Blob sumber yang digunakan disahkan terhadap SHA Git.
Git HTTPS dalam shell tidak mempunyai credential; connector GitHub digunakan
untuk pembacaan/penerbitan branch. Worktree sendiri mengekalkan commit asas
sebenar serta fail lain dalam tree. Tiada branch atau repository penerbitan
diubah oleh audit.

## Yang sudah berfungsi pada asas

- Bilik PIN enam digit, dua slot, lobi dan sedia bersama; sepuluh item sama,
  dua per bentuk, dengan mula/deadline daripada pelayan.
- PostgreSQL mengesahkan R1→R2, markah, hint, satu percubaan dan sequence.
  Backend tidak mengambil skor atau masa daripada klien.
- Advisory lock per token dan room row lock menserialkan operasi; replay seq
  sama dengan payload sama tidak menggandakan markah.
- Had lobi 10 minit, permainan 15 minit, TTL akses 24 jam dan cleanup terhad.
- Token pemain 256 bit di sessionStorage, hash di DB; tiada jawapan/percubaan
  lawan dalam projection ringkas. Quiz/Practice tidak menyimpan skor Duel.

Semakan asas **dijalankan semula**, bukan diwarisi daripada laporan lama:
21 ujian Duel dan lima kumpulan PostgreSQL terasing lulus sebelum pembaikan.
Edge production v1 sama byte dengan kedua-dua fail sumber pada asas.

## Penemuan berasaskan bukti

| Keutamaan | Bukti/akar masalah | Tindakan candidate |
|---|---|---|
| P0 | Snapshot menghantar semua `questionIds`; `Game.fromDuelSnapshot` memadankannya dengan bank yang mengandungi `shape`. Hint juga berada dalam item klien sebelum diminta. | Protocol 2: hanya prompt aktif, ID posisi tanpa ID asal/shape; hint selepas disahkan backend. Tiada fallback v1. |
| P1 | Selepas salah/langkau, backend menaikkan `answered` tetapi fasa pembetulan hanya berada pada UI. Refresh memulihkan soalan seterusnya. | Migration `review_pending` + `advance` bersequence, minimum 900/1800 ms kekal. Refresh memulihkan feedback/review. |
| P1 | `mutate()` meneruskan kerja selepas `forget()` dan boleh mengubah sesi baharu atau membaca `null.pending`; poll lama boleh memulakan rantai tambahan. | Generation/session guard, abort, polling epoch, single-flight refresh dan snapshot monotonik. Lapan regresi asal dibuktikan gagal dahulu. |
| P1 | Scan dinilai sekali lagi secara lokal selepas ACK; state pelayan boleh berbeza selepas retry/deadline. | Adapter `duel-state.mjs` menggunakan keputusan dan rekod pelayan sahaja; Game yang sama digunakan. |
| P1 | Replay jawapan diterima sebelum deadline memulangkan ACK `correct` lama bersama snapshot terminal; UI boleh kekal pada skrin permainan. | Regresi browser membuktikan timeout skrin keputusan; laluan scan/hint dan tick terminal kini membuka keputusan. |
| P1 | Salah R1 kemudian refresh boleh memaparkan ✓ “Bongkah diterima” bagi pilihan yang salah. | Restore tanda diterima hanya untuk R1 yang disahkan; regresi dua sesi meliputi salah R1 dan salah R2. |
| P1 UX | Tiada baki masa lobi/perlawanan; status akhir/forfeit pemain kurang jelas; ralat live berada pada lobi tersembunyi. | Timer berlabel, status teks selesai/forfeit/anggaran kehadiran, ralat dan sambungan dalam live region. |
| P2 kandungan | Lima bentuk/15 item tidak merangkumi keseluruhan Bab 6 atau T3. B1/B2 boleh disalahfahami sebagai definisi umum kuboid. | Label T2 Bab 6, jejak sumber setiap item, salinan Duel B1/B2 dijelaskan sebagai contoh. Bank firmware/offline kekal. |

## Keputusan skop

Tiada perubahan peraturan skor atau pemenang: pasangan betul +1, satu
percubaan, hint tanpa potongan, skor tertinggi kemudian masa tamat pelayan.
Menu, review, tab tersembunyi dan disconnection tetap dikira dalam jam Duel.
`advance` menjadikan semakan sedia ada tahan refresh; ia tidak mengubah skor
atau `finished_at`. Tamat masa dan forfeit tetap keputusan backend.

Perubahan yang memerlukan keputusan besar ditangguhkan sebagai cadangan P2:
rematch dengan persetujuan dua pihak dalam bilik sama; bank parametrik mengikut
kesukaran; mod T3 Pelan/Dongakan dengan rajah/skala tersendiri; polisi unready
atau pembatalan automatik bagi pemain lama tidak hadir. Semua itu perlu spesifikasi
dan bukti penggunaan, bukan ditambah secara senyap dalam pembaikan kestabilan.

## Backend production yang benar-benar dilihat

Projek **GeoDecoder Digital**, ref `fkrlwzxvyufndavlpzbp`, region Singapore,
PostgreSQL 17.11.0.003, `ACTIVE_HEALTHY`. Empat jadual Duel wujud, RLS dipaksa,
RPC hanya service-role dan rutin SECURITY INVOKER dengan search_path tetap.
Edge `geodecoder-duel` ACTIVE v1, `verify_jwt=true`, bundle SHA-256
`016f16d82a8657cd65dce7062e2a3f769a8abdd537906c7ecce37cc0f9342c75`.

Probe state v2 yang sengaja tidak sah menerima HTTP400/`invalid_request` tanpa
header protokol, selepas gateway menerima publishable `apikey`. Kod v1 menolak
medan tambahan sebelum RPC: probe ini tidak mencipta bilik/pemain. Klien baharu
memetakan penolakan v1 itu kepada mesej kemas kini backend, bukan menyalahkan PIN.
`verify_jwt` tidak diubah atau dimatikan.

Advisory [INFO RLS-without-policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
bagi empat jadual Duel adalah selaras deny-all direct access.
[WARN leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
dan [INFO unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
dalam schema bersama dilaporkan kepada pemilik backend, tidak diubah dalam kerja ini.
Tiada secret/service-role key, akaun, SMTP atau data pengguna dijadikan fixture.

## Batas bukti

Ujian browser menggunakan Chromium headless sebenar dan dua context bebas,
berkomunikasi dengan handler sebenar dan PostgreSQL WASM (PGlite) terasing.
Ia bukan mock pemarkahan. PGlite menyusun query pada satu enjin; permintaan
serentak ini belum membuktikan contention lock PostgreSQL multi-connection.
Network offline diemulasi oleh pelayar; telefon fizikal, pembaca skrin sebenar,
latensi rangkaian sekolah dan production v2 belum diuji.

Bank offline sengaja kekal awam untuk latihan. Protocol 2 menyekat metadata
jawapan aktif, hint dan pilihan soalan masa depan daripada respons Duel; ia tidak
menjadikan bank latihan yang diketahui sebagai peperiksaan dengan bank rahsia.
Lihat [audit sumber Matematik](DUEL_CONTENT_AUDIT.md), [kontrak/deployment v2](DUEL_V2.md)
dan [handoff integrasi](DUEL_V2_HANDOFF.md) untuk keputusan akhir.
