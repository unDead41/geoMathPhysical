# Penyatuan reka bentuk modul v1.2.1

Arahan pengguna sudah menetapkan pelaksanaan terus hingga diuji dan dipush.
Skop hanya `digital/module/`, worktree tersendiri. Arahan susulan pengguna memilih
branch baharu `digitalize-module-design`; `digitalize-module` menjadi rujukan baca sahaja.

## Rujukan sebelum perubahan

| Branch | SHA penuh | Versi |
|---|---|---|
| digitalize-module | 931a0150397bfb3fd79ef3c8da6684167d1c6aad | modul 1.2.0 |
| digitalize | 01696af497cd7fca8e299f9c1b8a6407333ce276 | lihat firmware/game berasingan |
| main | a059979d97926b82cafd4aa5cf3fe59da04a55bb | firmware 1.1.3 |
| main-digital | 71db77c0206de664e50fa57ff57e1825af13f938 | rujukan baca sahaja |
| sharing | 01b549a26861ef5f093d4c2c630700de37008d6b | rujukan baca sahaja |

Diambil melalui GitHub connector; Git HTTPS tidak mempunyai credential.
Blob, tree dan commit Git sumber dibina semula dan disahkan melalui hash sebenar
sebelum sparse worktree dibuka. Tiada checkout lain diubah. Baseline: 100/100
ujian modul dan `npm run check` lulus.

## Audit dan pilihan pelaksanaan

| Bahagian | Finding | Tindakan |
|---|---|---|
| Teroka 3D | Label/keterangan 7–11px; toolbar kamera kecil; bantuan menindih kanvas | Minimum 12px untuk metadata, 14px kawalan, 16px isi; bantuan dalam aliran; butang arah nyata |
| Nota | Skala kad/teks berbeza, panel rujukan sticky terlalu panjang | Komponen panel/rumus/contoh bersama, rujukan natural-height |
| Bina bentangan | Butang arah kecil, grid tanpa penunjuk muka dipilih untuk dipindah | Kawalan 44px kecuali sel grid 36px dengan gap; nombor dan border pemilihan |
| Isi padu | Butang Tuang aktif semasa dijeda, dua cara sambung bersaing | Satu pemilik playback; Sambung di toolbar, Tuang dilumpuhkan ketika sesi belum selesai |
| Luas permukaan | Maklum balas/kad pilihan kecil, status pilihan pada warna sahaja | Teks, nombor dan tanda semak; jumlah dan rumus hierarki konsisten |
| Gabungan | Frame auto-fit mengubah skala ketika bercantum | Frame rujukan geometri tetap sepanjang cantum/pisah |
| Semua makmal | Seluruh scene-column sticky melebihi viewport pendek | Sticky hanya desktop tinggi; telefon/tablet natural scroll + Lihat model |
| Gerakan | Pause penerokaan masih membiarkan camera tween bergerak | Bekukan kamera dan kemajuan; resume jelas; token timing bersama |

Tampalan CSS di hujung akan mengekalkan pertindihan dan tidak menyelesaikan sumber
utama. Penulisan semula geometri pula menambah risiko matematik. Pilihan pelaksana:
pusatkan token, ikon dan primitif; migrasikan stylesheet modul dan baiki lifecycle
yang dibuktikan ujian. Identiti, kandungan, bank, rumus dan geometri dipelihara.

## Pelan kerja dan pengesahan

1. Simpan screenshot asal Teroka, Nota dan Makmal, termasuk iframe 320px.
2. Tambah regresi bagi pause kamera, status sambung, konflik tuangan dan framing.
3. Satu `design-system.mjs` menjana token CSS dan simbol SVG semasa build.
   `ui.mjs` memiliki pembinaan DOM/ikon bersama. Semua runtime kekal inline.
4. Ganti gaya berulang dengan primitif keadaan bersama, susun semula toolbar,
   teks, panel, keputusan dan breakpoint tanpa mengubah data pembelajaran.
5. Selaraskan DESIGN, UX, manifest, README, changelog dan versi modul 1.2.1.
   Firmware kekal 1.1.3; tidak ada keluaran main dalam skop ini.
6. Build, seluruh ujian modul, check versi/tokens/offline, audit premium, lint
   DESIGN; uji UI sebenar pada desktop, iframe 768/390/320, papan kekunci,
   dropdown terbuka, seretan, slider, jeda/sambung/reset dan reduced motion.
7. Simpan screenshot selepas, bukti dan laporan batasan; commit/push dengan
   parent sumber sebenar dan expected SHA hanya ke digitalize-module-design.

Browser extension tidak boleh mencapai server container localhost. Preview QA
HTTP dalaman melalui `sites-preview` digunakan, tanpa mendaftar/publish Site.
Reduced motion diuji melalui fixture media-query dependency jika emulasi OS
tidak tersedia; laporan mesti membezakan ini daripada perubahan OS sebenar.
