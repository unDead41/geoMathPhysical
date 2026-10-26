import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import * as duel from '../dist/duel.mjs';
const roomId='00000000-0000-4000-8000-000000000001';
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('duel HTTP retries a lost acknowledgement with the same sequence and reconnects the saved session',async()=>{
  let seq=0,hints=0,dropped=false,requests=0,stale=false;
  const snapshot=()=>({ok:true,serverNow:stale?100:1000+seq,room:{id:roomId,code:'123456',status:'playing',startsAt:900,deadlineAt:900900,questionIds:[],total:10,winnerId:null},me:{id:'me',name:'Aisyah',seq:stale?0:seq,hints:stale?0:hints,answered:0},opponent:null,actionResult:{type:'hint'}});
  const server=createServer(async(req,res)=>{
    let text='';for await(const part of req)text+=part;const body=JSON.parse(text);requests++;
    if(body.action==='hint'){
      if(body.seq===seq+1){seq++;hints++;}
      if(!dropped){dropped=true;req.socket.destroy();return;}
    }
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot()));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const storage=memory(),endpoint=`http://127.0.0.1:${server.address().port}`;
    const client=new duel.DuelClient({storage,endpoint});assert.equal(requests,0);
    await client.create('Aisyah');assert.equal(client.snapshot.room.code,'123456');
    const token=JSON.parse(storage.getItem(duel.DUEL_SESSION_KEY)).token;assert.match(token,/^[0-9a-f]{64}$/);
    await client.act('hint',{questionIndex:0});assert.equal(hints,1);assert.equal(client.snapshot.me.seq,1);assert.equal(client.pending,false);
    stale=true;await client.refresh();assert.equal(client.snapshot.me.seq,1);assert.equal(client.snapshot.me.hints,1);
    stale=false;const reload=new duel.DuelClient({storage,endpoint});await reload.resume();assert.equal(reload.snapshot.me.seq,1);assert.equal(reload.snapshot.me.hints,1);
    reload.forget();assert.equal(storage.getItem(duel.DUEL_SESSION_KEY),null);client.stopPolling();
  }finally{await new Promise(r=>server.close(r));}
});
test('duel winner labels follow the completed server result rather than temporary scores',()=>{
  const s={room:{status:'playing',winnerId:null},me:{id:'me',score:9},opponent:{id:'other',score:1}};
  assert.equal(duel.duelVerdict(s),'duel.waitFinish');s.room.status='complete';
  assert.equal(duel.duelVerdict(s),'duel.draw');s.room.winnerId='other';assert.equal(duel.duelVerdict(s),'duel.youLose');
  s.room.winnerId='me';assert.equal(duel.duelVerdict(s),'duel.youWin');
});
test('a real HTTP timeout is retried as a network error without duplicating an accepted mutation',async()=>{
  let seq=0,hints=0,delayed=false,hintRequests=0;
  const server=createServer(async(req,res)=>{
    let text='';for await(const part of req)text+=part;const body=JSON.parse(text);
    if(body.action==='hint'){hintRequests++;if(body.seq>seq){seq=body.seq;hints++;}}
    const value={ok:true,serverNow:1000+seq,room:{id:roomId,code:'123456',status:'playing'},me:{id:'me',seq,hints},opponent:null};
    if(body.action==='hint'&&!delayed){delayed=true;await new Promise(r=>setTimeout(r,150));}
    if(!res.destroyed)res.end(JSON.stringify(value));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const client=new duel.DuelClient({endpoint:`http://127.0.0.1:${server.address().port}`,requestTimeoutMs:40});
    await client.create('Aisyah');await client.act('hint',{questionIndex:0});
    assert.equal(hintRequests,2);assert.equal(hints,1);assert.equal(client.snapshot.me.hints,1);assert.equal(client.pending,false);assert.equal(client.connected,true);
  }finally{await new Promise(r=>server.close(r));}
});
