import {MODEL_DATA,MODEL_ORDER} from './content.mjs';
import {LESSON_DATA,MEASURE_FIELDS,FIELD_LABELS,PI_MODES,UNIT_FACTS,calculateMeasures} from './lessons.mjs';
import {uiNode,uiSvg} from './ui.mjs';
import {UI_TOKENS} from './design-system.mjs';
const noteEl=id=>document.getElementById(id);
const noteNode=uiNode;
// A small positive volume must never appear to be a zero-volume solid.
const noteNumber=n=>n>0&&n<.01?'< 0.01':new Intl.NumberFormat('ms-MY',{maximumFractionDigits:2,useGrouping:false}).format(n);
function noteList(items,ordered=false){const list=noteNode(ordered?'ol':'ul');for(const text of items)list.append(noteNode('li',{},text));return list;}
function noteExample(example,label){
  const card=noteNode('details',{class:'worked-example'}),summary=noteNode('summary',{},'Contoh berpandu · '+label);
  const body=noteNode('div',{class:'example-body'});body.append(noteNode('p',{class:'example-question'},example.question),noteList(example.steps,true),noteNode('p',{class:'example-answer'},'Jawapan: '+example.answer));card.append(summary,body);return card;
}
const noteSvg=uiSvg;
function drawNoteDiagram(shape,result){
  const svg=noteEl('notes-diagram');svg.replaceChildren();
  const line=(x1,y1,x2,y2,color='#215FF0',dash=false)=>svg.append(noteSvg('line',{x1,y1,x2,y2,stroke:color,'stroke-width':1.7,...(dash?{'stroke-dasharray':'5 4'}:{})}));
  const text=(x,y,value,color='#18334B')=>svg.append(noteSvg('text',{x,y,fill:color,'font-size':UI_TOKENS['diagram-label-size'],'font-family':'Segoe UI, Arial, sans-serif','text-anchor':'middle'},value));
  const poly=(points,fill)=>svg.append(noteSvg('polygon',{points:points.map(p=>p.join(',')).join(' '),fill,stroke:'#526A7D','stroke-width':1.3,'stroke-linejoin':'round'}));
  if(!result.valid){text(140,110,'Masukkan ukuran yang sah.','#B9403E');svg.setAttribute('aria-label','Rajah menunggu ukuran yang sah.');return;}
  const d=result.dimensions;
  const pyramidal=['cone','pyramid','tetrahedron'].includes(shape),round=['sphere','hemisphere'].includes(shape);
  svg.setAttribute('aria-label',round?'Keratan melalui pusat '+MODEL_DATA[shape].name.toLowerCase()+' menunjukkan jejari j.':pyramidal?'Keratan rentas menunjukkan tinggi tegak t, tinggi sendeng s dan '+(shape==='cone'?'jejari j.':shape==='tetrahedron'?'apotem tapak u.':'separuh sisi tapak a/2.'):'Rajah ukuran '+MODEL_DATA[shape].name.toLowerCase()+'.');
  if(shape==='cube'||shape==='cuboid'){
    const w=d.a??d.p,h=d.a??d.t,depth=d.a??d.l,k=Math.min(178/(w+.45*depth),145/(h+.35*depth));
    const x=40,y=190,W=w*k,H=h*k,dx=.45*depth*k,dy=-.35*depth*k;
    poly([[x,y],[x+W,y],[x+W,y-H],[x,y-H]],'#64CBB8');poly([[x,y-H],[x+dx,y-H+dy],[x+W+dx,y-H+dy],[x+W,y-H]],'#FFD17D');poly([[x+W,y],[x+W+dx,y+dy],[x+W+dx,y-H+dy],[x+W,y-H]],'#94BDF7');
    line(x,y+12,x+W,y+12);text(x+W/2,y+31,shape==='cube'?'a':'p');text(x-17,y-H/2,shape==='cube'?'a':'t');text(x+W+dx/2+14,y-H+dy/2,shape==='cube'?'a':'l');
  }else if(['triangular-prism','pentagonal-prism','hexagonal-prism'].includes(shape)){
    const n={'triangular-prism':3,'pentagonal-prism':5,'hexagonal-prism':6}[shape],R=d.a/(2*Math.sin(Math.PI/n)),k=Math.min(180/(2*R),132/(d.t+.6*R)),H=d.t*k;
    const angleOf=i=>Math.PI/2+2*Math.PI*i/n;
    const base=Array.from({length:n},(_,i)=>{const angle=angleOf(i);return [140+R*Math.cos(angle)*k,170+.3*R*Math.sin(angle)*k];}),top=base.map(([x,y])=>[x,y-H]);
    poly(base,'#B5E8DF');
    const sides=Array.from({length:n},(_,i)=>({i,z:(Math.sin(angleOf(i))+Math.sin(angleOf(i+1)))/2})).sort((a,b)=>a.z-b.z);
    for(const {i} of sides){const j=(i+1)%n;poly([base[i],base[j],top[j],top[i]],i%2?'#94BDF7':'#64CBB8');}
    poly(top,'#FFD17D');
    const front=sides[sides.length-1].i,A=base[front],B=base[(front+1)%n];line(A[0],A[1]+12,B[0],B[1]+12,'#A66C18');text((A[0]+B[0])/2,(A[1]+B[1])/2+29,'a','#825213');
    const right=base.reduce((best,p)=>p[0]>best[0]?p:best,base[0]);line(right[0]+13,right[1]-H,right[0]+13,right[1]);text(right[0]+27,right[1]-H/2,'t','#215FF0');text(140,22,'Tapak sekata · luas A');
  }else if(shape==='cylinder'){
    const k=Math.min(66/d.j,132/d.t),r=d.j*k,h=d.t*k,x=132,bottom=190,top=bottom-h,ry=Math.max(3,r*.25);
    svg.append(noteSvg('path',{d:`M ${x-r} ${top} L ${x-r} ${bottom} A ${r} ${ry} 0 0 0 ${x+r} ${bottom} L ${x+r} ${top} Z`,fill:'#64CBB8',stroke:'#526A7D','stroke-width':1.3}));
    svg.append(noteSvg('ellipse',{cx:x,cy:top,rx:r,ry,fill:'#94BDF7',stroke:'#526A7D','stroke-width':1.3}));
    line(x,top,x+r,top,'#A66C18');text(x+r/2,top-10,'j','#825213');line(x+r+17,top,x+r+17,bottom);text(x+r+30,(top+bottom)/2,'t','#215FF0');
  }else if(round){
    const x=140,y=shape==='sphere'?125:168,r=72;
    if(shape==='sphere'){
      svg.append(noteSvg('circle',{cx:x,cy:y,r,fill:'#B5E8DF',stroke:'#526A7D','stroke-width':1.5}));
    }else{
      svg.append(noteSvg('path',{d:`M ${x-r} ${y} A ${r} ${r} 0 0 1 ${x+r} ${y} Z`,fill:'#B5E8DF',stroke:'#526A7D','stroke-width':1.5}));
      line(x-r,y,x+r,y,'#526A7D');text(x,y+31,'Tapak bulatan');
    }
    svg.append(noteSvg('circle',{cx:x,cy:y,r:2.8,fill:'#18334B'}));line(x,y,x+r,y,'#A66C18');text(x+r/2,y-12,'j','#825213');text(140,24,'Keratan melalui pusat');
  }else{
    const half=shape==='cone'?d.j:shape==='tetrahedron'?result.apothem:d.a/2,k=Math.min((shape==='tetrahedron'?60:72)/half,145/d.t),w=half*k,h=d.t*k,x=140,y=190,top=y-h,left=shape==='tetrahedron'?2*w:w;
    poly([[x-left,y],[x,top],[x+w,y]],'#B5E8DF');poly([[x,top],[x,y],[x+w,y]],'#64CBB8');
    line(x,top,x,y,'#215FF0',true);line(x,top,x+w,y,'#A34975');text(x-15,(top+y)/2,'t','#215FF0');text(x+w/2+17,(top+y)/2,'s','#A34975');
    const mark=Math.min(8,w/2,h/2);svg.append(noteSvg('path',{d:`M ${x} ${y-mark} h ${mark} v ${mark}`,fill:'none',stroke:'#215FF0','stroke-width':1.3}));
    line(x,y+11,x+w,y+11,'#A66C18');text(x+w/2,y+32,shape==='cone'?'j':shape==='tetrahedron'?'u':'a/2','#825213');
  }
}
export class LearningNotes{
  constructor({onExplore,announce,prefersReduced}){this.onExplore=onExplore;this.announce=announce;this.prefersReduced=prefersReduced;this.ready=false;this.shape=null;this.piMode='22/7';}
  init(){
    if(this.ready)return;this.ready=true;
    for(const field of ['a','p','l','t','j'])noteEl('measure-'+field).addEventListener('input',()=>this.calculate());
    noteEl('notes-form').addEventListener('submit',event=>{event.preventDefault();const r=this.calculate();if(!r.valid){const first=MEASURE_FIELDS[this.shape].find(k=>r.errors[k]);if(first)noteEl('measure-'+first).focus();}});
    noteEl('reset-measures').addEventListener('click',()=>{this.fillDefaults();this.calculate();this.announce('Ukuran contoh dikembalikan.');});
    for(const [id,mode] of [['pi-ratio','22/7'],['pi-decimal','3.142'],['pi-full','full']])noteEl(id).addEventListener('click',()=>{this.piMode=mode;this.calculate();});
    for(const [id,target] of [['jump-concept','note-concept-title'],['jump-net','note-net-title'],['jump-area','note-area-title'],['jump-volume','note-volume-title'],['jump-calculate','note-calculate-title']])noteEl(id).addEventListener('click',()=>{noteEl(target).focus({preventScroll:true});noteEl(target).scrollIntoView({behavior:this.prefersReduced()?'instant':'smooth',block:'start'});});
    for(const [id,mode] of [['note-explore-solid','model'],['note-explore-net','net'],['note-explore-views','views']])noteEl(id).addEventListener('click',()=>{if(mode==='net'&&MODEL_DATA[this.shape].noNet)return;this.onExplore(mode);});
    this.buildTables();
  }
  buildTables(){
    const rows=MODEL_ORDER.map(shape=>{const d=MODEL_DATA[shape],row=noteNode('tr');row.append(noteNode('th',{scope:'row'},d.name),...[(d.flat+' rata'+(d.curved?' + '+d.curved+' melengkung':'')),String(d.edges)+(d.curvedEdges?' melengkung':''),String(d.vertices)].map(x=>noteNode('td',{},x)));return row;});
    noteEl('shape-comparison-body').replaceChildren(...rows);
    noteEl('formula-summary-body').replaceChildren(...MODEL_ORDER.map(shape=>{const row=noteNode('tr');row.append(noteNode('th',{scope:'row'},MODEL_DATA[shape].name),noteNode('td',{class:'math-copy'},LESSON_DATA[shape].surface.formula),noteNode('td',{class:'math-copy'},LESSON_DATA[shape].volume.formula));return row;}));
    noteEl('unit-facts').replaceChildren(...UNIT_FACTS.map(([label,formula])=>{const box=noteNode('div');box.append(noteNode('b',{},label),noteNode('p',{},formula));return box;}));
  }
  fillDefaults(){for(const field of MEASURE_FIELDS[this.shape])noteEl('measure-'+field).value=String(LESSON_DATA[this.shape].defaults[field]);}
  render(shape){
    this.init();if(this.shape===shape)return;this.shape=shape;
    const d=MODEL_DATA[shape],lesson=LESSON_DATA[shape];
    noteEl('study-title').textContent='Nota '+d.name.toLowerCase();noteEl('study-description').textContent=d.noNet?'Kenali permukaannya, bezakan pandangan daripada bentangan, kemudian hubungkan luas permukaan dengan isi padu.':'Kenali bentuknya, fahami bentangannya, kemudian hubungkan luas permukaan dengan isi padu.';
    noteEl('note-classification').textContent=lesson.classification;noteEl('note-everyday').textContent=lesson.everyday;
    noteEl('note-net-list').replaceChildren(noteList(lesson.netParts));noteEl('note-task').textContent=lesson.task;
    noteEl('note-area-formula').textContent=lesson.surface.formula;noteEl('note-area-why').textContent=lesson.surface.why;
    noteEl('note-volume-formula').textContent=lesson.volume.formula;noteEl('note-volume-why').textContent=lesson.volume.why;
    noteEl('area-example').replaceChildren(noteExample(lesson.surface,'luas permukaan'));noteEl('volume-example').replaceChildren(noteExample(lesson.volume,'isi padu'));
    noteEl('quick-area').textContent=lesson.surface.formula;noteEl('quick-volume').textContent=lesson.volume.formula;
    noteEl('symbol-list').replaceChildren(...lesson.symbols.map(([symbol,meaning])=>{const box=noteNode('div');box.append(noteNode('dt',{},symbol),noteNode('dd',{},meaning));return box;}));
    noteEl('mistake-list').replaceChildren(noteList(lesson.mistakes));
    for(const field of ['a','p','l','t','j']){
      const active=MEASURE_FIELDS[shape].includes(field);noteEl('measure-field-'+field).hidden=!active;noteEl('measure-'+field).disabled=!active;
      noteEl('measure-label-'+field).textContent=field==='a'&&shape==='cube'?'a · panjang rusuk':field==='j'&&d.noNet?'j · jejari '+d.name.toLowerCase():FIELD_LABELS[field];noteEl('measure-error-'+field).textContent='';noteEl('measure-'+field).setAttribute('aria-invalid','false');
    }
    noteEl('note-explore-net').disabled=Boolean(d.noNet);noteEl('note-explore-net').setAttribute('aria-describedby','note-net-list');
    noteEl('notes-pi').hidden=!['cylinder','cone','sphere','hemisphere'].includes(shape);noteEl('slant-result').hidden=!['pyramid','cone','tetrahedron'].includes(shape);
    noteEl('diagram-caption').textContent=d.noNet?'Keratan melalui pusat menunjukkan jejari j; rajah ini bukan bentangan.':shape==='tetrahedron'?'Keratan melalui puncak dan pusat tapak: t tegak, s tinggi muka sisi, u jarak pusat tapak ke tengah sisi.':['pyramid','cone'].includes(shape)?'Keratan rentas: t tegak lurus kepada tapak; s mengikut sisi condong.':['triangular-prism','pentagonal-prism','hexagonal-prism'].includes(shape)?'a ialah panjang sisi tapak sekata; t ialah jarak tegak antara dua tapak. A ialah luas satu tapak.':'Rajah ukuran bagi aktiviti ini. Label merujuk kepada nilai dalam kotak ukuran.';
    this.fillDefaults();this.calculate();
  }
  calculate(){
    const values=Object.fromEntries(MEASURE_FIELDS[this.shape].map(k=>[k,noteEl('measure-'+k).value])),r=calculateMeasures(this.shape,values,this.piMode);
    for(const key of MEASURE_FIELDS[this.shape]){noteEl('measure-error-'+key).textContent=r.errors[key]||'';noteEl('measure-'+key).setAttribute('aria-invalid',String(Boolean(r.errors[key])));}
    for(const [id,mode] of [['pi-ratio','22/7'],['pi-decimal','3.142'],['pi-full','full']])noteEl(id).setAttribute('aria-pressed',String(this.piMode===mode));
    noteEl('notes-pi-description').textContent=this.piMode==='full'?'Gunakan π; jawapan perpuluhan dipaparkan hingga 2 tempat perpuluhan.':'Untuk aktiviti ini, ambil π ≈ '+this.piMode+'.';
    noteEl('calculated-area').textContent=r.valid?noteNumber(r.area)+' cm²':'—';noteEl('calculated-volume').textContent=r.valid?noteNumber(r.volume)+' cm³':'—';
    noteEl('calculated-slant').textContent=r.valid&&r.slant!==null?'s ≈ '+noteNumber(r.slant)+' cm'+(this.shape==='tetrahedron'?' · u ≈ '+noteNumber(r.apothem)+' cm':''):'';
    noteEl('calculation-status').textContent=r.valid?'Nilai penuh digunakan dalam pengiraan; paparan dibundar hingga 2 tempat perpuluhan.'+(r.perimeter!==null?' Tapak sekata: A ≈ '+noteNumber(r.baseArea)+' cm²; P = '+noteNumber(r.perimeter)+' cm.':'')+(r.volume<.01?' Isi padu positif yang sangat kecil dipaparkan sebagai < 0.01 cm³.':''):'Betulkan ukuran yang ditandakan untuk melihat jawapan.';
    noteEl('area-breakdown').replaceChildren(...r.areaParts.map(part=>noteNode('li',{},part.label+': '+noteNumber(part.value)+' cm²')));
    drawNoteDiagram(this.shape,r);return r;
  }
}
