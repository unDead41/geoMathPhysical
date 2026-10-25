// Optional isolated full-stack QA. Install @electric-sql/pglite outside this repo
// and set PGLITE_MODULE to its dist/index.js; no production dependency is added.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';
import { createDuelHandler } from './functions/geodecoder-duel/handler.mjs';
import { QUESTIONS } from '../dist/questions.mjs';

if(!process.env.PGLITE_MODULE)throw new Error('Set PGLITE_MODULE to an installed @electric-sql/pglite dist/index.js outside this repository.');
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const db=new PGlite();
const token=()=>Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString('hex');
const endpoint='https://duel.example.test/functions/v1/geodecoder-duel';
const env={SUPABASE_URL:'https://duel.example.test',SUPABASE_SERVICE_ROLE_KEY:'local-test-service-key'};
const handler=createDuelHandler({env:name=>env[name],crypto:webcrypto,fetch:async(_,init)=>{
  const {payload}=JSON.parse(init.body);
  const {rows}=await db.query('select public.geodecoder_duel_gateway($1::jsonb) as result',[JSON.stringify(payload)]);
  return Response.json(rows[0].result);
}});
async function call(body,address='203.0.113.8'){
  const response=await handler(new Request(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':address},body:JSON.stringify(body)}));
  return {status:response.status,...await response.json()};
}
try{
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('./verify.sql',import.meta.url),'utf8'));
  const {rows:[empty]}=await db.query('select count(*)::int as count from geodecoder_duel.rooms');
  assert.equal(empty.count,0,'transactional verification must leave no rooms');
  console.log('PASS: SQL gameplay, terminal, deadline, privileges and rollback fixtures');

  for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select public.geodecoder_duel_gateway($1::jsonb)',['{}']),{code:'42501'});
    await assert.rejects(db.query('select * from geodecoder_duel.players'),{code:'42501'});
  }
  await db.exec('set role service_role');
  const hostToken=token(),guestToken=token(),thirdToken=token();
  const created=await call({action:'create',token:hostToken,name:'QA Host'});
  assert.equal(created.ok,true,JSON.stringify(created));
  const roomId=created.room.id;
  const retried=await call({action:'create',token:hostToken,name:'Changed alias'});
  assert.equal(retried.room.id,roomId);
  assert.equal(retried.me.name,'QA Host');
  const joins=await Promise.all([guestToken,thirdToken].map(token=>call({action:'join',token,name:'QA Guest',code:created.room.code})));
  assert.equal(joins.filter(x=>x.ok).length,1);
  assert.equal(joins.filter(x=>x.error==='room_full').length,1);
  const joined=joins.find(x=>x.ok),otherToken=joins[0].ok?guestToken:thirdToken;
  for(const field of ['answers','attempts','hintUsed','seq','tokenHash'])assert.equal(joined.opponent[field],undefined);
  assert.equal((await call({action:'ready',token:hostToken,roomId,seq:1})).ok,true);
  const countdown=await call({action:'ready',token:otherToken,roomId,seq:1});
  assert.equal(countdown.room.status,'countdown');
  assert.equal(new Set(countdown.room.questionIds).size,10);
  const premature=await call({action:'skip',token:hostToken,roomId,seq:2,questionIndex:0});
  assert.equal(premature.error,'not_started');
  // Advance only fixture clocks. All gameplay mutations below use the real Edge
  // handler and the actual service-role SQL gateway, with no scoring model mock.
  await db.query('update geodecoder_duel.rooms set starts_at=$1::bigint,deadline_at=$1::bigint+900000 where id=$2',[Date.now()-10000,roomId]);
  await db.query('update geodecoder_duel.players set next_ready_at=$1,question_started_at=$1 where room_id=$2',[Date.now()-10000,roomId]);
  let seq=1,last;
  for(let index=0;index<10;index++){
    const question=QUESTIONS.find(q=>q.id===countdown.room.questionIds[index]);
    for(const [kind,target] of [['solid','r1'],['net','r2']]){
      const body={action:'scan',token:hostToken,roomId,seq:++seq,questionIndex:index,kind,target,shape:question.shape};
      last=await call(body);
      assert.equal(last.ok,true,JSON.stringify(last));
      if(kind==='solid')assert.equal(last.actionResult.type,'solid');
      else{
        assert.equal(last.actionResult.type,'correct');
        assert.equal(last.me.score,index+1);
        const repeat=await call(body);
        assert.equal(repeat.me.score,index+1);
        assert.equal(repeat.actionResult.type,'correct');
      }
    }
    if(index<9){
      const blocked=await call({action:'skip',token:hostToken,roomId,seq:seq+1,questionIndex:index+1});
      assert.equal(blocked.error,'not_ready');
      await db.query('update geodecoder_duel.players set next_ready_at=$1 where id=$2',[Date.now()-1,last.me.id]);
    }
  }
  assert.equal(last.room.status,'playing');
  assert.equal(last.room.winnerId,null);
  assert.equal(last.me.answers.length,10);
  const departure=await call({action:'leave',token:hostToken,roomId,seq:++seq});
  assert.equal(departure.me.forfeited,false);
  assert.equal(departure.room.status,'playing');
  const surrendered=await call({action:'leave',token:otherToken,roomId,seq:2});
  assert.equal(surrendered.room.status,'complete');
  assert.equal(surrendered.room.reason,'forfeit');
  assert.equal(surrendered.room.winnerId,last.me.id);
  assert.equal(surrendered.me.answers.length,10);
  assert.equal(surrendered.me.skipped,10);
  assert.equal(surrendered.opponent.score,10);
  assert.equal(surrendered.opponent.answered,10);
  console.log('PASS: real Edge → SQL as service_role, anon denial, max2, 10 correct pairs, retries, pacing and completed-player departure');

  // Freeze only the isolated database's clock inside a rolled-back transaction.
  // This prevents fixed-window limit checks from depending on the wall-clock
  // minute in which CI starts; production still uses clock_timestamp().
  await db.exec('begin; set role postgres;');
  const {rows:[{now:rateNow}]}=await db.query('select geodecoder_duel.clock_ms() as now');
  await db.exec(`create or replace function geodecoder_duel.clock_ms() returns bigint language sql volatile security invoker set search_path = '' as 'select ${rateNow}::bigint'; set role service_role;`);
  for(let i=0;i<31;i++){
    const attempt=await call({action:'join',token:token(),name:'QA Guess',code:'000000'},'198.51.100.99');
    assert.equal(attempt.error,i<30?'room_unavailable':'rate_limited');
  }
  console.log('PASS: PIN guessing limit persists across invalid PINs and rotating player tokens');

  await db.exec("delete from geodecoder_duel.rate_limits where bucket in ('global:create','global:join')");
  for(let i=0;i<301;i++){
    const attempt=await call({action:'join',token:token(),name:'QA Guess',code:'000000'},`198.18.${Math.floor(i/256)}.${i%256}`);
    assert.equal(attempt.error,i<300?'room_unavailable':'rate_limited','global join quota must survive rotating tokens AND address fingerprints');
  }
  for(let i=0;i<121;i++){
    // Direct internal calls use distinct PINs outside the Edge-generated range,
    // so a random PIN collision cannot make this quota test nondeterministic.
    const payload={action:'create',tokenHash:token(),fingerprint:i.toString(16).padStart(64,'0'),code:String(i+1).padStart(6,'0'),name:'Global QA'};
    const {rows:[{result}]}=await db.query('select public.geodecoder_duel_gateway($1::jsonb) as result',[JSON.stringify(payload)]);
    if(i<120)assert.equal(result.ok,true,JSON.stringify(result));
    else assert.equal(result.error,'rate_limited','global create quota must survive rotating tokens AND fingerprints');
  }
  await db.exec('rollback');
  console.log('PASS: global create120/min and join300/min quotas survive rotating tokens and fingerprints');

  // Twenty older rows precede this expired room. The bounded sweep cannot remove
  // it yet; the direct room access gate must still enforce the exact 24h TTL.
  const base=Date.now()-86400001;
  await db.query('update geodecoder_duel.rooms set created_at=$1::bigint,lobby_expires_at=$1::bigint+600000,expires_at=$1::bigint+86400000 where id=$2',[base,roomId]);
  await db.query("insert into geodecoder_duel.rooms(code,created_at,lobby_expires_at,expires_at) select lpad(i::text,6,'0'),$1::bigint,$1::bigint+600000,$1::bigint+86400000 from generate_series(1,25) i",[base-1000]);
  const expired=await call({action:'state',token:hostToken,roomId});
  assert.equal(expired.error,'room_expired');
  const {rows:[remaining]}=await db.query('select count(*)::int as count from geodecoder_duel.rooms');
  assert.equal(remaining.count,5,'one sweep must remove at most20 rows, plus the directly requested expired room');
  await db.query('select geodecoder_duel.cleanup(geodecoder_duel.clock_ms())');
  const {rows:[gone]}=await db.query('select count(*)::int as count from geodecoder_duel.players');
  assert.equal(gone.count,0);
  console.log('PASS: bounded cleanup, direct 24h expiry and cascading removal of player data');
}catch(cause){
  console.error('FAIL:',cause.message,cause.detail??'',cause.where??'');
  process.exitCode=1;
}finally{await db.close();}
