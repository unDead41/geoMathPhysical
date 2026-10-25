# GeoDecoder Duel — kontrak pelaksanaan

Permintaan: dua murid berlawan melalui PIN enam digit yang dikongsi oleh
pencipta bilik. Branch `digital-richText`, asas
`bb2ae034276d5c4e224fd78aaf20d8bb8710ff3b` (digital v1.4.0).
Versi digital v1.5.0. `main` kekal firmware v1.1.3 pada
`a059979d97926b82cafd4aa5cf3fe59da04a55bb`.

## Pengalaman pemain

Pilih Duel pada borang mula, isi nama/kelas, kemudian cipta bilik atau masukkan
PIN kawan. Setiap bilik menerima dua pemain. Kedua-duanya menekan Sedia; kira
detik tiga saat menggunakan jam pelayan. Kedua-duanya menerima sepuluh ID soalan
yang sama dalam susunan sama, dua bagi setiap bongkah. Bahasa kekal pilihan
setiap pemain. Hint, satu percubaan R1→R2 dan semakan selepas salah/langkau kekal.

Markah disahkan pelayan daripada imbasan, bukan skor yang dihantar pelayar.
Markah lebih tinggi menang; jika sama, masa pelayan hingga jawapan terakhir
lebih singkat menang. Seri jika kedua-dua nilai sama. Masa duel terus berjalan
semasa dialog, tab tersembunyi atau gangguan sambungan. Menyerah kalah memberi
kemenangan kepada lawan; keputusan tidak diumumkan hanya daripada kemajuan
semasa. Had perlawanan 15 minit. PIN lobi sah 10 minit. Akses sesi luput selepas
24 jam; ini bukan janji pemadaman fizikal tepat pada jam ke-24. Pembersihan
berperingkat berlaku apabila ada permintaan, sehingga 20 bilik dan 100 bucket
had kadar setiap permintaan. Tiada cron ditetapkan. Polling sekitar dua saat
ditambah latensi rangkaian memaparkan kemajuan lawan.

Kuiz/latihan offline kekal; hanya mod Duel menghubungi pelayan. Tiada kata
laluan atau kunci berkeistimewaan dimasukkan ke HTML. Duel tidak masuk papan
skor kuiz. Alias pemain sahaja dihantar; kelas/kategori tidak dihantar.

## Sempadan backend

Projek Supabase sedia ada: GeoDecoder Digital (`fkrlwzxvyufndavlpzbp`). Fungsi
`geodecoder-auth` v2 dan schema `private`/kelas/akaun tidak diubah. Kerja ini
menambah schema `geodecoder_duel`, fungsi RPC public berawalan tersendiri yang
hanya boleh dilaksanakan `service_role`, dan Edge Function baharu
`geodecoder-duel`. Jadual private tidak diberi akses anon/authenticated.
Endpoint mengekalkan `verify_jwt=true` pada platform dan menerima publishable
project key pada header `apikey` mengikut dokumentasi Supabase semasa. Kunci
publishable ini memang untuk klien awam; ia bukan identiti/pengesahan pemain.
Pengesahan ahli duel menggunakan token pemain 256 bit, hash sahaja disimpan di DB.

Keempat-empat jadual mengaktifkan dan memaksa RLS tanpa polisi awam, dengan
grants hanya kepada service_role. RPC `public.geodecoder_duel_gateway(jsonb)`
menggunakan SECURITY INVOKER dan search_path tetap. Cap global create 120/minit
dan join 300/minit tidak bergantung pada token atau alamat pemain. Bucket token
dan fingerprint sumber melengkapkan cap itu. Fingerprint sumber ialah HMAC
best effort; asal forwarding header belum disahkan, maka ia tidak dianggap
sebagai perlindungan anti-spoof yang terbukti.

SessionStorage menggunakan kunci `geodecoder.digital.duel.v1.session` untuk
token, ID bilik dan operasi yang belum mendapat pengesahan. Token tidak dihantar
kepada lawan. Jika storan ini disekat, perlawanan semasa masih boleh digunakan
dalam memori tetapi pemulihan selepas reload tidak dijanjikan. Token yang
luput/tidak sah boleh dikosongkan melalui tindakan Duel Baharu. Tiada panggilan
API apabila pemain hanya menggunakan kuiz atau latihan.

## API v1 (beku untuk backend dan klien)

POST JSON ke `/functions/v1/geodecoder-duel`. Setiap permintaan mempunyai
`action` dan `token` (64 aksara hex kriptografi milik pemain). CORS menyokong
HTML file offline yang dibuka semasa online, tanpa cookie. Klien menghantar
publishable project key dalam header `apikey`. Endpoint tetap mengesahkan token
pemain sendiri; kunci service_role hanya dibaca dari rahsia Edge.

