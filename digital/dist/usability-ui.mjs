import {shapeArt,icon} from './art.mjs';
import {savePreferences} from './usability.mjs';

/** Dialog views only. Gameplay, language and audio continue to have one owner. */
export function createUsabilityUI({storage,preferences,t,openDialog,closeDialog,onStart,onTextSize,onTheme}){
  const $=id=>document.getElementById(id),panel=$('settings-panel'),home=$('settings-home');
  let step=0,beginAfterGuide=false,themeChoice='system',savingFailed=false;
  try{const saved=storage.getItem('geodecoder.theme.v1');if(['light','dark'].includes(saved))themeChoice=saved;}catch{}
  function persist(){savingFailed=!savePreferences(storage,preferences);refreshSettings();}
  function refreshSettings(){
    $('text-size-select').value=String(preferences.textSize);$('theme-select').value=themeChoice;
    $('settings-notice').textContent=t(savingFailed?'ease.preferencesDenied':'ease.devicePreferences');
  }
  function stash(){if(panel.parentElement!==home){panel.hidden=true;home.append(panel);}}
  function openSettings(){
    openDialog('settings',t('ease.settings'),'');
    $('dialog-content').append(panel);panel.hidden=false;refreshSettings();$('language-select').focus({preventScroll:true});
  }
  function renderTutorial(){
    const active=step+1,art=step===0?shapeArt('cube','solid',true,'violet'):step===1?shapeArt('cube','net',true,'orange'):shapeArt('cube','solid',true,'violet')+icon('arrow')+shapeArt('cube','net',true,'orange');
    openDialog('tutorial',t('ease.tutorial'),`<div class="tutorial-content"><p id="tutorial-progress" class="eyebrow" aria-live="polite">${t('ease.tutorialProgress',{step:active})}</p><div class="tutorial-art" aria-hidden="true">${art}</div><h3>${t('ease.tutorial'+active+'Title')}</h3><p>${t('ease.tutorial'+active+'Copy')}</p><p class="tutorial-keyboard">${t('ease.keyboardNote')}</p>${beginAfterGuide?`<p class="tutorial-clock">${t('ease.tutorialSoloClock')}</p>`:''}<div class="tutorial-actions">${step?`<button class="button button-outline" data-dialog-action="tutorial-previous">${t('ease.previous')}</button>`:''}${step<2?`<button class="button button-primary" data-dialog-action="tutorial-next" data-autofocus>${t('ease.next')} ${icon('arrow')}</button>`:`<button class="button button-primary" data-dialog-action="tutorial-finish" data-autofocus>${t(beginAfterGuide?'ease.start':'ease.close')}</button>`}</div>${beginAfterGuide&&step<2?`<button class="button button-quiet tutorial-skip" data-dialog-action="tutorial-skip">${t('ease.skipGuide')}</button>`:''}</div>`);
  }
  function openTutorial({start=false}={}){step=0;beginAfterGuide=start;renderTutorial();}
  function finishTutorial(){preferences.tutorialSeen=true;persist();const begin=beginAfterGuide;beginAfterGuide=false;closeDialog();if(begin)onStart();}
  function handleAction(action){
    if(action==='tutorial-open'){openTutorial();return true;}
    if(action==='tutorial-next'){step=Math.min(2,step+1);renderTutorial();return true;}
    if(action==='tutorial-previous'){step=Math.max(0,step-1);renderTutorial();return true;}
    if(action==='tutorial-finish'||action==='tutorial-skip'){finishTutorial();return true;}
    return false;
  }
  $('settings-button').addEventListener('click',openSettings);
  $('text-size-select').addEventListener('change',event=>{preferences.textSize=Number(event.target.value);onTextSize(preferences.textSize);persist();});
  $('theme-select').addEventListener('change',event=>{themeChoice=event.target.value;onTheme(themeChoice);});
  refreshSettings();onTextSize(preferences.textSize);
  return {openSettings,openTutorial,handleAction,stash,persist,refreshSettings,refreshTutorial:renderTutorial};
}
