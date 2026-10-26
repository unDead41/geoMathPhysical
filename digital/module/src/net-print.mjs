/** Physical millimetres, independent of the screen preview size. No fit-to-page. */
const npEscape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const npPointKey=p=>p.slice(0,2).map(x=>Math.round(x*1e6)).join(',');
const npEdgeKey=(a,b)=>[npPointKey(a),npPointKey(b)].sort().join('|');
const npRound=n=>Number(n.toFixed(5));
function npArea(vertices){return Math.abs(vertices.reduce((sum,p,i)=>sum+p[0]*vertices[(i+1)%vertices.length][1]-vertices[(i+1)%vertices.length][0]*p[1],0))/2;}

export function netPrintPlan(mesh,{title='Bentangan GeoDecoder',cmPerUnit=1,grid=true,curved=false}={}){
 const fail=reason=>({valid:false,reason,title});
 if(!Array.isArray(mesh)||!mesh.length)return fail('Pilih bentangan yang lengkap dahulu.');
 if(!Number.isFinite(cmPerUnit)||cmPerUnit<.25||cmPerUnit>3)return fail('Skala cetak mesti antara 0.25 dan 3 cm bagi setiap unit model.');
 const all=mesh.flatMap(f=>f.vertices);
 if(all.some(p=>p.length!==3||p.some(n=>!Number.isFinite(n))))return fail('Ukuran bentangan tidak sah.');
 const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0])),minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
 if(Math.max(...all.map(p=>p[2]))-Math.min(...all.map(p=>p[2]))>1e-6)return fail('Buka bentangan sehingga rata sebelum mencetak.');
 if(mesh.some(f=>f.warning))return fail('Baiki muka yang bertindih sebelum mencetak.');
 const factor=cmPerUnit*10,widthMM=Math.max(100,(maxX-minX)*factor+10),heightMM=(maxY-minY)*factor+35;
 if(widthMM>190+1e-7||heightMM>267+1e-7)return fail('Bentangan melebihi ruang A4. Pilih skala ukuran yang lebih kecil; grid kekal 1 cm.');
 if(widthMM<=10||heightMM<=35)return fail('Bentangan mesti mempunyai luas.');
 const convert=p=>[npRound((p[0]-minX)*factor+5),npRound((maxY-p[1])*factor+14)];
 const faces=mesh.map(f=>({id:f.id,color:/^#[0-9a-f]{6}$/i.test(f.color)?f.color:'#B5E8DF',points:f.vertices.map(convert)}));
 const edgeMap=new Map();
 for(const face of mesh)for(let i=0;i<face.vertices.length;i++){
  const a=face.vertices[i],b=face.vertices[(i+1)%face.vertices.length],key=npEdgeKey(a,b);
  if(!edgeMap.has(key))edgeMap.set(key,{a,b,faces:[]});edgeMap.get(key).faces.push(face);
 }
 const edges=[];
 for(const edge of edgeMap.values()){
  const ids=[...new Set(edge.faces.map(f=>f.id))];
  if(edge.faces.length>1&&ids.length===1)continue; // Tessellation is not a fold.
  let fold=false;
  if(!curved&&ids.length===2){const [a,b]=edge.faces;fold=a.parent===b.id||b.parent===a.id||(a.parent===undefined&&b.parent===undefined);}
  edges.push({a:convert(edge.a),b:convert(edge.b),fold});
 }
 const groups=new Map();
 for(const face of mesh){const area=npArea(face.vertices);if(area<1e-12)continue;const center=face.vertices.reduce((s,p)=>s.map((x,i)=>x+p[i]),[0,0,0]).map(x=>x/face.vertices.length);if(!groups.has(face.id))groups.set(face.id,{sum:[0,0,0],weight:0});const g=groups.get(face.id);g.weight+=area;g.sum=g.sum.map((x,i)=>x+center[i]*area);}
 const labels=[...groups].map(([id,g])=>({text:String(id+1),point:convert(g.sum.map(x=>x/g.weight))}));
 return {valid:true,reason:'Sedia untuk A4. Pilih saiz sebenar / 100% dalam dialog cetak.',title,widthMM:npRound(widthMM),heightMM:npRound(heightMM),cmPerUnit,grid:Boolean(grid),curved:Boolean(curved),faces,edges,labels};
}
export function netPrintSVG(mesh,options={}){
 const plan=netPrintPlan(mesh,options);if(!plan.valid)return {...plan,svg:''};
 const {widthMM:w,heightMM:h}=plan,parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" role="img" aria-label="${npEscape(plan.title)}">`,`<title>${npEscape(plan.title)}</title>`,`<rect width="${w}" height="${h}" fill="white"/>`];
 if(plan.grid){parts.push('<defs><pattern id="net-grid-cm" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 H 0 V 10" fill="none" stroke="#D9E4ED" stroke-width="0.18"/></pattern></defs>',`<rect x="0" y="11" width="${w}" height="${h-31}" fill="url(#net-grid-cm)"/>`);}
 parts.push(`<text x="5" y="5" font-size="3.5" font-family="Arial,sans-serif" fill="#18334B">${npEscape(plan.title)}</text>`,`<text x="5" y="9" font-size="2.4" font-family="Arial,sans-serif" fill="#526A7D">1 unit model = ${plan.cmPerUnit} cm · grid 1 cm · garis putus-putus: lipatan</text>`);
 for(const f of plan.faces)parts.push(`<polygon points="${f.points.map(p=>p.join(',')).join(' ')}" fill="${npEscape(f.color)}" fill-opacity="0.58"/>`);
 for(const e of plan.edges)parts.push(`<line x1="${e.a[0]}" y1="${e.a[1]}" x2="${e.b[0]}" y2="${e.b[1]}" stroke="#18334B" stroke-width="0.3"${e.fold?' stroke-dasharray="1.5 1"':''}/>`);
 for(const l of plan.labels)parts.push(`<text x="${l.point[0]}" y="${l.point[1]}" text-anchor="middle" dominant-baseline="middle" font-size="3" font-family="Arial,sans-serif" fill="#18334B">${l.text}</text>`);
 parts.push(`<path d="M 5 ${h-12} v 2 h 10 v -2" fill="none" stroke="#18334B" stroke-width="0.35"/>`,`<text x="18" y="${h-10}" font-size="2.8" font-family="Arial,sans-serif" fill="#18334B">Semakan pembaris: 1 cm</text>`,`<text x="5" y="${h-5}" font-size="2.3" font-family="Arial,sans-serif" fill="#526A7D">${plan.curved?'Garis luar: potong. Permukaan melengkung digulung; tapak dicantum pada sempadannya.':'Garis penuh: potong. Garis putus-putus: lipat. Cetak pada saiz sebenar / 100%.'}</text>`,'</svg>');
 return {...plan,svg:parts.join('')};
}
function npNode(tag,attrs={},text=''){const node=document.createElement(tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));if(text)node.textContent=text;return node;}
function npSvgNode(tag,attrs={},text=''){const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));if(text)node.textContent=text;return node;}
function npBuildPreview(plan){
 const svg=npSvgNode('svg',{xmlns:'http://www.w3.org/2000/svg',width:plan.widthMM+'mm',height:plan.heightMM+'mm',viewBox:`0 0 ${plan.widthMM} ${plan.heightMM}`,'aria-label':plan.title,role:'img'}),w=plan.widthMM,h=plan.heightMM;
 svg.append(npSvgNode('title',{},plan.title),npSvgNode('rect',{width:w,height:h,fill:'white'}));
 if(plan.grid){for(let x=0;x<w;x+=10)svg.append(npSvgNode('line',{x1:x,x2:x,y1:11,y2:h-20,stroke:'#D9E4ED','stroke-width':.18}));for(let y=11;y<h-20;y+=10)svg.append(npSvgNode('line',{x1:0,x2:w,y1:y,y2:y,stroke:'#D9E4ED','stroke-width':.18}));}
 svg.append(npSvgNode('text',{x:5,y:5,'font-size':3.5,'font-family':'Arial,sans-serif',fill:'#18334B'},plan.title),npSvgNode('text',{x:5,y:9,'font-size':2.4,'font-family':'Arial,sans-serif',fill:'#526A7D'},'1 unit model = '+plan.cmPerUnit+' cm · grid 1 cm'));
 for(const f of plan.faces)svg.append(npSvgNode('polygon',{points:f.points.map(p=>p.join(',')).join(' '),fill:f.color,'fill-opacity':.58}));
 for(const e of plan.edges)svg.append(npSvgNode('line',{x1:e.a[0],y1:e.a[1],x2:e.b[0],y2:e.b[1],stroke:'#18334B','stroke-width':.3,...(e.fold?{'stroke-dasharray':'1.5 1'}:{})}));
 for(const l of plan.labels)svg.append(npSvgNode('text',{x:l.point[0],y:l.point[1],'text-anchor':'middle','dominant-baseline':'middle','font-size':3,'font-family':'Arial,sans-serif',fill:'#18334B'},l.text));
 svg.append(npSvgNode('path',{d:`M 5 ${h-12} v 2 h 10 v -2`,fill:'none',stroke:'#18334B','stroke-width':.35}),npSvgNode('text',{x:18,y:h-10,'font-size':2.8,'font-family':'Arial,sans-serif',fill:'#18334B'},'Semakan pembaris: 1 cm'),npSvgNode('text',{x:5,y:h-5,'font-size':2.3,'font-family':'Arial,sans-serif',fill:'#526A7D'},plan.curved?'Potong garis luar; gulung permukaan dan cantum tapak.':'Garis penuh: potong · putus-putus: lipat · cetak 100%'));
 return svg;
}
export class NetPrinter{
 constructor({mount,printMount=document.getElementById('net-print-sheet')}){
  this.mount=mount;this.printMount=printMount;this.input=null;this.key='';
  const heading=npNode('h4',{},'Cetak dan bina model'),note=npNode('p',{class:'lab-note'},'Setiap petak grid bercetak ialah 1 cm. Skala ukuran di bawah menentukan saiz model kertas. Semak palang 1 cm dengan pembaris selepas mencetak.');
  const field=npNode('div',{class:'lab-field'});this.scale=npNode('select',{id:'net-print-scale','aria-label':'Skala ukuran bentangan cetak'});this.scale.append(...[[.5,'1 unit model = 0.5 cm'],[1,'1 unit model = 1 cm'],[1.5,'1 unit model = 1.5 cm'],[2,'1 unit model = 2 cm']].map(([value,text])=>npNode('option',{value},text)));this.scale.value='1';field.append(npNode('label',{for:'net-print-scale'},'Skala ukuran model kertas'),this.scale);
  const gridLabel=npNode('label',{class:'net-print-grid-toggle'});this.grid=npNode('input',{id:'net-print-grid',type:'checkbox'});this.grid.checked=true;gridLabel.append(this.grid,npNode('span',{},'Sertakan grid 1 cm'));
  this.printButton=npNode('button',{type:'button',class:'button primary',id:'net-print-action'},'Cetak / simpan PDF');this.downloadButton=npNode('button',{type:'button',class:'button',id:'net-print-download'},'Muat turun SVG');const actions=npNode('div',{class:'lab-actions'});actions.append(this.printButton,this.downloadButton);
  this.status=npNode('p',{class:'lab-note',role:'status'});this.preview=npNode('div',{class:'net-print-preview'});
  this.scale.addEventListener('change',()=>{this.key='';this.render(this.input||{});});this.grid.addEventListener('change',()=>{this.key='';this.render(this.input||{});});
  this.printButton.addEventListener('click',()=>this.print());this.downloadButton.addEventListener('click',()=>this.download());
  mount.append(heading,note,field,gridLabel,actions,this.status,this.preview);
  if(typeof window.addEventListener==='function')window.addEventListener('afterprint',()=>this.clearPrintMode());
 }
 render({mesh=[],title='Bentangan GeoDecoder',valid=false,curved=false}={}){
  this.input={mesh,title,valid,curved};const key=JSON.stringify([mesh,title,curved,this.scale.value,this.grid.checked]);
  if(this.key!==key){this.key=key;this.plan=netPrintSVG(mesh,{title,curved,cmPerUnit:Number(this.scale.value),grid:this.grid.checked});this.preview.replaceChildren();if(this.plan.valid)this.preview.append(npBuildPreview(this.plan));}
  const enabled=Boolean(valid&&this.plan?.valid);this.printButton.disabled=!enabled;this.downloadButton.disabled=!enabled;
  this.status.textContent=!valid?'Cetakan tersedia apabila bentangan sah, rata dan gerakan berhenti.':this.plan.reason;
 }
 clearPrintMode(){if(document.body)delete document.body.dataset.netPrinting;}
 print(){
  if(this.printButton.disabled)return;
  if(!this.printMount||typeof window.print!=='function'){this.status.textContent='Dialog cetak tidak tersedia dalam persekitaran ini. Gunakan muat turun SVG.';return;}
  this.printMount.replaceChildren(npBuildPreview(this.plan));this.printMount.hidden=false;
  if(document.body)document.body.dataset.netPrinting='true';
  try{window.print();}catch{this.clearPrintMode();this.status.textContent='Cetakan belum dimulakan. Muat turun SVG atau cuba butang cetak semula.';}
 }
 download(){
  if(this.downloadButton.disabled)return;
  if(typeof Blob==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function'){this.status.textContent='Muat turun SVG tidak tersedia dalam persekitaran ini.';return;}
  const url=URL.createObjectURL(new Blob([this.plan.svg],{type:'image/svg+xml;charset=utf-8'})),anchor=npNode('a',{href:url,download:'GeoDecoder_Bentangan.svg'});this.mount.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
