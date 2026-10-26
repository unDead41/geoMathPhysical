# GeoDecoder Digital V2

Versi Digital semasa: **v2.4.0**. Modul pembelajaran **v1.2.0** kini mempunyai empat Makmal interaktif.

Versi digital **2.4.0**, branch **digitalize-utility-profile**. Permainan geometri R1 → R2 kini mempunyai akaun guru/pelajar, kelas dan room dengan skor langsung. Firmware v1.1.3 menggunakan versi berasingan.

## Laman GitHub Pages

Main terus: **https://undead41.github.io/geodecoder-digital/**.

Penerbitan menggunakan repository public `unDead41/geodecoder-digital`, branch `main-digital`, folder akar. Repository asal ini kekal private. Fail laman mengandungi frontend sahaja; database/Auth/Realtime kekal pada Supabase. Lihat `docs/GITHUB_PAGES.md` untuk rekod keluaran dan cara kemas kini laman.

## Cuba satu fail HTML

Muat turun `GeoDecoder_Digital_V2.html` dan buka dengan Chrome atau Edge terkini. Semua kod, CSS, soalan dan ilustrasi telah dibundel. **Akaun dan room memerlukan Internet**; latihan sendiri boleh dimainkan tanpa Internet. `GeoDecoder_Digital_V1.html` dikekalkan sebagai nama fail serasi dan mengandungi keluaran V2 yang sama.

## Home dan mod tetamu

Halaman awal ialah Home dengan ilustrasi GeoDecoder dan dua pilihan:

- **Play as a Guest** membuka borang ringkas nama, Murid/Pelajar dan kelas. Tekan **Mulakan permainan** untuk latihan sendiri. Tiada akaun, username atau kata laluan diperlukan. Nama panggilan diterima; rekod hanya pada pelayar/peranti ini. Mod ini boleh dimainkan tanpa Internet.
- **Buka akaun & kelas** membuka log masuk/daftar untuk kelas, PIN, room dan keputusan guru. Mod kelas memerlukan Internet.

Borang tetamu mempunyai **Kembali ke Home**. Home tidak memaparkan borang nama/kelas sebelum pemain memilih Guest. Selepas keputusan latihan, pemain boleh main lagi atau kembali ke Home. Header tema cerah/gelap kekal tersedia pada setiap halaman.

## Guru

1. Tekan **Akaun dan kelas**, pilih **Daftar akaun** dan peranan **Guru**.
2. Daftar username (3–24 huruf, nombor atau `_`), nama paparan, email dan kata laluan (10–128 aksara). Sahkan email melalui pautan sebelum log masuk.
3. Cipta kelas. Kongsi PIN enam digit atau jemput username pelajar yang sudah berdaftar; pelajar menerima jemputan dalam akaunnya.
4. Lihat roster kelas, carian nama/username dan status aktif. “Aktif sekarang” bermaksud heartbeat diterima dalam 45 saat terakhir.
5. Cipta bilik, kongsi PIN bilik dan tekan **Mulakan permainan**. Guru memantau soalan semasa, markah, masa menjawab serta keputusan akhir dalam papan skor.
6. **Tutup bilik** menghentikan percubaan yang belum selesai dan mengekalkan markah separa. Keputusan yang sudah lengkap kekal. Bilik ditutup tidak boleh dibuka semula.

PIN dijana rawak di database, termasuk digit sifar di hadapan, unik dan sah 24 jam. **PIN baharu** membatalkan kod lama dan juga tersedia apabila kod sudah luput. PIN kelas menyertai kelas; PIN bilik menyertai kelas dan bilik itu.

## Pelajar

Daftar peranan **Pelajar**, sahkan email, kemudian masukkan PIN guru atau terima jemputan username. Pelajar yang sudah berada dalam kelas boleh memilih bilik kelasnya. Tunggu guru mula, kemudian tekan **Mula bermain**. Satu percubaan bagi setiap pelajar dalam setiap bilik; buka semula bilik untuk menyambung percubaan yang sama.

