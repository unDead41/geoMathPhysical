# Kontrak aliran UI/UX

Rujukan: SOR, SCREEN_CATALOG dan gambar dalam assets/mockups. Gambar menentukan
arah visual; kontrak domain, data dan matematik menentukan tingkah laku.

## Shell dan hierarki

Navigasi utama: **Utama · Belajar · Main · Kelas · Profil**. Gunakan satu shell
dengan state destinasi yang konsisten. Pelajar/guru mendapat kandungan Kelas
mengikut peranan; tetamu mendapat penerangan dan akses log masuk. Menekan
Kelas tidak menukar tetamu menjadi pelajar secara automatik.

Permainan aktif, auth dan ruang lukisan boleh menyembunyikan bottom navigation
untuk fokus. Back mengikuti jenis aktiviti: solo menyimpan dan boleh menjeda;
Duel memerlukan pengesahan menyerah kalah; kelas membaca status pelayan.
Android system back, gesture back dan app-bar back berkongsi polisi yang sama.

## Aliran utama

| Konteks | Aliran | Syarat penting |
|---|---|---|
| Belajar | 01→41→25/26/27/28 atau33→29–32;41→34/35 | Tidak memerlukan login untuk penerokaan |
| Aktiviti berpandu | Ramalkan→Cuba→Semak→Terangkan→36 | Simpan refleksi, bukan skor penguasaan |
| Kuiz/latihan | 01→02→04 kali pertama→05/06→07 berulang→08 | Jam solo bermula selepas panduan; soalan seterusnya bukan percubaan kedua |
| Sambung | 01→03→05/06/08 | Ringkasan dahulu; snapshot owner/ruleset/bank sah |
| Duel | 02→10→11→12→13 | Kedua-dua pemain Sedia;48 resync ke 12 dengan clock pelayan |
| Guru | 14→17→42/18→43/19→20 | Kelas/bilik sedia ada boleh dibuka tanpa cipta semula |
| Pelajar | 14→21→44/terima jemputan→22→UI permainan kelas→keputusan | Tunggu guru; satu percubaan, sambung attempt yang sama |
| Akaun | 15→45→14;16→46→14 | Pautan callback disahkan, bukan sekadar route dibuka |
| Utiliti | 23→24/47/37;39→04/40 | Help/tetapan tidak reset aktiviti |

## Satu idea dan satu tindakan utama

Setiap screen mempunyai heading jelas dan satu primary CTA yang sepadan dengan
state sebenar. Gunakan progressive disclosure untuk analisis, bantuan panjang,
advanced lab modes dan butiran rekod. Semua mod asal tetap boleh ditemui;
menu ringkas tidak bermaksud fungsi dibuang.

Dalam permainan, bezakan **pilih kad** dengan **letak/imbas di R1/R2** jika
enjin memerlukan tindakan berasingan. Sediakan tap selain drag; jangan
mendakwa telefon mengimbas RFID. Semasa R1, R2 tidak menerima input yang
memintas urutan. Semua lima pilihan kekal tersedia secara boleh capai.

## Keadaan UI yang wajib

| State | Persembahan dan tindakan |
|---|---|
| Memuat awal | Ruang stabil, status boleh dibaca; fokus tidak melompat |
| Menyimpan | CTA single-flight, indikator dalam slot sama; jangan kosongkan draf |
| Berjaya | Tunjuk hasil yang diakui sumber sebenar, bukan optimistik tanpa rollback |
| Kosong | Sebab ringkas dan CTA relevan, contohnya cipta kelas atau sertai PIN |
| Offline | Label sumber setempat/cache dan masa kemas kini jika relevan |
| Pending sync | Bilangan pending sebenar; Cuba semula; tiada label synced sebelum ack |
| Sesi luput | Minta log masuk; rekod owner sama kekal pending dan tidak dipindah ke guest |
| Conflict edit | Kekalkan draf; tunjuk nama/revision terkini selepas refresh; pengguna pilih semula |
| Unknown outcome | Semak snapshot sebelum ulang tindakan berisiko; jangan autoulang delete |
| Capability tiada | Sembunyikan tindakan tak disokong dan beri mesej perkhidmatan belum tersedia |
| Storan gagal | Nyatakan belum disimpan; sesi semasa boleh diteruskan jika enjin menyokong |
| Akses ditarik | Bersihkan hasil/subscription lama; kembali ke ruang kelas yang dibenarkan |

Mesej pengguna menerangkan tindakan seterusnya. Stack trace, nama jadual, JWT,
RPC payload dan status dalaman tidak dipaparkan dalam aliran pelajar.

## Dialog dan bottom sheet

Gunakan komponen bersama untuk nama kelas/bilik, pengesahan tutup/arkib/padam,
keluarkan ahli, tolak/batal jemputan, keluar Duel dan draf belum disimpan.
Tajuk mesti menyebut objek/tindakan sebenar. Pilihan batal jelas; CTA berbahaya
menggunakan warna danger dan kata kerja khusus.

Tutup bilik adalah terminal. Restore archive tidak membuka bilik ditutup.
Delete hanya ditawarkan selepas capability dan syarat empty disahkan pelayan.
Remove member tidak memadam akaun atau sejarah attempt. Fokus kembali ke
pencetus apabila dialog dibatalkan; refresh senarai tidak memadam input aktif.

## Modul dan geometri

Sediakan ruang model besar, kawalan putar/reset/fullscreen, label muka dan
legend. Warna kekal pada muka asal. Pandangan ortografik tidak digantikan
dengan net dan muka tersembunyi tidak dibuat transparent hanya untuk
memperlihatkan semua warna.

Pelan&Dongakan boleh menggunakan tab pada telefon. Apabila tiga pandangan
dipaparkan/diterbitkan bersama, susunan Kaedah 1 canonical masih dipelihara:
depan di atas pelan, sisi kanan di kiri depan. Transform viewport tidak
mengubah skala atau unit lukisan. Label hiasan tidak mengubah jenis garis.

## Kebolehcapaian dan Bahasa

BM lalai; English mengekalkan ID soalan/state/draf. Control native sasaran 48 dp,
safe area dan keyboard insets dipatuhi. Teks 150% tidak memotong CTA penting.
Warna dibantu label, nama akses dan garis. Reduced motion memberikan state
statik atau gerakan berkurang yang masih menerangkan aktiviti.

Audio mempunyai satu pemilik. Elakkan muzik native dan modul berjalan serentak.
Suara setempat kekal pilihan; ketiadaan suara BM bukan kegagalan latihan.
Tidak ada auto-send laporan, notifikasi push, QR atau social login tanpa skop
dan kontrak baharu. Ikon lonceng dalam mockup 41 bukan bukti ciri notifikasi.
