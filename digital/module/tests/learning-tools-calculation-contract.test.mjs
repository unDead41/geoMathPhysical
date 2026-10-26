import test from 'node:test';
import assert from 'node:assert/strict';
import {MODEL_ORDER} from '../src/content.mjs';
import {MEASURE_FIELDS,PI_MODES} from '../src/lessons.mjs';
import {calculationProblem,calculationSolution,calculationCheckStep,calculationUnitOptions} from '../src/calculation-steps.mjs';

test('all supported dimensions, pi choices and units can validate the solution they show',()=>{
 for(const shape of MODEL_ORDER)for(const length of [.1,1000])for(const piMode of Object.keys(PI_MODES))for(const quantity of ['surface','volume'])for(const targetUnit of calculationUnitOptions[quantity]){
  const dimensions=Object.fromEntries(MEASURE_FIELDS[shape].map(key=>[key,length]));
  const p=calculationProblem({shape,dimensions,piMode,quantity,targetUnit}),s=calculationSolution(p),label=[shape,length,piMode,quantity,targetUnit].join('/');
  assert.equal(p.valid,true,label);
  for(const step of ['formula','substitution','calculation'])assert.equal(calculationCheckStep(p,step,s[step]).correct,true,label+'/'+step);
  assert.equal(calculationCheckStep(p,'unit',{unit:s.unit,value:s.unitValue}).correct,true,label+'/unit');
 }
});

test('scale homogeneity matches square area and cubic volume without intermediate rounding',()=>{
 for(const shape of MODEL_ORDER){
  const d=Object.fromEntries(MEASURE_FIELDS[shape].map((key,i)=>[key,1.17+i*.46])),scaled=Object.fromEntries(Object.entries(d).map(([key,value])=>[key,value*3.5]));
  for(const [quantity,power] of [['surface',2],['volume',3]]){
   const a=calculationProblem({shape,dimensions:d,quantity,piMode:'full'}),b=calculationProblem({shape,dimensions:scaled,quantity,piMode:'full'});
   assert.ok(Math.abs(b.answerBase/a.answerBase-3.5**power)<1e-9,shape+'/'+quantity);
  }
 }
});

test('formula checking rejects an expression that happens to match the current numbers',()=>{
 const p=calculationProblem({shape:'cube',quantity:'surface',dimensions:{a:4}});
 assert.equal(calculationCheckStep(p,'formula','24*a').correct,false);
 assert.equal(calculationCheckStep(p,'formula','6*a*a').correct,true);
});