Jika sambungan gagal selepas memilih jawapan, **Hantar semula** menghantar ID tindakan yang sama. Markah tidak ditambah dua kali. Buka semula bilik selepas reload untuk mengambil keadaan daripada server. Semakan/kawalan input diselaraskan kepada keadaan server, termasuk jika akaun yang sama digunakan dalam tab lain.

## Peraturan dan masa

Sepuluh soalan unik, dua bagi setiap lima bongkah daripada bank firmware 15 soalan. Semua pelajar dalam bilik menerima susunan sepuluh soalan yang sama. Semua lima bongkah dan lima bentangan tersedia; susunan dan warna berubah setiap soalan. Pilih bentuk, bukan warna.

Imbas bongkah di R1 dahulu, kemudian bentangan di R2. Pasangan betul +1; salah R1/R2 menamatkan satu-satunya percubaan dengan +0. Langkau +0. Petunjuk percuma dikira sekali setiap soalan. Betul mempunyai 900 ms maklum balas; salah/langkau memerlukan semakan sekurang-kurangnya 1.8 saat. Analisis akhir menunjukkan bongkah, R1/R2, topik dan setiap jawapan. R2 yang belum dicuba tidak dikira salah.

**Room:** database menentukan jawapan, markah dan masa. Masa menjawab terus berjalan ketika dialog/jeda dibuka, tab ditinggalkan atau Internet terputus. Masa menunggu mula dan semakan jawapan dikecualikan. Kedudukan: markah tertinggi, kemudian masa menjawab paling singkat. Masa pada paparan dianggarkan antara kemas kini server.

**Latihan sendiri:** nama/kategori/kelas dan maksimum 50 skor disimpan dalam pelayar yang sama; jam dijeda ketika dialog atau tab tersembunyi. Ranking latihan: markah, kurang salah, masa. CSV dan skor retry V1 terdahulu kekal berasingan. Jika storan pelayar disekat, latihan masih boleh dimainkan dengan rekod sesi sementara. Keputusan room tidak dimasukkan ke papan skor latihan.

Klik/sentuh kad kemudian pengimbas sebagai alternatif seretan. Tab, Enter dan Space turut disokong. Jeda animasi dan reduced motion mengurangkan gerakan. Butang tema menukar **cerah/gelap** dan menyimpan pilihan pada peranti.

## Backend hosted

Database PostgreSQL, Auth, Realtime dan Edge Function `geodecoder-auth` sudah disediakan pada projek Supabase Free **GeoDecoder Digital**, region Singapore. URL awam: `https://fkrlwzxvyufndavlpzbp.supabase.co`. Frontend membawa publishable key sahaja; service-role key hanya berada dalam persekitaran Edge Function. Pendaftaran baharu menggunakan email sebenar dengan pengesahan Supabase Auth. Login menerima email atau username. Terlupa kata laluan meminta pautan email dan membuka borang kata laluan baharu hanya selepas sesi pemulihan disahkan. Akaun lama tanpa email masih menggunakan username dan kod pemulihan lama. **Penghantaran email umum memerlukan custom SMTP serta URL redirect; tetapan dashboard belum dapat diselesaikan kerana sesi browser meminta log masuk.** Lihat `docs/EMAIL_SETUP.md`.

Guru hanya mengurus kelas/bilik sendiri. Pelajar tidak boleh mencipta kelas, membaca kelas guru lain atau menulis markah terus. Skema `private` tidak didedahkan melalui Data API. RLS pada `public.room_progress` mengehadkan bacaan kepada pemilik bilik atau pelajar yang sudah menyertainya. Peranan disalin sekali daripada metadata pendaftaran yang disahkan ke profil peribadi; suntingan metadata selepas pendaftaran tidak menukar peranan atau kebenaran.

Pemantauan guru menggunakan WebSocket dengan fallback refresh 15 saat. Dashboard/pelajar disegar setiap 15 saat; heartbeat 20 saat. Pelan Free mempunyai kuota dan projek boleh dijeda selepas tidak aktif. Rujukan: https://supabase.com/pricing dan https://supabase.com/docs/guides/platform/going-into-prod . Tiada pelan berbayar dipilih. Frontend tersedia sebagai fail HTML dan pada GitHub Pages: https://undead41.github.io/geodecoder-digital/ .

