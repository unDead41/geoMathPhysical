import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreferences,PREFERENCES_KEY,textSize} from '../dist/preferences.mjs';
import {loadPreferences,savePreferences} from '../dist/usability.mjs';
const memory=(value)=>{const data=new Map(value===undefined?[]:[[PREFERENCES_KEY,JSON.stringify(value)]]);return {getItem:key=>data.get(key)||null,setItem:(key,next)=>data.set(key,next)};};
test('ease settings migrate into the complete utility record without resetting tutorial or audio choices',()=>{
  const storage=memory({sound:true,motionPaused:true,textSize:150,tutorialSeen:true});
  const settings=createPreferences(storage);
  assert.equal(settings.value.effects,true);assert.equal(settings.value.motion,'reduce');assert.equal(textSize(settings.value.text),150);assert.equal(settings.value.tutorialSeen,true);
  settings.set({musicVolume:45,contrast:'strong'});
  const reloaded=createPreferences(storage);assert.equal(reloaded.value.effects,true);assert.equal(reloaded.value.tutorialSeen,true);assert.equal(reloaded.value.musicVolume,45);
});
test('legacy usability readers and writers share the canonical owner and preserve advanced preferences',()=>{
  const storage=memory({musicVolume:35,effectsVolume:19,muted:true,labels:true,resume:true,lastSection:'labs',text:'large',motion:'full',effects:true});
  assert.deepEqual(loadPreferences(storage),{sound:true,motionPaused:false,textSize:125,tutorialSeen:false});
  assert.equal(savePreferences(storage,{sound:false,motionPaused:true,textSize:150,tutorialSeen:true}),true);
  const saved=createPreferences(storage).value;
  assert.equal(saved.musicVolume,35);assert.equal(saved.effectsVolume,19);assert.equal(saved.labels,true);assert.equal(saved.muted,true);assert.equal(saved.lastSection,'labs');assert.equal(saved.resume,true);
  assert.equal(saved.effects,false);assert.equal(saved.motion,'reduce');assert.equal(saved.text,'largest');assert.equal(saved.tutorialSeen,true);
});
test('storage denial keeps the current complete preference record in memory',()=>{
  const settings=createPreferences({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});
  settings.set({musicVolume:0,muted:true,labels:true,resume:true});settings.reload();
  assert.equal(settings.failed,true);assert.equal(settings.value.musicVolume,0);assert.equal(settings.value.labels,true);assert.equal(settings.value.muted,true);assert.equal(settings.value.resume,true);
});
