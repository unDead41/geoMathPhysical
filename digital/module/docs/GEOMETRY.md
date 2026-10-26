# Model geometri dan jaminan yang diuji

## Panel rata

Kubus dan kuboid menggunakan muka depan sebagai akar. Empat muka bersebelahan
berputar pada rusuknya; muka belakang bergantung pada muka kanan. Transformasi
anak mengikut transformasi induk. Semua panel ialah transformasi tegar, maka
panjang sisi, diagonal, sudut dan luas panel kekal. Bentangan akhir mempunyai
empat muka sebaris dan satu muka di atas/bawah muka akar.

Piramid tegak bertapak segi empat sama mempunyai sisi tapak a=2.4 dan tinggi
h=2.6 unit model. Tinggi sendeng muka segi tiga ialah √(h²+(a/2)²). Empat segi tiga
berputar pada empat rusuk tapak; seluruh objek diputar secara tegar supaya
bentangan akhirnya terletak pada satah XY. Ukuran ini tidak mengubah definisi
piramid dalam bank. Kuboid berskala 3:2:1.5, bersamaan nisbah 6:4:3 soalan B3.

## Silinder

Ambil u sebagai panjang lengkok bahan, y sebagai arah tinggi dan k sebagai
kelengkungan yang berkurang berterusan daripada 1/r ke 0:

P(u,y) = (sin(ku)/k, y, (cos(ku)−1)/k).

Had k→0 ialah (u,y,0). |∂P/∂u|=1, |∂P/∂y|=1 dan kedua-duanya serenjang.
Jadi lembaran melengkung tidak diregangkan; lebar akhirnya tepat 2πr. Bentangan
ialah segi empat tepat 2πr × h dan dua bulatan jejari r pada sisi bertentangan.
Tapak dibuka dahulu di sekitar tangen tengah, selepas pemotongan sempadan.

## Kon

r=1, h=2.4 dan tinggi sendeng l=2.6, dengan l²=r²+h². Sudut sektor bahan
β berada pada [−πr/l, πr/l]. Untuk setiap α daripada asin(r/l) ke π/2, tetapkan
A=sin α, Q=cos α, φ=β/A. Sebelum putaran tegar seluruh lembaran:

P(s,β) = (s A sin φ, −s(Q² + A² cos φ), s A Q(cos φ−1)).

Metrik sentiasa ds²+s²dβ²: |∂P/∂s|=1, |∂P/∂β|=s dan hasil darab titik=0.
Ini keluarga pembangunan permukaan kon yang licin, bukannya engsel jalur
poligon. Pada bingkai akhir, lembaran menjadi sektor bulatan berjari-jari l,
sudut 2πr/l. Panjang lengkok ialah l(2πr/l)=2πr, sepadan lilitan tapak.
Bulatan tapak kekal jejari r dan bersentuh dengan tengah lengkok sektor.

## Paparan dan semakan

144 jalur untuk lengkung utama, 64 bagi gambar kecil; tepi jalur dalaman tidak
dilukis sebagai rusuk. Persamaan analitik berterusan menentukan vertex setiap
bingkai. Luas anggaran mesh diuji dengan 512 jalur terhadap luas analitik.
Nombor muka dan warna tidak berubah sepanjang proses. Garis putus-putus
menunjukkan garis potong, bukan rusuk baharu pada permukaan melengkung.

Kamera sentiasa ortografik: putaran 3D diikuti unjuran linear X/Y, tanpa
pembahagian perspektif. Enam pratetap diuji terhadap lebar/tinggi sebenar objek.
Paparan atas kon menandakan titik puncak; pandangan bawah menunjukkan tapaknya.
Garis terlindung tidak dipaparkan.

Ujian menyemak topologi tertutup; setiap panel tegar pada 101 tahap; bentangan
planar tanpa pertindihan panel; rangkaian sambungan panel; metrik silinder/kon;
luas, jejari, lilitan dan titik sentuh; enam kamera; serta 1001 tahap per bongkah
untuk nilai finite, kesinambungan dan identiti muka. Tiada dakwaan ketepatan
piksel yang tidak terhingga: pelukisan lengkung dan depth sorting ialah
penghampiran grafik bagi model analitik yang diuji.

