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

## Galeri poligon dan isi pilihan v1.3.0

preset-nets.mjs menambah prisma tegak bertapak poligon sekata n=3/5/6 dan piramid
bertapak segi tiga sama sisi. Bentangan prisma ialah n segi empat tepat berjajar,
dengan dua tapak pada sisi bertentangan muka pertama. Jalur sisi melilit melalui
sudut luaran 2π/n; dua tapak menutup selepas jalur hampir lengkap. Setiap muka
kekal tegar dan kedua-dua titik engsel ibu-anak sentiasa bertemu. Piramid segi
tiga memutarkan tiga muka sisi pada tiga rusuk tapak melalui putaran paksi
Rodrigues. Kamera/alihan satah tidak menukar panjang atau luas. Keadaan rata
pada satu satah dan penutupan tanpa celah dibuktikan dalam ujian geometri.

Isi prisma tambahan = n a² t / (4 tan(π/n)). Isi piramid segi tiga = √3 a² t / 12.
a ialah sisi poligon sekata; t ialah tinggi tegak, bukan rusuk condong. Piramid
segi tiga di galeri mempunyai empat muka segi tiga sama sisi pada dimensi
lalainya; mod ukuran isi padu boleh menukar tinggi dan tidak mendakwa semua
empat muka masih sama sisi. Semua bentuk tambahan mempunyai tapak yang kekal
sekata, bukan poligon arbitrari atau bentuk cekung.

volume-lab.mjs mengira kapasiti dan isi semasa secara berasingan. Untuk pecahan
isi f, paras dalam prisma/silinder/kubus/kuboid ialah h×f; dalam piramid/kon ia
ialah h×(1−∛(1−f)) dari tapak luas ke puncak. Setiap muka mesh sebenar dipotong
pada satah paras itu dan penutup cecair ditambah, supaya isipadu yang dilukis
sepadan dengan f×V. Garisan bekas kekal penuh. Kedua-dua bongkah berkongsi skala
cm yang sama dalam adegan; pemilihan jumlah tidak menyembunyikan isinya.

Ujian bebas mengira isi mesh menggunakan pecahan tetrahedron (10%, 50%, 100%)
untuk sembilan bentuk pada ukuran bukan default; toleransi 0.2% hanya untuk
paparan lengkung. Pengiraan jumlah menggunakan rumus analitik tanpa pembundaran.
Semua 101 bingkai poligon tambahan disemak panjang, luas dan titik engsel;
topologi akhir F/V/E dan pertindihan luas rata turut disemak.
