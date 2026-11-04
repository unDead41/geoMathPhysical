# Backend Google dan Phone

Sumber asas: `main-digitalized` pada `ef697c86a5bfdf5a5658c3df92bce1d7f3f88652`
(Digital v2.9.0, modul v1.6.1). Projek Supabase: **GeoDecoder**,
`fkrlwzxvyufndavlpzbp`.

## Urutan rollout

1. Semak dan deploy
   [migration penyedia Auth](../../../supabase/migrations/20261104053103_geodecoder_auth_providers.sql)
   sebelum frontend Google/Phone digunakan pada projek hosted. Migration
   menyediakan `public.geo_complete_profile(username, display_name, role)`;
   mengaktifkan provider sahaja tidak menyediakan profil GeoDecoder untuk
   identiti baharu.
2. Ikut [persediaan Google dan SMS](../../docs/AUTH_PROVIDERS.md). Masukkan
   Client Secret dan kelayakan SMS terus ke Supabase Dashboard. Jangan simpan
   kelayakan sebenar dalam Git, frontend, laporan atau chat.
3. Pastikan URL Configuration memulangkan pengguna ke
   `https://undead41.github.io/geodecoder-digital/`.
4. Terbitkan frontend yang sepadan, kemudian lengkapkan ujian pengguna sebenar
   dalam panduan tersebut. Rekod keputusan DB/SDK berasingan daripada Google
   consent dan penghantaran SMS sebenar.

Fail SQL dalam Git dan ujian setempat bukan resit deployment hosted. Semak
rekod migration projek serta hasil RPC sebelum menganggap langkah 1 selesai.

RPC hanya menerima sesi `authenticated` dan menggunakan `auth.uid()` sendiri.
Profil pertama memerlukan identiti Google/email atau telefon yang disahkan
oleh Auth; metadata pengguna bukan bukti. Panggilan berulang bagi profil
sedia ada memulangkan snapshot dan mengekalkan peranan asal.

## Semakan status baca sahaja

Dari akar repository:

```sh
node digital/backend/auth-providers/provider-status.mjs
```

Memerlukan Node dengan `fetch` dan `AbortSignal.timeout`. Skrip mengimport
konfigurasi awam sedia ada dan hanya membuat `GET /auth/v1/settings`.
Output dihadkan kepada masa semakan, status Google/Phone, `disable_signup`,
`mailer_autoconfirm` dan `phone_autoconfirm`. Nilai `null` bermakna endpoint
tidak mendedahkan flag tersebut; semak Dashboard. `phone_autoconfirm: false`
bermakna pengesahan telefon diperlukan apabila flag itu tersedia.

Status provider `true` tidak membuktikan secret betul, Google consent berjaya,
SMS sampai, kuota mencukupi atau migration telah dideploy. Skrip tidak
mengaktifkan provider, menghantar OTP, mencipta akaun atau membaca sesi.

## Status yang diperhatikan pada 4 November 2026

Pemeriksaan Dashboard sebelum konfigurasi: **Google Disabled**, Client IDs dan
Client Secret kosong. **Phone Disabled**, Twilio dipilih tetapi Account SID,
Auth Token dan Message Service SID kosong. Pengesahan telefon dihidupkan,
SMS OTP 60 saat dengan 6 digit, dan tiada kod telefon ujian tetap.

Tiada kelayakan Google/SMS tersedia untuk melengkapkan consent atau penghantaran
SMS sebenar dalam pemeriksaan ini. Gunakan
[senarai penerimaan](../../docs/AUTH_PROVIDERS.md#ujian-penerimaan) selepas
konfigurasi dibuat.
