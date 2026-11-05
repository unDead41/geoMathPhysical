import fs from 'node:fs';
import vm from 'node:vm';

// DOM port for the real bundled runtime. Canvas geometry is tested separately;
// this deliberately makes no Android, layout, raster or accessibility claims.
export function teachingRuntime({transform=code=>code}={}){
  const wrapper=fs.readFileSync(new URL('../../../../assets/module/native-adapter.js',import.meta.url),'utf8');
  const prepared=JSON.parse(wrapper.match(/  const source = ("[^\n]*");/)[1]);
  const code=[...prepared.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('class ModelRenderer'));
  const nodes={},listeners={},messages=[],frames=new Map();let clock=0,frameId=0,document;
  class NodePort{
    constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.dataset={};this.events={};this.style={setProperty(k,v){this[k]=v;}};this.value='';this.checked=false;this.disabled=false;this.firstChild={textContent:''};this.ownText='';this.classList={add(){},remove(){},toggle(){}};}
    get textContent(){return this.ownText+this.children.map(n=>n.textContent??'').join('');}
    set textContent(v){this.ownText=String(v);this.children=[];}
    setAttribute(k,v){this.attributes[k]=String(v);if(k==='id'){this.id=String(v);nodes[v]=this;}if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
    getAttribute(k){return this.attributes[k]??null;}
    append(...values){this.children.push(...values);for(const n of values)if(n&&typeof n==='object')n.parentElement=this;}
    replaceChildren(...values){this.ownText='';this.children=[];this.append(...values);}
    addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
    querySelector(tag){let n=this.children.find(x=>x.tagName===tag);if(!n){n=new NodePort(tag);this.append(n);}return n;}
    querySelectorAll(tag){return this.children.filter(x=>x.tagName===tag);}
    getContext(){return null;}
    getBoundingClientRect(){return {left:0,top:0,width:0,height:0};}
    scrollIntoView(){}
    focus(){this.focused=true;}
    remove(){}
    click(){if(!this.disabled)this.dispatchEvent(new Event('click',{bubbles:true}));}
    dispatchEvent(event){const e={type:event.type,target:this,key:event.key,deltaY:event.deltaY,preventDefault(){},bubbles:event.bubbles};for(const fn of this.events[e.type]||[])fn(e);if(event.bubbles)document.emit(e);return true;}
  }
  class DocumentPort{
    get hidden(){return false;}
    constructor(){this.documentElement=new NodePort('html');this.body=new NodePort('body');this.events={};}
    getElementById(id){return nodes[id]||null;}
    createElement(tag){return new NodePort(tag);}
    createElementNS(_,tag){return new NodePort(tag);}
    createTextNode(text){return {textContent:String(text)};}
    querySelector(){return null;}
    querySelectorAll(){return [];}
    addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
    emit(e){for(const fn of this.events[e.type]||[])fn(e);}
    dispatchEvent(e){this.emit(e);return true;}
  }
  document=new DocumentPort();
  for(const m of prepared.matchAll(/\bid="([^"]+)"/g)){const node=new NodePort();node.id=m[1];nodes[m[1]]=node;}
  const media={matches:true,addEventListener(){}};
  const parent={postMessage:m=>messages.push(JSON.parse(JSON.stringify(m)))};
  const host={media,language:'ms',audioEnabled:false,settings:{autoRotate:false,showLabels:true},start(fn){this.refresh=fn;fn(this.settings);},translate:v=>v};
  const window={parent,__geodecoderModuleHost:host,matchMedia:()=>media,addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
  const context={window,document,Document:DocumentPort,Event,KeyboardEvent:class extends Event{constructor(type,options){super(type,options);this.key=options.key;}},TextEncoder,location:{hash:''},history:{replaceState(){}},performance:{now:()=>clock},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),console:{...console,info(){}}};
  vm.runInNewContext(transform(code),context,{timeout:5000});
  let sequence=0;
  const receive=data=>{for(const fn of listeners.message||[])fn({source:parent,data});};
  const action=value=>{receive({type:'geomath:learning-action',version:1,sequence:++sequence,value});return messages.filter(m=>m.type==='geomath:learning-state').at(-1);};
  const latest=()=>messages.filter(m=>m.type==='geomath:learning-state').at(-1);
  const tick=(ms=16)=>{clock+=ms;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(clock);};
  return {prepared,code,context,nodes,messages,window,host,document,parent,receive,action,latest,tick};
}

// Exact generated native wrapper with an opaque child capability. Identity is
// deliberately available to this native-side fixture, never the child fixture.
export function nativeWrapper(){
  const adapter=fs.readFileSync(new URL('../../../../assets/module/native-adapter.js',import.meta.url),'utf8');
  const native=[],teaching=[],listeners={};let loads=0;
  const child={postMessage(value,origin){teaching.push({value:structuredClone(value),origin});}};
  const frame={contentWindow:child,removeAttribute(){this.source='';},set srcdoc(value){this.source=value;loads++;}};
  const window={GeoMathNative:{postMessage:value=>native.push(JSON.parse(value))},addEventListener:(type,fn)=>listeners[type]=fn};
  vm.runInNewContext(adapter,{window,document:{getElementById:()=>frame},TextEncoder});
  const config={instanceId:'fixture_instance_0123456789',bridgeSession:'native_nonce_0123456789',progressSession:'progress_nonce_0123456789',theme:'light',settings:{language:'ms',textSize:100,motionPaused:false,contrast:'standard',audioEnabled:false},progress:[]};
  if(!window.GeoMathModule.configure(config))throw Error('wrapper configuration rejected');
  const api=window.GeoMathModule;
  const receive=(data,overrides={})=>listeners.message({data,source:child,origin:'null',...overrides});
  const ready=()=>{receive({type:'geodecoder:module-ready',protocol:1});receive({channel:'geodecoder.module.preferences',version:1,instanceId:'geomath-settings-v1',type:'ready'});receive({type:'geomath:learning-ready',version:1,eventSequence:1});};
  return {api,config,frame,child,native,teaching,receive,ready,loads:()=>loads};
}
