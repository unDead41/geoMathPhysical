# Serahan GeoMath Modul 2 — makmal interaktif

Branch `digitalized-module-labs-ui-refresh` melaksanakan skrin konsep 29–33 menggunakan pengawal aktiviti dan geometri sedia ada. Tiada perubahan backend, auth atau storan.

| Rujukan | Nilai |
|---|---|
| Asas `main-digitalized` | `391df985eea4fee15d9859e678068b1a3f613cba` |
| Konsep `ui/ux-redesign-concept` | `4d83561667cf74fbe5cd6144ce5e3e7f660a75cd` |
| Commit pelaksanaan | `ed4ecd74cc0559d664e3de5f5220509183c468df` |
| Versi dikekalkan untuk integrator | Digital **2.8.0**, modul **1.6.0** |
| Spesifikasi konsep | `digital/docs/uiux-redesign-concept/prompts/03-module-labs-ui-refresh.md` pada SHA konsep |

Hab kini mempunyai empat kad dengan pratonton mesh sebenar dan status refleksi daripada rekod aktiviti. Ruang kerja menggunakan kanvas, playback, kamera, kawalan dan mod lanjutan asal; refleksi disusun sebagai Ramalkan → Cuba → Semak → Terangkan di bawah eksperimen. Navigasi hab menjeda gerakan dan mengekalkan pose, draf serta sejarah. Pautan Pelan & Dongakan dan Semakan Pengiraan menggunakan navigasi modul asal.

Perubahan sumber terhad kepada `digital/module/src/index.html`, `labs.mjs`, `style.css` dan `net-tools.css`. CSS baharu menggunakan token pusat dan skop `#labs-panel`; blok `UX-REDESIGN:LABS` menempatkan gaya utama. Kontrak SVG/mm dan CSS cetakan A4 dikekalkan. Tiada perubahan `app.mjs`, formula, controller geometri atau modul lain. Rekod kekal refleksi formatif dalam sesi, bukan gred TP.

## Pengesahan

Arahan di bawah dijalankan dari root repo; hasil log disimpan dalam direktori [evidence](evidence/).

| Arahan/semakan | Hasil sebenar |
|---|---|
| `npm --prefix digital/module test` | **333/333 lulus**, 0 gagal; asas 328/328 dan lima ujian regresi baharu. [tests.tap](evidence/tests.tap) |
| `npm --prefix digital/module run build` | Lulus; standalone 494,707 bait, lengkap sendiri. [build.log](evidence/build.log) |
| `npm --prefix digital/module run check` | Lulus: sintaks, ID, tiada kebergantungan/network/storage runtime, reduced motion, versi, token, ikon dan kontras. [check.log](evidence/check.log) |
| `npm --prefix digital run design:check` | Lulus: adapter portal/modul sepadan dengan token pusat. [design-check.log](evidence/design-check.log) |
| Browser `Run all checks` | **202/202 lulus pada sumber akhir**, selepas playback dikembalikan ke atas kanvas: 107 fungsi + 5 input + 90 paparan. [browser-summary.json](evidence/browser-summary.json) |
| Audit premium `--mode strict` | **Tidak lulus**: 95 ralat `affordance.actionless-button`, berbanding 90 pada asas. [premium-audit.json](evidence/premium-audit.json) |

Lima ujian baharu dalam `digital/module/tests/labs-ui-refresh.test.mjs` meliputi kembali ke hab tanpa autoplay/kehilangan pose, mod lanjutan dan sejarah, gate refleksi/retry, perubahan bahasa tanpa kehilangan draf, serta navigasi ke aktiviti lain. Browser turut menguji bentangan siap/editor/studio dan sekatan cetakan tidak sah, 11 bongkah isi padu, pecahan isipadu, pindahan/limpahan, tuangan, permukaan/bekas/rongga dan kedua-dua gabungan. Matriks paparan merangkumi 1440/390 px, BM/EN, cerah/gelap, teks 100/150%; 10 kes tambahan menggunakan teks 125% dan kontras kuat.

