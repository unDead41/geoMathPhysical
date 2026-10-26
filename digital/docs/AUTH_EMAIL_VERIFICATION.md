# Auth email v1.0.0 — pengesahan dan handoff

Tarikh: **26 Oktober 2026, Malaysia**.
Repository: `unDead41/geodecoder`.
Branch hasil: `digitalized-utility-auth-email`.
Asas remote: `main-digitalized`, `790d989d666e64f3beabb507cd4140b832696367`.
Rujukan firmware `main`: `a059979d97926b82cafd4aa5cf3fe59da04a55bb`, v1.1.3.

## Skop dan kaedah

Lapan templat, satu sumber susun atur/salinan, manifest subjek, alat bina/
pratonton/eksport setempat dan dokumentasi pemasangan. Versi pakej templat
v1.0.0 berasingan daripada aplikasi v2.6.0 serta modul v1.5.0. Tiada perubahan
runtime aplikasi, modul, firmware, database, RLS, fungsi Auth atau Pages.

Ref dan sumber dibaca melalui GitHub connector pada SHA tetap. Git CLI tidak
mempunyai credential di persekitaran ini; snapshot fail yang berkaitan diasingkan
ke worktree sendiri. Penerbitan menggunakan tree asas dan parent **remote sebenar**,
bukan commit snapshot tempatan, dengan hanya fail hasil kerja sebagai overlay.
Fail lain dalam repo dipelihara. Semakan ref selepas push merekodkan SHA sebenar
dalam laporan akhir; dokumen ini tidak cuba menyimpan SHA commitnya sendiri.

## Bukti

| Semakan | Hasil / batas |
|---|---|
| Baseline `node --test digital/tests/email-auth.test.mjs` | 4 lulus sebelum perubahan. |
| `node --test digital/tests/email-templates.test.mjs digital/tests/email-auth.test.mjs` | 10 lulus: 6 pakej templat dan 4 kontrak Auth sedia ada. Tiada e-mel dihantar. |
| `node digital/tools/email-templates.mjs --check` | 8 HTML + manifest sepadan sumber canonical. |
| `python tools/check_version.py` | v1.1.3 kekal sepadan README/CHANGELOG firmware. |
| Semakan visual offline | 32 kes: 8 templat × alamat biasa/254 aksara × lebar 320/640px; tiada teks keluar daripada ruang halaman. |
| Pembaca HTML offline | WeasyPrint 70.0, tanpa rangkaian. Gaya asas diuji tanpa kebergantungan pada media query skrin sempit. Ini bukan Gmail/Outlook atau pelayar sebenar. |
| Percubaan pratonton pelayar tempatan | Pelayar pengguna tidak dapat mencapai pelayan setempat persekitaran kerja. Tiada dakwaan ujian responsive pelayar dibuat. |
| Dashboard Supabase sebenar | Projek GeoDecoder Digital Free memaparkan **Set up custom SMTP to edit templates**; Save disabled. [Bukti skrin](auth-email-evidence/supabase-smtp-required.png). |
| Pengaktifan hosted dan peti masuk | **Belum dibuat**: custom SMTP ialah prasyarat yang belum tersedia. Tiada permintaan e-mel ujian, perubahan credential, toggle atau kuota. |

Laporan susun atur: [layout-checks.json](auth-email-evidence/layout-checks.json).
Pratonton: [pengesahan desktop](auth-email-evidence/confirmation-640.png),
[reset pada 320px](auth-email-evidence/recovery-320.png),
[OTP pada 320px](auth-email-evidence/reauthentication-320.png).
Pautan dan alamat pada pratonton adalah rekaan dan tidak boleh digunakan.

Untuk mengulang bukti visual, jalankan `--preview` dahulu, kemudian
`python tools/verify-email-layout.py` dari folder `digital` dalam persekitaran
yang mempunyai WeasyPrint 70.0 serta PyMuPDF. Alat ini hanya membaca fixture
tempatan, menyekat muat turun aset dan merekodkan PNG/JSON; ia tidak menghubungi Auth.

Suite permainan/modul penuh dan binaan frontend tidak dijalankan semula kerana
tiada kod atau artifak frontend berubah. Ujian ESP32/telefon fizikal tidak termasuk.

## Langkah pengaktifan

1. Pemilik menyambungkan SMTP yang dikawalnya melalui [SMTP Settings](https://supabase.com/dashboard/project/fkrlwzxvyufndavlpzbp/auth/smtp).
   Nama pengirim yang dicadangkan: **GeoDecoder Digital**. Credential dimasukkan
   terus pada penyedia/dashboard, tidak dimasukkan ke repo atau chat.
2. Pasang subjek dan HTML mengikut [manifest](../backend/email/manifest.json),
   bermula dengan Confirm sign up dan Reset password. Kekalkan URL pengesahan.
3. Reload dan bandingkan templat yang tersimpan. Penghantaran ujian kepada alamat
   milik sendiri dibuat selepas arahan pengguna; sahkan rupa peti masuk serta
   callback pendaftaran/reset. Uji pautan luput/diguna semula secara berasingan.
4. Simpan resit pengaktifan dan hasil peti masuk apabila benar-benar selesai.
   Push/merge branch, pratonton dan respons API bukan bukti penghantaran.

Sumber polisi dan had semasa berada dalam [EMAIL_SETUP.md](EMAIL_SETUP.md).
