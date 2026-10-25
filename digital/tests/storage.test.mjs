import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ScoreStore,rankScores,csvScores,validRecord,SCORE_KEY,LEGACY_SCORE_KEY} from '../dist/storage.mjs';
import {VERSION,RULESET} from '../dist/core.mjs';
const record=(overrides={})=>({id:'r1',version:VERSION,ruleset:RULESET,player:{name:'Aisyah',category:'Murid',className:'1 Bestari'},score:10,total:10,mistakes:0,hints:0,skipped:0,firstTry:10,elapsed:30000,completedAt:10000,...overrides});
function fake(){const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('scores persist across fresh storage repositories and round ID writes are idempotent',()=>{
  const storage=fake(),a=new ScoreStore(storage);a.save(record());a.save(record());
  const b=new ScoreStore(storage);assert.equal(b.read().length,1);assert.equal(b.read()[0].player.name,'Aisyah');
});
test('ranking uses score, then fewer mistakes, then elapsed time',()=>{
  const results=rankScores([record({id:'wrong',score:9,firstTry:9,mistakes:1,elapsed:1000}),record({id:'slower',elapsed:50000}),record({id:'fast',elapsed:10000}),record({id:'low',score:9,skipped:1,firstTry:9,elapsed:100})]);
  assert.deepEqual(results.map(r=>r.id),['fast','slower','low','wrong']);
});
test('leaderboard bounded to best fifty and deduplicates IDs',()=>{
  const results=rankScores(Array.from({length:60},(_,i)=>record({id:String(i),elapsed:i})));assert.equal(results.length,50);
  assert.equal(rankScores([record(),record()]).length,1);
});
test('malformed/foreign/invalid records ignored, invalid result cannot be saved',()=>{
  assert.equal(validRecord(record({score:100})),false);assert.equal(validRecord(record({version:'2'})),false);
  assert.equal(validRecord(record({score:8,skipped:0})),false);assert.equal(validRecord(record({elapsed:Infinity})),false);
  assert.equal(validRecord(record({score:8,firstTry:8,mistakes:1,skipped:1})),true);
  assert.equal(validRecord(record({score:8,firstTry:8,mistakes:3,skipped:0})),false);
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
test('legacy retry scores remain separately readable and cannot outrank single-attempt results',()=>{
  const storage=fake();const old=record({id:'legacy',version:'1.0.0',ruleset:undefined});
  storage.setItem(LEGACY_SCORE_KEY,JSON.stringify([old]));
  const s=new ScoreStore(storage);assert.equal(s.read().length,0);assert.equal(s.readLegacy().length,1);
  s.save(record({score:8,firstTry:8,mistakes:1,skipped:1}));
  assert.equal(s.read().length,1);assert.equal(s.read()[0].score,8);assert.equal(s.readLegacy()[0].id,'legacy');
  assert.ok(storage.getItem(LEGACY_SCORE_KEY));
  s.clear();assert.equal(storage.getItem(LEGACY_SCORE_KEY),null);assert.equal(s.readLegacy().length,0);
});
test('score compatibility follows the ruleset across future application version bumps',()=>{
  assert.equal(validRecord(record({version:'1.1.1'})),true);
  assert.equal(validRecord(record({version:'1.2.0'})),true);
  assert.equal(validRecord(record({ruleset:'retry'})),false);
});
test('a completed engine result with wrong answers is valid and retains per-question analytics after reload',async()=>{
  const {Game,SHAPES,REVIEW_MS}=await import('../dist/core.mjs');const {QUESTIONS}=await import('../dist/questions.mjs');
  const g=new Game(QUESTIONS,record().player,0);let now=0;
  for(let i=0;i<10;i++){
    now+=500;if(i<3)g.scan('solid',SHAPES.find(s=>s!==g.question.shape),'r1',now);else if(i<5)g.skip(now);
    else{g.scan('solid',g.question.shape,'r1',now);g.scan('net',g.question.shape,'r2',now);}
    now+=REVIEW_MS;g.reviewing?g.continueReview(now):g.update(now);
  }
  const result=g.result('actual',10000);assert.equal(validRecord(result),true);
  const storage=fake();new ScoreStore(storage).save(result);const saved=new ScoreStore(storage).read()[0];
  assert.equal(saved.answers.length,10);assert.equal(saved.score,5);assert.equal(saved.mistakes,3);assert.equal(saved.skipped,2);
  assert.equal(saved.answers[0].failedAt,'solid');assert.equal(saved.ruleset,RULESET);
});
