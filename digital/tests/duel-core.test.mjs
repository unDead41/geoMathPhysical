import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
const player={name:'Aisyah',category:'Murid',className:'2 A'};
const question=(id='duel-0',topic='properties')=>({id,index:0,topic,copy:{ms:{prompt:'Enam muka segi empat sama.',lines:['Enam muka segi empat sama.']},en:{prompt:'Six square faces.',lines:['Six square faces.']}}});
const snapshot=()=>({ok:true,protocol:2,serverNow:5000,room:{id:'room',status:'playing',total:10,startsAt:1000},currentQuestion:question(),me:{answered:0,stage:'solid',score:0,mistakes:0,skipped:0,hints:0,hintUsed:false,reviewPending:false,attempts:{solid:null,net:null},elapsed:4000,seq:1,finishedAt:null,nextReadyAt:null,answers:[]}});
function settled(outcome='wrong'){
 const s=snapshot();s.currentQuestion=null;s.me.answered=1;s.me.reviewPending=true;s.me.nextReadyAt=6800;s.me.seq=2;s.me.mistakes=outcome==='wrong'?1:0;s.me.skipped=outcome==='skipped'?1:0;s.me.score=outcome==='correct'?1:0;
 s.me.answers=[{id:'K1',shape:'cube',topic:'properties',outcome,hint:false,failedAt:outcome==='wrong'?'solid':null,attempts:outcome==='correct'?{solid:'cube',net:'cube'}:outcome==='wrong'?{solid:'cone',net:null}:{solid:null,net:null},elapsed:2000,firstTry:outcome==='correct',question:{...question('K1'),shape:'cube'}}];return s;
}
test('Duel uses the active server projection and never needs the local answer bank or future IDs',()=>{
 const g=Game.fromDuelSnapshot([],player,snapshot(),1000);
 assert.equal(g.mode,'duel');assert.equal(g.total,10);assert.equal(g.question.shape,undefined);assert.equal(g.question.id,'duel-0');
 assert.ok(g.round.slice(1).every(q=>!q.prompt&&!q.shape));
 assert.equal(g.scan('solid','cube','r1',1100).type,'blocked');assert.equal(g.score,0);
 assert.throws(()=>new Game(QUESTIONS,player,0,Math.random,{mode:'duel',questionIds:QUESTIONS.slice(0,10).map(q=>q.id)}));
});
test('Duel renders an acknowledged R1 from server state without evaluating local correctness',()=>{
 const g=Game.fromDuelSnapshot([],player,snapshot(),1000),ack=snapshot();ack.me.seq=2;ack.me.stage='net';ack.me.attempts.solid='cone';ack.actionResult={type:'solid'};
 const result=g.applyDuelAcknowledgement('scan',{},1200,ack);
 assert.equal(result.type,'solid');assert.equal(g.stage,'net');assert.equal(g.attempts.solid,'cone');assert.equal(g.score,0);assert.equal(g.question.shape,undefined);
 assert.throws(()=>g.applyDuelAcknowledgement('scan',{},1300));
});
test('refresh restores wrong and skipped correction screens and their remaining minimum review time',()=>{
 for(const outcome of ['wrong','skipped']){
  const s=settled(outcome),g=Game.fromDuelSnapshot([],player,s,1000);
  assert.equal(g.index,0);assert.equal(g.reviewing,true);assert.equal(g.question.shape,'cube');assert.equal(g.reviewReady(2799),false);assert.equal(g.reviewReady(2800),true);
  assert.equal(g.continueReview(2800),false,'only an acknowledged advance may move Duel');
  const next=snapshot();next.me={...s.me,reviewPending:false,nextReadyAt:null};next.currentQuestion={...question('duel-1'),index:1};
  next.actionResult={type:'advanced'};next.me.seq++;
  g.applyDuelAcknowledgement('advance',{},2800,next);assert.equal(g.index,1);assert.equal(g.interactive,true);assert.equal(g.question.shape,undefined);
 }
});
test('acknowledgements preserve an open menu and hints without another attempt',()=>{
 const g=Game.fromDuelSnapshot([],player,snapshot(),1000);g.pause(1100);
 const ack=snapshot();ack.me.hintUsed=true;ack.me.hints=1;ack.me.seq=2;ack.currentQuestion.copy.ms.hint='Sama bentuk dan saiz.';ack.currentQuestion.copy.en.hint='Same shape and size.';ack.actionResult={type:'hint'};
 assert.equal(g.applyDuelAcknowledgement('hint',{},1200,ack),true);assert.equal(g.paused,true);assert.equal(g.hints,1);assert.equal(g.hintOpen,true);assert.equal(g.answers.length,0);
});
test('Duel rejects malformed totals, raw v1 checkpoints and unsettled answers without changing state',()=>{
 for(const change of [s=>s.protocol=1,s=>s.me.score=9,s=>s.me.answered=2,s=>s.me.elapsed=-1,s=>s.currentQuestion.shape='cube',s=>s.me.reviewPending=true]){
  const s=snapshot();change(s);assert.throws(()=>Game.fromDuelSnapshot(QUESTIONS,player,s,1000));
 }
});
