import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeWrapper,teachingRuntime} from './runtime_fixture.mjs';
import {learningSchema} from '../../../../tools/module/learning_schema.mjs';

const capture=()=>teachingRuntime().latest();
function state(value,eventSequence=2,requestSequence=0){return {type:'geomath:learning-state',version:1,eventSequence,requestSequence,result:value.result,checkpoint:value.checkpoint,diagnostics:value.diagnostics};}
const progress=h=>({type:'geodecoder:module-progress',protocol:1,session:h.config.progressSession,activity:'net',stage:'prediction',prediction:'Six real faces stay connected.',result:'',explanation:'',completed:false});

test('private learning actions require both canonical readiness channels, the opaque source, and exact bounded values',()=>{
  const h=nativeWrapper();assert.equal(h.api.learningAction({action:'checkpoint'}).accepted,false);
  h.ready();const c=capture();h.receive(state(c));
  assert.equal(h.api.learningSnapshot().ready,true);assert.equal(h.api.learningAction({action:'evaluate',script:'globalThis.run=true'}).accepted,false);
  assert.equal(h.api.learningAction({action:'launch',section:'net',owner:'other'}).accepted,false);
  const accepted=h.api.learningAction({action:'launch',section:'net',mode:'studio'});assert.equal(accepted.accepted,true);assert.equal(accepted.sequence,1);
  assert.equal(h.api.learningAction({action:'checkpoint'}).error,'learning-busy');
  assert.deepEqual(h.teaching.at(-1).value,{type:'geomath:learning-action',version:1,sequence:1,value:{action:'launch',section:'net',mode:'studio'}});
  h.receive(state(c,3,1),{source:{}});h.receive(state(c,3,1),{origin:'https://untrusted.example'});assert.equal(h.api.learningSnapshot().pending,true);
  h.receive(state(c,3,0));assert.equal(h.api.learningSnapshot().pending,true);
  h.receive(state(c,3,1));assert.equal(h.api.learningSnapshot().pending,false);
  const serialized=JSON.stringify(h.teaching);assert.equal(serialized.includes(h.config.instanceId),false);assert.equal(serialized.includes(h.config.bridgeSession),false);
  assert.equal(h.api.configure,undefined);
});

test('stale private state, malformed geometry, owner keys and oversized checkpoints cannot replace native state',()=>{
  const h=nativeWrapper();h.ready();const c=capture();h.receive(state(c));const original=JSON.stringify(h.api.learningSnapshot().checkpoint);
  const old=structuredClone(c);old.checkpoint.explore.yaw=1;h.receive(state(old,2));assert.equal(JSON.stringify(h.api.learningSnapshot().checkpoint),original);
  for(const mutate of [v=>v.checkpoint.explore.zoom=-1,v=>v.checkpoint.owner='not-native',v=>v.diagnostics.actor='forged',v=>v.checkpoint.explore.shape='dodecahedron',v=>v.result.credential='forged']){
    const invalid=structuredClone(c);mutate(invalid);h.receive(state(invalid,3));assert.equal(JSON.stringify(h.api.learningSnapshot().checkpoint),original);
  }
  const huge=structuredClone(c);huge.checkpoint.notes={shape:'cube',piMode:'full',dimensions:{a:'a'.repeat(2097153)}};
  assert.equal(learningSchema.checkpoint(huge.checkpoint),false);assert.equal(h.api.learningAction({action:'restore',checkpoint:huge.checkpoint}).accepted,false);
  const snapshot=h.api.learningSnapshot();snapshot.checkpoint.explore.yaw=99;assert.equal(JSON.stringify(h.api.learningSnapshot().checkpoint),original);
});

