# Prompt sambung pembangunan GeoMath App

Salin blok berikut apabila benar-benar bersedia. Ia memulakan kerja berpandukan
source terkini, bukan menganggap semua branch lama sudah digabung.

```text
Projek: GeoMath App berasaskan GeoDecoder Digital.
Repository: https://github.com/unDead41/geodecoder
Platform diminta: Flutter.
Cadangan awal untuk dinilai: Android dahulu, native Flutter + modul geometri
JavaScript setempat melalui WebView.
Branch kerja cadangan: app/flutter-foundation.

Baca pakej docs/geomath-app/ dahulu: README.md, AGENTS.md, SOR.md,
SOURCES_AND_STATUS.md, ARCHITECTURE.md, DESIGN_SYSTEM.md, UX_CONTRACT.md,
SCREEN_CATALOG.md, DATA_BACKEND_CONTRACT.md, OFFLINE_SYNC.md, TEST_PLAN.md
dan docs/superpowers/plans/2026-11-04-geomath-flutter.md di dalam pakej itu.

Semak remote, working tree dan SHA sebenar. Gunakan worktree sendiri.
Dokumen merekod main-digitalized 391df985eea4fee15d9859e678068b1a3f613cba
sebagai snapshot 4 Nov 2026 sahaja; guna asas integrasi terkini yang telah
disahkan. Semak kerja offline-sync, classroom-crud, backend-scaling,
UI shell, Duel dan tiga modul; jangan menganggap nama branch bermaksud merge
atau deployment sudah berlaku. Jangan overwrite composition hooks bersama.

Mulakan Milestone A: source lock, spike modul offline pada telefon, storage/
actor boundary, bridge, design system dan Belajar. Selesaikan pilihan teknikal
rutin sendiri; sahkan pilihan platform/pendekatan yang masih terbuka apabila
ia benar-benar mengubah skop. Jangan cuba menyiapkan semua screen dengan
placeholder atau gambar UI statik.

Gunakan semula source renderer, mesh, formula, parser dan geometri sebenar.
Kekalkan11 model pembelajaran dan 5 model permainan cube/cuboid/pyramid/
cylinder/cone. Beberapa mockup tersilap menunjukkan Prisma dalam game;
ikut source canonical. Kuiz 10, latihan15, R1 bongkah→R2 bentangan, single
attempt dan +1 pair kekal. Duel protocol 2 server-authoritative; tiada offline
gameplay kelas/Duel atau pemarkahan daripada klien.

Gunakan warna muka tetap: Atas#F4C95D, Bawah#9B7EDC, Depan#4C8DFF,
Belakang#E9799B, Kiri#42B883, Kanan#F69B45 bagi kubus/kuboid. Warna ikut
stable face ID semasa putaran/lipatan, dengan label. Bentuk melengkung tidak
direka sebagai6 muka. Semua feature reuse theme/widget/layout yang sama.

Jangan mengubah firmware atau production backend, Auth/SMTP, paid plan,
mirror/Pages/store. Jangan push/merge main, main-digitalized, sharing atau
branch lain. Jangan force-push. Sediakan perubahan branch app, ujian dan
handoff untuk disemak; commit/push branch app apabila saya mengarahkannya.

Rekod source/app/SDK/dependency/aset hashes, ujian sebenar, screenshot hasil
kod, telefon yang diuji, batasan dan langkah sambung. Mockup bukan APK atau
bukti telefon. Gunakan HANDOFF_TEMPLATE selepas setiap milestone.
```

Jika pakej berada di lokasi lain, gantikan `docs/geomath-app/` dengan lokasi
sebenar. Nama branch dalam prompt ialah cadangan, bukan branch yang sudah
wujud. Untuk mula Belajar sahaja, kekalkan Milestone A dan tangguhkan B–D.
