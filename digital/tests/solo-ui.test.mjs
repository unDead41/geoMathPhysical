import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const bundle=(await build({entryPoints:[new URL('../dist/app.mjs',import.meta.url).pathname],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],loader:{'.html':'text'}})).outputFiles[0].text;
function fixture(seed={},denied=false,hash=''){
  const errors=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message.slice(0,180)));
  const dom=new JSDOM(html,{url:'https://app.invalid/'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const {window}=dom;
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  let clock=0;window.performance.now=()=>clock;
  window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};window.scrollTo=()=>{};
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new window.Event('close'));};
  window.Audio=class extends window.EventTarget{constructor(){super();this.paused=true;}pause(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}load(){}removeAttribute(){}};
  window.fetch=()=>Promise.reject(new Error('No network in DOM fixture'));
  Object.assign(window,{TextEncoder,TextDecoder,AbortController,Headers,Request,Response});
  window.localStorage.setItem('geodecoder.digital.preferences.v1',JSON.stringify({tutorialSeen:true,music:false}));
  for(const [key,value] of Object.entries(seed))window.localStorage.setItem(key,value);
  if(denied)Object.defineProperty(window,'localStorage',{get(){throw Error('Denied');}});
  window.eval(bundle.replace(/(var cloud = new ClassroomCloud\(\);)/,'$1 window.__soloQACloud = cloud;').replace('function beginSelectedMode() {','window.__soloQAOffline=offline;window.__soloQADuel=duelClient;window.__soloQAFrame=frame;window.__soloQARoom=openRoomGame;\nfunction beginSelectedMode() {'));
  const change=(node,value)=>{if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new window.Event(node.type==='range'?'input':'change',{bubbles:true}));};
  const tick=delta=>{clock+=delta;window.__soloQAFrame(clock);};
  return {window,document:window.document,errors,change,tick};
}

