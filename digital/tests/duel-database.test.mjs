import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {projectDuelSnapshot} from '../backend/duel/functions/geodecoder-duel/handler.mjs';

const dir=new URL('../backend/duel/',import.meta.url);
const migrationName=readdirSync(new URL('supabase/migrations/',dir)).find(n=>n.endsWith('_duel_durable_review_v2.sql'));
// Keep the surrounding fixture transaction in control of every change.
const inFixture=sql=>sql.replace(/^begin;$/m,'').replace(/^commit;$/m,'');
const migration=()=>inFixture(readFileSync(new URL('supabase/migrations/'+migrationName,dir),'utf8'));
let db,at=1000000;
const hash=n=>n.toString(16).padStart(64,'0');
const rpc=async body=>(await db.query('select public.geodecoder_duel_gateway($1::jsonb) as s',[JSON.stringify({fingerprint:hash(99),...body})])).rows[0].s;
const clock=async value=>{at=value;await db.exec(`create or replace function geodecoder_duel.clock_ms() returns bigint language sql volatile security invoker set search_path='' as 'select ${at}::bigint'`);};
async function room(){
  let a=await rpc({action:'create',tokenHash:hash(1),code:'123456',name:'Host'});
  const id=a.room.id;let b=await rpc({action:'join',tokenHash:hash(2),code:'123456',name:'Guest'});
  a=await rpc({action:'ready',tokenHash:hash(1),roomId:id,seq:1});
  b=await rpc({action:'ready',tokenHash:hash(2),roomId:id,seq:1});
  await clock(at+3000);a=await rpc({action:'state',tokenHash:hash(1),roomId:id});
  return {id,a,b,act:async(n,s,action,fields={})=>rpc({action,roomId:id,tokenHash:hash(n),seq:s.me.seq+1,...fields}),shape:async i=>(await db.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[$1] where r.id=$2',[i+1,id])).rows[0].shape};
}
before(async()=>{db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');await db.exec(readFileSync(new URL('schema.sql',dir),'utf8'));});
after(async()=>{await db.close();});
beforeEach(async()=>{await db.exec('begin');await clock(1000000);});
afterEach(async()=>{await db.exec('rollback');});

test('additive Duel migration preserves existing rooms and does not widen table or RPC privileges',async()=>{
  const old=await rpc({action:'create',tokenHash:hash(9),code:'777777',name:'Existing fixture'});
  await db.exec(migration());
  const s=await rpc({action:'state',tokenHash:hash(9),roomId:old.room.id});
  assert.equal(s.me.reviewPending,false);assert.equal(s.me.name,'Existing fixture');
  assert.equal(s.room.lobbyExpiresAt,1600000);
  for(const role of ['anon','authenticated'])assert.equal((await db.query('select has_function_privilege($1, $2, $3) as allowed',[role,'public.geodecoder_duel_gateway(jsonb)','execute'])).rows[0].allowed,false);
  await db.exec('set local role service_role');assert.equal((await rpc({action:'state',tokenHash:hash(9),roomId:old.room.id})).ok,true);
});
test('wrong-answer review survives refresh and cannot be skipped before the server-paced advance',async()=>{
  await db.exec(migration());const r=await room();let s=r.a;
  const shape=await r.shape(0),wrong=shape==='cube'?'cone':'cube';
  s=await r.act(1,s,'hint',{questionIndex:0});s=await r.act(1,s,'hint',{questionIndex:0});assert.equal(s.me.hints,1);
  s=await r.act(1,s,'scan',{questionIndex:0,kind:'solid',target:'r1',shape});assert.equal(s.me.score,0);
  s=await r.act(1,s,'scan',{questionIndex:0,kind:'net',target:'r2',shape:wrong});
  assert.equal(s.me.reviewPending,true);assert.equal(s.me.mistakes,1);assert.equal(projectDuelSnapshot(s).currentQuestion,null);
  const before=s.me.seq;s=await rpc({action:'state',tokenHash:hash(1),roomId:r.id});assert.equal(s.me.reviewPending,true);
  assert.equal((await r.act(1,s,'skip',{questionIndex:1})).error,'not_ready');
  assert.equal((await r.act(1,s,'advance',{questionIndex:0})).error,'not_ready');
  await clock(at+1799);assert.equal((await r.act(1,s,'advance',{questionIndex:0})).error,'not_ready');
  await clock(at+1);s=await r.act(1,s,'advance',{questionIndex:0});
  assert.equal(s.me.reviewPending,false);assert.equal(s.me.seq,before+1);assert.equal(s.me.score,0);
  assert.equal(projectDuelSnapshot(s).currentQuestion.index,1);
});
test('same-sequence duplicate/conflicting requests settle one answer and one advance only',async()=>{
  await db.exec(migration());const r=await room();let s=r.a;const shape=await r.shape(0);
  const body={action:'scan',roomId:r.id,tokenHash:hash(1),seq:s.me.seq+1,questionIndex:0,kind:'solid',target:'r1',shape};
  const same=await Promise.all([rpc(body),rpc(body)]);assert.equal(same[0].me.seq,same[1].me.seq);assert.equal(same[1].me.score,0);s=same[1];
  const net={...body,seq:s.me.seq+1,kind:'net',target:'r2'};
  const competing=await Promise.all([rpc(net),rpc({...net,shape:shape==='cube'?'cone':'cube'})]);
  assert.equal(competing.filter(x=>x.ok).length,1);assert.equal(competing[1].error,'sequence_conflict');s=competing[0];assert.equal(s.me.score,1);
  await clock(at+900);const adv={action:'advance',roomId:r.id,tokenHash:hash(1),seq:s.me.seq+1,questionIndex:0};
  const advances=await Promise.all([rpc(adv),rpc(adv)]);assert.equal(advances[1].me.answered,1);assert.equal(advances[1].me.score,1);
  assert.equal((await rpc({...net,seq:adv.seq+1})).error,'question_mismatch');
});
test('two players share ten unique questions; final score, time and last review remain authoritative',async()=>{
  await db.exec(migration());const r=await room();let a=r.a,b=await rpc({action:'state',tokenHash:hash(2),roomId:r.id});
  assert.deepEqual(a.room.questionIds,b.room.questionIds);assert.equal(new Set(a.room.questionIds).size,10);
  for(let i=0;i<10;i++){
    const shape=await r.shape(i);
    for(const [n,key] of [[1,'a'],[2,'b']]){
      let s=key==='a'?a:b;s=await r.act(n,s,'scan',{questionIndex:i,kind:'solid',target:'r1',shape});
      s=await r.act(n,s,i===4&&n===2?'skip':'scan',i===4&&n===2?{questionIndex:i}:{questionIndex:i,kind:'net',target:'r2',shape});
      if(key==='a')a=s;else b=s;
    }
    await clock(at+1800);
    a=await r.act(1,a,'advance',{questionIndex:i});b=await r.act(2,b,'advance',{questionIndex:i});
  }
  a=await rpc({action:'state',tokenHash:hash(1),roomId:r.id});
  assert.equal(a.room.status,'complete');assert.equal(a.me.score,10);assert.equal(a.opponent.score,9);assert.equal(a.room.winnerId,a.me.id);
  assert.equal(a.me.reviewPending,false);assert.equal(a.me.answers.length,10);
  const departed=await r.act(1,a,'leave');assert.equal(departed.me.forfeited,false);assert.equal(departed.room.winnerId,a.me.id);
});
test('deadline, lobby expiry and surrender complete isolated fixtures with no client clock or score',async()=>{
  await db.exec(migration());const r=await room();let s=await r.act(1,r.a,'skip',{questionIndex:0});
  await clock(s.room.deadlineAt);s=await rpc({action:'state',tokenHash:hash(1),roomId:r.id,score:999,elapsed:0});
  assert.equal(s.room.status,'complete');assert.equal(s.me.score,0);assert.equal(s.me.answered,10);assert.equal(s.me.reviewPending,false);assert.equal(s.me.elapsed,900000);
  const other=await rpc({action:'create',tokenHash:hash(3),code:'222222',name:'Expiry fixture'});
  await clock(at+600000);assert.equal((await rpc({action:'state',tokenHash:hash(3),roomId:other.room.id})).room.status,'expired');
});
test('prepared backend verification rolls back every fixture and migration rollback preserves existing rooms',async()=>{
  await db.exec(migration());
  const before=(await db.query('select count(*)::int as n from geodecoder_duel.rooms')).rows[0].n;
  // The SQL verification owns a nested savepoint here, rather than committing this fixture.
  await db.exec(readFileSync(new URL('verify-v2.sql',dir),'utf8').replace(/^begin;$/m,'savepoint v2_verify;').replace(/^rollback;$/m,'rollback to savepoint v2_verify;'));
  assert.equal((await db.query('select count(*)::int as n from geodecoder_duel.rooms')).rows[0].n,before);
  const s=await rpc({action:'create',tokenHash:hash(7),code:'777777',name:'Rollback preserved fixture'});
  await db.exec(inFixture(readFileSync(new URL('rollback-v2.sql',dir),'utf8')));
  const restored=await rpc({action:'state',tokenHash:hash(7),roomId:s.room.id});
  assert.equal(restored.me.name,s.me.name);assert.equal(restored.me.reviewPending,undefined);assert.equal(restored.me.score,0);
});
for(const tie of [true,false])test(tie?'equal scores and equal server finish times produce a draw':'equal scores use the earlier server finish time',async()=>{
  await db.exec(migration());const r=await room();let a=r.a,b=await rpc({action:'state',tokenHash:hash(2),roomId:r.id});
  for(let i=0;i<10;i++){
    const shape=await r.shape(i);
    a=await r.act(1,a,'scan',{questionIndex:i,kind:'solid',target:'r1',shape});
    b=await r.act(2,b,'scan',{questionIndex:i,kind:'solid',target:'r1',shape});
    a=await r.act(1,a,'scan',{questionIndex:i,kind:'net',target:'r2',shape});
    if(!tie&&i===9)await clock(at+1);
    b=await r.act(2,b,'scan',{questionIndex:i,kind:'net',target:'r2',shape});
    await clock(at+900);a=await r.act(1,a,'advance',{questionIndex:i});b=await r.act(2,b,'advance',{questionIndex:i});
  }
  const s=await rpc({action:'state',tokenHash:hash(1),roomId:r.id});
  assert.equal(s.room.reason,tie?'tie':'time');assert.equal(s.room.winnerId,tie?null:s.me.id);assert.equal(s.me.score,10);assert.equal(s.opponent.score,10);
});
