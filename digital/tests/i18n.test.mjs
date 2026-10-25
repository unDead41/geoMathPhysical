import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createI18n, translate, localizeQuestion, MESSAGES, QUESTION_COPY, SHAPE_COPY, LANGUAGE_KEY} from '../dist/i18n.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {csvScores, ScoreStore, LEGACY_SCORE_KEY} from '../dist/storage.mjs';
import {RULESET, VERSION} from '../dist/core.mjs';

const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
test('language defaults to BM, persists English and rejects unsupported input',()=>{
  const storage=memory(),i=createI18n(storage);
  assert.equal(i.language,'ms');assert.equal(i.setLanguage('en'),true);
  assert.equal(storage.getItem(LANGUAGE_KEY),'en');assert.equal(createI18n(storage).language,'en');
  assert.equal(i.setLanguage('fr'),false);assert.equal(i.language,'en');
  storage.setItem(LANGUAGE_KEY,'<script>');assert.equal(createI18n(storage).language,'ms');
});
test('language changes still work when browser preference storage is denied',()=>{
  const i=createI18n({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});
  assert.equal(i.language,'ms');i.setLanguage('en');assert.equal(i.language,'en');
});
test('both languages cover identical keys and interpolate without leaking key names',()=>{
  assert.deepEqual(Object.keys(MESSAGES.ms).sort(),Object.keys(MESSAGES.en).sort());
  assert.equal(translate('en','question.counter',{number:'03',total:10}),'QUESTION 03 / 10');
  assert.equal(translate('ms','question.counter',{number:'03',total:10}),'SOALAN 03 / 10');
  assert.equal(translate('en','question.counter',{number:'15',total:15}),'QUESTION 15 / 15');
  assert.equal(translate('ms','question.counter',{number:'15',total:15}),'SOALAN 15 / 15');
  for(const locale of ['ms','en'])for(const [key,value] of Object.entries(MESSAGES[locale]))assert.ok(typeof value==='string'&&value.trim(),`${locale}:${key}`);
});
test('all 15 translated questions preserve IDs, answer shapes, numbers and formula symbols without mutating source',()=>{
  const before=JSON.stringify(QUESTIONS);
  assert.deepEqual(Object.keys(QUESTION_COPY).sort(),QUESTIONS.map(q=>q.id).sort());
  for(const q of QUESTIONS){
    const en=localizeQuestion(q,'en'),ms=localizeQuestion(q,'ms');
    assert.equal(en.id,q.id);assert.equal(en.shape,q.shape);assert.equal(ms.id,q.id);assert.equal(ms.shape,q.shape);
    assert.ok(en.prompt&&en.hint&&en.lines.length);assert.notEqual(en.prompt,q.prompt);
    const formulas=q.prompt.match(/[VL]=[^; ]+/g)||[];
    for(const formula of formulas)assert.ok(en.prompt.includes(formula),`${q.id}:${formula}`);
    assert.deepEqual(en.prompt.match(/\d+/g),q.prompt.match(/\d+/g),q.id);
  }
  assert.equal(JSON.stringify(QUESTIONS),before);
});
test('practice accessibility progress and transitions announce the true fifteen-question total',()=>{
  for(const language of ['ms','en'])for(const key of ['question.progress','round.next','round.single','leave.count']){
    const speech=translate(language,key,{number:15,total:15,score:10,mistakes:3,skipped:2});
    assert.ok(speech.includes(language==='ms'?'15 daripada 15':'15 of 15'),`${language}:${key}:${speech}`);
  }
});
test('descriptions distinguish a pyramid apex and a cone curved surface',()=>{
  assert.match(SHAPE_COPY.en.pyramid.solid,/apex/);assert.match(SHAPE_COPY.en.cone.solid,/curved surface/);
  assert.match(SHAPE_COPY.ms.cylinder.solid,/permukaan melengkung/);
});
test('BM presentation uses KSSM surface and edge terms while preserving the source bank',()=>{
  const q=QUESTIONS.find(q=>q.id==='S1');
  assert.match(localizeQuestion(q,'ms').hint,/permukaan melengkung/);
  assert.match(localizeQuestion(QUESTIONS.find(q=>q.id==='K2'),'ms').prompt,/panjang tepi/);
  assert.match(q.hint,/sisi melengkung/);
});
test('English CSV localizes headers and category while stored legacy/new records keep stable values',()=>{
  const storage=memory(),store=new ScoreStore(storage);
  const old={id:'old',version:'1.0.0',player:{name:'Aisyah',category:'Murid',className:'1 Bestari'},score:10,total:10,mistakes:0,hints:0,skipped:0,firstTry:10,elapsed:30000,completedAt:10000};
  storage.setItem(LEGACY_SCORE_KEY,JSON.stringify([old]));store.save({...old,id:'new',version:VERSION,ruleset:RULESET});
  assert.equal(store.read().length,1);assert.equal(store.readLegacy().length,1);assert.equal(store.read()[0].player.category,'Murid');
  const csv=csvScores(store.read(),'en');assert.match(csv,/"Rank","Name","Category","Class"/);assert.match(csv,/"Pupil"/);
  assert.match(csvScores(store.read()),/Kedudukan/);
});
test('retry scores from the first published BM/BI version remain visible as legacy only',()=>{
  const storage=memory(),store=new ScoreStore(storage);
  const retry={id:'dwi-retry',version:'1.1.0',player:{name:'Aisyah',category:'Murid',className:'1 A'},score:9,total:10,mistakes:3,hints:1,skipped:1,firstTry:6,elapsed:10000,completedAt:10000};
  storage.setItem(LEGACY_SCORE_KEY,JSON.stringify([retry]));
  assert.equal(store.readLegacy().length,1);assert.equal(store.readLegacy()[0].version,'1.1.0');
  assert.equal(store.read().length,0);
});
