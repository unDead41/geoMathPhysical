# GeoDecoder Digital — GitHub Pages

Laman live: **https://undead41.github.io/geodecoder-digital/**.

## Destinasi penerbitan

- Repository laman: `https://github.com/unDead41/geodecoder-digital` (public).
- Branch: `main-digital`; source Pages: Deploy from a branch, `/(root)`.
- Keluaran aplikasi: **v2.1.0**.
- Commit penerbitan: `143ec89a8d734bb3bda122181ac4ab77af399cbf`.
- Build/deployment: https://github.com/unDead41/geodecoder-digital/actions/runs/40223379362 — completed/success.
- HTTPS diwajibkan oleh GitHub untuk domain lalai.

Repository `unDead41/geodecoder` asal kekal private. Branch `main-digital` dalam repository asal ialah persediaan lama yang berasingan; ia bukan source Pages untuk URL live di atas. Jangan ubah visibility repository asal untuk mengemas kini laman ini.

## Sumber keluaran

Artifak v2.1.0 berasal daripada `unDead41/geodecoder`, branch `digitalize`, commit `5e2474ad164555e491fd6640b2506fd71db1f8da`. `index.html` awam ialah salinan byte yang sama dengan `digital/GeoDecoder_Digital_V2.html` pada sumber tersebut.

SHA256 HTML: `5222e2b1902ea612f0bc31d34ccef3c8bb9bf68b59629428000fd4d9be37755e`.

Repository penerbitan hanya mengandungi empat fail: `index.html`, `.nojekyll`, `README.md` dan `release.json`. Ia tidak membawa firmware, skema database, rekod pengguna atau credential server. Publishable key frontend ialah konfigurasi awam; service-role key kekal di persekitaran Edge Function.

## Semakan sebenar

GitHub Settings memaparkan Your site is live at URL di atas. Laman dibuka menggunakan Chrome pada URL HTTPS sebenar: Home v2.1.0 dipaparkan, Guest membuka borang tempatan, permainan bermula dan satu pasangan betul menghasilkan 1 markah. Keluar kembali ke Home berjaya. Akaun & kelas membuka borang log masuk. Tiada credential pengguna dimasukkan atau pendaftaran pengguna sebenar diuji melalui browser pada penerbitan ini.

Suite tempatan 47/47 dan pemeriksa HTML/aset/ARIA lulus semula pada sesi penerbitan. Console Chrome turut melaporkan mesej asynchronous listener/message channel closed; punca mesej itu belum diasingkan. Aliran Guest dan skor yang dinyatakan di atas tetap berjaya; laporan ini tidak mendakwa console bersih.

## Kemas kini laman

1. Integrasikan dan uji perubahan sumber yang telah diluluskan pada branch kerja yang betul.
2. Dari folder `digital`, jalankan `npm ci`, `npm test`, `npm run build` dan `npm run check`.
3. Sediakan `index.html` daripada artifak `artifacts/GeoDecoder_Digital_V2.html`; selaraskan versi, SHA sumber dan hash pada `release.json`.
4. Commit/push empat fail frontend sahaja ke **repository laman** `unDead41/geodecoder-digital`, branch `main-digital`. Pages menerbitkan push pada branch itu secara automatik.
5. Tunggu workflow Pages completed/success dan semak URL live, versi, Guest serta entry akaun.

Push ke `digitalize` dalam repository asal sahaja tidak menyegerakkan repository laman secara automatik. Tiada token atau credential baharu diwujudkan untuk cross-repository automation pada penerbitan ini.

Pembukaan URL laman memerlukan Internet. Latihan setempat boleh menggunakan fail HTML yang dimuat turun; akaun/room sentiasa memerlukan Internet. Supabase Free mempunyai kuota dan boleh dijeda apabila aktiviti rendah.
