// Disposable localhost integration smoke. No hosted URL or credentials accepted.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {createDuelHandler} from '../duel/functions/geodecoder-duel/handler.mjs';
import {DuelClient} from '../../dist/duel.mjs';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const db=new PGlite({extensions:{pgcrypto}}),durations=[];
let server,clock=Date.now(),dropNextScan=true,dropped=0;
try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,encrypted_password text,email_confirmed_at timestamptz,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to authenticated,anon,service_role;grant execute on function auth.jwt(),auth.uid() to authenticated,anon,service_role;`);
  for(const item of JSON.parse(read('../../../supabase/hosted-history.json')).migrations)await db.exec(read('../../../supabase/migrations/'+item.file));
  const dir=new URL('./supabase/migrations/',import.meta.url);
  await db.exec(fs.readFileSync(new URL(fs.readdirSync(dir).find(n=>n.endsWith('_geodecoder_scaling_v1.sql')),dir),'utf8'));
  await db.exec('set role service_role');
  const handler=createDuelHandler({env:n=>({SUPABASE_URL:'https://localhost.invalid',SUPABASE_SERVICE_ROLE_KEY:'disposable-local-key'})[n],fetch:async(_url,init)=>{
    const {payload}=JSON.parse(init.body);
    return Response.json((await db.query('select public.geodecoder_duel_gateway($1::jsonb) as result',[JSON.stringify(payload)])).rows[0].result);
  }});
  server=createServer(async(req,res)=>{
    const started=performance.now();
    try{
      const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks),parsed=JSON.parse(body);
      const response=await handler(new Request('http://127.0.0.1/duel',{method:'POST',headers:req.headers,body}));
      if(dropNextScan&&parsed.action==='scan'&&response.ok){dropNextScan=false;dropped++;res.destroy();return;}
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(500);res.end('{}');}finally{durations.push(performance.now()-started);}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const endpoint='http://127.0.0.1:'+server.address().port+'/duel';
  const tick=async milliseconds=>{
    clock+=milliseconds;await db.exec('reset role');
    await db.exec(`create or replace function geodecoder_duel.clock_ms() returns bigint language sql volatile security invoker set search_path='' as 'select ${clock}::bigint'`);
    await db.exec('set role service_role');
  };
  await tick(0); // Freeze fixture time before creating rooms, not after startup.
  const pairs=Array.from({length:4},()=>[new DuelClient({endpoint}),new DuelClient({endpoint})]);
  await Promise.all(pairs.map(async([a,b])=>{await a.create('Local host');await b.join('Local guest',a.snapshot.room.code);await a.act('ready');await b.act('ready');}));
  await tick(4000);
  for(let index=0;index<10;index++){
    await Promise.all(pairs.flat().map(c=>c.refresh()));
    for(const pair of pairs)for(const client of pair){
      const shape=(await db.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[$1] where r.id=$2',[index+1,client.session.roomId])).rows[0].shape;
      await client.act('scan',{questionIndex:index,kind:'solid',target:'r1',shape});
      await client.act('scan',{questionIndex:index,kind:'net',target:'r2',shape});
      assert.equal(client.snapshot.me.score,index+1);
    }
    await tick(2000);
    await Promise.all(pairs.flat().map(c=>c.act('advance',{questionIndex:index})));
  }
  for(const client of pairs.flat()){
    await client.refresh();assert.equal(client.snapshot.room.status,'complete');assert.equal(client.snapshot.me.score,10);assert.equal(client.snapshot.me.answers.length,10);client.forget();
  }
  // Both clients can wake after the actual 15-minute server deadline. No local
  // clock pauses, extra scores or repeated settlement are introduced.
  const late=[new DuelClient({endpoint}),new DuelClient({endpoint})];
  await late[0].create('Deadline host');await late[1].join('Deadline guest',late[0].snapshot.room.code);
  await late[0].act('ready');await late[1].act('ready');await tick(4000);await late[0].refresh();
  const shape=(await db.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[1] where r.id=$1',[late[0].session.roomId])).rows[0].shape;
  await late[0].act('scan',{questionIndex:0,kind:'solid',target:'r1',shape});await late[0].act('scan',{questionIndex:0,kind:'net',target:'r2',shape});
  const seq=late[0].snapshot.me.seq;await tick(900001);
  for(const client of late){await client.refresh();assert.equal(client.snapshot.room.status,'complete');assert.equal(client.snapshot.me.answers.length,10);client.startPolling();assert.equal(client.polling,false);}
  assert.equal(late[0].snapshot.me.score,1);assert.equal(late[0].snapshot.me.seq,seq);
  await late[0].refresh();assert.equal(late[0].snapshot.me.score,1);assert.equal(late[0].snapshot.me.seq,seq);
  for(const client of late)client.forget();assert.equal(dropped,1);
  durations.sort((a,b)=>a-b);
  console.log(JSON.stringify({scope:'localhost HTTP + real Edge handler + candidate SQL on PGlite; not a hosted capacity benchmark',users:10,matches:5,completedMatches:5,fullMatches:4,deadlineMatches:1,answers:100,scoreTotal:81,intentionalDroppedAcknowledgements:dropped,httpRequests:durations.length,p95Milliseconds:Math.round(durations[Math.floor(durations.length*0.95)])},null,2));
}finally{
  if(server)await new Promise(resolve=>server.close(resolve));await db.close();
}
