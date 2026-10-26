import {shapeArt,icon} from './art.mjs';
import {escapeHtml} from './format.mjs';

const COPY={
  watch:['Lihat cara','Watch how'],replay:['Main semula','Replay'],pause:['Jeda','Pause'],resume:['Sambung','Resume'],
  pick:['Pilih kad','Choose a card'],scan:['Sentuh pengimbas','Tap the scanner'],pair:['Pasangan betul','Correct pair'],
  solid:['Bongkah → R1','Solid → R1'],net:['Bentangan → R2','Net → R2'],score:['Padan → +1','Match → +1'],
  modes:[['Kuiz · 10','Quiz · 10'],['Latihan · 15','Practice · 15'],['Ulang yang salah','Practise missed']],
  duel:[['Cipta / sertai','Create / join'],['Kongsi PIN','Share PIN'],['Kedua-dua sedia','Both ready']],
  module:[['Putar & zum','Rotate & zoom'],['Lihat nota','View notes'],['Cuba makmal','Try labs']],
  accounts:[['Buka Akaun','Open Accounts'],['Log masuk','Sign in'],['Sertai kelas','Join a class']],
  settings:[['Pilih bahasa','Choose language'],['Besarkan teks','Enlarge text'],['Laras audio','Adjust audio']],
  connection:[['Semak rangkaian','Check network'],['Cuba semula','Try again'],['Lapor masalah','Report a problem']]
};
const words=(key,en)=>COPY[key][en?1:0];
/** Demonstration art only. Never reads or writes a live question or answer. */
export function helpVisual(topic='play',language='ms',step=null){
  const en=language==='en',text=k=>escapeHtml(words(k,en));
  if(topic!=='play'){
    const symbols={modes:['trophy','bulb','skip'],duel:['user','arrow','check'],module:['bulb','help','settings'],accounts:['user','lock','home'],settings:['help','settings','sound'],connection:['help','arrow','help']};
    if(!Object.hasOwn(symbols,topic))return '';
    return `<div class="help-story" aria-label="${text('watch')}">${symbols[topic].map((symbol,i)=>`<div class="help-story-step"><span class="help-story-number">${i+1}</span><span class="help-story-picture" aria-hidden="true">${topic==='module'&&i===0?shapeArt('cube','solid',true,'violet'):icon(symbol)}</span><b>${escapeHtml(COPY[topic][i][en?1:0])}</b></div>`).join('')}</div>`;
  }
  const stage=step===1?'net':'solid';
  const scan=step===2?'R2':stage==='net'?'R2':'R1';
  const result=step===2;
  return `<figure class="help-demo" data-help-demo data-demo-state="playing">
    <div class="help-demo-scene" role="img" aria-label="${text(result?'pair':stage==='net'?'net':'solid')}. ${text('pick')}. ${text('scan')}.">
      <div class="help-demo-card" aria-hidden="true">${shapeArt('cube',stage,true,'violet')}<b>${text(stage==='net'?'net':'solid')}</b></div>
      <div class="help-demo-route" aria-hidden="true">${icon('arrow')}<span class="help-demo-hand">☝</span></div>
      <div class="help-demo-pad" aria-hidden="true"><span>${scan}</span>${result?shapeArt('cube','net',true,'orange'):icon('check')}<b>${result?'+1':text('scan')}</b></div>
      <span class="help-demo-success" aria-hidden="true">${icon('check')} ${result?'+1':scan}</span>
    </div>
    <figcaption>${result?`<span>R1 ✓</span><span>R2 ✓</span><span>+1</span>`:`<span><b>1</b> ${text('pick')}</span><span><b>2</b> ${text('scan')}</span>`}${step===null?`<span>R1 → R2 → +1</span>`:''}</figcaption>
    <div class="help-demo-controls"><button type="button" class="button button-quiet" data-demo-action="pause" data-pause="${text('pause')}" data-resume="${text('resume')}" aria-pressed="false">${text('pause')}</button><button type="button" class="button button-outline" data-demo-action="replay">${text('replay')}</button></div>
  </figure>`;
}
const installed=new WeakSet();
export function installHelpVisuals(host){
  if(installed.has(host))return;installed.add(host);
  host.addEventListener('click',event=>{
    const button=event.target.closest('[data-demo-action]'),demo=button?.closest('[data-help-demo]');if(!demo)return;
    const pause=demo.querySelector('[data-demo-action="pause"]');
    if(button.dataset.demoAction==='replay'){
      demo.dataset.demoState='restart';void demo.offsetWidth;demo.dataset.demoState='playing';
      pause.setAttribute('aria-pressed','false');pause.textContent=pause.dataset.pause;
    }else{
      const paused=demo.dataset.demoState!=='paused';demo.dataset.demoState=paused?'paused':'playing';
      pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?pause.dataset.resume:pause.dataset.pause;
    }
  });
}
