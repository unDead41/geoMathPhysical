# GeoMath Flutter — empat prompt pelaksanaan

Versi prompt **1.0.0** · **4 November 2026, Asia/Kuala_Lumpur**.
Ini arahan untuk chat pelaksanaan akan datang. Penyediaan prompt ini belum
mencipta projek Flutter, menjalankan emulator atau menghasilkan APK.

## Urutan penggunaan

| Prompt | Hasil | Branch kerja | Bila mula |
|---|---|---|---|
| [01 — Foundation](01-flutter-foundation.md) | Flutter runnable, UI bersama, kontrak, spike modul offline | `app-foundation` | Dahulu |
| [02 — Belajar](02-flutter-learning.md) | 11 model, makmal, studio, rekod dan warna muka | `app-learning` | Selepas foundation READY |
| [03 — Akaun, kelas dan permainan](03-flutter-cloud-game.md) | Auth, CRUD, solo, Duel dan sync native | `app-cloud-game` | Selepas foundation READY; boleh serentak dengan 02 |
| [04 — Integrasi dan Android](04-flutter-integration.md) | Sambung semua feature, uji app, APK dan panduan run | `app-integration`, kemudian `app` | Selepas 02 dan 03 dipush |

Gunakan empat chat berasingan. Prompt 02 dan 03 mesti menggunakan **SHA foundation
yang sama**. Prompt 04 sahaja menerbitkan hasil gabungan ke `app`.
Branch `app` sudah wujud, jadi gunakan nama `app-foundation` dan seterusnya;
nama `app/flutter-foundation` bercanggah dengan namespace ref `app`.

Setiap prompt membaca [COMMON_RULES.md](COMMON_RULES.md), SOR, mockup dan
kontrak sebenar. Enam subagen boleh bermula serentak bagi setiap prompt;
agen tambahan dibenarkan mengikut keperluan tanpa had jumlah kumulatif yang
ditetapkan, dalam kapasiti aktif runtime sebenar.

## Salin ke chat masing-masing

### Chat 1

```text
Bangunkan GeoMath Flutter — Foundation.
Repo: https://github.com/unDead41/geodecoder
Ref arahan: app
Baca dan laksanakan sepenuhnya docs/geomath-app-prompts/01-flutter-foundation.md
serta COMMON_RULES.md daripada ref tersebut.
Gunakan worktree sendiri. Mulakan 6 subagen serentak selepas audit dan
pembahagian fail; tambah subagen mengikut keperluan dalam kapasiti runtime.
Siapkan implementasi, ujian, bukti run dan push hanya app-foundation.
```

### Chat 2

```text
Bangunkan GeoMath Flutter — Belajar, Makmal dan Studio.
Repo: https://github.com/unDead41/geodecoder
Ref arahan: app
Baca dan laksanakan sepenuhnya docs/geomath-app-prompts/02-flutter-learning.md
serta COMMON_RULES.md daripada ref tersebut.
Mula selepas app-foundation READY; gunakan SHA foundation yang sama dengan Chat 3.
Gunakan worktree sendiri dan 6 subagen serentak; tambah agen jika perlu
dalam kapasiti runtime. Push hanya app-learning.
```

### Chat 3

```text
Bangunkan GeoMath Flutter — Akaun, Kelas, Permainan dan Offline Sync.
Repo: https://github.com/unDead41/geodecoder
Ref arahan: app
Baca dan laksanakan sepenuhnya docs/geomath-app-prompts/03-flutter-cloud-game.md
serta COMMON_RULES.md daripada ref tersebut.
Mula selepas app-foundation READY; gunakan SHA foundation yang sama dengan Chat 2.
Gunakan worktree sendiri dan 6 subagen serentak; tambah agen jika perlu
dalam kapasiti runtime. Push hanya app-cloud-game.
```

### Chat 4

```text
Integrasikan dan jalankan GeoMath Flutter pada Android.
Repo: https://github.com/unDead41/geodecoder
Ref arahan: app
Baca dan laksanakan sepenuhnya docs/geomath-app-prompts/04-flutter-integration.md
serta COMMON_RULES.md daripada ref tersebut.
Mula selepas app-learning dan app-cloud-game dipush.
Gunakan worktree sendiri dan 6 subagen serentak; tambah agen jika perlu
dalam kapasiti runtime. Selesaikan integrasi, ujian, screenshot dan APK.
Push app-integration, kemudian fast-forward app selepas pengesahan.
```

Arahan lengkap berada dalam fail yang dipautkan; blok pendek ini ialah pintu
masuk untuk chat membaca keseluruhan skop, bukannya menggantikan kontraknya.

## Baseline yang diperiksa ketika menyediakan prompt

| Ref | SHA / status |
|---|---|
| `app` | `262e9b92dc824f2a926a1f0ea6e4006776ffad4c`; dokumen sahaja |
| `main-digitalized` | `ef697c86a5bfdf5a5658c3df92bce1d7f3f88652`; source Digital v2.9.0 / modul v1.6.1 |
| `main` | `25836eb1a6f24459aace8a3980ae880a13e3b488`; firmware v2.0.2 |
| Auth provider candidate | `digitalized-utility-auth-providers`; audit head semasa sebelum adaptasi |

SHA ini rekod penyediaan, bukan pin wajib untuk pelaksanaan masa depan.
Offline, CRUD dan scaling sudah disatukan dalam **source** Digital yang diperiksa.
Source provider Google/phone berada pada branch tersendiri ketika diperiksa;
status hosted mesti diperiksa semula. Jangan membina semula web offline atau
menjalankan migration production sebagai kesan sampingan kerja Flutter.

Arkib [pakej v1.0.0](../geomath-app/README.md) kekal byte-identical.
[Pelan empat chat](../superpowers/plans/2026-11-04-geomath-flutter-four-chats.md)
merekodkan pemilikan dan pintu penerimaan pelaksanaan.
