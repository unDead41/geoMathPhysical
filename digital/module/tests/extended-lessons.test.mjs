import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MODEL_ORDER,MODEL_DATA} from '../src/content.mjs';
import {calculateMeasures,LESSON_DATA,MEASURE_FIELDS} from '../src/lessons.mjs';
import {LearningNotes} from '../src/notes.mjs';

const near=(actual,expected)=>assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<Math.max(1,Math.abs(expected))*1e-10,`${actual} != ${expected}`);
const originals=['cube','cuboid','pyramid','cylinder','cone'];
const extras=['triangular-prism','tetrahedron','pentagonal-prism','hexagonal-prism','sphere','hemisphere'];
test('all eleven learning shapes have compatible metadata and complete independent notes',()=>{
 assert.deepEqual(MODEL_ORDER,[...originals,...extras]);
 for(const key of MODEL_ORDER){
  const data=MODEL_DATA[key],lesson=LESSON_DATA[key];
  assert.equal(data.labels.length,data.flat+data.curved,key);assert.equal(data.views.length,6,key);
  assert.equal(data.options.length,2,key);assert.ok(data.options[data.answer]);
  assert.ok(lesson.classification&&lesson.netParts.length&&lesson.mistakes.length,key);
  assert.equal(calculateMeasures(key,lesson.defaults).valid,true,key);
  assert.ok(lesson.surface.steps.length>=4&&lesson.volume.steps.length>=4,key);
 }
 for(const key of extras)assert.equal(MODEL_DATA[key].enrichment,true,key);
});
test('new polyhedron face, edge and vertex counts preserve Euler topology',()=>{
 for(const [key,F,E,V] of [['triangular-prism',5,9,6],['tetrahedron',4,6,4],['pentagonal-prism',7,15,10],['hexagonal-prism',8,18,12]]){
  const d=MODEL_DATA[key];assert.equal(d.flat,F);assert.equal(d.edges,E);assert.equal(d.vertices,V);assert.equal(V-E+F,2);
 }
});
const prismCases=[
 ['triangular-prism',4,6,4*Math.sqrt(3),12],
 ['pentagonal-prism',4,6,4*Math.sqrt(25+10*Math.sqrt(5)),20],
 ['hexagonal-prism',4,6,24*Math.sqrt(3),24]
];
for(const [key,a,t,A,P] of prismCases)test(key+': areas and volume match independent exact polygon expressions',()=>{
 const r=calculateMeasures(key,{a,t},'full');assert.equal(r.valid,true);
 near(r.baseArea,A);near(r.perimeter,P);near(r.area,2*A+P*t);near(r.volume,A*t);
 near(r.areaParts.reduce((s,p)=>s+p.value,0),r.area);
});
test('triangular pyramid uses the base apothem rather than half its side for slant height',()=>{
 const r=calculateMeasures('tetrahedron',{a:6,t:4},'full');assert.equal(r.valid,true);
 near(r.baseArea,9*Math.sqrt(3));near(r.apothem,Math.sqrt(3));near(r.slant,Math.sqrt(19));
 near(r.area,9*Math.sqrt(3)+9*Math.sqrt(19));near(r.volume,12*Math.sqrt(3));
 assert.notEqual(r.slant,5,'a/2 would incorrectly make the slant 5');
});
test('sphere and closed hemisphere distinguish curved area, base and volume in every pi convention',()=>{
 for(const [mode,pi] of [['full',Math.PI],['22/7',22/7],['3.142',3.142]]){
  const sphere=calculateMeasures('sphere',{j:2},mode),half=calculateMeasures('hemisphere',{j:2},mode);
  assert.equal(sphere.valid,true);assert.equal(half.valid,true);
  near(sphere.area,16*pi);near(sphere.volume,32*pi/3);
  near(half.area,12*pi);near(half.volume,16*pi/3);near(half.areaParts[0].value,8*pi);near(half.areaParts[1].value,4*pi);
  assert.equal(sphere.slant,null);assert.equal(half.slant,null);
 }
});
test('all extra shapes obey area and volume scaling without intermediate rounding',()=>{
 for(const key of extras){const dims=LESSON_DATA[key].defaults,base=calculateMeasures(key,dims,'full'),scaled=calculateMeasures(key,Object.fromEntries(Object.entries(dims).map(([k,n])=>[k,n*2])),'full');near(scaled.area,base.area*4);near(scaled.volume,base.volume*8);}
});
test('each new worked example agrees with its stated defaults and final rounded answer',()=>{
 for(const [key,area,volume] of [['triangular-prism',85.86,41.57],['tetrahedron',54.82,20.78],['pentagonal-prism',175.06,165.17],['hexagonal-prism',227.14,249.42],['sphere',201.14,268.19],['hemisphere',84.86,56.57]]){
  const lesson=LESSON_DATA[key],r=calculateMeasures(key,lesson.defaults,'22/7');
  assert.equal(Number(r.area.toFixed(2)),area,key+' area');assert.equal(Number(r.volume.toFixed(2)),volume,key+' volume');
  assert.ok(lesson.surface.answer.includes(String(area)),key+' surface answer');assert.ok(lesson.volume.answer.includes(String(volume)),key+' volume answer');
 }
});
test('new dimensions reject missing, nonfinite, nonpositive and out-of-range input',()=>{
 for(const key of extras)for(const field of MEASURE_FIELDS[key])for(const bad of [undefined,'',0,-1,NaN,Infinity,.09,1001]){
  const r=calculateMeasures(key,{...LESSON_DATA[key].defaults,[field]:bad});assert.equal(r.valid,false,key+' '+field);assert.equal(r.area,null);assert.equal(r.volume,null);assert.ok(r.errors[field]);
 }
 assert.equal(calculateMeasures('not-a-solid',{j:3}).valid,false);
});
test('round solids explicitly state why no exact flat net can be shown',()=>{
 for(const key of ['sphere','hemisphere']){assert.equal(MODEL_DATA[key].noNet,true);assert.match(MODEL_DATA[key].net,/rata.*tepat|tepat.*rata/);assert.match(LESSON_DATA[key].netParts.join(' '),/rata/);}
});

