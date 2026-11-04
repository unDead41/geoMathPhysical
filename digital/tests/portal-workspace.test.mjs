import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';

const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
async function fixture({role='teacher',language='ms',memberCount=1,roomCount=1,records=[],openOptions={}}={}) {
  const dom=new JSDOM(`<html lang="${language}"><section id="portal-screen"></section></html>`,{url:'http://localhost/'});
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  const previous={};
  for(const name of ['document','FormData','navigator']) {
    previous[name]=Object.getOwnPropertyDescriptor(globalThis,name);
    Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});
  }
  const calls=[];
  const members=Array.from({length:memberCount},(_,i)=>({id:`student-${i}`,display_name:`QA learner ${i}`,username:`qa_${i}`,last_seen:new Date().toISOString()}));
  const state={classroom_crud:1,profile:{id:'actor-a',display_name:'QA <teacher>',username:'qa_actor',avatar:'cube',role},classes:[{id:'class-a',name:'QA <class>',members,pending_invites:[],pin:'123456',pin_expires_at:new Date(Date.now()+3600000).toISOString()}],rooms:Array.from({length:roomCount},(_,i)=>({id:`room-${i}`,class_id:'class-a',class_name:'QA <class>',name:`QA room ${i}`,status:'open',members_count:memberCount})),invites:[],server_now:new Date().toISOString()};
  const room={...state.rooms[0],pin:'654321',pin_expires_at:new Date(Date.now()+3600000).toISOString(),players:[]};
  const cloud={ready:true,session:{user:{id:'actor-a'}},onSessionChange(){return()=>{};},async auth(){},async moduleProgress(action,payload){calls.push({action:`module:${action}`,payload});return action==='mine'?{records:structuredClone(records)}:{class_id:'class-a',students:[]};},async rpc(action,payload){calls.push({action,payload});if(action==='set_room')room.status=payload.status;return {...structuredClone(state),...(payload.room_id?{room:structuredClone(room)}:{})};}};
  const portal=createPortal({cloud});
  await portal.open(openOptions);await settle();
  const doc=dom.window.document;
  return {dom,doc,state,room,cloud,calls,portal,async click(selector){const node=doc.querySelector(selector);assert.ok(node,`Missing ${selector}`);node.click();await settle();},cleanup(){portal.destroy();dom.window.close();for(const name in previous){if(previous[name])Object.defineProperty(globalThis,name,previous[name]);else delete globalThis[name];}}};
}

test('teacher workspace has one real identity rail and a linked class management surface',async()=>{
  const f=await fixture();try {
    assert.equal(f.doc.querySelectorAll('.portal-account-sidebar').length,1);
    assert.equal(f.doc.querySelector('.portal-profile-link b').textContent,'QA <teacher>');
    assert.equal(f.doc.querySelector('.portal-account-sidebar img'),null);
    assert.ok(f.doc.querySelector('[data-mockup-screen="17"] .portal-class-overview'));
    assert.ok(f.doc.querySelector('a[href="#portal-class-workspace"]'));
    assert.ok(f.doc.querySelector('#portal-class-workspace[data-mockup-screen="18"] .portal-class-access .portal-pin-panel'));
    assert.ok(f.doc.querySelector('.portal-class-access [data-portal-form="invite"]'));
    assert.ok(f.doc.querySelector('.portal-class-management .portal-roster-table'));
    assert.ok(f.doc.querySelector('.portal-class-management .portal-class-rooms'));
    assert.equal(f.doc.querySelectorAll('#portal-title').length,1);
    for(const action of ['dashboard','profile','security','profile-settings','open-module','logout'])assert.ok(f.doc.querySelector(`.portal-account-sidebar [data-portal-action="${action}"]`));
    assert.equal(f.calls.some(call=>!['snapshot','module:class'].includes(call.action)),false);
  } finally {f.cleanup();}
});

test('the workspace keeps roster and room pagination and retains a focused draft across refresh',async()=>{
  const f=await fixture({memberCount:22,roomCount:7});try {
    assert.equal(f.doc.querySelectorAll('.portal-roster-table tbody tr').length,20);
    assert.equal(f.doc.querySelectorAll('.portal-room-card').length,6);
    await f.click('[data-target="roster"][data-page="2"]');
    assert.equal(f.doc.querySelectorAll('.portal-roster-table tbody tr').length,2);
    await f.click('[data-target="rooms"][data-page="2"]');
    assert.equal(f.doc.querySelectorAll('.portal-room-card').length,1);
    const field=f.doc.querySelector('#portal-invite-username');field.value='qa_draft';field.focus();field.setSelectionRange(2,5);
    await f.portal.refresh();
    assert.equal(f.doc.querySelector('#portal-invite-username').value,'qa_draft');
    assert.equal(f.doc.activeElement.id,'portal-invite-username');
    assert.equal(f.doc.activeElement.selectionStart,2);
    f.doc.querySelector('#portal-nav-profile-user').focus();
    await f.portal.refresh();
    assert.equal(f.doc.activeElement.id,'portal-nav-profile-user');
  } finally {f.cleanup();}
});

