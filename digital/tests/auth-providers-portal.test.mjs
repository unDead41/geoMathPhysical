import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const flush=async()=>{await tick();await tick();};
const sessionFor=(id='phone-user',sid='first',provider='phone')=>({
  user:{id,phone:provider==='phone'?'60123456789':'',phone_confirmed_at:provider==='phone'?'2026-11-04T00:00:00Z':null,email:provider==='google'?'qa@example.test':'',app_metadata:{provider,providers:[provider]}},
  access_token:'header.'+Buffer.from(JSON.stringify({sub:id,session_id:sid})).toString('base64url')+'.signature'
});
const profileFor=(id='phone-user',role='student',name='Pelajar Ujian')=>({id,username:id.replace(/-/g,'_'),display_name:name,role});
const snapshotFor=profile=>({profile,classes:[],rooms:[],invites:[],server_now:new Date(Date.now()).toISOString()});

async function fixture({session=null,profile=null,language='ms',recovery=false,callbackError='',emitVerify=false}={}) {
  const dom=new JSDOM(`<!doctype html><html lang="${language}"><title>QA</title><section id="portal-screen"></section></html>`,{url:'https://fixture.example/',pretendToBeVisual:true});
  const previous={document:globalThis.document,FormData:globalThis.FormData,now:Date.now};
  globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
  let clockOffset=0,listener=null;
  Date.now=()=>previous.now()+clockOffset;
  const state={session,profile,profiles:new Map(profile?[[profile.id,profile]]:[]),failure:null,completeFailure:null,hold:null,completeHold:null,calls:[],completeCalls:[],snapshotCalls:0,verifyResult:null};
  const cloud={ready:true,recoveryRequired:recovery,callbackError,
    get session(){return state.session;},async init(){},setRoom(){},
    onSessionChange(fn){listener=fn;return()=>{listener=null;};},
    async rpc(action){
      if(action==='snapshot') {
        state.snapshotCalls++;
        const current=state.profiles.get(state.session?.user?.id);
        if(!current)throw Object.assign(Error('DO NOT DISPLAY DATABASE DETAILS'),{code:'profile_missing'});
        return snapshotFor(current);
      }
      if(action==='learning_records')return {records:[]};
      return {};
    },
    async auth(type,payload){
      state.calls.push({type,payload:{...payload}});
      const failure=state.failure;
      await state.hold;
      if(failure)throw failure;
      if(type==='phone-verify') {
        const verified=state.verifyResult||sessionFor();
        if(!state.session) {state.session=verified;if(emitVerify)listener?.();}
        return {session:verified};
      }
      if(type==='logout'){state.session=null;listener?.();}
      return type==='google-login'?{provider:'google',url:'https://accounts.google.com/controlled-fixture'}:{};
    },
    async completeProfile(values){
      state.completeCalls.push({...values});
      const id=state.session?.user?.id,failure=state.completeFailure;
      await state.completeHold;
      if(failure)throw failure;
      const next={id,...values};state.profiles.set(id,next);return snapshotFor(next);
    }
  };
  const portal=createPortal({cloud});await portal.open();
  const doc=dom.window.document;
  const click=async(action,selector='')=>{const node=doc.querySelector(selector||`[data-portal-action="${action}"]`);assert.ok(node,`Missing control ${action}`);node.click();await flush();};
  const fill=(name,value)=>{const input=doc.querySelector(`[name="${name}"]`);assert.ok(input,`Missing input ${name}`);input.value=value;input.dispatchEvent(new dom.window.Event('input',{bubbles:true}));return input;};
  const submit=async type=>{const form=doc.querySelector(`[data-portal-form="${type}"]`);assert.ok(form,`Missing form ${type}`);form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await flush();};
  const emit=async next=>{state.session=next;listener?.();await flush();};
  const startPhone=async()=>{await click('phone-login');fill('phone','012-345 6789');await submit('phone-send');};
  const verify=async()=>{fill('token','123456');await submit('phone-verify');};
  const close=()=>{portal.destroy();dom.window.close();globalThis.document=previous.document;globalThis.FormData=previous.FormData;Date.now=previous.now;};
  return {dom,doc,cloud,portal,state,click,fill,submit,emit,startPhone,verify,close,advance(ms){clockOffset+=ms;portal.localize();}};
}

