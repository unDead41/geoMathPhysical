import test from 'node:test';import assert from 'node:assert/strict';
import {calculateMeasures,readDimension,LESSON_DATA,COMPOSITE_EXAMPLE} from '../src/lessons.mjs';
const near=(a,b)=>{assert.equal(typeof a,'number');assert.ok(Number.isFinite(a));assert.ok(Math.abs(a-b)<1e-8,`${a} ≠ ${b}`);};
const cases=[['cube',{a:4},96,64],['cuboid',{p:6,l:4,t:3},108,72],['pyramid',{a:6,t:4},96,48],['cylinder',{j:7,t:10},748,1540],['cone',{j:3,t:4},528/7,264/7]];
for(const [shape,dims,area,volume] of cases)test(shape+': original worked example has correct total surface area and volume',()=>{
 const r=calculateMeasures(shape,dims,'22/7');assert.equal(r.valid,true);near(r.area,area);near(r.volume,volume);near(r.areaParts.reduce((s,p)=>s+p.value,0),area);
});
test('slant heights use perpendicular height and the correct half-base/radius',()=>{
 near(calculateMeasures('pyramid',{a:6,t:4}).slant,5);near(calculateMeasures('cone',{j:3,t:4}).slant,5);
});
test('cones and pyramids have one-third the volume of matching cylinders/prisms',()=>{
 near(calculateMeasures('cone',{j:7,t:12}).volume*3,calculateMeasures('cylinder',{j:7,t:12}).volume);
 near(calculateMeasures('pyramid',{a:6,t:12}).volume*3,calculateMeasures('cuboid',{p:6,l:6,t:12}).volume);
});
test('doubling every length quadruples area and multiplies volume by eight',()=>{
 for(const [shape,dims] of cases){const r=calculateMeasures(shape,dims),double=calculateMeasures(shape,Object.fromEntries(Object.entries(dims).map(([k,v])=>[k,v*2])));near(double.area,r.area*4);near(double.volume,r.volume*8);}
});
test('pi conventions affect curved solids and are stated independently of rounding',()=>{
 for(const mode of ['22/7','3.142','full']){const pi=mode==='full'?Math.PI:mode==='22/7'?22/7:3.142;const r=calculateMeasures('cone',{j:3,t:4},mode);near(r.area,24*pi);near(r.volume,12*pi);}
});
test('invalid, missing, zero, negative and oversized dimensions clear numerical results',()=>{
 for(const raw of ['',null,undefined,'abc','0x10','1e3',NaN,Infinity,-1,0,.05,1001]){const r=calculateMeasures('cone',{j:raw,t:4});assert.equal(r.valid,false,JSON.stringify(raw));assert.equal(r.area,null);assert.equal(r.volume,null);assert.ok(r.errors.j);}
});
test('Malay decimal comma and decimal point are accepted without treating a diameter as radius',()=>{
 near(readDimension(' 3,5 '),3.5);near(readDimension('.5'),.5);near(calculateMeasures('cylinder',{j:'3,5',t:10}).volume,385);
});
test('unknown shape/pi and missing required dimensions cannot yield misleading answers',()=>{
 assert.equal(calculateMeasures('unknown-solid',{j:3}).valid,false);assert.equal(calculateMeasures('cube',{a:4},'wrong').valid,false);assert.equal(calculateMeasures('cuboid',{p:6,l:4}).valid,false);
});
test('worked-example defaults match independently known results and include reasoning and units',()=>{
 for(const [shape,dims,area,volume] of cases){const lesson=LESSON_DATA[shape],r=calculateMeasures(shape,lesson.defaults);assert.deepEqual(lesson.defaults,dims);near(r.area,area);near(r.volume,volume);assert.ok(lesson.surface.steps.length>=4);assert.ok(lesson.volume.steps.length>=4);assert.match(lesson.surface.answer,/cm²/);assert.match(lesson.volume.answer,/cm³/);}
});
test('composite example excludes both joined faces and adds volumes',()=>{
 const {side:a,roofHeight:t,roofSlant:s,externalArea,volume}=COMPOSITE_EXAMPLE;near(Math.hypot(a/2,t),s);near(5*a*a+4*(a*s/2),externalArea);near(a**3+a*a*t/3,volume);near(externalArea,240);near(volume,264);
});
test('boundary dimensions remain valid and strictly positive without early rounding',()=>{
 for(const [shape,dims] of cases)for(const n of [.1,1000]){const r=calculateMeasures(shape,Object.fromEntries(Object.keys(dims).map(k=>[k,n])));assert.equal(r.valid,true);assert.ok(r.area>0&&Number.isFinite(r.area));assert.ok(r.volume>0&&Number.isFinite(r.volume));}
 near(calculateMeasures('cube',{a:.1}).volume,.001);
});
