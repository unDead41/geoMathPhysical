# Audit Pusat Bantuan & Lapor Masalah

Tarikh: 26 Oktober 2026 (Malaysia). Asas `main-digitalized`:
`790d989d666e64f3beabb507cd4140b832696367`, Digital v2.6.0,
modul v1.5.0, firmware v1.1.3. Audit ini membaca sumber; ia tidak
menghantar laporan, email, issue atau mengubah backend hosted.

## Pintu masuk dan pemilik sedia ada

| Keupayaan | Sumber sebenar | Implikasi integrasi |
|---|---|---|
| Bantuan pada header | `dist/index.html` `data-action="help"`; `dist/app.mjs` `openHelp()` | Pada asas, tindakan ini hanya membuka tutorial. Jadikan satu pintu masuk Pusat Bantuan. |
| Tutorial tiga langkah | `dist/usability-ui.mjs` `openTutorial`, `renderTutorial`, `finishTutorial`; `dist/usability-copy.mjs` | Guna semula tutorial ini. Tetamu kali pertama melihatnya sebelum mula; pilihan langkau tersedia. |
| Tutorial dalam Tetapan | `dist/index.html` `data-dialog-action="tutorial-open"` | Pautkan Pusat Bantuan tanpa menyalin panduan atau menambah kawalan bahasa/audio kedua. |
| Dialog | `dist/app.mjs` `openDialog`, `closeDialog`, `settleDialogClose` | Dialog native memiliki inertness, Escape, fokus kembali dan jeda input permainan. |
| Tetapan dalam modul | `dist/module-frame.mjs` `installModulePreferences`; `dist/module-settings.mjs` `createModuleBridge` | Tambah tindakan bantuan melalui bridge yang sama, menyemak source, origin, versi dan instance. |
| Ralat permainan/room | `dist/app.mjs` `setStatus`, `roomCommand`, `sendRoomPending` | Kekalkan mesej dan butang Hantar semula sedia ada; laporan bukan pengganti retry. |
| Ralat akaun | `dist/portal.mjs` `errorText` menggunakan `friendlyError` dalam `dist/usability.mjs` | Jangan hantar objek ralat penyedia atau payload Auth ke konteks laporan. |

## Fakta panduan BM / English

Ayat di bawah ialah kandungan cadangan berdasarkan tingkah laku sumber,
bukan dakwaan semua ayat sudah disepadukan pada UI.

