import {acceptModuleContext,GUIDED_KINDS} from './guided.mjs';
import {uiNode,uiIcon} from './ui.mjs';
/** Optional parent bridge. Offline runtime has no browser persistence. */
export class ModuleAccess{
 constructor({onTheme,onContext,onFocus}){Object.assign(this,{onTheme,onContext,onFocus});this.session=null;this.records=[];this.theme='light';this.focus=false;this.embedded=Boolean(window.parent&&window.parent!==window);this.transcript='';}
 init(){
  const get=id=>document.getElementById(id);
  this.get=get;
  get('module-theme').addEventListener('click',()=>{if(!this.session)this.applyTheme(this.theme==='light'?'dark':'light');});
  get('module-focus').addEventListener('click',()=>{this.focus=!this.focus;document.documentElement?.setAttribute('data-focus',String(this.focus));get('module-focus').setAttribute('aria-pressed',String(this.focus));get('module-focus').textContent=this.focus?'Keluar fokus model':'Fokus model';this.onFocus();});
  get('speech-play').addEventListener('click',()=>this.speak());get('speech-stop').addEventListener('click',()=>this.stopSpeech());
  const receive=event=>{if(!this.embedded)return;const c=acceptModuleContext(event,window.parent);if(!c)return;const changed=this.session!==c.session;this.session=c.session;this.records=c.progress;get('module-theme').disabled=true;get('module-theme').textContent='Tema mengikut aplikasi';this.applyTheme(c.theme);this.onContext(c.progress,changed);this.summary();};
  window.addEventListener?.('message',receive);
  window.addEventListener?.('pagehide',()=>this.stopSpeech());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stopSpeech();});
  window.speechSynthesis?.addEventListener?.('voiceschanged',()=>this.voiceAvailability());
  this.voiceAvailability();this.summary();
  if(this.embedded)window.parent.postMessage({type:'geodecoder:module-ready',protocol:1},'*');
 }
 applyTheme(theme){this.theme=theme;document.documentElement?.setAttribute('data-theme',theme);if(!this.session){this.get('module-theme').setAttribute('aria-pressed',String(theme==='dark'));this.get('module-theme').textContent=theme==='dark'?'Tema cerah':'Tema gelap';}this.onTheme();}
 progress(record){const old=this.records.find(r=>r.activity===record.activity);if(!old?.completed||record.completed)this.records=[...this.records.filter(r=>r.activity!==record.activity),record];this.summary();if(this.embedded&&this.session)window.parent.postMessage({type:'geodecoder:module-progress',protocol:1,session:this.session,...record},'*');}
 summary(){
  if(!this.get)return;
  const en=this.language()==='en',names=en?{net:'Build a net',volume:'Volume lab',area:'Surface area',composite:'Composite solids'}:{net:'Bentangan',volume:'Isi padu',area:'Luas permukaan',composite:'Gabungan'},
   descriptions=en?{net:'Build and explore nets of solids.',volume:'Explore capacity using interactive models.',area:'Connect each surface with its formula.',composite:'Find the outer surfaces of joined solids.'}:{net:'Bina dan teroka bentangan pelbagai bongkah.',volume:'Teroka isi padu menggunakan model interaktif.',area:'Hubungkan setiap permukaan dengan rumusnya.',composite:'Kenal pasti permukaan luar bongkah gabungan.'},
   stages=en?{prediction:'Prediction recorded',experiment:'Experiment observed',check:'Check complete',explanation:'Explanation recorded'}:{prediction:'Ramalan disimpan',experiment:'Eksperimen diperhatikan',check:'Semakan tepat',explanation:'Penerangan disimpan'},icons={net:'net',volume:'volume',area:'area',composite:'combine'},count=this.records.filter(record=>record.completed).length;
  this.get('module-count').textContent=count+' / 4 '+(en?'activities complete':'aktiviti selesai');
  const title=this.get('module-records-title');if(!title)return;
  title.textContent=en?'Your learning journey':'Perjalanan pembelajaran anda';this.get('module-records-subtitle').textContent=en?'Four self-directed practice activities in GeoMath.':'Rekod empat aktiviti latihan kendiri di GeoMath.';
  this.get('module-records-toggle').textContent=en?'View practice records':'Buka rekod latihan';
  const meter=this.get('module-record-meter');meter.setAttribute('value',String(count));meter.setAttribute('aria-label',en?'Activities complete':'Aktiviti selesai');
  this.get('module-record-scope').textContent=en?'Self-directed practice records; not verified mastery or a performance-level grade. Revisiting an activity keeps your achievement.':'Rekod latihan kendiri; bukan pengesahan penguasaan atau gred TP. Ulang aktiviti mengekalkan pencapaian.';
  if(!this.recordRows)this.recordRows=new Map();
  const rows=GUIDED_KINDS.map(activity=>{
   const record=this.records.find(value=>value.activity===activity),done=Boolean(record?.completed);
   let cached=this.recordRows.get(activity);
   if(cached){
    cached.row.setAttribute('data-completed',String(done));cached.copy.children[0].textContent=names[activity];cached.copy.children[1].textContent=descriptions[activity];cached.stage.textContent=done?(en?'Complete':'Selesai'):record?stages[record.stage]:(en?'Not recorded':'Belum direkod');cached.stage.setAttribute('data-completed',String(done));cached.action.textContent=done?(en?'Revisit':'Ulang aktiviti'):(en?'Continue':'Sambung');cached.action.setAttribute('aria-label',(done?(en?'Revisit ':'Ulang '):(en?'Continue ':'Sambung '))+names[activity]);
    cached.reflection.hidden=!record;cached.reflection.children[0].textContent=en?'View my reflection':'Lihat refleksi saya';for(const [index,key] of ['prediction','result','explanation'].entries()){cached.list.children[index].children[0].textContent=(en?['Prediction','Observation','My explanation']:['Ramalan','Pemerhatian','Penerangan saya'])[index];cached.list.children[index].children[1].textContent=record?.[key]||(en?'Not recorded yet':'Belum direkod');}return cached.row;
   }
   const row=uiNode('article',{class:'module-record','data-completed':String(done)}),icon=uiNode('div',{class:'module-record-icon','aria-hidden':'true'});icon.append(uiIcon(icons[activity]));
   const copy=uiNode('div',{class:'module-record-copy'});copy.append(uiNode('h3',{},names[activity]),uiNode('p',{},descriptions[activity]));
   const stage=uiNode('span',{id:'module-record-stage-'+activity,class:'module-record-stage','data-completed':String(done)},done?(en?'Complete':'Selesai'):record?stages[record.stage]:(en?'Not recorded':'Belum direkod'));
   const action=uiNode('button',{id:'module-record-action-'+activity,class:'button primary',type:'button','aria-label':(done?(en?'Revisit ':'Ulang '):(en?'Continue ':'Sambung '))+names[activity]},done?(en?'Revisit':'Ulang aktiviti'):(en?'Continue':'Sambung'));
   action.addEventListener('click',()=>{this.get('learn-labs').click();this.get('lab-'+activity).click();this.get('labs-title').focus({preventScroll:true});this.get('labs-title').scrollIntoView({behavior:'instant',block:'start'});});
   row.append(icon,copy,stage,action);
   const reflection=uiNode('details',{class:'module-record-reflection'});reflection.append(uiNode('summary',{},en?'View my reflection':'Lihat refleksi saya'));const list=uiNode('dl');for(const [key,label] of [['prediction',en?'Prediction':'Ramalan'],['result',en?'Observation':'Pemerhatian'],['explanation',en?'My explanation':'Penerangan saya']]){const field=uiNode('div');field.append(uiNode('dt',{},label),uiNode('dd',{},record?.[key]||(en?'Not recorded yet':'Belum direkod')));list.append(field);}reflection.append(list);reflection.hidden=!record;row.append(reflection);this.recordRows.set(activity,{row,copy,stage,action,reflection,list});
   return row;
  });
  if(!this.recordsMounted){this.get('module-summary').replaceChildren(...rows);this.recordsMounted=true;}
 }
 describe(text){if(this.transcript===text)return;this.stopSpeech();this.transcript=text;this.get('speech-transcript').textContent=text;}
 language(){return window.__geodecoderModuleHost?.language==='en'?'en':'ms';}
 audioEnabled(){return window.__geodecoderModuleHost?.audioEnabled!==false;}
 localVoice(){try{const prefix=this.language();return window.speechSynthesis?.getVoices().find(v=>v.localService===true&&(v.lang||'').toLowerCase().split('-')[0]===prefix);}catch{return null;}}
 voiceAvailability(){
  this.summary();
  const english=this.language()==='en',audio=this.audioEnabled(),available=Boolean(audio&&window.SpeechSynthesisUtterance&&this.localVoice());this.get('speech-play').disabled=!available;this.get('speech-stop').disabled=!available;
  this.get('speech-heading').textContent=english?'Optional spoken explanation':'Penerangan suara pilihan';
  this.get('speech-status').textContent=!audio?(english?'Audio is disabled in the application settings. The explanation text remains available.':'Audio dimatikan dalam tetapan aplikasi. Teks penerangan kekal tersedia.'):available?(english?'A local English voice is available. Press Read to listen; speech never starts automatically.':'Suara Melayu setempat tersedia. Tekan Baca untuk mendengar; tiada main automatik.'):(english?'No local English voice is available in this browser. Read the explanation text below.':'Suara Melayu setempat tidak tersedia pada pelayar ini. Baca teks penerangan yang sentiasa tersedia.');
 }
 speak(){
  this.stopSpeech();const voice=this.localVoice(),english=this.language()==='en';if(!this.audioEnabled()||!voice||!window.SpeechSynthesisUtterance){this.voiceAvailability();return;}
  const failed=()=>{this.get('speech-status').textContent=english?'Speech could not play. Use the explanation text.':'Suara tidak dapat dimainkan. Gunakan teks penerangan.';};
  try{const utterance=new window.SpeechSynthesisUtterance(this.get('speech-transcript').textContent);utterance.lang=voice.lang;utterance.voice=voice;utterance.rate=.85;utterance.onerror=failed;window.speechSynthesis.speak(utterance);this.get('speech-status').textContent=english?'Reading the explanation. Press Stop speech to stop.':'Membaca penerangan. Tekan Hentikan suara untuk berhenti.';}catch{failed();}
 }
 stopSpeech(){try{window.speechSynthesis?.cancel();}catch{/* Text remains available. */}}
}
