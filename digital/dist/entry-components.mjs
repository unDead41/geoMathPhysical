import {shapeArt,icon} from './art.mjs';
import {entryIcon} from './entry-art.mjs';

/** Reusable entry components. Configuration, markup and icons each have one owner. */
export const ENTRY_MODES=Object.freeze([
  {value:'quiz',icon:'quiz',title:'entry.quiz',copy:'entry.quizNote'},
  {value:'practice',icon:'cap',title:'entry.practice',copy:'entry.practiceNote'},
  {value:'duel',icon:'users',title:'entry.duel',copy:'entry.duelNote'}
]);

export function modeCard(mode,t){
  return `<label class="mode-card ${mode.value}"><input type="radio" name="game-mode-option" value="${mode.value}"${mode.value==='quiz'?' checked':''} aria-labelledby="mode-${mode.value}-title" aria-describedby="mode-${mode.value}-copy">${sceneArt(mode.value,entryIcon(mode.icon),'mode-art')}<strong id="mode-${mode.value}-title" data-i18n="${mode.title}">${t(mode.title)}</strong><span id="mode-${mode.value}-copy" data-i18n="${mode.copy}">${t(mode.copy)}</span></label>`;
}
export function modeCards(t){return ENTRY_MODES.map(mode=>modeCard(mode,t)).join('');}

export function sceneContents(fallback){return `<canvas aria-hidden="true"></canvas><span class="entry-scene-fallback" aria-hidden="true">${fallback}</span>`;}
export function sceneArt(type,fallback,className=''){return `<span class="entry-scene ${className}" data-entry-scene="${type}" aria-hidden="true">${sceneContents(fallback)}</span>`;}

export function guideStep(step,t){
  const number=step+1;
  return `<li class="guide-step" data-guide-step="${number}"><span class="guide-step-number" aria-hidden="true">${number}</span><div class="guide-step-copy"><h2 data-i18n="entry.step${number}">${t(`entry.step${number}`)}</h2><p data-i18n="entry.step${number}Copy">${t(`entry.step${number}Copy`)}</p></div><div class="guide-picture" aria-hidden="true">${sceneArt(step===1?'net':step===2?'pair':'cube',shapeArt('cube',step===1?'net':'solid',true,step===1?'orange':'blue'))}${step===2?`<span class="guide-correct">${icon('check')}</span>`:''}</div></li>`;
}
export function guideSteps(t){return [0,1,2].map((step,index)=>`${index?`<li class="guide-arrow" aria-hidden="true">${icon('arrow')}</li>`:''}${guideStep(step,t)}`).join('');}

export function infoPanel(message){return `<p class="entry-info">${entryIcon('info')}<span>${message}</span></p>`;}
