import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
// Minimal DOM port for lifecycle tests. Geometry/rendering is verified separately.
// This executes the ACTUAL shipped app, not a duplicate animation state machine.
class NodePort {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.style={};this.textContent='';this.value='0';this.disabled=false;this.checked=false;this.firstChild={textContent:''};}
 setAttribute(k,v){this.attributes[k]=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
 getAttribute(k){return this.attributes[k]??null;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 querySelector(tag){let n=this.children.find(n=>n.tagName===tag);if(!n){n=new NodePort(tag);this.children.push(n);}return n;}
 querySelectorAll(tag){return this.children.filter(n=>n.tagName===tag);}
 getContext(){return null;}
 getBoundingClientRect(){return {left:0,top:0,width:0,height:0};}
 scrollIntoView(){}
 focus(){this.focused=true;}
 click(){if(!this.disabled)this.emit('click');}
 emit(event,data={}){for(const fn of this.events[event]??[])fn({target:this,...data});}
}
function app(reduce=true,options={}){
 const html=fs.readFileSync(new URL('../GeoDecoder_Modul_V1.html',import.meta.url),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1],nodes={};
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]=new NodePort();
 let clock=0,id=0,queue=new Map();const media={matches:reduce,addEventListener(k,fn){const old=this.change;this.change=old?()=>{old();fn();}:fn;}};
 const doc={documentElement:new NodePort('html'),hidden:false,events:{},getElementById:id=>nodes[id]??null,createElement:tag=>new NodePort(tag),createElementNS:(_,tag)=>new NodePort(tag),createTextNode:text=>({textContent:text}),addEventListener(k,fn){const old=this.events[k];this.events[k]=old?()=>{old();fn();}:fn;}};
 const messages=[],listeners={};const parent={postMessage:value=>messages.push(value)};const win={matchMedia:()=>media,addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn);}};win.parent=options.embedded?parent:win;if(options.speech){win.speechSynthesis=options.speech;win.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};}
 const context={document:doc,window:win,location:{hash:''},history:{replaceState(){}},performance:{now:()=>clock},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{queue.set(++id,fn);return id;},cancelAnimationFrame:k=>queue.delete(k),console};
 vm.runInNewContext(code,context,{timeout:2000});
 const tick=(ms=16)=>{clock+=ms;const work=[...queue.values()];queue.clear();for(const fn of work)fn(clock);};
 const advance=ms=>{for(let elapsed=0;elapsed<ms;elapsed+=100)tick(Math.min(100,ms-elapsed));};
 tick(0);
 return {nodes,doc,media,messages,parent,receive:(source,data)=>{for(const fn of listeners.message??[])fn({source,data});},tick,advance,click:id=>{assert.ok(!nodes[id].disabled,id+' disabled');nodes[id].emit('click');},state:()=>({...nodes['model-canvas'].dataset}),pending:()=>queue.size};
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
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(5000);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');assert.equal(a.nodes['labs-canvas'].dataset.valid,'true');
 a.nodes['net-example'].value='overlap';a.nodes['net-example'].emit('change');a.click('net-fold');a.advance(5000);assert.equal(a.nodes['labs-canvas'].dataset.valid,'false');assert.match(a.nodes['net-feedback'].textContent,/bertindih/);
 a.click('net-clear');assert.equal(a.nodes['net-fold'].disabled,true);assert.match(a.nodes['net-count'].textContent,/0/);
});
test('builder directional alternative moves a chosen face without adding or losing squares',()=>{
 const a=app();a.click('learn-labs');a.click('net-left');assert.equal(a.nodes['net-count'].textContent,'6 / 6 muka');assert.equal(a.nodes['net-grid'].children.find(n=>n.dataset.cell==='0,0').getAttribute('aria-pressed'),'true');
});
test('unit-volume lab adds cubes, layers and fills exactly the displayed capacity',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.click('unit-layer');assert.equal(a.nodes['labs-canvas'].dataset.units,'6');a.click('unit-one');assert.equal(a.nodes['labs-canvas'].dataset.units,'7');a.click('unit-fill');assert.equal(a.nodes['labs-canvas'].dataset.units,'18');a.click('unit-empty');assert.equal(a.nodes['labs-canvas'].dataset.units,'0');
});
test('three explicit transfers fill the matching receiver, with refill and a bounded final state',()=>{
 const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['volume-kind'].value='cone';a.nodes['volume-kind'].emit('change');
 for(let n=1;n<=3;n++){a.click('pour-one');a.advance(3500);assert.equal(a.nodes['labs-canvas'].dataset.pours,String(n));if(n<3)a.click('pour-refill');}
 assert.equal(a.nodes['pour-one'].disabled,true);assert.match(a.nodes['pour-result'].textContent,/3.*3/);a.click('pour-reset');assert.equal(a.nodes['labs-canvas'].dataset.pours,'0');
});
test('surface lab derives the total only after all real surfaces are selected',()=>{
 const a=app();a.click('learn-labs');a.click('lab-area');assert.match(a.nodes['area-count'].textContent,/0.*6/);a.click('area-all');assert.match(a.nodes['area-count'].textContent,/6.*6/);assert.match(a.nodes['area-total'].textContent,/96/);
 a.nodes['area-shape'].value='cylinder';a.nodes['area-shape'].emit('change');assert.match(a.nodes['area-count'].textContent,/0.*3/);a.click('area-all');assert.match(a.nodes['area-total'].textContent,/747.7/);
});
test('composite lab checks exposed groups and excludes joined faces',()=>{
 const a=app();a.click('learn-labs');a.click('lab-composite');a.click('comp-join');a.advance(2400);assert.equal(a.nodes['labs-canvas'].dataset.joined,'1');assert.match(a.nodes['comp-area'].textContent,/240/);assert.match(a.nodes['comp-volume'].textContent,/264/);
 for(const key of ['side','bottom','roofSide'])a.nodes['comp-groups'].children.find(n=>n.dataset.group===key).emit('click');a.click('comp-check');assert.match(a.nodes['comp-feedback'].textContent,/Tepat/);
 a.nodes['comp-groups'].children.find(n=>n.dataset.group==='joinLower').emit('click');a.click('comp-check');assert.match(a.nodes['comp-feedback'].textContent,/bercantum/);
});
test('switching lab, opening notes and hiding the page cancel pending lab frames',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(1000);assert.ok(a.pending()>0);a.click('lab-volume');assert.equal(a.pending(),0);a.click('lab-area');a.click('area-open');a.advance(1000);a.click('learn-notes');assert.equal(a.pending(),0);a.click('learn-labs');a.click('area-open');a.advance(300);a.doc.hidden=true;a.doc.events.visibilitychange();assert.equal(a.pending(),0);a.doc.hidden=false;a.doc.events.visibilitychange();assert.equal(a.pending(),0);
});
test('lab pause holds progress, resume reaches its target and reduced-motion changes stop motion',()=>{
 const a=app();a.click('learn-labs');a.click('net-fold');a.advance(1100);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.progress;a.advance(1500);assert.equal(a.nodes['labs-canvas'].dataset.progress,before);a.click('lab-pause');a.advance(5000);assert.equal(a.nodes['labs-canvas'].dataset.progress,'1');a.click('net-flat');a.advance(500);a.media.change();assert.equal(a.pending(),0);
});
test('editing a grid cell keeps keyboard focus on the replacement cell',()=>{const a=app();a.click('learn-labs');a.nodes['net-grid'].children.find(n=>n.dataset.cell==='5,5').emit('click');a.click('net-clear');a.nodes['net-grid'].children.find(n=>n.dataset.cell==='0,0').emit('click');assert.equal(a.nodes['net-grid'].children.find(n=>n.dataset.cell==='0,0').focused,true);});
test('toggling surface and composite buttons preserves their keyboard focus',()=>{const a=app();a.click('learn-labs');a.click('lab-area');a.nodes['area-pieces'].children[0].emit('click');assert.equal(a.nodes['area-pieces'].children[0].focused,true);a.click('lab-composite');a.nodes['comp-groups'].children[0].emit('click');assert.equal(a.nodes['comp-groups'].children[0].focused,true);});
test('every literal action button has a real shipped-script binding after lazy sections are opened',()=>{
 const a=app();a.click('learn-notes');a.click('learn-labs');const html=fs.readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
 for(const m of html.matchAll(/<button\b([^>]*)>/g)){const attrs=m[1],id=attrs.match(/\bid="([^"]+)"/)?.[1];if(!id||/type="submit"/.test(attrs))continue;assert.ok(a.nodes[id].events.click?.length>0,id+' has no action binding');}
});
test('direct lab slider input keeps the new user value before cancelling playback',()=>{
 const a=app();a.click('learn-labs');for(const [kind,action,value] of [['net','net-fold','370'],['area','area-open','620'],['composite','comp-join','110']]){a.click('lab-'+kind);a.click(action);a.advance(700);a.nodes['lab-progress'].value=value;a.nodes['lab-progress'].emit('input');assert.equal(Number(a.nodes['labs-canvas'].dataset.progress),Number(value)/1000,kind+' slider was overwritten');assert.equal(a.pending(),0);assert.equal(a.nodes['lab-progress'].value,value);}
});
function predict(a,text='Saya ramalkan hubungan ukuran dan permukaan ini.'){a.nodes['guided-prediction'].value=text;a.click('guided-begin');}
function explain(a){a.nodes['guided-explanation'].value='Pemerhatian sepadan kerana setiap bahagian diambil kira dengan ukuran yang sama.';a.click('guided-complete');}
function cell(a,pos){a.nodes['net-grid'].children.find(n=>n.dataset.cell===pos).emit('click');}
test('guided net requires repair after a prediction, completed fold and a conceptual check',()=>{const a=app();a.click('learn-labs');a.click('net-fold');a.advance(4500);assert.equal(a.nodes['guided-check'].disabled,true);predict(a);assert.equal(a.nodes['labs-canvas'].dataset.valid,'false');for(const p of ['0,0','2,0','3,1','1,2'])cell(a,p);a.click('net-fold');a.advance(4500);assert.equal(a.nodes['guided-check'].disabled,false);a.nodes['guided-term'].value='count';a.click('guided-check');assert.equal(a.nodes['guided-complete'].disabled,true);a.nodes['guided-term'].value='distinct';a.click('guided-check');explain(a);assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);a.click('lab-retry');assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);assert.equal(a.nodes['guided-complete'].disabled,true);});
test('loading a valid example cannot replace the net repair challenge',()=>{const a=app();a.click('learn-labs');predict(a);a.nodes['net-example'].value='cross';a.nodes['net-example'].emit('change');a.click('net-fold');a.advance(4500);assert.equal(a.nodes['guided-check'].disabled,true);});
test('guided volume compares prediction with real capacity and edits invalidate checks',()=>{const a=app();a.click('learn-labs');a.click('lab-volume');predict(a,'18 kiub unit');assert.equal(a.nodes['guided-check'].disabled,true);a.click('unit-fill');a.nodes['guided-answer'].value='17';a.click('guided-check');assert.equal(a.nodes['guided-complete'].disabled,true);a.nodes['guided-answer'].value='18';a.click('guided-check');assert.equal(a.nodes['guided-complete'].disabled,false);a.click('unit-empty');assert.equal(a.nodes['guided-complete'].disabled,true);a.click('unit-fill');a.click('guided-check');explain(a);assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);a.click('lab-undo');assert.equal(a.nodes['labs-canvas'].dataset.units,'0');assert.equal(a.nodes['guided-complete'].disabled,true);});
test('guided area connects the first coloured surface to its actual formula term',()=>{const a=app();a.click('learn-labs');a.click('lab-area');predict(a,'96 cm² daripada enam muka');a.click('area-all');assert.equal(a.nodes['guided-check'].disabled,true);a.click('area-open');a.advance(4500);a.nodes['guided-term'].value='πjs';a.click('guided-check');assert.equal(a.nodes['guided-complete'].disabled,true);a.nodes['guided-term'].value='a²';a.click('guided-check');explain(a);assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);a.nodes['area-a'].value='5';a.nodes['area-a'].emit('input');assert.equal(a.nodes['guided-complete'].disabled,true);assert.match(a.nodes['area-pieces'].children[0].children[1].textContent,/a²/);});
test('guided composite checks both mating faces and actual external selection before explanation',()=>{const a=app();a.click('learn-labs');a.click('lab-composite');predict(a,'Dua tapak menjadi dalaman');a.click('comp-join');a.advance(2000);a.nodes['guided-answer'].value='2';a.click('guided-check');assert.equal(a.nodes['guided-complete'].disabled,true);for(const key of ['side','bottom','roofSide'])a.nodes['comp-groups'].children.find(n=>n.dataset.group===key).emit('click');a.click('guided-check');explain(a);assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);assert.match(a.nodes['comp-equation'].textContent,/Langkah 1.*Langkah 2/);a.nodes['comp-groups'].children.find(n=>n.dataset.group==='joinUpper').emit('click');assert.equal(a.nodes['guided-complete'].disabled,true);a.click('guided-check');assert.equal(a.nodes['guided-complete'].disabled,true);});
test('next-step completes a paused pour exactly once; 0.5× and resume preserve the cursor',()=>{const a=app();a.click('learn-labs');a.click('lab-volume');a.nodes['volume-kind'].value='cone';a.nodes['volume-kind'].emit('change');a.nodes['lab-speed'].value='0.5';a.nodes['lab-speed'].emit('change');a.click('pour-one');a.advance(1300);assert.equal(Number(a.nodes['labs-canvas'].dataset.progress),.25);a.click('lab-pause');const before=a.nodes['labs-canvas'].dataset.progress;a.advance(60000);assert.equal(a.nodes['labs-canvas'].dataset.progress,before);for(let i=0;i<8;i++)a.click('lab-next');assert.equal(a.nodes['labs-canvas'].dataset.pours,'1');a.click('lab-next');assert.equal(a.nodes['labs-canvas'].dataset.pours,'1');});
test('exploration speed and next-step work without autoplay or elapsed pause jumps',()=>{const a=app();a.nodes['explore-speed'].value='0.5';a.nodes['explore-speed'].emit('change');a.click('open-net');a.advance(3000);assert.ok(Number(a.state().progress)<.27);a.click('play');const before=Number(a.state().progress);a.advance(60000);a.click('explore-next');a.tick();assert.ok(Math.abs(Number(a.state().progress)-before-.1)<1e-8);assert.equal(a.state().playing,'false');});
test('bridge ready, source validation, session binding and restoration without echo use shipped code',()=>{const a=app(true,{embedded:true});assert.deepEqual(JSON.parse(JSON.stringify(a.messages)),[{type:'geodecoder:module-ready',protocol:1}]);const record={activity:'net',stage:'explanation',prediction:'six',result:'valid fold',explanation:'six distinct normals',completed:true};const context={type:'geodecoder:module-context',protocol:1,session:'session-A',theme:'dark',progress:[record]};a.receive({},context);assert.match(a.nodes['module-count'].textContent,/0 \/ 4/);a.receive(a.parent,context);assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);assert.equal(a.doc.documentElement.getAttribute('data-theme'),'dark');assert.equal(a.nodes['module-theme'].disabled,true);assert.equal(a.messages.length,1);a.click('learn-labs');assert.equal(a.nodes['guided-complete'].disabled,true);a.click('lab-volume');predict(a);assert.equal(a.messages.at(-1).session,'session-A');assert.equal(a.messages.at(-1).stage,'prediction');a.receive(a.parent,{...context,progress:[record]});assert.equal(a.messages.length,2);a.receive(a.parent,{...context,session:'session-B',progress:[]});assert.match(a.nodes['module-count'].textContent,/0 \/ 4/);assert.equal(a.nodes['guided-prediction'].value,'');predict(a);assert.equal(a.messages.at(-1).session,'session-B');});
test('standalone theme/focus and voice fallback retain readable text without browser persistence',()=>{const a=app();a.click('module-theme');assert.equal(a.doc.documentElement.getAttribute('data-theme'),'dark');a.click('module-focus');assert.equal(a.doc.documentElement.getAttribute('data-focus'),'true');assert.equal(a.nodes['speech-play'].disabled,true);assert.match(a.nodes['speech-status'].textContent,/tidak tersedia/);assert.ok(a.nodes['speech-transcript'].textContent.length>20);a.click('learn-labs');assert.match(a.nodes['speech-transcript'].textContent,/bentangan/);});
test('editing a checked answer requires another successful check before completion',()=>{const a=app();a.click('learn-labs');a.click('lab-volume');predict(a);a.click('unit-fill');a.nodes['guided-answer'].value='18';a.click('guided-check');assert.equal(a.nodes['guided-complete'].disabled,false);a.nodes['guided-answer'].value='17';a.nodes['guided-answer'].emit('input');assert.equal(a.nodes['guided-complete'].disabled,true);});
test('unchanged guided milestones do not emit duplicate progress messages',()=>{const a=app(true,{embedded:true});a.receive(a.parent,{type:'geodecoder:module-context',protocol:1,session:'same',theme:'light',progress:[]});a.click('learn-labs');a.click('lab-volume');predict(a);a.click('unit-fill');a.nodes['guided-answer'].value='18';a.click('guided-check');const count=a.messages.length;a.click('guided-check');assert.equal(a.messages.length,count);explain(a);const completed=a.messages.length;explain(a);assert.equal(a.messages.length,completed);});
test('available local Malay speech is explicit, replayable and stopped on activity exit and hidden page',()=>{let played=0,stopped=0,last;const speech={getVoices:()=>[{localService:false,lang:'ms-MY'},{localService:true,lang:'ms-MY'}],addEventListener(){},speak:u=>{played++;last=u;},cancel:()=>stopped++};const a=app(true,{speech});assert.equal(played,0);a.click('speech-play');assert.equal(played,1);assert.equal(last.voice.localService,true);assert.ok(last.text.length>20);a.click('speech-play');assert.equal(played,2);const before=stopped;a.click('learn-labs');assert.ok(stopped>before);a.doc.hidden=true;a.doc.events.visibilitychange();assert.ok(stopped>before+1);});

