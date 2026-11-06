# GeoMath Physical — pakej Windows

Pakej ini dijana daripada satu sumber `main` dalam `unDead41/geoMathPhysical`.
`package.json` merekodkan SHA sumber, versi firmware dan checksum setiap fail.

Extract All ZIP ke folder biasa. Buka PowerShell dalam folder pakej, kemudian:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
```

Setup menyediakan dependency rasmi, VS Code/PlatformIO, folder kerja dan build;
ia tidak melakukan upload atau full-flash erase. Pilih COM komputer sendiri,
kemudian gunakan task Build, Upload dan Monitor. Satu environment ialah `esp32dev-rgb`.
Pin dan arahan: `SAMBUNGAN.md`, `COMMANDS.md`, `docs/GAME_FLOW_RGB.md`.
Panduan A-Z ialah edisi sejarah; ikut flow semasa dan PDF cara bermain murid.
PDF cetakan mesti dicetak Actual size / 100%. Pendaftaran kad dalam NVS tidak dipadam oleh pull/build.
