import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';

const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}

async function fixture({role='student',language='ms',initGate=null,learningGate=null,authGate=null}={}){
  const dom=new JSDOM(`<!doctype html><html lang="${language}"><title>Account fixture</title><section id="portal-screen"></section></html>`,{url:'https://fixture.example/',pretendToBeVisual:true});
  const previous={};
  for(const name of ['document','FormData']){
    previous[name]=Object.getOwnPropertyDescriptor(globalThis,name);
    Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});
  }
  const record={activity:'net',stage:'explanation',prediction:'Ramalan peribadi',result:'Pemerhatian murid',explanation:'Boleh dilipat',completed:true};
  const profile={id:'account-a',username:'nama_murid',display_name:'Nama Tidak Diterjemah',role,avatar:'cube',email:'fixture@example.test',email_verified:true};
  const state={snapshotCalls:0,learningCalls:0,securityCalls:0,moduleCalls:0,securitySignal:null,securityError:null};
  let listener;
  const cloud={
    ready:true,session:{user:{id:profile.id},access_token:'fixture-token',refresh_token:'fixture-refresh'},
    onSessionChange(callback){listener=callback;return()=>{listener=null;};},
    setRoom(id){state.room=id;},
    async init(){await initGate?.promise;return this.session;},
    async rpc(action,payload={}){
      state.snapshotCalls++;
      if(action==='update_profile')Object.assign(profile,payload);
      return structuredClone({profile,classes:[{id:'class-a',name:'Kelas Jangan Diterjemah',members:role==='teacher'?[{id:'student-a',username:'murid_a',display_name:'Nama Murid',last_seen:new Date().toISOString()}]:[]}],invites:[],rooms:[],
        ...(payload.room_id?{room:{id:payload.room_id,name:'Bilik Jangan Diterjemah',class_name:'Kelas Jangan Diterjemah',status:'open',players:[]}}:{}),server_now:new Date().toISOString()});
    },
    async moduleProgress(action){
      state.learningCalls++;await learningGate?.promise;
      return action==='class'?{class_id:'class-a',students:[{user_id:'student-a',records:[record]}]}:{records:[record]};
    },
    async auth(action,values,options={}){
      state.securityCalls++;state.securitySignal=options.signal;
      await authGate?.promise;
      if(state.securityError)throw state.securityError;
      return {passwordChanged:true,message:'Kata laluan sudah dikemas kini. Gunakan kata laluan baharu apabila diminta log masuk semula.'};
    }
  };
  const portal=createPortal({cloud,onModule(){state.moduleCalls++;}});
  const doc=dom.window.document;
  const click=async action=>{const control=doc.querySelector(`[data-portal-action="${action}"]`);assert.ok(control,action);control.click();await settle();};
  const fillSecurity=()=>{for(const [name,value] of Object.entries({current_password:'Fixture Current#41',password:'Fixture New#41',password_confirm:'Fixture New#41'}))doc.querySelector(`[name="${name}"]`).value=value;};
  const submitSecurity=async()=>{doc.querySelector('[data-portal-form="change-password"]').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await settle();};
  const cleanup=()=>{
    portal.destroy();dom.window.close();
    for(const name of Object.keys(previous)){if(previous[name])Object.defineProperty(globalThis,name,previous[name]);else delete globalThis[name];}
  };
  return {portal,cloud,doc,dom,state,click,fillSecurity,submitSecurity,cleanup,emit(){listener?.(cloud.session);}};
}

test('profile, security, room and dashboard API targets remain mutually exclusive',async()=>{
  const f=await fixture();try{
    await f.portal.open();await settle();
    await f.portal.open({security:true});f.fillSecurity();
    const oldInputs=[...f.doc.querySelectorAll('[data-portal-form="change-password"] input')];
    await f.portal.open({profile:true});
    assert.ok(f.doc.querySelector('[data-portal-form="profile"]'));
    assert.equal(f.doc.querySelector('[data-portal-form="change-password"]'),null);
    assert.ok(oldInputs.every(input=>input.value===''));
    await f.click('security');
    assert.ok(f.doc.querySelector('[data-portal-form="change-password"]'));
    f.portal.showRoom('room-a');await settle();
    assert.match(f.doc.getElementById('portal-title').textContent,/Bilik Jangan Diterjemah/);
    assert.equal(f.doc.querySelector('[data-portal-form="change-password"]'),null);
    assert.equal(f.doc.querySelector('[data-portal-form="profile"]'),null);
    await f.portal.open();await settle();
    assert.ok(f.doc.querySelector('.portal-module-card'));
    await f.click('open-module');
    assert.equal(f.state.moduleCalls,1);assert.equal(f.portal.isOpen,false);
  }finally{f.cleanup();}
});

