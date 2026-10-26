import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPortal} from '../dist/portal.mjs';
import {fixture as cloudFixture} from './active-sessions-test-utils.mjs';
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
async function fixture(){
  const dom=new JSDOM('<html lang="ms"><title>QA</title><section id="portal-screen"></section></html>',{url:'https://fixture.example/',pretendToBeVisual:true});
  const oldDocument=globalThis.document;globalThis.document=dom.window.document;
  const f=cloudFixture();await f.init();const portal=createPortal({cloud:f.cloud});await portal.open({security:true});await tick();
  const doc=dom.window.document;
  const click=async action=>{const control=doc.querySelector(`[data-portal-action="${action}"]`);assert.ok(control,action);control.click();await tick();};
  const close=()=>{portal.destroy();dom.window.close();globalThis.document=oldDocument;};
  return {...f,portal,dom,doc,click,close};
}
test('real portal renders backend rows, one current label, estimates and no raw IDs or fabricated activity',async()=>{
  const f=await fixture();try{
    const region=f.doc.querySelector('#portal-active-sessions');assert.ok(region);
    assert.equal(region.querySelectorAll('[data-session-row]').length,2);
    assert.equal(region.querySelectorAll('[data-current-session]').length,1);
    assert.match(region.textContent,/anggaran/);assert.match(region.textContent,/Chrome/);assert.match(region.textContent,/Safari/);
    assert.ok(!region.textContent.includes('fixture-refresh'));assert.ok(!region.textContent.includes('00000000-0000'));
    assert.match(region.textContent,/Pembatalan satu sesi pilihan belum disokong/);
    assert.equal(region.querySelector('[data-portal-action="revoke-session"]'),null);
  }finally{f.close();}
});
test('others action confirms its full scope, Escape restores focus and confirmed response reloads real list',async()=>{
  const f=await fixture();try{
    await f.click('request-logout-others');assert.deepEqual(f.state.logouts,[]);
    assert.equal(f.doc.activeElement.dataset.portalAction,'cancel-session-logout');assert.match(f.doc.querySelector('#portal-session-confirm').textContent,/Semua sesi lain/);
    f.doc.activeElement.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    assert.equal(f.doc.activeElement.dataset.portalAction,'request-logout-others');
    await f.click('request-logout-others');await f.click('logout-others');await tick();
    assert.deepEqual(f.state.logouts,['others']);assert.ok(f.cloud.session);
    assert.match(f.doc.querySelector('#portal-active-sessions').textContent,/Tiada sesi lain direkodkan/);
  }finally{f.close();}
});
test('loading, retryable network failure and session expiry clear untrusted or stale metadata',async()=>{
  const f=await fixture();let release;try{
    f.state.hold=new Promise(resolve=>{release=resolve;});await f.click('refresh-sessions');
    assert.equal(f.doc.querySelector('#portal-active-sessions').getAttribute('aria-busy'),'true');
    assert.equal(f.doc.querySelector('[data-portal-action="refresh-sessions"]').disabled,true);
    f.state.mode='network';release();await tick();
    assert.equal(f.doc.querySelectorAll('[data-session-row]').length,0);assert.match(f.doc.querySelector('#portal-active-sessions').textContent,/Semak Internet/);
    f.state.mode='expired';await f.click('refresh-sessions');await tick();
    assert.equal(f.doc.querySelectorAll('[data-session-row]').length,0);assert.ok(f.doc.querySelector('[data-portal-form="login"]'));
  }finally{release?.();f.close();}
});
test('switching accounts during a list request cannot render the previous account metadata',async()=>{
  const f=await fixture();let release;try{
    f.state.hold=new Promise(resolve=>{release=resolve;});await f.click('refresh-sessions');
    await f.switchAccount();await tick();release();await tick();
    assert.equal(f.doc.querySelectorAll('[data-session-row]').length,0);assert.equal(f.doc.querySelector('#portal-active-sessions'),null);
    assert.equal(f.cloud.session.user.id,f.state.current.user.id);
  }finally{release?.();f.close();}
});
test('current logout explains sign-in navigation, and all new labels translate to English',async()=>{
  const f=await fixture();try{
    f.doc.documentElement.lang='en';f.portal.localize();
    assert.match(f.doc.querySelector('#portal-active-sessions').textContent,/Active sessions/);
    await f.click('request-logout-current');assert.match(f.doc.querySelector('#portal-session-confirm').textContent,/sign-in page/);
    await f.click('logout-current');await tick();assert.ok(f.doc.querySelector('[data-portal-form="login"]'));
  }finally{f.close();}
});
test('keyboard refresh returns focus after loading without stealing focus from a password field',async()=>{
  const f=await fixture();let release;try{
    f.state.hold=new Promise(resolve=>{release=resolve;});
    f.doc.querySelector('[data-portal-action="refresh-sessions"]').focus();await f.click('refresh-sessions');
    release();await tick();assert.equal(f.doc.activeElement.dataset.portalAction,'refresh-sessions');
    f.state.hold=new Promise(resolve=>{release=resolve;});await f.click('refresh-sessions');
    const password=f.doc.querySelector('[name="current_password"]');password.focus();password.value='unsaved password';
    release();await tick();assert.equal(f.doc.activeElement,password);assert.equal(password.value,'unsaved password');
  }finally{release?.();f.close();}
});
test('account switch during post-logout list refresh cannot announce success in the new account',async()=>{
  const f=await fixture();let release;try{
    const original=f.cloud.securitySessions.bind(f.cloud);let listStarted=false;
    f.cloud.securitySessions=async options=>{listStarted=true;await new Promise(resolve=>{release=resolve;});return original(options);};
    await f.click('request-logout-others');await f.click('logout-others');assert.equal(listStarted,true);
    await f.switchAccount();await tick();release();await tick();
    assert.equal(f.doc.querySelectorAll('[data-session-row]').length,0);
    assert.ok(!f.doc.querySelector('#portal-notice').textContent.includes('membatalkan sesi lain'));
  }finally{release?.();f.close();}
});
