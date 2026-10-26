# Glosari GeoDecoder BM–BI

Digunakan untuk lima bongkah sebenar dalam bank. Kod jawapan kekal bahasa-neutral.
Rujukan R1–R5 merujuk kepada [rekod sumber](DWI_LANGUAGE.md#rujukan-kurikulum-dan-status-sumber).
Istilah geometri diselaraskan dengan kandungan KSSM; label produk ialah ayat
editorial yang mudah dibaca. Jadual ini merumuskan istilah, bukan petikan panjang.

| BM | English | Penggunaan / perbezaan |
|---|---|---|
| Bongkah / bentuk tiga dimensi | Solid / three-dimensional shape | Objek dengan panjang, lebar dan tinggi; R1, R2, R4 |
| Bentuk dua dimensi | Two-dimensional shape | Bentuk pada satah; R1, R4 |
| Bentangan | Net | Susunan permukaan dibuka menjadi bentuk 2D; R1 6.2.1, R2 6.2.1, R3 |
| Kubus | Cube | `cube`; enam muka segi empat sama |
| Kuboid | Cuboid | `cuboid`; model contoh mempunyai tiga ukuran berbeza; bukan syarat umum bahawa setiap kuboid mesti tiga ukuran berlainan |
| Piramid bertapak segi empat sama | Square-based pyramid | `pyramid` ialah bentuk khusus yang dilukis projek; bukan semua piramid bertapak segi empat sama |
| Silinder | Cylinder | `cylinder`; tapak bulatan sama saiz dengan permukaan melengkung |
| Kon | Cone | `cone`; tapak bulatan dan puncak |
| Segi empat sama | Square | Istilah paparan untuk bentuk yang bank asal turut sebut persegi |
| Segi empat tepat | Rectangle | Muka contoh kuboid, bentangan permukaan melengkung silinder |
| Segi tiga | Triangle | Muka sisi piramid |
| Bulatan | Circle | Tapak silinder/kon |
| Sektor bulatan | Sector of a circle | Bahagian bulatan pada bentangan kon; bukan segi tiga |
| Sisi | Side | Garis sempadan poligon 2D; jangan guna side untuk semua permukaan bongkah |
| Tepi (bank asal: rusuk) | Edge | Pertemuan muka; istilah paparan tepi, alias asal disimpan dalam rujukan |
| Bucu | Vertex; vertices (jamak) | Titik pertemuan tepi mengikut konteks bongkah/poligon |
| Puncak | Apex | Titik hujung piramid/kon dalam penerangan lipatan; istilah lebih khusus daripada vertex |
| Muka | Face | Bezakan muka rata daripada permukaan melengkung |
| Permukaan rata | Flat surface | Sifat permukaan, bukan nama bongkah |
| Permukaan melengkung | Curved surface | Istilah paparan menggantikan frasa ringkas sisi melengkung dalam hint sumber; R4 hlm. 106 |
| Muka sisi | Lateral face | Muka segi tiga yang bertemu pada puncak piramid |
| Tapak | Base | Bentuk yang menjadi tapak bongkah |
| Tapak bulatan | Circular base | Tapak silinder/kon; R4 hlm. 106 |
| Muka berhadapan | Opposite faces | Pasangan muka kuboid |
| Panjang | Length | `p` dalam rumus asal kuboid |
| Lebar | Width | `l` dalam rumus asal kuboid |
| Tinggi | Height | `t` dalam rumus asal |
| Tinggi sendeng | Slant height | `s`; garis lurus pada permukaan dari tepi tapak ke puncak kon; R4 hlm. 106 |
| Jejari | Radius | `j` dalam rumus sumber; jangan tukar ke `r` pada satu label sahaja |
| Luas tapak | Base area | `a^2` untuk tapak segi empat sama |
| Luas permukaan | Surface area | `L` dalam bank; R1/R2 6.3.1 |
| Isi padu | Volume | `V` dalam bank |
| Lilitan | Circumference | Sempadan bulatan |
| Lengkok | Arc | Lengkok sektor kon dipadankan dengan lilitan tapak |
| Sama saiz | Same size | Saiz, bukan semata-mata rupa |
| Lipat / buka bentangan | Fold / unfold | Penerangan tindakan; R1/R2 6.2.1 |

## Label pandangan untuk kontrak modul

| BM | English | Had penggunaan |
|---|---|---|
| Pandangan atas | Top view | Pelan apabila unjuran ortogon |
| Pandangan bawah | Bottom view | Label penerangan; bukan sinonim pelan |
| Pandangan hadapan | Front view | Arah model perlu ditetapkan dahulu |
| Pandangan belakang | Back view | Arah bertentangan pandangan hadapan |
| Pandangan kiri | Left view | Berdasarkan orientasi model yang dinyatakan |
| Pandangan kanan | Right view | Berdasarkan orientasi model yang dinyatakan |
| Pelan | Plan | Topik Pelan dan Dongakan / Plans and Elevations, KSSM Tingkatan 3 |
| Dongakan hadapan | Front elevation | Unjuran ortogon hadapan |
| Dongakan sisi | Side elevation | Unjuran ortogon sisi |

Label arah disediakan untuk penggunaan kemudian; tiada UI modul 3D/pelan dibina
atau digabungkan dalam kerja bahasa ini. Jangan menukar perspektif kamera
kepada dakwaan pelan/dongakan tanpa unjuran geometri yang betul.
