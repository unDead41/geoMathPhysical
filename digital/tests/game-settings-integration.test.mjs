import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const bundle=(await build({entryPoints:[new URL('../dist/app.mjs',import.meta.url).pathname],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],loader:{'.html':'text'}})).outputFiles[0].text;
function fixture(saved={}){
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
  window.localStorage.setItem('geodecoder.digital.preferences.v1',JSON.stringify(saved));
  window.eval(bundle);
  const change=(node,value)=>{if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new window.Event(node.type==='range'?'input':'change',{bubbles:true}));};
  return {window,document:window.document,errors,change};
}
test('the complete app starts with one settings dialog and preserves saved utility and ease preferences',()=>{
  const f=fixture({sound:true,textSize:150,motionPaused:true,tutorialSeen:true,musicVolume:0,muted:true,labels:true,resume:true,lastSection:'notes'});
  try{
    assert.deepEqual(f.errors,[]);assert.equal(f.document.querySelectorAll('#settings-button').length,1);
    assert.equal(f.document.querySelectorAll('#music-button').length,1);assert.equal(f.document.querySelectorAll('#sound-button').length,1);
    assert.equal(f.document.documentElement.dataset.textSize,'150');assert.equal(f.document.body.classList.contains('motion-paused'),true);
    f.document.getElementById('settings-button').click();
    assert.equal(f.document.getElementById('app-dialog').open,true);assert.equal(f.document.querySelector('[data-pref=labels]').checked,true);
    f.change(f.document.getElementById('music-volume'),'35');f.change(f.document.getElementById('motion-select'),'full');
    const record=JSON.parse(f.window.localStorage.getItem('geodecoder.digital.preferences.v1'));
    assert.equal(record.musicVolume,35);assert.equal(record.motion,'full');assert.equal(record.effects,true);assert.equal(record.tutorialSeen,true);assert.equal(record.lastSection,'notes');assert.equal(record.muted,true);
    assert.equal(f.document.body.classList.contains('motion-paused'),false);
  }finally{f.window.close();}
});
test('shared language, contrast and audio settings keep a running practice game and its selected card intact',()=>{
  const f=fixture({tutorialSeen:true,music:false});try{
    f.document.getElementById('guest-button').click();f.document.getElementById('player-name').value='QA Guest';
    f.document.getElementById('play-mode').value='practice';
    f.document.getElementById('player-form').dispatchEvent(new f.window.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(f.document.getElementById('game-screen').hidden,false);
    const card=f.document.querySelector('.choice[data-kind=solid]');assert.ok(card);card.click();
    const before=card.className,score=f.document.getElementById('score-value').textContent;
    f.document.getElementById('settings-button').click();f.change(f.document.getElementById('language-select'),'en');
    f.change(f.document.getElementById('contrast-select'),'strong');f.change(f.document.getElementById('text-size-select'),'125');f.change(f.document.querySelector('[data-pref=muted]'),true);
    f.document.getElementById('dialog-close').click();
    assert.equal(f.document.documentElement.lang,'en');assert.equal(f.document.documentElement.dataset.contrast,'strong');assert.equal(f.document.documentElement.dataset.textSize,'125');
    assert.equal(f.document.getElementById('game-screen').hidden,false);assert.equal(card.className,before);assert.equal(f.document.getElementById('score-value').textContent,score);
    assert.match(f.document.getElementById('question-counter').textContent,/15/);assert.deepEqual(f.errors,[]);
  }finally{f.window.close();}
});
test('the Profile control keeps a localized explicit accessible name when its visible label is hidden',()=>{
  const f=fixture();try{
    const profile=f.document.getElementById('profile-button');profile.querySelector('[data-i18n]').hidden=true;
    assert.equal(profile.getAttribute('aria-label'),'Profil Saya');assert.equal(profile.getAttribute('title'),'Profil Saya');
    f.document.getElementById('settings-button').click();f.change(f.document.getElementById('language-select'),'en');
    assert.equal(profile.getAttribute('aria-label'),'My profile');assert.equal(profile.getAttribute('title'),'My profile');
    f.document.getElementById('guest-button').click();assert.match(f.document.getElementById('guest-title').textContent,/Choose your challenge/);
    f.change(f.document.getElementById('language-select'),'ms');assert.equal(profile.getAttribute('aria-label'),'Profil Saya');assert.equal(profile.getAttribute('title'),'Profil Saya');
  }finally{f.window.close();}
});

