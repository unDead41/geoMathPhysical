> Laporan sejarah branch asal. Integrasi semasa, syarat deployment dan bukti
> gabungan v2.6.0: [RELEASE_V2_6.md](RELEASE_V2_6.md).

# Profil Saya — Digital v2.4.0

Branch hasil: `digitalize-utility-profile`.
Asas `digitalize`: `adc51627eaaace5d9543c7e033d2994986c8715d`.
Rujukan firmware main: `a059979d97926b82cafd4aa5cf3fe59da04a55bb` (v1.1.3).

## Reka bentuk dan kontrak

Gunakan portal akaun dan RPC `geo_action` sedia ada. Header mempunyai Profil Saya; avatar/nama dalam portal turut membuka halaman yang sama. Tiada sistem akaun ditambah dalam `vendor/module-v1.2.0.html`. Identiti warna, tema cerah/gelap, label BM dan kawalan HTML papan kekunci dikekalkan. Portal asas ini menggunakan BM; utility tidak memperkenalkan pilihan bahasa yang tidak tersedia.

Nama paparan menerima 2–60 aksara Unicode selepas trim, tanpa aksara kawalan. Avatar ialah inisial, kubus, kuboid, piramid, silinder atau kon; semua menggunakan SVG sedia ada tanpa aset luar. Butang Simpan mengumumkan sedang menyimpan, kejayaan atau kegagalan. Draf kekal selepas kegagalan dan poll. Simpan berganda disekat; respons sesi lama diketepikan. Avatar/nama akaun dikemas kini daripada respons server; avatar turut digunakan ketika membuka permainan kelas. Nama dalam proyeksi bilik dikemas kini tanpa menyentuh metrik permainan.

`update_profile` menerima tepat `{display_name, avatar}`. Server memperoleh pemilik melalui `auth.uid()` dan mengemas kini `where id=uid`. ID sasaran, role, username, e-mel dan apa-apa kunci tambahan ditolak. Trigger identiti/peranan sedia ada dan larangan menulis jadual terus dikekalkan. Snapshot hanya mengembalikan e-mel/pengesahan pengguna sendiri; senarai kelas menggunakan kebenaran sedia ada. Akaun lama dengan alamat dalaman dipaparkan tanpa mendedahkan alamat itu. Peranan, kelas, username dan pengesahan ialah baca sahaja.

## Pemasangan

Untuk database sedia ada selepas email v2.2: jalankan `backend/profile_v2_3.sql` sebagai owner. Nama fail merujuk versi asas v2.3, bukan versi frontend hasil. Migrasi transaksi ini boleh diulang; ia menambah avatar dan menggantikan dua fungsi private dengan kandungan daripada skema. Ia mengekalkan pembalut API dan grant sedia ada. Semak konflik fungsi jika menggabungkan utility lain yang turut mengubah `private.geo_action` atau `private.snapshot`. Untuk database baharu gunakan `backend/schema.sql`.

Migrasi **belum digunakan pada hosted Supabase**. Branch ini tidak menerbitkan Pages atau mengubah branch asas. Deploy frontend selepas migrasi; frontend sahaja tidak mengaktifkan simpan profil pada backend lama.

## Pengesahan, 26 Oktober 2026

- `npm test`: 91/91 lulus, termasuk 10 ujian profil baharu.
- PGlite menjalankan PostgreSQL sebenar dengan skema/RPC produksi: simpan, pemilikan, anon ditolak, payload tambahan ditolak, pengesahan input, peranan immutable dan nama papan bilik berubah sementara markah/masa kekal. PGlite bukan ujian hosted Auth atau RLS production.
- JSDOM menjalankan portal sebenar: nama/avatar berjaya, kegagalan dan retry, draf ketika refresh, pending/double-submit, input invalid, tetamu/log masuk, escaped text dan respons lewat selepas tukar akaun.
- `npm run build` dan `npm run check`: lulus; 99 ID unik, rujukan ARIA, bank, token dan aset disemak. HTML tunggal merangkumi portal akaun dalam parent; modul vendor kekal terasing.

## Batasan pelayar dan screenshot

Ujian desktop/tablet/telefon/320px dan screenshot sebenar **belum selesai**. Pelayar cloud tidak boleh mencapai pelayan workspace (connection refused/network policy); pelayar extension juga tidak boleh mencapai `127.0.0.1:8765`. Tiada screenshot rekaan disertakan dan tiada dakwaan audit layout/screen reader/sentuhan dibuat.

Untuk mengulang: jalankan `python -m http.server 8765` dari `digital/`, kemudian buka `http://127.0.0.1:8765/tests/browser/profile.html`. Halaman ini menggunakan portal produksi dan data akaun simulasi; tiada panggilan hosted dibuat. Uji viewport 1440×900, 768×1024, 390×844 dan 320×740, kedua-dua tema, enam avatar, nama panjang, pending, gagal/retry serta tetamu → log masuk. Semak tiada overflow mendatar, Tab/Space radio, fokus selepas simpan, dan maklumat baca sahaja. Rakam screenshot dengan label fixture; ia bukan bukti simpan hosted.
