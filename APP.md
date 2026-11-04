# GeoMath / GeoDecoder — cadangan app Flutter

**Status: future improvement · perancangan sahaja.**
Branch simpanan: **`app`**. Versi pakej dokumen: **1.0.0**.
Tarikh penerbitan dokumentasi: **4 November 2026, Asia/Kuala_Lumpur**.

Ijamm meminta pakej SOR, Markdown dan mockup disimpan dalam branch `app`
untuk pembangunan kemudian. Penerbitan ini menambah dokumentasi dan aset;
projek Flutter serta APK belum dibina.

## Bahan untuk menyambung nanti

| Bahan | Rujukan |
|---|---|
| Indeks penuh dan 12 papan mockup / 48 paparan | [README pakej](docs/geomath-app/README.md) |
| SOR dan syarat penerimaan | [SOR.md](docs/geomath-app/SOR.md) |
| Cadangan Flutter dan pemilikan data | [ARCHITECTURE.md](docs/geomath-app/ARCHITECTURE.md) |
| Aliran UI/UX serta keadaan ralat | [UX_CONTRACT.md](docs/geomath-app/UX_CONTRACT.md) |
| Warna muka bongkah dan komponen | [DESIGN_SYSTEM.md](docs/geomath-app/DESIGN_SYSTEM.md) |
| Pemetaan semua paparan | [SCREEN_CATALOG.md](docs/geomath-app/SCREEN_CATALOG.md) |
| Pelan pembangunan berperingkat | [Pelan Flutter](docs/geomath-app/docs/superpowers/plans/2026-11-04-geomath-flutter.md) |
| Prompt mula semula | [RESUME_PROMPT.md](docs/geomath-app/RESUME_PROMPT.md) |
| Pengesahan dan ujian yang diperlukan | [TEST_PLAN.md](docs/geomath-app/TEST_PLAN.md) |

## Asas branch dan snapshot dokumen

Branch `app` diterbitkan daripada `main-digitalized` pada commit
`ef697c86a5bfdf5a5658c3df92bce1d7f3f88652`.
Tree sumber: `56501d7b07124e65b24e9dd9b9929b35e40e681b`.
Semak [rekod integrasi Digital](digital/docs/integration-sync/README.md)
dan [resit branch](digital/docs/integration-sync/REMOTE_RECEIPT.json)
apabila memilih asas pembangunan sebenar.

Pakej dalam `docs/geomath-app/` dikekalkan sama seperti arkib v1.0.0 yang telah
disediakan. `SOURCES_AND_STATUS.md` dan `source_baseline.json` di dalamnya ialah
**snapshot lebih awal**, termasuk `main-digitalized` pada
`391df985eea4fee15d9859e678068b1a3f613cba`. Status candidate/ahead/behind di sana
terikat kepada SHA tersebut. Semak remote dan kontrak terkini sebelum kickoff;
jangan memilih kod lama atau mengulang merge hanya kerana snapshot lama.
Ayat bahawa tiada push dilaksanakan dalam pakej asal merujuk penyediaan arkib;
nota ini merekodkan penerbitan dokumentasinya ke branch `app`.

SHA-256 arkib asal `GeoMath_App_Development_Pack_v1.zip`:
`ac32bbc4993a91e8ab636a004e421961178263202d9fb949dfbdee68e85bce2b`.
Fail ZIP tidak diduplikasi dalam Git kerana kandungannya sudah diekstrak.

## Keputusan dan batas skop

- Flutter ialah pilihan pengguna. Android dahulu dan pendekatan hibrid masih
  cadangan untuk dinilai pada permulaan pembangunan.
- Warna muka bongkah mengikuti ID muka fizikal yang stabil apabila diputar atau
  dibentangkan, dengan label arah untuk perbandingan kiri/kanan/atas/bawah.
- Formula, mesh, parser, bank soalan dan protokol mesti mengikut source canonical.
  Lima bongkah permainan termasuk **Kon**; pembetulan mockup direkodkan dalam
  [SOURCES_AND_STATUS.md](docs/geomath-app/SOURCES_AND_STATUS.md).
- Tiada perubahan runtime, firmware, backend hosted, Auth, mirror atau penerbitan
  store dalam commit dokumentasi ini. Tiada dakwaan app, APK atau ujian telefon siap.
- `main` firmware dibaca pada `25836eb1a6f24459aace8a3980ae880a13e3b488`, v2.0.2.
  Salinan firmware yang diwarisi daripada asas Digital masih berlabel v1.1.3;
  branch perancangan app ini tidak menaikkan atau menyelaraskan keluaran firmware.

## Semakan dan langkah seterusnya

Semak pakej dengan:

```text
python docs/geomath-app/tools/validate_docs.py
python tools/check_version.py
git diff --check
```

Validator pakej menyemak hash, pautan dalaman, 48 ID paparan, 16 keadaan tambahan,
37 keperluan SOR serta palet muka. Checker versi hanya menyemak konsistensi
firmware/README/CHANGELOG yang diwarisi pada branch ini.
Ujian Flutter, emulator, telefon, firmware dan backend tidak dijalankan untuk
penerbitan dokumen ini.

Apabila pembangunan diminta kemudian, baca SOR, semak branch/SHA semasa dan
gunakan worktree sendiri. Mulakan dengan spike modul geometri offline pada
telefon, kemudian ikut pelan pelaksanaan. Arahan push dokumentasi sekarang
tidak memulakan pembangunan atau deployment app.
