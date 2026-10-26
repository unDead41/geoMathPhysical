import {STUDIO_SHAPES,studioAdjacency,defaultStudioTree,netStudioState,studioNetMesh,studioFields,studioDimensionDefaults,cubeStudioExamples} from './net-studio-geometry.mjs';

function nsNode(tag,attrs={},text=''){
 const node=document.createElement(tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text)node.textContent=text;return node;
}
/** Constrained edge editing keeps every face dimension and real adjacency. */
export class NetStudio{
 constructor({mount,onChange=()=>{}}){
  this.mount=mount;this.onChange=onChange;this.shape='triangular-prism';this.parents=defaultStudioTree(this.shape);this.inside=this.parents.map(()=>false);this.dimensions=studioDimensionDefaults(this.shape);this.dirty=true;this.controls=[];this.openFace=1;
  const heading=nsNode('p',{class:'eyebrow'},'STUDIO SAMBUNGAN MUKA'),intro=nsNode('p',{},'Pilih tempat setiap muka disambungkan. Muka 1 menjadi asas. Pilihan hanya menggunakan pasangan rusuk sebenar, supaya saiz muka kekal tepat.');
  this.shapeSelect=nsNode('select',{id:'studio-shape','aria-label':'Bongkah dalam studio sambungan'});
  this.shapeSelect.append(...STUDIO_SHAPES.map(s=>nsNode('option',{value:s.key},s.name)));this.shapeSelect.value=this.shape;
  const shapeLabel=nsNode('label',{for:'studio-shape'},'Bongkah');const field=nsNode('div',{class:'lab-field'});field.append(shapeLabel,this.shapeSelect);
  this.measureFields=nsNode('div',{class:'lab-dimensions'});this.measureControls={};
  for(const [key,name] of [['a','a · sisi tapak / rusuk'],['p','p · panjang'],['l','l · lebar'],['t','t · tinggi tegak']]){const label=nsNode('label',{for:'studio-'+key},name),output=nsNode('output'),input=nsNode('input',{id:'studio-'+key,type:'range',min:'.5',max:'4',step:'.5'});label.append(output,input);input.addEventListener('input',()=>{if(this.locked)return;const value=Number(input.value);this.dimensions[key]=value;this.changed();});this.measureControls[key]={label,output,input};this.measureFields.append(label);}
  this.exampleField=nsNode('div',{class:'lab-field'});this.exampleSelect=nsNode('select',{id:'studio-example','aria-label':'Contoh sebelas bentangan kubus'});this.exampleSelect.append(nsNode('option',{value:'custom'},'Susunan sendiri'),...Array.from({length:11},(_,i)=>nsNode('option',{value:i},'Bentangan kubus '+(i+1)+' daripada 11')));this.exampleField.append(nsNode('label',{for:'studio-example'},'11 bentangan kubus yang berbeza'),this.exampleSelect);this.exampleSelect.addEventListener('change',()=>{if(this.locked||this.exampleSelect.value==='custom')return;this.parents=cubeStudioExamples()[Number(this.exampleSelect.value)];this.inside=this.parents.map(()=>false);this.changed();});
  this.connections=nsNode('div',{class:'studio-connections'});this.feedback=nsNode('p',{class:'lab-feedback',role:'status'});this.lockNote=nsNode('p',{class:'lab-note'});
  this.reset=nsNode('button',{type:'button',class:'button'},'Kembali ke contoh sah');
  this.shapeSelect.addEventListener('change',()=>{if(this.locked)return;this.shape=this.shapeSelect.value;this.parents=defaultStudioTree(this.shape);this.inside=this.parents.map(()=>false);this.dimensions=studioDimensionDefaults(this.shape);this.changed();});
  this.reset.addEventListener('click',()=>{if(this.locked)return;this.parents=defaultStudioTree(this.shape);this.inside=this.parents.map(()=>false);this.changed();});
  mount.append(heading,intro,field,nsNode('p',{class:'lab-note'},'Ukuran menggunakan unit model. Pada skala cetak 1 unit = 1 cm, nilainya menjadi ukuran dalam cm.'),this.measureFields,this.exampleField,this.connections,this.reset,this.lockNote,this.feedback);this.render();
 }
 get state(){return netStudioState(this.shape,this.parents,this.dimensions,this.inside);}
 get valid(){return this.state.valid;}
 get name(){return this.state.name;}
 mesh(fold=0){return studioNetMesh(this.shape,this.parents,fold,this.dimensions,this.inside);}
 getPrintInfo(){return {mesh:this.mesh(0),title:this.name+' · susunan sendiri',valid:this.valid,curved:false};}
 changed(){this.dirty=true;this.onChange();this.render();}
 render({progress=0,busy=false}={}){
  const state=this.state,adjacency=studioAdjacency(this.shape,this.dimensions),locked=busy||progress>1e-9;this.locked=locked;
  if(this.dirty){
   this.controls=[];this.sideControls={};
   this.connections.replaceChildren(...adjacency.slice(1).map(face=>{
    const row=nsNode('details',{class:'studio-connection',name:'studio-face'}),summary=nsNode('summary',{},'Muka '+(face.id+1)+' · '+face.name+' → muka '+(this.parents[face.id]+1)),label=nsNode('label',{for:'studio-parent-'+face.id},'Muka induk'),select=nsNode('select',{id:'studio-parent-'+face.id,'aria-label':'Sambungkan muka '+(face.id+1)+' kepada'});row.open=face.id===this.openFace;row.append(summary);row.addEventListener('toggle',()=>{if(row.open)this.openFace=face.id;});
    for(const parent of face.neighbors){const next=[...this.parents];next[face.id]=parent;if(netStudioState(this.shape,next,this.dimensions).treeValid)select.append(nsNode('option',{value:parent},'Sambung ke muka '+(parent+1)+' · '+adjacency[parent].name));}
    select.value=String(this.parents[face.id]);select.addEventListener('change',()=>{if(this.locked)return;this.parents[face.id]=Number(select.value);this.focusFace=face.id;this.openFace=face.id;this.focusSide=false;this.dirty=true;this.onChange();this.render();});const side=nsNode('select',{id:'studio-side-'+face.id,'aria-label':'Sisi bukaan muka '+(face.id+1)});side.append(nsNode('option',{value:'outside'},'Buka di luar muka induk'),nsNode('option',{value:'inside'},'Buka ke arah bertentangan'));side.value=this.inside[face.id]?'inside':'outside';side.addEventListener('change',()=>{if(this.locked)return;this.inside[face.id]=side.value==='inside';this.focusFace=face.id;this.openFace=face.id;this.focusSide=true;this.dirty=true;this.onChange();this.render();});row.append(label,select,nsNode('label',{for:'studio-side-'+face.id},'Sisi bukaan'),side);this.sideControls[face.id]=side;this.controls.push(select);return row;
   }));if(this.focusFace){(this.focusSide?this.sideControls[this.focusFace]:this.controls[this.focusFace-1])?.focus({preventScroll:true});this.focusFace=null;}this.dirty=false;
  }
  for(const [key,control] of Object.entries(this.measureControls)){const active=studioFields(this.shape).includes(key);control.label.hidden=!active;control.input.disabled=locked||!active;control.input.value=String(this.dimensions[key]||1);control.output.textContent=(this.dimensions[key]||1)+' unit';}
  this.exampleField.hidden=this.shape!=='cube';this.exampleSelect.disabled=locked;
  if(this.shape==='cube'){const example=this.inside.some(Boolean)?-1:cubeStudioExamples().findIndex(p=>JSON.stringify(p)===JSON.stringify(this.parents));this.exampleSelect.value=example<0?'custom':String(example);}
  this.shapeSelect.disabled=locked;this.reset.disabled=locked;for(const select of [...this.controls,...Object.values(this.sideControls||{})])select.disabled=locked;
  this.lockNote.textContent=locked?'Tekan Buka rata sebelum mengubah sambungan.':'Pilih muka induk dan sisi bukaan. Jika bertindih, ubah muka yang disorot merah atau pilih sisi bukaan yang lain.';
  this.feedback.textContent=state.message;this.feedback.dataset.success=state.valid?'true':'false';
 }
}
