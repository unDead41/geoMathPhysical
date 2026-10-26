import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
// Minimal DOM port for lifecycle tests. Geometry/rendering is verified separately.
// This executes the ACTUAL shipped app, not a duplicate animation state machine.
class NodePort {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.style={};this.textContent='';this.value='0';this.disabled=false;this.checked=false;this.firstChild={textContent:''};}
 get textContent(){return this.ownText+this.children.map(n=>n.textContent??'').join('');}
 set textContent(value){this.ownText=String(value);this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;if(k==='id'){this.id=v;this.register?.(v,this);}if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
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
 click(){if(!this.disabled)this.emit('click');}
 emit(event,data={}){for(const fn of this.events[event]??[])fn({target:this,...data});}
}
export function app(reduce=true,options={}){
 const html=fs.readFileSync(new URL('../GeoDecoder_Modul_V1.html',import.meta.url),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1],nodes={};
 for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]=new NodePort();
 let clock=0,id=0,queue=new Map();const media={matches:reduce,addEventListener(k,fn){const old=this.change;this.change=old?()=>{old();fn();}:fn;}};
 const doc={documentElement:new NodePort('html'),hidden:false,events:{},querySelectorAll:()=>[],getElementById:id=>nodes[id]??null,createElement:tag=>Object.assign(new NodePort(tag),{register:(id,n)=>nodes[id]=n}),createElementNS:(_,tag)=>new NodePort(tag),createTextNode:text=>({textContent:text}),addEventListener(k,fn){const old=this.events[k];this.events[k]=old?()=>{old();fn();}:fn;}};
 const messages=[],listeners={};const parent={postMessage:value=>messages.push(value)};
 const win={matchMedia:()=>media,addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn);}};win.parent=options.embedded?parent:win;
 if(options.speech){win.speechSynthesis=options.speech;win.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};}
 if(options.host)win.__geodecoderModuleHost=options.host;
 const context={document:doc,window:win,location:{hash:''},history:{replaceState(){}},performance:{now:()=>clock},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{queue.set(++id,fn);return id;},cancelAnimationFrame:k=>queue.delete(k),console};
 vm.runInNewContext(code,context,{timeout:2000});
 const tick=(ms=16)=>{clock+=ms;const work=[...queue.values()];queue.clear();for(const fn of work)fn(clock);};
 const advance=ms=>{for(let elapsed=0;elapsed<ms;elapsed+=100)tick(Math.min(100,ms-elapsed));};
 tick(0);
 return {nodes,doc,media,win,messages,parent,receive:(source,data)=>{for(const fn of listeners.message??[])fn({source,data});},tick,advance,click:id=>{assert.ok(!nodes[id].disabled,id+' disabled');nodes[id].emit('click');},state:()=>({...nodes['model-canvas'].dataset}),pending:()=>queue.size};
}
