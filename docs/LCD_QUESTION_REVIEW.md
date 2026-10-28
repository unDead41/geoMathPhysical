# Semakan soalan dan hint GeoDecoder

Tarikh: 28 Oktober 2026 - firmware v2.0.1

Baris pertama LCD menunjukkan nombor soalan, tahap R1/R2, masa dan skor. Tiga baris berikutnya digunakan untuk soalan atau hint. Setiap baris ialah ASCII dan tidak melebihi 20 aksara. `main/question_bank.h` ialah sumber runtime.

Semua 15 ID dan jenis jawapan dikekalkan. Setiap bongkah mempunyai dua soalan ciri bentuk/rumus dan satu soalan bentangan. Fokus bongkah: R1 kemudian R2. Fokus bentangan: R2 kemudian R1. Peranan fizikal kekal; +1 hanya selepas kedua-dua kad sepadan betul. Salah pada mana-mana tahap memuktamadkan +0 dengan penerangan di bawah sehingga NEXT. Piramid merujuk kepada tapak segi empat sama.

Notasi: V = isi padu, L = luas permukaan, j = jejari, t = tinggi, s = tinggi sendeng, a = panjang rusuk atau sisi tapak, p/l/t = panjang/lebar/tinggi. pi, * dan ^ digunakan untuk LCD ASCII.

Soalan bentangan menguji bentuk atau lipatan. Ukuran kotak dalam B3 membezakan rusuk yang berlainan tanpa meminta pengiraan isi padu.

## Dokumentasi A4 edisi terdahulu

- [PDF 15 halaman](lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf)
- [Set 15 PNG](lcd/GeoDecoder_15_Contoh_LCD_PNG.zip)
- [Indeks aset cetakan dan LCD](ASSETS.md)

**PDF/PNG belum diselaraskan kepada flow v2.0.1.** Teks soalan/hint masih sama, tetapi header bentangan perlu R2 dahulu dan paparan salah baharu belum dimasukkan.

Semua halaman menggunakan satu templat A4 landskap yang tetap, dengan LCD soalan dan hint bersebelahan. Baris ID soalan dan label dimensi LCD telah dibuang daripada reka letak PDF; garisan emas berada dalam lengkungan banner. Petunjuk simbol menggunakan istilah Buku Teks Matematik Tingkatan 2 KSSM, Bab 6.

## Pratonton setiap soalan

Nombor dan masa di bawah ialah contoh simulasi daripada kod semasa. Setiap soalan ditunjukkan sebagai soalan pertama dalam pusingan lima soalan, pada reader pertama mengikut fokusnya. Hint dibuka lima saat kemudian. Selepas kad pertama betul, label bertukar kepada reader kedua; isi soalan/hint kekal sama.

### P1 Piramid

Soalan

```text
Q1/5 R1 00:14   S0/5
Bongkah apakah ini? 
Tapak persegi dengan
4 muka segi tiga.   
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: Muka sisi akan
bertemu pada puncak 
apabila dilipat.    
```

### P2 Piramid

Soalan

```text
Q1/5 R1 00:14   S0/5
V=a^2*t/3; t=tinggi 
a=sisi tapak persegi
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: a^2 ialah luas
tapak. Fikir bentuk 
muka sisi bongkah.  
```

### P3 Piramid

Soalan

```text
Q1/5 R2 00:14   S0/5
Pilih bentangan bagi
1 segi empat sama   
dan 4 segi tiga.    
```

Selepas tekan HINT

```text
Q1/5 R2 00:19   S0/5
HINT: Lipat sisinya 
di sisi petak hingga
bertemu di 1 puncak.
```

### C1 Kon

Soalan

```text
Q1/5 R1 00:14   S0/5
V=pi*j^2*t/3        
j=jejari; t=tinggi. 
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: Lihat tapaknya
yang bulat. Sisinya 
mengecil ke puncak. 
```

### C2 Kon

Soalan

```text
Q1/5 R1 00:14   S0/5
L=pi*j*(j+s)        
j=jejari; s=tinggi  
sendeng. Bentuk apa?
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: Tinggi sendeng
diukur ikut sisi    
dari tapak ke puncak
```

### C3 Kon

Soalan

```text
Q1/5 R2 00:14   S0/5
Pilih bentangan yang
ada 1 sektor bulatan
dan 1 bulatan.      
```

Selepas tekan HINT

```text
Q1/5 R2 00:19   S0/5
HINT: Rapatkan sisi 
lurus pada sektor.  
Bulatan jadi tapak. 
```

### K1 Kubus

Soalan

```text
Q1/5 R1 00:14   S0/5
Enam muka berbentuk 
segi empat sama.    
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: 12 rusuk sama 
panjang. Setiap muka
sama bentuk dan saiz
```

### K2 Kubus

Soalan

```text
Q1/5 R1 00:14   S0/5
V=a^3; L=6*a^2      
a=panjang rusuk     
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: Panjang, lebar
serta tinggi sama   
bagi bongkah ini.   
```

