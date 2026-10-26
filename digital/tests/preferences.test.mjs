import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPreferences,normalize,DEFAULTS} from '../dist/preferences.mjs';
test('settings persist, normalize and restore',()=>{const m=new Map(),s={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};const p=createPreferences(s);p.set({musicVolume:44,text:'largest',labels:true});assert.equal(createPreferences(s).value.musicVolume,44);assert.equal(createPreferences(s).value.labels,true);p.reset();assert.deepEqual(p.value,DEFAULTS);assert.equal(normalize({musicVolume:999,text:'bad'}).musicVolume,100);assert.equal(normalize({text:'bad'}).text,'normal');});
test('blocked and corrupt storage keep session preferences',()=>{for(const s of [null,{getItem(){throw Error()},setItem(){throw Error()}},{getItem(){return '{'},setItem(){throw Error()}}]){const p=createPreferences(s);p.set({effects:true});assert.equal(p.value.effects,true);assert.equal(p.failed,true);p.reset();assert.equal(p.value.effects,false);}});


test('storage reload synchronizes only normalized preferences',()=>{let raw='{}';const p=createPreferences({getItem:()=>raw,setItem:(k,v)=>raw=v});let notified=0;p.subscribe(()=>notified++);raw=JSON.stringify({text:'large',effectsVolume:-10,labels:'unsafe'});p.reload();assert.equal(p.value.text,'large');assert.equal(p.value.effectsVolume,0);assert.equal(p.value.labels,false);assert.equal(notified,1);});
