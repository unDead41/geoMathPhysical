import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
async function harness({guest=false,role='student'}={}){
 const dom=new JSDOM('<section id="portal-screen" hidden></section>',{url:'http://localhost/'});
 const previous={};for(const name of ['document','FormData','navigator']){previous[name]=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});}
 let listener,fail=false,hold=false,release,calls=[];
 let snapshot={profile:{id:'user-a',username:'ijamm',display_name:'Ijamm',avatar:'initial',role,email:'ijamm@example.test',email_verified:true},classes:[{id:'class-a',name:'2 STEM',members:[]}],rooms:[],invites:[],server_now:new Date().toISOString()};
 const cloud={ready:true,session:guest?null:{user:{id:'user-a'}},onSessionChange(fn){listener=fn;return()=>{};},async auth(){},async rpc(action,payload){calls.push({action,payload});if(action==='update_profile'){if(hold)await new Promise(resolve=>release=resolve);if(fail)throw Error('Sambungan gagal. Cuba lagi.');snapshot={...snapshot,profile:{...snapshot.profile,...payload}};}return structuredClone(snapshot);}};
 const portal=createPortal({cloud});await portal.open({profile:true});
 const click=selector=>dom.window.document.querySelector(selector).click();
 const submit=async(name='Nama Baru',avatar='cone')=>{const doc=dom.window.document;doc.querySelector('#portal-profile-name').value=name;doc.querySelector('#portal-avatar-'+avatar).checked=true;doc.querySelector('form[data-portal-form="profile"]').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await settle();};
 return {dom,cloud,portal,calls,click,submit,get doc(){return dom.window.document;},setFail(v){fail=v;},setHold(v){hold=v;},release(){release();},async switchUser(){cloud.session={user:{id:'user-b'}};listener(cloud.session);await settle();},cleanup(){portal.destroy();dom.window.close();for(const name of Object.keys(previous)){if(previous[name])Object.defineProperty(globalThis,name,previous[name]);else delete globalThis[name];}}};
}
test('profile saves only allowed fields and updates heading and selected avatar',async()=>{
 const h=await harness();try{await h.submit('  Nama Baharu  ');assert.deepEqual(h.calls.find(c=>c.action==='update_profile').payload,{display_name:'Nama Baharu',avatar:'cone'});assert.match(h.doc.querySelector('.portal-profile-link').textContent,/Nama Baharu/);assert.equal(h.doc.querySelector('#portal-avatar-cone').checked,true);assert.equal(h.doc.querySelector('#portal-profile-name').value,'Nama Baharu');assert.match(h.doc.querySelector('#portal-notice').textContent,/berjaya/);h.click('[data-portal-action="profile-back"]');assert.match(h.doc.querySelector('.portal-profile-link').textContent,/Nama Baharu/);}finally{h.cleanup();}
});
test('save failure preserves draft, reports error and allows retry',async()=>{
 const h=await harness();try{h.setFail(true);await h.submit('Draf Saya','pyramid');assert.equal(h.doc.querySelector('#portal-profile-name').value,'Draf Saya');assert.equal(h.doc.querySelector('#portal-avatar-pyramid').checked,true);assert.match(h.doc.querySelector('[data-form-error]').textContent,/Sambungan/);assert.equal(h.doc.querySelector('button[type=submit]').disabled,false);assert.match(h.doc.querySelector('.portal-profile-link').textContent,/Ijamm/);h.setFail(false);await h.submit('Draf Saya','pyramid');assert.match(h.doc.querySelector('#portal-notice').textContent,/berjaya/);}finally{h.cleanup();}
});
test('save blocks duplicate submits and announces pending state',async()=>{
 const h=await harness();try{h.setHold(true);await h.submit();assert.equal(h.doc.querySelector('form').getAttribute('aria-busy'),'true');assert.equal(h.doc.querySelector('button[type=submit]').textContent.includes('Sedang menyimpan'),true);await h.submit();assert.equal(h.calls.filter(c=>c.action==='update_profile').length,1);h.release();await settle();}finally{h.cleanup();}
});
test('invalid input stays local and focuses the named field',async()=>{
 const h=await harness();try{await h.submit(' ');assert.equal(h.calls.some(c=>c.action==='update_profile'),false);assert.equal(h.doc.activeElement.id,'portal-profile-name');assert.equal(h.doc.activeElement.getAttribute('aria-invalid'),'true');}finally{h.cleanup();}
});
test('guest profile explains account requirement and links to existing login',async()=>{
 const h=await harness({guest:true});try{assert.match(h.doc.body.textContent,/mod tetamu/);assert.equal(h.doc.querySelector('form[data-portal-form="profile"]'),null);h.click('[data-portal-action="profile-login"]');assert.ok(h.doc.querySelector('form[data-portal-form="login"]'));assert.equal(h.calls.length,0);}finally{h.cleanup();}
});
test('refresh retains drafts and read-only identity data; user text is escaped',async()=>{
 const h=await harness({role:'teacher'});try{h.doc.querySelector('#portal-profile-name').value='Draf Belum Simpan';h.doc.querySelector('#portal-avatar-cube').checked=true;await h.portal.refresh();assert.equal(h.doc.querySelector('#portal-profile-name').value,'Draf Belum Simpan');assert.equal(h.doc.querySelector('#portal-avatar-cube').checked,true);assert.match(h.doc.querySelector('dl').textContent,/Guru.*Kelas.*2 STEM/s);assert.equal(h.doc.querySelector('input[name=role]'),null);await h.submit('<img src=x onerror=alert(1)>');assert.equal(h.doc.querySelector('.portal-profile-link img'),null);}finally{h.cleanup();}
});
test('late save cannot overwrite a newer account session',async()=>{
 const h=await harness();try{h.setHold(true);await h.submit('Nama Akaun Lama');await h.switchUser();h.release();await settle();assert.doesNotMatch(h.doc.querySelector('#portal-notice').textContent,/berjaya/);assert.doesNotMatch(h.doc.querySelector('.portal-profile-link')?.textContent||'',/Nama Akaun Lama/);}finally{h.cleanup();}
});
