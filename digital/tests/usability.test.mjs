import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {ScoreStore} from '../dist/storage.mjs';

const memory=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
const usability=await import('../dist/usability.mjs').catch(()=>({}));
test('a guest needs only a trimmed nickname while old pupil/student validation stays strict',()=>{
  assert.equal(typeof core.validateGuest,'function');
  const result=core.validateGuest({name:'  Aisyah   QA  ',category:'teacher',className:'forged'});
  assert.equal(result.valid,true);
  assert.deepEqual(result.player,{name:'Aisyah QA',category:'Tetamu',className:''});
  assert.equal(core.validateGuest({name:'A'}).valid,false);
  assert.equal(core.validateGuest({name:'a'.repeat(61)}).valid,false);
  assert.equal(core.validatePlayer({name:'Aisyah',category:'Murid',className:''}).valid,false);
});
test('settings use safe defaults for absent, malformed or denied preference storage',()=>{
  assert.equal(typeof usability.loadPreferences,'function');
  const defaults={sound:false,motionPaused:false,textSize:100,tutorialSeen:false};
  assert.deepEqual(usability.loadPreferences(memory()),defaults);
  const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.deepEqual(usability.loadPreferences(denied),defaults);
  const storage=memory();storage.setItem(usability.PREFERENCES_KEY,'{bad');
  assert.deepEqual(usability.loadPreferences(storage),defaults);
  assert.equal(usability.savePreferences(denied,{...defaults,textSize:150}),false);
});
test('settings persist supported values and ignore injected/unbounded values',()=>{
  assert.equal(typeof usability.savePreferences,'function');
  const storage=memory(),wanted={sound:true,motionPaused:true,textSize:150,tutorialSeen:true};
  assert.equal(usability.savePreferences(storage,wanted),true);
  assert.deepEqual(usability.loadPreferences(storage),wanted);
  storage.setItem(usability.PREFERENCES_KEY,JSON.stringify({sound:'true',motionPaused:1,textSize:999,tutorialSeen:'yes',extra:'ignored'}));
  assert.deepEqual(usability.loadPreferences(storage),{sound:false,motionPaused:false,textSize:100,tutorialSeen:false});
});

test('missed-question practice selects only stable wrong/skipped IDs once, preserving the original result',()=>{
  assert.equal(typeof usability.reviewQuestionIds,'function');
  const result={answers:[{id:'K1',outcome:'correct'},{id:'S2',outcome:'wrong'},{id:'P3',outcome:'skipped'},{id:'S2',outcome:'wrong'},{id:'unknown',outcome:'wrong'}]};
  const before=JSON.stringify(result);
  assert.deepEqual(usability.reviewQuestionIds(result,QUESTIONS),['S2','P3']);
  assert.deepEqual(usability.reviewQuestionIds({answers:[{id:'K1',outcome:'correct'}]},QUESTIONS),[]);
  assert.equal(JSON.stringify(result),before);
});
test('a review round uses exactly its validated subset with the existing single-attempt rules',()=>{
  const player={name:'QA Guest',category:'Tetamu',className:''};
  const game=new core.Game(QUESTIONS,player,0,Math.random,{mode:'review',questionIds:['K1','S2']});
  assert.equal(game.total,2);assert.deepEqual(game.round.map(q=>q.id).sort(),['K1','S2']);
  const wrong=core.SHAPES.find(shape=>shape!==game.question.shape);
  assert.equal(game.scan('solid',wrong,'r1',200).type,'wrong');
  assert.equal(game.scan('solid',game.question.shape,'r1',201).type,'blocked');
  for(const questionIds of [[],['K1','K1'],['missing']])assert.throws(()=>new core.Game(QUESTIONS,player,0,Math.random,{mode:'review',questionIds}));
});
test('guest quiz results persist, while review results cannot enter or replace the quiz board',()=>{
  const storage=memory(),store=new ScoreStore(storage),player={name:'QA Guest',category:'Tetamu',className:''};
  const quiz=new core.Game(QUESTIONS,player,0);let now=0;
  while(quiz.status!=='finished'){quiz.skip(now);quiz.continueReview(now+=1800);}
  const original=quiz.result('original',1000);store.save(original);const before=storage.getItem('geodecoder.digital.single-attempt.v1.scores');
  const review=new core.Game(QUESTIONS,player,0,Math.random,{mode:'review',questionIds:['K1']});review.skip(100);review.continueReview(1900);
  assert.throws(()=>store.save(review.result('original',2000)),/Invalid score/);
  assert.equal(storage.getItem('geodecoder.digital.single-attempt.v1.scores'),before);
  assert.equal(store.read().length,1);assert.equal(store.read()[0].player.category,'Tetamu');
});
test('connection and expired-session errors give an action in the selected language',()=>{
  assert.equal(typeof usability.friendlyError,'function');
  assert.match(usability.friendlyError(new TypeError('Failed to fetch'),'ms'),/Internet.*cuba/i);
  assert.match(usability.friendlyError(new TypeError('Failed to fetch'),'en'),/connection.*try/i);
  assert.match(usability.friendlyError({message:'JWT expired'},'en'),/sign in again/i);
  assert.match(usability.friendlyError({message:'JWT expired'},'ms'),/Log masuk semula/);
});
test('known account errors remain specific, while internal errors never reach the learner',()=>{
  assert.equal(typeof usability.friendlyError,'function');
  assert.match(usability.friendlyError(new Error('Invalid login credentials'),'en'),/email.*username.*password/i);
  assert.match(usability.friendlyError(new Error('Email not confirmed'),'ms'),/email/i);
  const message=usability.friendlyError(new Error('relation private.identities not found at line 17'),'en');
  assert.match(message,/try again/i);assert.doesNotMatch(message,/private|line 17|relation/);
});
test('known classroom problems keep specific next steps and the real PIN wait duration',()=>{
  assert.match(usability.friendlyError({message:'PIN tidak sah atau telah tamat tempoh.'},'en'),/PIN.*teacher/i);
  assert.match(usability.friendlyError({message:'Nama pengguna murid tidak dijumpai.'},'en'),/username/i);
  assert.match(usability.friendlyError({message:'Terlalu banyak PIN tidak sah. Cuba lagi dalam 15 minit.'},'en'),/15 minutes/);
  assert.match(usability.friendlyError({message:'Bilik ini telah ditutup.'},'ms'),/kelas.*bilik/i);
});
