/** Bounded arithmetic and step feedback. Lesson calculations remain the math owner. */
import {calculateMeasures,LESSON_DATA,MEASURE_FIELDS,PI_MODES,readDimension} from './lessons.mjs';
import {containerMeasures} from './surface-workshop.mjs';
import {compositionMeasures} from './lab-geometry.mjs';

export const calculationShapeNames={cube:['Kubus','Cube'],cuboid:['Kuboid','Cuboid'],pyramid:['Piramid tapak segi empat sama','Square-based pyramid'],cylinder:['Silinder','Cylinder'],cone:['Kon','Cone'],'triangular-prism':['Prisma segi tiga','Triangular prism'],tetrahedron:['Piramid tapak segi tiga','Triangular-based pyramid'],'pentagonal-prism':['Prisma segi lima','Pentagonal prism'],'hexagonal-prism':['Prisma segi enam','Hexagonal prism'],sphere:['Sfera','Sphere'],hemisphere:['Hemisfera','Hemisphere']};
export const calculationUnitOptions={surface:['cm²','m²','mm²'],volume:['cm³','m³','mm³','mL','L']};
const calcUnitData={'cm²':{power:2,scale:1},'m²':{power:2,scale:10000},'mm²':{power:2,scale:.01},'cm³':{power:3,scale:1},'m³':{power:3,scale:1000000},'mm³':{power:3,scale:.001},mL:{power:3,scale:1},L:{power:3,scale:1000}};
const calcAliases={r:'j',h:'t',w:'l'};
const calcVariableNames=new Set(['a','p','l','t','j','s','A','P','u','d','c']);
const calcReferences={cube:['6*a^2','a^3'],cuboid:['2*(p*l+p*t+l*t)','p*l*t'],pyramid:['a^2+2*a*s','a^2*t/3'],cylinder:['2*pi*j^2+2*pi*j*t','pi*j^2*t'],cone:['pi*j^2+pi*j*s','pi*j^2*t/3'],'triangular-prism':['2*A+P*t','A*t'],'pentagonal-prism':['2*A+P*t','A*t'],'hexagonal-prism':['2*A+P*t','A*t'],tetrahedron:['A+P*s/2','A*t/3'],sphere:['4*pi*j^2','4*pi*j^3/3'],hemisphere:['3*pi*j^2','2*pi*j^3/3']};
const calcSamples=[{a:2.3,p:3.2,l:4.7,t:5.1,j:1.9,c:7.3},{a:7.1,p:9.3,l:2.7,t:3.4,j:4.2,c:6.1},{a:4.6,p:5.1,l:8.2,t:1.3,j:6.7,c:4.4},{a:1.2,p:2.8,l:3.1,t:8.7,j:.8,c:3.6},{a:9.7,p:7.6,l:5.3,t:6.8,j:3.3,c:9.4},{a:.7,p:1.4,l:6.9,t:2.6,j:2.1,c:1.8},{a:5.3,p:8.9,l:1.7,t:4.9,j:8.1,c:5.2},{a:3.8,p:4.4,l:9.6,t:7.2,j:5.6,c:2.9},{a:11.3,p:6.7,l:7.4,t:9.1,j:7.9,c:8.6}];

