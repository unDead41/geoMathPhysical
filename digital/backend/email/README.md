# E-mel akaun GeoDecoder Digital

Pakej templat **v1.0.0**, branch `digitalized-utility-auth-email`.
Asas remote `main-digitalized`: `790d989d666e64f3beabb507cd4140b832696367`.
Versi aplikasi v2.6.0, modul v1.5.0 dan firmware v1.1.3 dikekalkan.

## Kandungan

Lapan templat HTML menggunakan warna GeoDecoder, butang besar, pautan sandaran,
salinan BM/English, tip keselamatan dan preheader. Semua teks kekal teks sebenar,
bukan imej. Tiada font, logo atau aset yang perlu dimuat turun. Jadual susun atur,
gaya inline, had lebar 600px dan pembalut pautan panjang menyokong klien e-mel.
Jika media query dibuang, susun atur asas masih menggunakan lebar fleksibel.

| Supabase → Authentication → Emails | Fail | Tindakan |
|---|---|---|
| Confirm sign up | `templates/confirmation.html` | Pengesahan pendaftaran |
| Reset password | `templates/recovery.html` | Pautan reset kata laluan |
| Invite user | `templates/invite.html` | Jemputan akaun Auth, berasingan daripada jemputan kelas |
| Magic link or OTP | `templates/magic_link.html` | Pautan log masuk sekali guna |
| Change email address | `templates/email_change.html` | Pengesahan perubahan alamat |
| Reauthentication | `templates/reauthentication.html` | Kod OTP daripada `{{ .Token }}` |
| Password changed | `templates/password_changed_notification.html` | Notifikasi, jika sudah diaktifkan |
| Email address changed | `templates/email_changed_notification.html` | Notifikasi, jika sudah diaktifkan |

`manifest.json` memadankan nama dashboard, subjek, fail serta nama medan
Management API. `templates.mjs` ialah sumber tunggal salinan dan susun atur;
jangan menyunting HTML generated secara terus. Tiada perubahan API auth, metadata
pengguna, role, kata laluan, sesi, tempoh token atau redirect.
Kewujudan templat tidak mengaktifkan magic link, jemputan Auth, perubahan e-mel,
OTP atau notifikasi tambahan dalam aplikasi. Ia hanya menyediakan reka bentuk
sekiranya aliran itu digunakan. Templat notifikasi tidak mengubah toggle aktifnya.

## Bina dan semak

Dari folder `digital`, gunakan Node 22 atau lebih baharu. Tiada pemasangan
dependency diperlukan untuk pembina atau ujian templat ini.

```sh
node tools/email-templates.mjs --build
node tools/email-templates.mjs --check
node --test tests/email-templates.test.mjs tests/email-auth.test.mjs
node tools/email-templates.mjs --preview
```

Arahan terakhir menghasilkan galeri `artifacts/email-previews/index.html` dan
varian alamat panjang untuk ujian 320px. Semua akaun/pautan pratonton menggunakan
domain `.invalid`; ia tidak menghantar e-mel dan tidak mengesahkan sesi.

Untuk menyediakan JSON subjek/body sahaja bagi pemasangan terkawal selepas SMTP
diaktifkan:

```sh
node tools/email-templates.mjs --payload > artifacts/auth-email-payload.json
```

Alat ini tidak memanggil Management API atau menulis tetapan hosted. JSON tidak
mengandungi SMTP credentials atau perubahan kepada polisi keselamatan.

## Aktifkan di projek hosted

Pada 26 Oktober 2026, dashboard projek `fkrlwzxvyufndavlpzbp` memaparkan
**Set up custom SMTP to edit templates**. Projek Free ini masih menggunakan
penghantar lalai. Mengikut perubahan polisi 3 Jun 2026, projek Free baharu tidak
boleh mengubah subjek/body selagi menggunakan penghantar itu. Pakej branch ini
belum bermaksud templat hosted berubah.

1. Sambungkan SMTP melalui **Authentication → Emails → SMTP Settings**.
   Gunakan provider serta alamat pengirim yang anda kawal. Nama pengirim boleh
   ditetapkan kepada **GeoDecoder Digital** selepas sambungan itu disediakan.
   Credential dimasukkan terus dalam dashboard, bukan chat atau repository.
2. Kekalkan Site URL dan allowlist tepat `https://undead41.github.io/geodecoder-digital/`.
3. Dalam setiap templat yang hendak digunakan, salin **subject** daripada manifest
   dan keseluruhan HTML fail berkaitan ke medan **Body**, kemudian Save.
4. Kekalkan `{{ .ConfirmationURL }}` pada butang dan pautan sandaran. Jangan
   menggantikannya dengan URL Home: Auth perlu mengesahkan token dahulu.
   Reauthentication menggunakan `{{ .Token }}`. Notifikasi menggunakan
   `{{ .SiteURL }}` untuk membuka aplikasi, bukan pautan pengesahan rekaan.
5. Baca semula nilai selepas reload. Pratonton dan uji penghantaran kepada akaun
   ujian yang dimiliki sendiri selepas konfigurasi SMTP. Semak pengesahan,
   reset dan pautan luput/guna semula; jangan anggap respons API membuktikan
   penghantaran peti masuk. Penghantaran ujian memerlukan arahan pengguna.

Hasil kerja ini tidak menukar pelan, provider, SMTP credentials, kuota, toggle
notifikasi atau pengesahan e-mel. Lihat [persediaan dan had](../../docs/EMAIL_SETUP.md)
serta [bukti semakan](../../docs/AUTH_EMAIL_VERIFICATION.md).
