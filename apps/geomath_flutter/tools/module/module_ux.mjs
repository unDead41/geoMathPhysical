/** UI adapters only. Geometry, folding, projection and calculation stay canonical. */
export function installModuleUx(){
  const study=el('study-panel'),home=study.parentElement||el('model-workbench');
  let panel='none',drawer=null,size=48,drag=null,resizeInput,title,notesTab,calculatorTab,closeButton,resizeLabel;
  const english=()=>moduleAccess.language()==='en';
  const text=(ms,en)=>english()?en:ms;
  const node=(tag,attributes={},content)=>uiNode(tag,attributes,content);
  const presets={...VIEWS,isometric:{name:'Isometrik',yaw:.55,pitch:.35}};

  function resize(value){
    size=Math.max(30,Math.min(80,Math.round(Number(value)||48)));
    if(!drawer)return;
    drawer.style.setProperty('--geomath-panel-height',size+'dvh');
    resizeInput.value=String(size);
    resizeInput.setAttribute('aria-valuetext',Math.round(size)+text(' peratus tinggi skrin',' percent of screen height'));
  }
  function labels(){
    if(!drawer)return;
    title.textContent=text('Nota dan ukuran','Notes and measurements');
    notesTab.textContent=text('Nota','Notes');calculatorTab.textContent=text('Kalkulator','Calculator');
    closeButton.textContent=text('Tutup','Close');closeButton.setAttribute('aria-label',text('Tutup panel','Close panel'));resizeLabel.textContent=text('Tinggi panel','Panel height');
    el('geomath-panel-handle').setAttribute('aria-label',text('Seret untuk ubah tinggi panel. Anak panah atas atau bawah juga boleh digunakan.','Drag to resize the panel. Up and down arrow keys also work.'));
    notesTab.setAttribute('aria-pressed',String(panel==='notes'));
    calculatorTab.setAttribute('aria-pressed',String(panel==='calculator'));resize(size);
  }
  function createDrawer(){
    if(drawer)return;
    drawer=node('aside',{id:'geomath-study-drawer',role:'region','aria-labelledby':'geomath-panel-title'});
    const header=node('div',{class:'geomath-panel-header','data-module-native-language':''});
    const handle=node('button',{id:'geomath-panel-handle',type:'button',class:'geomath-panel-handle','aria-controls':'geomath-study-content'});
    handle.append(node('span',{'aria-hidden':'true'},'↕'));
    title=node('h2',{id:'geomath-panel-title'});
    closeButton=node('button',{id:'geomath-panel-close',type:'button',class:'button'});
    closeButton.addEventListener('click',()=>setPanel('none'));
    const tabs=node('div',{class:'geomath-panel-tabs',role:'group'});
    notesTab=node('button',{id:'geomath-panel-notes',type:'button','aria-controls':'study-panel'});
    calculatorTab=node('button',{id:'geomath-panel-calculator',type:'button','aria-controls':'study-panel'});
    notesTab.addEventListener('click',()=>setPanel('notes'));
    calculatorTab.addEventListener('click',()=>setPanel('calculator'));
    tabs.append(notesTab,calculatorTab);
    const sizeControl=node('label',{class:'geomath-panel-size',for:'geomath-panel-size'});
    resizeLabel=node('span');resizeInput=node('input',{id:'geomath-panel-size',type:'range',min:30,max:80,step:1,value:size});
    resizeInput.addEventListener('input',()=>resize(resizeInput.value));sizeControl.append(resizeLabel,resizeInput);
    header.append(handle,title,closeButton,tabs,sizeControl);
    const content=node('div',{id:'geomath-study-content',class:'geomath-study-content'});
    drawer.append(header,content);drawer.hidden=true;document.body.append(drawer);
    handle.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      drag={id:event.pointerId,y:event.clientY,size};handle.setPointerCapture?.(event.pointerId);event.preventDefault();
    });
    handle.addEventListener('pointermove',event=>{
      if(drag?.id!==event.pointerId)return;
      resize(drag.size+(drag.y-event.clientY)/(window.innerHeight||800)*100);
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,event=>{
      if(drag?.id!==event.pointerId)return;drag=null;
      if(handle.hasPointerCapture?.(event.pointerId))handle.releasePointerCapture(event.pointerId);
    });
    handle.addEventListener('keydown',event=>{
      const delta={ArrowUp:5,ArrowDown:-5,ArrowLeft:-5,ArrowRight:5}[event.key];
      if(delta===undefined&&!['Home','End'].includes(event.key))return;
      event.preventDefault();resize(event.key==='Home'?30:event.key==='End'?80:size+delta);
    });
    drawer.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();setPanel('none');el('model-canvas').focus({preventScroll:true});}});
    labels();
  }
  function refreshPanel(){
    if(panel==='none')return;
    learningNotes.render(state.shape);
    study.dataset.studyMode=panel;study.hidden=false;
    drawNotesOverview();labels();
  }
  function setPanel(value){
    if(!['notes','calculator','none'].includes(value))return false;
    if(value!=='none'&&state.learningView!=='explore')return false;
    if(value==='none'){
      panel='none';drag=null;
      if(drawer){drawer.hidden=true;home.append(study);study.hidden=state.learningView!=='notes';study.dataset.studyMode=state.studyMode;}
      return true;
    }
    createDrawer();panel=value;drawer.hidden=false;
    el('geomath-study-content').append(study);refreshPanel();
    return true;
  }

  // Pass the same physical ID through every renderer of the chosen model. In
  // particular, curved tessellation shares one ID and never gains extra faces.
  const draw=ModelRenderer.prototype.draw;
  ModelRenderer.prototype.draw=function(options){
    const related=this===mainRenderer||this===notesRenderer||this===notesNetRenderer||[...viewRenderers.values()].includes(this);
    const selected=related&&options.shape===state.shape?state.selected:options.selected;
    if(related){this.canvas.setAttribute('data-shape-id',options.shape);this.canvas.setAttribute('data-selected-face-id',selected==null?'':String(selected));}
    return draw.call(this,{...options,selected});
  };
  const legend=renderLegend;
  renderLegend=function(){
    legend();
    for(const button of el('face-legend').children){
      button.setAttribute('data-shape-id',state.shape);
      button.setAttribute('data-stable-face-id',button.dataset.face);
    }
  };
  const select=selectFace;
  selectFace=function(id){
    if(!geomathSurfaceFaceIdentity(state.shape,id))return;
    select(id);drawMain();drawViews();
    if(state.learningView==='notes'||panel!=='none'){
      drawNotesOverview();if(learningNotes.ready&&learningNotes.shape===state.shape)learningNotes.calculate();
    }
  };
  for(const renderer of [notesRenderer,notesNetRenderer]){
    let start=null;
    renderer.canvas.addEventListener('pointerdown',event=>{start={id:event.pointerId,x:event.clientX,y:event.clientY};});
    renderer.canvas.addEventListener('pointerup',event=>{
      const previous=start;start=null;
      if(!previous||previous.id!==event.pointerId||Math.hypot(previous.x-event.clientX,previous.y-event.clientY)>6)return;
      const box=renderer.canvas.getBoundingClientRect(),id=renderer.pick(event.clientX-box.left,event.clientY-box.top);
      if(id!==null)selectFace(id);
    });
    renderer.canvas.addEventListener('pointercancel',()=>{start=null;});
  }
  const diagram=drawNoteDiagram;
  drawNoteDiagram=function(shape,result){
    diagram(shape,result);
    for(const part of el('notes-diagram').querySelectorAll('[data-stable-face-id]')){
      const id=Number(part.dataset.stableFaceId),selected=shape===state.shape&&state.selected===id;
      part.setAttribute('stroke',selected?UI_TOKENS.primary:UI_TOKENS.ink||'currentColor');
      part.setAttribute('stroke-width',selected?'4':'1.5');
      part.addEventListener('click',()=>{if(shape===state.shape)selectFace(id);});
    }
  };
  const render=renderContent;
  renderContent=function(){const result=render();refreshPanel();return result;};
  const redraw=redrawSmallModels;
  redrawSmallModels=function(){redraw();if(panel!=='none')drawNotesOverview();};
  const switchView=switchLearningView;
  switchLearningView=function(view,...args){if(view!=='explore'&&panel!=='none')setPanel('none');return switchView(view,...args);};
  const calculator=learningNotes.onCalculator;
  learningNotes.onCalculator=()=>panel==='none'?calculator?.():setPanel('calculator');
  window.addEventListener('message',event=>{
    if(event.source===window.parent&&event.data?.channel==='geodecoder.module.preferences'&&event.data?.type==='settings')labels();
  });
  renderLegend();
  return {setPanel,presets,panelState:()=>({panel,height:size})};
}