function calcSyntax(message){throw new SyntaxError(message);}
function calcFinite(value){if(!Number.isFinite(value)||Math.abs(value)>1e30)throw new RangeError('Arithmetic result is outside the supported range.');return value;}
function calcNormalize(raw){
 if(typeof raw!=='string'||!raw.trim()||raw.length>480)calcSyntax('Enter an expression of at most 480 characters.');
 return raw.trim().replace(/^(?:L|V|SA|A)\s*[=≈]\s*/i,'').replace(/[×·⋅]/g,'*').replace(/÷/g,'/').replace(/[−–]/g,'-').replace(/π/g,'pi').replace(/²/g,'^2').replace(/³/g,'^3').replace(/√/g,'sqrt').replace(/⅓/g,'(1/3)').replace(/⅔/g,'(2/3)').replace(/½/g,'(1/2)').replace(/¼/g,'(1/4)');
}
/** Supports numbers, variables, pi, sqrt, arithmetic, powers and implicit products only. */
export function calculationParseExpression(raw){
 const source=calcNormalize(raw),tokens=[];let cursor=0;
 while(cursor<source.length){
  const rest=source.slice(cursor),space=rest.match(/^\s+/);if(space){cursor+=space[0].length;continue;}
  const number=rest.match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)/);
  if(number){const value=Number(number[0].replace(',','.'));if(!Number.isFinite(value)||value>1e30)calcSyntax('Number is too large.');tokens.push({type:'number',value});cursor+=number[0].length;}
  else if(/^sqrt/i.test(rest)){tokens.push({type:'sqrt'});cursor+=4;}
  else if(/^pi/i.test(rest)){tokens.push({type:'pi'});cursor+=2;}
  else if(/[a-zA-Z]/.test(rest[0])){const key=calcAliases[rest[0]]||rest[0];if(!calcVariableNames.has(key))calcSyntax('Unknown symbol.');tokens.push({type:'variable',value:key});cursor++;}
  else if('+-*/^()'.includes(rest[0])){tokens.push({type:rest[0]});cursor++;}
  else calcSyntax('Use arithmetic symbols only.');
  if(tokens.length>180)calcSyntax('Expression has too many terms.');
 }
 let index=0,nodes=0;const variables=new Set();
 const node=(type,values={})=>{if(++nodes>180)calcSyntax('Expression has too many terms.');return {type,...values};};
 const depthCheck=depth=>{if(depth>28)calcSyntax('Expression is nested too deeply.');};
 const primary=depth=>{
  depthCheck(depth);const token=tokens[index++];if(!token)calcSyntax('Expression is incomplete.');
  if(token.type==='number')return node('number',{value:token.value});
  if(token.type==='pi')return node('pi');
  if(token.type==='variable'){variables.add(token.value);return node('variable',{name:token.value});}
  if(token.type==='('){const value=sum(depth+1);if(tokens[index++]?.type!==')')calcSyntax('Close the bracket.');return value;}
  calcSyntax('Expected a number, symbol or bracket.');
 };
 const unary=depth=>{
  depthCheck(depth);const token=tokens[index]?.type;
  if(token==='+'||token==='-'||token==='sqrt'){index++;return node(token==='sqrt'?'sqrt':token==='-'?'negative':'positive',{value:unary(depth+1)});}
  let left=primary(depth+1);
  if(tokens[index]?.type==='^'){index++;left=node('binary',{operator:'^',left,right:unary(depth+1)});}return left;
 };
 const product=depth=>{
  let left=unary(depth+1);
  while(index<tokens.length){const type=tokens[index].type,explicit=type==='*'||type==='/',implicit=['number','variable','pi','(','sqrt'].includes(type);if(!explicit&&!implicit)break;
   if(implicit&&tokens[index-1]?.type==='number'&&type==='number')calcSyntax('Separate numbers with an operator.');
   if(explicit)index++;left=node('binary',{operator:explicit?type:'*',left,right:unary(depth+1)});
  }return left;
 };
 const sum=depth=>{let left=product(depth+1);while(['+','-'].includes(tokens[index]?.type)){const operator=tokens[index++].type;left=node('binary',{operator,left,right:product(depth+1)});}return left;};
 const ast=sum(0);if(index!==tokens.length)calcSyntax('Unexpected term.');return {ast,variables:[...variables],nodes,source};
}
function calcEvaluateNode(node,variables,pi,depth=0){
 if(depth>200)throw new RangeError('Expression is nested too deeply.');
 if(node.type==='number')return node.value;
 if(node.type==='pi')return pi;
 if(node.type==='variable'){const value=variables[node.name];if(!Number.isFinite(value))throw new RangeError('A dimension symbol has no value.');return value;}
 if(['sqrt','negative','positive'].includes(node.type)){const value=calcEvaluateNode(node.value,variables,pi,depth+1);return calcFinite(node.type==='sqrt'?Math.sqrt(value):node.type==='negative'?-value:value);}
 const left=calcEvaluateNode(node.left,variables,pi,depth+1),right=calcEvaluateNode(node.right,variables,pi,depth+1);let result;
 if(node.operator==='+')result=left+right;if(node.operator==='-')result=left-right;if(node.operator==='*')result=left*right;if(node.operator==='/')result=left/right;
 if(node.operator==='^'){if(Math.abs(right)>12)throw new RangeError('Powers are limited to 12.');result=left**right;}
 return calcFinite(result);
}
export function calculationEvaluateExpression(expression,variables={},piMode='22/7'){
 const parsed=typeof expression==='string'?calculationParseExpression(expression):expression;
 const pi=typeof piMode==='number'?piMode:PI_MODES[piMode];if(!Number.isFinite(pi))throw new RangeError('Choose a supported pi value.');
 const normalized={...variables};for(const [alias,key] of Object.entries(calcAliases))if(normalized[key]===undefined&&normalized[alias]!==undefined)normalized[key]=normalized[alias];
 return calcEvaluateNode(parsed.ast,normalized,pi);
}

