import {mergeModuleProgress,MODULE_ACTIVITIES,MODULE_NAMES,MODULE_STAGE_NAMES} from './module-progress.mjs';
import {translate} from './i18n.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dates=Object.fromEntries(['ms','en'].map(language=>[language,new Intl.DateTimeFormat(language==='en'?'en-MY':'ms-MY',{timeZone:'Asia/Kuala_Lumpur',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})]));
export function renderLearningRecords(values=[],language=globalThis.document?.documentElement?.lang==='en'?'en':'ms'){
  const locale=language==='en'?'en':'ms',t=key=>translate(locale,key)||key;
  const records=mergeModuleProgress(values),count=records.filter(r=>r.completed).length;
  return `<details class="portal-module-records"><summary><b>${count}/4 ${t('aktiviti selesai')}</b><span>${t('Lihat rekod latihan')}</span></summary><ol>${MODULE_ACTIVITIES.map(activity=>{
    const record=records.find(r=>r.activity===activity),raw=Array.isArray(values)?values.find(v=>v?.activity===activity):null;
    const stamp=Date.parse(raw?.updated_at||''),when=Number.isFinite(stamp)?dates[locale].format(stamp):'';
    return `<li><b>${t(MODULE_NAMES[activity])}</b><span class="portal-module-stage">${t(record?record.completed?'Selesai latihan':MODULE_STAGE_NAMES[record.stage]:'Belum direkod')}</span>${record?`<dl><dt>${t('Ramalan')}</dt><dd>${escape(record.prediction)}</dd><dt>${t('Pemerhatian')}</dt><dd>${escape(record.result||t('Belum direkod'))}</dd><dt>${t('Penerangan murid')}</dt><dd>${escape(record.explanation||t('Belum direkod'))}</dd></dl>${when?`<small>${t('Dikemas kini')} ${escape(when)} MYT</small>`:''}`:''}</li>`;
  }).join('')}</ol></details>`;
}
