import {mergeModuleProgress,MODULE_ACTIVITIES,MODULE_NAMES,MODULE_STAGE_NAMES} from './module-progress.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dates=new Intl.DateTimeFormat('ms-MY',{timeZone:'Asia/Kuala_Lumpur',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export function renderLearningRecords(values=[]){
  const records=mergeModuleProgress(values),count=records.filter(r=>r.completed).length;
  return `<details class="portal-module-records"><summary><b>${count}/4 aktiviti selesai</b><span>Lihat rekod latihan</span></summary><ol>${MODULE_ACTIVITIES.map(activity=>{
    const record=records.find(r=>r.activity===activity),raw=Array.isArray(values)?values.find(v=>v?.activity===activity):null;
    const stamp=Date.parse(raw?.updated_at||''),when=Number.isFinite(stamp)?dates.format(stamp):'';
    return `<li><b>${MODULE_NAMES[activity]}</b><span class="portal-module-stage">${record?record.completed?'Selesai latihan':MODULE_STAGE_NAMES[record.stage]:'Belum direkod'}</span>${record?`<dl><dt>Ramalan</dt><dd>${escape(record.prediction)}</dd><dt>Pemerhatian</dt><dd>${escape(record.result||'Belum direkod')}</dd><dt>Penerangan murid</dt><dd>${escape(record.explanation||'Belum direkod')}</dd></dl>${when?`<small>Dikemas kini ${escape(when)} MYT</small>`:''}`:''}</li>`;
  }).join('')}</ol></details>`;
}
