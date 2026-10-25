# GeoDecoder Digital — publication branch

> Calon rich text: **digital-richText / v1.3.0**, berasaskan
> `main-digital` pada `71db77c0206de664e50fa57ff57e1825af13f938`.
> Root `index.html` pada branch calon telah dibina semula daripada HTML digital.
> Rekod persediaan v1.2.0 di bawah kekal sebagai sejarah branch penerbitan;
> kerja rich text ini hanya diterbitkan ke `digital-richText`.

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
