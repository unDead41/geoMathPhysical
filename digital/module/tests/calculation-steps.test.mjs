import test from 'node:test';
import assert from 'node:assert/strict';
import {calculationProblem,calculationParseExpression,calculationEvaluateExpression,calculationCheckStep,calculationConvert,calculationSolution,calculationHint} from '../src/calculation-steps.mjs';

const near=(actual,want,tolerance=1e-8)=>assert.ok(Math.abs(actual-want)<=tolerance,`${actual} differs from ${want}`);
// Literal answers are independent checks of the eleven existing lesson models.
const cases=[
 ['cube',{a:4},96,64,'6*a*a','a*a*a'],
 ['cuboid',{p:6,l:4,t:3},108,72,'2*p*l+2*t*(p+l)','t*w*p'],
 ['pyramid',{a:6,t:4},96,48,'a*(a+2*s)','t*a*a/3'],
 ['cylinder',{j:7,t:10},748,1540,'2*pi*r*(h+r)','r*r*h*pi'],
 ['cone',{j:3,t:4},528/7,264/7,'pi*r*(s+r)','h*pi*r*r/3'],
 ['triangular-prism',{a:4,t:6},85.85640646055101,41.569219381653056,'P*t+A+A','t*A'],
 ['pentagonal-prism',{a:4,t:6},175.05527681884694,165.16583045654082,'P*t+A+A','t*A'],
 ['hexagonal-prism',{a:4,t:6},227.1384387633061,249.41531628991834,'P*t+A+A','t*A'],
 ['tetrahedron',{a:6,t:4},54.81854775998597,20.784609690826528,'A+3*a*s/2','t*A/3'],
 ['sphere',{j:4},1408/7,5632/21,'pi*(2*r)^2','pi*(2*r)^3/6'],
 ['hemisphere',{j:3},594/7,396/7,'pi*r*r*3','pi*(2*r)^3/12']
];
for(const [shape,dimensions,area,volume,surfaceFormula,volumeFormula] of cases){
 for(const [quantity,want,formula] of [['surface',area,surfaceFormula],['volume',volume,volumeFormula]])test(`${shape} ${quantity} uses the full lesson value and accepts reordered algebra`,()=>{
  const p=calculationProblem({shape,quantity,dimensions});assert.equal(p.valid,true);near(p.answerBase,want);
  assert.equal(calculationCheckStep(p,'formula',formula).correct,true);
  assert.equal(calculationCheckStep(p,'substitution',p.substitution).correct,true);
 });
}

test('the parser handles implicit products, powers, decimal comma, roots and written equations',()=>{
 near(calculationEvaluateExpression('L = 2πj(j+t)',{j:7,t:10}),748);
 near(calculationEvaluateExpression('⅓ × 3,5² × 6'),24.5);
 near(calculationEvaluateExpression('√(3²+4²) + 2(3+1)'),13);
 near(calculationEvaluateExpression('-2^2 + 2^-2'),-3.75);
 near(calculationEvaluateExpression('2^3^2'),512);
 const parsed=calculationParseExpression('2*pi*r*(h+r)');assert.deepEqual([...parsed.variables].sort(),['j','t']);
});

test('unsafe, unbounded and malformed expressions are rejected without executing code',()=>{
 for(const raw of ['globalThis.process.exit()','constructor(1)','alert(1)','2;3','1/0','sqrt(-1)','2^999','a.__proto__','1e309','2,3,4','1 2',''.padEnd(600,'a'),'('.repeat(40)+'1'+')'.repeat(40)])assert.throws(()=>calculationEvaluateExpression(raw,{a:4}));
 assert.equal(calculationCheckStep(calculationProblem({shape:'cube'}),'formula','globalThis.x=1').code,'invalid-expression');
});

test('a formula is checked at independent dimensions, beyond an accidental numeric match',()=>{
 const p=calculationProblem({shape:'cube',dimensions:{a:4}});
 assert.equal(calculationCheckStep(p,'formula','24*a').correct,false);
 assert.equal(calculationCheckStep(p,'formula','96').code,'formula-needs-symbols');
 assert.equal(calculationCheckStep(p,'formula','6*a^2+(a-4)*(a-2)*(a-3)').correct,false);
 assert.equal(calculationCheckStep(p,'formula','V = a^3').correct,false);
});

test('formula equivalence accepts a computed slant height and exact base formula',()=>{
 const p=calculationProblem({shape:'cone',quantity:'surface'});
 assert.equal(calculationCheckStep(p,'formula','pi*j^2+pi*j*sqrt(j^2+t^2)').correct,true);
 const q=calculationProblem({shape:'triangular-prism',quantity:'volume'});
 assert.equal(calculationCheckStep(q,'formula','sqrt(3)*a^2*t/4').correct,true);
});

