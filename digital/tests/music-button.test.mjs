import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
const start=source.indexOf('function renderMusicButton(state){'),end=source.indexOf("document.addEventListener('pointerdown'",start);
function fixture(){
  let writes=0,unlocks=0;const attrs={};
  const button={dataset:{},set innerHTML(value){writes++;},setAttribute:(name,value)=>attrs[name]=value};
  const music={state:{unlocked:false,blocked:true},unlock(){unlocks++;}};
  const api=vm.runInNewContext('(function(){'+source.slice(start,end)+';return {renderMusicButton,unlockMusic};})()',{$:()=>button,icon:name=>name,music});
  return {...api,button,attrs,get writes(){return writes;},get unlocks(){return unlocks;}};
}
test('playback progress keeps the music icon stable between pointerdown and click',()=>{
  const f=fixture();f.renderMusicButton({enabled:true,track:'menu',status:'blocked'});f.renderMusicButton({enabled:true,track:'menu',status:'playing'});
  assert.equal(f.writes,1);assert.equal(f.button.dataset.playback,'playing');
  f.renderMusicButton({enabled:false,track:'menu',status:'off'});assert.equal(f.writes,2);assert.equal(f.attrs['aria-pressed'],'false');
});
test('the dedicated music button handles its own first gesture without starting audio before mute',()=>{
  const f=fixture();f.unlockMusic({isTrusted:true,target:{closest:()=>f.button}});assert.equal(f.unlocks,0);
  f.unlockMusic({isTrusted:true,target:{closest:()=>null}});assert.equal(f.unlocks,1);
});
