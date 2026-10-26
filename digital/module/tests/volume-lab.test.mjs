import test from 'node:test';import assert from 'node:assert/strict';
import {volumeInfo,volumeComparisonMesh,comparisonTotal,volumeDefaults,volumeFields} from '../src/volume-lab.mjs';
import {cross3,sub3} from '../src/geometry.mjs';
const near=(a,b,tol=1e-7)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<tol,`${a} != ${b}`);
const cases=[['cube',{a:3},27],['cuboid',{p:4,l:3,t:2},24],['cylinder',{j:3,t:4},36*Math.PI],['cone',{j:3,t:4},12*Math.PI],['pyramid',{a:6,t:4},48],['triangular-prism',{a:4,t:6},24*Math.sqrt(3)],['tetrahedron',{a:4,t:6},8*Math.sqrt(3)],['pentagonal-prism',{a:4,t:6},120/Math.tan(Math.PI/5)],['hexagonal-prism',{a:4,t:6},144*Math.sqrt(3)]];
function volume(mesh){if(!mesh.length)return 0;const v=mesh.flatMap(f=>f.vertices),c=[0,1,2].map(i=>v.reduce((s,p)=>s+p[i],0)/v.length);return mesh.reduce((sum,f)=>sum+f.vertices.slice(1,-1).reduce((s,p,j)=>{const a=sub3(f.vertices[0],c),n=cross3(sub3(p,c),sub3(f.vertices[j+2],c));return s+Math.abs(a.reduce((s,x,k)=>s+x*n[k],0))/6;},0),0);}
for(const [key,d,expected] of cases)test(key+': arbitrary valid dimensions and actual clipped geometry have the right volume',()=>{near(volumeInfo(key,d).volume,expected);for(const fill of [.1,.5,1]){const mesh=volumeComparisonMesh([{key,d,fill}],1);near(volume(mesh.filter(f=>f.id===0)),expected*fill,expected*.002+1e-7);}});
test('one or both selected volumes count only their actual contents',()=>{const a={key:'cube',d:{a:3},fill:.5},b={key:'cuboid',d:{p:4,l:3,t:2},fill:.25};near(comparisonTotal([a,b],[true,false]),13.5);near(comparisonTotal([a,b],[false,true]),6);near(comparisonTotal([a,b],[true,true]),19.5);near(comparisonTotal([a,b],[true,true],1),13.5);near(comparisonTotal([a,b],[false,false]),0);});
test('impossible volumes are rejected',()=>{assert.throws(()=>volumeInfo('sphere',{}),RangeError);assert.throws(()=>volumeInfo('tetrahedron',{a:0,t:4}),RangeError);});

test('comparison defaults fit their actual 1–8 cm native range controls',()=>{for(const [key] of cases){const d=volumeDefaults(key);for(const field of volumeFields(key))assert.ok(d[field]>=1&&d[field]<=8,key+' '+field+' exceeds its control');}});
