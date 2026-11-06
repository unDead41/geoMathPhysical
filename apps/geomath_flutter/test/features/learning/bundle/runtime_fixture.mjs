import fs from 'node:fs';
import vm from 'node:vm';

// DOM port for the real bundled runtime. Canvas geometry is tested separately;
// this deliberately makes no Android, layout, raster or accessibility claims.
export function teachingRuntime({transform=code=>code,canvas=false,preferences=false,adapterFile=process.env.GEOMATH_UX_BASELINE_BUNDLE}={}){
  const wrapper=fs.readFileSync(adapterFile||new URL('../../../../assets/module/native-adapter.js',import.meta.url),'utf8');
  const prepared=JSON.parse(wrapper.match(/  const source = ("[^\n]*");/)[1]);
  const code=[...prepared.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('class ModelRenderer'));
  const nodes={},listeners={},messages=[],frames=new Map();let clock=0,frameId=0,document;
  class NodePort{
    constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.style={setProperty(k,v){this[k]=v;}};this.value='';this.checked=false;this.disabled=false;this.firstChild={textContent:''};this.ownText='';this.captures=new Set();this.classList={add(){},remove(){},toggle(){}};}
    get textContent(){return this.ownText+this.children.map(n=>n.textContent??'').join('');}
    set textContent(v){this.ownText=String(v);this.children=[];}
    setAttribute(k,v){this.attributes[k]=String(v);if(k==='id'){this.id=String(v);nodes[v]=this;}if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
    getAttribute(k){return this.attributes[k]??null;}
    closest(selector){if(selector.startsWith('[')&&Object.hasOwn(this.attributes,selector.slice(1,-1)))return this;return this.parentElement?.closest(selector)||null;}
    append(...values){for(const n of values){if(n?.parentElement)n.parentElement.children=n.parentElement.children.filter(child=>child!==n);this.children.push(n);if(n&&typeof n==='object')n.parentElement=this;}}
    replaceChildren(...values){this.ownText='';this.children=[];this.append(...values);}
    addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
    querySelector(tag){let n=this.children.find(x=>x.tagName===tag);if(!n){n=new NodePort(tag);this.append(n);}return n;}
    querySelectorAll(selector){const match=n=>selector.startsWith('[')?Object.hasOwn(n.attributes||{},selector.slice(1,-1)):selector.startsWith('.')?(n.attributes?.class||'').split(' ').includes(selector.slice(1)):n.tagName===selector;return this.children.flatMap(n=>[...(match(n)?[n]:[]),...(n.querySelectorAll?.(selector)||[])]);}
    getContext(){if(!canvas)return null;if(!this.context){const operations=[];this.context=new Proxy({operations,measureText:text=>({width:String(text).length*7}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>key in target?target[key]:(...args)=>operations.push({key,args,strokeStyle:target.strokeStyle,lineWidth:target.lineWidth})});}return this.context;}
    getBoundingClientRect(){return {left:0,top:0,width:canvas?360:0,height:canvas?300:0};}
    setPointerCapture(id){this.captures.add(id);}
    hasPointerCapture(id){return this.captures.has(id);}
    releasePointerCapture(id){this.captures.delete(id);}
    scrollIntoView(){}
    focus(){this.focused=true;}
    remove(){}
    click(){if(!this.disabled)this.dispatchEvent(new Event('click',{bubbles:true}));}
    dispatchEvent(event){const e={...event,type:event.type,target:this,key:event.key,deltaY:event.deltaY,preventDefault(){},bubbles:event.bubbles};for(const fn of this.events[e.type]||[])fn(e);if(event.bubbles)document.emit(e);return true;}
  }
  class DocumentPort{
    get hidden(){return false;}
    constructor(){this.documentElement=new NodePort('html');this.body=new NodePort('body');this.events={};}
    getElementById(id){return nodes[id]||null;}
    createElement(tag){return new NodePort(tag);}
    createElementNS(_,tag){return new NodePort(tag);}
    createTextNode(text){return {textContent:String(text)};}
    createTreeWalker(){return {nextNode:()=>null};}
    querySelector(){return null;}
    querySelectorAll(){return [];}
    addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
    emit(e){for(const fn of this.events[e.type]||[])fn(e);}
    dispatchEvent(e){this.emit(e);return true;}
  }
  document=new DocumentPort();
  for(const m of prepared.matchAll(/\bid="([^"]+)"/g)){const node=new NodePort();node.id=m[1];nodes[m[1]]=node;}
  // Only the ownership relation needed to verify the actual study-node move;
  // this test port does not pretend to parse layout or compute browser CSS.
  const content=new NodePort();content.append(nodes['study-panel']);nodes['model-workbench'].append(content);document.body.append(nodes['model-workbench']);
  const media={matches:true,addEventListener(){}};
  const parent={postMessage:m=>messages.push(JSON.parse(JSON.stringify(m)))};
  const hostStub={media,language:'ms',audioEnabled:false,settings:{autoRotate:false,showLabels:true},start(fn){this.refresh=fn;fn(this.settings);},translate:v=>v};
  const window={parent,innerHeight:800,__geodecoderModuleHost:hostStub,matchMedia:()=>media,addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
  const context={window,document,Document:DocumentPort,Event,EventTarget,KeyboardEvent:class extends Event{constructor(type,options){super(type,options);this.key=options.key;}},TextEncoder,location:{hash:''},history:{replaceState(){}},performance:{now:()=>clock},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),console:{...console,info(){}}};
  if(preferences){
    const bootstrap=[...prepared.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(script=>script.includes('window.__geodecoderModuleHost='));
    vm.runInNewContext(bootstrap,context,{timeout:5000});
  }
  vm.runInNewContext(transform(code),context,{timeout:5000});
  const host=window.__geodecoderModuleHost;
  let sequence=0;
  const receive=data=>{for(const fn of listeners.message||[])fn({source:parent,data});};
  const action=value=>{receive({type:'geomath:learning-action',version:1,sequence:++sequence,value});return messages.filter(m=>m.type==='geomath:learning-state').at(-1);};
  const latest=()=>messages.filter(m=>m.type==='geomath:learning-state').at(-1);
  const tick=(ms=16)=>{clock+=ms;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(clock);};
  return {prepared,code,context,nodes,messages,window,host,document,parent,receive,action,latest,tick};
}

// Exact generated native wrapper with an opaque child capability. Identity is
// deliberately available to this native-side fixture, never the child fixture.
export function nativeWrapper({settings:initialSettings={},adapterFile=process.env.GEOMATH_UX_BASELINE_BUNDLE}={}){
  const adapter=fs.readFileSync(adapterFile||new URL('../../../../assets/module/native-adapter.js',import.meta.url),'utf8');
  const native=[],teaching=[],listeners={};let loads=0;
  const child={postMessage(value,origin){teaching.push({value:structuredClone(value),origin});}};
  const frame={contentWindow:child,removeAttribute(){this.source='';},set srcdoc(value){this.source=value;loads++;}};
  const window={GeoMathNative:{postMessage:value=>native.push(JSON.parse(value))},addEventListener:(type,fn)=>listeners[type]=fn};
  vm.runInNewContext(adapter,{window,document:{getElementById:()=>frame},TextEncoder});
  const config={instanceId:'fixture_instance_0123456789',bridgeSession:'native_nonce_0123456789',progressSession:'progress_nonce_0123456789',theme:'light',settings:{language:'ms',textSize:100,motionPaused:false,contrast:'standard',audioEnabled:false,...initialSettings},progress:[]};
  if(!window.GeoMathModule.configure(config))throw Error('wrapper configuration rejected');
  const api=window.GeoMathModule;
  const receive=(data,overrides={})=>listeners.message({data,source:child,origin:'null',...overrides});
  const ready=()=>{receive({type:'geodecoder:module-ready',protocol:1});receive({channel:'geodecoder.module.preferences',version:1,instanceId:'geomath-settings-v1',type:'ready'});receive({type:'geomath:learning-ready',version:1,eventSequence:1});};
  return {api,config,frame,child,native,teaching,receive,ready,loads:()=>loads};
}
