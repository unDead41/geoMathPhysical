import {escapeHtml} from './format.mjs';
import {icon} from './art.mjs';
import {HELP_GUIDES} from './help-copy.mjs';
import {createReportContext,formatReport,validateReport,REPORT_CATEGORIES,REPORT_LIMITS} from './support-report.mjs';

/** Local-only help/report views; the app keeps modal, focus and clock ownership. */
export function createHelpSupport({t,getLanguage,getContext,openDialog,openTutorial,openSettings,openModuleGuide,hostDocument=document,hostWindow=window}){
  const content=hostDocument.getElementById('dialog-content');
  let view='home',draft={category:'game',description:'',steps:'',expected:'',actual:''};
  let context=null,errors={},preview='',revision=0,copying=false;
  const text=(key,params)=>escapeHtml(t('help.'+key,params));
  const button=(action,label,primary=false)=>`<button type="button" class="button ${primary?'button-primary':'button-outline'}" data-help-action="${action}">${text(label)}</button>`;
  function resetScroll(){hostDocument.getElementById('app-dialog').scrollTop=0;}
  function clockNote(){
    const c=context||createReportContext(getContext());
    const key=c.screen==='module'?'clockModule':c.screen!=='game'?null:c.mode==='duel'?'clockDuel':c.mode==='classroom'?'clockRoom':'clockSolo';
    return key?`<p class="help-clock" role="note">${text(key)}</p>`:'';
  }
  function showHome(){
    view='home';revision++;copying=false;
    const active=context?.screen==='module'?'module':context?.screen==='portal'?'accounts':context?.mode==='duel'?'duel':'play';
    openDialog('help',t('help.title'),`<div class="help-centre" data-help-view="home">
      <p class="help-intro">${text('intro')}</p>${clockNote()}
      <section class="help-report-prompt"><div><h3>${text('report')}</h3><p>${text('reportIntro')}</p></div><button class="button button-primary" type="button" data-help-action="report" data-autofocus>${text('report')} ${icon('arrow')}</button></section>
      <h3 class="help-guides-title">${text('guides')}</h3>
      <div class="help-guides">${HELP_GUIDES.map(guide=>`<details ${guide.id===active?'open':''}><summary>${text(guide.id+'.title')}</summary><div class="help-guide-copy">${guide.id==='play'?'<ol>':'<ul>'}${Array.from({length:guide.lines},(_,i)=>`<li>${text(guide.id+'.'+(i+1))}</li>`).join('')}${guide.id==='play'?'</ol>':'</ul>'}${guide.tutorial?button('tutorial','tutorial'):''}${guide.settings?button('settings','settings'):''}${guide.moduleGuide&&context?.screen==='module'?button('module-guide','moduleGuide'):''}</div></details>`).join('')}</div>
    </div>`);resetScroll();
  }
  function formField(field,max){
    const error=errors[field],message=error?t('help.'+error,{max}):'';
    return `<div class="field support-field"><label for="support-${field}">${text(field)}</label><textarea id="support-${field}" name="${field}" rows="${field==='steps'?4:3}" maxlength="${max}" required aria-describedby="support-${field}-hint support-${field}-error" ${error?'aria-invalid="true"':''} style="resize:none">${escapeHtml(draft[field])}</textarea><div id="support-${field}-hint" class="support-field-hint"><span>${text('limit',{max})}</span><output data-help-count="${field}">${draft[field].length} / ${max}</output></div><span class="field-error" id="support-${field}-error">${escapeHtml(message)}</span></div>`;
  }
  function showForm(){
    view='form';revision++;copying=false;
    openDialog('help',t('help.report'),`<div data-help-view="form" class="help-centre">
      ${button('home','back')}${clockNote()}<p class="support-privacy" id="support-privacy">${text('privacy')}</p>
      <form id="support-form" class="support-form" novalidate aria-describedby="support-privacy support-draft">
        <div class="field"><label for="support-category">${text('category')}</label><select id="support-category" name="category" required ${errors.category?'aria-invalid="true"':''} aria-describedby="support-category-error">${REPORT_CATEGORIES.map(id=>`<option value="${id}" ${draft.category===id?'selected':''}>${text('category.'+id)}</option>`).join('')}</select><span class="field-error" id="support-category-error">${errors.category?text('required'):''}</span></div>
        ${Object.entries(REPORT_LIMITS).map(([field,max])=>formField(field,max)).join('')}
        <p class="settings-notice" id="support-draft">${text('draft')}</p><p class="support-local">${text('local')}</p>
        <button class="button button-primary" type="submit">${text('preview')} ${icon('arrow')}</button>
      </form></div>`);
    resetScroll();
    const invalid=content.querySelector('[aria-invalid="true"]');if(invalid){invalid.focus();invalid.scrollIntoView({block:'nearest',behavior:'instant'});}
  }
  function showPreview(){
    view='preview';revision++;copying=false;
    preview=formatReport(draft,context,getLanguage());
    openDialog('help',t('help.preview'),`<div class="help-centre" data-help-view="preview">${clockNote()}
      <p id="support-review">${text('review')}</p><p class="support-local">${text('local')}</p>
      <label class="support-preview-label" for="support-preview">${text('preview')}</label>
      <textarea id="support-preview" class="support-preview" rows="18" readonly spellcheck="false" aria-describedby="support-review" style="resize:none" data-autofocus>${escapeHtml(preview)}</textarea>
      <div class="support-actions">${button('edit','edit')}${button('copy','copy',true)}${button('download','download')}${button('select','select')}</div>
      <p id="support-status" class="support-status" role="status" aria-live="polite"></p>
      ${button('home','back')}</div>`);resetScroll();
  }
  function open(){context=createReportContext(getContext());showHome();}
  function openReport(){
    context=createReportContext(getContext());errors={};
    if(!Object.keys(REPORT_LIMITS).some(key=>draft[key]))draft.category=context.screen==='module'?'module':context.screen==='portal'?'account':context.mode==='duel'?'duel':'game';
    showForm();
  }
  function setStatus(key){const node=hostDocument.getElementById('support-status');if(node)node.textContent=t('help.'+key);}
  async function copy(){
    if(copying||view!=='preview')return;
    const current=revision,node=content.querySelector('[data-help-action="copy"]');copying=true;
    node.disabled=true;node.setAttribute('aria-busy','true');node.textContent=t('help.copying');
    try{
      if(!hostWindow.navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await hostWindow.navigator.clipboard.writeText(preview);
      if(current===revision&&node.isConnected)setStatus('copied');
    }catch{if(current===revision&&node.isConnected)setStatus('copyFailed');}
    finally{if(current===revision){copying=false;if(node.isConnected){node.disabled=false;node.removeAttribute('aria-busy');node.textContent=t('help.copy');}}}
  }
  function select(){const node=hostDocument.getElementById('support-preview');if(node){node.focus({preventScroll:true});node.select();setStatus('selected');}}
  function download(){
    if(view!=='preview')return;
    let url,link;
    try{
      const blob=new hostWindow.Blob([preview],{type:'text/plain;charset=utf-8'});
      url=hostWindow.URL.createObjectURL(blob);link=hostDocument.createElement('a');
      link.href=url;link.download='GeoDecoder-report-v'+context.appVersion+'.txt';hostDocument.body.append(link);link.click();
      setStatus('downloaded');
    }catch{setStatus('downloadFailed');}
    finally{link?.remove();if(url)hostWindow.setTimeout(()=>hostWindow.URL.revokeObjectURL(url),1000);}
  }
  function capture(event){
    const field=event.target.name;
    if(!event.target.closest('#support-form')||!['category',...Object.keys(REPORT_LIMITS)].includes(field))return;
    draft[field]=event.target.value;
    const count=content.querySelector(`[data-help-count="${field}"]`);if(count)count.textContent=draft[field].length+' / '+REPORT_LIMITS[field];
    if(errors[field]){delete errors[field];event.target.removeAttribute('aria-invalid');hostDocument.getElementById('support-'+field+'-error').textContent='';}
  }
  content.addEventListener('input',capture);content.addEventListener('change',capture);
  content.addEventListener('submit',event=>{
    if(event.target.id!=='support-form')return;event.preventDefault();
    for(const node of event.target.elements)if(Object.hasOwn(draft,node.name))draft[node.name]=node.value;
    errors=validateReport(draft);if(Object.keys(errors).length)showForm();else showPreview();
  });
  content.addEventListener('click',event=>{
    const action=event.target.closest('[data-help-action]')?.dataset.helpAction;
    if(action==='report')openReport();
    else if(action==='home')showHome();
    else if(action==='edit'){errors={};showForm();}
    else if(action==='copy')void copy();
    else if(action==='select')select();
    else if(action==='download')download();
    else if(action==='tutorial')openTutorial();
    else if(action==='settings')openSettings();
    else if(action==='module-guide'&&context?.screen==='module')openModuleGuide?.();
  });
  return {open,refresh(){if(view==='preview')showPreview();else if(view==='form')showForm();else showHome();}};
}
