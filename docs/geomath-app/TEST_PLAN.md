# Pelan ujian dan penerimaan

Status dokumen ini: **rancangan ujian app**, belum dilaksanakan. Hanya semakan
pakej dokumen dalam VALIDATION telah dijalankan. Bukti unit/browser web daripada
handoff branch ialah bukti sumber tersebut, bukan ujian Flutter/telefon ini.

## Kumpulan ujian yang bernilai

| Suite | Kontrak dan kes utama | SOR |
|---|---|---|
| T01 Theme/navigation | Lima destinasi, role visibility, BM/English, light/dark/system, text 150%, safe-area/keyboard; context dikekalkan | U01,U03 |
| T02 Assets/bridge | Bundled offline reload, hash mismatch/missing asset, ready handshake, two protocol channels, fake nonce/source, unknown command,64KiB proposed cap, actor switch | L01,L02,O01,N02 |
| T03 Geometry/palette | Semua 11 model; six view directions; cube face IDs 0–5 color mapping through rotation and folding; curved patch is not a new face | L01,L02,L03,U02 |
| T04 Math/workshops | Cube 4→96/64; all analytic cases source; all 4 labs and advanced modes; scale 1:1/1:2; tolerance exactly 0.06 accepted vs above rejected; reversed/split/merged lines; parser 480/180/28/12/1e30 boundaries | L04,L05,L06,L07 |
| T05 Reflections | Four activity IDs only; field limits 240/600/600, required stage fields, completed explanation, no regression on merge, account boundary | L08,O02,O03 |
| T06 Solo parity |15 unique questions,3 per shape including cone; quiz 2 each; practice 15; R1→R2;+1 pair; one attempt; R2 unattempted; skip/hint/review; seeded JS-vs-Dart golden | G01,G02,G03,G04 |
| T07 Save/results | Process death/reopen, fractional elapsed and review remainder, denied/full/corrupt/old schema/bank, owner swap, one score row/attempt,max 50, retry subset keeps original | G05,G06 |
| T08 Auth/profile | Server role, username/email cases, password limits, signup confirmation, cold-start/expired/reused deep link, logout scopes, unsaved profile, late old responses | C01,C05,N02 |
| T09 Classroom/CRUD | Teacher vs student vs outsider, PIN class/room, same attempt, server timing, archived/closed boundaries, expected_revision conflict, invitation UUID races, removal retention/re-enrollment | C02,C03,C04 |
| T10 Duel | Two independent real clients, lobby expiry/countdown,15 min deadline, dropped ack/duplicate seq,900/1800 gates, wrong/skip review, forfeit, reconnect/background, no opponent answer leak | D01,D02,D03 |
| T11 Outbox | Transaction rollback/crash, A→B switch mid-flight, batch 20, cap 2000, partial/duplicate/unknown ack, reused ID with different content, expired Auth, missing RPC,429/Retry-After/backoff, no sync while force-stopped | O02,O03,O04,O05,N01 |
| T12 Support | Help demo finite 4.8 s, localized steps, report validation/preview/copy/TXT, sensitive context omitted, no network send | U04 |
| T13 Performance/release | Profile Android device, long session, render/folding and lifecycle, bundle size/startup/jank/memory measured; capacity only approved staging workload | N01,N03,R01,R02,R03 |

Syarat penerimaan bukan bilangan unit test semata-mata. Negative authorization,
data preservation, parser/tolerance boundaries dan dropped-ack retry mesti
menggunakan pemilik domain/SQL/transport sebenar atau fixture yang jelas dilabel.

## Golden parity

Eksport bank/ruleset dari JS canonical, sertakan SHA/hash. Bina corpus tindakan
seeded dengan now/rng yang dikawal; event IDs, round order, selected cards,
attempts, outcomes, score, hints, review state dan elapsed dibandingkan selepas
setiap tindakan. Gunakan corpus juga untuk restore snapshot dan duplicate
finish. Matematik modul yang masih JS diuji melalui source suite dan WebView;
ujian widget tidak menggantikannya.

## Matriks visual dan telefon

- Viewport320/390/430 dp dan tablet768 dp; portrait/landscape apabila disokong.
- BM dan English; light/dark/strong contrast;100/125/150%text; reduced motion.
- Android emulator untuk automation dan sekurang-kurangnya satu telefon fizikal
  sebelum APK dibagikan sebagai diuji. Rekod model, OS, WebView dan app build.
- iOS hanya boleh ditanda lulus selepas binaan/platform sebenar diuji, termasuk
  WKWebView, keyboard, audio lifecycle dan callback. Windows screenshot bukan
  bukti iOS atau Android.
- Bagi semua screen 01–48, rekod loading/empty/error/retry di feature yang
  berkaitan; EX01–EX16 bukan ditanda selesai hanya kerana dialog asas wujud.

## Arahan masa depan — belum dijalankan

```bash
flutter doctor -v
flutter --version
flutter pub get
flutter analyze
flutter test
flutter test integration_test/app_flow_test.dart -d <device-id>
flutter build apk --release
```

Nama fail integration_test ialah sasaran pelan, bukan fail sedia ada. Ujian
Digital canonical dijalankan dari checkout sumber yang digunakan, contohnya
`cd digital && npm test`, `npm run build`, `npm run check`; modul mempunyai
suite sendiri. Semak scripts sebenar apabila kickoff; jangan mengada-adakan
resit command yang tidak dijalankan.

## Pintu keluaran

Release perlu source SHA, dependencies locked, asset hashes, known deviations,
screenshots hasil kod sebenar, APK hash, keputusan suite dan batasan telefon.
Jika backend candidate belum dipasang, fail secara jujur dengan capability
state; jangan mengaku kelas/CRUD/sync live telah berfungsi.5,000 mixed users
dan 5,000 Duel players ialah senario load berbeza. Ujian PGlite/localhost10 clients
tidak membuktikan mana-mana kapasiti hosted itu.

Lihat HANDOFF_TEMPLATE untuk format hasil dan SOURCES_AND_STATUS untuk had
evidence branch. Tidak ada hasil Flutter yang ditandakan lulus dalam pakej ini.
