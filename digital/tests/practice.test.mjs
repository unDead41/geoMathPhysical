import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game,buildRound,SHAPES,REVIEW_MS,analyseAnswers} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {validRecord,ScoreStore,SCORE_KEY} from '../dist/storage.mjs';
const player={name:'Aisyah',category:'Murid',className:'1 A'};
const seeded=seed=>()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const practice=seed=>new Game(QUESTIONS,player,0,seeded(seed),{mode:'practice'});

test('reinforcement practice covers all 15 stable IDs once, three per shape, without mutating the bank',()=>{
  const before=JSON.stringify(QUESTIONS),orders=new Set();
  for(let seed=1;seed<=500;seed++){
    const g=practice(seed);assert.equal(g.mode,'practice');assert.equal(g.total,15);
    assert.deepEqual(g.round.map(q=>q.id).sort(),['B1','B2','B3','C1','C2','C3','K1','K2','K3','P1','P2','P3','S1','S2','S3']);
    for(const shape of SHAPES)assert.equal(g.round.filter(q=>q.shape===shape).length,3);
    orders.add(g.round.map(q=>q.id).join(','));
  }
  assert.ok(orders.size>1);assert.equal(JSON.stringify(QUESTIONS),before);
});
test('practice runs past question 10 and completes only after the fifteenth matching pair',()=>{
  const g=practice(41);let time=0;
  for(let index=0;index<15;index++){
    time+=500;g.scan('solid',g.question.shape,'r1',time);g.scan('net',g.question.shape,'r2',time);
    time+=REVIEW_MS;g.update(time);
    if(index<14)assert.equal(g.status,'running');
    if(index===9)assert.equal(g.result('incomplete',1000),null);
  }
  const r=g.result('practice',1000);
  assert.equal(g.status,'finished');assert.equal(r.mode,'practice');assert.equal(r.total,15);
  assert.equal(r.score,15);assert.equal(r.answers.length,15);assert.equal(r.firstTry,15);
  assert.equal(g.time(999999),7500);assert.equal(g.scan('net',g.question.shape,'r2',time).type,'blocked');
});
test('practice preserves one attempt, corrections, hints and exact denominators for mixed answers',()=>{
  const g=practice(2);let time=0;
  for(let index=0;index<15;index++){
    g.toggleHint();g.toggleHint();time+=500;
    const wrong=SHAPES.find(shape=>shape!==g.question.shape);
    if(index===0){g.scan('solid',wrong,'r1',time);assert.equal(g.scan('solid',g.question.shape,'r1',time+1).type,'blocked');}
    else if(index===1){g.scan('solid',g.question.shape,'r1',time);g.scan('net',wrong,'r2',time);}
    else if(index===2)g.skip(time);
    else{g.scan('solid',g.question.shape,'r1',time);g.scan('net',g.question.shape,'r2',time);}
    time+=REVIEW_MS;g.reviewing?g.continueReview(time):g.update(time);
  }
  const r=g.result('mixed',1000),a=analyseAnswers(r.answers);
  assert.equal(r.score,12);assert.equal(r.mistakes,2);assert.equal(r.skipped,1);assert.equal(r.hints,15);
  assert.deepEqual(a.byShape.map(row=>row.total),[3,3,3,3,3]);
  assert.deepEqual(a.byStage.map(row=>[row.attempted,row.correct,row.wrong,row.notAttempted]),[[14,13,1,1],[13,12,1,2]]);
});
test('quiz remains the default ten-question mode and unsupported modes are rejected',()=>{
  const g=new Game(QUESTIONS,player,0,seeded(1));assert.equal(g.mode,'quiz');assert.equal(g.total,10);
  assert.equal(buildRound(QUESTIONS,seeded(1),'practice').length,15);
  assert.throws(()=>buildRound(QUESTIONS,seeded(1),'unknown'));
});
test('practice rejects an incomplete or duplicated bank instead of silently missing a question',()=>{
  assert.throws(()=>buildRound(QUESTIONS.slice(0,14),seeded(1),'practice'));
  assert.throws(()=>buildRound([...QUESTIONS.slice(0,14),QUESTIONS[0]],seeded(1),'practice'));
});
test('practice results cannot enter the quiz leaderboard, including records disguised as ten questions',()=>{
  const record={id:'practice',version:'1.4.0',ruleset:'single-attempt-v1',mode:'practice',player,score:10,total:10,mistakes:0,hints:0,skipped:0,firstTry:10,elapsed:1000,completedAt:1000};
  assert.equal(validRecord(record),false);
  const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  assert.throws(()=>new ScoreStore(storage).save(record));assert.equal(storage.getItem(SCORE_KEY),null);
});