- `create`: `{action,token,name}`; PIN kriptografi dijana Edge, perlanggaran
  dicuba semula. Token yang sama mengulangi create secara idempoten.
- `join`: `{action,token,name,code}`; code string enam digit. Join berulang
  dengan token sama idempoten. Join kedua sahaja dibenarkan, race dilindungi lock.
- `state`: `{action,token,roomId}`. Tiada seq diperlukan.
- `ready`, `leave`, `hint`, `skip`, `scan`: `{action,token,roomId,seq,...}`.
  Seq monotonik bermula 1; ulang seq terakhir dengan payload sama mesti
  memulangkan hasil asal tanpa menambah markah. Seq sama payload lain ditolak.
  `hint`, `skip`, `scan` turut mempunyai `questionIndex` 0..9.
  `scan` mempunyai `kind:solid|net`, `shape` ID stabil, `target:r1|r2`.
  `ready` mengeset sedia true. `hint` mengira sekali setiap soalan.

Kejayaan ialah snapshot berikut (nombor masa semuanya epoch milisaat/null):

```json
{
  "ok": true,
  "serverNow": 0,
  "room": {"id":"uuid","code":"123456","status":"waiting","startsAt":null,"deadlineAt":null,"questionIds":[],"total":10,"winnerId":null,"reason":null},
  "me": {"id":"uuid","slot":1,"name":"Alias","ready":false,"answered":0,"stage":"solid","score":0,"mistakes":0,"skipped":0,"hints":0,"hintUsed":false,"attempts":{"solid":null,"net":null},"answers":[],"seq":0,"nextReadyAt":null,"lastSeenAt":0,"finishedAt":null,"elapsed":0,"forfeited":false},
  "opponent": null,
  "actionResult": null
}
```

Status bilik: `waiting`, `countdown`, `playing`, `complete`, `cancelled`,
`expired`. `opponent` menggunakan medan ringkasan pemain tanpa `answers`,
`attempts`, `hintUsed` dan `seq`. Kehadiran menggunakan `lastSeenAt` epoch ms.
`actionResult` mempunyai `type` (`solid`, `correct`, `wrong`, `skipped`,
`hint`, `ready`, `left`). Setiap row `me.answers` menggunakan kontrak Game:
`id,shape,topic,outcome,hint,failedAt,attempts,elapsed,firstTry`.

Apabila jawapan diselesaikan, backend menaikkan answered dan menyediakan stage
solid/attempts kosong untuk soalan berikutnya; jawapan terdahulu kekal dalam
answers. Klien menyelesaikan animasi/semakan sebelum bergerak ke soalan itu.
Reload boleh memulihkan snapshot melalui API pemulihan Game yang disemak.
Deadline melengkapkan baki soalan sebagai skipped (sifar markah) dan menentukan
keputusan. Finished elapsed ialah masa dinding sejak startsAt, bukan jam klien.
`nextReadyAt` menegakkan sela 900 ms selepas betul dan 1800 ms selepas salah
atau langkau. Menyerah kalah turut melengkapkan baki sepuluh rekod. Keluar
selepas pemain sudah selesai tidak menukar pemain itu menjadi menyerah kalah.

Ralat: `{ok:false,error:"machine_code"}` dengan status HTTP sesuai. Kod asas:
`invalid_request`, `invalid_token`, `room_unavailable`, `room_full`,
`room_expired`, `not_started`, `question_mismatch`, `stage_mismatch`,
`sequence_mismatch`, `sequence_conflict`, `rate_limited`, `server_error`.
Ralat `not_ready` menandakan sela semakan belum tamat. `pin_collision` hanya
dalaman; Edge mencuba PIN lain dan memulangkan `server_error` jika masih gagal.
Kaedah selain POST/OPTIONS mendapat HTTP 405 dengan `invalid_request`.
RPC dalaman menerima payload dengan `tokenHash` dan fingerprint rate limit
yang ditetapkan Edge; hash/fingerprint/kunci tidak dipulangkan kepada klien.

Klien memberikan sehingga 25 saat untuk setiap permintaan dan mencuba semula
ralat rangkaian/pelayan sekali dengan seq/payload yang sama. Jika hasil masih
tidak pasti, pending disimpan untuk dicuba semula, bukan dianggap sebagai
jawapan baharu. Snapshot lewat tidak boleh mengundurkan seq/jam pelayan.
Jam UI dianggarkan daripada snapshot dan monotonic clock; keputusan akhir
menggunakan masa pelayan. Masa pemenang dipaparkan hingga milisaat.

## Deployment sebenar — 26 Oktober 2026 (Malaysia)

