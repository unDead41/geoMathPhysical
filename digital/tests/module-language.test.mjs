import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {MODULE_COPY} from '../dist/module-copy.mjs';
import {installModuleLanguage} from '../dist/module-language.mjs';
const language=()=>installModuleLanguage({language:'en',catalog:MODULE_COPY,document:null,window:null});

test('module copy translates complete explanations and changing counts without touching formula symbols or IDs',()=>{
  const i18n=language();
  assert.equal(i18n.translate('Kubus'),'Cube');
  assert.equal(i18n.translate('6 / 6 muka'),'6 / 6 faces');
  assert.equal(i18n.translate('Baris 4, lajur 2, muka 6'),'Row 4, column 2, face 6');
  assert.equal(i18n.translate('2 / 3 tuangan lengkap · Penerima 66.67% penuh.'),'2 / 3 complete pours · Receiver 66.67% full.');
  assert.equal(i18n.translate('L = 2(pl + pt + lt); V = πj²t'),'L = 2(pl + pt + lt); V = πj²t');
  assert.equal(i18n.translate('cube-net-17'),'cube-net-17');
  assert.equal(i18n.translate('0 / 6 permukaan dipilih'),'0 / 6 surfaces selected');
  assert.equal(i18n.translate('Piramid dan prisma mempunyai tapak segi empat sama sama saiz.'),'The pyramid and prism have square bases of the same size.');
});

test('module translator remains self-contained after serialization into the sandbox',()=>{
  const copy=vm.runInNewContext('('+installModuleLanguage.toString()+')({language:"en",catalog:'+JSON.stringify(MODULE_COPY)+',document:null,window:null})');
  assert.equal(copy.translate('Tetapan permainan dan modul'),'Game and module settings');
  assert.equal(copy.translate('BENTANGAN KUBUS · MUKA BERNOMBOR'),'CUBE NET · NUMBERED FACES');
  copy.setLanguage('ms');assert.equal(copy.translate('Pilih semua permukaan'),'Pilih semua permukaan');
});

test('module lab navigation sublabels use complete English action phrases',()=>{
  const i18n=language();
  assert.equal(i18n.translate('Susun dan lipat kubus'),'Arrange and fold a cube');
});

test('module activity descriptions and surface navigation have complete English labels',()=>{
  const i18n=language();
  for(const [source,english] of [
    ['Aktiviti bina bentangan','Net-building activity'],
    ['Aktiviti bongkah gabungan','Composite solid activity'],
    ['Aktiviti isi padu','Volume activity'],
    ['Aktiviti terbitkan rumus','Formula derivation activity'],
    ['Jejaki permukaan','Follow surfaces']
  ])assert.equal(i18n.translate(source),english);
});

test('module joining-edge guidance and validation errors are fully English',()=>{
  const i18n=language();
  for(const [source,english] of [
    ['Sisi yang bertemu mesti sama panjang','Sides that meet must have the same length'],
    ['Ukuran bongkah tidak sah.','Invalid solid measurements.'],
    ['Tinggi silinder tidak sah.','Invalid cylinder height.']
  ])assert.equal(i18n.translate(source),english);
});
