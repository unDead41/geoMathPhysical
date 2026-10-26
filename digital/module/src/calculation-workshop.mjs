import {uiNode,uiSvg} from './ui.mjs';
import {learningMesh} from './learning-mesh.mjs';
import {workshopMesh} from './surface-workshop.mjs';
import {compositionMesh} from './lab-geometry.mjs';
import {readDimension} from './lessons.mjs';
import {calculationShapeNames,calculationUnitOptions,calculationContextOptions,calculationFields,calculationDefaults,calculationProblem,calculationCheckStep,calculationFeedback,calculationHint,calculationSolution,calculationFormat} from './calculation-steps.mjs';

const calcSteps=['formula','substitution','calculation','unit'];
const calcCopy={
 title:['Semakan langkah pengiraan','Check calculation steps'],eyebrow:['BENGKEL PENGIRAAN · 6.3 / 6.4','CALCULATION WORKSHOP · 6.3 / 6.4'],
 intro:['Bina penyelesaian sendiri. Semak satu langkah pada satu masa, baca petunjuk dan baiki jawapan. Tiada markah disimpan.','Build your own solution. Check one step at a time, read a hint and improve your answer. No score is saved.'],
 setup:['Tetapkan soalan','Set the problem'],shape:['Bentuk','Solid'],quantity:['Cari','Find'],surface:['Luas permukaan','Surface area'],volume:['Isi padu','Volume'],context:['Keadaan permukaan','Surface context'],closed:['Bentuk tertutup','Closed solid'],open:['Bekas terbuka di atas','Open-top vessel'],'cube-pyramid':['Kubus + piramid','Cube + pyramid'],'cylinder-cone':['Silinder + kon','Cylinder + cone'],
 given:['Ukuran bulatan diberi','Given circular measure'],radius:['Jejari','Radius'],diameter:['Diameter','Diameter'],pi:['Nilai π','Value of π'],piRatio:['π ≈ 22/7','π ≈ 22/7'],piDecimal:['π ≈ 3.142','π ≈ 3.142'],piFull:['Nilai π penuh','Full value of π'],target:['Unit jawapan diminta','Requested answer unit'],dimensions:['Ukuran diberi (cm)','Given dimensions (cm)'],
 dimensionHelp:['Masukkan 0.1–1000 cm. Koma atau titik perpuluhan diterima. Ukuran ini mengubah soalan dan rajah bengkel sahaja.','Enter 0.1–1000 cm. Decimal commas and points are accepted. These dimensions change this workshop’s question and diagram.'],
 diameterHelp:['Diameter d = 2j; masukkan 0.2–2000 cm. Nilai jejari yang digunakan ialah d ÷ 2.','Diameter d = 2r; enter 0.2–2000 cm. The radius used is d ÷ 2.'],
 question:['Soalan kendiri','Independent problem'],questionHelp:['Gunakan ukuran di atas. Tulis rumus, gantikan nilai, hitung dalam unit cm, kemudian tukar kepada unit diminta.','Use the dimensions above. Write the formula, substitute values, calculate in centimetre units, then convert to the requested unit.'],
 formula:['Rumus','Formula'],substitution:['Gantian nilai','Substitution'],calculation:['Pengiraan','Calculation'],unit:['Unit dan penukaran','Unit and conversion'],
 formulaPrompt:['Tulis rumus menggunakan simbol ukuran.','Write the formula using dimension symbols.'],substitutionPrompt:['Gantikan ukuran dengan nombor; tunjukkan operasi.','Replace dimensions with numbers; show the operations.'],calculationPrompt:['Hitung nilai dalam unit asas yang dinyatakan.','Calculate the value in the stated base unit.'],unitPrompt:['Tulis nombor akhir dan pilih unit yang diminta.','Write the final number and select the requested unit.'],
 syntax:['Sintaks: × atau *, ÷ atau /, ^2, ^3, pi, sqrt(...), dan kurungan. j = r, t = h, l = w; l sentiasa lebar dan s sentiasa tinggi sendeng.','Syntax: × or *, ÷ or /, ^2, ^3, pi, sqrt(...), and brackets. j = r, t = h, l = w; l always means width and s always means slant height.'],
 rounding:['Bundarkan pada akhir sahaja: 2 tempat perpuluhan. Jika nilainya kurang daripada 0.01, gunakan 3 angka bererti supaya nilai positif tidak menjadi sifar.','Round only at the end: 2 decimal places. For values below 0.01, use 3 significant figures so a positive quantity does not become zero.'],
 check:['Semak langkah','Check step'],hint:['Petunjuk','Hint'],unchecked:['Belum disemak.','Not checked yet.'],locked:['Semak langkah sebelumnya dahulu.','Check the preceding step first.'],hintReady:['Baca petunjuk sebelum melihat penyelesaian.','Read a hint before viewing the solution.'],
 retry:['Cuba semula','Try again'],reveal:['Lihat penyelesaian','View solution'],example:['Contoh berpandu','Guided example'],newProblem:['Soalan kendiri baharu','New independent problem'],notes:['Buka nota bentuk ini','Open notes for this solid'],
 solution:['Penyelesaian soalan semasa','Solution to the current problem'],exampleTitle:['Contoh berpandu · ukuran contoh','Guided example · example dimensions'],exampleScope:['Contoh lengkap untuk bentuk dan keadaan yang dipilih. Tekan Soalan kendiri baharu untuk mencuba dengan ruang jawapan kosong.','A complete example for the selected solid and context. Choose New independent problem to try with empty answer fields.'],
 exampleMode:['Contoh dibuka. Ruang jawapan kendiri anda dikekalkan.','Example opened. Your independent answer fields are preserved.'],newReady:['Soalan baharu sedia. Semua ruang jawapan kosong.','New problem ready. All answer fields are empty.'],retryReady:['Cuba lagi dengan ukuran yang sama. Ruang jawapan dikosongkan.','Try again with the same dimensions. Answer fields are empty.'],changed:['Ukuran atau soalan berubah. Semak langkah anda semula.','The dimensions or question changed. Check your steps again.'],invalid:['Betulkan ukuran yang ditandakan sebelum menyemak.','Correct the marked dimensions before checking.'],dimensionError:['Masukkan ukuran sah dari 0.1 hingga 1000 cm.','Enter a valid dimension from 0.1 to 1000 cm.'],diameterError:['Masukkan diameter sah dari 0.2 hingga 2000 cm.','Enter a valid diameter from 0.2 to 2000 cm.'],
 diagram:['Rajah bagi ukuran soalan. Label ukuran disenaraikan di bawah rajah.','Diagram for the problem dimensions. Dimension labels are listed below.'],noNet:['Rajah permukaan melengkung; ini bukan bentangan rata.','Curved surface diagram; this is not a flat net.'],invalidDiagram:['Rajah menunggu ukuran sah.','The diagram is waiting for valid dimensions.'],
 openNote:['Bekas nipis tanpa penutup atas: luas bahan = dinding + satu tapak bawah. Kapasiti tidak berubah.','Thin vessel without a top lid: material area = walls + one bottom base. Capacity is unchanged.'],
 contactNote:['Tapak sepadan bercantum sepenuhnya. Kedua-dua muka sentuhan menjadi dalaman dan tidak dikira dalam luas luar. Isi padu kedua-dua bongkah ditambah.','Matching bases are fully joined. Both contact faces become internal and are excluded from external area. Add the two solids’ volumes.'],
 closedNote:['Kira semua permukaan bentuk tertutup. Prisma dan piramid di sini ialah bentuk tegak dengan tapak sekata.','Count every surface of the closed solid. The prisms and pyramids here are right solids with regular bases.'],
 volumeNote:['Isi padu mengukur ruang di dalam bongkah. Gunakan rumus isi padu bentuk ini dan nyatakan jawapan dalam unit padu atau kapasiti yang diminta.','Volume measures the space inside the solid. Use its volume formula and the requested cubic or capacity unit.'],
 compositeVolumeNote:['Jumlahkan isi padu kedua-dua bongkah yang bercantum. Tapak sentuhan tidak menambah atau menolak isi padu.','Add the volumes of the two joined solids. The contact bases do not add or subtract volume.'],
 chooseUnit:['Pilih unit','Choose a unit'],finalNumber:['Nombor jawapan akhir','Final answer number'],answerUnit:['Unit jawapan anda','Your answer unit'],complete:['Keempat-empat langkah tepat. Terangkan sebab memilih rumus dan unit tersebut.','All four steps are correct. Explain why you chose that formula and unit.'],
 aCube:['a · panjang rusuk','a · edge length'],a:['a · sisi tapak sekata','a · regular base side'],p:['p · panjang','p · length'],l:['l · lebar (w)','l · width (w)'],t:['t · tinggi tegak (h)','t · perpendicular height (h)'],tRoof:['t · tinggi tegak piramid','t · pyramid perpendicular height'],tCone:['t · tinggi tegak kon','t · cone perpendicular height'],j:['j · jejari (r)','j · radius (r)'],d:['d · diameter','d · diameter'],c:['c · tinggi silinder','c · cylinder height'],
 slant:['s · tinggi sendeng','s · slant height'],baseArea:['A · luas satu tapak','A · area of one base'],perimeter:['P · perimeter satu tapak','P · perimeter of one base'],scope:['Bengkel ini menyemak langkah pengiraan, bukan empat rekod refleksi aktiviti makmal.','This workshop checks calculation steps; it does not add to the four lab reflection records.']
};
function calcText(key,language){return (calcCopy[key]||[key,key])[language==='en'?1:0];}
function calcPretty(expression){return String(expression).replace(/sqrt/g,'√').replace(/pi/g,'π').replace(/\*/g,' × ').replace(/\^2/g,'²').replace(/\^3/g,'³');}
function calcDimensionText(key,shape,context,given,language){return calcText(key==='j'&&given==='diameter'?'d':key==='a'&&shape==='cube'?'aCube':key==='t'&&context==='cube-pyramid'?'tRoof':key==='t'&&context==='cylinder-cone'?'tCone':key,language);}
function calcDraft(shape){return {shape,quantity:'surface',context:'closed',given:'radius',piMode:'22/7',targetUnit:'cm²',dimensions:Object.fromEntries(Object.entries(calculationDefaults(shape)).map(([key,value])=>[key,String(value)])),answers:{formula:'',substitution:'',calculation:'',unit:'',unitValue:''},checks:{},hints:new Set(),revealed:false,example:false};}
function calcMeshFor(problem){
 if(problem.context==='open')return workshopMesh('container',problem.dimensions,{shape:problem.shape,closed:false});
 if(problem.context==='cube-pyramid'||problem.context==='cylinder-cone')return compositionMesh(problem.context==='cube-pyramid'?'roof':'rocket',problem.context==='cylinder-cone'?{...problem.dimensions,h:problem.dimensions.c}:problem.dimensions,1);
 return learningMesh(problem.shape,0,64,problem.dimensions);
}
function calcDrawDiagram(svg,problem,language){
 svg.replaceChildren();svg.setAttribute('aria-label',calcText(problem.valid?'diagram':'invalidDiagram',language));if(!problem.valid)return;
 const faces=calcMeshFor(problem),project=point=>[.8*point[0]-.6*point[2],-.9*point[1]+.25*point[0]+.3*point[2]],all=faces.flatMap(face=>face.vertices.map(project));
 const xs=all.map(point=>point[0]),ys=all.map(point=>point[1]),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top,scale=Math.min(250/(width||1),200/(height||1));
 const projected=faces.map(face=>({face,depth:face.vertices.reduce((sum,p)=>sum+p[0]*.6+p[1]*.35+p[2]*.8,0)/face.vertices.length})).sort((a,b)=>a.depth-b.depth);
 for(const {face} of projected){const points=face.vertices.map(point=>{const p=project(point);return [160+(p[0]-left-width/2)*scale,120+(p[1]-top-height/2)*scale].join(',');}).join(' ');svg.append(uiSvg('polygon',{points,fill:face.color||'var(--volume-a)',stroke:face.outline?'var(--muted)':'none','stroke-width':.75,'stroke-linejoin':'round'}));}
}

