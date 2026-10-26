> Laporan sejarah branch asal. Integrasi semasa, syarat deployment dan bukti
> gabungan v2.6.0: [RELEASE_V2_6.md](RELEASE_V2_6.md).

# Tetapan seragam permainan dan modul — v2.5.0

Tarikh26 Oktober2026, Malaysia. Serahan hanya digitalize-ease-of-use.
Arahan pengguna: sambungkan bahasa, saiz teks dan pilihan animasi supaya murid
terus menggunakan pilihan yang sama apabila membuka modul.

## Asas dan skop

| Rujukan | SHA penuh |
|---|---|
| digitalize terkini, platform v2.3.0 | adc51627eaaace5d9543c7e033d2994986c8715d |
| Branch ease sebelum perubahan ini, v2.4.0 | db5acf197175bc4d517bdf2e9c5338a9c9dff468 |
| Parent sebenar branch ease | adc51627eaaace5d9543c7e033d2994986c8715d |
| Firmware main v1.1.3 | a059979d97926b82cafd4aa5cf3fe59da04a55bb |
| Modul sumber v1.2.0 | 931a0150397bfb3fd79ef3c8da6684167d1c6aad |
| Blob modul sumber dipinkan | 5f58d2df981c7a21cc063a4958e898a46b6134fe |

Branch sedia ada disambung kerana ia bermula pada SHA digitalize yang sama
seperti ref terkini dan sudah mempunyai dialog Tetapan utama. Fail vendor,
formula, ID, bank, enjin permainan, SQL/backend, audio dan branch modul
kekal terpelihara. Tiada penerbitan Pages atau deployment backend.

Pembetulan audit: pin modul1.2.0 sebenarnya mempunyai kandungan BM sahaja,
bukan pemilih bahasa sendiri seperti dokumentasi lama menyatakan. Penyesuai
bahasa kini menyediakan paparan English tanpa menukar kod geometri asal.

## Tingkah laku pengguna

- Tetapan utama menjadi satu pemilik BM/English, teks100/125/150% dan pilihan
  gerakan hiasan. Tiada kunci storan modul kedua.
- Nilai semasa dibekalkan sebelum modul dimulakan. Tukar tetapan semasa modul
  terbuka terus mengemas kini dokumen yang sama, tanpa menetapkan semula srcdoc.
- Butang Tetapan dalam modul membuka dialog utama yang sama. Pilihan asal
  bahasa/paparan kekal apabila kembali ke permainan atau selepas refresh.
- Bongkah, tab, pandangan, kamera, label, peratus bentangan, ukuran nota dan
  aktiviti makmal dikekalkan. Bentuk dan ukuran geometri tidak diskalakan oleh
  pilihan saiz teks.
- Pilihan gerakan menggabungkan tetapan pengguna dengan prefers-reduced-motion.
  Mengaktifkannya menghentikan putaran/animasi semasa dan peralihan hiasan;
  mematikannya tidak memulakan gerakan semula secara automatik. Peluncur dan
  Main yang ditekan sengaja untuk animasi pembelajaran kekal tersedia.
- English meliputi penerokaan, nota/pengiraan, empat makmal, bantuan, status,
  label aksesibiliti dan teks kanvas. Bahasa boleh ditukar kembali kepada BM.
  Simbol formula dan nilai ukuran kekal sama dengan legenda istilah setempat.
- Jika storan disekat, pilihan masih digunakan dalam sesi tanpa menghalang modul.

## Kontrak integrasi

`dist/module-settings.mjs` mengurus lifecycle dan mesej iframe. `open(html)`
menjana instance ID baharu dan menyediakan srcdoc; `sync()` menghantar tetapan
semasa; `clear()` membatalkan ID dan membuang dokumen lama.

Channel `geodecoder.module.preferences`, version1:

```json
{
  "channel": "geodecoder.module.preferences",
  "version": 1,
  "instanceId": "one-frame-instance",
  "type": "settings",
  "settings": {"language": "en", "textSize": 150, "motionPaused": true}
}
```

Parent menerima `ready` dan `open-settings` sahaja daripada contentWindow
iframe semasa, origin null dan instance ID yang sama. Child menerima settings
hanya daripada window.parent dengan channel/version/instance yang betul.
Payload mesti mempunyai tepat tiga medan dengan nilai ms/en,100/125/150 dan
boolean. Mesej tidak membawa token, profil, jawapan atau kod untuk dijalankan.
TargetOrigin* diperlukan untuk opaque-origin srcdoc; identiti source dan
instance menghalang dokumen lama atau tetingkap lain mengawal dialog.
Load dan ready menyegerakkan pilihan terkini jika ia berubah ketika startup.

`dist/module-frame.mjs` mengubah pin yang disahkan hanya dalam memori: kekalkan
pautan about:srcdoc, skala font CSS, pasang proxy pilihan gerakan dan sambungkan
adapter selepas runtime asal siap. Source hooks diperiksa unik dan gagal jelas
jika pin lain tidak lagi sepadan. Fail vendor asal dan provenance tidak ditulis.
Native module API boleh menggantikan hooks ini apabila pin baharu diintegrasi.