export function calculationContextOptions(shape){return ['closed',...(['cuboid','cylinder'].includes(shape)?['open']:[]),...(shape==='cube'?['cube-pyramid']:shape==='cylinder'?['cylinder-cone']:[])];}
export function calculationFields(shape,context='closed'){return context==='cube-pyramid'?['a','t']:context==='cylinder-cone'?['j','c','t']:[...(MEASURE_FIELDS[shape]||[])];}
export function calculationDefaults(shape,context='closed'){return context==='cube-pyramid'?{a:6,t:4}:context==='cylinder-cone'?{j:3,c:8,t:4}:{...(LESSON_DATA[shape]?.defaults||{})};}
function calcVariables(shape,d,piMode,context){
 const upper=context==='cube-pyramid'?'pyramid':context==='cylinder-cone'?'cone':shape;
 const result=calculateMeasures(upper,d,piMode),variables={...d,pi:PI_MODES[piMode]};
 if(d.j!==undefined)variables.d=2*d.j;
 if(result.slant!==null)variables.s=result.slant;
 if(result.baseArea!==null)variables.A=result.baseArea;
 else if(d.a!==undefined)variables.A=d.a*d.a;
 else if(d.j!==undefined)variables.A=variables.pi*d.j*d.j;
 else if(d.p!==undefined)variables.A=d.p*d.l;
 if(result.perimeter!==null)variables.P=result.perimeter;
 if(result.apothem!==null)variables.u=result.apothem;
 return {result,variables};
}
function calcReference(shape,quantity,context){
 const volume=quantity==='volume';
 if(context==='cube-pyramid')return volume?'a^3+a^2*t/3':'5*a^2+2*a*s';
 if(context==='cylinder-cone')return volume?'pi*j^2*c+pi*j^2*t/3':'pi*j^2+2*pi*j*c+pi*j*s';
 if(context==='open'&&!volume)return shape==='cuboid'?'p*l+2*p*t+2*l*t':'pi*j^2+2*pi*j*t';
 return calcReferences[shape]?.[volume?1:0];
}
function calcNumberLiteral(n){return Number.isInteger(n)?String(n):String(Number(n.toPrecision(15)));}
function calcDerivedExpressions(shape,d,piMode,context){
 const values=Object.fromEntries(Object.entries(d).map(([key,value])=>[key,calcNumberLiteral(value)])),upper=context==='cube-pyramid'?'pyramid':context==='cylinder-cone'?'cone':shape;
 const a=values.a,j=values.j,t=values.t;
 if(j!==undefined)values.d='('+j+'*2)';
 if(upper==='cone')values.s=`sqrt(${j}^2+${t}^2)`;
 if(upper==='pyramid')values.s=`sqrt(${t}^2+(${a}/2)^2)`;
 const n={'triangular-prism':3,'pentagonal-prism':5,'hexagonal-prism':6,tetrahedron:3}[upper];
 if(n){values.P=`(${n}*${a})`;values.A=n===3?`(sqrt(3)*${a}^2/4)`:n===5?`(sqrt(25+10*sqrt(5))*${a}^2/4)`:`(3*sqrt(3)*${a}^2/2)`;if(upper==='tetrahedron')values.s=`sqrt(${t}^2+(${a}*sqrt(3)/6)^2)`;}
 values.pi=piMode==='full'?'pi':piMode==='22/7'?'(22/7)':'3.142';return values;
}
function calcSubstitute(reference,values){return reference.replace(/pi|[APapltjsudc]/g,key=>values[key]===undefined?key:'('+values[key]+')');}
/** Input lengths are cm. Contexts are thin open vessels or exact matched-base unions. */
export function calculationProblem({shape='cube',quantity='surface',dimensions,piMode='22/7',context='closed',given='radius',targetUnit}={}){
 const errors={},fields=calculationFields(shape,context),d={},defaults=calculationDefaults(shape,context);
 if(!Object.hasOwn(calcReferences,shape))errors.shape='shape';
 if(!['surface','volume'].includes(quantity))errors.quantity='quantity';
 if(!calculationContextOptions(shape).includes(context))errors.context='context';
 if(!Object.hasOwn(PI_MODES,piMode))errors.pi='pi';
 for(const key of fields){const value=readDimension((dimensions||defaults)[key]);if(!Number.isFinite(value)||value<.1||value>1000)errors[key]='dimension';else d[key]=value;}
 const unit=quantity==='volume'?'cm³':'cm²',outputUnit=targetUnit||unit;
 if(!calculationUnitOptions[quantity]?.includes(outputUnit))errors.unit='unit';
 const problem={valid:!Object.keys(errors).length,errors,shape,quantity,context,given:given==='diameter'?'diameter':'radius',piMode,dimensions:d,fields,baseUnit:unit,targetUnit:outputUnit,answerBase:null};
 if(!problem.valid)return problem;
 const {result,variables}=calcVariables(shape,d,piMode,context);let answerBase=quantity==='volume'?result.volume:result.area;
 if(context==='open'){const value=containerMeasures(shape,d,false);answerBase=value[quantity==='volume'?'volume':'area']*(shape==='cylinder'?PI_MODES[piMode]/Math.PI:1);}
 if(context==='cube-pyramid'||context==='cylinder-cone'){const value=compositionMeasures(context==='cube-pyramid'?'roof':'rocket',context==='cylinder-cone'?{...d,h:d.c}:d);answerBase=value[quantity==='volume'?'volume':'area']*(context==='cylinder-cone'?PI_MODES[piMode]/Math.PI:1);}
 const formula=calcReference(shape,quantity,context),substitution=calcSubstitute(formula,calcDerivedExpressions(shape,d,piMode,context));
 return {...problem,result,variables,formula,substitution,answerBase,answer:calculationConvert(answerBase,unit,outputUnit)};
}
function calcUnit(raw){return String(raw??'').trim().replace(/\^2/g,'²').replace(/\^3/g,'³').replace(/^ml$/i,'mL').replace(/^l$/i,'L');}
export function calculationConvert(value,fromUnit,toUnit){
 const from=calcUnitData[calcUnit(fromUnit)],to=calcUnitData[calcUnit(toUnit)];if(!Number.isFinite(value)||!from||!to||from.power!==to.power)throw new RangeError('Units must measure the same quantity.');
 return value*from.scale/to.scale;
}
/** Final 2 d.p. is accepted; positive values below .01 require 3 significant figures. */
export function calculationTolerance(expected){const magnitude=Math.abs(expected);return magnitude>0&&magnitude<.01?Math.max(10**(Math.floor(Math.log10(magnitude))-2)*.5000001,magnitude*Number.EPSILON*32):Math.max(.005000001,magnitude*Number.EPSILON*32);}
function calcNear(actual,expected,strict=false){return Number.isFinite(actual)&&!(actual===0&&expected>0)&&Math.abs(actual-expected)<=(strict?Math.max(Math.abs(expected)*1e-9,1e-11):calculationTolerance(expected));}
function calcEquivalent(parsed,reference,problem){
 const target=typeof reference==='string'?calculationParseExpression(reference):reference;
 if(parsed.variables.some(key=>!Object.hasOwn(problem.variables,key)))return false;
 for(let i=0;i<calcSamples.length;i++){
  const dimensions=Object.fromEntries(problem.fields.map(key=>[key,calcSamples[i][key]])),pi=['22/7','3.142','full'][i%3],sample=calcVariables(problem.shape,dimensions,pi,problem.context);
  try{if(!calcNear(calculationEvaluateExpression(parsed,sample.variables,pi),calculationEvaluateExpression(target,sample.variables,pi),true))return false;}catch{return false;}
 }
 return true;
}
// A numeric equality alone cannot prove substitution. Lift matching given or exact
// derived values back into symbols and check the resulting structure at new sizes.
// Search is bounded; exponents retain their numerical role unless their entire
// subtree represents an explicitly derived quantity.
function calcSubstitutionProvenance(parsed,problem){
 const replacements=new WeakMap(),keys=[...problem.fields,'s','A','P','u'].filter(key=>Number.isFinite(problem.variables[key]));
 const options=node=>{if(replacements.has(node))return replacements.get(node);let value;try{value=calcEvaluateNode(node,{},PI_MODES[problem.piMode]);}catch{value=NaN;}const result=keys.filter(key=>calcNear(value,problem.variables[key],true)).map(name=>({type:'variable',name}));replacements.set(node,result);return result;};
 function* lifted(node,exponent=false){
  if(!exponent)for(const replacement of options(node))yield replacement;
  if(node.type==='binary'){
   for(const left of lifted(node.left,exponent))for(const right of lifted(node.right,exponent||node.operator==='^'))yield {...node,left,right};
  }else if(['sqrt','negative','positive'].includes(node.type)){for(const value of lifted(node.value,exponent))yield {...node,value};}
  else yield node;
 }
 const reference=calculationParseExpression(problem.formula),samples=calcSamples.map(sample=>{
  const dimensions={};for(const key of problem.fields){const equal=problem.fields.find(other=>Object.hasOwn(dimensions,other)&&problem.dimensions[other]===problem.dimensions[key]);dimensions[key]=equal?dimensions[equal]:sample[key];}
  const variables=calcVariables(problem.shape,dimensions,problem.piMode,problem.context).variables;return {variables,want:calculationEvaluateExpression(reference,variables,problem.piMode)};
 });
 let attempts=0;for(const ast of lifted(parsed.ast)){
  if(++attempts>8192)return false;
  try{if(samples.every(sample=>calcNear(calcEvaluateNode(ast,sample.variables,PI_MODES[problem.piMode]),sample.want,true)))return true;}catch{}
 }return false;
}
function calcAlternatives(problem){
 const {shape,quantity,context,formula}=problem,area=quantity==='surface',alternatives=[];const add=(code,reference)=>alternatives.push({code,reference});
 if(problem.dimensions.j!==undefined){add('radius-diameter',formula.replace(/\bj\b/g,'(2*j)'));add('radius-diameter',formula.replace(/\bj\b/g,'(j/2)'));}
 if(['pyramid','cone','tetrahedron'].includes(shape)||['cube-pyramid','cylinder-cone'].includes(context))add('height-kind',area?formula.replace(/\bs\b/g,'t'):formula.replace(/\bt\b/g,'s'));
 if(!area&&(['pyramid','cone','tetrahedron','sphere','hemisphere'].includes(shape)||context!=='closed'&&context!=='open')){
  if(context==='cube-pyramid')add('missing-third','a^3+a^2*t');else if(context==='cylinder-cone')add('missing-third','pi*j^2*c+pi*j^2*t');else add('missing-third','3*('+formula+')');
 }
 if(area){
  const base=problem.dimensions.j!==undefined?'pi*j^2':shape==='cuboid'?'p*l':['triangular-prism','pentagonal-prism','hexagonal-prism','tetrahedron'].includes(shape)?'A':'a^2';
  add('base-only',base);
  if(context==='open')add('open-lid','('+formula+')+'+base);
  else if(['cube-pyramid','cylinder-cone'].includes(context)){add('internal-faces','('+formula+')+2*('+base+')');add('internal-faces','('+formula+')+'+base);}
  else if(['cylinder','cone','pyramid','tetrahedron','hemisphere','cuboid','triangular-prism','pentagonal-prism','hexagonal-prism'].includes(shape)){add('missing-base','('+formula+')-'+base);if(shape==='cylinder'||shape.includes('prism'))add('missing-base','('+formula+')-2*('+base+')');}
 }
 return alternatives;
}
function calcDiagnosis(problem,parsed,value,symbolic,precise=false){
 for(const alternative of calcAlternatives(problem)){
  try{if(symbolic?calcEquivalent(parsed,alternative.reference,problem):calcNear(value,calculationEvaluateExpression(alternative.reference,problem.variables,problem.piMode),precise))return alternative.code;}catch{}
 }
 if(!symbolic){
  for(const piMode of Object.keys(PI_MODES)){if(piMode===problem.piMode)continue;const other=calculationProblem({...problem,piMode});if(!calcNear(other.answerBase,problem.answerBase,precise)&&calcNear(value,other.answerBase,precise))return 'pi-choice';}
  for(const places of [2,1,0]){const rounded={...problem.variables};for(const key of ['s','A','u'])if(rounded[key]!==undefined)rounded[key]=Number(rounded[key].toFixed(places));const result=calculationEvaluateExpression(problem.formula,rounded,problem.piMode);if(!calcNear(result,problem.answerBase,precise)&&calcNear(value,result,precise))return 'early-rounding';}
 }
 return symbolic?'formula-mismatch':'arithmetic';
}
/** Check each semantic step; the UI owns sequential gates and invalidates later checks on edit. */
export function calculationCheckStep(problem,step,input){
 const fail=code=>({correct:false,code}),pass=()=>({correct:true,code:'correct'});
 if(!problem?.valid)return fail('invalid-dimensions');
 if(!['formula','substitution','calculation','unit'].includes(step))return fail('invalid-step');
 if(step==='unit'){
  const unit=calcUnit(input?.unit),info=calcUnitData[unit],wanted=calcUnitData[problem.targetUnit];
  if(!info)return fail('unit-target');if(info.power!==wanted.power)return fail('unit-power');
  if(unit!==problem.targetUnit)return fail('unit-target');
  let parsed,value;try{parsed=calculationParseExpression(String(input?.value??''));if(parsed.variables.length)return fail('substitution-needs-values');value=calculationEvaluateExpression(parsed,{},problem.piMode);}catch{return fail('invalid-expression');}
  return calcNear(value,problem.answer)?pass():fail('unit-conversion');
 }
 let parsed,value;try{parsed=calculationParseExpression(String(input??''));}catch{return fail('invalid-expression');}
 if(step==='formula'){
  if(!parsed.variables.length)return fail('formula-needs-symbols');
  return calcEquivalent(parsed,problem.formula,problem)?pass():fail(calcDiagnosis(problem,parsed,NaN,true));
 }
 if(parsed.variables.length)return fail('substitution-needs-values');
 if(step==='substitution'&&parsed.ast.type==='number')return fail('substitution-needs-working');
 try{value=calculationEvaluateExpression(parsed,{},problem.piMode);}catch{return fail('invalid-expression');}
 if(step==='substitution'&&calcNear(value,problem.answerBase)){
  if(calcSubstitutionProvenance(parsed,problem))return pass();const diagnosis=calcDiagnosis(problem,parsed,value,false,true);return fail(diagnosis==='arithmetic'?'substitution-values':diagnosis);
 }
 return calcNear(value,problem.answerBase)?pass():fail(calcDiagnosis(problem,parsed,value,false,step==='substitution'));
}

