import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const bundle=(await build({entryPoints:[new URL('../dist/app.mjs',import.meta.url).pathname],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],loader:{'.html':'text'}})).outputFiles[0].text;
function fixture(seed={},denied=false){
  const errors=[],console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error.message.slice(0,180)));
  const dom=new JSDOM(html,{url:'https://app.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const {window}=dom;
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
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
  window.eval(bundle.replace(/(var cloud = new ClassroomCloud\(\);)/,'$1 window.__soloQACloud = cloud;'));
  const change=(node,value)=>{if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new window.Event(node.type==='range'?'input':'change',{bubbles:true}));};
  return {window,document:window.document,errors,change};
}

import {SOLO_KEY} from '../dist/solo-save.mjs';
const seedFrom=f=>Object.fromEntries(Object.keys(f.window.localStorage).map(key=>[key,f.window.localStorage.getItem(key)]));
function start(f){f.document.getElementById('guest-button').click();f.document.getElementById('player-name').value='QA Solo';f.document.getElementById('player-form').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));f.document.querySelector('[data-dialog-action=tutorial-skip]')?.click();}
function resume(f){f.document.getElementById('solo-resume-button').click();f.document.querySelector('[data-dialog-action=solo-resume]').click();}
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
test('new game confirmation cancels safely, damaged snapshot explains replacement, denied storage does not claim saved',()=>{
 const a=fixture();let b,c;try{
  start(a);const original=a.window.localStorage.getItem(SOLO_KEY+'guest');
  a.document.getElementById('brand-home').click();a.document.querySelector('[data-dialog-action=home]').click();start(a);
  a.document.querySelector('[data-dialog-action=solo-new]').click();a.document.querySelector('[data-dialog-action=solo-back]').click();assert.equal(JSON.parse(a.window.localStorage.getItem(SOLO_KEY+'guest')).id,JSON.parse(original).id);
  b=fixture({[SOLO_KEY+'guest']:'{bad'});b.document.getElementById('solo-resume-button').click();assert.match(b.document.getElementById('dialog-content').textContent,/rosak/);
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
  f.document.getElementById('solo-resume-button').click();assert.match(f.document.getElementById('dialog-content').textContent,language==='en'?/questions answered/:/soalan dijawab/);
  f.document.querySelector('[data-dialog-action=solo-new]').click();assert.match(f.document.getElementById('dialog-content').textContent,language==='en'?/Discard/:/Buang/);
  f.document.querySelector('[data-dialog-action=solo-discard]').click();assert.equal(f.window.localStorage.getItem(SOLO_KEY+'guest'),null);assert.equal(f.document.getElementById('guest-screen').hidden,false);
  start(f);assert.notEqual(JSON.parse(f.window.localStorage.getItem(SOLO_KEY+'guest')).id,old);assert.deepEqual(f.errors,[]);
 }finally{f.window.close();}
});
