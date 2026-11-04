import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const fromRoot=p=>import(pathToFileURL(process.cwd()+'/'+p));
const {Game,analyseAnswers,reshuffle,SHAPES}=await fromRoot('digital/dist/core.mjs');
const {QUESTIONS}=await fromRoot('digital/dist/questions.mjs');
const {makeSnapshot,restoreSnapshot}=await fromRoot('digital/dist/solo-save.mjs');
const {nextVisualPlan}=await fromRoot('digital/dist/visuals.mjs');
const {reviewQuestionIds}=await fromRoot('digital/dist/usability.mjs');
const {ScoreStore,validRecord}=await fromRoot('digital/dist/storage.mjs');
const path='apps/geomath_flutter/docs/handoffs/app-cloud-game/audit/03-solo-trace.json';
const fixture=JSON.parse(fs.readFileSync(path,'utf8'));
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
assert.equal(hash(JSON.stringify(QUESTIONS)),fixture.bank.sha256Utf8);
assert.equal(fixture.bank.exactJsonIdentity,JSON.stringify(QUESTIONS));
for(const [source,expected] of Object.entries(fixture.source.sourceHashes))assert.equal(hash(fs.readFileSync(source)),expected);
const clone=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
let states=0,draws=0;
for(const scenario of fixture.scenarios){
 let g,plan=null,selected=null,lastResult=null,cursor=0;
 const snapshots=new Map(),rng=()=>{assert.ok(cursor<scenario.rngDraws.length);return scenario.rngDraws[cursor++].value;};
 for(const step of scenario.steps){
  const now=step.clockMs,{method,args:a}=step.call;let out;
  assert.equal(cursor,step.rngDrawRange[0]);
  if(method==='newGame')g=new Game(QUESTIONS,{name:'Provisional Solo QA',category:'Tetamu',className:''},now,rng,a[0]);
  else if(method==='nextVisualPlan'){plan=nextVisualPlan(plan,rng);out=plan;}
  else if(method==='select'){selected=clone(a[0]);out=selected;}
  else if(method==='clearSelection')selected=null;
  else if(method==='makeSnapshot'){out=makeSnapshot(g,QUESTIONS,{actor:a[0],id:a[1],visualPlan:plan,selected},now);snapshots.set(a[2],clone(out));}
  else if(method==='restoreSnapshot'){
   const original=Math.random;let restored;
   try{Math.random=rng;restored=restoreSnapshot(snapshots.get(a[0]),QUESTIONS,a[1],now);}finally{Math.random=original;}
   g=restored.game;plan=restored.visualPlan;selected=restored.selected;out={id:restored.id};
  }else if(method==='sample')out={time:g.time(now),led:{r1:g.led('r1',now),r2:g.led('r2',now)}};
  else if(method==='result'){lastResult=g.result(a[0],a[1]);out=lastResult;}
  else if(method==='analyseAnswers')out=analyseAnswers(lastResult.answers);
  else if(method==='reviewQuestionIds')out=reviewQuestionIds(lastResult,QUESTIONS);
  else if(method==='scan')out=g.scan(...a,now);
  else if(method==='toggleHint')out=g.toggleHint();
  else out=g[method](now);
  assert.deepEqual(clone(out),step.output,scenario.name+':'+step.label);
  const current={...clone(Object.fromEntries(Object.entries(g).filter(([key])=>!['round','rng'].includes(key)))),roundIds:g.round.map(q=>q.id),questionId:g.question.id,time:g.time(now),interactive:g.interactive,reviewReady:g.reviewReady(now),led:{r1:g.led('r1',now),r2:g.led('r2',now)},visualPlan:clone(plan),selected:clone(selected)};
  assert.deepEqual(current,step.state,scenario.name+':'+step.label+' state');
  assert.equal(cursor,step.rngDrawRange[1]);states++;
 }
 assert.equal(cursor,scenario.rngDraws.length);draws+=cursor;
 const map=new Map(),store=new ScoreStore({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)});
 if(validRecord(scenario.result)){store.save(scenario.result);store.save(lastResult);assert.equal(store.read().length,1);}
 else{assert.throws(()=>store.save(scenario.result));assert.equal(store.read().length,0);}
}
let fallbackCursor=0;
assert.deepEqual(reshuffle(SHAPES,SHAPES,()=>fixture.probes.reshuffleFallback.rngDraws[fallbackCursor++]),fixture.probes.reshuffleFallback.output);
assert.equal(fallbackCursor,49);
console.log(JSON.stringify({status:'PASS',node:process.version,sourceHashes:'PASS',bankIdentity:'PASS',actionStates:states,rngDraws:draws,fallbackDraws:fallbackCursor,duplicateLeaderboard:'PASS',practiceReviewExcluded:'PASS',traceBytes:fs.statSync(path).size}));
