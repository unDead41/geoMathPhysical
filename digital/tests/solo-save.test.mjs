import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,REVIEW_MS} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {nextVisualPlan} from '../dist/visuals.mjs';
import {makeSnapshot,restoreSnapshot,SoloStore,SOLO_KEY} from '../dist/solo-save.mjs';
import {ScoreStore} from '../dist/storage.mjs';
const player={name:'Solo QA',category:'Tetamu',className:''};
const context=()=>({actor:'guest',id:'stable-round-id',visualPlan:nextVisualPlan(),selected:null});
const snap=(g,now=100,c=context())=>makeSnapshot(g,QUESTIONS,c,now);
const restore=s=>restoreSnapshot(JSON.parse(JSON.stringify(s)),QUESTIONS,'guest',100000);
for(const mode of ['quiz','practice','review'])test(`${mode}: R1, R2, chosen card, hint, colors/order and accumulated time survive cold recovery`,()=>{
 const g=new Game(QUESTIONS,player,0,Math.random,{mode,questionIds:mode==='review'?['K1','S1']:undefined});
 const c=context();c.selected={kind:'solid',shape:g.solidOrder[2],letter:'C'};
 let s=snap(g,100,c),r=restore(s);assert.deepEqual(r.selected,c.selected);assert.deepEqual(r.visualPlan,c.visualPlan);assert.deepEqual(r.game.round.map(q=>q.id),s.questionIds);assert.deepEqual(r.game.solidOrder,g.solidOrder);
 assert.equal(r.game.time(100010),110);
 g.toggleHint();g.scan('solid',g.question.shape,'r1',200);g.toggleHint();
 s=snap(g,250);r=restore(s);assert.equal(r.game.stage,'net');assert.equal(r.game.hints,1);assert.equal(r.game.hintOpen,true);assert.equal(r.game.elapsed,250);assert.equal(r.game.scan('solid',g.question.shape,'r1',100001).type,'stage');
 r.game.toggleHint();assert.equal(r.game.hints,1);
});
for(const action of ['wrong-r1','wrong-r2','skip','correct'])test(`${action}: recovery retains spent attempt and outstanding feedback/review delay`,()=>{
 const g=new Game(QUESTIONS,player,0),shape=g.question.shape,wrong=g.solidOrder.find(s=>s!==shape);
 g.toggleHint();if(action!=='wrong-r1'&&action!=='skip')g.scan('solid',shape,'r1',10);
 if(action==='skip')g.skip(20);else if(action==='wrong-r1')g.scan('solid',wrong,'r1',20);else g.scan('net',action==='correct'?shape:wrong,'r2',20);
 g.pause(100);const s=snap(g,9000),r=restore(s).game;
 assert.deepEqual(r.answers,g.answers);assert.equal(r.score,g.score);assert.equal(r.scan('solid',shape,'r1',100001).type,'blocked');
 if(action==='correct'){assert.equal(r.update(100000+s.feedbackRemaining-1),false);assert.equal(r.update(100000+s.feedbackRemaining),true);assert.equal(r.score,1);}
 else{assert.equal(r.continueReview(100000+s.reviewRemaining-1),false);assert.equal(r.continueReview(100000+s.reviewRemaining),true);assert.equal(r.score,0);}
});
test('full rounds with fractional time restore after each answer and store finished quiz once by stable identity',()=>{
 const g=new Game(QUESTIONS,player,0);let now=20.45;
 while(g.status!=='finished'){
  g.scan('solid',g.question.shape,'r1',now);g.scan('net',g.question.shape,'r2',now+0.1);
  restore(snap(g,now+3));g.update(now+1000);now+=1100.49;
 }
 const s=snap(g,now),r=restore(s).game;assert.equal(r.status,'finished');assert.equal(r.score,10);
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},store=new ScoreStore(storage);
 store.save(g.result(s.id));store.save(r.result(s.id));assert.equal(store.read().length,1);
});
test('damaged, old, cross-account, wrong-bank and forged progress are rejected without touching unrelated records',()=>{
 const s=snap(new Game(QUESTIONS,player));
 for(const mutate of [x=>x.version=0,x=>x.actor='another-user',x=>x.bank='old',x=>x.state.score=10,x=>x.state.stage='net',x=>x.state.attempts.net='cube',x=>x.state.status='finished',x=>x.state.solidOrder=['cube'],x=>x.reviewRemaining=-1]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>restore(bad));}
 const map=new Map([['module-progress','untouched'],[SOLO_KEY+'guest','{broken']]);const store=new SoloStore({getItem:k=>map.get(k),removeItem:k=>map.delete(k)},QUESTIONS);
 assert.equal(store.read('guest'),null);assert.equal(store.status,'invalid');assert.equal(store.read('account-a'),null);assert.equal(map.get('module-progress'),'untouched');
});
test('storage failures never report saved; actor keys isolate guest and accounts; Duel cannot be snapshotted',()=>{
 const blocked=new SoloStore({getItem(){throw Error('denied');},setItem(){throw Error('full');},removeItem(){throw Error('denied');}},QUESTIONS),g=new Game(QUESTIONS,player);
 assert.equal(blocked.save(g,context(),100),false);assert.equal(blocked.status,'failed');assert.equal(blocked.read('guest'),null);assert.equal(blocked.status,'failed');assert.equal(blocked.clear('guest'),false);
 const map=new Map(),store=new SoloStore({getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)},QUESTIONS);
 store.save(g,context(),10);store.save(g,{...context(),actor:'account-a',id:'account-round'},20);
 assert.equal(store.read('guest').id,'stable-round-id');assert.equal(store.read('account-a').id,'account-round');assert.equal(store.read('account-b'),null);
 g.mode='duel';assert.throws(()=>snap(g));
});
test('randomized real-engine sessions survive checkpoint after every action and pause without changing outcomes',()=>{
 let seed=41;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let run=0;run<80;run++){
  let g=new Game(QUESTIONS,player,0,rng,{mode:run%2?'practice':'quiz'}),time=0;
  while(g.status!=='finished'){
   time+=rng()*350;
   if(g.status==='running'){
    if(rng()<.25)g.toggleHint();
    if(rng()<.2)g.skip(time);else g.scan(g.stage,rng()<.8?g.question.shape:g.solidOrder.find(s=>s!==g.question.shape),g.stage==='solid'?'r1':'r2',time);
   }else if(g.reviewing){time+=REVIEW_MS;g.continueReview(time);}else{time+=1000;g.update(time);}
   const s=snap(g,time);const r=restoreSnapshot(s,QUESTIONS,'guest',time).game;
   for(const key of ['score','mistakes','hints','skipped','status','index','stage'])assert.equal(r[key],g[key]);assert.deepEqual(r.answers,g.answers);g=r;
  }
 }
});
