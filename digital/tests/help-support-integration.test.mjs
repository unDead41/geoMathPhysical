import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import {Game} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';

const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const bundle=(await build({entryPoints:[new URL('../dist/app.mjs',import.meta.url).pathname],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],loader:{'.html':'text'}})).outputFiles[0].text;
function fixture(language='ms'){
  const errors=[],log=new VirtualConsole();log.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://app.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:log});
  const w=dom.window,d=w.document;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.scrollTo=()=>{};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.Audio=class extends w.EventTarget{pause(){}play(){return Promise.resolve();}load(){}removeAttribute(){}};
  w.fetch=()=>Promise.reject(new Error('Offline test'));
  Object.assign(w,{TextEncoder,TextDecoder,AbortController,Headers,Request,Response});
  w.Math.random=()=>.41;
  w.localStorage.setItem('geodecoder.digital.preferences.v1',JSON.stringify({tutorialSeen:true,music:false}));
  w.localStorage.setItem('geodecoder.digital.language',language);
  w.eval(bundle);
  const click=s=>{const node=d.querySelector(s);assert.ok(node,s);node.click();};
  const input=(id,value)=>{const n=d.getElementById(id);assert.ok(n,id);n.value=value;n.dispatchEvent(new w.Event('input',{bubbles:true}));};
  const fill=()=>{for(const [id,value] of Object.entries({description:'The scanner stopped working.',steps:'Choose the card, then R1.',expected:'The scan is accepted.',actual:'The card stays selected.'}))input('support-'+id,value);};
  const preview=()=>d.getElementById('support-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const start=()=>{click('#guest-button');d.getElementById('player-name').value='Support QA';d.getElementById('player-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
  return {w,d,errors,click,input,fill,preview,start,close:()=>w.close()};
}
test('help, report, edit and tutorial reuse one dialog while preserving R1/R2, hint and selected card',()=>{
  const f=fixture();try{
    f.start();const q=new Game(QUESTIONS,{name:'Support QA',category:'Tetamu',className:''},0,()=>.41).question;
    f.click(`.choice[data-kind=solid][data-shape=${q.shape}]`);f.click('#r1');f.click('#hint-button');
    f.click('.choice[data-kind=net]');
    const selected=f.d.querySelector('.choice[aria-pressed=true]'),counter=f.d.getElementById('question-counter').textContent;
    assert.ok(selected);const accepted=f.d.getElementById('scanner-body-r1').innerHTML,score=f.d.getElementById('score-value').textContent;
    f.click('[data-action=help]');f.click('[data-help-action=report]');f.fill();f.preview();
    const report=f.d.getElementById('support-preview').value;
    assert.match(report,/R2/);assert.match(report,new RegExp(q.id));assert.doesNotMatch(report,/Support QA/);
    f.click('[data-help-action=edit]');assert.equal(f.d.getElementById('support-description').value,'The scanner stopped working.');
    f.click('[data-help-action=home]');f.click('[data-help-action=tutorial]');assert.ok(f.d.getElementById('tutorial-progress'));
    f.click('[data-dialog-action=help-open]');f.click('#dialog-close');
    assert.equal(f.d.getElementById('scanner-body-r1').innerHTML,accepted);assert.equal(f.d.getElementById('hint-panel').hidden,false);
    assert.equal(f.d.querySelector('.choice[aria-pressed=true]'),selected);assert.equal(f.d.getElementById('question-counter').textContent,counter);
    assert.equal(f.d.getElementById('score-value').textContent,score);assert.equal(f.d.querySelectorAll('dialog').length,1);assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});
test('BM/English report validation is inline, rejects long input and safely renders literal markup',()=>{
  for(const lang of ['ms','en']){const f=fixture(lang);try{
    f.click('[data-action=help]');assert.equal(f.d.getElementById('dialog-title').textContent,lang==='ms'?'Pusat Bantuan':'Help centre');
    f.click('[data-help-action=report]');f.preview();assert.equal(f.d.activeElement.id,'support-description');
    assert.equal(f.d.getElementById('support-description').getAttribute('aria-invalid'),'true');f.fill();
    f.input('support-description','x'.repeat(2001));f.preview();assert.ok(f.d.getElementById('support-description-error').textContent);
    f.input('support-description','<img src=x onerror="alert(1)"> person@example.test PIN 123456');f.preview();
    assert.equal(f.d.querySelector('#dialog-content img'),null);assert.doesNotMatch(f.d.getElementById('support-preview').value,/person@example|123456/);
    assert.deepEqual(f.errors,[]);
  }finally{f.close();}}
});
test('denied clipboard exposes a selectable preview and exports exactly the reviewed text',async()=>{
  const f=fixture('en');try{
    let copied='',downloaded;
    Object.defineProperty(f.w.navigator,'clipboard',{value:{async writeText(text){copied=text;throw new Error('Denied');}},configurable:true});
    f.w.URL.createObjectURL=blob=>{downloaded=blob;return 'blob:test';};f.w.URL.revokeObjectURL=()=>{};
    f.w.HTMLAnchorElement.prototype.click=function(){};
    f.click('[data-action=help]');f.click('[data-help-action=report]');f.fill();f.preview();
    const text=f.d.getElementById('support-preview').value;f.click('[data-help-action=copy]');await new Promise(r=>setTimeout(r,0));
    assert.equal(copied,text);assert.match(f.d.getElementById('support-status').textContent,/Ctrl\+C/);
    f.click('[data-help-action=select]');assert.equal(f.d.getElementById('support-preview').selectionEnd,text.length);
    f.click('[data-help-action=download]');assert.ok(downloaded);assert.match(f.d.getElementById('support-status').textContent,/not been sent/);
    f.click('#dialog-close');f.click('[data-action=help]');f.click('[data-help-action=report]');
    assert.equal(f.d.getElementById('support-actual').value,'The card stays selected.');assert.deepEqual(f.errors,[]);
  }finally{f.close();}
});
