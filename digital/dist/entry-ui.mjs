import {shapeArt,icon} from './art.mjs';
import {entryIcon,geometryKit} from './entry-art.mjs';
import {escapeHtml} from './format.mjs';
import {modeCards,guideSteps,infoPanel,sceneContents} from './entry-components.mjs';
import {createEntryScenes} from './entry-scenes.mjs';

/** Presentation for the four entry pages. Game, preferences and storage stay in app.mjs. */
export function createEntryUI({t,getLanguage,onNavigate,onLanguage,onResume,onNew,onGuideBack,onGuideFinish,onToggleMotion}) {
  const $=id=>document.getElementById(id);
  let current='welcome',elapsed=0,playing=false,lastTick=0,animation=0,lastStep=-1;
  $('game-mode-options').insertAdjacentHTML('beforeend',modeCards(t));
  $('guide-steps').innerHTML=guideSteps(t);
  $('geometry-kit').innerHTML=sceneContents(geometryKit());
  const resumeArt=document.querySelector('.resume-art');
  resumeArt.innerHTML=sceneContents(shapeArt('cube','solid',true,'blue')+shapeArt('cube','solid',true,'yellow'));
  document.querySelectorAll('[data-entry-icon]').forEach(node=>{node.classList.add('entry-icon');node.innerHTML=entryIcon(node.dataset.entryIcon);});
  const scenes=createEntryScenes({t,onToggleMotion});
  const duration=4.8;
  const time=value=>'00:'+Number(value).toFixed(1).padStart(4,'0');
  function renderDemo(){
    const step=elapsed>=duration*2/3?2:elapsed>=duration/3?1:0;
    document.querySelectorAll('[data-guide-step]').forEach((node,index)=>node.classList.toggle('guide-step-active',elapsed>0&&step===index));
    $('entry-demo-position').value=String(elapsed);
    $('entry-demo-position').setAttribute('aria-valuetext',`${time(elapsed)} / ${time(duration)}`);
    $('entry-demo-time').textContent=`${time(elapsed)} / ${time(duration)}`;
    $('entry-demo-play').innerHTML=icon(playing?'pause':'play');
    // art.mjs has no play symbol; use the shared entry icon for that control.
    if(!playing)$('entry-demo-play').innerHTML=entryIcon('play');
    $('entry-demo-play').setAttribute('aria-label',t(playing?'entry.demoPause':'entry.demoPlay'));
    $('entry-demo-play').setAttribute('aria-pressed',String(playing));
    $('entry-demo-pause').innerHTML=icon(playing?'pause':'play')+`<span>${t(playing?'entry.pause':'entry.continue')}</span>`;
    if(!playing)$('entry-demo-pause').innerHTML=entryIcon('play')+`<span>${t('entry.continue')}</span>`;
    $('entry-demo-pause').setAttribute('aria-label',t(playing?'entry.demoPause':'entry.demoPlay'));
    if(step!==lastStep||elapsed===0||elapsed===duration){
      $('entry-demo-status').textContent=t(elapsed===0?'entry.demoReady':elapsed===duration?'entry.demoDone':`entry.step${step+1}Copy`);
      lastStep=step;
    }
  }
  function pauseDemo(){playing=false;cancelAnimationFrame(animation);animation=0;renderDemo();}
  function tick(at){
    if(!playing)return;
    elapsed=Math.min(duration,elapsed+Math.max(0,at-lastTick)/1000);lastTick=at;
    if(elapsed===duration)playing=false;
    renderDemo();if(playing)animation=requestAnimationFrame(tick);
  }
  function playDemo(){
    if(playing){pauseDemo();return;}
    if(elapsed>=duration)elapsed=0;
    playing=true;lastTick=performance.now();renderDemo();animation=requestAnimationFrame(tick);
  }
  $('entry-demo-play').addEventListener('click',playDemo);
  $('entry-demo-pause').addEventListener('click',playDemo);
  $('entry-demo-replay').addEventListener('click',()=>{pauseDemo();elapsed=0;playDemo();});
  $('entry-demo-position').addEventListener('input',event=>{const position=Number(event.target.value)||0;pauseDemo();elapsed=Math.max(0,Math.min(duration,position));renderDemo();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseDemo();});
  $('guide-back-button').addEventListener('click',onGuideBack);
  $('guide-start-button').addEventListener('click',onGuideFinish);
  $('resume-continue-button').addEventListener('click',onResume);
  $('resume-new-button').addEventListener('click',onNew);
  document.addEventListener('click',event=>{
    const destination=event.target.closest('[data-entry-route]');
    if(destination){event.preventDefault();onNavigate(destination.dataset.entryRoute);}
    const language=event.target.closest('[data-entry-language]');
    if(language)onLanguage(language.dataset.entryLanguage);
  });
  document.querySelectorAll('input[name="game-mode-option"]').forEach(radio=>{
    radio.addEventListener('change',()=>{
      if(!radio.checked)return;
      $('play-mode').value=radio.value;
      $('play-mode').dispatchEvent(new Event('change',{bubbles:true}));
    });
  });
  function syncMode(){
    document.querySelectorAll('input[name="game-mode-option"]').forEach(radio=>{radio.checked=radio.value===$('play-mode').value;});
  }
  function syncTheme(){
    const dark=document.documentElement.dataset.theme==='dark';
    $('theme-button').setAttribute('aria-label',t(dark?'entry.themeLight':'entry.themeDark'));
    $('theme-button').title=t(dark?'entry.themeLight':'entry.themeDark');
  }
  document.addEventListener('geodecoder:theme',syncTheme);
  function syncLanguage(){
    document.querySelectorAll('[data-entry-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.entryLanguage===getLanguage())));
    syncTheme();lastStep=-1;renderDemo();scenes.syncLanguage();
  }
  function sync(screen){
    current=screen;document.body.dataset.screen=screen;
    const route=screen==='welcome'?'home':['guest','resume','game','result','duel'].includes(screen)?'play':['guide','module'].includes(screen)?'learn':'classes';
    document.querySelectorAll('.primary-navigation [data-entry-route]').forEach(link=>{
      if(link.dataset.entryRoute===route)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    if(screen!=='guide')pauseDemo();scenes.sync();
  }
  function resetGuide(){pauseDemo();elapsed=0;lastStep=-1;renderDemo();}
  function renderResume(snapshot,status){
    const exists=!!snapshot&&snapshot.state.status!=='finished';
    $('resume-continue-button').hidden=!exists;
    $('resume-new-button').textContent=t(exists||status==='invalid'?'entry.new':'entry.start');
    $('resume-subtitle').textContent=t(exists?'entry.resumeCopy':status==='invalid'?'entry.invalidSaveCopy':status==='failed'?'entry.failedSaveCopy':'entry.noSaveCopy');
    const details=$('resume-details');
    if(!exists){
      details.innerHTML=`<div class="resume-empty"><span class="resume-empty-icon" aria-hidden="true">${entryIcon(status==='invalid'||status==='failed'?'info':'play')}</span><h2>${t(status==='invalid'?'entry.invalidSave':status==='failed'?'entry.failedSave':'entry.noSave')}</h2><p>${t('entry.saveScope')}</p></div>`;
      return;
    }
    const total=snapshot.questionIds.length,answered=snapshot.state.answers.length;
    const savedAt=Number.isFinite(snapshot.savedAt)&&snapshot.savedAt>0&&snapshot.savedAt<=Date.now()+60000?new Intl.DateTimeFormat(getLanguage()==='en'?'en-MY':'ms-MY',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kuala_Lumpur'}).format(new Date(snapshot.savedAt)):t('entry.earlierSave');
    const mode=t(snapshot.mode==='practice'?'entry.practice':snapshot.mode==='review'?'ease.reviewMode':'entry.quiz');
    details.innerHTML=`<dl class="resume-facts"><div><dt>${t('entry.nickname')}</dt><dd>${escapeHtml(snapshot.player.name)}</dd></div><div><dt>${t('entry.mode')}</dt><dd>${escapeHtml(mode)}</dd></div><div class="resume-progress-row"><dt>${t('entry.progress')}</dt><dd><b>${answered} / ${total}</b><progress value="${answered}" max="${total}" aria-label="${t('entry.progress')}">${answered} / ${total}</progress></dd></div><div><dt>${t('entry.savedAt')}</dt><dd>${escapeHtml(savedAt)}</dd></div></dl>${infoPanel(t('entry.saveScope'))}`;
  }
  syncMode();syncLanguage();sync(current);
  return {sync,syncMode,syncLanguage,renderResume,resetGuide};
}
