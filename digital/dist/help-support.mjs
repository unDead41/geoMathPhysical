import {helpVisual,installHelpVisuals} from './help-visuals.mjs';
import {escapeHtml} from './format.mjs';
import {icon} from './art.mjs';
import {sceneIllustration} from './entry-art.mjs';
import {HELP_GUIDES} from './help-copy.mjs';
import {createReportContext,formatReport,validateReport,redactReportText,REPORT_CATEGORIES,REPORT_LIMITS} from './support-report.mjs';

/** Local-only help/report views; the app keeps modal, focus and clock ownership. */
export function createHelpSupport({t,getLanguage,getContext,openDialog,openTutorial,openSettings,openModuleGuide,hostDocument=document,hostWindow=window}){
  const content=hostDocument.getElementById('dialog-content');
  installHelpVisuals(content);
  let view='home',draft={category:'game',description:'',steps:'',expected:'',actual:''};
  let context=null,errors={},preview='',revision=0,copying=false,activeGuide='play',searchQuery='';
  const text=(key,params)=>escapeHtml(t('help.'+key,params));
  const button=(action,label,primary=false)=>`<button type="button" class="button ${primary?'button-primary':'button-outline'}" data-help-action="${action}">${text(label)}</button>`;
  const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
  const searchIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';
  const reportIcon='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M9 5 7 2m8 3 2-3M5 9H2m3 6H2m20-6h-3m3 6h-3M7 20l-2 2m12-2 2 2M8 7a4 4 0 0 1 8 0m-4 3v9"/><rect x="5" y="7" width="14" height="14" rx="6"/></svg>';
  function resetScroll(){hostDocument.getElementById('app-dialog').scrollTop=0;}
  function clockNote(){
    const c=context||createReportContext(getContext());
    const key=c.screen==='module'?'clockModule':c.screen!=='game'?null:c.mode==='duel'?'clockDuel':c.mode==='classroom'?'clockRoom':'clockSolo';
    return key?`<p class="help-clock" role="note">${text(key)}</p>`:'';
  }
  function guideActions(guide){
    return guide.tutorial?button('tutorial','viewGuide'):guide.settings?button('settings','settings'):guide.moduleGuide&&context?.screen==='module'?button('module-guide','moduleGuide'):button('details','viewGuide');
  }
  function guideHero(){
    const guide=HELP_GUIDES.find(item=>item.id===activeGuide)||HELP_GUIDES[0];
    return `<div class="help-hero-art">${helpVisual(guide.id,getLanguage(),guide.id==='play'?2:null)}</div><div class="help-hero-copy"><h4>${text(guide.id==='play'?'play.hero':guide.id+'.title')}</h4><p>${text(guide.id==='play'?'play.heroCopy':guide.id+'.1')}</p>${guideActions(guide)}</div>`;
  }
  function showHome(){
    view='home';revision++;copying=false;
    const symbols={play:'cursor',modes:'trophy',duel:'user',module:'bulb',accounts:'user',settings:'settings',connection:'refresh'};
    openDialog('help',t('help.title'),`<div class="help-centre utility-workspace" data-help-view="home">
      <aside class="utility-rail help-rail" aria-labelledby="help-rail-title"><h3 id="help-rail-title">${icon('help')}<span>${text('title')}</span></h3><p>${text('railIntro')}</p>
        <nav class="help-topic-nav" aria-label="${text('guides')}">${HELP_GUIDES.map(guide=>`<button type="button" data-help-topic="${guide.id}" aria-pressed="${guide.id===activeGuide}">${icon(symbols[guide.id])}<span>${text('nav.'+guide.id)}</span></button>`).join('')}</nav>
        <div class="help-rail-report">${button('report','report')}</div>
      </aside>
      <div class="help-workspace"><h3 class="utility-main-title">${text('actionQuestion')}</h3>
        <div class="field help-search-field"><label for="help-search" class="sr-only">${text('search')}</label><div>${searchIcon}<input id="help-search" type="search" autocomplete="off" placeholder="${text('search')}" value="${escapeHtml(searchQuery)}" data-autofocus aria-controls="help-faq"></div></div>
        <p id="help-search-status" class="help-search-status" role="status" aria-live="polite"></p>
        ${clockNote()}<section class="help-guide-hero" aria-label="${text('guides')}">${guideHero()}</section>
        <h4 class="help-guides-title" id="help-faq-title">${text('faq')}</h4>
        <div class="help-guides" id="help-faq" aria-labelledby="help-faq-title">${HELP_GUIDES.map(guide=>`<details data-help-guide="${guide.id}"><summary>${text('faq.'+guide.id)}</summary><div class="help-guide-copy">${guide.id==='play'?'<ol>':'<ul>'}${Array.from({length:guide.lines},(_,i)=>`<li>${text(guide.id+'.'+(i+1))}</li>`).join('')}${guide.id==='play'?'</ol>':'</ul>'}${guide.id==='play'?'':helpVisual(guide.id,getLanguage())}</div></details>`).join('')}</div>
      </div>
    </div>`);filterGuides();resetScroll();
  }
  function filterGuides(){
    if(view!=='home')return;
    const query=normalize(searchQuery.trim()),featured=new Set([activeGuide,'modes',activeGuide==='connection'?'play':'connection']);let count=0;
    for(const guide of HELP_GUIDES){
      const searchable=[t('help.nav.'+guide.id),t('help.'+guide.id+'.title'),t('help.faq.'+guide.id),...Array.from({length:guide.lines},(_,i)=>t('help.'+guide.id+'.'+(i+1)))].join(' ');
      const matches=!query||normalize(searchable).includes(query);if(matches)count++;
      const faq=content.querySelector(`[data-help-guide="${guide.id}"]`),topic=content.querySelector(`[data-help-topic="${guide.id}"]`);
      faq.hidden=!matches||(!query&&!featured.has(guide.id));topic.hidden=!matches;if(query)faq.open=matches;
    }
    content.querySelector('.help-guide-hero').hidden=Boolean(query);
    content.querySelector('#help-search-status').textContent=query?t('help.'+(count?'searchResults':'searchEmpty'),{count}):'';
  }
  function selectGuide(id){
    if(!HELP_GUIDES.some(guide=>guide.id===id)||view!=='home')return;
    activeGuide=id;searchQuery='';content.querySelector('#help-search').value='';
    for(const topic of content.querySelectorAll('[data-help-topic]'))topic.setAttribute('aria-pressed',String(topic.dataset.helpTopic===id));
    content.querySelector('.help-guide-hero').innerHTML=guideHero();filterGuides();
    for(const faq of content.querySelectorAll('[data-help-guide]'))faq.open=faq.dataset.helpGuide===id;
  }
  function reportRail(){
    return `<aside class="utility-rail support-rail" aria-labelledby="support-rail-title"><h3 id="support-rail-title">${reportIcon}<span>${text('report')}</span></h3><p>${text('reportRail')}</p><details class="support-privacy-details"><summary>${icon('lock')} ${text('reportPrivacy')}</summary><p class="support-privacy" id="support-privacy">${text('privacy')}</p></details><div class="support-rail-back">${button('home','back')}</div><div class="utility-rail-art">${sceneIllustration({variant:'cluster'})}</div></aside>`;
  }
  function formField(field,max){
    const error=errors[field],message=error?t('help.'+error,{max}):'';
    return `<div class="field support-field"><label for="support-${field}">${text(field)}</label><div class="support-field-control"><textarea id="support-${field}" name="${field}" rows="${field==='steps'?3:2}" maxlength="${max}" required aria-describedby="support-${field}-hint support-${field}-error" ${error?'aria-invalid="true"':''} style="resize:none">${escapeHtml(draft[field])}</textarea><div id="support-${field}-hint" class="support-field-hint"><span>${text('limit',{max})}</span><output data-help-count="${field}">${draft[field].length} / ${max}</output></div><span class="field-error" id="support-${field}-error">${escapeHtml(message)}</span></div></div>`;
  }
  function draftPreview(){return Object.keys(validateReport(draft)).length?'':formatReport(draft,context,getLanguage());}
  function showForm(){
    view='form';revision++;copying=false;
    const ready=draftPreview();
    openDialog('help',t('help.report'),`<div data-help-view="form" class="help-centre utility-workspace">${reportRail()}
      <div class="support-workspace"><h3 class="utility-main-title">${text('reportHeading')}</h3>${clockNote()}
      <form id="support-form" class="support-form" novalidate aria-describedby="support-local support-draft">
        <div class="field support-field"><label for="support-category">${text('category')}</label><div class="support-field-control"><select id="support-category" name="category" required ${errors.category?'aria-invalid="true"':''} aria-describedby="support-category-error">${REPORT_CATEGORIES.map(id=>`<option value="${id}" ${draft.category===id?'selected':''}>${text('category.'+id)}</option>`).join('')}</select><span class="field-error" id="support-category-error">${errors.category?text('required'):''}</span></div></div>
        ${formField('description',REPORT_LIMITS.description)}${formField('steps',REPORT_LIMITS.steps)}
        <details class="support-extra" open><summary>${text('reportExtra')}</summary><div>${formField('expected',REPORT_LIMITS.expected)}${formField('actual',REPORT_LIMITS.actual)}</div></details>
        <div class="support-preview-card"><label class="support-preview-label" for="support-draft-preview">${text('preview')}</label><textarea id="support-draft-preview" class="support-preview support-draft-preview" rows="5" readonly spellcheck="false" placeholder="${text('reportPreviewEmpty')}" aria-describedby="support-local">${escapeHtml(ready)}</textarea></div>
        <footer class="support-form-footer"><p class="support-local" id="support-local">${icon('help')}<span>${text('reportPrepared')}</span></p><button class="button button-primary" type="submit">${text('preview')} ${icon('arrow')}</button></footer>
        <p class="settings-notice" id="support-draft">${text('draft')}</p>
      </form></div></div>`);
    resetScroll();
    const invalid=content.querySelector('[aria-invalid="true"]');if(invalid){invalid.closest('details')?.setAttribute('open','');invalid.focus();invalid.scrollIntoView({block:'nearest',behavior:'instant'});}
  }
  function showPreview(){
    view='preview';revision++;copying=false;
    preview=formatReport(draft,context,getLanguage());
    openDialog('help',t('help.preview'),`<div class="help-centre utility-workspace" data-help-view="preview">${reportRail()}
      <div class="support-workspace"><h3 class="utility-main-title">${text('reportHeading')}</h3>${clockNote()}
      <div class="support-reviewed-fields"><div class="support-reviewed-category"><b>${text('category')}</b><span>${text('category.'+draft.category)}</span></div>${['description','steps'].map(field=>`<div><b>${text(field)}</b><p>${escapeHtml(redactReportText(draft[field],t('help.hidden')))}</p></div>`).join('')}<details class="support-extra"><summary>${text('reportExtra')}</summary>${['expected','actual'].map(field=>`<div><b>${text(field)}</b><p>${escapeHtml(redactReportText(draft[field],t('help.hidden')))}</p></div>`).join('')}</details></div>
      <div class="support-preview-card"><label class="support-preview-label" for="support-preview">${text('preview')}</label>
      <textarea id="support-preview" class="support-preview" rows="8" readonly spellcheck="false" aria-describedby="support-review" style="resize:none" data-autofocus>${escapeHtml(preview)}</textarea></div>
      <details class="support-review-note"><summary>${text('reviewPrivacy')}</summary><p id="support-review">${text('review')}</p></details>
      <div class="support-ready-footer"><p class="support-local">${icon('help')}<span>${text('reportPrepared')}</span></p><div class="support-actions">${button('copy','copy',true)}${button('select','select')}${button('download','download')}</div></div>
      <div class="support-preview-edit">${button('edit','edit')}<p class="support-status" id="support-status" role="status" aria-live="polite"></p></div>
      </div></div>`);resetScroll();
  }
  function open(){context=createReportContext(getContext());activeGuide=context.screen==='module'?'module':context.screen==='portal'?'accounts':context.mode==='duel'?'duel':'play';searchQuery='';showHome();}
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
    if(event.target.id==='help-search'){searchQuery=event.target.value;filterGuides();return;}
    const field=event.target.name;
    if(!event.target.closest('#support-form')||!['category',...Object.keys(REPORT_LIMITS)].includes(field))return;
    draft[field]=event.target.value;
    const count=content.querySelector(`[data-help-count="${field}"]`);if(count)count.textContent=draft[field].length+' / '+REPORT_LIMITS[field];
    if(errors[field]){delete errors[field];event.target.removeAttribute('aria-invalid');hostDocument.getElementById('support-'+field+'-error').textContent='';}
    const node=hostDocument.getElementById('support-draft-preview');if(node)node.value=draftPreview();
  }
  content.addEventListener('input',capture);content.addEventListener('change',capture);
  content.addEventListener('submit',event=>{
    if(event.target.id!=='support-form')return;event.preventDefault();
    for(const node of event.target.elements)if(Object.hasOwn(draft,node.name))draft[node.name]=node.value;
    errors=validateReport(draft);if(Object.keys(errors).length)showForm();else showPreview();
  });
  content.addEventListener('click',event=>{
    const topic=event.target.closest('[data-help-topic]')?.dataset.helpTopic;if(topic){selectGuide(topic);return;}
    const action=event.target.closest('[data-help-action]')?.dataset.helpAction;
    if(action==='report')openReport();
    else if(action==='home')showHome();
    else if(action==='edit'){errors={};showForm();}
    else if(action==='copy')void copy();
    else if(action==='select')select();
    else if(action==='download')download();
    else if(action==='tutorial')openTutorial();
    else if(action==='settings')openSettings();
    else if(action==='details'){const guide=content.querySelector(`[data-help-guide="${activeGuide}"]`);if(guide){guide.open=true;guide.querySelector('summary').focus();guide.scrollIntoView({block:'nearest',behavior:'instant'});}}
    else if(action==='module-guide'&&context?.screen==='module')openModuleGuide?.();
  });
  return {open,refresh(){if(view==='preview')showPreview();else if(view==='form')showForm();else showHome();}};
}
