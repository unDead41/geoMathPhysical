import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDuelSnapshot,createDuelHandler} from '../backend/duel/functions/geodecoder-duel/handler.mjs';

const raw=()=>({ok:true,serverNow:5000,room:{id:'room',code:'123456',status:'playing',startsAt:1000,deadlineAt:901000,lobbyExpiresAt:600000,questionIds:['K1','B1','P1','S1','C1','K2','B2','P2','S2','C2'],total:10,winnerId:null,reason:null},me:{id:'me',slot:1,name:'Ali',ready:true,answered:0,stage:'solid',score:0,mistakes:0,skipped:0,hints:0,hintUsed:false,attempts:{solid:null,net:null},answers:[],seq:1,elapsed:4000,finishedAt:null,lastSeenAt:5000,nextReadyAt:1000,reviewPending:false},opponent:{id:'other',name:'Siti',score:0,answers:[{shape:'cube'}],tokenHash:'secret'},actionResult:null});

test('Duel protocol 2 sends only the active prompt without answer key, future IDs or unused hint',()=>{
  const s=projectDuelSnapshot(raw());
  assert.equal(s.protocol,2);assert.equal(s.room.questionIds,undefined);
  assert.equal(s.currentQuestion.index,0);assert.equal(s.currentQuestion.id,'duel-0');
  assert.equal(s.currentQuestion.shape,undefined);assert.equal(s.currentQuestion.copy.ms.hint,undefined);
  assert.ok(s.currentQuestion.copy.ms.prompt);assert.ok(s.currentQuestion.copy.en.prompt);
  assert.equal(s.opponent.answers,undefined);assert.equal(s.opponent.tokenHash,undefined);
  for(const id of raw().room.questionIds)assert.ok(!JSON.stringify(s).includes('"'+id+'"'));
});
test('hints are released only after server accounting; countdown releases no prompt',()=>{
  const r=raw();r.me.hintUsed=true;r.me.hints=1;
  assert.ok(projectDuelSnapshot(r).currentQuestion.copy.ms.hint);
  r.room.status='countdown';assert.equal(projectDuelSnapshot(r).currentQuestion,null);
});
test('settled review can reveal its answer, while the next prompt remains withheld until advance',()=>{
  const r=raw();r.me.answered=1;r.me.reviewPending=true;r.me.mistakes=1;
  r.me.answers=[{id:'K1',shape:'cube',topic:'properties',outcome:'wrong',hint:false,failedAt:'solid',attempts:{solid:'cone',net:null},elapsed:2000,firstTry:false}];
  const s=projectDuelSnapshot(r);assert.equal(s.currentQuestion,null);
  assert.equal(s.me.answers[0].shape,'cube');assert.ok(s.me.answers[0].question.copy.en.prompt);
  assert.ok(!JSON.stringify(s).includes('"B1"'));
  r.me.reviewPending=false;assert.equal(projectDuelSnapshot(r).currentQuestion.index,1);
});
test('v1 or unmigrated database cannot silently expose the old response contract',async()=>{
  let calls=0;const handle=createDuelHandler({env:n=>({SUPABASE_URL:'https://qa.example.test',SUPABASE_SERVICE_ROLE_KEY:'qa-key'})[n],fetch:async()=>{calls++;const r=raw();delete r.me.reviewPending;return Response.json(r);}});
  const send=body=>handle(new Request('https://qa.example.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
  const v1=await send({action:'create',token:'ab'.repeat(32),name:'Alias'});
  assert.equal(v1.status,426);assert.equal((await v1.json()).error,'client_update_required');assert.equal(calls,0);
  const v2=await send({action:'create',protocol:2,token:'ab'.repeat(32),name:'Alias'});
  assert.equal(v2.status,503);assert.equal((await v2.json()).error,'backend_update_required');
});