| Perkara | Rekod disahkan |
|---|---|
| Projek | `fkrlwzxvyufndavlpzbp`, GeoDecoder Digital, Singapore |
| Migrasi | `20261025181814_geodecoder_duel_v1` |
| Edge | `geodecoder-duel`, ACTIVE, versi 1 |
| Function ID | `8e38c162-23a7-4a0e-9eb9-d3686ed47233` |
| Gateway JWT | `verify_jwt=true`; publishable key pada `apikey` |
| Deployment SHA-256 | `016f16d82a8657cd65dce7062e2a3f769a8abdd537906c7ecce37cc0f9342c75` |
| Sumber Edge | `backend/functions/geodecoder-duel/index.ts` dan `handler.mjs` |
| Auth asal | `geodecoder-auth` kekal versi 2, SHA-256 `3269f32a72a65f58ea31b6631305682524ebbda8bb364597239eb94cb12b1328` |
| Rutin dilindungi | 17 rutin private/public sedia ada; fingerprint sebelum/selepas `8dcfbc549352dd99a3740bf2f5af4417` sama |

Percubaan deployment awal dengan `verify_jwt=false` ditolak automatic approval
review kerana perubahan sempadan pengesahan awam. Tiada bypass dibuat. Selepas
menyemak dokumentasi rasmi dan inventori fungsi, deployment dengan JWT kekal
aktif serta publishable key diterima dan diuji. Tiada service_role/secret key
disertakan dalam sumber klien atau HTML.

Schema Duel dipasang sebagai migrasi transaksional. Jangan jalankan semula
`schema.sql` pada namespace yang sudah dipasang; perubahan seterusnya memerlukan
migrasi baharu. Kod `private`/kelas, auth dan schema awam sedia ada tidak diubah.
Semakan advisor menambah empat INFO `rls_enabled_no_policy` yang disengajakan
untuk jadual Duel deny-all; anon/authenticated disahkan tidak boleh menggunakan
RPC. Advisor turut melaporkan WARN Auth `auth_leaked_password_protection` di
luar skop Duel. Tetapan Auth tersebut tidak diubah dan perlu disemak pemilik
kerja akaun; ini bukan laporan bahawa seluruh projek bebas advisory.

## Keputusan pengesahan

Semua baris berikut dijalankan pada sumber v1.5.0. Bukti pelayar menggunakan
Chromium sebenar dengan dua konteks berasingan, bukan mock perlawanan.

| Semakan | Keputusan |
|---|---|
| `node --test digital/tests/*.test.mjs` | 81/81 PASS, termasuk core, klien HTTP/retry/timeout dan Edge |
| `backend/verify-local.mjs` dengan PGlite sebenar | 5/5 kumpulan PASS: SQL terminal/deadline/role, Edge→SQL, had PIN, cap global, TTL/cleanup/cascade |
| SQL live dalam transaksi rollback | Create/join/ready, susunan sepuluh soalan dan mula bersama PASS; privilege RPC anon/authenticated=false, service_role=true |
| `backend/verify-live.mjs` melalui endpoint live | Dua join serentak: tepat seorang diterima, seorang `room_full`; lobi dibatalkan PASS |
| `tests/duel.browser.mjs` melalui endpoint live | Kedua-dua pemain menamatkan satu perlawanan, keputusan 10–9 dan pemenang sama pada kedua-dua peranti PASS |
| Lobi/game live | PIN enam digit, max dua pemain, salin PIN, BM/English, soalan/susunan/mula sama dan privasi lawan PASS |
| Pemulihan live | ACK diterima semasa menu terbuka, reload dengan R1 diterima, lost-ACK retry tanpa mata berganda, sesi luput→Duel Baharu PASS |
| Menyerah kalah live | Pengesahan keluar, lawan menang, baki soalan menjadi skipped, token pemain keluar dibuang PASS |
| Kuiz lama `tests/browser.mjs` | 8/8 senario PASS, termasuk offline, pertukaran bahasa, dialog dan storan disekat |
| `tests/practice.browser.mjs` | 15/15 dan campuran 10/15 PASS; BM/BI, replay dan skor kuiz tidak berubah |
| Paparan | BM desktop, English 390 px; solo 320/390 px; tiada overflow mendatar atau runtime error yang diperhatikan |
| Pembina/checker | HTML 242348 byte, 120 ID unik, ARIA/aset/sintaks/bank PASS; HTML digital dan root sama byte |
| SOR firmware | `python tools/check_version.py` PASS v1.1.3; firmware dan bank tidak diubah |

Percubaan menjalankan keseluruhan `verify.sql` melalui alat SQL live mendapat
ralat pengangkutan `Invalid or expired requestState`; ia **tidak** dilaporkan
sebagai lulus. Batch terperinci itu lulus dalam PostgreSQL terasing, manakala
semakan live dipecahkan kepada transaksi kecil dan ujian HTTP/pelayar sebenar.

