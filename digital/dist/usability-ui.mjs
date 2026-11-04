import {helpVisual,installHelpVisuals} from './help-visuals.mjs';
import {icon} from './art.mjs';


/** Dialog views only. Gameplay, language and audio continue to have one owner. */
export function createUsabilityUI({storage,preferenceStore,t,openDialog,closeDialog,onStart,onTheme,onTestSound,onHelp}){
  const $=id=>document.getElementById(id),panel=$('settings-panel'),home=$('settings-home');
  installHelpVisuals($('dialog-content'));
  let step=0,beginAfterGuide=false,returnToHelp=false,themeChoice='system';
  try{const saved=storage.getItem('geodecoder.theme.v1');if(['light','dark'].includes(saved))themeChoice=saved;}catch{}
  document.addEventListener('geodecoder:theme',event=>{themeChoice=event.detail?.preference||'system';refreshSettings();});
  function persist(){refreshSettings();}
  function refreshSettings(){
    const preferences=preferenceStore.value;
    $('text-size-select').value=String(({normal:100,large:125,largest:150})[preferences.text]);$('theme-select').value=themeChoice;
    for(const node of panel.querySelectorAll('[data-pref]')){const value=preferences[node.dataset.pref];if(node.type==='checkbox')node.checked=value===true;else node.value=String(value);}
    for(const node of panel.querySelectorAll('[data-volume]'))node.textContent=preferences[node.dataset.volume]+'%';
    $('settings-notice').textContent=t(preferenceStore.failed?'ease.preferencesDenied':'ease.devicePreferences');
  }
  function stash(){if(panel.parentElement!==home){panel.hidden=true;home.append(panel);}}
  function openSettings(){
    openDialog('settings',t('ease.settings'),'');
    $('dialog-content').append(panel);panel.hidden=false;refreshSettings();$('language-select').focus({preventScroll:true});
  }
  function renderTutorial(){
    const active=step+1;
    openDialog('tutorial',t('ease.tutorial'),`<div class="tutorial-content"><p id="tutorial-progress" class="eyebrow" aria-live="polite">${t('ease.tutorialProgress',{step:active})}</p>${helpVisual('play',document.documentElement.lang,step)}<h3>${t('ease.tutorial'+active+'Title')}</h3><p>${t('ease.tutorial'+active+'Copy')}</p><details class="tutorial-keyboard"><summary>${t('help.keyboard')}</summary><p>${t('ease.keyboardNote')}</p></details>${beginAfterGuide?`<p class="tutorial-clock">${t('ease.tutorialSoloClock')}</p>`:''}<div class="tutorial-actions">${step?`<button class="button button-outline" data-dialog-action="tutorial-previous">${t('ease.previous')}</button>`:''}${step<2?`<button class="button button-primary" data-dialog-action="tutorial-next" data-autofocus>${t('ease.next')} ${icon('arrow')}</button>`:`<button class="button button-primary" data-dialog-action="tutorial-finish" data-autofocus>${t(beginAfterGuide?'ease.start':'ease.close')}</button>`}</div>${returnToHelp?`<button type="button" class="button button-quiet" data-dialog-action="help-open">${t('help.back')}</button>`:''}${beginAfterGuide&&step<2?`<button class="button button-quiet tutorial-skip" data-dialog-action="tutorial-skip">${t('ease.skipGuide')}</button>`:''}</div>`);
  }
  function openTutorial({start=false,fromHelp=false}={}){step=0;beginAfterGuide=start;returnToHelp=fromHelp;renderTutorial();}
  function finishTutorial(){preferenceStore.set({tutorialSeen:true});persist();const begin=beginAfterGuide,back=returnToHelp;beginAfterGuide=false;returnToHelp=false;if(back)onHelp();else closeDialog();if(begin)onStart();}
  function handleAction(action){
    if(action==='tutorial-open'){openTutorial();return true;}
    if(action==='tutorial-next'){step=Math.min(2,step+1);renderTutorial();return true;}
    if(action==='tutorial-previous'){step=Math.max(0,step-1);renderTutorial();return true;}
    if(action==='tutorial-finish'||action==='tutorial-skip'){finishTutorial();return true;}
    return false;
  }
  $('settings-button').addEventListener('click',openSettings);
  $('text-size-select').addEventListener('change',event=>{preferenceStore.set({text:({100:'normal',125:'large',150:'largest'})[event.target.value]});persist();});
  function changePreference(event){const node=event.target,key=node.dataset.pref;if(!key)return;preferenceStore.set({[key]:node.type==='checkbox'?node.checked:node.type==='range'?Number(node.value):node.value});refreshSettings();}
  panel.addEventListener('input',event=>{if(event.target.type==='range')changePreference(event);});
  panel.addEventListener('change',event=>{if(event.target.type!=='range')changePreference(event);});
  panel.addEventListener('click',event=>{if(event.target.closest('[data-reset-preferences]')){preferenceStore.reset();themeChoice='system';onTheme(themeChoice);refreshSettings();}if(event.target.closest('[data-test-sound]'))onTestSound?.();});
  $('theme-select').addEventListener('change',event=>{themeChoice=event.target.value;onTheme(themeChoice);});
  refreshSettings();
  return {openSettings,openTutorial,handleAction,stash,persist,refreshSettings,refreshTutorial:renderTutorial};
}
