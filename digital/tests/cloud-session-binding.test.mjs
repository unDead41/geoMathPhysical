import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {JSDOM} from 'jsdom';
import {ClassroomCloud} from '../dist/cloud.mjs';
import {createPortal} from '../dist/portal.mjs';
import {ModuleProgress,MODULE_PROGRESS_KEY} from '../dist/module-progress.mjs';

const users={
  a:'00000000-0000-4000-8000-000000000041',
  b:'00000000-0000-4000-8000-000000000042'
};
const user=name=>({id:users[name],email:name+'@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-10-26T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{}});
const session=(name,sid=name,revision=0)=>({user:user(name),access_token:Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:users[name],session_id:sid,exp:4102444800,iat:1792972800+revision,aud:'authenticated',role:'authenticated'})).toString('base64url')+'.fixture',refresh_token:'fixture-refresh-'+name+'-'+revision,expires_at:4102444800,expires_in:3600,token_type:'bearer'});
const record={activity:'net',stage:'explanation',prediction:'Account A prediction',result:'Account A observation',explanation:'Account A private reflection',completed:true};

async function fixture(){
  const values=new Map([['geodecoder.cloud.auth',JSON.stringify(session('a'))]]),requests=[],clients=[];
  const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const sdkFetch=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input.url),token=(new Headers(init.headers).get('Authorization')||'').slice(7);
    const subject=JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub;
    if(url.pathname==='/auth/v1/user'){
      if(init.method==='PUT')requests.push({type:'password',subject,body:JSON.parse(init.body)});
      return Response.json(subject===users.a?user('a'):user('b'));
    }
    if(url.pathname==='/auth/v1/logout'){requests.push({type:'logout',subject,scope:url.searchParams.get('scope')});return new Response(null,{status:204});}
    const body=JSON.parse(init.body);
    requests.push({type:'rpc',subject,path:url.pathname,...body});
    if(url.pathname==='/rest/v1/rpc/geo_module_progress')return Response.json({records:body.action==='save'?[body.payload]:[]});
    if(url.pathname==='/rest/v1/rpc/geo_action')return Response.json({profile:{id:subject,username:subject===users.a?'account_a':'account_b',display_name:body.payload.display_name||(subject===users.a?'Account A saved name':'Account B saved name'),role:'student'},classes:[],rooms:[],invites:[]});
    throw Error('Unexpected fixture request');
  };
  const cloud=new ClassroomCloud({url:'https://fixture.supabase.co',publishableKey:'fixture-public'}, {
    createClient(url,key,options){
      const client=createClient(url,key,options.auth.persistSession===false?options:{...options,auth:{...options.auth,storage,autoRefreshToken:false},global:{fetch:sdkFetch}});
      clients.push(client);return client;
    },fetch:sdkFetch,recoveryStorage:null,location:{href:'https://fixture.example/'}
  });
  cloud.startHeartbeat=()=>{};await cloud.init();
  const other=createClient('https://fixture.supabase.co','fixture-public',{auth:{storageKey:'geodecoder.cloud.auth',storage,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:sdkFetch}});clients.push(other);
  const switchTo=async(name,sid=name,revision=0)=>{const result=await other.auth.setSession(session(name,sid,revision));assert.equal(result.error,null);};
  const local=new Map([[MODULE_PROGRESS_KEY+users.a,JSON.stringify({version:1,records:[record]})]]);
  const progress=new ModuleProgress({cloud,storage:{getItem:key=>local.get(key),setItem:(key,value)=>local.set(key,value)}});
  progress.setAccount({id:users.a,role:'student'});
  return {cloud,other,requests,local,progress,switchTo,close(){for(const client of clients)client.auth.stopAutoRefresh();}};
}

test('a stale cloud cache cannot synchronize account A practice through account B SDK storage',async()=>{
  const f=await fixture();try{
    await f.switchTo('b');assert.equal(f.cloud.session.user.id,users.a);
    await f.progress.sync();
    assert.equal(f.requests.filter(r=>r.type==='rpc').length,0);
    assert.equal(f.progress.state.status,'pending');
    assert.match(f.local.get(MODULE_PROGRESS_KEY+users.a),/Account A private reflection/);
    assert.equal(f.local.has(MODULE_PROGRESS_KEY+users.b),false);
  }finally{f.close();}
});

