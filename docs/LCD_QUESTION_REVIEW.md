# Semakan soalan dan hint GeoDecoder

Tarikh: 24 Oktober 2026

Baris pertama LCD menunjukkan nombor soalan, tahap R1/R2, masa dan skor. Tiga baris berikutnya digunakan untuk soalan atau hint. Setiap baris ialah ASCII dan tidak melebihi 20 aksara. `main/question_bank.h` ialah sumber runtime.

Semua 15 ID dan jenis jawapan dikekalkan. Setiap bongkah mempunyai dua soalan ciri bentuk/rumus dan satu soalan bentangan. Setiap soalan memerlukan kad bongkah R1 dahulu, kemudian kad bentangan R2 yang sepadan; +1 hanya selepas kedua-duanya betul. Piramid merujuk kepada tapak segi empat sama.

Notasi: V = isi padu, L = luas permukaan, j = jejari, t = tinggi, s = tinggi sendeng, a = panjang rusuk atau sisi tapak, p/l/t = panjang/lebar/tinggi. pi, * dan ^ digunakan untuk LCD ASCII.

Soalan bentangan menguji bentuk atau lipatan. Ukuran kotak dalam B3 membezakan rusuk yang berlainan tanpa meminta pengiraan isi padu.

## Dokumentasi A4 terkini

- [PDF 15 halaman](lcd/GeoDecoder_15_Contoh_LCD_Soalan_dan_Hint.pdf)
- [Set 15 PNG](lcd/GeoDecoder_15_Contoh_LCD_PNG.zip)

Semua halaman menggunakan satu templat A4 landskap yang tetap, dengan LCD soalan dan hint bersebelahan. Baris ID soalan dan label dimensi LCD telah dibuang daripada reka letak PDF; garisan emas berada dalam lengkungan banner. Petunjuk simbol menggunakan istilah Buku Teks Matematik Tingkatan 2 KSSM, Bab 6.

## Pratonton setiap soalan

Nombor dan masa di bawah ialah contoh simulasi daripada kod semasa. Setiap soalan ditunjukkan sebagai soalan pertama pada tahap R1 dalam pusingan lima soalan. Hint dibuka lima saat kemudian. Selepas kad bongkah betul, label tahap menjadi R2; isi soalan/hint kekal sama.

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
Q1/5 R1 00:14   S0/5
Pilih bentangan bagi
1 segi empat sama   
dan 4 segi tiga.    
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
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
Q1/5 R1 00:14   S0/5
Pilih bentangan yang
ada 1 sektor bulatan
dan 1 bulatan.      
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
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
Q1/5 R1 00:14   S0/5
Pilih bentangan:    
6 segi empat sama,  
semuanya sama saiz. 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
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
Q1/5 R1 00:14   S0/5
Kotak: 6cm x 4cm    
dengan tinggi 3cm.  
Pilih bentangannya. 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
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
Q1/5 R1 00:14   S0/5
Pilih bentangan:    
2 bulatan sama saiz,
1 segi empat tepat. 
```

Selepas tekan HINT

```text
Q1/5 R1 00:19   S0/5
HINT: Lengkungkan   
segi empat itu; dua 
bulatan jadi tapak. 
```

## Semakan dan batas ujian

- Semua 90 baris soalan dan hint disemak untuk had 20 aksara dan ASCII.
- Semua 30 bingkai di atas diperoleh dengan menjalankan `src/main.cpp` semasa melalui simulasi LCD dalam harness native.
- Metadata asal `Question.reader` dikekalkan untuk keserasian; tahap runtime menentukan pembaca aktif bagi flow dua kad.
- Perkakasan fizikal belum diuji dalam kemas kini ini. Semak kontras dan keterbacaan LCD selepas upload.
- Simbol rumus perlu diperkenalkan kepada murid sebelum bermain.
- Pratonton gambar dalam folder pakej asal ialah bahan terdahulu; semakan ini menunjukkan bank soalan terkini.