Jalankan semula ujian terasing tanpa mengubah DB produksi:

```sh
node --test digital/tests/*.test.mjs
PGLITE_MODULE=/path/to/external/@electric-sql/pglite/dist/index.js node digital/backend/verify-local.mjs
```

PGlite hanya alat QA luar repo, bukan dependency aplikasi. Untuk ujian pelayar,
tetapkan `PLAYWRIGHT_MODULE_PATH` dan `PLAYWRIGHT_CHROMIUM_PATH` jika perlu.
`npm run test:duel` **menggunakan backend live**, mencipta bilik QA dengan alias
sintetik; `DUEL_SMOKE_ONLY=1` mengehadkannya kepada ujian PIN/menyerah kalah.
Dalam persekitaran proxy ini Node memerlukan `--use-env-proxy`; pelayar QA
menggunakan konfigurasi proxy dan sijil ujian persekitaran sahaja. HTML produksi
tidak mematikan TLS. Fixture tidak menyimpan token dalam laporan.

## Bukti paparan sebenar

| Skrin | Bukti |
|---|---|
| Lobi BM desktop | [lobby-bm.png](duel-evidence/lobby-bm.png) |
| Lobi English mudah alih | [lobby-en-mobile.png](duel-evidence/lobby-en-mobile.png) |
| Perlawanan BM desktop | [game-bm.png](duel-evidence/game-bm.png) |
| Perlawanan English mudah alih | [game-en-mobile.png](duel-evidence/game-en-mobile.png) |
| Keputusan BM 10–9 | [result-bm.png](duel-evidence/result-bm.png) |
| Keputusan English 9–10 | [result-en-mobile.png](duel-evidence/result-en-mobile.png) |
| Menang selepas lawan menyerah | [forfeit-en-mobile.png](duel-evidence/forfeit-en-mobile.png) |

Nama `Duel QA <b>Guest</b>` sengaja digunakan sebagai fixture; ia dipaparkan
sebagai teks literal untuk membuktikan alias tidak menjadi HTML. Animasi hanya
dibekukan ketika tangkapan supaya teks/rajah jelas. Gambar mudah alih ialah
emulasi viewport Chromium, bukan ujian telefon fizikal.

## Rujukan dan had

Dokumentasi rasmi yang digunakan untuk konfigurasi platform:

- [Supabase — Auth headers](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase — Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase — Function configuration](https://supabase.com/docs/guides/functions/function-configuration)

Bank soalan, istilah KSSM/DSKP, rich text dan kontrak bahasa kekal daripada
v1.4.0; tiada soalan/nilai/jawapan diterjemah semula untuk Duel. `Game` menerima
ID pelayan yang disahkan; teks terjemahan tidak digunakan sebagai kunci markah.
Kontrak modul bahasa sedia ada kekal untuk `digitalize-module` tanpa merge.

Belum diuji pada telefon fizikal, Safari atau Firefox; tiada ujian beban satu
kelas penuh. Masa rangkaian boleh mempengaruhi masa tamat yang direkodkan
pelayan. Polling bukan aliran WebSocket seketika. Tiada audio baharu ditambah.
Perlawanan memerlukan Internet dan backend aktif; free-tier platform tetap
tertakluk kepada kuota/operasi penyedia, tanpa jaminan SLA daripada projek ini.

GitHub Pages belum diaktifkan untuk repository private ini. `main-digital`
kekal `71db77c0206de664e50fa57ff57e1825af13f938` (v1.2.0); hanya
`digital-richText` menerima sumber/HTML v1.5.0. Tiada perubahan pada main,
sharing, digitalize atau digitalize-module dibuat oleh kerja ini. Semakan
remote sebelum penerbitan turut merekodkan kerja chat lain pada digitalize
`5e2474ad164555e491fd6640b2506fd71db1f8da` dan digitalize-module
`92c12c3a07ec250c03a73decaf52a654fc26d502`; ia tidak diintegrasikan di sini.

## Senarai serahan

- [x] Backend: pengasingan privilege, dua tempat, race join, PIN/TTL, seq/retry,
  markah sebenar, keputusan seri/menyerah/deadline dan tiada gangguan schema kelas.
- [x] Klien: lobi BM/BI, salin PIN, dua pemain sedia, kemajuan, kira detik,
  permainan, keputusan dan sambungan semula.
- [x] Dua konteks pelayar berasingan menggunakan endpoint sebenar; kuiz/latihan
  offline dan storan asal masih lulus. Bukti sebenar dan had ujian direkodkan.
- [x] Versi digital dinaikkan; artifak digital/root dibina daripada sumber sama.
  Push ditujukan hanya kepada digital-richText; SHA remote sebenar dilaporkan
  selepas lease update dan semakan GitHub, bukan SHA snapshot tempatan.
