import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
async function harness({guest=false,role='student',language='ms',classes=[{id:'class-a',name:'2 STEM',teacher_name:'Cikgu Hana',members:[]}]}={}){
 const dom=new JSDOM(`<html lang="${language}"><section id="portal-screen" hidden></section></html>`,{url:'http://localhost/'});
 const previous={};for(const name of ['document','FormData','navigator']){previous[name]=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,value:dom.window[name]});}
 let listener,fail=false,hold=false,release,calls=[],preferencesOpened=0,badSave=false;
 let snapshot={profile:{id:'user-a',username:'ijamm',display_name:'Ijamm',avatar:'initial',role,email:'ijamm@example.test',email_verified:true},classes,rooms:[],invites:[],server_now:new Date().toISOString()};
 const cloud={ready:true,session:guest?null:{user:{id:'user-a'}},onSessionChange(fn){listener=fn;return()=>{};},async auth(){},async rpc(action,payload){calls.push({action,payload});if(action==='update_profile'){if(hold)await new Promise(resolve=>release=resolve);if(fail)throw Error('Sambungan gagal. Cuba lagi.');snapshot={...snapshot,profile:{...snapshot.profile,...payload}};if(badSave)return {};}return structuredClone(snapshot);}};
 const portal=createPortal({cloud,onPreferences(){preferencesOpened++;}});await portal.open({profile:true});
 const click=selector=>dom.window.document.querySelector(selector).click();
 const submit=async(name='Nama Baru',avatar='cone')=>{const doc=dom.window.document;doc.querySelector('#portal-profile-name').value=name;doc.querySelector('#portal-avatar-'+avatar).checked=true;doc.querySelector('form[data-portal-form="profile"]').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));await settle();};
 return {dom,cloud,portal,calls,click,submit,get doc(){return dom.window.document;},get preferencesOpened(){return preferencesOpened;},setBadSave(v){badSave=v;},setFail(v){fail=v;},setHold(v){hold=v;},release(){release();},async switchUser(){cloud.session={user:{id:'user-b'}};listener(cloud.session);await settle();},cleanup(){portal.destroy();dom.window.close();for(const name of Object.keys(previous)){if(previous[name])Object.defineProperty(globalThis,name,previous[name]);else delete globalThis[name];}}};
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

