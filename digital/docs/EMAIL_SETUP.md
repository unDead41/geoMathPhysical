# Aktifkan email GeoDecoder v2.2

Kod, migration `geodecoder_email_signup_v2_2`, dan borang email telah disediakan. Penghantaran ke peti masuk sebenar belum disahkan: dashboard meminta log masuk dan custom SMTP belum dikonfigurasi dalam sesi ini. Jangan menganggap permintaan yang diterima membuktikan email sudah sampai.

## Tetapan pemilik

1. Log masuk ke https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/url-configuration .
2. Tetapkan **Site URL** kepada `https://undead41.github.io/geodecoder-digital/` dan tambahkan URL sama dalam **Redirect URLs**. Simpan tanpa wildcard. HTML offline juga mengembalikan pautan email kepada laman HTTPS ini.
3. Buka **Authentication → Emails → SMTP Settings**. Sambungkan provider SMTP anda: sender email/name, host, port, username dan password SMTP. Masukkan credential terus dalam dashboard; jangan tampal ke chat, repo atau frontend. Tiada provider berbayar atau credential baharu diwujudkan oleh keluaran ini.
4. Kekalkan pengesahan email pendaftaran. Pemeriksaan public Auth settings pada sesi ini menunjukkan `mailer_autoconfirm=false`. Jangan mematikan pengesahan semata-mata untuk mengatasi kegagalan penghantaran.
5. Template **Confirm signup** dan **Reset password** boleh menggunakan pautan lalai `{{ .ConfirmationURL }}`. Auth mengesahkan token sebelum mengembalikan sesi ke laman. Jangan mengganti URL dengan halaman statik tanpa token.

SMTP lalai Supabase hanya menghantar kepada alamat anggota organisasi dan mempunyai had sangat rendah (dokumentasi semasa: 2 email sejam). Untuk guru/pelajar umum, custom SMTP diperlukan. Rujukan rasmi: https://supabase.com/docs/guides/auth/auth-smtp . Semak kuota provider yang dipilih sebelum digunakan dalam kelas.

## Ujian selepas tetapan

Gunakan email milik anda sendiri untuk daftar, sahkan pautan, log masuk menggunakan email dan username, kemudian log keluar. Pilih **Terlupa kata laluan?**, minta pautan, buka email, isi dua medan kata laluan baharu dan log masuk semula. Cuba pautan yang luput/digunakan semula untuk memastikan pilihan meminta pautan baharu muncul. Jangan melaporkan email berjaya dihantar sebelum peti masuk sebenar disemak.

Pautan menggunakan implicit flow untuk aplikasi statik. SDK mengesahkan sesi dengan Auth; URL dibersihkan selepas callback. Borang reset tidak boleh dibuka hanya dengan `#type=recovery`. Simpanan kata laluan baharu diikuti log keluar global. Email yang tidak berdaftar menerima salinan mesej umum untuk mengelakkan pendedahan akaun.

## Akaun lama dan deploy

Akaun lama beralamat Auth dalaman kekal dengan profil/kelas/skor asal. Login username dan pilihan **Akaun lama tanpa email?** masih tersedia. Ia belum mempunyai email pemulihan sebenar; email signup baharu tidak memindahkan pemilikan akaun lama secara automatik.

Untuk database sedia ada, jalankan `backend/email_v2_2.sql` sekali melalui migration, kemudian deploy `backend/auth/index.ts` sebagai `geodecoder-auth` dengan `verify_jwt=false` (handler mengesahkan input dan sesi sendiri). Schema penuh turut mengandungi trigger sama. `backend/verify_email.sql` dan `backend/verify.sql` menggunakan fixture dalam transaksi rollback; tiada email dihantar oleh ujian SQL. Jangan menggunakan skrip signup username lama sebagai ujian email live.