Scanner statik tidak mengesan binding pengawal dalam fail luaran; binding sebenar dan tindakan baharu telah disemak melalui sumber serta ujian. Ini menjelaskan dapatan yang diperiksa, tetapi keputusan audit strict tetap gagal dan tidak boleh dilaporkan sebagai lulus. Ulang menggunakan:

```sh
python "$PREMIUM_SKILL_ROOT/scripts/audit_project.py" digital/module --mode strict --output digital/docs/handoffs/digitalized-module-labs-ui-refresh/evidence/premium-audit.json
```

`PREMIUM_SKILL_ROOT` ialah direktori pemasangan kemahiran audit premium yang tersedia pada mesin penguji.

## Bukti visual dan ulangan browser

Enam tangkapan ialah paparan browser sebenar:

| Paparan | Bukti |
|---|---|
| 29 · Bentangan, 1440 px | [29-net-1440.jpg](evidence/screenshots/29-net-1440.jpg) |
| 30 · Isi padu, 1440 px | [30-volume-1440.jpg](evidence/screenshots/30-volume-1440.jpg) |
| 31 · Luas permukaan, 1440 px | [31-area-1440.jpg](evidence/screenshots/31-area-1440.jpg) |
| 32 · Gabungan, 1440 px | [32-composite-1440.jpg](evidence/screenshots/32-composite-1440.jpg) |
| 33 · Hab, 1440 px | [33-hub-1440.jpg](evidence/screenshots/33-hub-1440.jpg) |
| 390 px · EN, gelap, teks 150% | [390-en-dark-150.jpg](evidence/screenshots/390-en-dark-150.jpg) |

Selepas build, hidangkan root `digital/` melalui HTTP dan buka `/module/tools/labs-ui-qa.html`; pilih **Run all checks**, kemudian **Download evidence JSON**. Contoh pelayan dari root repo: `python -m http.server 4173 --directory digital`. Fixture memerlukan `dist/module-frame.mjs`, maka pelayan `npm run qa` yang berskop `module/` tidak mencukupi. Sesi pengesahan menggunakan staging `sites-preview` dan iframe `srcdoc` bagi standalone sebenar.

Had bukti: sentuhan ialah `PointerEvent` sintetik; reduced motion menggunakan tetapan host; cetakan memintas `window.print` dan memeriksa SVG/mm. Tiada bukti peranti fizikal, tetapan aksesibiliti OS, dialog cetak sebenar atau output PDF/kertas. Pemeriksaan sasaran 44 px mengecualikan petak grid bentangan dan checkbox; matriks reflow menggunakan keadaan/mod aktiviti semasa, bukan semua kombinasi submod. Assertion browser “starts with a hub” turut menerima workspace yang kelihatan; ujian unit mengesahkan keadaan hab awal dengan lebih ketat. [manifest.json](evidence/manifest.json) mengikat hash sumber, binaan sementara dan tangkapan; manifest dijana semula selepas sumber dan screenshot akhir. Hash standalone QA ialah `0ab0cdf903168e33f28dcd574bd178bd0aa557052bcbd5a99c890cd47aed035b`. Ringkasan JSON merekod keputusan yang dibaca terus daripada laporan halaman; fail eksport mentah gagal disegerakkan keluar daripada persekitaran pelayar. Fixture menyediakan laporan penuh yang boleh diulang.

## Tindakan integrator

Tiada hook aplikasi atau build tambahan diperlukan. Gabungkan sumber bersama perubahan branch lain, kekalkan modul lain, kemudian bina semula standalone/parent, kemas kini pin vendor dan nombor keluaran gabungan, serta jalankan semula semakan modul dan suite parent yang terkesan. `GeoDecoder_Modul_V1.html` yang dijana untuk QA, bundle parent dan pin vendor tidak termasuk dalam commit cabang ini. Jangan gunakan hash binaan sementara sebagai pin keluaran gabungan.

Commit pelaksanaan di atas mengandungi enam fail kod/ujian/fixture. Commit serahan selepasnya menambah dokumen, log, manifest dan screenshot sahaja. Worktree khusus ialah `geodecoder-labs`. Push dihadkan kepada `digitalized-module-labs-ui-refresh`; tiada merge atau penerbitan Pages.
