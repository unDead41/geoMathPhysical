import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ClassroomCloud} from '../dist/cloud.mjs';

function fixture(){
  let resolve;
  const pending=new Promise(r=>{resolve=r;});
  const cloud=new ClassroomCloud({url:'https://test.invalid',publishableKey:'public-test'});
  cloud._client={rpc(){return {setHeader(){return this;},abortSignal(){return pending;}}},auth:{async getSession(){return {data:{session:cloud.session},error:null};},async signOut(){return {error:null};}}};
  cloud._setSession({user:{id:'account-a'},access_token:'fixture-account-a',refresh_token:'fixture-refresh-a'});
  return {cloud,complete:data=>resolve({data,error:null})};
}
test('a delayed previous-account response cannot populate the new account cache',async()=>{
  const {cloud,complete}=fixture();cloud.setRoom('room-a');
  const old=cloud.rpc('heartbeat',{room_id:'room-a'});
  cloud._setSession({user:{id:'account-b'}});cloud.profile={id:'account-b'};cloud.setRoom('room-b');cloud.room={id:'room-b'};
  complete({profile:{id:'account-a'},room:{id:'room-a'}});await assert.rejects(old,error=>error.code==='session-changed');
  assert.equal(cloud.profile.id,'account-b');assert.equal(cloud.room.id,'room-b');assert.equal(cloud.roomId,'room-b');
});
test('a delayed old-room response cannot replace the room currently being viewed',async()=>{
  const {cloud,complete}=fixture();cloud.setRoom('room-a');
  const old=cloud.rpc('snapshot',{room_id:'room-a'});
  cloud.setRoom('room-b');cloud.room={id:'room-b'};
  complete({profile:{id:'account-a'},room:{id:'room-a'}});await assert.rejects(old,{code:'stale-response'});
  assert.equal(cloud.room.id,'room-b');assert.equal(cloud.profile,null);
});
test('logout clears profile, room and session and ignores a late heartbeat',async()=>{
  const {cloud,complete}=fixture();cloud.profile={id:'account-a'};cloud.room={id:'room-a'};cloud.setRoom('room-a');
  const old=cloud.rpc('heartbeat',{room_id:'room-a'});await cloud.auth('logout');
  complete({profile:{id:'account-a'},room:{id:'room-a'}});await assert.rejects(old,error=>error.code==='session-changed');
  assert.equal(cloud.session,null);assert.equal(cloud.profile,null);assert.equal(cloud.room,null);assert.equal(cloud.roomId,null);
});
