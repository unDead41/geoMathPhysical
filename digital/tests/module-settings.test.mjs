import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createModuleBridge} from '../dist/module-settings.mjs';
import {validateModuleSettings,MODULE_CHANNEL} from '../dist/module-frame.mjs';
const html=fs.readFileSync(new URL('../vendor/module-v1.2.0.html',import.meta.url),'utf8');
function harness(){
 const host=new EventTarget(),frame=new EventTarget(),messages=[];let requested=0,sequence=0;
 let settings={language:'en',textSize:150,motionPaused:true};
 frame.contentWindow={postMessage:(message,target)=>messages.push({message,target})};
 frame.getAttribute=key=>frame[key]||null;frame.removeAttribute=key=>delete frame[key];
 const bridge=createModuleBridge({frame,getSettings:()=>settings,hostWindow:host,openSettings:()=>requested++,createId:()=>`test-${++sequence}`});
 function receive(data,source=frame.contentWindow,origin='null'){const event=new Event('message');Object.assign(event,{data,source,origin});host.dispatchEvent(event);}
 return {bridge,frame,messages,receive,get requested(){return requested;},set settings(value){settings=value;}};
}
test('module settings permit only the three supported presentation values',()=>{
 assert.deepEqual(validateModuleSettings({language:'ms',textSize:100,motionPaused:false}),{language:'ms',textSize:100,motionPaused:false});
 for(const bad of [null,[],{}, {language:'fr',textSize:150,motionPaused:true},{language:'en',textSize:999,motionPaused:true},{language:'en',textSize:150,motionPaused:'false'},{language:'en',textSize:150,motionPaused:true,token:'secret'}])assert.equal(validateModuleSettings(bad),null);
});
test('load and ready recover current settings while sync leaves the existing document intact',()=>{
 const h=harness();h.bridge.open(html);const source=h.frame.srcdoc;h.frame.dispatchEvent(new Event('load'));
 assert.deepEqual(h.messages[0],{message:{channel:MODULE_CHANNEL,version:1,instanceId:'test-1',type:'settings',settings:{language:'en',textSize:150,motionPaused:true}},target:'*'});
 h.settings={language:'ms',textSize:125,motionPaused:false};h.receive({channel:MODULE_CHANNEL,version:1,instanceId:'test-1',type:'ready'});
 assert.equal(h.messages.at(-1).message.settings.language,'ms');assert.equal(h.messages.at(-1).message.settings.textSize,125);assert.equal(h.frame.srcdoc,source);
});
test('foreign windows, origins, versions and closed/old frames cannot open host settings',()=>{
 const h=harness();h.bridge.open(html);const good={channel:MODULE_CHANNEL,version:1,instanceId:'test-1',type:'open-settings'};
 h.receive(good,{});h.receive(good,h.frame.contentWindow,'https://example.com');
 for(const mutation of [{channel:'other'},{version:2},{instanceId:'old'},{type:'answer'}])h.receive({...good,...mutation});
 assert.equal(h.requested,0);h.receive(good);assert.equal(h.requested,1);
 h.bridge.open(html);h.receive(good);assert.equal(h.requested,1);
 h.bridge.clear();h.receive({...good,instanceId:'test-2'});h.frame.dispatchEvent(new Event('load'));
 assert.equal(h.requested,1);assert.equal(h.frame.getAttribute('srcdoc'),null);assert.equal(h.bridge.sync(),false);
});