test('email login and signup retain priority while Google uses one guarded provider action',async()=>{
  const f=await fixture();let release;try {
    assert.ok(f.doc.querySelector('[data-portal-form="login"]'));
    const emailForm=f.doc.querySelector('form'),providers=f.doc.querySelector('.portal-provider-options');
    assert.ok(emailForm.compareDocumentPosition(providers)&f.dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    await f.click('auth-mode','[data-mode="signup"]');
    assert.ok(f.doc.querySelector('[data-portal-form="signup"] [name="email"]'));
    f.state.hold=new Promise(resolve=>{release=resolve;});
    await f.click('google-login');await f.click('google-login');
    assert.equal(f.state.calls.length,1);assert.equal(f.state.calls[0].type,'google-login');assert.deepEqual(f.state.calls[0].payload,{});
    assert.equal(f.doc.querySelector('[data-portal-action="google-login"]').disabled,true);
    release();await flush();
    assert.match(f.doc.getElementById('portal-notice').textContent,/Google/);
    assert.equal(f.doc.querySelector('[data-portal-action="google-login"]').disabled,false);
    f.state.failure={code:'provider_disabled',message:'DO NOT DISPLAY PROVIDER DETAILS'};f.state.hold=null;
    await f.click('google-login');assert.match(f.doc.getElementById('portal-alert').textContent,/belum tersedia/);
    assert.ok(!f.doc.body.textContent.includes('PROVIDER DETAILS'));
  } finally {release?.();f.close();}
});

test('first verified Google session completes a required profile with an explicit role and normalized username',async()=>{
  const f=await fixture();let release;try {
    await f.emit(sessionFor('google-user','google','google'));
    assert.ok(f.doc.querySelector('[data-portal-form="complete-profile"]'));
    assert.equal(f.doc.querySelector('[name="role"]:checked').value,'student');
    assert.equal(f.doc.querySelector('[name="password"]'),null);assert.equal(f.doc.querySelector('[name="email"]'),null);
    f.fill('username',' Ijamm_Kelas ');f.fill('display_name','  Cikgu Ijamm  ');
    const teacher=f.doc.getElementById('portal-provider-role-teacher');teacher.checked=true;
    f.doc.documentElement.lang='en';f.portal.localize();
    assert.equal(f.doc.querySelector('[name="role"]:checked').value,'teacher');
    assert.equal(f.doc.querySelector('[name="display_name"]').value,'  Cikgu Ijamm  ');
    await f.portal.refresh();assert.equal(f.doc.querySelector('[name="role"]:checked').value,'teacher');
    f.state.completeHold=new Promise(resolve=>{release=resolve;});
    await f.submit('complete-profile');await f.submit('complete-profile');
    assert.equal(f.state.completeCalls.length,1);
    assert.deepEqual(f.state.completeCalls[0],{username:'ijamm_kelas',display_name:'Cikgu Ijamm',role:'teacher'});
    assert.equal(f.doc.querySelector('[type="submit"]').disabled,true);
    release();await flush();
    assert.equal(f.doc.querySelector('[data-portal-form="complete-profile"]'),null);
    assert.match(f.doc.querySelector('#portal-title').textContent,/Your classroom space\./);
    assert.match(f.doc.body.textContent,/Cikgu Ijamm/);
  } finally {release?.();f.close();}
});

test('existing provider profile and role bypass onboarding and keep provider-aware security usable',async()=>{
  const existing=profileFor('google-user','teacher','Guru Sedia Ada');
  const f=await fixture({profile:existing,emitVerify:true});try {
    await f.emit(sessionFor('google-user','google','google'));
    assert.equal(f.doc.querySelector('[data-portal-form="complete-profile"]'),null);assert.equal(f.state.completeCalls.length,0);
    assert.match(f.doc.body.textContent,/Guru Sedia Ada/);
    await f.click('security');assert.equal(f.doc.querySelector('[data-portal-form="change-password"]'),null);
    assert.ok(f.doc.querySelector('[data-portal-action="request-logout-all"]'));
    assert.match(f.doc.body.textContent,/Google/);
  } finally {f.close();}
});

test('a signed-in Google first login opens profile setup and maps missing migrations to safe feedback',async()=>{
  const f=await fixture({session:sessionFor('google-user','google','google'),language:'en'});try {
    assert.ok(f.doc.querySelector('[data-portal-form="complete-profile"]'));
    assert.match(f.doc.querySelector('#portal-auth-title').textContent,/Complete your profile/);
    f.fill('username','new_teacher');f.fill('display_name','Google Teacher');
    f.state.completeFailure={code:'PGRST202',message:'DO NOT DISPLAY SQL DETAILS'};
    await f.submit('complete-profile');
    assert.match(f.doc.querySelector('[data-form-error]').textContent,/not available yet/);
    assert.equal(f.doc.querySelector('[name="display_name"]').value,'Google Teacher');
    assert.ok(f.doc.querySelector('[data-portal-action="logout"]'));
    assert.ok(!f.doc.body.textContent.includes('SQL DETAILS'));
    f.state.completeFailure={code:'username_taken'};await f.submit('complete-profile');
    assert.equal(f.doc.activeElement.name,'username');assert.match(f.doc.querySelector('[data-error-for="username"]').textContent,/already taken/);
  } finally {f.close();}
});

test('a newer session for the same account prevents a late profile response from replacing its dashboard',async()=>{
  const original=sessionFor('phone-user','old-session');
  const f=await fixture({session:original});let release;try {
    f.fill('username','old_draft');f.fill('display_name','Profil Lama');
    f.state.completeHold=new Promise(resolve=>{release=resolve;});await f.submit('complete-profile');
    f.state.profiles.set('phone-user',{...profileFor('phone-user','teacher','Profil Baharu'),username:'new_teacher'});
    await f.emit(sessionFor('phone-user','new-session'));
    assert.match(f.doc.body.textContent,/Profil Baharu/);release();await flush();
    assert.match(f.doc.body.textContent,/Profil Baharu/);assert.ok(!f.doc.body.textContent.includes('Profil Lama'));
  } finally {release?.();f.close();}
});

test('verified recovery and invalid callback UI keep precedence over provider choices and first profile setup',async()=>{
  const f=await fixture({session:sessionFor('google-user','recovery','google'),recovery:true});try {
    assert.ok(f.doc.querySelector('[data-portal-form="reset-password"]'));
    assert.equal(f.doc.querySelector('[data-portal-action="google-login"]'),null);
    assert.equal(f.doc.querySelector('[data-portal-form="complete-profile"]'),null);
    assert.equal(f.state.snapshotCalls,0);
    f.cloud.recoveryRequired=false;f.cloud.callbackError='Pautan sudah tamat. Minta pautan baharu.';await f.emit(f.cloud.session);
    assert.ok(f.doc.querySelector('[data-portal-form="recover-email"]'));
    assert.equal(f.doc.querySelector('[data-portal-action="phone-login"]'),null);
  } finally {f.close();}
});

test('login and signup expose Google only without phone or SMS controls',async()=>{
  const f=await fixture();try {
    for(const mode of ['login','signup']){
      if(mode==='signup')await f.click('auth-mode','[data-mode="signup"]');
      assert.equal(f.doc.querySelectorAll('[data-auth-provider="google"]').length,1);
      assert.equal(f.doc.querySelector('[data-auth-provider="phone"],input[type="tel"],[data-auth-otp]'),null);
      assert.doesNotMatch(f.doc.querySelector('.portal-provider-options').textContent,/SMS|telefon|phone/i);
    }
  } finally {f.close();}
});

test('a cancelled Google callback permits a fresh Google attempt after returning to sign in',async()=>{
  const f=await fixture({callbackError:'Pautan ini tidak sah atau sudah tamat. Minta pautan email baharu.'});try {
    await f.click('auth-mode','[data-mode="login"]');
    await f.click('google-login');
    assert.equal(f.state.calls.filter(call=>call.type==='google-login').length,1);
    assert.match(f.doc.getElementById('portal-notice').textContent,/Google/);
  } finally {f.close();}
});
