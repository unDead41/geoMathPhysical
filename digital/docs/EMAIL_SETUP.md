# Persediaan e-mel GeoDecoder Digital

Kod, migration `geodecoder_email_signup_v2_2`, dan borang e-mel telah disediakan.
Semakan dashboard pada **26 Oktober 2026** mengesahkan projek masih menggunakan
SMTP lalai. Banner **Set up custom SMTP to edit templates** menyekat suntingan
subjek/body. Gambar yang dibekalkan pengguna menunjukkan e-mel asal diterima,
tetapi penghantaran dengan reka bentuk baharu belum diuji atau diaktifkan.

Pakej [templat akaun v1.0.0](../backend/email/README.md) menyediakan lapan HTML
BM/English dengan identiti GeoDecoder. Subjek dan pemetaan dashboard berada dalam
`backend/email/manifest.json`. Push branch tidak mengubah templat hosted.

## Tetapan pemilik

1. Log masuk ke https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/url-configuration .
2. Tetapkan **Site URL** kepada `https://undead41.github.io/geodecoder-digital/` dan tambahkan URL sama dalam **Redirect URLs**. Simpan tanpa wildcard. HTML offline juga mengembalikan pautan email kepada laman HTTPS ini.
3. Buka **Authentication → Emails → SMTP Settings**. Sambungkan provider SMTP anda: sender email/name, host, port, username dan password SMTP. Masukkan credential terus dalam dashboard; jangan tampal ke chat, repo atau frontend. Tiada provider berbayar atau credential baharu diwujudkan oleh keluaran ini.
4. Kekalkan pengesahan email pendaftaran. Pemeriksaan public Auth settings pada sesi ini menunjukkan `mailer_autoconfirm=false`. Jangan mematikan pengesahan semata-mata untuk mengatasi kegagalan penghantaran.
5. Selepas SMTP aktif, pasang subjek dan body daripada pakej templat untuk aliran
   yang digunakan. **Confirm sign up** dan **Reset password** mengekalkan
   `{{ .ConfirmationURL }}` pada butang serta pautan sandaran. Auth mengesahkan
   token sebelum mengembalikan sesi ke laman. Jangan mengganti URL dengan halaman
   statik tanpa token. Templat tambahan tidak mengaktifkan aliran/notifikasi baharu.

SMTP lalai Supabase hanya menghantar kepada alamat anggota organisasi dan mempunyai had sangat rendah (dokumentasi semasa: 2 email sejam). Untuk guru/pelajar umum, custom SMTP diperlukan. Rujukan rasmi: https://supabase.com/docs/guides/auth/auth-smtp . Semak kuota provider yang dipilih sebelum digunakan dalam kelas.

## Had penghantaran — semakan 26 Oktober 2026

E-mel pada gambar dihantar oleh `noreply@mail.app.supabase.io`; Gmail ialah peti
masuk penerima. Had Gmail sebagai pengirim hanya berkaitan jika Gmail dipilih
sebagai SMTP. Kuota Auth dan kuota provider ialah dua had berasingan; kedua-duanya
terpakai. Angka di bawah ialah polisi dokumentasi, bukan bacaan kuota live projek.

| Penghantar | Had yang didokumenkan | Catatan |
|---|---|---|
| SMTP lalai Supabase | 2 e-mel/jam/projek | Alamat ahli organisasi sahaja; dikongsi semua permintaan e-mel Auth. |
| Custom SMTP pada Supabase | Bermula 30 e-mel/jam/projek | Boleh diselaraskan dalam Authentication → Rate Limits, masih tertakluk kuota provider. |
| Akaun Gmail peribadi sebagai pengirim | Sehingga 500 e-mel/hari | Had dan sekatan penyalahgunaan Google tetap terpakai. Bukan kuota tambahan kepada Supabase. |
| Google Workspace sebagai pengirim | Sehingga 2,000 mesej/24 jam; trial 500 | Had penerima dan SMTP relay berbeza; semak edisi serta cara penghantaran. |

Sumber rasmi:

- [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Sekatan templat projek Free sejak 3 Jun 2026](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)
- [Had Gmail peribadi](https://support.google.com/mail/answer/22839?hl=en)
- [Had Google Workspace](https://knowledge.workspace.google.com/admin/gmail/gmail-sending-limits-in-google-workspace)

Projek Free baharu yang menggunakan SMTP lalai tidak boleh menukar templat.
Custom SMTP membolehkan reka bentuk sendiri tanpa mewajibkan naik taraf pelan
Supabase; kos atau kuota penyedia SMTP dipilih berasingan.

## Ujian selepas tetapan

Gunakan email milik anda sendiri untuk daftar, sahkan pautan, log masuk menggunakan email dan username, kemudian log keluar. Pilih **Terlupa kata laluan?**, minta pautan, buka email, isi dua medan kata laluan baharu dan log masuk semula. Cuba pautan yang luput/digunakan semula untuk memastikan pilihan meminta pautan baharu muncul. Jangan melaporkan email berjaya dihantar sebelum peti masuk sebenar disemak.

Pautan menggunakan implicit flow untuk aplikasi statik. SDK mengesahkan sesi dengan Auth; URL dibersihkan selepas callback. Borang reset tidak boleh dibuka hanya dengan `#type=recovery`. Simpanan kata laluan baharu diikuti log keluar global. Email yang tidak berdaftar menerima salinan mesej umum untuk mengelakkan pendedahan akaun.

## Akaun lama dan deploy

Akaun lama beralamat Auth dalaman kekal dengan profil/kelas/skor asal. Login username dan pilihan **Akaun lama tanpa email?** masih tersedia. Ia belum mempunyai email pemulihan sebenar; email signup baharu tidak memindahkan pemilikan akaun lama secara automatik.

Untuk database sedia ada, jalankan `backend/email_v2_2.sql` sekali melalui migration, kemudian deploy `backend/auth/index.ts` sebagai `geodecoder-auth` dengan `verify_jwt=false` (handler mengesahkan input dan sesi sendiri). Schema penuh turut mengandungi trigger sama. `backend/verify_email.sql` dan `backend/verify.sql` menggunakan fixture dalam transaksi rollback; tiada email dihantar oleh ujian SQL. Jangan menggunakan skrip signup username lama sebagai ujian email live.
