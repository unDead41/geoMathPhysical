import {MODEL_ORDER} from './content.mjs';
export const PI_MODES={'22/7':22/7,'3.142':3.142,full:Math.PI};
export const MEASURE_FIELDS={cube:['a'],cuboid:['p','l','t'],pyramid:['a','t'],cylinder:['j','t'],cone:['j','t'],'triangular-prism':['a','t'],tetrahedron:['a','t'],'pentagonal-prism':['a','t'],'hexagonal-prism':['a','t'],sphere:['j'],hemisphere:['j']};
export const FIELD_LABELS={a:'a · panjang sisi tapak',p:'p · panjang',l:'l · lebar',t:'t · tinggi tegak',j:'j · jejari tapak'};
export function readDimension(raw) {
  if(typeof raw==='number')return Number.isFinite(raw)?raw:NaN;
  if(typeof raw!=='string'||!/^\s*(?:\d+(?:[.,]\d*)?|[.,]\d+)\s*$/.test(raw))return NaN;
  return Number(raw.trim().replace(',','.'));
}
export function calculateMeasures(shape,input={},piMode='22/7') {
  const errors={},dimensions={},pi=PI_MODES[piMode];
  if(!MODEL_ORDER.includes(shape))errors.shape='Pilih bongkah pembelajaran yang tersedia.';
  if(!Object.hasOwn(PI_MODES,piMode))errors.pi='Pilih nilai anggaran π yang tersedia.';
  for(const field of MEASURE_FIELDS[shape]||[]){const n=readDimension(input[field]);if(!Number.isFinite(n)||n<.1||n>1000)errors[field]='Masukkan ukuran dari 0.1 hingga 1000 cm.';else dimensions[field]=n;}
  if(Object.keys(errors).length)return {valid:false,errors,area:null,volume:null,slant:null,areaParts:[],dimensions};
  const {a,p,l,t,j}=dimensions;let areaParts=[],volume,slant=null,baseArea=null,perimeter=null,apothem=null;
  if(shape==='cube'){areaParts=[{label:'6 muka segi empat sama',value:6*a*a}];volume=a**3;}
  if(shape==='cuboid'){areaParts=[{label:'2 muka p × l',value:2*p*l},{label:'2 muka p × t',value:2*p*t},{label:'2 muka l × t',value:2*l*t}];volume=p*l*t;}
  if(shape==='pyramid'){slant=Math.hypot(t,a/2);areaParts=[{label:'1 tapak segi empat sama',value:a*a},{label:'4 muka segi tiga',value:2*a*slant}];volume=a*a*t/3;}
  if(shape==='cylinder'){areaParts=[{label:'2 tapak bulatan',value:2*pi*j*j},{label:'1 permukaan melengkung',value:2*pi*j*t}];volume=pi*j*j*t;}
  if(shape==='cone'){slant=Math.hypot(j,t);areaParts=[{label:'1 tapak bulatan',value:pi*j*j},{label:'1 permukaan melengkung',value:pi*j*slant}];volume=pi*j*j*t/3;}
  const polygonSides={'triangular-prism':3,'pentagonal-prism':5,'hexagonal-prism':6,tetrahedron:3}[shape];
  if(polygonSides){
    perimeter=polygonSides*a;apothem=a/(2*Math.tan(Math.PI/polygonSides));baseArea=perimeter*apothem/2;
    if(shape==='tetrahedron'){
      slant=Math.hypot(t,apothem);areaParts=[{label:'1 tapak segi tiga sama sisi',value:baseArea},{label:'3 muka sisi segi tiga',value:perimeter*slant/2}];volume=baseArea*t/3;
    }else{areaParts=[{label:'2 tapak poligon sekata',value:2*baseArea},{label:polygonSides+' muka sisi segi empat tepat',value:perimeter*t}];volume=baseArea*t;}
  }
  if(shape==='sphere'){areaParts=[{label:'1 permukaan sfera',value:4*pi*j*j}];volume=4*pi*j*j*j/3;}
  if(shape==='hemisphere'){baseArea=pi*j*j;areaParts=[{label:'1 permukaan melengkung hemisfera',value:2*pi*j*j},{label:'1 tapak bulatan',value:baseArea}];volume=2*pi*j*j*j/3;}
  return {valid:true,errors,area:areaParts.reduce((sum,part)=>sum+part.value,0),volume,slant,areaParts,dimensions,pi,piMode,baseArea,perimeter,apothem};
}
export const LESSON_DATA={
 cube:{classification:'Kubus ialah prisma tegak dengan enam muka segi empat sama yang sama saiz.',everyday:'Bayangkan dadu atau kiub mainan. Putarkannya untuk mencari muka yang berhadapan.',defaults:{a:4},
  symbols:[['a','panjang rusuk kubus']],netParts:['6 segi empat sama yang sama saiz','Rusuk yang dicantum mesti sepadan panjangnya','Muka tidak boleh bertindih apabila dilipat'],
  surface:{formula:'L = 6a²',why:'Satu muka mempunyai luas a × a = a². Jumlahkan enam muka yang sama: L = 6 × a².',question:'Sebuah kiub tertutup mempunyai panjang rusuk 4 cm. Berapakah luas seluruh permukaannya?',steps:['Diberi a = 4 cm. Terdapat 6 muka yang sama saiz.','L = 6a²','L = 6 × 4² = 6 × 16','L = 96 cm²'],answer:'96 cm²'},
  volume:{formula:'V = a³',why:'Isi padu ialah ruang di dalam bongkah. Untuk kubus: panjang × lebar × tinggi = a × a × a.',question:'Berapa cm³ ruang dalam kubus yang bersisi 4 cm?',steps:['Diberi a = 4 cm. Semua tiga ukuran sama.','V = a³','V = 4 × 4 × 4','V = 64 cm³'],answer:'64 cm³'},
  mistakes:['6a² ialah luas permukaan, bukan isi padu.','Muka berhadapan tidak berkongsi rusuk.'],task:'Buka bentangan. Pilih satu muka, kemudian cari muka yang akan berhadapan dengannya apabila kubus dicantum.'},
 cuboid:{classification:'Kuboid ialah prisma tegak. Muka berhadapan sama bentuk dan sama saiz. Kubus ialah kes khas kuboid dengan semua ukuran sama.',everyday:'Kotak kasut atau kotak hadiah biasanya menyerupai kuboid. Contoh GeoDecoder menggunakan tiga ukuran yang berbeza.',defaults:{p:6,l:4,t:3},
  symbols:[['p','panjang'],['l','lebar (huruf kecil)'],['t','tinggi tegak']],netParts:['3 pasang muka segi empat tepat','Pasangan p × l, p × t dan l × t','Sisi yang bertemu mesti sama panjang'],
  surface:{formula:'L = 2(pl + pt + lt)',why:'Ada dua muka bagi setiap pasangan ukuran. Jumlahnya ialah 2pl + 2pt + 2lt.',question:'Sebuah kotak tertutup berukuran 6 cm × 4 cm × 3 cm. Cari luas seluruh permukaan kotak.',steps:['p = 6 cm, l = 4 cm, t = 3 cm.','L = 2(pl + pt + lt)','L = 2[(6 × 4) + (6 × 3) + (4 × 3)]','L = 2(24 + 18 + 12) = 108 cm²'],answer:'108 cm²'},
  volume:{formula:'V = plt',why:'Luas tapak p × l didarab dengan tinggi t. Bayangkan susunan beberapa lapisan kiub unit.',question:'Cari isi padu kuboid berukuran 6 cm × 4 cm × 3 cm.',steps:['p = 6 cm, l = 4 cm, t = 3 cm.','V = plt','V = 6 × 4 × 3','V = 72 cm³'],answer:'72 cm³'},
  mistakes:['Jangan jumlahkan panjang + lebar + tinggi untuk mencari isi padu.','L ialah luas permukaan; l (huruf kecil) ialah lebar.'],task:'Bandingkan pandangan atas, depan dan kanan. Padankan setiap pandangan dengan pasangan ukuran p × l, p × t atau l × t.'},
 pyramid:{classification:'Piramid GeoDecoder ialah piramid tegak bertapak segi empat sama. Puncaknya terletak tegak di atas pusat tapak.',everyday:'Bayangkan model bumbung piramid. Empat muka segi tiga bertemu pada satu puncak.',defaults:{a:6,t:4},
  symbols:[['a','panjang sisi tapak segi empat sama'],['t','tinggi tegak, dari pusat tapak ke puncak'],['s','tinggi sendeng muka segi tiga']],netParts:['1 tapak segi empat sama','4 muka segi tiga','Muka sisi bertemu pada puncak apabila dilipat'],
  surface:{formula:'L = a² + 2as',why:'Luas tapak ialah a². Empat muka segi tiga berjumlah 4 × ½ × a × s = 2as. Rumus ini untuk piramid tegak bertapak segi empat sama.',question:'Piramid bertapak segi empat sama mempunyai sisi tapak 6 cm dan tinggi tegak 4 cm. Cari luas permukaannya.',steps:['a = 6 cm, t = 4 cm. Tinggi sendeng s = √(4² + 3²) = 5 cm.','L = a² + 2as','L = 6² + (2 × 6 × 5)','L = 36 + 60 = 96 cm²'],answer:'96 cm²'},
  volume:{formula:'V = ⅓a²t',why:'Isi padu piramid ialah satu pertiga daripada prisma yang mempunyai luas tapak dan tinggi yang sama.',question:'Cari isi padu piramid yang sisi tapaknya 6 cm dan tinggi tegaknya 4 cm.',steps:['Luas tapak = 6² = 36 cm². Tinggi tegak t = 4 cm.','V = ⅓ × luas tapak × tinggi tegak','V = ⅓ × 36 × 4','V = 48 cm³'],answer:'48 cm³'},
  mistakes:['Gunakan s untuk luas muka segi tiga, tetapi t untuk isi padu.','Untuk mencari s: gunakan a/2, bukan a, dalam Teorem Pythagoras.'],task:'Hidupkan label dan buka bentangan. Kenal pasti tapak, kemudian jejaki keempat-empat muka segi tiga.'},
 cylinder:{classification:'Silinder tegak mempunyai dua tapak bulatan sama saiz yang selari dan satu permukaan melengkung. Silinder bukan prisma kerana tapaknya bukan poligon.',everyday:'Tin minuman menyerupai silinder. Dalam nota ini, kedua-dua tapak diambil kira kerana silinder tertutup.',defaults:{j:7,t:10},
  symbols:[['j','jejari tapak (separuh diameter)'],['t','tinggi tegak'],['π','gunakan anggaran yang dinyatakan dalam soalan']],netParts:['2 bulatan sama saiz','1 segi empat tepat berukuran 2πj × t','Panjang segi empat tepat sama dengan lilitan tapak'],
  surface:{formula:'L = 2πj² + 2πjt',why:'Dua bulatan menyumbang 2πj². Permukaan melengkung dibuka menjadi segi empat tepat: luasnya 2πj × t.',question:'Silinder tertutup berjejari 7 cm dan tinggi 10 cm. Cari luas permukaan; ambil π ≈ 22/7.',steps:['j = 7 cm, t = 10 cm. Terdapat 2 tapak bulatan.','L = 2πj² + 2πjt','L ≈ [2 × (22/7) × 7²] + [2 × (22/7) × 7 × 10]','L ≈ 308 + 440 = 748 cm²'],answer:'748 cm²'},
  volume:{formula:'V = πj²t',why:'Darab luas satu tapak bulatan, πj², dengan tinggi t. Bandingkan dengan kon yang mempunyai tapak dan tinggi sama.',question:'Silinder berjejari 7 cm dan tinggi 10 cm. Cari isi padu; ambil π ≈ 22/7.',steps:['j = 7 cm, t = 10 cm.','V = πj²t','V ≈ (22/7) × 7² × 10','V ≈ 1540 cm³'],answer:'1540 cm³'},
  mistakes:['Jika diameter diberi, bahagi dua dahulu untuk mendapatkan j.','Luas permukaan silinder tertutup merangkumi dua bulatan, bukan satu.'],task:'Buka bentangan. Perhatikan bagaimana satu permukaan melengkung menjadi segi empat tepat, bukannya beberapa muka berengsel.'},
 cone:{classification:'Kon tegak mempunyai satu tapak bulatan, satu permukaan melengkung dan satu puncak. Tinggi tegak dan tinggi sendeng berbeza.',everyday:'Bayangkan model kon tertutup. Kon ais krim tanpa penutup ialah contoh berbeza kerana tapaknya terbuka; rumus jumlah luas di sini termasuk tapak.',defaults:{j:3,t:4},
  symbols:[['j','jejari tapak'],['t','tinggi tegak, tegak lurus kepada tapak'],['s','tinggi sendeng, sepanjang sisi ke puncak']],netParts:['1 bulatan sebagai tapak','1 sektor bulatan, bukannya segi tiga','Jejari sektor ialah s; panjang lengkoknya 2πj'],
  surface:{formula:'L = πj² + πjs',why:'Jumlahkan luas tapak bulatan, πj², dan luas permukaan melengkung, πjs. Permukaan melengkung membentuk sektor apabila dibuka.',question:'Kon tertutup berjejari 3 cm dan tinggi tegak 4 cm. Cari luas permukaannya; ambil π ≈ 22/7 untuk nilai perpuluhan.',steps:['j = 3 cm, t = 4 cm; s = √(3² + 4²) = 5 cm.','L = πj² + πjs','L = π(3²) + π(3)(5) = 24π','L = 24π cm² ≈ 75.43 cm²'],answer:'24π cm² ≈ 75.43 cm²'},
  volume:{formula:'V = ⅓πj²t',why:'Kon mempunyai satu pertiga isi padu silinder yang luas tapak dan tinggi tegaknya sama.',question:'Kon berjejari 3 cm dan tinggi tegak 4 cm. Cari isi padu; ambil π ≈ 22/7 untuk nilai perpuluhan.',steps:['j = 3 cm, t = 4 cm. Gunakan t, bukan tinggi sendeng s.','V = ⅓πj²t','V = ⅓ × π × 3² × 4 = 12π','V = 12π cm³ ≈ 37.71 cm³'],answer:'12π cm³ ≈ 37.71 cm³'},
  mistakes:['Sektor bulatan bukan segi tiga; lengkoknya mesti sepadan lilitan tapak.','Tinggi sendeng s digunakan untuk luas, manakala tinggi tegak t digunakan untuk isi padu.'],task:'Buka bentangan. Jejaki lengkok sektor yang akan bercantum semula di sekeliling tapak bulatan.'}
};
const prismLessonSpecs={
 'triangular-prism':{n:3,polygon:'segi tiga sama sisi',A:'4√3',twiceA:'8√3',volume:'24√3',areaAnswer:'85.86',volumeAnswer:'41.57',context:'Model bumbung yang memanjang boleh menyerupai prisma segi tiga.'},
 'pentagonal-prism':{n:5,polygon:'segi lima sekata',A:'4√(25 + 10√5)',twiceA:'8√(25 + 10√5)',volume:'24√(25 + 10√5)',areaAnswer:'175.06',volumeAnswer:'165.17',context:'Bayangkan satu bekas dengan dua hujung berbentuk segi lima sekata.'},
 'hexagonal-prism':{n:6,polygon:'segi enam sekata',A:'24√3',twiceA:'48√3',volume:'144√3',areaAnswer:'227.14',volumeAnswer:'249.42',context:'Badan pensel bersegi enam boleh membantu anda membayangkan prisma segi enam.'}
};
function learningPrismLesson(spec){
 const {n,polygon,A,twiceA,volume,areaAnswer,volumeAnswer,context}=spec,P=4*n,lateral=P*6;
 return {
  classification:'Model ini ialah prisma tegak dengan dua tapak '+polygon+' yang kongruen dan selari. Terdapat '+n+' muka sisi segi empat tepat. Tapaknya kekal sekata apabila ukuran diubah.',
  everyday:context+' Prisma lain boleh mempunyai tapak poligon yang berbeza.',defaults:{a:4,t:6},
  symbols:[['a','panjang satu sisi tapak sekata'],['t','tinggi tegak antara kedua-dua tapak'],['A','luas satu tapak'],['P','perimeter satu tapak']],
  netParts:['2 tapak '+polygon+' yang sama saiz',n+' muka sisi segi empat tepat','Jumlah lebar jalur sisi sama dengan perimeter tapak P'],
  surface:{formula:'L = 2A + Pt',why:'Dua tapak menyumbang 2A. Jumlah luas '+n+' muka sisi ialah perimeter tapak P didarab tinggi tegak t. Nilai A dihitung daripada tapak sekata dalam model; untuk latihan, A boleh diberi tanpa menerbitkan rumus poligon.',
   question:'Satu prisma tegak mempunyai tapak '+polygon+' bersisi 4 cm dan tinggi 6 cm. Diberi luas satu tapak A = '+A+' cm². Cari luas permukaan model tertutup ini.',
   steps:['A = '+A+' cm², P = '+n+' × 4 = '+P+' cm dan t = 6 cm.','L = 2A + Pt','L = '+twiceA+' + ('+P+' × 6) = '+twiceA+' + '+lateral,'L ≈ '+areaAnswer+' cm²; bundarkan selepas menjumlahkan.'],answer:areaAnswer+' cm²'},
  volume:{formula:'V = At',why:'Setiap keratan yang selari dengan tapak mempunyai luas A yang sama. Darab luas tapak dengan tinggi tegak t. Pengiraan menggunakan nilai A penuh, bukan nilai yang telah dibundarkan.',
   question:'Model prisma yang sama mempunyai luas tapak A = '+A+' cm² dan tinggi 6 cm. Berapakah isi padunya?',
   steps:['A = '+A+' cm² dan t = 6 cm.','V = A × t','V = ('+A+') × 6 = '+volume,'V ≈ '+volumeAnswer+' cm³.'],answer:volumeAnswer+' cm³'},
  mistakes:['Dua tapak perlu dikira dalam luas permukaan prisma tertutup.','Gunakan luas satu tapak A untuk isi padu, bukannya perimeter P.','Tapak contoh ini sekata; luas tapak prisma umum boleh diberi secara berasingan.'],
  task:'Buka bentangan. Kira '+n+' muka sisi dan dua tapak. Bandingkan jumlah lebar muka sisi dengan perimeter tapak.'
 };
}
for(const [key,spec] of Object.entries(prismLessonSpecs))LESSON_DATA[key]=learningPrismLesson(spec);
Object.assign(LESSON_DATA,{
 tetrahedron:{classification:'Piramid tegak ini mempunyai tapak segi tiga sama sisi dan puncak tepat di atas pusat tapak. Terdapat empat muka segi tiga semuanya. Muka sisi tidak semestinya sama sisi apabila tinggi diubah.',
  everyday:'Bayangkan bungkusan berbentuk piramid bertapak segi tiga. Nama tetrahedron merujuk kepada empat muka segi tiganya.',defaults:{a:6,t:4},
  symbols:[['a','panjang sisi tapak segi tiga sama sisi'],['t','tinggi tegak dari pusat tapak ke puncak'],['u','jarak pusat tapak ke titik tengah satu sisi tapak'],['s','tinggi sendeng satu muka sisi'],['A','luas tapak segi tiga'],['P','perimeter tapak']],
  netParts:['1 tapak segi tiga sama sisi','3 muka sisi segi tiga','Tiga muka sisi bertemu pada puncak selepas dilipat'],
  surface:{formula:'L = A + ½Ps',why:'Tapak mempunyai luas A. Tiga muka sisi berjumlah ½ × perimeter tapak P × tinggi sendeng s. Untuk model ini, s = √(t² + u²). Jarak u ialah apotem tapak, bukannya a/2.',
   question:'Piramid bertapak segi tiga sama sisi mempunyai sisi tapak 6 cm dan tinggi tegak 4 cm. Diberi A = 9√3 cm² dan u = √3 cm. Cari luas permukaannya.',
   steps:['P = 3 × 6 = 18 cm; s = √(4² + (√3)²) = √19 cm.','L = A + ½Ps','L = 9√3 + ½(18)(√19) = 9√3 + 9√19','L ≈ 54.82 cm².'],answer:'54.82 cm²'},
  volume:{formula:'V = ⅓At',why:'Darab luas satu tapak A dengan tinggi tegak t, kemudian bahagi tiga. Hubungan satu pertiga menggunakan prisma yang mempunyai luas tapak dan tinggi tegak yang sama.',
   question:'Piramid yang sama mempunyai luas tapak 9√3 cm² dan tinggi tegak 4 cm. Cari isi padunya.',
   steps:['A = 9√3 cm² dan t = 4 cm.','V = ⅓ × A × t','V = ⅓ × 9√3 × 4 = 12√3','V ≈ 20.78 cm³.'],answer:'20.78 cm³'},
  mistakes:['Terdapat tiga muka sisi dan satu tapak; jumlahnya empat muka.','Jarak pusat tapak ke tengah sisi u tidak sama dengan a/2.','Gunakan t untuk isi padu dan s untuk luas muka sisi.'],
  task:'Jejaki satu muka sisi pada bentangan. Bezakan tinggi tegak t daripada tinggi sendeng s pada rajah ukuran.'},
 sphere:{classification:'Sfera mempunyai satu permukaan melengkung, tiada muka rata, tiada rusuk dan tiada bucu. Semua titik pada permukaannya berjarak sama dari pusat.',
  everyday:'Bola yang hampir bulat membantu membayangkan sfera. Dalam pengiraan ini, sfera dianggap sempurna.',defaults:{j:4},
  symbols:[['j','jejari sfera, dari pusat ke permukaan'],['π','nilai pi yang dipilih untuk aktiviti']],
  netParts:['Sfera tiada bentangan rata yang tepat.','Bulatan pada pandangan ortografik bukan seluruh permukaan sfera yang dibuka.','Permukaan sfera hanya boleh diratakan dengan regangan atau penghampiran.'],
  surface:{formula:'L = 4πj²',why:'Gunakan rumus luas permukaan sfera. Luas ini bersamaan empat kali luas bulatan yang mempunyai jejari sama, tetapi empat bulatan itu bukan bentangan sfera.',
   question:'Sfera berjejari 4 cm. Cari luas permukaannya; ambil π ≈ 22/7 untuk jawapan perpuluhan.',
   steps:['j = 4 cm.','L = 4πj²','L = 4 × π × 4² = 64π','L ≈ 201.14 cm².'],answer:'64π cm² ≈ 201.14 cm²'},
  volume:{formula:'V = 4πj³/3',why:'Gunakan empat pertiga darab π darab kuasa tiga jejari. Jika diameter diberi, bahagi dua untuk mendapatkan jejari dahulu.',
   question:'Sfera yang sama berjejari 4 cm. Cari isi padunya; ambil π ≈ 22/7 untuk jawapan perpuluhan.',
   steps:['j = 4 cm.','V = (4/3) × πj³','V = (4/3) × π × 4³ = (256/3)π','V ≈ 268.19 cm³.'],answer:'(256/3)π cm³ ≈ 268.19 cm³'},
  mistakes:['Jejari ialah separuh diameter.','Luas menggunakan j² dan unit persegi; isi padu menggunakan j³ dan unit padu.','Sfera tiada bentangan rata yang tepat.'],
  task:'Bandingkan keenam-enam pandangan sfera. Terangkan mengapa setiap pandangan berbentuk bulatan sedangkan model ialah objek tiga dimensi.'},
 hemisphere:{classification:'Hemisfera ialah separuh sfera. Model tertutup ini mempunyai satu permukaan melengkung dan satu tapak bulatan rata. Bahagian tapak perlu dikira dalam jumlah luas permukaan.',
  everyday:'Bayangkan separuh bola pepejal yang dipotong melalui pusat. Muka potongannya ialah bulatan.',defaults:{j:3},
  symbols:[['j','jejari hemisfera dan tapak bulatan'],['π','nilai pi yang dipilih untuk aktiviti']],
  netParts:['Tapak bulatan boleh dilukis rata.','Bahagian melengkung hemisfera tiada bentangan rata yang tepat.','Pandangan separuh bulatan ialah keratan atau unjuran, bukannya bentangan permukaan melengkung.'],
  surface:{formula:'L = 2πj² + πj² = 3πj²',why:'Permukaan melengkung ialah separuh luas sfera, iaitu 2πj². Tambah luas tapak πj² untuk mendapatkan luas seluruh hemisfera tertutup. Jika hanya permukaan melengkung diminta, gunakan 2πj².',
   question:'Hemisfera tertutup berjejari 3 cm. Cari luas seluruh permukaannya; ambil π ≈ 22/7 untuk jawapan perpuluhan.',
   steps:['j = 3 cm. Luas melengkung = 2π × 3² = 18π cm².','Luas tapak = π × 3² = 9π cm².','Jumlah L = 18π + 9π = 27π','L ≈ 84.86 cm².'],answer:'27π cm² ≈ 84.86 cm²'},
  volume:{formula:'V = ⅔πj³',why:'Isi padu hemisfera ialah separuh isi padu sfera yang mempunyai jejari sama. Jadi, V = ½ × (4/3)πj³ = ⅔πj³.',
   question:'Hemisfera berjejari 3 cm. Cari isi padunya; ambil π ≈ 22/7 untuk jawapan perpuluhan.',
   steps:['j = 3 cm.','V = ⅔πj³','V = ⅔ × π × 3³ = 18π','V ≈ 56.57 cm³.'],answer:'18π cm³ ≈ 56.57 cm³'},
  mistakes:['2πj² hanya luas permukaan melengkung, bukan jumlah luas hemisfera tertutup.','Gunakan jejari yang sama bagi tapak bulatan dan bahagian sfera.','Tapak rata tidak menambah isi padu dalam model tanpa ketebalan.'],
  task:'Bandingkan luas permukaan melengkung dengan luas tapak dalam pecahan luas di bawah. Terangkan bahagian yang diambil kira dalam jumlah.'}
});
export const COMPOSITE_EXAMPLE={side:6,roofHeight:4,roofSlant:5,externalArea:240,volume:264};
export const UNIT_FACTS=[['Panjang','1 m = 100 cm'],['Luas','1 m² = 10 000 cm²'],['Isi padu','1 m³ = 1 000 000 cm³'],['Kapasiti','1 L = 1000 cm³; 1 cm³ = 1 mL']];