## Pembangunan dan deploy semula

```sh
cd digital
npm ci
npm test
npm run build
npm run check
```

Node/npm hanya diperlukan untuk pembangunan; dependency dipin melalui `package-lock.json`. `dist/index.html` menggunakan `dist/app.bundle.js`. Pembina juga menghasilkan HTML tunggal dalam `artifacts/`; salin ke akar folder sebelum commit. Tetapan awam projek berada dalam `dist/cloud-config.mjs`.

Panduan database/RPC: `backend/README.md`. Untuk projek baharu, gunakan `backend/schema.sql`, deploy `backend/auth/index.ts` sebagai Edge Function `geodecoder-auth` dengan `verify_jwt=false` (endpoint signup/login melakukan pengesahan sendiri), dan gunakan environment built-in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Jangan masukkan key server ke frontend. `backend/fix_v2.sql` merekodkan pembetulan alias yang telah digunakan pada projek hosted; schema penuh sudah mengandungi pembetulan itu.

Jalankan `backend/verify.sql` sebagai database owner: seluruh ujian dibatalkan melalui rollback. `GEODECODER_LIVE_TEST=yes node tools/verify-cloud.mjs` ialah ujian integrasi opt-in yang **mencipta akaun/kelas/bilik sintetik sebenar** pada projek dikonfigurasi. Fail credential dalam `artifacts/` adalah sementara dan tidak boleh dicommit. Bersihkan fixture berdasarkan UUID yang direkodkan selepas ujian. Jangan jalankan secara membuta tuli pada projek pengguna lain.

Rujukan bank/SHA: `docs/SOURCE.md`. Keputusan dan had ujian: `docs/VERIFICATION.md`. Modul v1.2.0 daripada `digitalize-module` dipinkan tanpa perubahan sebagai `vendor/module-v1.2.0.html` (commit `931a0150397bfb3fd79ef3c8da6684167d1c6aad`), dibuka dalam iframe terasing daripada Home. Branch modul asal tidak diubah.

## Muzik latar

`rest_site_bg` memainkan menu/Home/akaun/keputusan. `when_open_map_bg` memainkan modul dan permainan. Muzik bermula selepas interaksi pertama, bertukar tanpa pertindihan, berhenti ketika tab tersembunyi dan menyimpan pilihan hidup/mati. Bunyi kesan kuiz menggunakan butang berasingan. Kedua-dua lagu dibekalkan pengguna, dikekalkan durasi penuh dan dioptimumkan kepada MP3 stereo 96 kbps; cover/metadata dibuang. Website memuat audio apabila diperlukan; HTML muat turun membenamkan kedua-dua lagu serta modul.

## Makmal interaktif

Dari Home, pilih **Teroka modul pembelajaran → Makmal interaktif**. Empat aktiviti: **Bina Bentangan**, **Makmal Isi Padu**, **Terbitkan Rumus** dan **Bongkah Gabungan**. Aktiviti menggunakan geometri dan kawalan modul asal; muzik map berjalan sepanjang modul dibuka. Pin tepat direkodkan dalam `vendor/module-release.json`.

## Profil Saya (v2.4.0)

Tekan **Profil Saya** pada header, atau avatar/nama pada ruang akaun. Pengguna boleh menyimpan nama paparan (2–60 aksara) dan satu daripada enam avatar terbina dalam. Nama pengguna, e-mel, pengesahan e-mel, peranan dan kelas ialah maklumat baca sahaja daripada backend. Tetamu mendapat penerangan serta butang log masuk.

Untuk database sedia ada, jalankan `backend/profile_v2_3.sql` sebagai database owner selepas migrasi email v2.2, sebelum menggunakan frontend ini. Fail itu ialah naik taraf daripada asas v2.3; `schema.sql` sudah merangkumi fungsi sama bagi pemasangan baharu. Tiada perubahan pada modul offline vendor. Lihat `docs/PROFILE.md` untuk kontrak, ujian dan batasan.
