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
 emit(event,data={}){for(const fn of this.events[event]??[])fn({target:this,...data});}
}
function app(reduce=true){
 const html=fs.readFileSync(new URL('../GeoDecoder_Modul_V1.html',import.meta.url),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1],nodes={};
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]=new NodePort();
 let clock=0,id=0,queue=new Map();const media={matches:reduce,addEventListener(k,fn){this.change=fn;}};
 const doc={hidden:false,events:{},getElementById:id=>nodes[id]??null,createElement:tag=>new NodePort(tag),createTextNode:text=>({textContent:text}),addEventListener(k,fn){this.events[k]=fn;}};
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
