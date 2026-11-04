# Google dan Phone — persediaan GeoDecoder Digital

Panduan ini merujuk projek Supabase **GeoDecoder**
(`fkrlwzxvyufndavlpzbp`) dan frontend
<https://undead41.github.io/geodecoder-digital/>. Sumber asas ialah
`main-digitalized` pada `ef697c86a5bfdf5a5658c3df92bce1d7f3f88652`
(Digital v2.9.0, modul v1.6.1).

**Deploy [migration RPC penyempurnaan profil](../../supabase/migrations/20261104053103_geodecoder_auth_providers.sql)
daripada branch ini sebelum menggunakan frontend Google/Phone pada projek hosted.** Penyedia Auth
mengesahkan identiti; profil aplikasi masih perlu dilengkapkan melalui RPC.
Semak [urutan backend](../backend/auth-providers/README.md).

## Status konfigurasi

Pemeriksaan Dashboard pada **4 November 2026**, sebelum sebarang konfigurasi:

| Tetapan | Diperhatikan |
| --- | --- |
| Google | Disabled; Client IDs dan Client Secret kosong |
| Phone | Disabled; SMS provider Twilio dipilih |
| Twilio Account SID / Auth Token / Message Service SID | Ketiga-tiganya kosong |
| Phone confirmations | Dihidupkan |
| SMS OTP expiry / length | 60 saat / 6 digit |
| Fixed test phone codes | Tiada |

Status ini ialah pemerhatian pada masa tersebut, bukan semakan berterusan.
Menambah butang frontend atau lulus ujian SDK tidak mengaktifkan provider.
Jangan kongsi Client Secret, Auth Token, OTP atau token sesi dalam chat/Git.

## Nilai URL tepat

| Lokasi tetapan | Nilai |
| --- | --- |
| Google OAuth client → Application type | `Web application` |
| Google → Authorized JavaScript origins | `https://undead41.github.io` |
| Google → Authorized redirect URIs | `https://fkrlwzxvyufndavlpzbp.supabase.co/auth/v1/callback` |
| Supabase → Authentication → URL Configuration → Site URL | `https://undead41.github.io/geodecoder-digital/` |
| Supabase → Redirect URLs / `CLOUD_CONFIG.authRedirectUrl` | `https://undead41.github.io/geodecoder-digital/` |

Google origin menggunakan domain tanpa path. Callback Google berakhir di
Supabase; selepas itu Supabase memulangkan sesi ke URL frontend yang dibenarkan.
Gunakan URL produksi tepat dalam allowlist. [S1][S2]

## Google

