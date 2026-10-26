// Explicit live smoke only: public client credentials, synthetic aliases, one room.
import assert from 'node:assert/strict';
import {appendFileSync} from 'node:fs';
import {DuelClient} from '../../dist/duel.mjs';
const host=new DuelClient(),a=new DuelClient(),b=new DuelClient();
try{
  const room=await host.create('Duel QA Race Host');
  appendFileSync(new URL('../../../../duel-live-fixtures.jsonl',import.meta.url),JSON.stringify({id:room.room.id})+'\n');
  const joined=await Promise.allSettled([a.join('Duel QA Race A',room.room.code),b.join('Duel QA Race B',room.room.code)]);
  assert.equal(joined.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(joined.filter(r=>r.status==='rejected'&&r.reason.code==='room_full').length,1);
  const state=await host.refresh();assert.ok(state.opponent);assert.notEqual(state.me.id,state.opponent.id);
  await host.act('leave');assert.equal(host.snapshot.room.status,'cancelled');
  console.log('PASS live simultaneous join race: exactly one guest accepted, third rejected, room cancelled');
}finally{host.forget();a.forget();b.forget();}