`dist/module-language.mjs` diserialisasikan bersama kamus tempatan
`dist/module-copy.mjs`. Teks/atribut menyimpan sumber canonical melalui WeakMap;
MutationObserver mengemas kini teks runtime tanpa merender semula form/aktiviti.
ID, value input/select, script, style dan formula tidak diterjemah. Kanvas
menterjemah teks semasa draw dan dilukis semula selepas pertukaran bahasa.

## Rujukan istilah

Istilah menggunakan glosari BM/BI sedia ada. Salinan buku teks yang dimuat naik
pengguna turut disemak pada bahagian relevan sahaja:

- Matematik Tingkatan2 KSSM / Mathematics Form2 KSSM, Bab6: halaman bercetak
  98–103, PDF54–56; sifat bongkah, puncak/apex, permukaan melengkung/curved surface
  dan bentangan/nets.
- Mathematics Form3 KSSM, Bab7, halaman bercetak182, PDF192: plan ialah
  unjuran ortogon atas; elevations ialah unjuran pada satah tegak.

Dokumen sokongan ini tidak menyalin semula buku atau menukar bank asal.
Paparan bahasa tidak menukar unjuran perspektif menjadi dakwaan pelan/dongakan.

## Pengesahan

Baseline sebelum perubahan139/139 unit PASS. Browser RED membuktikan parent
English150%/jeda masih membuka childBM. Selepas integrasi:

| Semakan | Keputusan |
|---|---|
| Suite unit lengkap | 147/147 PASS, sifar gagal |
| Startup/live | Bahasa, teks dan animasi sampai sebelum interaksi; dokumen/srcdoc yang sama; bongkah, label, kamera dan bentangan dikekalkan |
| Nota dan empat makmal | Ukuran7.5, ralat, grid/bentangan650, kiub unit3, pilihan permukaan dan gabungan580 dikekalkan melalui pertukaran BM/English |
| Susun atur | 108 semakan: BM/English ×100/125/150 ×1365/390/320px × Teroka, Nota dan empat Makmal |
| Kebolehbacaan320px150% | Perkataan dan nombor01–04 tidak terpecah; regresi Range sebelum pembaikan RED, kemudian GREEN |
| Liputan English | Lima bongkah × Teroka/Nota, empat makmal, maklum balas dan dua mod tuangan; semakan baki istilah BM PASS |
| Pemulihan pilihan | Refresh mengekalkan bahasa/teks/animasi; storan disekat masih berfungsi dalam sesi |
| Offline | HTML setempat + modul lengkap, sifar permintaan HTTP dalam senario diuji |
| Gerakan peranti/pengguna | Putaran berhenti apabila dikurangkan; mematikan pengurangan tidak memulakan semula putaran |
| Sempadan mesej | Tetingkap asing, versi/instance lama dan mesej daripada child sendiri diabaikan |
| Keadaan permainan | Pilihan/susunan kad, R1 diterima, kemajuan dan skor sama selepas pertukaran tetapan |
| Binaan/SOR | Checker144 ID unik, ARIA/aset/bank; empat HTML byte-identik; firmware1.1.3 selaras |
| Integriti sumber | 15 hash platform/vendor/firmware dilindungi kekal sama |

Lapan kes pelayar bebas, metadata binaan dan hash paparan:
[manifest QA](settings-sync-evidence/browser-review.json) dan [log8/8](settings-sync-evidence/browser.log).

- [English desktop150%](settings-sync-evidence/module-en-desktop-150.png).
- [Dialog Tetapan yang sama pada telefon](settings-sync-evidence/shared-settings-en-mobile-150.png).
- [Nota BM390px125%](settings-sync-evidence/module-notes-bm-390-125.png).
- [Makmal English320px150%](settings-sync-evidence/module-lab-en-320-150.png).
- [Bongkah gabungan English](settings-sync-evidence/module-composite-en-desktop.png).
- [Log unit](settings-sync-evidence/unit.log), [smoke dan kebolehbacaan](settings-sync-evidence/startup-readability.log), [canonical DOM](settings-sync-evidence/language-dom.log).

Penemuan material dibetulkan: metrik English memerlukan singular/plural
mengikut bilangan; beberapa sublabel/ralat belum lengkap; layout dua lajur
memecahkan perkataan/nombor pada320px150%. Kesemuanya mempunyai bukti RED→GREEN.
Kamus akhir581 pasangan istilah/frasa disertakan bersama aplikasi.

Skrip QA juga diperbetulkan supaya menunggu penghantaran postMessage sebelum
menyemak dialog. Paparan akhir menggunakan tangkapan viewport sebenar;
tangkapan full-page Chromium mengubah viewport sementara untuk iframe berasaskan
vh dan menghasilkan artefak offscreen. Tiada CSS produk digunakan untuk
menyembunyikan pautan skip atau mencantikkan tangkapan.

Telefon menggunakan emulasi Chromium; Safari/Firefox dan telefon fizikal belum
disahkan. Modul baharu pada branch modul tidak digabungkan secara automatik.
Pelan modul, pengiraan dan peraturan Duel/classroom tidak berubah oleh kerja ini.