export function moduleUxSource(){
  return '\nconst geomathModuleUx=('+installModuleUx.toString()+')();\n';
}

export const moduleUxStyle=`
#model-canvas,#notes-model,#notes-net-model{touch-action:none}
.face-chip[aria-pressed="true"]{outline:3px solid var(--primary);outline-offset:2px;font-weight:700}
.face-chip[aria-pressed="true"]::after{content:'✓';margin-inline-start:.4em}
.lesson-formula,.quick-formula,.math-copy,.math-expression,.calc-formula{line-height:1.65;overflow-wrap:anywhere;max-width:100%}
.worked-example>summary,.note-more>summary,.notes-further>summary,.area-breakdown>summary{padding-block:.65rem;line-height:1.5;cursor:pointer}
.worked-example .example-body li{margin-block:.65rem;line-height:1.65}
#geomath-study-drawer{position:fixed;inset:auto .5rem .5rem;z-index:20;height:var(--geomath-panel-height,48dvh);max-height:calc(100dvh - 1rem);min-height:min(14rem,calc(100dvh - 1rem));display:flex;flex-direction:column;background:var(--surface);color:var(--ink);border:2px solid var(--border-control);border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden}
#geomath-study-drawer[hidden]{display:none!important}
.geomath-panel-header{flex:none;max-height:60%;overflow:auto;display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:.35rem .5rem;padding:.5rem;border-bottom:1px solid var(--border);background:var(--surface)}
.geomath-panel-header h2{font-size:var(--text-small);margin:0;min-width:0}
.geomath-panel-handle{touch-action:none;cursor:ns-resize;font-size:1.5rem}
.geomath-panel-tabs{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:.5rem}
.geomath-panel-tabs button{flex:1 1 auto;max-inline-size:100%;font:inherit}
.geomath-panel-tabs [aria-pressed="true"]{background:var(--primary-fill);color:var(--on-primary-fill);border-color:var(--primary-fill)}
.geomath-panel-size{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;font-size:var(--text-small)}
.geomath-panel-size input{flex:1 1 7rem;min-width:0;width:100%;touch-action:pan-x}
.geomath-study-content{min-height:0;flex:1;overflow:auto;overscroll-behavior:contain;padding:.5rem;scrollbar-gutter:stable}
#geomath-study-drawer #study-panel{margin:0;min-width:0}
#geomath-study-drawer #study-panel[data-study-mode="notes"] .study-layout{display:flex;flex-direction:column}
#geomath-study-drawer #study-panel[data-study-mode="notes"] .notes-overview{display:flex;flex-direction:column}
#geomath-study-drawer #study-panel .study-reading{width:100%}
#geomath-study-drawer #study-panel .calculator-layout{display:flex;flex-direction:column}
#geomath-study-drawer #study-panel .study-reference{display:block}
#geomath-study-drawer #notes-overview-calculate{display:none}
#geomath-study-drawer #study-panel #notes-form{width:100%}
#geomath-study-drawer #study-panel .diagram-panel{width:100%}
#geomath-study-drawer #study-panel :is(.lesson-block,.formula-reference,.mistake-reference,.notes-calculator,.notes-summary){padding:.75rem}
#geomath-study-drawer #study-panel :is(h2,h3){overflow-wrap:anywhere}
@media(min-width:720px){#geomath-study-drawer{left:auto;width:min(32rem,calc(100vw - 1rem))}}
`;
