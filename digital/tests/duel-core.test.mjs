import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
const player={name:'Aisyah',category:'Murid',className:'1 A'};
const ids=['K1','B1','P1','S1','C1','K2','B2','P2','S2','C2'];
const snapshot=()=>({room:{total:10,questionIds:ids},me:{answered:1,stage:'net',score:1,mistakes:0,skipped:0,hints:1,hintUsed:true,attempts:{solid:'cuboid',net:null},elapsed:5500,finishedAt:null,answers:[{id:'K1',shape:'cube',topic:'properties',outcome:'correct',hint:false,failedAt:null,attempts:{solid:'cube',net:'cube'},elapsed:2000,firstTry:true}]}});
test('duel preserves the exact shared question IDs and does not admit a different round',()=>{
  const a=new Game(QUESTIONS,player,0,()=>.1,{mode:'duel',questionIds:ids});
  const b=new Game(QUESTIONS,player,0,()=>.9,{mode:'duel',questionIds:ids});
  assert.equal(a.mode,'duel');assert.equal(a.total,10);assert.deepEqual(a.round.map(q=>q.id),ids);assert.deepEqual(b.round.map(q=>q.id),ids);
  for(const invalid of [undefined,ids.slice(1),[...ids.slice(0,9),'K1'],[...ids.slice(0,9),'unknown']])assert.throws(()=>new Game(QUESTIONS,player,0,Math.random,{mode:'duel',questionIds:invalid}));
});
test('duel restores accepted R1, hints and previous answers from the server without counting another attempt',()=>{
  const data=snapshot(),g=Game.fromDuelSnapshot(QUESTIONS,player,data,1000);
  assert.equal(g.question.id,'B1');assert.equal(g.stage,'net');assert.equal(g.score,1);assert.equal(g.hints,1);assert.equal(g.hintUsed,true);
  assert.equal(g.scan('solid','cuboid','r1',1100).type,'stage');assert.equal(g.scan('net','cuboid','r2',1200).type,'correct');
  assert.equal(g.score,2);assert.equal(g.answers.length,2);assert.equal(data.me.answers.length,1);
});
test('duel rejects inconsistent checkpoints before they can change displayed scores or answers',()=>{
  for(const change of [s=>s.me.score=9,s=>s.me.answered=2,s=>s.me.answers[0].id='C1',s=>s.me.attempts.solid='cone',s=>s.me.elapsed=-1]){
    const data=snapshot();change(data);assert.throws(()=>Game.fromDuelSnapshot(QUESTIONS,player,data,1000));
  }
});
test('an acknowledged duel action is applied while a menu is open without resuming local play',()=>{
  for(const action of ['scan','hint','skip']){
    const g=new Game(QUESTIONS,player,0,Math.random,{mode:'duel',questionIds:ids});g.pause(1000);
    const result=g.applyDuelAcknowledgement(action,{kind:'solid',shape:'cube',target:'r1'},1500);
    assert.equal(g.paused,true);
    if(action==='scan'){assert.equal(result.type,'solid');assert.equal(g.stage,'net');}
    if(action==='hint'){assert.equal(result,true);assert.equal(g.hints,1);assert.equal(g.hintOpen,true);}
    if(action==='skip'){assert.equal(result,true);assert.equal(g.answers.length,1);assert.equal(g.reviewReady(9999),false);}
    g.resume(3000);assert.equal(g.paused,false);
    if(action==='skip'){assert.equal(g.reviewReady(4799),false);assert.equal(g.reviewReady(4800),true);}
  }
});