1. Buka [Google Auth Platform](https://console.cloud.google.com/auth/overview)
   dalam projek Google Cloud milik anda. Lengkapkan **Branding** dengan nama
   aplikasi dan alamat sokongan yang sesuai.
2. Dalam **Audience**, pilih **External** untuk akaun Google umum. **Internal**
   hanya sesuai jika semua pengguna dalam Google Cloud Organization yang sama.
   Gunakan projek berasingan untuk pembangunan dan produksi. [S3][S4]
3. Dalam **Data Access**, gunakan skop login asas sahaja: `openid`,
   `https://www.googleapis.com/auth/userinfo.email` dan
   `https://www.googleapis.com/auth/userinfo.profile`. [S1]
4. Buka **Clients → Create client → Web application**. Isikan origin dan
   callback tepat daripada jadual di atas. Cipta client. [S1]
5. Buka [Supabase → Authentication → Sign In / Providers](https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/providers)
   → **Google**. Masukkan Web Client ID dalam **Client IDs** dan Client Secret
   dalam **Client Secret** terus di Dashboard. Aktifkan Google dan **Save**.
   Kekalkan semakan keselamatan lalai. [S1]
6. Semak **URL Configuration** menggunakan nilai dalam jadual, kemudian uji
   login melalui frontend yang sepadan. [S2]

Untuk percubaan, semak status **Testing** dan daftarkan akaun penguji dalam
**Audience → Test users** jika diperlukan oleh konfigurasi/skop. Google
menetapkan had biasa 100 penguji dan grant 7 hari, tetapi mengecualikan aliran
Sign in with Google yang hanya meminta nama, email dan profil asas. Jangan
anggap had 7 hari itu terpakai kepada sesi Supabase. Untuk penggunaan umum,
gunakan projek produksi berstatus **In production** dan lengkapkan verifikasi
yang Google minta; status produksi tidak menjamin verifikasi jenama/skop
selesai. [S3][S4]

## Phone melalui SMS Twilio

1. Sediakan akaun Twilio dengan kapasiti/kredit aktif untuk destinasi sebenar.
   Semak sekatan trial semasa; trial mengehadkan penerima yang disahkan dan
   boleh mengehadkan negara serta templat. Jangan anggap semua trial serasi
   dengan mesej OTP tersuai. [S5]
2. Dalam **Twilio Console → Messaging → Services**, cipta **Messaging Service**
   dan tambah penghantar SMS yang sesuai ke **Sender Pool**. Lengkapkan
   pendaftaran penghantar yang diperlukan. Gunakan service daripada akaun
   yang sama dengan Account SID/Auth Token. [S6]
3. Dalam **Messaging → Settings → Geo Permissions**, benarkan hanya negara
   yang diperlukan, termasuk Malaysia (`+60`) jika itu sasaran. Semak keperluan
   penghantar negara tersebut. Negara dibenarkan tidak menjamin penghantaran
   setiap operator. [S7]
4. Dalam Supabase **Authentication → Sign In / Providers → Phone**, pilih
   **Twilio** dan isikan terus kelayakan akaun aktif berikut. Gunakan live
   credentials; test credentials Twilio hanya mensimulasikan SMS. [S8][S11]

| Medan Supabase | Nilai daripada Twilio |
| --- | --- |
| Twilio Account SID | Account SID (`AC…`) |
| Twilio Auth Token | Auth Token akaun; rahsia |
| Twilio Message Service SID | Messaging Service SID (`MG…`) |

5. Kekalkan **phone confirmations enabled**, tempoh OTP **60 saat**, panjang
   **6 digit**, dan had permintaan sedia ada. Semak **Authentication → Rate
   Limits** untuk kuota OTP/SMS sebelum rollout. Jangan longgarkan had semata-
   mata untuk mengatasi kegagalan ujian. [S9]
6. Aktifkan **Phone**, **Save**, kemudian uji pada nombor milik penguji dalam
   format antarabangsa E.164. Jangan isi kod OTP tetap untuk nombor produksi.
   Kod ujian tetap hanya sesuai pada persekitaran ujian berasingan. [S10]

SMS sebenar boleh mengenakan caj. Semak kadar, baki/kuota dan sekatan akaun
semasa dalam Twilio sebelum menghantar; panduan ini tidak menetapkan harga atau
menjamin penghantaran. Semakan status baca sahaja tidak menghantar SMS.

## Ujian penerimaan

Jalankan hanya selepas migration dan konfigurasi provider disahkan. Rekod
keputusan setiap lapisan secara berasingan:

| Lapisan | Bukti yang diperlukan |
| --- | --- |
| Setempat / simulasi SDK | Ujian branch lulus; tiada dakwaan Google consent atau SMS sebenar |
| Hosted DB | Migration tersenarai dan RPC profil baharu boleh digunakan oleh identiti teresah |
| Status provider | Jalankan `node digital/backend/auth-providers/provider-status.mjs`; flag `true` hanya membuktikan provider diaktifkan |
| Google sebenar | Login dari laman → Google consent → kembali ke URL tepat → lengkapkan profil → kelas/profil dapat dimuatkan → logout/login semula |
| Phone sebenar | Minta OTP sekali → SMS diterima pada peranti sebenar → kod betul diterima → lengkapkan profil → logout/login semula |
| Penolakan | Batal Google, kod salah/luput, had resend dan rangkaian gagal menghasilkan mesej yang boleh dipulihkan |
| Akaun lama | Email/username login, pemulihan dan peranan profil sedia ada kekal betul |

Jangan rekod nombor penuh, alamat email, OTP, URL callback bertoken atau sesi
dalam bukti awam. Tanpa kelayakan provider dan peranti penerima, consent Google
serta penghantaran SMS sebenar kekal **belum diuji**. Kejayaan penghantaran
Twilio sahaja juga belum membuktikan OTP diterima dan disahkan dalam aplikasi.

Jika Google memberi `redirect_uri_mismatch`, bandingkan callback Google dengan
jadual. Jika pengguna kembali ke halaman salah, semak `redirectTo`, Site URL
dan Redirect URLs Supabase. Jika SMS gagal, semak kelayakan, Sender Pool,
destinasi/trial, baki dan log ralat provider; kekalkan pengesahan telefon.

## Rujukan rasmi

Disemak pada 4 November 2026. Tetapan konsol boleh berubah; dokumentasi rasmi
di bawah ialah rujukan konfigurasi.

- [S1 — Supabase: Sign in with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [S2 — Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [S3 — Google: Manage App Audience](https://support.google.com/cloud/answer/15549945?hl=en)
- [S4 — Google: OAuth production policy](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance)
- [S5 — Twilio: Trial account and restrictions](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account)
- [S6 — Twilio: Messaging Services](https://www.twilio.com/docs/messaging/services)
- [S7 — Twilio: SMS Geo Permissions](https://www.twilio.com/docs/messaging/guides/sms-geo-permissions)
- [S8 — Supabase: SMS provider fields](https://supabase.com/docs/guides/local-development/cli/config#authsmstwiliotwilio_verifyaccount_sid)
- [S9 — Supabase: Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [S10 — Supabase: Phone sign-in](https://supabase.com/docs/guides/auth/phone-login?showSmsProvider=Twilio)
- [S11 — Twilio: Test credentials](https://www.twilio.com/docs/iam/test-credentials)