test('student records show actual validated reflections without inventing quiz scores or dates',async()=>{
  const f=await fixture({role:'student',language:'en',records:[{activity:'net',stage:'prediction',prediction:'QA prediction',result:'',explanation:'',completed:false},{activity:'area',stage:'prediction',prediction:'Forged completion',result:'',explanation:'',completed:true}]});try {
    assert.ok(f.doc.querySelector('[data-mockup-screen="21"] .portal-join-panel'));
    assert.equal(f.doc.querySelector('.portal-role-badge').textContent,'Student');
    assert.equal(f.doc.querySelectorAll('.portal-learning-table tbody tr').length,1);
    assert.match(f.doc.querySelector('.portal-learning-table').textContent,/Build a net/);
    assert.match(f.doc.querySelector('.portal-learning-table').textContent,/Prediction recorded/);
    assert.match(f.doc.querySelector('.portal-learning-table').textContent,/Not recorded yet/);
    assert.doesNotMatch(f.doc.querySelector('.portal-learning-table').textContent,/10\/10|15\/15|TP|XP|Invalid Date/);
    assert.match(f.doc.querySelector('.portal-invites').textContent,/no pending invitations/);
  } finally {f.cleanup();}
});

test('live rooms retain server-derived progress and close only after explicit confirmation',async()=>{
  const f=await fixture();try {
    f.room.status='playing';
    f.room.players=[{id:'waiting',display_name:'QA waiting',username:'waiting',status:'waiting'},{id:'partial',display_name:'QA partial',username:'partial',status:'playing',question_index:3,total:10,score:2,elapsed_ms:42000}];
    await f.portal.showRoom('room-0');await settle();
    assert.ok(f.doc.querySelector('[data-mockup-screen="19"] .portal-room-live-hero .geometry-scene'));
    assert.equal(f.doc.querySelector('progress').value,4);
    assert.equal(f.doc.querySelectorAll('.portal-rank')[1].textContent,'—');
    await f.click('[data-portal-action="request-close-room"]');
    assert.equal(f.calls.some(call=>call.action==='set_room'),false);
    assert.ok(f.doc.querySelector('#portal-close-title'));
    await f.click('[data-portal-action="close-room"]');
    assert.deepEqual(f.calls.find(call=>call.action==='set_room').payload,{room_id:'room-0',status:'closed'});
    assert.ok(f.doc.querySelector('[data-mockup-screen="20"] .portal-room-results .portal-final-board'));
    assert.match(f.doc.querySelector('.portal-final-board').textContent,/Separa/);
    assert.equal(f.doc.querySelector('.portal-final-board progress'),null);
    assert.equal(f.doc.querySelector('[data-portal-action="start-room"]'),null);
  } finally {f.cleanup();}
});

test('student room waits for the actual server state and only lists real participants',async()=>{
  const f=await fixture({role:'student'});try {
    f.room.players=[{user_id:'actor-a',display_name:'QA learner',username:'qa_learner',status:'waiting',last_seen:new Date().toISOString()}];
    await f.portal.showRoom('room-0');await settle();
    assert.ok(f.doc.querySelector('[data-mockup-screen="22"] .portal-room-model-stage'));
    assert.equal(f.doc.querySelectorAll('.portal-participants li').length,1);
    assert.equal(f.doc.querySelector('.portal-participants .portal-count').textContent,'1');
    assert.equal(f.doc.querySelector('[data-portal-action="play"]').disabled,true);
    assert.match(f.doc.querySelector('.portal-waiting-label').textContent,/belum dimulakan oleh guru/);
    assert.equal(f.calls.some(call=>call.action==='start_attempt'),false);
    f.room.status='playing';await f.portal.refresh();await settle();
    assert.equal(f.doc.querySelector('[data-portal-action="play"]').disabled,false);
    assert.equal(f.doc.querySelector('.portal-waiting-label'),null);
  } finally {f.cleanup();}
});

test('direct Security entry keeps a truthful account rail while recovery never receives the signed-in shell',async()=>{
  const f=await fixture({openOptions:{security:true},language:'en'});try {
    assert.equal(f.doc.querySelectorAll('.portal-account-sidebar').length,1);
    assert.match(f.doc.querySelector('#portal-account-identity').textContent,/Your account/);
    assert.match(f.doc.querySelector('#portal-account-identity').textContent,/Profile details have not been loaded/);
    assert.equal(f.doc.querySelector('.portal-role-badge'),null);
    assert.equal(f.doc.querySelector('#portal-nav-security-lock').getAttribute('aria-current'),'page');
    f.cloud.recoveryRequired=true;
    await f.portal.open();await settle();
    assert.ok(f.doc.querySelector('[data-portal-form="reset-password"]'));
    assert.equal(f.doc.querySelector('.portal-workspace-shell'),null);
  } finally {f.cleanup();}
});
