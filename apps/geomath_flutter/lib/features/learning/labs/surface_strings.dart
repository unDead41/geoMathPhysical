import '../../../core/features/feature_localizations.dart';

final learningSurfaceStrings = FeatureLocalizations(
  namespace: 'learning_surface',
  translations: const {
    'ms': {
      'areaMode': 'Cara meneroka luas',
      'compositeMode': 'Pilih gabungan',
      'closed': 'Bongkah tertutup',
      'container': 'Bekas terbuka',
      'cavity': 'Rongga tembus',
      'roof': 'Kubus + piramid',
      'rocket': 'Silinder + kon',
      'guide': 'Panduan aktiviti',
      'closedGuide':
          'Pilih satu daripada 11 bongkah. Buka bentangan apabila tersedia, '
          'pilih setiap permukaan dan bandingkan jumlah luas dengan rumusnya.',
      'containerGuide':
          'Pilih bekas kuboid atau silinder. Buka atau tutup penutup dan '
          'bandingkan luas bahan. Model ini mengabaikan ketebalan dinding; '
          'kapasiti bekas kekal sama.',
      'cavityGuide':
          'Rongga segi empat tepat menembusi dari atas ke bawah. Kira '
          'dinding luar, dinding dalam dan dua bingkai tapak. Isi padu '
          'bahan ialah isi padu luar ditolak isi padu rongga.',
      'roofGuide':
          'Kubus dan piramid berkongsi tapak segi empat sama bersisi a. '
          'Pisahkan untuk melihat kedua-dua muka yang bertemu, kemudian '
          'cantum dan pilih hanya permukaan luar.',
      'rocketGuide':
          'Silinder dan kon berkongsi tapak bulatan berjejari j. '
          'Tinggi silinder h berbeza daripada tinggi tegak kon t. '
          'Cantum dan pilih hanya permukaan luar.',
      'interfaceRule':
          'Luas luar = jumlah luas dua bongkah − dua luas tapak bersama. '
          'Isi padu gabungan = jumlah kedua-dua isi padu.',
      'units':
          'Ukuran dalam cm, luas dalam cm² dan isi padu dalam cm³. '
          'Makmal menggunakan nilai penuh π; jumlah dikira sebelum pembundaran.',
      'roundRule':
          'Sfera dan hemisfera diteroka sebagai permukaan melengkung. '
          'Kedua-duanya tidak mempunyai bentangan rata yang tepat.',
      'reflection': 'Ramalkan → Cuba → Semak → Terangkan',
      'guidedScope':
          'Latihan berpandu meliputi kubus, kuboid, piramid, silinder dan kon '
          'tertutup. Bentuk tambahan, bekas dan rongga ialah penerokaan.',
      'compositeScope':
          'Untuk melengkapkan refleksi, semak dua muka dalaman dan pilih '
          'semua permukaan luar, kemudian tulis penerangan sendiri.',
      'selfReflection': 'Rekod ialah refleksi kendiri, bukan gred penguasaan.',
    },
    'en': {
      'areaMode': 'Explore surface area',
      'compositeMode': 'Choose a composite',
      'closed': 'Closed solid',
      'container': 'Open container',
      'cavity': 'Through cavity',
      'roof': 'Cube + pyramid',
      'rocket': 'Cylinder + cone',
      'guide': 'Activity guide',
      'closedGuide':
          'Choose one of 11 solids. Open its net when available, select '
          'every surface and compare the total area with its formula.',
      'containerGuide':
          'Choose a cuboid or cylinder. Open or close the lid and compare '
          'the material area. This model ignores wall thickness; the '
          'container capacity stays the same.',
      'cavityGuide':
          'A rectangular cavity passes from top to bottom. Count the '
          'outer walls, inner walls and two base frames. Material volume '
          'is outer volume minus cavity volume.',
      'roofGuide':
          'The cube and pyramid share a square base of side a. Separate '
          'them to see both mating faces, then join them and select only '
          'the outer surfaces.',
      'rocketGuide':
          'The cylinder and cone share a circular base of radius j. '
          'Cylinder height h differs from the cone’s perpendicular height t. '
          'Join them and select only the outer surfaces.',
      'interfaceRule':
          'Outer area = sum of both solid areas − two shared base areas. '
          'Composite volume = sum of both volumes.',
      'units':
          'Lengths use cm, areas cm² and volumes cm³. Labs use the full '
          'value of π; totals are calculated before rounding.',
      'roundRule':
          'Explore spheres and hemispheres as curved surfaces. Neither '
          'has an exact flat net.',
      'reflection': 'Predict → Try → Check → Explain',
      'guidedScope':
          'Guided practice covers the closed cube, cuboid, pyramid, '
          'cylinder and cone. Extra solids, containers and cavities '
          'remain exploratory.',
      'compositeScope':
          'To complete a reflection, check the two internal faces and '
          'select every outer surface, then write your own explanation.',
      'selfReflection':
          'Records are self-directed reflections, not mastery grades.',
    },
  },
);
