import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
async function harness({role='teacher',language='ms',capability=true}={}){
 const dom=new JSDOM(`<html lang="${language}"><section id="portal-screen"></section></html>`,{url:'http://localhost/'});
 dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 dom.window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 const saved={};for(const key of ['document','FormData','navigator']){saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,value:dom.window[key]});}
 let listener,hold=false,release,fail=null,denyRoom=false,snapshotFail=false;
 const calls=[];
 let state={classroom_crud:capability?1:undefined,profile:{id:'teacher-a',username:'guru',display_name:'Cikgu Hana',role},classes:[{id:'class-a',name:'2 STEM',revision:3,archived_at:null,members:[{id:'student-a',display_name:'Aisyah',username:'aisyah'}],pending_invites:[{id:'invite-a',username:'ahmad',display_name:'Ahmad'}]}],rooms:[{id:'room-a',class_id:'class-a',name:'Latihan Bongkah',revision:2,status:'open',members_count:0}],invites:[],server_now:new Date().toISOString()};
 const cloud={ready:true,session:{user:{id:'teacher-a'}},onSessionChange(fn){listener=fn;return()=>{};},async auth(){},async rpc(action,payload){
  calls.push({action,payload});
  if(action==='snapshot'&&snapshotFail)throw Error('Network connection failed');
  if(action==='snapshot'&&payload.room_id){if(denyRoom)throw Object.assign(Error('Room denied'),{code:'forbidden'});return {...structuredClone(state),room:{...state.rooms[0],class_name:state.classes[0].name,players:[],my_attempt:{attemptId:'attempt-a',status:'finished'}}};}
  if(action!=='snapshot'){
   if(hold)await new Promise(resolve=>release=resolve);
   if(fail)throw Object.assign(Error('Server error'),{code:fail});
   if(action==='rename_class'){state.classes[0].name=payload.name;state.classes[0].revision++;}
   if(action==='archive_class'){state.classes[0].archived_at=new Date().toISOString();state.classes[0].revision++;}
   if(action==='restore_class'){state.classes[0].archived_at=null;state.classes[0].revision++;}
   if(action==='remove_member'){state.classes[0].members=[];state.classes[0].revision++;}
   if(action==='cancel_invite')state.classes[0].pending_invites=[];
   if(action==='delete_class')state.classes=[];
   if(action==='delete_room')state.rooms=[];
  }
  return structuredClone(state);
 }};
 const portal=createPortal({cloud});await portal.open();await settle();
 const click=s=>{const b=dom.window.document.querySelector(s);assert.ok(b,'Missing control '+s);b.click();};
 const submit=async()=>{dom.window.document.querySelector('#portal-management-dialog form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await settle();};
 return {portal,cloud,calls,click,submit,get doc(){return dom.window.document;},setSnapshotFail(v){snapshotFail=v;},setDenyRoom(v){denyRoom=v;},setFail(v){fail=v;},setHold(v){hold=v;},release(){release();},state,async switchUser(){cloud.session={user:{id:'teacher-b'}};listener(cloud.session);await settle();},cleanup(){portal.destroy();dom.window.close();for(const key in saved){if(saved[key])Object.defineProperty(globalThis,key,saved[key]);else delete globalThis[key];}}};
}

test('teacher edit uses a modal, validates, preserves failed draft and submits the captured revision once',async()=>{
 const h=await harness();try{
  h.click('[data-portal-action="manage-class"][data-operation="rename"]');
  assert.ok(h.doc.querySelector('#portal-management-dialog[open]'));
  const field=h.doc.querySelector('#portal-management-name');assert.equal(field.value,'2 STEM');
  field.value='A';await h.submit();assert.equal(h.calls.some(c=>c.action==='rename_class'),false);assert.equal(field.getAttribute('aria-invalid'),'true');
  field.value='  2 Cemerlang  ';h.setFail('conflict');await h.submit();
  assert.match(h.doc.querySelector('#portal-management-dialog [data-form-error]').textContent,/berubah/);assert.equal(field.value,'  2 Cemerlang  ');
  await h.portal.refresh();assert.equal(h.doc.querySelector('#portal-management-name').value,'  2 Cemerlang  ');
  h.setFail(null);h.setHold(true);await h.submit();await h.submit();
  assert.equal(h.calls.filter(c=>c.action==='rename_class').length,2,'one failed save, one pending save');
  assert.deepEqual(h.calls.find(c=>c.action==='rename_class').payload,{class_id:'class-a',name:'2 Cemerlang',expected_revision:3});
  h.release();await settle();assert.equal(h.doc.querySelector('#portal-management-dialog[open]'),null);assert.match(h.doc.querySelector('.portal-class-overview h2').textContent,/Cemerlang/);
 }finally{h.cleanup();}
});

test('archive has named confirmation and a discoverable restore path; Cancel restores focus',async()=>{
 const h=await harness();try{
  const selector='[data-portal-action="manage-class"][data-operation="archive"]';h.click(selector);
  assert.match(h.doc.querySelector('#portal-management-dialog').textContent,/2 STEM/);
  assert.equal(h.doc.activeElement.dataset.portalAction,'management-cancel');
  h.click('[data-portal-action="management-cancel"]');assert.equal(h.doc.activeElement.dataset.operation,'archive');
  h.click(selector);await h.submit();
  h.click('[data-portal-action="class-archive-filter"]');
  h.click('[data-portal-action="manage-class"][data-operation="restore"]');await h.submit();
  h.click('[data-portal-action="class-archive-filter"]');
  assert.ok(h.doc.querySelector(selector));assert.equal(h.state.classes[0].archived_at,null);
 }finally{h.cleanup();}
});

test('member removal and invitation cancellation require confirmation and preserve server error recovery',async()=>{
 const h=await harness();try{
  h.click('[data-portal-action="manage-member"]');assert.match(h.doc.querySelector('#portal-management-dialog').textContent,/Aisyah/);
  h.setFail('room_playing');await h.submit();assert.match(h.doc.querySelector('#portal-management-dialog [data-form-error]').textContent,/Tutup/);
  h.setFail(null);await h.submit();assert.equal(h.doc.querySelector('[data-portal-action="manage-member"]'),null);
  h.click('[data-portal-action="manage-invite"]');await h.submit();assert.equal(h.doc.querySelector('[data-portal-action="manage-invite"]'),null);
 }finally{h.cleanup();}
});

test('English controls escape names and hide management from students and older backends',async()=>{
 for(const options of [{language:'en'},{role:'student'},{capability:false}]){
  const h=await harness(options);try{
   const control=h.doc.querySelector('[data-portal-action="manage-class"]');
   if(options.language==='en'){
    assert.equal(control.textContent.trim(),'Edit name');h.state.classes[0].name='<img src=x>';await h.portal.refresh();h.click('[data-portal-action="manage-class"][data-operation="rename"]');
    assert.equal(h.doc.querySelector('#portal-management-name').value,'<img src=x>');assert.equal(h.doc.querySelector('#portal-management-dialog img'),null);
   }else assert.equal(control,null);
  }finally{h.cleanup();}
 }
});

test('a late save cannot apply after account switching or leave a management dialog open',async()=>{
 const h=await harness();try{
  h.click('[data-portal-action="manage-class"][data-operation="rename"]');h.doc.querySelector('#portal-management-name').value='Late';h.setHold(true);await h.submit();
  await h.switchUser();h.release();await settle();assert.equal(h.doc.querySelector('#portal-management-dialog[open]'),null);assert.doesNotMatch(h.doc.querySelector('#portal-notice').textContent,/berjaya/);
 }finally{h.cleanup();}
});

test('an explicit conflict refresh keeps the draft and captures the latest revision',async()=>{
 const h=await harness();try{
  h.click('[data-portal-action="manage-class"][data-operation="rename"]');h.doc.querySelector('#portal-management-name').value='My draft';
  h.state.classes[0].revision=4;h.state.classes[0].name='Concurrent edit';h.setFail('conflict');await h.submit();
  h.click('[data-portal-action="management-refresh"]');await settle();
  assert.equal(h.doc.querySelector('#portal-management-name').value,'My draft');
  assert.match(h.doc.querySelector('.portal-management-object').textContent,/Concurrent edit/);
  h.setFail(null);await h.submit();assert.equal(h.calls.filter(c=>c.action==='rename_class').at(-1).payload.expected_revision,4);
 }finally{h.cleanup();}
});

test('explicit room revocation clears cached results and returns to the class dashboard',async()=>{
 const h=await harness({role:'student'});try{
  await h.portal.showRoom('room-a');await settle();assert.ok(h.doc.querySelector('[data-portal-action="play-result"]'));
  h.setDenyRoom(true);h.state.classes=[];h.state.rooms=[];await h.portal.refresh();await settle();
  assert.equal(h.doc.querySelector('[data-portal-action="play-result"]'),null);
  assert.equal(h.doc.querySelector('.portal-live-board'),null);assert.ok(h.doc.querySelector('[data-portal-form="join-pin"]'));
 }finally{h.cleanup();}
});

test('opening an archived class from Profile selects that class and its archive filter',async()=>{
 const h=await harness();try{
  h.state.classes[0].archived_at=new Date().toISOString();h.state.classes.push({id:'class-b',name:'Other active class',members:[],revision:0});
  await h.portal.open({profile:true});await settle();h.click('[data-portal-action="profile-class"][data-id="class-a"]');await settle();
  assert.equal(h.doc.querySelector('.portal-class-overview h2').textContent,'2 STEM');
  assert.match(h.doc.querySelector('[data-portal-action="class-archive-filter"]').textContent,/aktif/);
 }finally{h.cleanup();}
});

test('failed conflict refresh reports inside the modal, focuses the error and preserves the draft',async()=>{
 const h=await harness();try{
  h.click('[data-portal-action="manage-class"][data-operation="rename"]');h.doc.querySelector('#portal-management-name').value='Draft retained';h.setFail('conflict');await h.submit();
  h.setSnapshotFail(true);h.click('[data-portal-action="management-refresh"]');await settle();await settle();
  const error=h.doc.querySelector('#portal-management-dialog [data-form-error]');
  assert.match(error.textContent,/Sambungan/);assert.equal(h.doc.activeElement,error);
  assert.equal(h.doc.querySelector('#portal-management-name').value,'Draft retained');assert.equal(h.doc.querySelector('#portal-management-dialog [type=submit]').disabled,false);
 }finally{h.cleanup();}
});

test('confirmation refresh returns keyboard focus to its Cancel control',async()=>{
 const h=await harness();try{
  h.click('[data-portal-action="manage-class"][data-operation="archive"]');h.click('[data-portal-action="management-refresh"]');await settle();await settle();
  assert.equal(h.doc.activeElement.dataset.portalAction,'management-cancel');
 }finally{h.cleanup();}
});