export class CalculationWorkshop{
 constructor({root,announce=()=>{},prefersReduced=()=>true,getLanguage=()=> 'ms',onDescribe=()=>{},onNotes=()=>{}}={}){Object.assign(this,{root,announce,prefersReduced,getLanguage,onDescribe,onNotes});this.ready=false;this.active=false;this.nodes={};this.bindings=[];this.draft=null;this.problem=null;this.problemIndex=0;this.statusKey='';}
 text(key){return calcText(key,this.language());}
 language(){return this.getLanguage()==='en'?'en':'ms';}
 init(){
  if(this.ready)return;this.ready=true;this.root=this.root||document.getElementById('calculation-panel');if(!this.root)return;
  this.root.setAttribute('data-module-native-language','true');this.root.setAttribute('class','calculation-workshop');
  const make=(tag,id,attrs={},key)=>{const node=uiNode(tag,{...attrs,...(id?{id}:{} )});if(id)this.nodes[id]=node;if(key)this.bindings.push({node,key});return node;};
  const header=make('div',null,{class:'calc-header'}),intro=make('div');intro.append(make('p',null,{class:'eyebrow'},'eyebrow'),make('h2','calculation-title',{tabindex:'-1'},'title'),make('p',null,{class:'body-copy'},'intro'));header.append(intro);this.root.append(header);
  const layout=make('div',null,{class:'calc-layout'}),setup=make('section',null,{class:'calc-setup','aria-labelledby':'calculation-setup-title'}),main=make('div',null,{class:'calc-main'});setup.append(make('h3','calculation-setup-title',{},'setup'));
  const select=(key,labelKey,options)=>{const wrap=make('div','calculation-field-'+key,{class:'lab-field'}),label=make('label',null,{for:'calculation-'+key},labelKey),input=make('select','calculation-'+key);for(const [value,key] of options){const option=make('option',null,{value},key);input.append(option);}wrap.append(label,input);setup.append(wrap);return input;};
  const shapes=select('shape','shape',[]);for(const [key,names] of Object.entries(calculationShapeNames)){const option=make('option',null,{value:key});option.textContent=names[0];shapes.append(option);}
  shapes.addEventListener('change',()=>this.setShape(shapes.value));
  select('quantity','quantity',[['surface','surface'],['volume','volume']]).addEventListener('change',()=>{this.draft.quantity=this.nodes['calculation-quantity'].value;this.draft.targetUnit=this.draft.quantity==='volume'?'cm³':'cm²';this.clearAnswers();this.update(true);});
  select('context','context',[]).addEventListener('change',()=>{this.draft.context=this.nodes['calculation-context'].value;this.draft.dimensions=Object.fromEntries(Object.entries(calculationDefaults(this.draft.shape,this.draft.context)).map(([key,value])=>[key,String(value)]));this.invalidate();this.update(true);});
  select('given','given',[['radius','radius'],['diameter','diameter']]).addEventListener('change',()=>{this.draft.given=this.nodes['calculation-given'].value;this.invalidate();this.update(true);});
  select('pi','pi',[['22/7','piRatio'],['3.142','piDecimal'],['full','piFull']]).addEventListener('change',()=>{this.draft.piMode=this.nodes['calculation-pi'].value;this.invalidate();this.update();});
  select('target-unit','target',[]).addEventListener('change',()=>{this.draft.targetUnit=this.nodes['calculation-target-unit'].value;this.invalidate();this.update();});
  const dimensions=make('fieldset',null,{class:'calc-dimensions'});dimensions.append(make('legend',null,{},'dimensions'));
  for(const key of ['a','p','l','t','j','c']){
   const wrap=make('div','calculation-field-'+key,{class:'calc-dimension-field'}),label=make('label','calculation-label-'+key,{for:'calculation-dimension-'+key}),row=make('div',null,{class:'measure-input'}),input=make('input','calculation-dimension-'+key,{type:'text',inputmode:'decimal',autocomplete:'off',maxlength:'24','aria-describedby':'calculation-error-'+key}),error=make('span','calculation-error-'+key,{class:'field-error'});
   input.addEventListener('input',()=>{const raw=input.value,n=readDimension(raw);this.draft.dimensions[key]=key==='j'&&this.draft.given==='diameter'?(Number.isFinite(n)?String(n/2):raw):raw;this.invalidate();this.update();});row.append(input,uiNode('span',{},'cm'));wrap.append(label,row,error);dimensions.append(wrap);
  }setup.append(dimensions,make('p','calculation-dimension-help',{class:'body-copy'},'dimensionHelp'));
  const noteButton=make('button','calculation-notes',{type:'button',class:'button'},'notes');noteButton.addEventListener('click',()=>this.onNotes(this.draft.shape));setup.append(noteButton);
  const question=make('section',null,{class:'calc-question','aria-labelledby':'calculation-question-title'});question.append(make('h3','calculation-question-title',{},'question'),make('p','calculation-question'),make('p','calculation-context-note',{class:'body-copy'}));
  const figure=make('figure',null,{class:'calc-figure'}),diagram=uiSvg('svg',{id:'calculation-diagram',viewBox:'0 0 320 240',role:'img'});this.nodes['calculation-diagram']=diagram;figure.append(diagram,make('figcaption','calculation-diagram-caption',{class:'body-copy'}));question.append(figure,make('dl','calculation-symbols',{class:'calc-symbols'}));main.append(question);
  const guidance=make('div',null,{class:'calc-guidance'});guidance.append(make('p',null,{class:'body-copy'},'questionHelp'),make('p','calculation-syntax',{class:'body-copy'},'syntax'),make('p',null,{class:'body-copy'},'rounding'));main.append(guidance);
  const steps=make('div',null,{class:'calc-steps'});
  for(const [index,step] of calcSteps.entries()){
   const card=make('section','calculation-card-'+step,{class:'calc-step','aria-labelledby':'calculation-label-'+step}),title=make('h3','calculation-label-'+step),prompt=make('label','calculation-prompt-'+step,{for:step==='unit'?'calculation-unit-value':'calculation-'+step});card.append(title,prompt);
   const input=make('input',step==='unit'?'calculation-unit-value':'calculation-'+step,{type:'text',autocomplete:'off',spellcheck:'false',maxlength:'480','aria-describedby':'calculation-feedback-'+step,...(step==='unit'?{inputmode:'decimal'}:{})});input.addEventListener('input',()=>{this.draft.answers[step==='unit'?'unitValue':step]=input.value;this.invalidateFrom(index);this.updateSteps();});input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();this.check(step);}});
   const row=make('div',null,{class:step==='unit'?'calc-unit-row':'calc-answer-row'});row.append(input);if(step==='unit'){const unit=make('select','calculation-unit',{'aria-label':this.text('answerUnit')});unit.append(make('option',null,{value:''},'chooseUnit'));for(const value of [...calculationUnitOptions.surface,...calculationUnitOptions.volume])unit.append(uiNode('option',{value},value));unit.addEventListener('change',()=>{this.draft.answers.unit=unit.value;this.invalidateFrom(index);this.updateSteps();});row.append(unit);}card.append(row);
   const actions=make('div',null,{class:'lab-actions'}),check=make('button','calculation-check-'+step,{type:'button',class:'button primary'},'check'),hint=make('button','calculation-hint-'+step,{type:'button',class:'button'},'hint');check.addEventListener('click',()=>this.check(step));hint.addEventListener('click',()=>this.hint(step));actions.append(check,hint);card.append(actions,make('p','calculation-feedback-'+step,{class:'lab-feedback',role:'status'}),make('p','calculation-hint-copy-'+step,{class:'calc-hint',hidden:'hidden'}));steps.append(card);
  }main.append(steps);
  const actions=make('div',null,{class:'calc-actions lab-actions'});for(const [key,handler] of [['retry',()=>{this.clearAnswers();this.statusKey='retryReady';this.update(true);this.nodes['calculation-formula'].focus();}],['reveal',()=>this.reveal()],['example',()=>this.showExample()],['new-problem',()=>this.newProblem()]]){const node=make('button','calculation-'+key,{type:'button',class:key==='new-problem'?'button primary':'button'},key==='new-problem'?'newProblem':key);node.addEventListener('click',handler);actions.append(node);}
  main.append(actions,make('p','calculation-reveal-guidance',{class:'body-copy'},'hintReady'),make('p','calculation-workshop-status',{class:'calculation-status',role:'status'}),make('section','calculation-solution',{class:'calc-solution',hidden:'hidden'}),make('section','calculation-example-panel',{class:'calc-solution',hidden:'hidden'}));layout.append(setup,main);this.root.append(layout,make('p',null,{class:'body-copy calc-scope'},'scope'));
 }
 open(shape,context){
  this.init();if(!this.root)return;const chosen=Object.hasOwn(calculationShapeNames,shape)?shape:this.draft?.shape||'cube';
  if(!this.draft||this.draft.shape!==chosen)this.draft=calcDraft(chosen);
  if(context?.dimensions||context?.piMode){
   const same=this.draft.context==='closed'&&(!context.piMode||context.piMode===this.draft.piMode)&&(!context.dimensions||calculationFields(chosen).every(key=>readDimension(context.dimensions[key])===readDimension(this.draft.dimensions[key])));
   if(!same){this.draft.context='closed';if(context.dimensions)this.draft.dimensions=Object.fromEntries(calculationFields(chosen).map(key=>[key,String(context.dimensions[key]??'')]));if(['22/7','3.142','full'].includes(context.piMode))this.draft.piMode=context.piMode;this.invalidate();}
  }
  this.active=true;this.root.hidden=false;this.update(true);
 }
 close(){this.active=false;if(this.root)this.root.hidden=true;}
 refreshLanguage(){if(this.ready&&this.draft)this.update();}
 resetContext(){if(!this.draft)return;this.clearAnswers();this.statusKey='';if(this.ready)this.update(true);}
 setShape(shape){if(!Object.hasOwn(calculationShapeNames,shape))return;this.draft=calcDraft(shape);this.statusKey='';this.update(true);}
 invalidate(){this.draft.checks={};this.draft.hints.clear();this.draft.revealed=false;this.draft.example=false;this.statusKey='changed';}
 invalidateFrom(index){for(let i=index;i<calcSteps.length;i++)delete this.draft.checks[calcSteps[i]];this.draft.revealed=false;}
 clearAnswers(){this.draft.answers={formula:'',substitution:'',calculation:'',unit:'',unitValue:''};this.draft.checks={};this.draft.hints.clear();this.draft.revealed=false;this.draft.example=false;}
 update(fillFields=false){
  if(!this.ready||!this.draft||!this.root)return;const d=this.draft,n=this.nodes,language=this.language();for(const binding of this.bindings)binding.node.textContent=this.text(binding.key);
  for(const option of n['calculation-shape'].children)option.textContent=calculationShapeNames[option.getAttribute('value')]?.[language==='en'?1:0]||'';
  n['calculation-context'].replaceChildren(...calculationContextOptions(d.shape).map(value=>uiNode('option',{value},this.text(value))));
  n['calculation-target-unit'].replaceChildren(...calculationUnitOptions[d.quantity].map(value=>uiNode('option',{value},value)));
  for(const [key,value] of [['shape',d.shape],['quantity',d.quantity],['context',d.context],['given',d.given],['pi',d.piMode],['target-unit',d.targetUnit]])n['calculation-'+key].value=value;
  const round=['cylinder','cone','sphere','hemisphere'].includes(d.shape);n['calculation-field-given'].hidden=!round;n['calculation-field-pi'].hidden=!round;
  this.problem=calculationProblem({...d});const p=this.problem,fields=calculationFields(d.shape,d.context);
  for(const key of ['a','p','l','t','j','c']){
   const active=fields.includes(key),input=n['calculation-dimension-'+key],error=active&&p.errors[key],diameter=key==='j'&&d.given==='diameter';n['calculation-field-'+key].hidden=!active;input.disabled=!active;n['calculation-label-'+key].textContent=calcDimensionText(key,d.shape,d.context,d.given,language);
   if(fillFields){const value=d.dimensions[key]??'';input.value=diameter&&Number.isFinite(readDimension(value))?String(2*readDimension(value)):String(value);}
   input.setAttribute('aria-invalid',String(Boolean(error)));n['calculation-error-'+key].textContent=error?this.text(diameter?'diameterError':'dimensionError'):'';
  }
  n['calculation-dimension-help'].textContent=this.text(d.given==='diameter'&&round?'diameterHelp':'dimensionHelp');
  n['calculation-context-note'].textContent=this.text(d.quantity==='volume'?(['cube-pyramid','cylinder-cone'].includes(d.context)?'compositeVolumeNote':'volumeNote'):d.context==='open'?'openNote':d.context==='closed'?'closedNote':'contactNote');
  n['calculation-question'].textContent=this.questionText(p);n['calculation-diagram-caption'].textContent=this.text(['sphere','hemisphere'].includes(d.shape)?'noNet':'diagram');calcDrawDiagram(n['calculation-diagram'],p,language);this.renderSymbols(p);
  n['calculation-unit'].setAttribute('aria-label',this.text('answerUnit'));
  if(fillFields){for(const step of calcSteps.slice(0,3))n['calculation-'+step].value=d.answers[step];n['calculation-unit-value'].value=d.answers.unitValue;n['calculation-unit'].value=d.answers.unit;}
  this.updateSteps();this.renderSolutions();if(this.active)this.onDescribe(this.text('title')+'. '+this.questionText(p)+' '+n['calculation-context-note'].textContent);
 }
 questionText(problem){
  if(!problem.valid)return this.text('invalid');const en=this.language()==='en',shape=calculationShapeNames[problem.shape][en?1:0],context=problem.context==='closed'?shape:this.text(problem.context);
  const dimensions=problem.fields.map(key=>{const diameter=key==='j'&&problem.given==='diameter';return (diameter?'d':key)+' = '+String(problem.dimensions[key]*(diameter?2:1))+' cm';}).join(', ');
  return (en?'Find the ':'Cari ')+this.text(problem.quantity).toLowerCase()+(en?' of ':' bagi ')+context.toLowerCase()+': '+dimensions+'. '+(en?'Give the answer in ':'Berikan jawapan dalam ')+problem.targetUnit+'.'+(problem.dimensions.j!==undefined?' π '+(problem.piMode==='full'?(en?'uses its full value.':'menggunakan nilai penuh.'):'≈ '+problem.piMode+'.'):'');
 }
 renderSymbols(problem){
  const list=this.nodes['calculation-symbols'];list.replaceChildren();if(!problem.valid)return;const append=(symbol,text)=>{const row=uiNode('div');row.append(uiNode('dt',{},symbol),uiNode('dd',{},text));list.append(row);};
  for(const key of problem.fields){const diameter=key==='j'&&problem.given==='diameter';append(calcDimensionText(key,problem.shape,problem.context,problem.given,this.language()),String(problem.dimensions[key]*(diameter?2:1))+' cm');}
  if(problem.dimensions.j!==undefined&&problem.given==='diameter')append('j = r = d/2',String(problem.dimensions.j)+' cm');
  if(problem.variables.s!==undefined){let root=problem.context==='cube-pyramid'||problem.shape==='pyramid'?'√(t² + (a/2)²)':problem.shape==='tetrahedron'?'√(t² + (a√3/6)²)':'√(j² + t²)';append(this.text('slant'),root+' cm '+(this.language()==='en'?'(keep exact)':'(kekalkan tepat)'));}
  const sides={'triangular-prism':3,'pentagonal-prism':5,'hexagonal-prism':6,tetrahedron:3}[problem.shape];
  if(sides){const area=sides===3?'√3 × a² / 4':sides===5?'√(25 + 10√5) × a² / 4':'3√3 × a² / 2';append(this.text('baseArea'),area+' cm²');append(this.text('perimeter'),sides+' × a cm');}
 }
 updateSteps(){
  if(!this.draft||!this.problem)return;const n=this.nodes,d=this.draft;for(const [index,step] of calcSteps.entries()){
   const enabled=this.problem.valid&&(index===0||d.checks[calcSteps[index-1]]?.correct),result=d.checks[step],label=(index+1)+'. '+this.text(step);n['calculation-label-'+step].textContent=label;n['calculation-prompt-'+step].textContent=this.text(step+'Prompt')+(step==='calculation'?' ('+this.problem.baseUnit+')':'');
   for(const key of ['calculation-check-'+step,'calculation-hint-'+step,step==='unit'?'calculation-unit-value':'calculation-'+step])n[key].disabled=!enabled;if(step==='unit')n['calculation-unit'].disabled=!enabled;n['calculation-check-'+step].setAttribute('aria-label',this.text('check')+' '+label);n['calculation-hint-'+step].setAttribute('aria-label',this.text('hint')+' '+label);
   const input=n[step==='unit'?'calculation-unit-value':'calculation-'+step];input.setAttribute('aria-invalid',String(Boolean(result&&!result.correct)));
   const feedback=n['calculation-feedback-'+step];feedback.textContent=result?calculationFeedback(result.code,this.language(),this.problem):this.text(enabled?'unchecked':this.problem.valid?'locked':'invalid');feedback.setAttribute('data-success',result?String(result.correct):'');
   const hint=n['calculation-hint-copy-'+step];hint.hidden=!d.hints.has(step);hint.textContent=d.hints.has(step)?calculationHint(this.problem,step,this.language()):'';
  }
  n['calculation-reveal'].disabled=!this.problem.valid||!d.hints.size;n['calculation-reveal'].setAttribute('aria-expanded',String(d.revealed));n['calculation-example'].setAttribute('aria-expanded',String(d.example));n['calculation-reveal-guidance'].hidden=Boolean(d.hints.size);
  n['calculation-workshop-status'].textContent=!this.problem.valid?this.text('invalid'):calcSteps.every(step=>d.checks[step]?.correct)?this.text('complete'):this.statusKey?this.text(this.statusKey):'';n['calculation-solution'].hidden=!d.revealed;n['calculation-example-panel'].hidden=!d.example;
 }
 check(step){
  const index=calcSteps.indexOf(step);if(index<0||!this.problem?.valid)return;if(index>0&&!this.draft.checks[calcSteps[index-1]]?.correct){this.announce(calculationFeedback('sequence',this.language()));return;}
  const value=step==='unit'?{value:this.draft.answers.unitValue,unit:this.draft.answers.unit}:this.draft.answers[step],result=calculationCheckStep(this.problem,step,value);this.invalidateFrom(index);this.draft.checks[step]=result;this.statusKey='';this.updateSteps();this.announce((index+1)+'. '+this.text(step)+': '+calculationFeedback(result.code,this.language(),this.problem));
 }
 hint(step){if(!this.problem?.valid)return;const index=calcSteps.indexOf(step);if(index>0&&!this.draft.checks[calcSteps[index-1]]?.correct)return;this.draft.hints.add(step);this.updateSteps();this.announce(calculationHint(this.problem,step,this.language()));}
 reveal(){if(!this.problem?.valid||!this.draft.hints.size)return;this.draft.revealed=true;this.renderSolutions();this.updateSteps();this.nodes['calculation-solution'].scrollIntoView({behavior:this.prefersReduced()?'instant':'smooth',block:'nearest'});}
 showExample(){this.draft.example=!this.draft.example;this.statusKey=this.draft.example?'exampleMode':'';this.renderSolutions();this.updateSteps();}
 renderSolutions(){
  const render=(mount,problem,title,example=false)=>{mount.replaceChildren(uiNode('h3',{},this.text(title)));if(!problem.valid)return;if(example)mount.append(uiNode('p',{class:'body-copy'},this.text('exampleScope')),uiNode('p',{},this.questionText(problem)));const solution=calculationSolution(problem),list=uiNode('ol',{class:'calc-solution-list'}),values=[calcPretty(solution.formula),calcPretty(solution.substitution),solution.calculation+' '+solution.baseUnit,solution.unitValue+' '+solution.unit];for(const [index,step] of calcSteps.entries())list.append(uiNode('li',{},this.text(step)+': '+values[index]));mount.append(list);};
  render(this.nodes['calculation-solution'],this.problem,'solution');const d=this.draft,example=calculationProblem({...d,dimensions:calculationDefaults(d.shape,d.context)});render(this.nodes['calculation-example-panel'],example,'exampleTitle',true);
 }
 newProblem(){
  const d=this.draft,defaults=calculationDefaults(d.shape,d.context),offset=++this.problemIndex;d.dimensions=Object.fromEntries(Object.entries(defaults).map(([key,value],index)=>[key,String(Number((value+1+(offset+index)%4).toFixed(2)))]));this.clearAnswers();this.statusKey='newReady';this.update(true);this.nodes['calculation-formula'].focus();this.announce(this.text('newReady'));
 }
}
