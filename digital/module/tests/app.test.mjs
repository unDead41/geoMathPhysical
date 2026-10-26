import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
// Minimal DOM port for lifecycle tests. Geometry/rendering is verified separately.
// This executes the ACTUAL shipped app, not a duplicate animation state machine.
class NodePort {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.style={};this.textContent='';this.value='0';this.disabled=false;this.checked=false;this.firstChild={textContent:''};}
 get textContent(){return this.ownText+this.children.map(n=>n.textContent??'').join('');}
 set textContent(value){this.ownText=String(value);this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
 getAttribute(k){return this.attributes[k]??null;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.ownText='';this.children=[...nodes];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 querySelector(tag){let n=this.children.find(n=>n.tagName===tag);if(!n){n=new NodePort(tag);this.children.push(n);}return n;}
 querySelectorAll(tag){return this.children.filter(n=>n.tagName===tag);}
 getContext(){return null;}
 getBoundingClientRect(){return {left:0,top:0,width:0,height:0};}
 scrollIntoView(){}
 focus(){this.focused=true;}
 emit(event,data={}){for(const fn of this.events[event]??[])fn({target:this,...data});}
}
function app(reduce=true){
 const html=fs.readFileSync(new URL('../GeoDecoder_Modul_V1.html',import.meta.url),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1],nodes={};
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]=new NodePort();
 let clock=0,id=0,queue=new Map();const media={matches:reduce,addEventListener(k,fn){const old=this.change;this.change=old?()=>{old();fn();}:fn;}};
 const doc={hidden:false,events:{},querySelectorAll:()=>[],getElementById:id=>nodes[id]??null,createElement:tag=>new NodePort(tag),createElementNS:(_,tag)=>new NodePort(tag),createTextNode:text=>({textContent:text}),addEventListener(k,fn){const old=this.events[k];this.events[k]=old?()=>{old();fn();}:fn;}};
 const context={document:doc,window:{matchMedia:()=>media},location:{hash:''},history:{replaceState(){}},performance:{now:()=>clock},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{queue.set(++id,fn);return id;},cancelAnimationFrame:k=>queue.delete(k),console};
 vm.runInNewContext(code,context,{timeout:2000});
 const tick=(ms=16)=>{clock+=ms;const work=[...queue.values()];queue.clear();for(const fn of work)fn(clock);};
 const advance=ms=>{for(let elapsed=0;elapsed<ms;elapsed+=100)tick(Math.min(100,ms-elapsed));};
 tick(0);
 return {nodes,doc,media,tick,advance,click:id=>{assert.ok(!nodes[id].disabled,id+' disabled');nodes[id].emit('click');},state:()=>({...nodes['model-canvas'].dataset}),pending:()=>queue.size};
}
test('open from a stationary closed solid survives its zero-time first frame and reaches the flat net',()=>{
 const a=app();a.click('open-net');a.tick(16);assert.equal(a.state().playing,'true');a.advance(6000);assert.equal(a.state().progress,'1');assert.equal(a.state().playing,'false');
});
test('close from a stationary flat net survives its zero-time first frame and reaches the solid',()=>{
 const a=app();a.nodes.progress.value='1000';a.nodes.progress.emit('input');a.advance(1000);a.click('close-net');a.tick(16);assert.equal(a.state().playing,'true');a.advance(6000);assert.equal(a.state().progress,'0');assert.equal(a.state().playing,'false');
});
test('pause holds progress; resume completes an open/close cycle; replay restarts',()=>{
 const a=app();a.click('play');a.advance(2200);const mid=Number(a.state().progress);assert.ok(mid>.2&&mid<.6);a.click('play');a.advance(2000);assert.equal(Number(a.state().progress),mid);a.click('play');a.advance(14000);assert.equal(a.state().progress,'0');assert.equal(a.state().playing,'false');a.click('replay');a.advance(1200);assert.ok(Number(a.state().progress)>0);
});
test('reduced motion starts stationary, allows explicit playback and stops on preference changes',()=>{
 const a=app();assert.equal(a.state().auto,'false');assert.equal(a.pending(),0);assert.equal(a.nodes['reduced-note'].hidden,false);a.click('play');a.advance(1000);assert.ok(Number(a.state().progress)>0);a.media.change();a.advance(1000);assert.equal(a.state().playing,'false');assert.equal(a.state().auto,'false');
});
test('hidden tabs stop animation and rotation without jumping or resuming on return',()=>{
 const a=app(false);a.click('play');a.advance(1100);a.doc.hidden=true;a.doc.events.visibilitychange();const before=a.state().progress;a.advance(20000);a.doc.hidden=false;a.doc.events.visibilitychange();a.tick();assert.equal(a.state().progress,before);assert.equal(a.state().playing,'false');assert.equal(a.state().auto,'false');
});
test('choosing orthographic views closes the net, freezes rotation and aligns the chosen direction',()=>{
 const a=app();a.nodes.progress.value='1000';a.nodes.progress.emit('input');a.advance(1000);a.click('mode-views');a.advance(7000);assert.equal(a.state().progress,'0');assert.equal(a.state().mode,'views');assert.equal(a.state().auto,'false');assert.equal(a.nodes['animation-panel'].hidden,true);assert.equal(a.nodes['views-panel'].hidden,false);
 const top=a.nodes['view-grid'].children.find(n=>n.dataset.view==='top');top.emit('click');a.advance(1000);assert.ok(Math.abs(Number(a.state().pitch)-Math.PI/2)<1e-8);
});
test('rapid shape changes cancel pending playback and clear the previous learning response',()=>{
 const a=app();a.click('play');a.advance(1200);const cone=a.nodes['shape-picker'].children.find(n=>n.dataset.shape==='cone');cone.emit('click');a.tick();assert.equal(a.state().shape,'cone');assert.equal(a.state().progress,'0');assert.equal(a.state().playing,'false');assert.equal(a.nodes['notes-title'].textContent,'Kon');assert.match(a.nodes['think-feedback'].textContent,/Pilih satu/);
});
test('resuming a paused one-way opening retains its destination and stops at the net',()=>{
 const a=app();a.click('open-net');a.advance(1800);a.click('play');a.advance(900);a.click('play');a.advance(10000);assert.equal(a.state().progress,'1');assert.equal(a.state().playing,'false');
});
test('resuming during the closing half continues closing instead of reversing direction',()=>{
 const a=app();a.click('play');a.advance(7800);const before=Number(a.state().progress);assert.ok(before>0&&before<1);a.click('play');a.advance(500);a.click('play');a.advance(1000);assert.ok(Number(a.state().progress)<before);
});
test('camera changes inside an animation keep exactly one scheduled frame loop',()=>{
 const a=app(false);a.click('play');
 for(let i=0;i<160;i++){a.tick(100);assert.ok(a.pending()<=1,'duplicate requestAnimationFrame loops: '+a.pending());}
});
test('opening notes stops motion and returning to exploration preserves progress without resuming',()=>{
 const a=app(false);a.click('open-net');a.advance(2000);const progress=a.state().progress;a.click('learn-notes');
 assert.equal(a.nodes['study-panel'].hidden,false);assert.equal(a.nodes['explore-panel'].hidden,true);assert.equal(a.pending(),0);assert.equal(a.state().auto,'false');assert.equal(a.state().playing,'false');
 a.advance(20000);a.click('learn-explore');a.tick();assert.equal(a.state().progress,progress);assert.equal(a.state().playing,'false');assert.equal(a.pending(),0);assert.equal(a.nodes['study-panel'].hidden,true);
});
test('notes show each shape with correct default results, fields and slant height',()=>{
 const a=app();a.click('learn-notes');
 for(const [shape,area,volume] of [['cube','96 cm²','64 cm³'],['cuboid','108 cm²','72 cm³'],['pyramid','96 cm²','48 cm³'],['cylinder','748 cm²','1540 cm³'],['cone','75.43 cm²','37.71 cm³']]){
  a.nodes['shape-picker'].children.find(n=>n.dataset.shape===shape).emit('click');
  assert.equal(a.nodes['calculated-area'].textContent,area);assert.equal(a.nodes['calculated-volume'].textContent,volume);assert.equal(a.nodes['notes-pi'].hidden,!['cylinder','cone'].includes(shape));
  assert.equal(a.nodes['slant-result'].hidden,!['pyramid','cone'].includes(shape));assert.equal(a.nodes['area-example'].children[0].tagName,'details');
 }
 assert.equal(a.nodes['calculated-slant'].textContent,'s ≈ 5 cm');assert.equal(a.nodes['measure-a'].disabled,true);assert.equal(a.nodes['measure-j'].disabled,false);
});
test('notes update from decimal input and reset to the worked example',()=>{
 const a=app();a.click('learn-notes');a.nodes['measure-a'].value='2,5';a.nodes['measure-a'].emit('input');assert.equal(a.nodes['calculated-area'].textContent,'37.5 cm²');assert.equal(a.nodes['calculated-volume'].textContent,'15.63 cm³');
 a.click('reset-measures');assert.equal(a.nodes['measure-a'].value,'4');assert.equal(a.nodes['calculated-volume'].textContent,'64 cm³');
});
test('notes reject invalid measurements, clear stale answers and focus the invalid field on submit',()=>{
 const a=app();a.click('learn-notes');a.nodes['measure-a'].value='-4';a.nodes['measure-a'].emit('input');assert.equal(a.nodes['calculated-area'].textContent,'—');assert.equal(a.nodes['calculated-volume'].textContent,'—');assert.equal(a.nodes['measure-a'].getAttribute('aria-invalid'),'true');
 a.nodes['notes-form'].emit('submit',{preventDefault(){}});assert.equal(a.nodes['measure-a'].focused,true);assert.ok(a.nodes['measure-error-a'].textContent.includes('0.1'));
});
test('pi selection recalculates curved solids and notes state survives a round trip to 3D',()=>{
 const a=app();a.click('learn-notes');a.nodes['shape-picker'].children.find(n=>n.dataset.shape==='cylinder').emit('click');a.click('pi-full');assert.equal(a.nodes['calculated-area'].textContent,'747.7 cm²');assert.equal(a.nodes['pi-full'].getAttribute('aria-pressed'),'true');
 a.nodes['measure-j'].value='3.5';a.nodes['measure-j'].emit('input');const area=a.nodes['calculated-area'].textContent;a.click('learn-explore');a.click('learn-notes');assert.equal(a.nodes['calculated-area'].textContent,area);assert.equal(a.nodes['measure-j'].value,'3.5');
});
test('notes actions open the matching net and orthographic view using existing controls',()=>{
 const a=app();a.click('learn-notes');a.nodes['shape-picker'].children.find(n=>n.dataset.shape==='pyramid').emit('click');a.click('note-explore-net');a.advance(7000);assert.equal(a.state().shape,'pyramid');assert.equal(a.state().progress,'1');assert.equal(a.nodes['study-panel'].hidden,true);
 a.click('learn-notes');a.click('note-explore-views');a.advance(7000);assert.equal(a.state().mode,'views');assert.equal(a.state().progress,'0');assert.ok(Math.abs(Number(a.state().pitch)-Math.PI/2)<1e-8);
});
test('small positive volumes are never displayed as a zero-volume solid',()=>{
 const a=app();a.click('learn-notes');a.nodes['measure-a'].value='0.1';a.nodes['measure-a'].emit('input');assert.equal(a.nodes['calculated-volume'].textContent,'< 0.01 cm³');assert.equal(a.nodes['measure-a'].getAttribute('aria-invalid'),'false');assert.match(a.nodes['calculation-status'].textContent,/positif/);
});
test('lab navigation stops exploration motion and hides the unrelated shape picker',()=>{
 const a=app(false);a.click('learn-labs');assert.equal(a.nodes['labs-panel'].hidden,false);assert.equal(a.nodes['shape-picker'].hidden,true);assert.equal(a.state().auto,'false');assert.equal(a.pending(),0);a.click('learn-explore');a.tick();assert.equal(a.nodes['shape-picker'].hidden,false);assert.equal(a.pending(),0);
});
test('cube builder folds a valid layout, shows overlap and handles an empty grid',()=>{
 const a=app();a.click('learn-labs');a.click('net-mode-editor');a.click('net-fold');a.advance(8500);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');assert.equal(a.nodes['labs-canvas'].dataset.valid,'true');
 a.nodes['net-example'].value='overlap';a.nodes['net-example'].emit('change');a.click('net-fold');a.advance(8500);assert.equal(a.nodes['labs-canvas'].dataset.valid,'false');assert.match(a.nodes['net-feedback'].textContent,/bertindih/);
 a.click('net-clear');assert.equal(a.nodes['net-fold'].disabled,true);assert.match(a.nodes['net-count'].textContent,/0/);
});
test('builder directional alternative moves a chosen face without adding or losing squares',()=>{
 const a=app();a.click('learn-labs');a.click('net-mode-editor');a.click('net-left');assert.equal(a.nodes['net-count'].textContent,'6 / 6 muka');assert.equal(a.nodes['net-grid'].children.find(n=>n.dataset.cell==='0,0').getAttribute('aria-pressed'),'true');
});
test('unit-volume lab adds cubes, layers and fills exactly the displayed capacity',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['volume-kind'].value='unit';a.nodes['volume-kind'].emit('change');a.click('unit-layer');a.advance(1400);assert.equal(a.nodes['labs-canvas'].dataset.units,'6');a.click('unit-one');assert.equal(a.nodes['labs-canvas'].dataset.units,'7');a.click('unit-fill');a.advance(4500);assert.equal(a.nodes['labs-canvas'].dataset.units,'18');a.click('unit-empty');assert.equal(a.nodes['labs-canvas'].dataset.units,'0');
});
test('three explicit transfers fill the matching receiver, with refill and a bounded final state',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['volume-kind'].value='cone';a.nodes['volume-kind'].emit('change');
 for(let n=1;n<=3;n++){a.click('pour-one');a.advance(6000);assert.equal(a.nodes['labs-canvas'].dataset.pours,String(n));if(n<3)a.click('pour-refill');}
 assert.equal(a.nodes['pour-one'].disabled,true);assert.match(a.nodes['pour-result'].textContent,/3.*3/);a.click('pour-reset');assert.equal(a.nodes['labs-canvas'].dataset.pours,'0');
});
test('surface lab derives the total only after all real surfaces are selected',()=>{
 const a=app();a.click('learn-labs');a.click('lab-area');assert.match(a.nodes['area-count'].textContent,/0.*6/);a.click('area-open');a.advance(8500);a.click('area-all');assert.match(a.nodes['area-count'].textContent,/6.*6/);assert.match(a.nodes['area-total'].textContent,/96/);
 a.nodes['area-shape'].value='cylinder';a.nodes['area-shape'].emit('change');assert.match(a.nodes['area-count'].textContent,/0.*3/);a.click('area-open');a.advance(8500);a.click('area-all');assert.match(a.nodes['area-total'].textContent,/747.7/);
});
test('composite lab checks exposed groups and excludes joined faces',()=>{
 const a=app();a.click('learn-labs');a.click('lab-composite');a.click('comp-join');a.advance(3600);assert.equal(a.nodes['labs-canvas'].dataset.joined,'1');assert.match(a.nodes['comp-area'].textContent,/240/);assert.match(a.nodes['comp-volume'].textContent,/264/);
 for(const key of ['side','bottom','roofSide'])a.nodes['comp-groups'].children.find(n=>n.dataset.group===key).emit('click');a.click('comp-check');assert.match(a.nodes['comp-feedback'].textContent,/Tepat/);
 a.nodes['comp-groups'].children.find(n=>n.dataset.group==='joinLower').emit('click');a.click('comp-check');assert.match(a.nodes['comp-feedback'].textContent,/bercantum/);
});
test('switching lab, opening notes and hiding the page cancel pending lab frames',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(1000);assert.ok(a.pending()>0);a.click('lab-volume');assert.equal(a.pending(),0);a.click('lab-area');a.click('area-open');a.advance(1000);a.click('learn-notes');assert.equal(a.pending(),0);a.click('learn-labs');a.click('area-open');a.advance(300);a.doc.hidden=true;a.doc.events.visibilitychange();assert.equal(a.pending(),0);a.doc.hidden=false;a.doc.events.visibilitychange();assert.equal(a.pending(),0);
});
test('lab pause holds progress, resume reaches its target and reduced-motion changes stop motion',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(1100);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.progress;a.advance(1500);assert.equal(a.nodes['labs-canvas'].dataset.progress,before);a.click('lab-pause');a.advance(8500);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');a.click('net-flat');a.advance(500);a.media.change();assert.equal(a.pending(),0);
});
test('editing a grid cell keeps keyboard focus on the replacement cell',()=>{const a=app();a.click('learn-labs');a.click('net-mode-editor');a.nodes['net-grid'].children.find(n=>n.dataset.cell==='5,5').emit('click');a.click('net-clear');a.nodes['net-grid'].children.find(n=>n.dataset.cell==='0,0').emit('click');assert.equal(a.nodes['net-grid'].children.find(n=>n.dataset.cell==='0,0').focused,true);});
test('toggling surface and composite buttons preserves their keyboard focus',()=>{const a=app();a.click('learn-labs');a.click('lab-area');a.click('area-open');a.advance(8500);a.nodes['area-pieces'].children[0].emit('click');assert.equal(a.nodes['area-pieces'].children[0].focused,true);a.click('lab-composite');a.click('comp-join');a.advance(3600);a.nodes['comp-groups'].children[0].emit('click');assert.equal(a.nodes['comp-groups'].children[0].focused,true);});
test('every literal action button has a real shipped-script binding after lazy sections are opened',()=>{
 const a=app();a.click('learn-notes');a.click('learn-labs');const html=fs.readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
 for(const m of html.matchAll(/<button\b([^>]*)>/g)){const attrs=m[1],id=attrs.match(/\bid="([^"]+)"/)?.[1];if(!id||/type="submit"/.test(attrs))continue;assert.ok(a.nodes[id].events.click?.length>0,id+' has no action binding');}
});
test('direct lab slider input keeps the new user value before cancelling playback',()=>{
 const a=app();a.click('learn-labs');for(const [kind,action,value] of [['net','net-fold','370'],['area','area-open','620'],['composite','comp-join','110']]){a.click('lab-'+kind);a.click(action);a.advance(700);a.nodes['lab-progress'].value=value;a.nodes['lab-progress'].emit('input');assert.equal(Number(a.nodes['labs-canvas'].dataset.progress),Number(value)/1000,kind+' slider was overwritten');assert.equal(a.pending(),0);assert.equal(a.nodes['lab-progress'].value,value);}
});
test('labs start with slow pacing and a ready-made net gallery',()=>{
 const a=app();a.click('learn-labs');assert.equal(a.nodes['lab-speed'].value,'0.5');assert.equal(a.nodes['net-editor-panel'].hidden,true);assert.equal(a.nodes['net-preset-panel'].hidden,false);a.click('net-fold');a.advance(4000);const p=Number(a.nodes['labs-canvas'].dataset.progress);assert.ok(p>.4&&p<.6);a.advance(4500);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');
});
test('all nine ready-made nets can be selected, folded and reset independently of cube editing',()=>{
 const a=app();a.click('learn-labs');for(const key of ['cube','cuboid','pyramid','cylinder','cone','triangular-prism','tetrahedron','pentagonal-prism','hexagonal-prism']){a.nodes['net-preset'].value=key;a.nodes['net-preset'].emit('change');assert.equal(a.nodes['labs-canvas'].dataset.preset,key);assert.equal(a.nodes['labs-canvas'].dataset.progress,'0');a.click('net-fold');a.advance(8500);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');assert.ok(a.nodes['net-preset-summary'].textContent.length>15);}
 a.click('net-mode-editor');assert.equal(a.nodes['net-editor-panel'].hidden,false);assert.equal(a.nodes['labs-canvas'].dataset.progress,'0');
});
test('speed changes preserve pose and progress sliders retain direction-specific labels',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(2000);const p=a.nodes['labs-canvas'].dataset.progress;a.nodes['lab-speed'].value='0.25';a.nodes['lab-speed'].emit('change');assert.equal(a.nodes['labs-canvas'].dataset.progress,p);a.advance(1000);assert.ok(Number(a.nodes['labs-canvas'].dataset.progress)>Number(p));a.advance(20000);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');assert.match(a.nodes['lab-progress-value'].textContent,/dilipat/);
});
test('completing a unit layer fills the current partial layer slowly without skipping cubes',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['volume-kind'].value='unit';a.nodes['volume-kind'].emit('change');a.click('unit-one');a.click('unit-layer');assert.equal(a.nodes['labs-canvas'].dataset.units,'1');a.advance(400);assert.ok(Number(a.nodes['labs-canvas'].dataset.units)<6);a.advance(1200);assert.equal(a.nodes['labs-canvas'].dataset.units,'6');assert.match(a.nodes['lab-next-step'].textContent,/lapisan|kiub|Penuhkan/i);
});
test('guidance gates surface selection and exterior checks until the model is ready',()=>{
 const a=app();a.click('learn-labs');a.click('lab-area');assert.equal(a.nodes['area-all'].disabled,true);assert.equal(a.nodes['area-pieces'].children[0].disabled,true);assert.match(a.nodes['lab-next-step'].textContent,/Buka/);a.click('area-open');a.advance(8500);assert.equal(a.nodes['area-all'].disabled,false);a.click('area-all');assert.match(a.nodes['lab-next-step'].textContent,/rumus|lengkap/i);
 a.click('lab-composite');assert.equal(a.nodes['comp-check'].disabled,true);assert.equal(a.nodes['comp-groups'].children[0].disabled,true);a.click('comp-join');a.advance(3600);assert.equal(a.nodes['comp-groups'].children[0].disabled,false);
});
test('paused transfers have one resume control and survive leaving and returning to the lab',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['volume-kind'].value='cone';a.nodes['volume-kind'].emit('change');a.click('pour-one');a.advance(1700);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.progress;assert.equal(a.nodes['pour-one'].disabled,true);assert.match(a.nodes['lab-pause'].textContent,/Sambung tuangan/);a.click('lab-area');a.click('lab-volume');assert.equal(a.nodes['labs-canvas'].dataset.progress,before);assert.match(a.nodes['lab-pause'].textContent,/Sambung tuangan/);a.click('lab-pause');a.advance(6000);assert.equal(a.nodes['labs-canvas'].dataset.pours,'1');
});
test('cube editing is locked while partially folded and restored after reopening flat',()=>{
 const a=app();a.click('learn-labs');a.click('net-mode-editor');a.click('net-fold');a.advance(2000);assert.equal(a.nodes['net-grid'].children[0].disabled,true);assert.match(a.nodes['net-edit-note'].textContent,/rata/);a.click('net-flat');a.advance(8500);assert.equal(a.nodes['net-grid'].children[0].disabled,false);
});
test('volume comparison adds one cubic centimetre to one or both solids and sums selected contents',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');assert.equal(a.nodes['volume-kind'].value,'compare');a.click('compare-add-a');a.advance(3000);assert.ok(Math.abs(Number(a.nodes['labs-canvas'].dataset.totalVolume)-1)<1e-8);assert.equal(a.nodes['labs-canvas'].dataset.fillB,'0');a.click('compare-add-both');a.advance(3000);assert.ok(Math.abs(Number(a.nodes['labs-canvas'].dataset.totalVolume)-3)<1e-8);a.nodes['compare-include-a'].checked=false;a.nodes['compare-include-a'].emit('change');assert.ok(Math.abs(Number(a.nodes['labs-canvas'].dataset.totalVolume)-1)<1e-8);
 a.nodes['compare-count'].value='1';a.nodes['compare-count'].emit('change');assert.equal(a.nodes['compare-card-b'].hidden,true);assert.ok(Math.abs(Number(a.nodes['labs-canvas'].dataset.totalVolume)-2)<1e-8);
});
test('comparison supports nine solids, direct contents control and capacity-safe full filling',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');for(const key of ['cube','cuboid','pyramid','cone','cylinder','triangular-prism','tetrahedron','pentagonal-prism','hexagonal-prism']){a.nodes['compare-shape-a'].value=key;a.nodes['compare-shape-a'].emit('change');assert.match(a.nodes['compare-total'].textContent,/0/);a.nodes['compare-fill-a'].value='500';a.nodes['compare-fill-a'].emit('input');assert.equal(a.nodes['labs-canvas'].dataset.fillA,'0.5');}a.click('compare-full-both');a.advance(6000);assert.equal(a.nodes['labs-canvas'].dataset.fillA,'1');assert.equal(a.nodes['labs-canvas'].dataset.fillB,'1');a.click('compare-empty');assert.equal(a.nodes['labs-canvas'].dataset.fillA,'0');
});