test('substitution requires numeric working and rejects remaining dimension symbols',()=>{
 const p=calculationProblem({shape:'cube'});
 assert.equal(calculationCheckStep(p,'substitution','6*a^2').code,'substitution-needs-values');
 assert.equal(calculationCheckStep(p,'substitution','96').code,'substitution-needs-working');
 assert.equal(calculationCheckStep(p,'substitution','4*4*6').correct,true);
 assert.equal(calculationCheckStep(p,'calculation','96').correct,true);
 assert.equal(calculationCheckStep(p,'calculation','95').code,'arithmetic');
});

test('numeric substitution must retain the givens rather than accidentally equal the answer',()=>{
 const cube=calculationProblem({shape:'cube'}),cuboid=calculationProblem({shape:'cuboid',quantity:'volume'});
 assert.equal(calculationCheckStep(cube,'substitution','96+0').code,'substitution-values');
 assert.equal(calculationCheckStep(cuboid,'substitution','6*6*2').code,'substitution-values');
 assert.equal(calculationCheckStep(cube,'substitution','4*4+4*4+4*4+4*4+4*4+4*4').correct,true);
 const cylinder=calculationProblem({shape:'cylinder',quantity:'volume'});
 assert.equal(calculationCheckStep(cylinder,'substitution','154*10').correct,true);
 const cone=calculationProblem({shape:'cone',piMode:'3.142'});
 assert.equal(calculationCheckStep(cone,'substitution','3.142*3^2+3.142*3*sqrt(3^2+4^2)').correct,true);
});

test('selected pi conventions affect numeric checking and identify a mismatched approximation',()=>{
 const values={'22/7':528/7,'3.142':75.408,full:24*Math.PI};
 for(const [piMode,want] of Object.entries(values)){
  const p=calculationProblem({shape:'cone',piMode});near(p.answerBase,want);
  assert.equal(calculationCheckStep(p,'calculation',String(want)).correct,true);
 }
 const p=calculationProblem({shape:'cylinder',piMode:'3.142'});
 assert.equal(calculationCheckStep(p,'calculation','748').code,'pi-choice');
});

test('diameter questions derive the radius and diagnose treating the diameter as a radius',()=>{
 const p=calculationProblem({shape:'cylinder',quantity:'volume',dimensions:{j:3,t:5},given:'diameter'});
 assert.equal(p.variables.d,6);assert.equal(p.variables.j,3);near(p.answerBase,990/7);
 assert.equal(calculationCheckStep(p,'formula','pi*(d/2)^2*t').correct,true);
 assert.equal(calculationCheckStep(p,'formula','pi*d^2*t').code,'radius-diameter');
 assert.equal(calculationCheckStep(p,'substitution','(22/7)*6^2*5').code,'radius-diameter');
});

test('slant/perpendicular height, base-only area and missing one-third receive targeted feedback',()=>{
 const cone=calculationProblem({shape:'cone',quantity:'surface'});
 assert.equal(calculationCheckStep(cone,'formula','pi*j^2+pi*j*t').code,'height-kind');
 assert.equal(calculationCheckStep(cone,'formula','pi*j^2').code,'base-only');
 const v=calculationProblem({shape:'cone',quantity:'volume'});
 assert.equal(calculationCheckStep(v,'formula','pi*j^2*s/3').code,'height-kind');
 assert.equal(calculationCheckStep(v,'formula','pi*j^2*t').code,'missing-third');
 assert.equal(calculationCheckStep(v,'calculation',String(792/7)).code,'missing-third');
});

test('open containers exclude exactly the lid and preserve capacity for either pi convention',()=>{
 for(const [shape,dimensions,area,volume] of [['cuboid',{p:2,l:3,t:5},56,30],['cylinder',{j:3,t:4},726/7,792/7]]){
  const p=calculationProblem({shape,context:'open',dimensions});near(p.answerBase,area);
  near(calculationProblem({shape,quantity:'volume',context:'open',dimensions}).answerBase,volume);
  const closed=shape==='cuboid'?'2*(p*l+p*t+l*t)':'2*pi*j^2+2*pi*j*t';
  assert.equal(calculationCheckStep(p,'formula',closed).code,'open-lid');
 }
});

test('matched-base composites exclude both contact faces while adding both volumes',()=>{
 const roof=calculationProblem({shape:'cube',context:'cube-pyramid',dimensions:{a:6,t:4}});
 near(roof.answerBase,240);near(calculationProblem({shape:'cube',context:'cube-pyramid',quantity:'volume',dimensions:{a:6,t:4}}).answerBase,264);
 assert.equal(calculationCheckStep(roof,'formula','7*a^2+2*a*s').code,'internal-faces');
 assert.equal(calculationCheckStep(roof,'formula','5*a^2+2*a*s').correct,true);
 const rocket=calculationProblem({shape:'cylinder',context:'cylinder-cone',dimensions:{j:3,t:4,c:8}});
 near(rocket.answerBase,1584/7);
 assert.equal(calculationCheckStep(rocket,'formula','3*pi*j^2+2*pi*j*c+pi*j*s').code,'internal-faces');
 near(calculationProblem({shape:'cylinder',context:'cylinder-cone',quantity:'volume',dimensions:{j:3,t:4,c:8}}).answerBase,1848/7);
});

