# Profil Saya — calon v2.7.0

Branch: `digitalized-utility-profile`. Asas integrasi sebenar: `790d989d666e64f3beabb507cd4140b832696367` (`main-digitalized`, v2.6.0). Head profil sejarah sebelum kemas kini: `3e48d322e146f75a7407afcc9467b12561700646`. Nama branch mengikuti registry native rename; branch lama `digitalize-utility-profile` tidak diwujudkan semula.

## Perubahan dalam urutan 1 → 4 → 3 → 2

1. Draf nama/avatar dilindungi apabila keluar melalui Home, modul, kelas, keselamatan atau log keluar. Pilihan: Simpan dan teruskan, Buang perubahan, Teruskan menyunting. Escape membatalkan keluar. Simpan gagal/invalid tidak meneruskan destinasi. Penghantaran berganda disekat. Sesi akaun baharu membatalkan draf/destinasi lama. Tutup/reload tab menggunakan amaran native browser selepas interaksi, tertakluk kepada polisi browser.
2. Profil mempunyai pintasan Tetapan Penggunaan dan Kata Laluan & Keselamatan. Tetapan memanggil dialog bersama melalui host; tiada storan tetapan atau borang keselamatan kedua dicipta. Tetapan mengekalkan draf profil.
3. Kelas memaparkan nama dan guru daripada snapshot berizin. Buka kelas membawa pengguna ke ruang kelas yang dipilih. Murid tanpa kelas mendapat pintasan ke medan PIN; guru tidak diberi tindakan penyertaan murid. Jika backend belum membekalkan nama guru, UI menyatakan maklumat belum tersedia.
4. Nama/avatar dipratonton serta-merta melalui input/change, termasuk inisial Unicode. Pratonton menggunakan SVG sedia ada dan teks escaped. Status membezakan profil tersimpan dengan draf belum disimpan. Pengepala akaun hanya berubah selepas respons simpan disahkan. BM/English mengikuti bahasa bersama.

Semakan kod turut memulihkan pemeriksaan respons simpan profil yang tersalah berada dalam cabang email pada sumber asas; semakan kini berada pada mutasi profil sebenar. Respons kosong/akaun lain tidak boleh membuang draf atau mengumumkan kejayaan.

## Backend dan handoff kepada core-backend

`backend/schema.sql` hanya menambah `classes[].teacher_name` pada snapshot kelas yang sudah dibenarkan. Migrasi susulan `backend/profile_class_details_v2_7.sql` menggantikan snapshot daripada asas v2.6 dengan tambahan yang sama. Ia tidak mengubah dispatcher `geo_action`, peranan, grant, RLS, Auth, email, markah atau progress. Ujian PostgreSQL membuktikan murid hanya melihat kelas sendiri, tiada PIN guru/e-mel guru didedahkan dan nama guru mengikuti profil yang disimpan.

Migrasi **belum dijalankan pada hosted Supabase**. Pengendali core-backend perlu membandingkan snapshot hosted terkini sebelum menggabungkan tambahan ini; jika snapshot sudah berubah, gabungkan medan `teacher_name` ke definisi terbaharu, jangan menindih perubahan sah. Jangan jalankan semula `profile_v2_3.sql` selepas migrasi susulan kerana definisi lama boleh membuang medan baharu. Tiada migrasi akaun tambahan diperlukan bagi amaran/pratonton/pintasan.

## Pengesahan

- `npm test`: **258/258 lulus**, termasuk 10 senario regresi baharu bagi draf, navigasi, retry, pertukaran akaun, pintasan, kelas dan migrasi nama guru.
- `npm run build`: lulus; website 1,103,527 bait, HTML standalone 6,660,296 bait. Empat alias standalone dibina daripada sumber yang sama.
- `npm run check`: lulus; 150 ID unik, rujukan ARIA, token, bank soalan, aset, pin modul v1.5.0 dan sintaks standalone. Modul vendor tidak berubah.
- Ujian PostgreSQL menggunakan PGlite sebenar dengan role authenticated/anon; ujian portal menggunakan JSDOM. Ia bukan bukti sesi hosted atau penghantaran email.
- Browser extension tidak boleh mencapai pelayan workspace `127.0.0.1:8765` (connection refused). Ujian visual desktop/tablet/telefon/320px dan screenshot sebenar **belum selesai**. Tiada screenshot rekaan atau dakwaan audit visual dibuat.

Ulang fixture melalui `python -m http.server 8765` dari `digital/`, kemudian buka `/tests/browser/profile.html` pada pelayar yang boleh mencapai workspace. Semak kedua-dua bahasa/tema, 1440/768/390/320px, papan kekunci, tiga pilihan keluar, pending/gagal/retry dan nama panjang. Fixture menggunakan data simulasi dan tiada simpan hosted.

Log suite/build/check: `profile-v2_7-evidence/`. Branch ini tidak diterbitkan ke Pages dan tidak digabungkan ke `main-digitalized`. Firmware, kuiz, skor, matematik dan analitik dikekalkan.