function edit(h,name='Draf Baharu',avatar='cone'){
 const field=h.doc.querySelector('#portal-profile-name');field.value=name;
 field.dispatchEvent(new h.dom.window.Event('input',{bubbles:true}));
 const radio=h.doc.querySelector('#portal-avatar-'+avatar);radio.checked=true;
 radio.dispatchEvent(new h.dom.window.Event('change',{bubbles:true}));
}
test('draft name and avatar preview update locally, escape markup and survive refresh',async()=>{
 const h=await harness();try{edit(h,'<img src=x>','initial');assert.equal(h.doc.querySelector('[data-profile-preview-name]').textContent,'<img src=x>');assert.equal(h.doc.querySelector('[data-profile-preview] img'),null);assert.equal(h.doc.querySelector('[data-profile-preview-avatar]').textContent,'<');assert.match(h.doc.querySelector('.portal-profile-link').textContent,/Ijamm/);assert.equal(h.calls.some(c=>c.action==='update_profile'),false);await h.portal.refresh();assert.equal(h.doc.querySelector('[data-profile-preview-name]').textContent,'<img src=x>');}finally{h.cleanup();}
});
test('unsaved navigation supports keep editing, Escape and discard without saving',async()=>{
 const h=await harness();try{edit(h);h.click('[data-portal-action="security"]');assert.ok(h.doc.querySelector('#profile-unsaved-title'));assert.ok(h.doc.querySelector('form[data-portal-form="profile"]'));h.click('[data-portal-action="profile-stay"]');assert.equal(h.doc.querySelector('#profile-unsaved-title'),null);assert.equal(h.doc.querySelector('#portal-profile-name').value,'Draf Baharu');h.click('[data-portal-action="profile-back"]');h.doc.querySelector('#portal-profile-name').dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(h.doc.querySelector('#profile-unsaved-title'),null);h.click('[data-portal-action="security"]');h.click('[data-portal-action="profile-discard"]');await settle();assert.ok(h.doc.querySelector('form[data-portal-form="change-password"]'));assert.equal(h.calls.some(c=>c.action==='update_profile'),false);}finally{h.cleanup();}
});
test('save and continue waits for success, keeps a failed draft and permits retry',async()=>{
 const h=await harness();try{edit(h);h.setFail(true);h.click('[data-portal-action="security"]');h.click('[data-portal-action="profile-save-leave"]');await settle();assert.ok(h.doc.querySelector('form[data-portal-form="profile"]'));assert.equal(h.doc.querySelector('#portal-profile-name').value,'Draf Baharu');assert.match(h.doc.querySelector('[data-form-error]').textContent,/Sambungan/);h.setFail(false);h.click('[data-portal-action="profile-save-leave"]');await settle();await settle();assert.ok(h.doc.querySelector('form[data-portal-form="change-password"]'));assert.equal(h.calls.filter(c=>c.action==='update_profile').length,2);}finally{h.cleanup();}
});
test('pending save and continue is single-flight and cannot leave on account change',async()=>{
 const h=await harness();try{edit(h);h.setHold(true);h.click('[data-portal-action="profile-back"]');h.click('[data-portal-action="profile-save-leave"]');h.click('[data-portal-action="profile-save-leave"]');await settle();assert.equal(h.calls.filter(c=>c.action==='update_profile').length,1);assert.ok(h.doc.querySelector('form[data-portal-form="profile"]'));await h.switchUser();h.release();await settle();assert.equal(h.doc.querySelector('#profile-unsaved-title'),null);assert.doesNotMatch(h.doc.querySelector('#portal-notice').textContent,/berjaya/);}finally{h.cleanup();}
});
test('host navigation uses the same guard; preferences keep the draft without a second settings store',async()=>{
 const h=await harness();try{edit(h);h.click('[data-portal-action="profile-settings"]');assert.equal(h.preferencesOpened,1);assert.equal(h.doc.querySelector('#portal-profile-name').value,'Draf Baharu');let resumed=0;assert.equal(h.portal.requestLeave(()=>resumed++),true);assert.equal(resumed,0);h.click('[data-portal-action="profile-discard"]');assert.equal(resumed,1);}finally{h.cleanup();}
});
test('class details use escaped server names and open the selected classroom',async()=>{
 const h=await harness({classes:[{id:'class-a',name:'2 STEM',teacher_name:'<Guru & Hana>',members:[]}]});try{assert.match(h.doc.querySelector('.portal-profile-classes').textContent,/<Guru & Hana>/);assert.equal(h.doc.querySelector('.portal-profile-classes guru'),null);h.click('[data-portal-action="profile-class"]');await settle();assert.equal(h.doc.querySelector('form[data-portal-form="profile"]'),null);assert.ok(h.doc.querySelector('form[data-portal-form="join-pin"]'));}finally{h.cleanup();}
});
test('students without classes get a working join shortcut; teachers do not get student enrollment',async()=>{
 for(const role of ['student','teacher']){const h=await harness({role,classes:[]});try{const join=h.doc.querySelector('[data-portal-action="profile-join"]');assert.equal(Boolean(join),role==='student');if(join){join.click();await settle();assert.equal(h.doc.activeElement.name,'pin');}}finally{h.cleanup();}}
});
test('English profile translates draft controls and retains actual class and teacher names',async()=>{
 const h=await harness({language:'en'});try{assert.match(h.doc.body.textContent,/Usage preferences/);assert.match(h.doc.body.textContent,/Cikgu Hana/);edit(h);h.click('[data-portal-action="security"]');assert.equal(h.doc.querySelector('#profile-unsaved-title').textContent,'Unsaved changes');assert.ok([...h.doc.querySelectorAll('button')].some(b=>b.textContent==='Save and continue'));}finally{h.cleanup();}
});
test('a missing profile save response cannot discard the draft or announce success',async()=>{
 const h=await harness();try{h.setBadSave(true);await h.submit('Draf Kekal');assert.equal(h.doc.querySelector('#portal-profile-name').value,'Draf Kekal');assert.match(h.doc.querySelector('[data-form-error]').textContent,/Profil|profile/);assert.doesNotMatch(h.doc.querySelector('#portal-notice').textContent,/berjaya/);}finally{h.cleanup();}
});