test('ready-made face tracking keeps keyboard focus after updating its highlight',()=>{
 const a=app();a.click('learn-labs');a.nodes['net-preset-faces'].children[2].emit('click');assert.equal(a.nodes['net-preset-faces'].children[2].focused,true);assert.equal(a.nodes['net-preset-faces'].children[2].getAttribute('aria-pressed'),'true');
});
test('comparison resume preserves both captured destinations and supports a direct override',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.click('compare-full-both');a.advance(1200);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.fillA;a.advance(2000);assert.equal(a.nodes['labs-canvas'].dataset.fillA,before);a.nodes['lab-speed'].value='0.25';a.nodes['lab-speed'].emit('change');a.click('lab-pause');a.advance(14000);assert.equal(a.nodes['labs-canvas'].dataset.fillA,'1');assert.equal(a.nodes['labs-canvas'].dataset.fillB,'1');assert.equal(a.pending(),0);
 a.click('compare-empty');a.click('compare-full-a');a.advance(800);a.nodes['compare-fill-a'].value='120';a.nodes['compare-fill-a'].emit('input');a.advance(15000);assert.equal(a.nodes['labs-canvas'].dataset.fillA,'0.12');assert.equal(a.pending(),0);
});
test('tiny positive contents stay visible and have a unit-aware accessible slider value',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['compare-a-a'].value='1';a.nodes['compare-a-a'].emit('input');a.nodes['compare-fill-a'].value='1';a.nodes['compare-fill-a'].emit('input');assert.match(a.nodes['compare-volume-a'].textContent,/< 0.01/);assert.match(a.nodes['compare-fill-a'].getAttribute('aria-valuetext'),/isi padu.*cm³/);assert.match(a.nodes['lab-outcome'].textContent,/Jumlah isi/);
});

