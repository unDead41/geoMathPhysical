import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUESTIONS} from '../dist/questions.mjs';
import {Game,SHAPES,REVIEW_MS,reshuffle,questionTopic,analyseAnswers} from '../dist/core.mjs';
import {nextVisualPlan,PALETTES} from '../dist/visuals.mjs';
import {shapeArt} from '../dist/art.mjs';
const player={name:'Aisyah',category:'Murid',className:'1 Bestari'};
function seeded(seed){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

test('wrong R1 consumes the only attempt, freezes time and requires explicit review continuation',()=>{
  const g=new Game(QUESTIONS,player,0,seeded(41)),q=g.question,wrong=SHAPES.find(s=>s!==q.shape);
  assert.equal(g.scan('solid',wrong,'r1',500).type,'wrong');
  assert.equal(g.reviewing,true);assert.equal(g.score,0);assert.equal(g.mistakes,1);
  assert.equal(g.answers[0].failedAt,'solid');assert.deepEqual(g.answers[0].attempts,{solid:wrong,net:null});
  assert.equal(g.scan('solid',q.shape,'r1',600).type,'blocked');
  assert.equal(g.scan('net',q.shape,'r2',600).type,'blocked');assert.equal(g.skip(700),false);
  assert.equal(g.toggleHint(),false);assert.equal(g.update(999999),false);assert.equal(g.time(999999),500);
  assert.equal(g.continueReview(500+REVIEW_MS-1),false);
  assert.equal(g.continueReview(500+REVIEW_MS),true);assert.equal(g.index,1);assert.equal(g.stage,'solid');
  assert.equal(g.score,0);assert.equal(g.answers.length,1);
});
test('wrong R2 records the failed net while the accepted R1 remains green after blinking',()=>{
  const g=new Game(QUESTIONS,player,0,seeded(41)),q=g.question,wrong=SHAPES.find(s=>s!==q.shape);
  g.scan('solid',q.shape,'r1',200);g.scan('net',wrong,'r2',500);
  assert.equal(g.answers[0].failedAt,'net');assert.deepEqual(g.answers[0].attempts,{solid:q.shape,net:wrong});
  assert.equal(g.led('r1',1500),'green');assert.equal(g.led('r2',1500),'red');
  assert.equal(g.scan('net',q.shape,'r2',1600).type,'blocked');assert.equal(g.score,0);
});
test('pausing a correction preserves both review delay and frozen answer time',()=>{
  const g=new Game(QUESTIONS,player,0,seeded(1));g.skip(500);g.pause(800);g.resume(10800);
  assert.equal(g.continueReview(12299),false);assert.equal(g.continueReview(12300),true);
  assert.equal(g.time(12800),1000);
});
test('all positions change for both shelves across 500 rounds, including bounded RNG fallback',()=>{
  for(let seed=0;seed<500;seed++){
    const g=new Game(QUESTIONS,player,0,seeded(seed));let time=0;
    for(let i=0;i<9;i++){
      const oldSolid=g.solidOrder,oldNet=g.netOrder;g.skip(time);time+=REVIEW_MS;g.continueReview(time);
      for(const [old,next] of [[oldSolid,g.solidOrder],[oldNet,g.netOrder]]){
        assert.deepEqual([...next].sort(),[...SHAPES].sort());
        assert.ok(next.every((shape,index)=>shape!==old[index]));
      }
    }
  }
  const original=[...SHAPES];const next=reshuffle(SHAPES,original,()=>.9999);
  assert.ok(next.every((shape,index)=>shape!==original[index]));assert.deepEqual(original,SHAPES);
});
test('palettes change per shape per question and do not reveal matching R1/R2',()=>{
  for(let seed=0;seed<500;seed++){
    const rng=seeded(seed);let previous=null;
    for(let q=0;q<10;q++){
      const plan=nextVisualPlan(previous,rng);
      for(const kind of ['solid','net']){
        assert.equal(new Set(Object.values(plan[kind])).size,5);
        for(const shape of SHAPES){
          assert.ok(PALETTES[plan[kind][shape]]);
          if(previous)assert.notEqual(plan[kind][shape],previous[kind][shape]);
        }
      }
      for(const shape of SHAPES)assert.notEqual(plan.solid[shape],plan.net[shape]);
      previous=plan;
    }
  }
  assert.ok(shapeArt('cube','solid',false,'pink').includes(PALETTES.pink.mid));
  assert.ok(shapeArt('cone','net',false,'orange').includes(PALETTES.orange.light));
});
test('topics follow actual question content, including both cone formula questions',()=>{
  const expected={P1:'properties',P2:'formula',P3:'net',S1:'properties',S2:'formula',S3:'net',C1:'formula',C2:'formula',C3:'net',K1:'properties',K2:'formula',K3:'net',B1:'properties',B2:'formula',B3:'net'};
  for(const q of QUESTIONS)assert.equal(questionTopic(q),expected[q.id],q.id);
});
test('analytics excludes unreached R2 stages, distinguishes skipped answers, and does not penalize hints',()=>{
  const answers=[
    {shape:'cube',topic:'properties',outcome:'wrong',hint:false,elapsed:500,attempts:{solid:'cuboid',net:null}},
    {shape:'cube',topic:'net',outcome:'correct',hint:true,elapsed:500,attempts:{solid:'cube',net:'cube'}},
    {shape:'cone',topic:'formula',outcome:'wrong',hint:false,elapsed:500,attempts:{solid:'cone',net:'pyramid'}},
    {shape:'pyramid',topic:'net',outcome:'skipped',hint:false,elapsed:500,attempts:{solid:null,net:null}}
  ];
  const a=analyseAnswers(answers);
  assert.deepEqual(a.byStage[0],{id:'solid',attempted:3,correct:2,wrong:1,notAttempted:1,percent:67});
  assert.deepEqual(a.byStage[1],{id:'net',attempted:2,correct:1,wrong:1,notAttempted:2,percent:50});
  assert.equal(a.byShape.find(s=>s.id==='cube').hints,1);assert.equal(a.byShape.find(s=>s.id==='cube').percent,50);
  assert.equal(a.byShape.find(s=>s.id==='pyramid').wrong,0);assert.equal(a.byShape.find(s=>s.id==='pyramid').skipped,1);
  assert.equal(a.byShape.find(s=>s.id==='cylinder').percent,null);assert.equal(a.weakStage.id,'net');
  assert.equal(analyseAnswers([]).byStage[0].percent,null);
});
