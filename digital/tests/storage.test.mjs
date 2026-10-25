import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ScoreStore,rankScores,csvScores,validRecord,SCORE_KEY} from '../dist/storage.mjs';
const record=(overrides={})=>({id:'r1',version:'1.0.0',player:{name:'Aisyah',category:'Murid',className:'1 Bestari'},score:10,total:10,mistakes:0,hints:0,skipped:0,firstTry:10,elapsed:30000,completedAt:10000,...overrides});
function fake(){const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('scores persist across fresh storage repositories and round ID writes are idempotent',()=>{
  const storage=fake(),a=new ScoreStore(storage);a.save(record());a.save(record());
  const b=new ScoreStore(storage);assert.equal(b.read().length,1);assert.equal(b.read()[0].player.name,'Aisyah');
});
test('ranking uses score, then fewer mistakes, then elapsed time',()=>{
  const results=rankScores([record({id:'wrong',mistakes:3,elapsed:1000}),record({id:'slower',elapsed:50000}),record({id:'fast',elapsed:10000}),record({id:'low',score:9,skipped:1,firstTry:9,elapsed:100})]);
  assert.deepEqual(results.map(r=>r.id),['fast','slower','wrong','low']);
});
test('leaderboard bounded to best fifty and deduplicates IDs',()=>{
  const results=rankScores(Array.from({length:60},(_,i)=>record({id:String(i),elapsed:i})));assert.equal(results.length,50);
  assert.equal(rankScores([record(),record()]).length,1);
});
test('malformed/foreign/invalid records ignored, invalid result cannot be saved',()=>{
  assert.equal(validRecord(record({score:100})),false);assert.equal(validRecord(record({version:'2'})),false);
  assert.equal(validRecord(record({score:8,skipped:0})),false);assert.equal(validRecord(record({elapsed:Infinity})),false);
  assert.equal(validRecord(record({player:{name:'<b>Ali</b>',category:'Murid',className:'1'}})),true);
  assert.deepEqual(rankScores([null,{},record({total:100})]),[]);
  assert.throws(()=>new ScoreStore(fake()).save(record({score:-1})));
});
test('storage failure keeps gameplay records in session memory',()=>{
  const s=new ScoreStore({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});
  s.save(record());assert.equal(s.failed,true);assert.equal(s.read().length,1);
});
test('corrupt JSON does not crash and successful next save repairs the value',()=>{
  const storage=fake();storage.setItem(SCORE_KEY,'broken');const s=new ScoreStore(storage);
  assert.deepEqual(s.read(),[]);assert.equal(s.failed,true);s.save(record());assert.equal(s.failed,false);assert.equal(s.read().length,1);
});
test('saving re-reads current store to preserve another tab\'s records',()=>{
  const storage=fake(),a=new ScoreStore(storage),b=new ScoreStore(storage);
  a.save(record());b.save(record({id:'r2'}));assert.equal(new ScoreStore(storage).read().length,2);
});
test('erase removes persistent and in-memory names and scores',()=>{
  const storage=fake(),s=new ScoreStore(storage);s.save(record());assert.equal(s.clear(),true);
  assert.deepEqual(s.read(),[]);assert.equal(storage.getItem(SCORE_KEY),null);
});
test('CSV uses BOM, correct quote escaping and neutralizes spreadsheet formulas',()=>{
  const csv=csvScores([record({player:{name:'=HYPERLINK("bad")',category:'Pelajar',className:'+1'}})]);
  assert.equal(csv[0],'\uFEFF');assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(csv.includes('"\'+1"'));assert.ok(csv.includes('Kedudukan'));
});
