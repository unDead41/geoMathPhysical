# Pemisahan repository GeoMath

Berkuat kuasa 6 November 2026.

| Projek | Repository | Lokasi sumber utama |
| --- | --- | --- |
| Physical | [geoMathPhysical](https://github.com/unDead41/geoMathPhysical) | `main/`, `src/`, PlatformIO, wiring, tutorial dan cetakan |
| Digital | [geoMathDigital](https://github.com/unDead41/geoMathDigital) | `digital/` dan `supabase/` pada branch `main` |
| App | [geoMathApp](https://github.com/unDead41/geoMathApp) | `apps/geomath_flutter/` pada branch `main` |

Setiap repository mempunyai AGENTS, README dan semakan pemilikan fail sendiri.
Binaan dan ujian biasa tidak memerlukan checkout repository platform lain.
App membawa aset pembelajaran offline sendiri; backend bersama dimiliki Digital
dan digunakan melalui kontrak API.

Sejarah branch ditapis mengikut platform. App menggabungkan UI/UX dan Lawan AI
daripada dua head yang berbeza. Fail sumber kekal pada laluan asal supaya
kontrak, pembinaan dan ujian sedia ada masih sah.

## Sejarah dan branch lama

`docs/archive/repository-split-20261106/sources.json` menyimpan semua nama branch dan SHA asal sebelum
pemisahan. `docs/archive/repository-split-20261106/receipt.json` dalam repository App/Digital menyimpan
padanan SHA sejarah yang ditapis. Branch `source/main-digitalized` di Digital
ialah sejarah sumber; `main-digitalized` sedia ada dikekalkan sebagai snapshot
Pages. Kerja baharu Digital bermula daripada `geoMathDigital/main`.

Workflow pemisahan asal (sudah selesai dan dikeluarkan) menyemak semua branch sasaran,
menyimpan setiap commit asal sebagai parent kepada commit arkib bertree Physical,
dan mencipta tag `archive/mixed-before-20261106` sebelum mengeluarkan branch
Digital/App daripada senarai branch aktif Physical. Setiap pengeluaran
menggunakan lease SHA tepat supaya kerja serentak tidak dipadam. Sejarah asal
kekal boleh dipulihkan melalui tag dan manifest, tanpa force-rewrite sejarah.

Untuk membaca sumber asal, gunakan SHA daripada manifest:

```powershell
git fetch origin tag archive/mixed-before-20261106
git show <SHA-daripada-migration-sources.json>:<laluan-fail-asal>
```

Gunakan clone berasingan untuk kerja seterusnya. Jangan merge tree monorepo
lama ke dalam mana-mana repository baharu. Rujukan SHA canonical dan laporan
ujian sejarah kekal sebagai provenance asal, bukan arahan lokasi pembangunan.

Cleanup Physical seterusnya menyatukan semua branch sumber pada `main`.
Sejarah sharing dan audio asal dipelihara melalui `archive/physical-before-cleanup-20261106`;
manifest, senarai fail dan bukti pengesahan tersedia dalam `docs/maintenance/CLEANUP.json`.
