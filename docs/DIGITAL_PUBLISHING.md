# GeoDecoder Digital — penerbitan semasa

Destinasi sumber gabungan: **main-digitalized**. Digital **v2.6.0**,
modul **v1.5.0**, firmware **v1.1.3**. Tarikh: 26 Oktober 2026 (Malaysia).

Root `index.html` dan setiap alias HTML digital mesti byte-identik dengan
`digital/artifacts/GeoDecoder_Digital_V2.html`. Jalankan:

```sh
cd digital
npm ci
npm test
npm run build
npm run prepare:pages
npm run check
```

Repository `unDead41/geodecoder` menyimpan sumber, schema dan sejarah firmware.
Repository public `unDead41/geodecoder-digital` ialah mirror frontend sahaja.
Branch penerbitan yang dikehendaki pada kedua-duanya ialah **main-digitalized**.
Jangan menyalin backend, fixture akaun atau key server ke mirror frontend.

URL laman awam: https://undead41.github.io/geodecoder-digital/ .
Perubahan branch sumber tidak mengubah repository mirror atau tetapan Pages
secara automatik. Rekod status sebenar terakhir, sumber beku dan bukti gabungan:
[digital/docs/RELEASE_V2_6.md](../digital/docs/RELEASE_V2_6.md).
Pemetaan nama branch: [BRANCH_ARCHITECTURE.md](../digital/docs/BRANCH_ARCHITECTURE.md).

Migration profile/progress mesti dipasang sebelum frontend cloud baharu.
Tetapan SMTP/redirect email kekal keperluan berasingan. Tiada visibility
repository atau langganan diubah untuk membolehkan Pages.

---

## Rekod sejarah sebelum integrasi ini

# GeoDecoder Digital — publication branch

Branch penerbitan: **main-digital**.
Tarikh persediaan: **26 Oktober 2026 (Malaysia)**.
Versi aplikasi digital: **v1.2.0**. Firmware rujukan kekal **v1.1.3**.

## Sumber keluaran

- Branch sumber BM/BI: `digital-dwi`.
- SHA sumber: `b8f7360fc15cb7b23666b092ade8e1d2058878bb`.
- Asas permainan: `digitalize` v1.1.0 / `55a79849d5007ec53a9b877cd20877c9bf15aa8d`.
- `index.html` di akar branch menggunakan blob yang sama tepat dengan `digital/GeoDecoder_Digital_V1.html`.
- `.nojekyll` mematikan pemprosesan Jekyll; HTML sudah mengandungi semua JS, CSS, soalan dan terjemahan.
- `main-digital` ialah branch penerbitan sahaja. Pembangunan kekal di branch skop masing-masing; semak dan integrasikan perubahan yang diluluskan sebelum menerbitkan semula.

Tiada branch main, sharing, digitalize, digital-dwi atau digitalize-module diubah ketika menyediakan branch penerbitan ini. Versi aplikasi tidak dinaikkan untuk salinan artifak penerbitan yang identik.

## Status GitHub Pages ketika persediaan

GitHub Settings → Pages pada repository ini memaparkan:

> Upgrade or make this repository public to enable Pages

Repository masih **private**, dan Pages belum dapat diaktifkan dengan pelan semasa. Mencipta branch tidak mengaktifkan hosting. Tiada perubahan kepada visibility repository atau langganan dibuat.

Pilihan untuk diterbitkan kemudian:

1. Gunakan pelan GitHub yang menyokong Pages untuk repository private, kemudian pilih sumber di bawah.
2. Terbitkan hanya fail laman dalam repository public khusus untuk Pages, sambil menyimpan repository firmware ini private.
3. Jika pengguna memang mahu keseluruhan repository ini public, ubah visibility secara jelas terlebih dahulu, kemudian pilih sumber di bawah.

Jangan menukar visibility keseluruhan repository hanya untuk menyelesaikan konfigurasi Pages tanpa arahan pengguna.

## Tetapan sumber apabila Pages tersedia

- Settings → Pages → Build and deployment.
- Source: **Deploy from a branch**.
- Branch: **main-digital**.
- Folder: **/(root)**.
- Save; tunggu build/deployment Pages berjaya.
- Gunakan URL sebenar yang GitHub paparkan selepas deployment. Tiada URL laman live disahkan pada masa persediaan ini.

Dokumentasi rasmi: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Kemas kini keluaran seterusnya

Jalankan pada checkout `main-digital` yang bersih selepas perubahan sumber yang diluluskan telah diintegrasikan. Dalam terminal dari akar repo:

```sh
cd digital
npm test
npm run standalone
```

Kemudian jalankan Python dari akar repo untuk menyelaraskan artifak digital dan halaman penerbitan:

```sh
python -c "from pathlib import Path; p=Path('digital/artifacts/GeoDecoder_Digital_V1.html').read_bytes(); Path('digital/GeoDecoder_Digital_V1.html').write_bytes(p); Path('index.html').write_bytes(p); Path('.nojekyll').write_bytes(b'')"
cd digital
npm run check
```

Pastikan SHA sumber, versi dan bukti ujian dikemas kini. Commit/push hanya ke `main-digital`; jangan menerbitkan terus daripada branch pembangunan. Apabila Pages sudah diaktifkan untuk branch ini, push seterusnya ke branch penerbitan akan menggunakan sumber yang dipilih itu.

## Pengesahan

Artifak sumber BM/BI telah lulus 45 ujian dan 8 senario Chrome sebagaimana direkodkan dalam `digital/docs/DWI_VERIFICATION.md`. Persediaan penerbitan menyemak kesamaan byte root index dengan artifak sumber, sintaks HTML/JS setempat dan kemasukan pada URL akar pelayan statik. Ini bukan bukti deployment GitHub Pages; hosting masih disekat seperti status di atas.
