import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS} from '../dist/questions.mjs';
import {Game,buildRound,validatePlayer,SHAPES,BLINK_MS,REVIEW_MS,formatTime} from '../dist/core.mjs';
const player={name:'Aisyah',category:'Murid',className:'1 Bestari'};
function seeded(seed){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
function create(){return new Game(QUESTIONS,player,0,seeded(41));}

test('source bank has 15 unique IDs, 3 questions per shape and no answer names',()=>{
  assert.equal(QUESTIONS.length,15);assert.equal(new Set(QUESTIONS.map(q=>q.id)).size,15);
  for(const s of SHAPES)assert.equal(QUESTIONS.filter(q=>q.shape===s).length,3);
  for(const q of QUESTIONS){assert.equal(q.lines.length,3);assert.ok(q.hint);assert.ok(q.prompt);}
});
test('500 seeded rounds have 10 unique questions, exactly 2 per shape',()=>{
  const openings=new Set();
  for(let seed=0;seed<500;seed++){
    const round=buildRound(QUESTIONS,seeded(seed));
    assert.equal(round.length,10);assert.equal(new Set(round.map(q=>q.id)).size,10);
    for(const s of SHAPES)assert.equal(round.filter(q=>q.shape===s).length,2);
    openings.add(round[0].id);
  }
  assert.equal(openings.size,15);
});
test('R2 before R1 is blocked; R1 correct earns no points and preserves the question',()=>{
  const g=create(),q=g.question;
  assert.equal(g.scan('net',q.shape,'r2',100).type,'stage');assert.equal(g.score,0);
  assert.equal(g.scan('solid',q.shape,'r1',200).type,'solid');
  assert.equal(g.stage,'net');assert.equal(g.score,0);assert.equal(g.question,q);
  assert.equal(g.led('r1',200),'green');assert.equal(g.led('r2',200),'blue');
});
test('incorrect role and target cannot be scored, even when shape is correct',()=>{
  const g=create();assert.equal(g.scan('net',g.question.shape,'r1',0).type,'kind');
  assert.equal(g.scan('solid',g.question.shape,'r2',0).type,'stage');assert.equal(g.stage,'solid');
});
test('wrong answers record exactly one failed question and cannot retry',()=>{
  const g=create(),q=g.question,wrong=SHAPES.find(s=>s!==q.shape);
  assert.equal(g.scan('solid',wrong,'r1',100).type,'wrong');assert.equal(g.index,0);assert.equal(g.led('r1',100),'red');
  assert.equal(g.led('r1',1300),'red');
  assert.equal(g.scan('solid',q.shape,'r1',1500).type,'blocked');
  assert.equal(g.score,0);assert.equal(g.firstTry,0);assert.equal(g.mistakes,1);assert.equal(g.answers.length,1);
});
test('a matching pair grants exactly one point, blocks rapid duplicate input and skips',()=>{
  const g=create(),q=g.question;
  g.scan('solid',q.shape,'r1',100);g.scan('net',q.shape,'r2',200);
  assert.equal(g.score,1);assert.equal(g.status,'feedback');assert.equal(g.firstTry,1);
  for(let i=0;i<10;i++)assert.equal(g.scan('net',q.shape,'r2',300).type,'blocked');
  assert.equal(g.toggleHint(),false);assert.equal(g.skip(300),false);assert.equal(g.score,1);
});
test('feedback has 3 exact 150 ms ON/OFF cycles and excludes 900 ms from elapsed time',()=>{
  const g=create();g.scan('solid',g.question.shape,'r1',500);g.scan('net',g.question.shape,'r2',1000);
  for(const [time,color] of [[1000,'green'],[1149,'green'],[1150,'off'],[1300,'green'],[1450,'off'],[1600,'green'],[1750,'off']]){
    assert.equal(g.led('r1',time),color);assert.equal(g.led('r2',time),color);assert.equal(g.time(time),1000);
  }
  assert.equal(g.update(1899),false);assert.equal(g.update(1900),true);assert.equal(g.time(2100),1200);
  assert.equal(g.stage,'solid');assert.equal(g.index,1);assert.equal(g.score,1);assert.equal(g.skipped,0);
});
test('hint is purple only on active reader, counted once per question across both stages',()=>{
  const g=create();g.toggleHint();assert.equal(g.hints,1);assert.equal(g.led('r1',100),'purple');assert.equal(g.led('r2',100),'off');
  g.toggleHint();g.toggleHint();assert.equal(g.hints,1);
  g.scan('solid',g.question.shape,'r1',100);assert.equal(g.hintOpen,false);g.toggleHint();assert.equal(g.hints,1);
  assert.equal(g.led('r1',200),'green');assert.equal(g.led('r2',200),'purple');
  g.skip(400);g.continueReview(400+REVIEW_MS);g.toggleHint();assert.equal(g.hints,2);
});
test('skip after R1 still gives zero and resets the next question',()=>{
  const g=create();g.scan('solid',g.question.shape,'r1',300);g.skip(500);
  assert.equal(g.score,0);assert.equal(g.update(1400),false);g.continueReview(500+REVIEW_MS);assert.equal(g.stage,'solid');assert.equal(g.hintOpen,false);
});
test('pause freezes clock and answers; resume excludes all pause time',()=>{
  const g=create();g.pause(1500);assert.equal(g.time(50000),1500);
  assert.equal(g.scan('solid',g.question.shape,'r1',2500).type,'blocked');
  g.resume(10500);assert.equal(g.time(11000),2000);
});
test('pausing during feedback preserves the remaining transition',()=>{
  const g=create();g.scan('solid',g.question.shape,'r1',500);g.scan('net',g.question.shape,'r2',1000);g.pause(1300);g.update(10000);assert.equal(g.index,0);
  g.resume(10000);assert.equal(g.update(10599),false);assert.equal(g.update(10600),true);assert.equal(g.time(10600),1000);
});
test('complete 100 real rounds, max 10 points and final time remains frozen',()=>{
  for(let seed=1;seed<=100;seed++){
    const g=new Game(QUESTIONS,player,0,seeded(seed));let time=0;
    for(let i=0;i<10;i++){
      time+=700;g.scan('solid',g.question.shape,'r1',time);
      time+=300;g.scan('net',g.question.shape,'r2',time);
      time+=BLINK_MS;g.update(time);
    }
    assert.equal(g.status,'finished');assert.equal(g.score,10);assert.equal(g.firstTry,10);assert.equal(g.elapsed,10000);
    assert.equal(g.time(999999),10000);const r=g.result('test',1000);assert.equal(r.total,10);assert.equal(r.score,10);
    assert.equal(g.scan('net',g.round[9].shape,'r2',time).type,'blocked');assert.equal(g.score,10);
  }
});
test('a mixed round reports correct, skipped and mistakes independently',()=>{
  const g=create();let time=0;
  for(let i=0;i<10;i++){
    time+=500;
    if(i%3===0)g.skip(time);
    else if(i%3===1)g.scan('solid',SHAPES.find(s=>s!==g.question.shape),'r1',time);
    else{const shape=g.question.shape;g.scan('solid',shape,'r1',time);g.scan('net',shape,'r2',time);}
    time+=REVIEW_MS;g.reviewing?g.continueReview(time):g.update(time);
  }
  const r=g.result('mixed',1000);assert.equal(r.score,3);assert.equal(r.skipped,4);assert.equal(r.mistakes,3);assert.equal(r.firstTry,3);assert.equal(r.answers.length,10);
});
test('incomplete games cannot produce leaderboard records',()=>assert.equal(create().result('incomplete'),null));
test('registration trims and validates names, category and class',()=>{
  const r=validatePlayer({name:'  Aisyah   binti Ali  ',category:'Murid',className:' 1 Bestari '});
  assert.equal(r.valid,true);assert.equal(r.player.name,'Aisyah binti Ali');
  assert.equal(validatePlayer({name:' ',category:'Guru',className:''}).valid,false);
  assert.equal(validatePlayer({...player,name:'a'.repeat(61)}).valid,false);
  assert.equal(validatePlayer({...player,className:'a'.repeat(41)}).valid,false);
});
test('time display handles minute boundaries and long sessions',()=>{
  assert.equal(formatTime(59999),'00:59');assert.equal(formatTime(60000),'01:00');assert.equal(formatTime(6000000),'100:00');assert.equal(formatTime(-1),'00:00');
});