test('private monotonic events suppress progress replays while preserving the exact frozen protocol-1 inner envelope',()=>{
  const h=nativeWrapper();h.ready();const record=progress(h);
  h.receive(record);assert.equal(h.native.filter(x=>x.command==='progress').length,0,'real private child cannot fall back to unsequenced progress');
  const wrap=(value,eventSequence)=>({type:'geomath:learning-progress',version:1,eventSequence,progress:value});
  h.receive(wrap({...record,session:'wrong-progress-session'},9000));
  h.receive(wrap({...record,owner:'forged'},9000));
  h.receive(wrap(record,2));h.receive(wrap(record,2));h.receive(wrap(record,3));
  assert.equal(h.native.filter(x=>x.command==='progress').length,1);
  const envelope=h.native.find(x=>x.command==='progress');assert.deepEqual(Object.keys(envelope),['nativeBridgeVersion','instanceId','bridgeSession','command','payload']);assert.deepEqual(envelope.payload,record);assert.equal(envelope.bridgeSession,h.config.bridgeSession);
  const next={...record,stage:'experiment',result:'The six faces fold to form a cube.'};h.receive(wrap(next,4));h.receive(wrap(record,3));assert.equal(h.native.filter(x=>x.command==='progress').length,2);
  h.api.setActive(false);h.receive(wrap({...next,result:'Late inactive event'},5));assert.equal(h.native.filter(x=>x.command==='progress').length,2);assert.equal(h.api.learningAction({action:'checkpoint'}).accepted,false);
  h.api.dispose();h.receive(wrap(next,6));assert.equal(h.native.filter(x=>x.command==='progress').length,2);assert.equal(h.api.learningSnapshot().checkpoint,null);
});

test('only the source allowlist and bounded inert canonical SVG reach native copy/preview events',()=>{
  const h=nativeWrapper();h.ready();
  const link='https://bpk.moe.gov.my/kurikulum/kssm/kssm-tingkatan-2/341-dskp-kssm-matematik-tingkatan-2/file';
  h.receive({type:'geomath:learning-external-link',version:1,eventSequence:2,url:'https://untrusted.example/'});assert.equal(h.api.learningSnapshot().externalLink,null);
  h.receive({type:'geomath:learning-external-link',version:1,eventSequence:2,url:link});assert.deepEqual(structuredClone(h.api.learningSnapshot().externalLink),{url:link});
  h.api.clearNativeEvents();assert.equal(h.api.learningSnapshot().externalLink,null);
  const exported={format:'image/svg+xml',fileName:'GeoDecoder_Bentangan.svg',title:'Canonical cube',svg:'<svg xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 1,0 1,1"/></svg>'};
  for(const svg of ['<svg onload="run()"></svg>','<svg ><script>run()</script></svg>','<svg ><use href="javascript:run()"/></svg>','<svg ><image src="https://untrusted.example/a"/></svg>','<svg >'+' '.repeat(262145)+'</svg>']){
    h.receive({type:'geomath:learning-export',version:1,eventSequence:3,export:{...exported,svg}});assert.equal(h.api.learningSnapshot().export,null);
  }
  h.receive({type:'geomath:learning-export',version:1,eventSequence:3,export:exported});assert.deepEqual(structuredClone(h.api.learningSnapshot().export),exported);
  assert.equal(h.api.clearNativeEvents(),true);assert.equal(h.api.learningSnapshot().export,null);
  h.receive({type:'geomath:learning-external-link',version:1,eventSequence:4,url:link});assert.deepEqual(structuredClone(h.api.learningSnapshot().externalLink),{url:link});
  assert.deepEqual(h.native.map(x=>x.command),['ready'],'copy events never introduce a frozen native command');
});

test('preference updates reuse the same frame and do not replace the validated checkpoint',()=>{
  const h=nativeWrapper();h.ready();const c=capture();c.checkpoint.explore.yaw=.9;c.checkpoint.explore.progress=.4;h.receive(state(c));
  const before=JSON.stringify(h.api.learningSnapshot().checkpoint);
  assert.equal(h.api.updatePreferences({theme:'dark',settings:{...h.config.settings,language:'en',textSize:150,contrast:'strong',motionPaused:true}}),true);
  assert.equal(h.loads(),1);assert.equal(JSON.stringify(h.api.learningSnapshot().checkpoint),before);
  const r=teachingRuntime();r.action({action:'launch',section:'calculator',shape:'cylinder'});r.nodes['measure-j'].value='7.25';r.nodes['measure-j'].dispatchEvent(new Event('input',{bubbles:true}));r.action({action:'rotate',yaw:.2,pitch:.1});
  const original=r.action({action:'checkpoint'}).checkpoint;r.host.language='en';r.host.refresh({...r.host.settings,motionPaused:true,textSize:150,contrast:'strong'});
  assert.deepEqual(r.action({action:'checkpoint'}).checkpoint,original);
});
