import {acceptModuleContext,GUIDED_KINDS} from './guided.mjs';
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
 summary(){if(!this.get)return;const names={net:'Bentangan',volume:'Isi padu',area:'Luas',composite:'Gabungan'},stages={prediction:'ramalan disimpan',experiment:'eksperimen diperhatikan',check:'semakan tepat',explanation:'penerangan disimpan'};this.get('module-count').textContent=this.records.filter(r=>r.completed).length+' / 4 aktiviti selesai';this.get('module-summary').textContent=GUIDED_KINDS.map(k=>{const r=this.records.find(r=>r.activity===k);return names[k]+': '+(r?.completed?'selesai':r?stages[r.stage]:'belum');}).join(' · ');}
 describe(text){if(this.transcript===text)return;this.stopSpeech();this.transcript=text;this.get('speech-transcript').textContent=text;}
 language(){return window.__geodecoderModuleHost?.language==='en'?'en':'ms';}
 audioEnabled(){return window.__geodecoderModuleHost?.audioEnabled!==false;}
 localVoice(){try{const prefix=this.language();return window.speechSynthesis?.getVoices().find(v=>v.localService===true&&(v.lang||'').toLowerCase().split('-')[0]===prefix);}catch{return null;}}
 voiceAvailability(){
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
