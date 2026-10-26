import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
const qaEmail='qa-session-00000000-0000-4000-8000-000000000041@accounts.geodecoder.invalid';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function fixture(){
  const module=await import('../backend/security/qa/ui.mjs').catch(()=>({}));
  assert.equal(typeof module.createLiveSessionQA,'function','portable QA controller must exist');
  const dom=new JSDOM(fs.readFileSync(new URL('../backend/security/qa/index.html',import.meta.url),'utf8'),{url:'https://qa.example/'});
  const state={signins:0,opens:0,hold:null,mode:'success',events:new Set(),localizes:0};
  const cloud={
    session:null,ready:true,
    onSessionChange(fn){state.events.add(fn);return()=>state.events.delete(fn);},
    async init(){return this.session;},
    async securitySessions(){return {sessions:[{is_current:true,status:'recorded'}],truncated:false};},
    client:{auth:{
      async signInWithPassword(){
        state.signins++;await state.hold;
        if(state.mode==='failure')return {data:{session:null,user:null},error:{message:'PROVIDER_SECRET'}};
        cloud.session={user:{id:'qa-user',email:qaEmail},access_token:'private-test-token'};
        return {data:{session:cloud.session,user:cloud.session.user},error:null};
      },
      async refreshSession(){
        return {data:{session:null},error:state.mode==='revoked'?{code:'refresh_token_not_found',message:'PROVIDER_SECRET'}:{name:'AuthRetryableFetchError',status:0,message:'PROVIDER_SECRET'}};
      }
    }}
  };
  const ui=module.createLiveSessionQA({root:dom.window.document.getElementById('qa-shell'),cloud,portalFactory:()=>({async open(){state.opens++;},close(){},destroy(){},localize(){state.localizes++;}})});
  const doc=dom.window.document;
  const fill=(email=qaEmail)=>{doc.getElementById('qa-email').value=email;doc.getElementById('qa-password').value='Ephemeral Test Password';};
  const submit=async()=>{doc.getElementById('qa-login').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();};
  return {doc,state,cloud,fill,submit,ui,close(){ui.destroy();dom.window.close();}};
}
test('portable QA rejects a real learner email before any Auth request and clears the password',async()=>{
  const f=await fixture();try{f.fill('student@example.com');await f.submit();assert.equal(f.state.signins,0);assert.equal(f.doc.getElementById('qa-password').value,'');assert.match(f.doc.getElementById('qa-status').textContent,/QA/);}finally{f.close();}
});
test('portable QA suppresses repeated login and never exports passwords, tokens or email',async()=>{
  const f=await fixture();let release;try{
    f.state.hold=new Promise(resolve=>{release=resolve;});f.fill();await f.submit();await f.submit();assert.equal(f.state.signins,1);assert.equal(f.doc.getElementById('qa-password').value,'');
    release();await tick();await tick();assert.equal(f.state.opens,1);
    f.doc.getElementById('qa-inspect').click();await tick();const exported=JSON.stringify(f.ui.results());
    for(const secret of ['Ephemeral Test Password','private-test-token',qaEmail,'qa-user'])assert.ok(!exported.includes(secret));
    assert.ok(f.ui.results().events.some(event=>event.type==='list-observed'&&event.current_count===1));
  }finally{release?.();f.close();}
});
test('portable QA distinguishes actual provider refresh rejection from an uncertain network failure',async()=>{
  const f=await fixture();try{
    f.fill();await f.submit();f.doc.getElementById('qa-refresh-token').click();await tick();
    assert.equal(f.ui.results().events.at(-1).type,'refresh-unconfirmed');
    f.state.mode='revoked';f.doc.getElementById('qa-refresh-token').click();await tick();
    assert.equal(f.ui.results().events.at(-1).type,'refresh-rejected');assert.ok(!f.doc.body.textContent.includes('PROVIDER_SECRET'));
  }finally{f.close();}
});
test('portable QA clears live controls and returns to login when Auth reports logout',async()=>{
  const f=await fixture();try{
    f.fill();await f.submit();assert.equal(f.doc.getElementById('qa-login').hidden,true);
    f.cloud.session=null;for(const callback of f.state.events)callback(null);await tick();
    assert.equal(f.doc.getElementById('qa-login').hidden,false);assert.equal(f.doc.getElementById('qa-password').value,'');assert.equal(f.doc.getElementById('qa-inspect').disabled,true);
    f.doc.getElementById('qa-language').value='en';f.doc.getElementById('qa-language').dispatchEvent(new f.doc.defaultView.Event('change'));assert.equal(f.doc.documentElement.lang,'en');assert.equal(f.state.localizes,1);
  }finally{f.close();}
});
test('portable QA uses isolated nonpersistent SDK storage and blocks normal account login routes',async()=>{
  const {createQACloud}=await import('../backend/security/qa/ui.mjs');let options,calls=0;
  const cloud=createQACloud((_url,_key,config)=>{calls++;options=config;return {auth:{onAuthStateChange(){}}};});
  await assert.rejects(cloud.auth('login',{email:'student@example.com',password:'Test Password'}),error=>error.code==='unsupported');
  assert.equal(calls,0);void cloud.client;
  assert.equal(options.auth.persistSession,false);assert.equal(options.auth.autoRefreshToken,false);assert.equal(options.auth.detectSessionInUrl,false);
  assert.ok(!Object.hasOwn(options.auth,'storage'));assert.equal(typeof options.auth.storageKey,'string');
});