import {SOLO_KEY} from '../dist/solo-save.mjs';
const seedFrom=f=>Object.fromEntries(Object.keys(f.window.localStorage).map(key=>[key,f.window.localStorage.getItem(key)]));
function start(f){f.document.getElementById('guest-button').click();f.document.getElementById('player-name').value='QA Solo';f.document.getElementById('player-form').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));if(!f.document.getElementById('guide-screen').hidden)f.document.getElementById('guide-start-button').click();}
function resume(f){f.document.getElementById('solo-resume-button').click();assert.equal(f.document.getElementById('resume-screen').hidden,false);f.document.getElementById('resume-continue-button').click();}
test('cold DOM reload restores selected R1, exact card SVG tones and R2 hint state without network',()=>{
 const a=fixture();let b,c;try{
  start(a);const card=a.document.querySelector('.choice');card.click();
  const before=a.document.getElementById('solid-choices').innerHTML;
  b=fixture(seedFrom(a));resume(b);assert.equal(b.document.querySelector('.choice[aria-pressed=true]').dataset.shape,card.dataset.shape);assert.equal(b.document.getElementById('solid-choices').innerHTML,before);
  const snapshot=JSON.parse(b.window.localStorage.getItem(SOLO_KEY+'guest')),shape=snapshot.questionIds[0];
  // Stable question ID is looked up in the real bank; no private Game mutation.
  const expected=QUESTIONS.find(q=>q.id===shape).shape;
  b.document.querySelector(`.choice[data-kind=solid][data-shape=${expected}]`).click();b.document.getElementById('r1').click();b.document.getElementById('hint-button').click();
  c=fixture(seedFrom(b));resume(c);assert.match(c.document.getElementById('feedback-text').textContent,/Bongkah betul/);assert.equal(c.document.getElementById('hint-button').getAttribute('aria-expanded'),'true');
  assert.deepEqual([...a.errors,...b.errors,...c.errors],[]);
 }finally{a.window.close();b?.window.close();c?.window.close();}
});
import {QUESTIONS} from '../dist/questions.mjs';
import {Game} from '../dist/core.mjs';
test('new game confirmation cancels safely, damaged snapshot explains replacement, denied storage does not claim saved',()=>{
 const a=fixture();let b,c;try{
  start(a);const original=a.window.localStorage.getItem(SOLO_KEY+'guest');
  a.document.getElementById('brand-home').click();a.document.querySelector('[data-dialog-action=home]').click();start(a);
  a.document.getElementById('resume-new-button').click();a.document.querySelector('[data-dialog-action=solo-back]').click();assert.equal(JSON.parse(a.window.localStorage.getItem(SOLO_KEY+'guest')).id,JSON.parse(original).id);
  b=fixture({[SOLO_KEY+'guest']:'{bad'});b.document.getElementById('solo-resume-button').click();assert.match(b.document.getElementById('resume-subtitle').textContent,/rosak/);
  c=fixture({},true);start(c);assert.match(c.document.getElementById('solo-save-status').textContent,/belum dapat disimpan/);assert.equal(c.document.getElementById('game-screen').hidden,false);
 }finally{a.window.close();b?.window.close();c?.window.close();}
});
test('account identity change stops the old game, isolates snapshots and never puts Auth credentials into a game snapshot',()=>{
 const f=fixture();try{
  start(f);const cloud=f.window.__soloQACloud;assert.ok(cloud);const guest=f.window.localStorage.getItem(SOLO_KEY+'guest');
  const accountA='11111111-1111-4111-8111-111111111111',accountB='22222222-2222-4222-8222-222222222222';
  cloud._setSession({user:{id:accountA},access_token:'secret-a'});for(const cb of cloud.listeners)cb(cloud.session);
  assert.equal(f.document.getElementById('game-screen').hidden,true);assert.equal(f.document.getElementById('solo-resume-button').hidden,true);
  start(f);assert.ok(f.window.localStorage.getItem(SOLO_KEY+accountA));assert.equal(f.window.localStorage.getItem(SOLO_KEY+accountA).includes('secret-a'),false);
  cloud._setSession({user:{id:accountB},access_token:'secret-b'});for(const cb of cloud.listeners)cb(cloud.session);assert.equal(f.document.getElementById('solo-resume-button').hidden,true);
  cloud._setSession(null);for(const cb of cloud.listeners)cb(null);assert.equal(f.document.getElementById('solo-resume-button').hidden,false);assert.ok(guest);
 }finally{f.window.close();}
});
for(const language of ['ms','en'])test(`${language}: resume summary, discard confirmation and replacement use current language`,()=>{
 const f=fixture();try{
  start(f);f.document.getElementById('brand-home').click();f.document.querySelector('[data-dialog-action=home]').click();
  f.document.getElementById('settings-button').click();f.change(f.document.getElementById('language-select'),language);f.document.getElementById('dialog-close').click();
  const old=JSON.parse(f.window.localStorage.getItem(SOLO_KEY+'guest')).id;
  f.document.getElementById('solo-resume-button').click();assert.match(f.document.getElementById('resume-details').textContent,language==='en'?/Progress/:/Kemajuan/);assert.equal(f.document.querySelector('#resume-details progress').max,10);
  f.document.getElementById('resume-new-button').click();assert.match(f.document.getElementById('dialog-content').textContent,language==='en'?/Discard/:/Buang/);
  f.document.querySelector('[data-dialog-action=solo-discard]').click();assert.equal(f.window.localStorage.getItem(SOLO_KEY+'guest'),null);assert.equal(f.document.getElementById('guest-screen').hidden,false);
  start(f);assert.notEqual(JSON.parse(f.window.localStorage.getItem(SOLO_KEY+'guest')).id,old);assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});

test('the first-play page gates the clock and demo seeking never changes a game',()=>{
 const f=fixture({'geodecoder.digital.preferences.v1':JSON.stringify({tutorialSeen:false,music:false})});try{
  f.document.getElementById('guest-button').click();f.document.getElementById('player-name').value='QA Guide';
  f.document.getElementById('player-form').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(f.document.getElementById('guide-screen').hidden,false);assert.equal(f.document.getElementById('game-screen').hidden,true);
  assert.equal(f.window.localStorage.getItem(SOLO_KEY+'guest'),null);
  f.change(f.document.getElementById('entry-demo-position'),'12');assert.equal(f.document.getElementById('entry-demo-time').textContent,'00:12 / 00:24');
  assert.equal(f.document.querySelector('[data-guide-step="2"]').classList.contains('guide-step-active'),true);
  f.document.getElementById('entry-demo-play').click();assert.equal(f.document.getElementById('entry-demo-play').getAttribute('aria-pressed'),'true');
  f.document.getElementById('entry-demo-play').click();assert.equal(f.document.getElementById('entry-demo-play').getAttribute('aria-pressed'),'false');
  f.document.getElementById('guide-start-button').click();assert.equal(f.document.getElementById('game-screen').hidden,false);assert.ok(f.window.localStorage.getItem(SOLO_KEY+'guest'));
  assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});

test('shared radio mode cards start real practice and an empty resume deep link fabricates no progress',()=>{
 const f=fixture(),empty=fixture({},false,'#sambung');try{
  assert.equal(empty.document.getElementById('resume-screen').hidden,false);assert.equal(empty.document.getElementById('resume-continue-button').hidden,true);
  assert.equal(empty.document.querySelector('#resume-details progress'),null);assert.match(empty.document.getElementById('resume-details').textContent,/Belum ada/);
  f.document.getElementById('guest-button').click();const radio=f.document.querySelector('input[name="game-mode-option"][value="practice"]');
  radio.checked=true;radio.dispatchEvent(new f.window.Event('change',{bubbles:true}));assert.equal(f.document.getElementById('play-mode').value,'practice');
  f.document.getElementById('player-name').value='QA Practice';f.document.getElementById('player-form').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(f.document.getElementById('game-screen').hidden,false);assert.match(f.document.getElementById('question-counter').textContent,/15/);
  const saved=JSON.parse(f.window.localStorage.getItem(SOLO_KEY+'guest'));assert.equal(saved.mode,'practice');assert.ok(Number.isFinite(saved.savedAt));
  assert.deepEqual([...f.errors,...empty.errors],[]);
 }finally{f.window.close();empty.window.close();}
});

test('header language and theme controls share the application preference owners',()=>{
 const f=fixture();try{
  f.document.querySelector('[data-entry-language="en"]').click();
  assert.equal(f.document.documentElement.lang,'en');assert.equal(f.document.querySelector('[data-entry-language="en"]').getAttribute('aria-pressed'),'true');
  assert.equal(f.document.getElementById('theme-button').getAttribute('aria-label'),'Switch to dark theme');
  f.document.getElementById('theme-button').click();assert.equal(f.document.documentElement.dataset.theme,'dark');
  assert.equal(f.document.getElementById('theme-button').getAttribute('aria-label'),'Switch to light theme');
  f.document.getElementById('settings-button').click();assert.equal(f.document.getElementById('theme-select').value,'dark');
  assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});



test('entry routes keep solo leave cancellation, help and validated resume under one owner',()=>{
 const f=fixture();try{
  start(f);const before=JSON.parse(f.window.localStorage.getItem(SOLO_KEY+'guest'));
  f.document.querySelector('.primary-navigation [data-entry-route="play"]').click();
  assert.equal(f.document.getElementById('app-dialog').open,true);assert.equal(f.document.getElementById('game-screen').hidden,false);
  f.document.querySelector('#dialog-content [data-dialog-action="close"]').click();
  f.document.getElementById('brand-home').click();f.document.querySelector('[data-dialog-action="home"]').click();
  assert.equal(f.document.getElementById('welcome').hidden,false,'A cancelled destination must not replay on a later departure');
  f.document.querySelector('.footer-links [data-entry-route="resume"]').click();
  assert.equal(f.window.location.hash,'#sambung');assert.equal(f.document.getElementById('resume-screen').hidden,false);
  f.document.getElementById('resume-continue-button').click();
  assert.equal(JSON.parse(f.window.localStorage.getItem(SOLO_KEY+'guest')).id,before.id);
  f.document.getElementById('help-button').click();
  assert.equal(f.document.getElementById('game-screen').hidden,false);assert.equal(f.document.getElementById('guide-screen').hidden,true);assert.equal(f.document.getElementById('app-dialog').open,true);
  assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});

test('Duel entry navigation reaches Classes and keeps the GeoMath header localized',async()=>{
 const f=fixture();try{
  f.window.__soloQACloud.init=async()=>null;
  f.document.getElementById('guest-button').click();f.document.getElementById('player-name').value='QA Duel';f.change(f.document.getElementById('play-mode'),'duel');
  f.document.getElementById('player-form').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(f.document.getElementById('duel-screen').hidden,false);assert.match(f.document.title,/GeoMath.*Duel/);
  assert.match(f.document.getElementById('brand-home').textContent,/GeoMath/);
  f.document.querySelector('[data-entry-language="en"]').click();assert.equal(f.document.getElementById('brand-home').getAttribute('aria-label'),'GeoMath, home page');
  f.document.querySelector('.primary-navigation [data-entry-route="classes"]').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(f.document.getElementById('portal-screen').hidden,false);assert.equal(f.window.location.hash,'#kelas');
  assert.ok(f.document.querySelector('[data-portal-form="login"]'),f.document.getElementById('portal-content').textContent+' '+JSON.stringify(f.errors));assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});

test('real signed-in solo completion enters the offline queue once and finished saves do not offer resume',async()=>{
 const f=fixture();try{
  Object.defineProperty(f.window.navigator,'onLine',{value:false,configurable:true});
  const cloud=f.window.__soloQACloud,offline=f.window.__soloQAOffline,owner='11111111-1111-4111-8111-111111111111';
  cloud._setSession({user:{id:owner},access_token:'fixture-secret'});for(const listener of cloud.listeners)listener(cloud.session,'SIGNED_IN');
  start(f);
  for(let i=0;i<10;i++){
   const saved=JSON.parse(f.window.localStorage.getItem(SOLO_KEY+owner));const shape=QUESTIONS.find(q=>q.id===saved.questionIds[i]).shape;
   f.document.querySelector(`.choice[data-kind="solid"][data-shape="${shape}"]`).click();f.document.getElementById('r1').click();
   f.document.querySelector(`.choice[data-kind="net"][data-shape="${shape}"]`).click();f.document.getElementById('r2').click();f.tick(1000);
  }
  await offline.settle();
  assert.equal(f.document.getElementById('result-screen').hidden,false);assert.equal(f.document.getElementById('result-score').textContent,'10');
  const events=[...offline.sync.queue(owner).values()].map(row=>row.event);
  assert.equal(events.length,1);assert.equal(events[0].kind,'solo');assert.equal(events[0].payload.score,10);assert.equal(events[0].payload.total,10);assert.equal(JSON.stringify(events).includes('fixture-secret'),false);
  f.document.querySelector('[data-entry-language="en"]').click();f.tick(1000);await offline.settle();assert.equal(offline.sync.queue(owner).size,1);
  f.document.querySelector('.footer-links [data-entry-route="resume"]').click();assert.equal(f.document.getElementById('resume-continue-button').hidden,true);assert.equal(f.document.querySelector('#resume-details progress'),null);
  assert.deepEqual(f.errors,[]);
 }finally{f.window.__soloQAOffline?.stop();f.window.close();}
});


test('classroom return to its portal clears an unconsumed entry destination',async()=>{
 const f=fixture();try{
  f.window.__soloQACloud.init=async()=>null;
  const round=new Game(QUESTIONS,{name:'QA Room',category:'Pelajar',className:'QA'},0,()=>.41).round;
  f.window.__soloQARoom({attemptId:'11111111-1111-4111-8111-111111111111',roomId:'22222222-2222-4222-8222-222222222222',questions:round.map(q=>q.id),index:0,stage:'solid',status:'running',score:0,mistakes:0,hints:0,skipped:0,elapsed:0,hintUsed:false,lastOutcome:null,wrongReader:null,attempts:{solid:null,net:null},answers:[],readyInMs:0});
  f.document.querySelector('.primary-navigation [data-entry-route="learn"]').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(f.document.getElementById('portal-screen').hidden,false,'The existing classroom departure returns to its portal');
  f.document.querySelector('[data-portal-action="exit"]').click();
  assert.equal(f.document.getElementById('welcome').hidden,false,'A later Home action cannot replay the earlier Learn destination');
  assert.equal(f.document.getElementById('module-screen').hidden,true);assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});


test('skip to content focuses the active main area without entering the Play hash route',async()=>{
 const f=fixture();try{
  start(f);const hash=f.window.location.hash;
  f.document.querySelector('.skip-link').click();await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(f.document.getElementById('app-dialog').open,false,'Skipping navigation must not open a leave-game dialog');
  assert.equal(f.document.getElementById('game-screen').hidden,false);assert.equal(f.window.location.hash,hash);
  assert.equal(f.document.activeElement,f.document.getElementById('main'));assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});
