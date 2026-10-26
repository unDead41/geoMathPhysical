import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';
import {ClassroomCloud} from '../dist/cloud.mjs';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const jwt=sid=>'header.'+Buffer.from(JSON.stringify({sub:'account-a',session_id:sid,exp:4102444800})).toString('base64url')+'.signature';
async function fixture({snapshotFails=false}={}) {
  const dom=new JSDOM('<!doctype html><html lang="ms"><title>QA</title><section id="portal-screen"></section></html>',{url:'https://fixture.example/',pretendToBeVisual:true});
  const oldDocument=globalThis.document,oldFormData=globalThis.FormData;
  globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
  const original={user:{id:'account-a',email:'fixture@example.test'},access_token:jwt('session-a'),refresh_token:'fixture-refresh'};
  let session=original,callback,options;
  const state={mode:'success',updates:0,global:0,reauth:0,hold:null};
  const mainAuth={onAuthStateChange(fn){callback=fn;},async getSession(){return {data:{session},error:null};},async signOut(){session=null;callback('SIGNED_OUT',null);return {error:null};}};
  const isolated={
    async getUser(){if(state.mode==='network')throw new TypeError('sensitive-provider-message');return state.mode==='expired'?{data:{user:null},error:{code:'bad_jwt',status:401}}:{data:{user:original.user},error:null};},
    async signInWithPassword(){state.reauth++;await state.hold;return state.mode==='credentials'?{data:{user:null,session:null},error:{code:'invalid_credentials',status:400,message:'sensitive-provider-message'}}:{data:{user:original.user,session:{...original,access_token:jwt('verifier')}},error:null};},
    async updateUser(){state.updates++;return {data:{user:original.user},error:null};},
    async setSession(){return {data:{user:original.user,session:original},error:null};},
    async signOut({scope}){if(scope==='global'){state.global++;await options.global.fetch('https://fixture.supabase.co/auth/v1/logout?scope=global',{method:'POST'});}return {error:null};},stopAutoRefresh(){}
  };
  const snapshot={profile:{id:'account-a',username:'pelajar_ujian',display_name:'Akaun Ujian',role:'student'},classes:[],rooms:[],invites:[],server_now:new Date().toISOString()};
  const cloud=new ClassroomCloud({url:'https://fixture.supabase.co',publishableKey:'fixture-public-key'},{location:{href:'https://fixture.example/'},recoveryStorage:null,fetch:async()=>new Response(null,{status:204}),createClient:(_url,_key,config)=>{if(config.auth.persistSession===false){options=config;return {auth:isolated};}return {auth:mainAuth,rpc:()=>({abortSignal:async()=>snapshotFails?{data:null,error:{message:'Sambungan kelas gagal.'}}:{data:snapshot,error:null}})};}});
  cloud.startHeartbeat=()=>{};
  const portal=createPortal({cloud});await portal.open();
  const doc=dom.window.document;
  const click=async action=>{doc.querySelector(`[data-portal-action="${action}"]`).click();await tick();};
  const fill=(confirm='Fixture New#41')=>{for(const [name,value] of Object.entries({current_password:'Fixture Current#41',password:'Fixture New#41',password_confirm:confirm}))doc.querySelector(`[name="${name}"]`).value=value;};
  const submit=async()=>{doc.querySelector('[data-portal-form="change-password"]').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
  const close=()=>{portal.destroy();dom.window.close();globalThis.document=oldDocument;globalThis.FormData=oldFormData;};
  await click('security');
  return {doc,dom,cloud,portal,state,click,fill,submit,close,emit:next=>{session=next;callback('SIGNED_IN',next);}};
}
test('signed-in security form has accessible labels, matching errors and secret cleanup on success',async()=>{
  const f=await fixture();try{
    assert.match(f.doc.title,/Keselamatan/);
    for(const input of f.doc.querySelectorAll('input')){
      assert.ok(f.doc.querySelector(`label[for="${input.id}"]`));
      for(const id of input.getAttribute('aria-describedby').split(' '))assert.ok(f.doc.getElementById(id));
      assert.equal(input.type,'password');
    }
    assert.equal(f.doc.querySelector('[name="current_password"]').autocomplete,'current-password');
    assert.equal(f.doc.querySelector('[name="password"]').autocomplete,'new-password');
    f.fill('Mismatch#41');await f.submit();
    assert.equal(f.doc.activeElement.name,'password_confirm');assert.equal(f.state.updates,0);
    f.fill();await f.submit();await tick();
    assert.equal(f.state.updates,1);assert.match(f.doc.getElementById('portal-notice').textContent,/sudah dikemas kini/);
    assert.ok([...f.doc.querySelectorAll('input')].every(input=>input.value===''&&input.type==='password'));
  }finally{f.close();}
});
test('reauthentication, expiry and network failures show sanitized feedback on the actual page',async()=>{
  for(const mode of ['credentials','expired','network']){
    const f=await fixture();try{
      f.state.mode=mode;f.fill();await f.submit();await tick();
      assert.equal(f.state.updates,0);assert.ok(!f.doc.body.textContent.includes('sensitive-provider-message'));
      assert.ok(f.doc.getElementById('portal-alert').textContent.length>0);
      if(mode==='credentials'){assert.equal(f.doc.activeElement.name,'current_password');assert.equal(f.doc.activeElement.getAttribute('aria-invalid'),'true');}
      if(mode==='expired'){assert.ok(f.doc.querySelector('[data-portal-form="login"]'));assert.equal(f.doc.querySelector('[name="password"]').value,'');}
    }finally{f.close();}
  }
});
test('pending security requests disable duplicate submissions and exiting erases detached sensitive inputs',async()=>{
  const f=await fixture();let release;try{
    f.state.hold=new Promise(resolve=>{release=resolve;});f.fill();
    const inputs=[...f.doc.querySelectorAll('input')];await f.submit();
    assert.equal(f.doc.querySelector('[type="submit"]').disabled,true);await f.submit();assert.equal(f.state.reauth,1);
    await f.click('exit');assert.ok(inputs.every(input=>input.value===''));release();await tick();await tick();assert.equal(f.state.updates,0);
  }finally{release?.();f.close();}
});
test('global logout requires confirmation; Escape cancels and restores focus, then confirmed logout shows login',async()=>{
  const f=await fixture();try{
    f.fill();await f.click('request-logout-all');assert.equal(f.state.global,0);
    assert.equal(f.doc.activeElement.dataset.portalAction,'cancel-logout-all');assert.ok([...f.doc.querySelectorAll('input')].every(input=>input.value===''));
    f.doc.activeElement.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(f.doc.activeElement.dataset.portalAction,'request-logout-all');assert.equal(f.doc.querySelector('[data-portal-action="logout-all"]'),null);
    await f.click('request-logout-all');await f.click('logout-all');await tick();
    assert.equal(f.state.global,1);assert.ok(f.doc.querySelector('[data-portal-form="login"]'));assert.match(f.doc.getElementById('portal-notice').textContent,/membatalkan sesi/);
  }finally{f.close();}
});
test('reveal buttons have clear state labels, paste is allowed, and leaving for the dashboard clears secrets',async()=>{
  const f=await fixture();try{
    f.fill();const secret=f.doc.querySelector('[name="current_password"]');
    const toggle=f.doc.querySelector('[data-input="'+secret.id+'"]');toggle.click();
    assert.equal(secret.type,'text');assert.equal(toggle.getAttribute('aria-label'),'Sembunyikan kata laluan semasa');
    const paste=new f.dom.window.Event('paste',{bubbles:true,cancelable:true});secret.dispatchEvent(paste);assert.equal(paste.defaultPrevented,false);
    await f.click('dashboard');assert.equal(secret.value,'');assert.equal(secret.type,'password');assert.ok(f.doc.querySelector('[data-portal-action="security"]'));
  }finally{f.close();}
});
test('switching sessions clears the old form before a late reauthentication response can update',async()=>{
  const f=await fixture();let release;try{
    f.state.hold=new Promise(resolve=>{release=resolve;});f.fill();const input=f.doc.querySelector('[name="password"]');await f.submit();
    f.emit({...f.cloud.session,access_token:jwt('session-b')});await tick();
    assert.equal(input.value,'');release();await tick();await tick();assert.equal(f.state.updates,0);
  }finally{release?.();f.close();}
});

test('signed-in security remains usable when the classroom snapshot cannot load',async()=>{
  const f=await fixture({snapshotFails:true});try{
    assert.ok(f.doc.querySelector('[data-portal-form="change-password"]'));
    assert.ok(!f.doc.body.textContent.includes('undefined'));f.fill();await f.submit();await tick();assert.equal(f.state.updates,1);
  }finally{f.close();}
});