test('a delayed learning report cannot rerender security secrets or restart polling',async()=>{
  const gate=deferred(),f=await fixture({learningGate:gate});try{
    await f.portal.open();await settle();assert.equal(f.state.learningCalls,1);
    await f.click('security');f.fillSecurity();
    const input=f.doc.querySelector('[name="current_password"]');
    gate.resolve();await settle();await settle();
    assert.equal(f.doc.querySelector('[name="current_password"]'),input);
    assert.equal(input.value,'Fixture Current#41');
    const calls=f.state.snapshotCalls;
    await f.portal.refresh();f.doc.dispatchEvent(new f.dom.window.Event('visibilitychange'));await settle();
    assert.equal(f.state.snapshotCalls,calls);assert.equal(f.state.learningCalls,1);
    assert.equal(f.doc.querySelector('.portal-workspace-main [data-portal-action="open-module"]'),null);
  }finally{gate.resolve();f.cleanup();}
});

test('header profile navigation aborts pending security and discards its late success',async()=>{
  const gate=deferred(),f=await fixture({authGate:gate});try{
    await f.portal.open();await f.click('security');f.fillSecurity();
    const inputs=[...f.doc.querySelectorAll('[data-portal-form="change-password"] input')];
    await f.submitSecurity();assert.equal(f.state.securityCalls,1);
    await f.portal.open({profile:true});
    assert.equal(f.state.securitySignal.aborted,true);assert.ok(inputs.every(input=>input.value===''));
    gate.resolve();await settle();await settle();
    assert.equal(f.doc.querySelector('#portal-profile-name').value,'Nama Tidak Diterjemah');
    assert.doesNotMatch(f.doc.getElementById('portal-notice').textContent,/kata laluan|password/i);
  }finally{gate.resolve();f.cleanup();}
});

test('navigation during initial Auth loading settles on the newest target',async()=>{
  const gate=deferred(),f=await fixture({initGate:gate});try{
    const first=f.portal.open();
    const last=f.portal.open({security:true});
    gate.resolve();await Promise.all([first,last]);
    assert.ok(f.doc.querySelector('[data-portal-form="change-password"]'));
    assert.equal(f.doc.querySelector('.portal-loading'),null);
    assert.equal(f.state.snapshotCalls,0);
  }finally{gate.resolve();f.cleanup();}
});

test('language changes translate account UI and errors while keeping user content and live fields',async()=>{
  const f=await fixture();try{
    await f.portal.open({profile:true});f.doc.documentElement.lang='en';f.portal.localize();
    assert.equal(f.doc.getElementById('portal-title').textContent,'My profile');
    assert.equal(f.doc.querySelector('#portal-profile-name').value,'Nama Tidak Diterjemah');
    assert.match(f.doc.querySelector('.portal-profile-details').textContent,/Kelas Jangan Diterjemah/);
    assert.match(f.doc.querySelector('.portal-profile-details').textContent,/Email verification/);
    await f.click('security');f.doc.documentElement.lang='ms';f.portal.localize();f.fillSecurity();
    f.state.securityError=Object.assign(Error('Kata laluan semasa tidak tepat. Cuba semula.'),{code:'reauth-failed',field:'current_password'});
    await f.submitSecurity();
    const detached=[...f.doc.querySelectorAll('[data-portal-form="change-password"] input')];
    f.doc.documentElement.lang='en';f.portal.localize();
    assert.equal(f.doc.querySelector('label[for="portal-security-current"]').textContent,'Current password');
    assert.equal(f.doc.querySelector('[name="current_password"]').value,'Fixture Current#41');
    assert.ok(detached.every(input=>input.value===''));
    assert.match(f.doc.querySelector('[data-error-for="current_password"]').textContent,/current password is incorrect/);
    assert.match(f.doc.body.textContent,/Nama Tidak Diterjemah/);
  }finally{f.cleanup();}
});

test('teacher practice disclosures survive refresh and English copy leaves learner records untouched',async()=>{
  const f=await fixture({role:'teacher',language:'en'});try{
    await f.portal.open();await settle();
    const details=f.doc.querySelector('[data-module-student="student-a"] details');
    assert.ok(details);details.open=true;
    assert.match(details.textContent,/1\/4 activities completed/);
    assert.match(details.textContent,/Prediction/);
    assert.match(details.textContent,/Ramalan peribadi/);
    await f.portal.refresh();await settle();
    assert.equal(f.doc.querySelector('[data-module-student="student-a"] details').open,true);
    assert.match(f.doc.body.textContent,/self-reported practice, not assessment marks/);
    assert.match(f.doc.body.textContent,/Kelas Jangan Diterjemah/);
  }finally{f.cleanup();}
});