const calcFeedbackCopy={
 correct:['Tepat. Teruskan ke langkah seterusnya.','Correct. Continue to the next step.'],
 'invalid-dimensions':['Betulkan ukuran dahulu. Masukkan 0.1 hingga 1000 cm.','Correct the dimensions first. Enter 0.1 to 1000 cm.'],
 'invalid-expression':['Gunakan nombor, simbol ukuran, + − × ÷ ^, kurungan, pi atau sqrt sahaja. Semak kurungan dan pembahagi.','Use numbers, dimension symbols, + − × ÷ ^, brackets, pi or sqrt only. Check brackets and divisors.'],
 'formula-needs-symbols':['Tulis rumus dengan simbol ukuran dahulu, sebelum menggantikan nombor.','Write a formula with dimension symbols before substituting numbers.'],
 'formula-mismatch':['Rumus ini belum sepadan untuk ukuran yang berbeza. Jejaki semua bahagian yang diminta.','This formula does not agree at different dimensions. Trace every required part.'],
 'substitution-needs-values':['Gantikan semua simbol ukuran dengan nombor. pi ialah pemalar yang dibenarkan.','Replace every dimension symbol with a number. The constant pi is allowed.'],
 'substitution-needs-working':['Tunjukkan gantian dalam operasi, contohnya 6 × 4². Jawapan akhir sahaja belum menunjukkan gantian.','Show numbers in the operations, for example 6 × 4². A final number alone does not show substitution.'],
 'substitution-values':['Nilai ini menyamai jawapan, tetapi belum menunjukkan gantian ukuran dalam rumus. Gunakan ukuran diberi atau nilai tapak/tinggi sendeng yang diterbitkan daripadanya.','This equals the answer but does not show the given measurements substituted into the formula. Use the given dimensions or exact base/slant values derived from them.'],
 'radius-diameter':['Jejari ialah separuh diameter: j = d ÷ 2. Semak nombor yang dikuasakan dua atau tiga.','Radius is half the diameter: r = d ÷ 2. Check the number being squared or cubed.'],
 'height-kind':['Luas muka condong menggunakan tinggi sendeng s. Isi padu menggunakan tinggi tegak t (h), yang tegak lurus kepada tapak.','Sloping face area uses slant height s. Volume uses perpendicular height t (h).'],
 'base-only':['Ini luas satu tapak sahaja. Jumlah luas permukaan mesti merangkumi semua permukaan yang terdedah.','This is the area of one base only. Total surface area includes every exposed surface.'],
 'missing-third':['Isi padu kon atau piramid ialah satu pertiga isi padu prisma/silinder dengan tapak dan tinggi sama. Kekalkan faktor 1/3.','A cone or pyramid has one third the volume of a matching prism or cylinder. Keep the factor 1/3.'],
 'missing-base':['Ada tapak yang tertinggal. Bentuk tertutup merangkumi tapak rata dan bahagian sisinya.','A base is missing. A closed solid includes its flat bases and side surfaces.'],
 'open-lid':['Bekas ini terbuka di atas. Kira dinding dan satu tapak bawah sahaja; tiada penutup atas.','This vessel is open at the top. Count the walls and one bottom base; there is no lid.'],
 'internal-faces':['Dua tapak yang bercantum menjadi permukaan dalaman. Tolak kedua-duanya daripada jumlah luas bongkah berasingan.','The two joined bases become internal faces. Subtract both from the separate solids’ total area.'],
 'pi-choice':['Semak nilai π yang dinyatakan. Gunakan nilai pilihan yang sama dari gantian hingga jawapan akhir.','Check the stated value of π. Use the selected convention throughout the calculation.'],
 'early-rounding':['Nilai perantaraan telah dibundarkan terlalu awal. Simpan sqrt atau nilai penuh dan bundarkan jawapan akhir sahaja.','An intermediate value was rounded too early. Keep sqrt or full precision and round only the final answer.'],
 arithmetic:['Semak operasi dan turutan pengiraan. Kekalkan nilai penuh hingga langkah akhir.','Check the operations and their order. Keep full precision until the final step.'],
 'unit-power':['Luas menggunakan unit persegi (²); isi padu menggunakan unit padu (³), mL atau L.','Area uses square units (²); volume uses cubic units (³), mL or L.'],
 'unit-target':['Gunakan unit yang diminta dalam soalan. Tukar nombor bersama unitnya.','Use the unit requested in the question. Convert the number with its unit.'],
 'unit-conversion':['Semak faktor penukaran: 1 m² = 10 000 cm²; 1 m³ = 1 000 000 cm³; 1 L = 1000 cm³.','Check the conversion factor: 1 m² = 10 000 cm²; 1 m³ = 1 000 000 cm³; 1 L = 1000 cm³.'],
 sequence:['Semak langkah sebelumnya dahulu.','Check the preceding step first.']
};
export function calculationFeedback(code,language='ms',problem){
 const en=language==='en',copy=calcFeedbackCopy[code]||calcFeedbackCopy.arithmetic;
 if(code==='missing-third'&&['sphere','hemisphere'].includes(problem?.shape))return en?'Keep the fractional coefficient in the sphere or hemisphere formula; the denominator 3 is required.':'Kekalkan pekali pecahan dalam rumus sfera atau hemisfera; penyebut 3 diperlukan.';
 return copy[en?1:0];
}
export function calculationHint(problem,step,language='ms'){
 const en=language==='en',area=problem.quantity==='surface';
 if(step==='formula'){
  if(['cube-pyramid','cylinder-cone'].includes(problem.context))return en?'For surface area, exclude both contact bases. For volume, add the two solids.':'Untuk luas permukaan, kecualikan kedua-dua tapak sentuhan. Untuk isi padu, tambah kedua-dua bongkah.';
  if(problem.context==='open')return en?'The top is open: surface area includes the walls and one bottom base. Capacity still uses base area × perpendicular height.':'Bahagian atas terbuka: luas permukaan meliputi dinding dan satu tapak bawah. Kapasiti tetap luas tapak × tinggi tegak.';
  if(area)return en?'Add the area of every exposed surface. A sloping face uses slant height s; one base area alone is incomplete.':'Jumlahkan luas setiap permukaan yang terdedah. Muka condong menggunakan tinggi sendeng s; luas satu tapak sahaja belum lengkap.';
  return en?'Start with base area × perpendicular height. A cone or pyramid needs 1/3; a sphere uses its radius formula.':'Mulakan dengan luas tapak × tinggi tegak. Kon atau piramid memerlukan 1/3; sfera menggunakan rumus jejarinya.';
 }
 if(step==='substitution')return en?'Replace each dimension symbol with its given number. If diameter is given, halve it first. Keep square roots exact.':'Gantikan setiap simbol ukuran dengan nombor diberi. Jika diameter diberi, bahagi dua dahulu. Kekalkan punca kuasa dua dalam bentuk tepat.';
 if(step==='calculation')return en?'Evaluate brackets and powers first, then multiplication/division and addition. Round only the final value.':'Hitung kurungan dan kuasa dahulu, kemudian darab/bahagi dan tambah. Bundarkan nilai akhir sahaja.';
 return en?'Square the length conversion factor for area; cube it for volume. 1 cm³ = 1 mL and 1000 cm³ = 1 L.':'Kuasa duakan faktor panjang untuk luas; kuasa tigakan untuk isi padu. 1 cm³ = 1 mL dan 1000 cm³ = 1 L.';
}
export function calculationFormat(value){if(value===0)return '0';if(Math.abs(value)<.01)return new Intl.NumberFormat('en-US',{maximumSignificantDigits:3,useGrouping:false}).format(value);return String(Number(value.toFixed(2)));}
export function calculationSolution(problem){
 if(!problem?.valid)return null;
 return {formula:problem.formula,substitution:problem.substitution,calculation:calculationFormat(problem.answerBase),unitValue:calculationFormat(problem.answer),unit:problem.targetUnit,baseUnit:problem.baseUnit};
}