class NotePort{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.events={};this.value='';this.textContent='';this.disabled=false;this.hidden=false;}
 setAttribute(k,v){this.attributes[k]=String(v);}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=[...nodes];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}focus(){}scrollIntoView(){}
}
test('all extra note diagrams use finite geometry and appropriate net/pi/slant controls',()=>{
 const html=fs.readFileSync(new URL('../src/index.html',import.meta.url),'utf8'),nodes={};
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]=new NotePort();
 const previous=globalThis.document;globalThis.document={getElementById:id=>nodes[id],createElement:tag=>new NotePort(tag),createElementNS:(_,tag)=>new NotePort(tag)};
 try{
  const explorations=[];const notes=new LearningNotes({onExplore(mode){explorations.push(mode);},announce(){},prefersReduced:()=>true});
  const inspect=node=>{for(const v of Object.values(node.attributes||{}))assert.doesNotMatch(v,/NaN|Infinity|undefined/);for(const child of node.children||[])inspect(child);};
  for(const key of MODEL_ORDER){
   notes.render(key);inspect(nodes['notes-diagram']);assert.ok(nodes['notes-diagram'].children.length>0,key);
   assert.equal(nodes['note-explore-net'].disabled,['sphere','hemisphere'].includes(key),key);
   assert.equal(nodes['notes-pi'].hidden,!['cylinder','cone','sphere','hemisphere'].includes(key),key);
   assert.equal(nodes['slant-result'].hidden,!['pyramid','cone','tetrahedron'].includes(key),key);
   const before=explorations.length;for(const click of nodes['note-explore-net'].events.click)click();assert.equal(explorations.length,before+(['sphere','hemisphere'].includes(key)?0:1),key);
  }
 }finally{globalThis.document=previous;}
});