| Tugas | BM mudah | English |
|---|---|---|
| Imbas | Baca soalan. Pilih bongkah dan sentuh R1. Selepas R1 betul, pilih bentangan dan sentuh R2. Padankan bentuk, bukan warna. | Read the question. Choose a solid and tap R1. After R1 is correct, choose its net and tap R2. Match the shape, not the colour. |
| Percubaan | Pilih kad sahaja belum menghantar jawapan. Pasangan betul mendapat +1. Salah di R1 atau R2 menamatkan percubaan soalan itu dengan +0. Petunjuk percuma. | Choosing a card does not submit an answer. A correct pair earns +1. A wrong R1 or R2 answer ends that question's attempt with +0. Hints are free. |
| Semakan | Selepas salah atau langkau, semak pasangan betul. Tunggu butang soalan seterusnya tersedia. | After a wrong answer or a skip, check the correct pair. Wait for the next-question button to become available. |
| Kuiz / latihan | Kuiz mempunyai 10 soalan. Latihan Pengukuhan menggunakan semua 15 soalan. Hanya kuiz lengkap masuk papan skor peranti. | A quiz has 10 questions. Reinforcement Practice uses all 15 questions. Only a completed quiz enters the device leaderboard. |
| Latihan semula | Pada keputusan, pilih Latih soalan salah untuk soalan salah atau dilangkau. Skor asal kekal. Jika semua betul, tindakan ini tidak ditunjukkan. | On results, choose Practise missed questions for wrong or skipped questions. The original score stays the same. This action is hidden when all answers are correct. |
| Duel | Pilih Duel, cipta atau sertai menggunakan PIN enam digit dan kedua-duanya tekan Sedia. Duel memerlukan Internet. Keluar sebelum tamat bermaksud menyerah kalah. | Choose Duel, create or join with a six-digit PIN, and both players select Ready. Duel needs Internet. Leaving before completion forfeits the match. |
| Modul | Dari Home, buka Belajar. Pilih Teroka 3D, Nota pembelajaran atau Makmal interaktif. Gunakan kawalan Main/Jeda/Sambung, langkah dan kelajuan dalam modul. | From Home, open Learn. Choose Explore 3D, Learning notes or Interactive labs. Use the module's Play/Pause/Resume, step and speed controls. |
| Makmal | Empat makmal ialah Bina Bentangan, Makmal Isi Padu, Terbitkan Rumus dan Bongkah Gabungan. Aktiviti berpandu menggunakan Ramal → Cuba → Semak → Terangkan. Rekod ialah refleksi kendiri, bukan gred TP. | The four labs are Build a Net, Volume Lab, Derive Formulae and Composite Solids. Guided activities use Predict → Try → Check → Explain. Records are self-reflection, not a performance-level grade. |
| Akaun | Buka Akaun & kelas untuk daftar atau log masuk. Akaun baharu memerlukan pengesahan email. Login menerima email atau username. Main sendiri tidak memerlukan akaun. | Open Accounts & classes to sign up or sign in. New accounts require email confirmation. Sign-in accepts email or username. Solo play does not need an account. |
| Kelas | Pelajar boleh menyertai dengan PIN guru atau menerima jemputan username. Tunggu guru mula, kemudian mula bermain. Guru mencipta kelas/bilik dan melihat keputusan kelas sendiri. | Students can join with a teacher's PIN or accept a username invitation. Wait for the teacher to start, then begin playing. Teachers create classes/rooms and view results for their own classes. |
| Tetapan | Bahasa, saiz teks, kontras, animasi dan audio berada dalam Tetapan. Pilihan itu turut digunakan oleh modul yang dibuka daripada aplikasi. Suara modul bergantung pada suara yang tersedia pada peranti. | Language, text size, contrast, motion and audio are in Settings. These choices also apply to the embedded module. Module speech depends on voices available on the device. |

Rujukan: `dist/core.mjs`, `dist/app.mjs`, `dist/duel.mjs`,
`dist/portal.mjs`, `dist/preferences.mjs`, `module/README.md`,
`module/src/app.mjs`, `module/src/guided.mjs`, `module/src/accessibility.mjs`.
Tiada perubahan matematik/bank soalan diperlukan untuk utility ini.

## Masa dan pemeliharaan keadaan

| Mod | Polisi yang mesti kekal ketika bantuan/laporan dibuka |
|---|---|
| Kuiz/latihan/latihan semula solo | `Game.pause/resume` dalam `core.mjs` membekukan masa input. Dialog dan tab tersembunyi menjeda jam solo. Dialog tidak memulakan permainan atau membuat round baharu. |
| Room kelas | Jam server terus berjalan semasa dialog, tab tersembunyi atau terputus sambungan. `app.mjs` `displayedGameTime()` menganggar masa berasaskan `roomState`, bukan masa `Game` yang dijeda. Server mengecualikan menunggu mula dan semakan/maklum balas yang sudah selesai. |
| Duel | `duelClient.elapsed()` menggunakan masa pelayan; menu, semakan, tab tersembunyi dan sambungan terputus tetap dikira. Polling/timeout sedia ada dikekalkan. |
| Modul | Kekalkan iframe dan `moduleProgress` semasa. `showScreen()` dengan skrin selain `module` memanggil `moduleBridge.clear()` dan `moduleProgress.close()`; ia tidak sesuai untuk bantuan. |

Hook paling kecil ialah membuka kandungan bantuan/laporan dalam dialog sedia
ada tanpa `showScreen`, `renderQuestion`, `startGame`, `returnHome`,
`openLearningModule` atau `moduleBridge.open` semula. Jangan ubah `selected`,
`acceptedSolid`, `acceptedNet`, `hintOpen`, jawapan, skor, susunan kad atau
aktiviti/ukuran modul. Snapshot sah daripada server masih boleh mengemas kini
keadaan, contohnya guru menutup bilik atau Duel tamat.

