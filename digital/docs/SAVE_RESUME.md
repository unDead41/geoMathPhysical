# Simpan & Sambung Permainan — calon Digital v2.7.0

26 Oktober 2026 (Malaysia). Branch: `digitalized-utility-save-resume`.
Asas `main-digitalized`, SHA penuh
`790d989d666e64f3beabb507cd4140b832696367`, Digital v2.6.0,
modul v1.5.0, firmware v1.1.3. Remote disemak melalui GitHub API kerana checkout
sedia ada tidak mempunyai remote dan akses Git HTTPS tidak tersedia. Branch
hasil belum wujud semasa semakan awal. Worktree sendiri digunakan, tiada subagent.
Versi v2.7.0 ialah cadangan branch; integrator perlu menyemak pertindihan versi
sebelum merge. Firmware dan release awam tidak berubah.

## Kontrak pengguna

Home → **Sambung permainan / Resume game** menunjukkan nama, mod, bilangan
soalan dijawab, R1/R2, markah dan masa sebelum pemulihan. **Mula baharu /
Start new** mengesahkan penggantian sesi. Menutup dialog atau membatalkan
pengesahan mengekalkan snapshot. Sesi selesai boleh dibuka semula sebagai
keputusan. Main baharu selepas keputusan boleh terus bermula.

Satu slot per tetamu atau UUID akaun dalam pelayar/origin yang sama; mod kuiz10,
latihan15 dan latihan semula berkongsi slot tersebut. Memulakan mod lain ketika
sesi belum selesai meminta pengesahan. Ini simpanan setempat, bukan cloud sync:
profil pelayar lain, peranti lain, data pelayar dipadam atau origin/nama fail
offline berlainan tidak dijamin berkongsi simpanan. Menutup aplikasi tidak
menambah masa solo. Jika storan ditolak/penuh, mesej menyatakan kemajuan belum
disimpan dan murid boleh terus bermain dalam halaman terbuka.

## Pemilik dan format

`dist/solo-save.mjs`: `SoloStore`, `makeSnapshot`, `restoreSnapshot`. Tiada enjin
permainan kedua. Restore replay tindakan sah melalui `Game.scan`, `skip`,
`toggleHint`, `advance` dan menolak jumlah/rekod/tahap yang tidak sepadan.
Snapshot v1 memeriksa ruleset dan representasi bank tepat; perubahan bank
menolak checkpoint lama dengan mesej tidak serasi. Tiada migrasi senyap.

Kunci `geodecoder.digital.solo.v1.<guest|UUID>` menyimpan ID sesi, mod, profil
permainan, ID dan susunan soalan, susunan kad, peta warna, pilihan kad, tahap,
percubaan, hint, rekod jawapan, jumlah, status feedback/review/finished, masa
bermain terkumpul dan baki tempoh feedback/review. Masa `performance.now()`
mutlak tidak dipulihkan; baki delay bermula pada clock baharu. Semakan salah
atau langkau kekal terkunci sepanjang baki minimum sebelum meneruskan.

Snapshot tiada session Auth, kata laluan atau token. Akaun dipulihkan melalui
lifecycle Auth sedia ada apabila Auth tersimpan wujud; perubahan identiti
menyimpan sesi lama pada kunci lamanya dan menghentikan permainan sebelum
memilih slot identiti baharu. Sesi orang lain tidak dibuka sebagai tetamu.
Penyimpanan setempat bukan mekanisme keselamatan terhadap suntingan manual
oleh pemilik pelayar; tiada dakwaan markah solo disahkan pelayan.

Simpanan dibuat pada render perubahan keadaan/input, pause/dialog, pertukaran
paparan/identiti, visibility/pagehide, dan checkpoint 5 saat semasa halaman
permainan kelihatan. Tiada penulisan setiap animation frame. Shutdown paksa
yang tidak menghantar lifecycle event mungkin kehilangan masa aktif sejak
checkpoint terakhir, lazimnya sehingga 5 saat (timer pelayar boleh ditangguh).
Storan setItem atomic; data rosak hanya diganti selepas pengesahan pengguna.
Kunci skor, legacy, modul dan akaun lain tidak dibersihkan.

ID sesi kekal sama selepas pulih. Keputusan kuiz disimpan hanya jika ID belum
ada dalam ScoreStore; pemulihan finished tidak menambah baris baharu. Jika
penulisan skor gagal, ID sama boleh dicuba semula ketika keputusan dipulihkan.
Latihan15/latihan semula tidak memasuki papan skor. Duel dan classroom tidak
menulis/membaca SoloStore; snapshot, jam dan acknowledgment pelayan asal kekal.
Kemajuan modul/iframe serta backend/SQL tidak diubah.

## Pengesahan dan had

- `npm test`: 264 ujian lulus (248 sedia ada +16 baharu).
- `solo-save.test.mjs`: R1/R2, pilihan/warna/susunan, hint, wrong R1/R2,
  skip, feedback, finished, tempoh semakan, fractional clock, ID skor,
  corrupt/schema/ruleset/bank/actor dan denied storage. 80 sesi rawak
  dipulihkan selepas setiap tindakan melalui enjin sebenar.
- `solo-ui.test.mjs`: aplikasi penuh dalam JSDOM, cold DOM reload dengan
  localStorage sama, R1/R2/hint/pilihan, cancel/discard/new, BM/English,
  data rosak, storan disekat, tetamu→A→B→tetamu. Pertukaran akaun menggunakan
  seam ujian pada lifecycle Cloud; tiada akaun hosted sebenar digunakan.
- `npm run build`, `npm run prepare:pages`, `npm run check`: lulus setempat.
  prepare:pages hanya menyediakan alias index private; tiada deployment.
- `python tools/check_version.py`: firmware v1.1.3 kekal sepadan.
- `npm run test:solo`: suite Chromium disediakan untuk desktop1365×980 dan
  mobile390×844, BM/English, reload/tutup-buka halaman, offline HTML,
  wrong/skip review lock, denied storage dan data rosak. Pelaksanaan tersekat:
  executable Chromium tiada; percubaan muat turun Playwright menghasilkan
  arkib tidak sah. Oleh itu tiada dakwaan lulus browser sebenar, visual QA,
  browser process restart, reboot peranti, offline browser atau telefon fizikal.

Aset audio dan reference bank yang tidak dimaterialisasikan oleh sparse checkout
pulih daripada objek/salinan projek yang disahkan hash. Tiada kandungan DSKP,
soalan, aset audio atau modul diubah. Untuk QA seterusnya: pasang Chromium yang
sah dan jalankan `cd digital && npm run test:solo`, kemudian suite usability,
practice dan Duel yang berkaitan sebelum integrasi/penerbitan.
