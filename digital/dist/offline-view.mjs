const copy={
 ms:{title:'Offline & rekod',local:'Rekod pada peranti ini',pending:'rekod menunggu penyelarasan',syncing:'Sedang menyelaraskan rekod',synced:'Semua rekod telah diselaraskan',auth:'Log masuk semula ke akaun pemilik untuk menghantar rekod.',unavailable:'Penyelarasan awan belum tersedia. Rekod kekal pada peranti.',blocked:'Ada rekod yang perlu disemak. Rekod belum dihantar dikekalkan.',failed:'Rekod belum dapat disimpan. Semak ruang atau kebenaran storan; kekalkan halaman terbuka.',retry:'Cuba selaraskan',offline:'Tiada internet',guest:'Tetamu · rekod setempat',ready:'Sedia digunakan offline',preparing:'Menyediakan kandungan offline…',prepare:'Sediakan offline',packageFailed:'Kandungan offline belum lengkap. Cuba lagi ketika online.',update:'Versi baharu tersedia',reload:'Muat semula versi baharu',history:'Lihat sejarah latihan diselaraskan',empty:'Tiada sejarah latihan diselaraskan.',historyFailed:'Sejarah belum dapat dibaca. Cuba lagi ketika online.',selfStudy:'Latihan kendiri · bukan markah pertandingan',scope:'Rekod belum dihantar disimpan pada pelayar ini. Memadam data pelayar boleh memadam rekod tersebut.'},
 en:{title:'Offline & records',local:'Records on this device',pending:'records waiting to sync',syncing:'Syncing records',synced:'All records synced',auth:'Sign back in to the owning account to send records.',unavailable:'Cloud sync is not available yet. Records stay on this device.',blocked:'A record needs review. Unsent records have been kept.',failed:'Records could not be saved. Check storage space or permission; keep this page open.',retry:'Retry sync',offline:'No internet',guest:'Guest · local records',ready:'Ready to use offline',preparing:'Preparing offline content…',prepare:'Prepare offline',packageFailed:'Offline content is incomplete. Retry when online.',update:'An update is available',reload:'Reload to update',history:'View synced practice history',empty:'No synced practice history yet.',historyFailed:'History could not be loaded. Retry when online.',selfStudy:'Self-study · not competition marks',scope:'Unsent records are kept in this browser. Clearing browser data can remove them.'}
};
export function createOfflineView({document=globalThis.document,onRetry=()=>{},onPrepare=()=>{},onUpdate=()=>{},onHistory=()=>{}}={}){
 if(!document)return {update(){},history(){}};
 const panel=document.createElement('aside');panel.id='offline-panel';
 panel.style.cssText='max-width:var(--content-width,1200px);margin:0.5rem auto;padding:0.65rem 1rem;border:1px solid var(--border,#cbd5e1);border-radius:12px;background:var(--surface,#fff);color:var(--ink,#142840);font-size:0.875rem;overflow-wrap:anywhere';
 panel.innerHTML='<details><summary><strong data-offline-title></strong> · <span data-offline-status role="status" aria-live="polite"></span></summary><div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:0.75rem 0"><button type="button" class="button button-quiet" data-offline-retry></button><button type="button" class="button button-quiet" data-offline-prepare hidden></button><button type="button" class="button button-quiet" data-offline-update hidden></button><button type="button" class="button button-quiet" data-offline-history hidden></button></div><p data-offline-package role="status"></p><p data-offline-detail></p><p data-offline-scope></p><ol data-offline-attempts></ol></details>';
 (document.querySelector('.site-header')||document.body.firstElementChild)?.after(panel);
 const find=name=>panel.querySelector('[data-offline-'+name+']');
 find('retry').addEventListener('click',onRetry);find('prepare').addEventListener('click',onPrepare);find('update').addEventListener('click',onUpdate);find('history').addEventListener('click',onHistory);
 let language='ms',lastState={},lastPackage={},historyData=null;
 function renderHistory(){
  const list=find('attempts');list.replaceChildren();if(historyData===null)return;
  const c=copy[language];
  if(!Array.isArray(historyData)){const li=document.createElement('li');li.textContent=c.historyFailed;list.append(li);return;}
  if(!historyData.length){const li=document.createElement('li');li.textContent=c.empty;list.append(li);return;}
  for(const row of historyData){const li=document.createElement('li');li.textContent=`${row.payload.mode} · ${row.payload.score}/${row.payload.total} · ${c.selfStudy}`;list.append(li);}
 }
 function update(state={},pack={}){
  if(lastState.actor!==state.actor){historyData=null;renderHistory();}
  lastState=state;lastPackage=pack;language=document.documentElement.lang==='en'?'en':'ms';const c=copy[language];
  const pending=state.pending||0;
  const waiting=language==='en'&&pending===1?'record waiting to sync':c.pending;
  const status=state.status==='storage-failed'?c.failed:state.status==='syncing'?c.syncing:state.status==='needs-auth'?c.auth:state.status==='unavailable'?c.unavailable:state.status==='blocked'?c.blocked:pending?`${pending} ${waiting}`:state.actor==='guest'?c.guest:state.status==='synced'?c.synced:c.local;
  const message=(state.online===false?c.offline+' · ':'')+status;
  if(find('status').textContent!==message)find('status').textContent=message;
  find('title').textContent=c.title;find('scope').textContent=c.scope;
  find('detail').textContent=state.actor==='guest'?c.guest:c.selfStudy;
  find('retry').textContent=c.retry;find('retry').disabled=state.actor==='guest'||state.online===false||state.status==='syncing';
  find('prepare').hidden=!pack.supported;find('prepare').textContent=c.prepare;find('prepare').disabled=pack.preparing||state.online===false;
  find('update').hidden=!pack.update;find('update').textContent=c.reload;
  find('package').textContent=pack.preparing?c.preparing:pack.error?c.packageFailed:pack.update?c.update:pack.ready?c.ready:'';
  find('history').hidden=state.actor==='guest';find('history').textContent=c.history;renderHistory();
 }
 const observer=globalThis.MutationObserver?new MutationObserver(()=>update(lastState,lastPackage)):null;
 observer?.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 return {update,history(rows){historyData=rows;renderHistory();},element:panel};
}