test('valid ready-made layouts use neutral instructions before closing, never an error colour',()=>{
 const a=app();a.click('learn-labs');assert.notEqual(a.nodes['net-feedback'].dataset.success,'false');a.click('net-fold');a.advance(1200);assert.match(a.nodes['net-feedback'].textContent,/sedang|Perhatikan/i);a.click('lab-pause');assert.match(a.nodes['net-feedback'].textContent,/dijeda/i);a.click('lab-pause');a.advance(8500);assert.equal(a.nodes['net-feedback'].dataset.success,'true');
});
test('pausing exploration freezes camera as well as the net and exposes the resume action',()=>{
 const a=app(false);a.click('open-net');a.advance(200);a.click('play');const before=a.state();a.advance(1500);
 assert.equal(a.state().yaw,before.yaw,'camera kept moving after pause');assert.equal(a.state().pitch,before.pitch);
 assert.equal(a.state().progress,before.progress);assert.equal(a.nodes.play.getAttribute('aria-label'),'Sambung animasi');
 a.click('play');a.advance(7000);assert.equal(a.state().progress,'1');
});
test('paused volume transfer has one resume action and cannot start a competing pour',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['volume-kind'].value='cone';a.nodes['volume-kind'].emit('change');
 a.click('pour-one');a.advance(800);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.progress;
 assert.equal(a.nodes['pour-one'].disabled,true,'paused transfer may only resume through the playback control');
 assert.equal(a.nodes['pour-refill'].disabled,true,'paused transfer cannot replace its source');
 assert.equal(a.nodes['lab-pause'].getAttribute('aria-label'),'Sambung tuangan');
 a.advance(2000);assert.equal(a.nodes['labs-canvas'].dataset.progress,before);
 a.click('lab-pause');a.advance(6000);assert.equal(a.nodes['labs-canvas'].dataset.pours,'1');assert.equal(a.pending(),0);
});
test('a hidden tab preserves the explicit lab target for a deliberate resume',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(1000);const before=a.nodes['labs-canvas'].dataset.progress;
 a.doc.hidden=true;a.doc.events.visibilitychange();a.advance(10000);a.doc.hidden=false;a.doc.events.visibilitychange();
 assert.equal(a.nodes['labs-canvas'].dataset.progress,before);assert.equal(a.nodes['lab-pause'].disabled,false);
 assert.equal(a.nodes['lab-pause'].getAttribute('aria-label'),'Sambung animasi');assert.equal(a.pending(),0);
 a.click('lab-pause');a.advance(8500);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');
});
test('lab resume preserves the original easing timeline at the default half speed',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(2000);a.click('lab-pause');a.advance(1500);a.click('lab-pause');a.advance(1000);
 const p=Number(a.nodes['labs-canvas'].dataset.progress);
 // A four-second fold at half speed has an eight-second easing timeline.
 assert.ok(Math.abs(p-.31640625)<1e-8,'resume lost the original eight-second smoothstep timeline: '+p);
});
test('backgrounding exploration preserves its one-way target for an explicit resume',()=>{
 const a=app();a.click('open-net');a.advance(1400);a.doc.hidden=true;a.doc.events.visibilitychange();a.advance(10000);a.doc.hidden=false;a.doc.events.visibilitychange();a.tick();
 assert.equal(a.nodes.play.getAttribute('aria-label'),'Sambung animasi');a.click('play');a.advance(7000);assert.equal(a.state().progress,'1');assert.equal(a.state().playing,'false');
});
test('changing speed while a gallery fold is paused preserves its original easing position',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(2000);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.progress;
 a.nodes['lab-speed'].value='0.25';a.nodes['lab-speed'].emit('change');a.advance(4000);
 assert.equal(a.nodes['labs-canvas'].dataset.progress,before);assert.equal(a.pending(),0);
 a.click('lab-pause');a.advance(2000);const p=Number(a.nodes['labs-canvas'].dataset.progress);
 assert.ok(Math.abs(p-.31640625)<1e-8,'speed change restarted the easing curve: '+p);
 a.advance(12000);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');assert.equal(a.pending(),0);
});
test('a hidden gallery session keeps its easing position when another lab changes speed',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(2000);const before=a.nodes['labs-canvas'].dataset.progress;
 a.doc.hidden=true;a.doc.events.visibilitychange();a.advance(10000);a.doc.hidden=false;a.doc.events.visibilitychange();
 a.click('lab-area');a.nodes['lab-speed'].value='0.25';a.nodes['lab-speed'].emit('change');a.advance(1000);a.click('lab-net');
 assert.equal(a.nodes['labs-canvas'].dataset.progress,before);assert.equal(a.pending(),0);assert.equal(a.nodes['lab-pause'].getAttribute('aria-label'),'Sambung animasi');
 a.click('lab-pause');a.advance(2000);const p=Number(a.nodes['labs-canvas'].dataset.progress);
 assert.ok(Math.abs(p-.31640625)<1e-8,'suspended gallery session lost elapsed progress or current speed: '+p);
 a.advance(12000);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');assert.equal(a.pending(),0);
});