test('post-completion experiment and answer edits retain the earned bridge record until full completion',()=>{const a=app(true,{embedded:true});a.receive(a.parent,{type:'geodecoder:module-context',protocol:1,session:'earned',theme:'light',progress:[]});a.click('learn-labs');a.click('lab-volume');predict(a,'18 cubes');a.click('unit-fill');a.nodes['guided-answer'].value='18';a.click('guided-check');explain(a);const earned=JSON.parse(JSON.stringify(a.messages.at(-1))),count=a.messages.length;a.nodes['unit-t'].value='4';a.nodes['unit-t'].emit('input');a.click('unit-fill');assert.equal(a.messages.length,count);assert.deepEqual(JSON.parse(JSON.stringify(a.messages.at(-1))),earned);assert.match(a.nodes['module-count'].textContent,/1 \/ 4/);a.nodes['guided-answer'].value='24';a.nodes['guided-answer'].emit('input');a.click('guided-check');assert.equal(a.messages.length,count);a.nodes['guided-explanation'].value='Four layers of six make 24 cubes.';a.click('guided-complete');assert.equal(a.messages.at(-1).explanation,'Four layers of six make 24 cubes.');const revised=JSON.parse(JSON.stringify(a.messages.at(-1))),revisedCount=a.messages.length;a.nodes['guided-answer'].value='23';a.nodes['guided-answer'].emit('input');assert.equal(a.nodes['guided-complete'].disabled,true);a.nodes['guided-answer'].value='24';a.nodes['guided-answer'].emit('input');a.click('guided-check');assert.equal(a.messages.length,revisedCount);assert.deepEqual(JSON.parse(JSON.stringify(a.messages.at(-1))),revised);a.nodes['guided-explanation'].value='The base has six unit squares and the height is four.';a.click('guided-complete');assert.equal(a.messages.at(-1).completed,true);assert.equal(a.messages.at(-1).stage,'explanation');assert.equal(a.messages.at(-1).explanation,'The base has six unit squares and the height is four.');});