### K3 Kubus

Soalan

```text
Q1/5 R2 00:14   S0/5
Pilih bentangan:    
6 segi empat sama,  
semuanya sama saiz. 
```

Selepas tekan HINT

```text
Q1/5 R2 00:19   S0/5
HINT: Bayangkan muka
dilipat jadi kotak  
tanpa muka bertindih
```

### B1 Kuboid

Soalan

```text
Q1/5 R1 00:14   S0/5
Kotak ini mempunyai 
3 ukuran berbeza.   
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: Lihat panjang,
lebar serta tinggi. 
Muka berhadapan sama
```

### B2 Kuboid

Soalan

```text
Q1/5 R1 00:14   S0/5
V=p*l*t; p,l,t ialah
3 ukuran berbeza.   
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: p=panjang,    
l=lebar, t=tinggi.  
Lihat kotak kasut.  
```

### B3 Kuboid

Soalan

```text
Q1/5 R2 00:14   S0/5
Kotak: 6cm x 4cm    
dengan tinggi 3cm.  
Pilih bentangannya. 
```

Selepas tekan HINT

```text
Q1/5 R2 00:19   S0/5
HINT: Padankan muka 
yang sama saiz, lalu
lipat menjadi kotak.
```

### S1 Silinder

Soalan

```text
Q1/5 R1 00:14   S0/5
Tin minuman ada dua 
tapak bulatan sama. 
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: 2 tapak bulat 
sama saiz disambung 
oleh sisi melengkung
```

### S2 Silinder

Soalan

```text
Q1/5 R1 00:14   S0/5
V=pi*j^2*t          
L=2*pi*j*(j+t)      
Bongkah apakah ini? 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: j=jejari dan  
t=tinggi. Tapak atas
dan bawah sama saiz.
```

### S3 Silinder

Soalan

```text
Q1/5 R2 00:14   S0/5
Pilih bentangan:    
2 bulatan sama saiz,
1 segi empat tepat. 
```

Selepas tekan HINT

```text
Q1/5 R2 00:19   S0/5
HINT: Lengkungkan   
segi empat itu; dua 
bulatan jadi tapak. 
```

## Semakan dan batas ujian

- Semua 90 baris soalan dan hint disemak untuk had 20 aksara dan ASCII.
- Semua 30 bingkai di atas diperoleh dengan menjalankan `src/main.cpp` semasa melalui simulasi LCD dalam harness native.
- `Question.focus` menentukan urutan pertama; tahap runtime menentukan reader aktif. Tiada analisis perkataan dalam soalan.
- Perkakasan fizikal belum diuji dalam kemas kini ini. Semak kontras dan keterbacaan LCD selepas upload.
- Simbol rumus perlu diperkenalkan kepada murid sebelum bermain.
- PDF menggunakan versi sumber 4 yang terakhir dikemas kini pada 24 Oktober 2026; semua 90 baris soalan/hint sepadan dengan bank semasa. Gambar pratonton lama telah dikeluarkan daripada repo.

## Penerangan salah sebenar bagi 15 soalan

Bingkai di bawah dijana daripada pure engine/view sebenar. Nama datang daripada
`question.answer`, sebab daripada `question.explanation`. Tiada baris dipotong;
ruang pad kanan tidak ditunjukkan dalam Markdown. Kedua-dua RGB merah berkelip hingga NEXT/B1/GPIO32.
Masa tidak bertambah semasa menunggu; HINT/retry/kad tidak mengubah keputusan.

### P1 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: PIRAMID
Tapak persegi dan
4 muka segi tiga.
```

### P2 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: PIRAMID
V=luas tapak*t/3
Tapak persegi: a^2
```

### P3 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: PIRAMID
1 segi empat sama,
4 segi tiga dilipat.
```

### S1 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: SILINDER
2 tapak bulat sama;
sisi melengkung.
```

### S2 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: SILINDER
V=luas tapak*t
L=2*pi*j^2+2*pi*j*t
```

### S3 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: SILINDER
2 bulatan sama saiz;
1 segi empat tepat.
```

### K1 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
6 muka segi empat
sama saiz dan bentuk
```

### K2 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
V=a*a*a; a=rusuk
L=6 muka, tiap a^2
```

### K3 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KUBUS
6 petak sama saiz
dilipat jadi 6 muka.
```

### C1 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KON
V=luas tapak*t/3
Tapak bulat: pi*j^2
```

### C2 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KON
L=tapak+luas sisi
pi*j^2 + pi*j*s
```

### C3 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KON
1 sektor jadi sisi;
1 bulatan jadi tapak
```

### B1 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KUBOID
Panjang,lebar,tinggi
3 ukuran berbeza.
```

### B2 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KUBOID
V=luas tapak*t
Tapak=p*l; tinggi=t
```

### B3 - salah

```text
SALAH +0 NEXT:Terus
Jawapan: KUBOID
2 muka setiap saiz:
6x4, 6x3 dan 4x3 cm
```
