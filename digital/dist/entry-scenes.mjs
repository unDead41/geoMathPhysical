import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildEntryModel} from './entry-models.mjs';
import {entryIcon} from './entry-art.mjs';

export const SCENE_FPS=30;
export const SCENE_PIXEL_RATIO=1.5;
export function sceneMotionAllowed({paused=false,hidden=false,visible=true}={}){return !paused&&!hidden&&visible;}

/** One WebGL context shared by every entry illustration. Each visible figure
 * receives the rendered frame; hidden routes do no GPU or animation work. */
export function createEntryScenes({t,onToggleMotion}){
  const entries=Array.from(document.querySelectorAll('[data-entry-scene]')).map(node=>({node,type:node.dataset.entryScene,canvas:node.querySelector('canvas'),model:null,visible:false,dirty:true}));
  let renderer,environment,pmrem,failed=false,frame=0,lastFrame=0,time=0,previous=0,yaw=0,pitch=0,disposed=false;
  const stage=document.getElementById('geometry-kit'),button=document.getElementById('entry-motion-button');
  const cache=new Map();
  if(!window.IntersectionObserver||!window.ResizeObserver){
    document.querySelector('.scene-toolbar').hidden=true;
    return {sync(){},syncLanguage(){},dispose(){}};
  }
  function readTheme(){
    const style=getComputedStyle(document.documentElement);
    return {dark:document.documentElement.dataset.theme==='dark',primary:style.getPropertyValue('--primary-fill').trim(),surface:style.getPropertyValue('--surface').trim(),grid:style.getPropertyValue('--stage-dot').trim(),toolInk:style.getPropertyValue('--primary-dark').trim()};
  }
  let theme=readTheme();
  function isPaused(){return document.body.classList.contains('motion-paused');}
  function visibleEntries(){return entries.filter(e=>e.visible&&!e.node.closest('[hidden]'));}
  function updateControl(){
    const paused=isPaused();button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',t(paused?'entry.motionPlay':'entry.motionPause'));
    button.innerHTML=entryIcon(paused?'play':'pause')+`<span>${t(paused?'entry.animate':'entry.pause')}</span>`;
  }
  function fallback(){
    failed=true;cancelAnimationFrame(frame);frame=0;
    entries.forEach(e=>{e.node.dataset.rendered='false';e.node.dataset.renderer='fallback';});
    document.querySelector('.scene-toolbar').hidden=true;
    renderer?.dispose();environment?.dispose();pmrem?.dispose();
  }
  function init(){
    if(renderer||failed)return !!renderer;
    try{
      renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
      renderer.setPixelRatio(1);renderer.setClearColor(0x000000,0);
      renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
      pmrem=new THREE.PMREMGenerator(renderer);
      const room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);room.dispose();
      renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback();});
      return true;
    }catch{fallback();return false;}
  }
  function createWorld(type){
    if(cache.has(type))return cache.get(type);
    const scene=new THREE.Scene();scene.environment=environment.texture;
    const model=buildEntryModel(type,theme);scene.add(model.group);
    scene.add(new THREE.HemisphereLight('#EAF5FF','#8A9AB2',2.1));
    const key=new THREE.DirectionalLight('#FFFFFF',3.4);key.position.set(-4,9,6);key.castShadow=true;
    key.shadow.mapSize.set(type==='hero'?1024:512,type==='hero'?1024:512);
    Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.1,far:30});key.shadow.bias=-.0006;key.shadow.normalBias=.025;
    scene.add(key);const fill=new THREE.DirectionalLight('#C5DDFF',1.25);fill.position.set(7,4,-5);scene.add(fill);
    const camera=new THREE.OrthographicCamera(-6,6,4.3,-4.3,.1,50);
    camera.position.set(8,10.8,13);camera.lookAt(0,type==='hero'?.45:type==='duel'?.5:.2,0);
    const world={scene,camera,model};cache.set(type,world);return world;
  }
  function releaseWorlds(){
    const geometries=new Set(),materials=new Set(),textures=new Set();
    for(const {scene} of cache.values())scene.traverse(object=>{
      if(object.geometry)geometries.add(object.geometry);
      for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){materials.add(material);if(material.map)textures.add(material.map);}
      object.shadow?.map?.dispose();
    });
    geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());cache.clear();
  }
  function render(entriesToDraw){
    if(!entriesToDraw.length||!init())return;
    const sizes=entriesToDraw.map(e=>{
      const rect=e.node.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,SCENE_PIXEL_RATIO);
      return {e,width:Math.max(1,Math.round(rect.width*ratio)),height:Math.max(1,Math.round(rect.height*ratio))};
    });
    const width=Math.max(...sizes.map(s=>s.width)),height=Math.max(...sizes.map(s=>s.height));
    if(renderer.domElement.width!==width||renderer.domElement.height!==height)renderer.setSize(width,height,false);
    renderer.setScissorTest(true);
    for(const {e,width:w,height:h} of sizes){
      const world=createWorld(e.type),{camera,model}=world,aspect=w/h;
      const extent=e.type==='hero'?4.25:e.type==='resume'?2.6:e.type==='net'?2.35:['quiz','practice','duel'].includes(e.type)?1.75:2.05;
      const halfHeight=Math.max(extent,extent/(aspect*1.42));
      camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();
      model.group.rotation.y=e.type==='hero'?yaw:0;
      model.group.rotation.x=e.type==='hero'?pitch:0;
      for(const moving of model.moving){
        moving.object.rotation.y=moving.rotation+Math.sin(time*.33+moving.phase)*.19;
        moving.object.position.y=moving.y+(.035+Math.sin(time*.8+moving.phase)*.035);
      }
      renderer.setViewport(0,0,w,h);renderer.setScissor(0,0,w,h);renderer.clear();renderer.render(world.scene,camera);
      if(e.canvas.width!==w||e.canvas.height!==h){e.canvas.width=w;e.canvas.height=h;}
      const context=e.canvas.getContext('2d');
      if(!context){e.node.dataset.renderer='fallback';continue;}
      context.clearRect(0,0,w,h);context.drawImage(renderer.domElement,0,height-h,w,h,0,0,w,h);
      e.node.dataset.rendered='true';e.node.dataset.renderer='webgl';e.dirty=false;
    }
  }
  function tick(at){
    frame=0;if(disposed||failed)return;
    const visible=visibleEntries(),active=sceneMotionAllowed({paused:isPaused(),hidden:document.hidden,visible:visible.length>0});
    if(document.hidden||!visible.length){previous=0;return;}
    if(active&&at-lastFrame>=1000/SCENE_FPS){time+=previous?Math.min((at-previous)/1000,.1):0;previous=at;lastFrame=at;render(visible);}
    else if(visible.some(e=>e.dirty))render(visible);
    if(active)frame=requestAnimationFrame(tick);else previous=0;
  }
  function requestDraw(){if(!frame&&!disposed&&!failed)frame=requestAnimationFrame(tick);}
  function sync(){entries.forEach(e=>{e.dirty=true;});updateControl();requestDraw();}
  const intersection=new window.IntersectionObserver(records=>{for(const r of records){const e=entries.find(e=>e.node===r.target);e.visible=r.isIntersecting;e.dirty=true;}requestDraw();},{threshold:.01});
  entries.forEach(e=>intersection.observe(e.node));
  const resize=new window.ResizeObserver(()=>{entries.forEach(e=>{e.dirty=true;});requestDraw();});entries.forEach(e=>resize.observe(e.node));
  const preferences=new window.MutationObserver(()=>{
    const next=readTheme();if(JSON.stringify(next)!==JSON.stringify(theme)){theme=next;releaseWorlds();}
    sync();
  });
  preferences.observe(document.body,{attributes:true,attributeFilter:['class']});preferences.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-contrast']});
  const onVisibility=()=>{previous=0;sync();};document.addEventListener('visibilitychange',onVisibility);
  button.addEventListener('click',onToggleMotion);
  document.querySelectorAll('[data-scene-turn]').forEach(control=>control.addEventListener('click',()=>{
    const step=control.dataset.sceneTurn;
    if(step==='reset'){yaw=0;pitch=0;}else yaw+=Number(step)*.28;
    sync();
  }));
  let drag=null;
  stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch};stage.setPointerCapture(event.pointerId);stage.dataset.dragging='true';});
  stage.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    yaw=drag.yaw+(event.clientX-drag.x)*.006;pitch=Math.max(-.16,Math.min(.16,drag.pitch+(event.clientY-drag.y)*.002));sync();
  });
  const endDrag=()=>{drag=null;delete stage.dataset.dragging;};stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);stage.addEventListener('lostpointercapture',endDrag);
  function dispose(){disposed=true;cancelAnimationFrame(frame);intersection.disconnect();resize.disconnect();preferences.disconnect();document.removeEventListener('visibilitychange',onVisibility);releaseWorlds();renderer?.dispose();environment?.dispose();pmrem?.dispose();}
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
  sync();return {sync,syncLanguage:updateControl,dispose};
}