## Pemulihan yang benar-benar disokong

- Fail HTML muat turun membenamkan kod/modul/audio; kuiz/latihan sendiri boleh
  dimainkan offline. Jangan menjanjikan laman web yang belum dimuatkan boleh
  dibuka selepas browser ditutup: tiada kontrak cache/service-worker sedemikian.
- Reload permainan solo kembali Home; round belum lengkap tidak dipulihkan atau
  disimpan. Jangan mencadangkan reload untuk mengekalkan round solo semasa.
- Skor kuiz dan preferences menggunakan pelayar/peranti yang sama. Storan
  ditolak menggunakan memori sesi. Jangan menyarankan padam storan, kerana
  tindakan itu boleh membuang skor, pilihan dan rekod setempat.
- Room menggunakan `sendRoomPending()` dengan UUID tindakan yang sama untuk
  Hantar semula; buka semula bilik boleh menyambung percubaan server yang sama.
- Duel menggunakan token/pending action dalam sessionStorage jika dibenarkan.
  `resume()` menghantar semula pending action atau membaca keadaan semasa.
  Pemulihan memerlukan sesi yang masih sah; storan disekat tidak menjamin
  sambungan semula selepas reload. PIN lobi 10 minit; perlawanan 15 minit.
- Modul menyimpan refleksi mengikut tetamu/akaun secara berasingan. Hanya akaun
  pelajar mempunyai `canSync` kepada awan. Rekod `pending` mempunyai tindakan
  Cuba simpan ke awan; aktiviti setempat boleh diteruskan tanpa sync.
- Terlupa kata laluan menggunakan pautan email untuk akaun email. Kod pemulihan
  lama hanya untuk akaun username lama. Pautan tamat/tidak sah memerlukan
  permintaan baharu. Kejayaan permintaan tidak membuktikan email sampai.

## Endpoint laporan

**Tiada kontrak penghantaran laporan masalah ditemui pada sumber asas.**
`portal.mjs` mempunyai fungsi bernama `report(error)`, tetapi ia hanya memanggil
callback host `onError`; `app.mjs` memasangnya sebagai `()=>{}`. Ia bukan API
laporan. Gateway sedia ada ialah Auth, `geo_action`, `geo_module_progress` dan
Duel. Tiada action report/support dalam schema atau gateway itu.

Untuk keluaran utility ini, pratonton, salin dan muat turun laporan hendaklah
berfungsi sepenuhnya setempat. Kejayaan salin/muat turun tidak boleh dilabel
“Laporan dihantar”. Jangan menambah emel, URL issue atau POST tersembunyi.

Backend Master boleh menyediakan kontrak berasingan kemudian: schema payload
berversi dengan medan allowlist sama seperti pratonton, had panjang dan
kategori, polisi akses/rate limit, persetujuan pengguna sebelum submit,
serta respons ID laporan yang jelas selepas simpan berjaya. Ia perlu membezakan
penolakan, gangguan sambungan dan kejayaan sebenar; utility ini tidak
mewujudkan jadual, endpoint atau deployment tersebut.

## Sempadan konteks automatik dan pengesahan

Allowlist hanya versi/binaan yang diketahui, nama skrin/mod/bahasa stabil,
ID soalan yang sah dan tahap R1/R2, viewport serta status sambungan yang
dinamakan dengan tepat. `navigator.onLine` hanyalah isyarat pelayar, bukan
bukti API boleh dicapai. Jangan menambah permintaan rangkaian untuk membuka
bantuan atau membina laporan.

Jangan sertakan `question.shape`, jawapan bank, pilihan kad, PIN, token,
URL query/hash Auth, nama pengguna/email/kelas, lawan, payload ralat atau
dump storan. Render teks pengguna melalui escaping/textContent. Uji teks
panjang, BM/English, telefon/desktop, offline, clipboard ditolak dan fokus
papan kekunci. Bandingkan pilihan kad, jawapan diterima, hint, skor dan
keadaan modul sebelum/selepas dialog; sahkan jam solo berhenti manakala
jam kelas/Duel kekal mengikut polisi server.