test('unit conversion uses powers of the length scale and capacity equivalence',()=>{
 near(calculationConvert(96,'cm²','m²'),.0096);near(calculationConvert(96,'cm²','mm²'),9600);
 near(calculationConvert(72,'cm³','m³'),.000072);near(calculationConvert(72,'cm³','mm³'),72000);
 near(calculationConvert(72,'cm³','mL'),72);near(calculationConvert(72,'cm³','L'),.072);
 assert.throws(()=>calculationConvert(96,'cm²','cm³'),RangeError);
 const p=calculationProblem({shape:'cube',targetUnit:'m²'});
 assert.equal(calculationCheckStep(p,'unit',{value:'.0096',unit:'m²'}).correct,true);
 assert.equal(calculationCheckStep(p,'unit',{value:'96',unit:'cm³'}).code,'unit-power');
 assert.equal(calculationCheckStep(p,'unit',{value:'96',unit:'m²'}).code,'unit-conversion');
 assert.equal(calculationCheckStep(p,'unit',{value:'96',unit:'cm²'}).code,'unit-target');
});

test('rounding is final-only, with a relative tolerance for tiny positive results',()=>{
 const p=calculationProblem({shape:'cone',dimensions:{j:4,t:4},piMode:'full'});
 const roundedSlant=calculationCheckStep(p,'substitution','pi*4^2+pi*4*5.66');
 assert.equal(roundedSlant.code,'early-rounding');
 const small=calculationProblem({shape:'cone',dimensions:{j:.1,t:.1},piMode:'full'});
 assert.equal(calculationCheckStep(small,'substitution','pi*0.1^2+pi*0.1*0.14').code,'early-rounding');
 const tiny=calculationProblem({shape:'cube',quantity:'volume',dimensions:{a:.1},targetUnit:'m³'});
 assert.equal(calculationCheckStep(tiny,'calculation','0').correct,false);
 assert.equal(calculationCheckStep(tiny,'calculation','0.001').correct,true);
 assert.equal(calculationCheckStep(tiny,'unit',{value:'0',unit:'m³'}).correct,false);
 assert.equal(calculationCheckStep(tiny,'unit',{value:'0.000000001',unit:'m³'}).correct,true);
 assert.equal(calculationCheckStep(tiny,'unit',{value:'0.0000000015',unit:'m³'}).correct,false);
 assert.equal(calculationCheckStep(calculationProblem({shape:'cone'}),'calculation','75.43').correct,true);
});

test('invalid dimensions and unrelated fields never produce stale answers',()=>{
 const p=calculationProblem({shape:'cylinder',dimensions:{j:'0',t:10}});
 assert.equal(p.valid,false);assert.ok(p.errors.j);assert.equal(p.answerBase,null);
 assert.equal(calculationCheckStep(p,'formula','pi*j*j').code,'invalid-dimensions');
 const q=calculationProblem({shape:'cube',dimensions:{a:'4,5',j:'invalid'}});near(q.answerBase,121.5);
 assert.equal(calculationProblem({shape:'cube',context:'cylinder-cone'}).valid,false);
});

test('solutions retain exact intermediate values and offer native bilingual hints',()=>{
 const p=calculationProblem({shape:'cone',dimensions:{j:4,t:4},targetUnit:'m²',piMode:'full'}),s=calculationSolution(p);
 assert.match(s.substitution,/sqrt/);assert.equal(calculationCheckStep(p,'unit',{value:s.unitValue,unit:s.unit}).correct,true);
 assert.equal(calculationCheckStep(p,'substitution',s.substitution).correct,true);
 assert.match(calculationHint(p,'formula','ms'),/permukaan|tapak/);
 assert.match(calculationHint(p,'formula','en'),/surface|base/);
});

test('shown final solutions round-trip at the smallest and largest supported converted volumes',()=>{
 const tiny=calculationProblem({shape:'cube',quantity:'volume',dimensions:{a:.1},targetUnit:'m³'}),tinySolution=calculationSolution(tiny);
 assert.equal(calculationCheckStep(tiny,'unit',{value:tinySolution.unitValue,unit:tinySolution.unit}).correct,true);
 const large=calculationProblem({shape:'sphere',quantity:'volume',dimensions:{j:1000},targetUnit:'mm³'}),largeSolution=calculationSolution(large);
 assert.equal(calculationCheckStep(large,'unit',{value:largeSolution.unitValue,unit:largeSolution.unit}).correct,true);
 const tinyCone=calculationProblem({shape:'cone',quantity:'volume',dimensions:{j:.1,t:.1},targetUnit:'m³'}),coneSolution=calculationSolution(tinyCone);
 assert.equal(coneSolution.unitValue,'0.00000000105');
 assert.equal(calculationCheckStep(tinyCone,'calculation','0.00105').correct,true);
 assert.equal(calculationCheckStep(tinyCone,'unit',{value:coneSolution.unitValue,unit:coneSolution.unit}).correct,true);
});