test('the explicit progress actor prevents writes when the cloud cache has already changed accounts',async()=>{
  const f=await fixture();try{
    await f.switchTo('b');f.cloud._setSession(session('b'));
    await f.progress.sync();
    assert.equal(f.requests.filter(r=>r.type==='rpc').length,0);
    assert.equal(f.progress.state.status,'pending');
    assert.match(f.local.get(MODULE_PROGRESS_KEY+users.a),/Account A private reflection/);
  }finally{f.close();}
});

test('profile mutations reject a stale account cache before sending any classroom payload',async()=>{
  const f=await fixture();try{
    await f.switchTo('b');
    await assert.rejects(()=>f.cloud.rpc('update_profile',{display_name:'Account A draft',avatar:'cube'}),error=>error.code==='session-changed');
    assert.equal(f.requests.filter(r=>r.type==='rpc').length,0);
  }finally{f.close();}
});

test('an SDK account switch after validation cannot attach the new account JWT to an old payload',async()=>{
  const f=await fixture();try{
    const getSession=f.cloud.client.auth.getSession.bind(f.cloud.client.auth);
    let switched=false;
    f.cloud.client.auth.getSession=async()=>{
      const result=await getSession();
      if(!switched){switched=true;await f.switchTo('b');}
      return result;
    };
    await assert.rejects(()=>f.cloud.moduleProgress('save',record,{expectedUserId:users.a}),error=>error.code==='session-changed');
    assert.equal(switched,true);
    assert.ok(f.requests.filter(r=>r.type==='rpc').every(r=>r.subject===users.a),'old payload was authorized as a different account');
  }finally{f.close();}
});

test('a legitimate token refresh keeps the same account session usable for module RPCs',async()=>{
  const f=await fixture();try{
    await f.switchTo('a','a',1);
    const result=await f.cloud.moduleProgress('save',record,{expectedUserId:users.a});
    assert.equal(result.records[0].explanation,'Account A private reflection');
    assert.equal(f.requests.find(r=>r.type==='rpc').subject,users.a);
  }finally{f.close();}
});

test('a recovery password update cannot operate through another account in shared SDK storage',async()=>{
  const f=await fixture();try{
    f.cloud._rememberRecovery(f.cloud.session);await f.switchTo('b');
    await assert.rejects(()=>f.cloud.auth('reset-password',{password:'Fixture New#41'}));
    assert.equal(f.requests.filter(r=>r.type==='password').length,0);
  }finally{f.close();}
});

test('recovery resets stay on the verified session when another SDK account appears after validation',async()=>{
  const f=await fixture();try{
    f.cloud._rememberRecovery(f.cloud.session);
    const getSession=f.cloud.client.auth.getSession.bind(f.cloud.client.auth);
    let switched=false;
    f.cloud.client.auth.getSession=async()=>{const result=await getSession();if(!switched){switched=true;await f.switchTo('b');}return result;};
    await f.cloud.auth('reset-password',{password:'Fixture New#41'});
    assert.equal(switched,true);
    assert.deepEqual(f.requests.filter(r=>r.type==='password').map(r=>r.subject),[users.a]);
    assert.equal((await f.other.auth.getSession()).data.session.user.id,users.b);
  }finally{f.close();}
});

async function withPortal(run){
  const f=await fixture(),dom=new JSDOM('<!doctype html><html lang="ms"><section id="portal-screen"></section></html>',{url:'https://fixture.example/'});
  const oldDocument=globalThis.document,oldFormData=globalThis.FormData;
  globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
  const portal=createPortal({cloud:f.cloud});
  try{await portal.open({profile:true});await run({...f,portal,dom,document:dom.window.document});}
  finally{portal.destroy();dom.window.close();globalThis.document=oldDocument;globalThis.FormData=oldFormData;f.close();}
}

test('an old profile form cannot mutate the newly cached account before its UI callback arrives',async()=>{
  await withPortal(async f=>{
    await f.switchTo('b');f.cloud._setSession(session('b'));
    f.document.querySelector('#portal-profile-name').value='Account A unsaved draft';
    f.document.querySelector('form[data-portal-form="profile"]').dispatchEvent(new f.dom.window.Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(f.requests.filter(r=>r.type==='rpc'&&r.action==='update_profile').length,0);
  });
});

test('reopening profile after SDK identity changes drops the previous account fields',async()=>{
  await withPortal(async f=>{
    f.document.querySelector('#portal-profile-name').value='Account A unsaved draft';
    await f.switchTo('b');
    await f.portal.open({profile:true});
    assert.equal(f.document.querySelector('#portal-profile-name').value,'Account B saved name');
    assert.doesNotMatch(f.document.querySelector('.portal-profile-link').textContent,/Account A/);
  });
});
