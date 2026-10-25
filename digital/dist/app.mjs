import {createI18n, translate, localizeQuestion, shapeName} from './i18n.mjs';
import {escapeHtml, formatMathText} from './format.mjs';
import { QUESTIONS } from './questions.mjs';
import { Game, VERSION, formatTime, validatePlayer } from './core.mjs';
import { ScoreStore, csvScores, SCORE_KEY } from './storage.mjs';
import { shapeArt, icon, brandArt, describeShape } from './art.mjs';

const $ = id => document.getElementById(id);
const pretty = formatMathText;
const now = () => performance.now();
let storage;
try { storage = window.localStorage; } catch { storage = {getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');},removeItem(){throw new Error('Storage unavailable');}}; }
const store = new ScoreStore(storage);
const locale = createI18n(storage);
const t = (key,params) => translate(locale.language,key,params);
let screen = 'welcome', game = null, selected = null, acceptedSolid = null, acceptedNet = null;
let player = null, roundId = '', lastResult = null, dialogMode = '', dialogTrigger = null;
let drag = null, suppressClickUntil = 0, hiddenPause = false, sound = false, audioContext = null;
let scoresExpanded = false, lastClock = '', lastLed = {};
const dialog = $('app-dialog');
const languageControl=$('language-control'), languageHome=languageControl.parentElement;
let refreshingLanguage=false, lastStatus=null, validationErrors=null, scoreNotice='', automaticPause=false;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function hydrate(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  root.querySelectorAll('[data-brand]').forEach(el => { el.innerHTML = brandArt(); });
  root.querySelectorAll('[data-art]').forEach(el => { el.innerHTML = shapeArt(el.dataset.art, el.dataset.kind || 'solid', true); });
}
hydrate();

function announce(message) { $('announcer').textContent = ''; requestAnimationFrame(() => { $('announcer').textContent = message; }); }
function setStatus(key, tone = '', symbol = 'cursor', params = {}) {
  if(!refreshingLanguage)lastStatus={key,tone,symbol,params};
  const values={...params};
  if(values.kind)values.kind=t(values.kind);
  $('feedback-text').textContent=t(key,values);
  $('game-status').className=`game-feedback ${tone}`;
  const existing=$('game-status').querySelector('.icon');
  if(existing)existing.outerHTML=icon(symbol);
}
function storageStatus() { $('storage-warning').hidden = !store.failed; }
function showScreen(next) {
  screen = next;
  $('welcome').hidden = next !== 'welcome';
  $('game-screen').hidden = next !== 'game';
  $('result-screen').hidden = next !== 'result';
  updateTitle(next);
  window.scrollTo({top:0,behavior:'instant'});
}
function updateTitle(next=screen) {
  document.title = next === 'welcome' ? t("GeoDecoder Digital — Jom main geometri") : next === 'game' ? t("GeoDecoder Digital — Sedang bermain") : t("GeoDecoder Digital — Keputusan pusingan");
}
function uid() { return globalThis.crypto?.randomUUID?.() || `round-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

$('player-form').addEventListener('submit', event => {
  event.preventDefault();
  if (screen !== 'welcome') return;
  const form = new FormData(event.currentTarget);
  const result = validatePlayer({name:form.get('name'),category:form.get('category'),className:form.get('className')});
  validationErrors=result.errors;
  for (const key of ['name','className']) {
    const field = $(key === 'name' ? 'player-name' : 'player-class');
    $(key + '-error').textContent = (result.errors[key] ? t(result.errors[key]) : '');
    field.setAttribute('aria-invalid', String(!!result.errors[key]));
  }
  $('category-error').textContent = result.errors.category ? t(result.errors.category) : '';
  if (!result.valid) {
    if (result.errors.name) $('player-name').focus();
    else if (result.errors.category) document.querySelector('input[name="category"]').focus();
    else $('player-class').focus();
    announce(t("Maklumat belum lengkap. ") + Object.values(result.errors).map(key=>t(key)).join(' '));
    return;
  }
  player = result.player;
  startGame();
});
for (const [id,key] of [['player-name','name'],['player-class','className']]) {
  $(id).addEventListener('input', () => { $(id).removeAttribute('aria-invalid'); $(key+'-error').textContent = '';if(validationErrors)delete validationErrors[key]; });
}

function startGame() {
  if (!player) return;
  cancelDrag();
  game = new Game(QUESTIONS, player, now());
  roundId = uid(); lastResult = null; lastClock = ''; lastLed = {};
  $('player-initial').textContent = player.name[0].toLocaleUpperCase('ms-MY');
  $('player-display').textContent = player.name;
  $('player-meta').textContent = `${t(player.category)} · ${player.className}`;
  showScreen('game');
  renderQuestion();
  $('question-title').focus({preventScroll:true});
  announce(t("Permainan bermula. Sepuluh soalan. Pilih bongkah untuk R1 dahulu."));
}

function renderQuestion() {
  acceptedSolid = null; acceptedNet = null; selected = null;
  renderQuestionContent();
  renderChoices('solid', game.solidOrder);
  renderChoices('net', game.netOrder);
  setStatus('Baca soalan, kemudian pilih satu bongkah untuk R1.');
  renderState();
}

function renderQuestionContent() {
  const q = localizeQuestion(game.question, locale.language);
  const number = String(game.index+1).padStart(2,'0');
  $('question-counter').textContent = t('question.counter',{number});
  $('question-topic').textContent = q.id.endsWith('2') || q.id === 'C1' ? t("Cabaran rumus") : q.id.endsWith('3') ? t("Cabaran bentangan") : t("Kenali bongkah");
  let heading = t("Bongkah apakah ini?"), detail = q.prompt;
  if (q.id.endsWith('3')) {
    heading = t("Bongkah manakah yang sepadan?");
  } else if (q.prompt.startsWith('V=') || q.prompt.startsWith('L=')) {
    heading = t("Rumus ini mewakili bongkah apa?");
  }
  detail = detail.replace(/Bongkah apakah ini\?|Bentuk apa\?|Which solid is this\?|Which shape is it\?/g,'').trim();
  $('question-title').textContent = heading;
  if (q.id.endsWith('2') || q.id === 'C1') {
    const formulaLines = q.lines.filter(line => /^V=|^L=/.test(line));
    const rest = q.lines.filter(line => !/^V=|^L=/.test(line)).join(' ').replace(/Bongkah apakah ini\?|Bentuk apa\?|Which solid is this\?|Which shape is it\?/g,'').trim();
    $('question-detail').innerHTML = `<span class="formula-line">${formulaLines.map(pretty).join('<br>')}</span>${pretty(rest)}`;
  } else $('question-detail').innerHTML = pretty(detail);
  $('formula-key').hidden = true;
  if (q.id === 'S2') { $('formula-key').textContent = t("V = isi padu · L = luas permukaan · j = jejari · t = tinggi"); $('formula-key').hidden = false; }
  $('hint-text').innerHTML = pretty(q.hint);
  const dots = Array.from({length:10}, (_,i) => {
    const answer = game.answers[i];
    const cls = answer ? answer.outcome : i===game.index ? 'current' : '';
    return `<span class="progress-dot ${cls}" title="${t('question.dot',{number:i+1,state:answer?t(answer.outcome==='correct'?'question.correct':'question.skipped'):i===game.index?t('question.current'):''})}"></span>`;
  }).join('');
  $('progress-dots').innerHTML = dots;
  $('progress-dots').setAttribute('aria-label', t('question.progress',{number:game.index+1,score:game.score,skipped:game.skipped}));

}

function renderChoices(kind, order) {
  $(kind+'-choices').innerHTML = order.map((shape,i) => {
    const letter = String.fromCharCode(65+i), label = kind === 'solid' ? t("bongkah") : t("bentangan");
    return `<button type="button" class="choice ${kind === 'net' ? 'net-choice' : ''}" data-kind="${kind}" data-shape="${shape}" data-letter="${letter}" aria-pressed="false" aria-label="${escapeHtml(t('choice.label',{kind:label,letter,description:describeShape(shape,kind,locale.language)}))}">${shapeArt(shape,kind,true)}<span class="choice-id"><span class="grip" aria-hidden="true">⠿</span>${kind === 'solid' ? t("Bongkah") : t("Kad")} ${letter}</span></button>`;
  }).join('');
}

const emptyScanner = target => `<span class="scan-target"><span class="target-corner tl"></span><span class="target-corner tr"></span><span class="target-corner bl"></span><span class="target-corner br"></span>${icon(target === 'r2' && game.stage === 'solid' ? 'lock':'cursor')}</span><span class="scanner-placeholder">${target==='r1'?t("Letak bongkah di sini"):game.stage==='solid'?t("Kemudian letak bentangan"):t("Letak kad bentangan di sini")}</span>`;

function renderState() {
  if (!game) return;
  const busy = !game.interactive;
  const active = game.stage === 'solid' ? 'r1' : 'r2';
  $('score-value').textContent = game.score;
  $('hint-button').disabled = busy;
  $('skip-button').disabled = busy;
  $('pause-button').disabled = game.status === 'feedback';
  $('hint-button').setAttribute('aria-expanded',String(game.hintOpen));
  $('hint-label').textContent = game.hintOpen ? t("Tutup petunjuk") : t("Beri petunjuk");
  $('hint-panel').hidden = !game.hintOpen;
  $('stage-instruction').textContent = game.status==='feedback' ? game.lastOutcome==='correct'?t("Pasangan tepat! +1 markah"):t("Soalan dilangkau. +0 markah") : game.stage==='solid'?t("Pilih bongkah yang betul"):t("Bagus! Kini padankan bentangannya");
  document.querySelectorAll('.choice').forEach(button => {
    const isSelected = selected && button.dataset.kind === selected.kind && button.dataset.shape === selected.shape;
    button.setAttribute('aria-pressed', String(!!isSelected));
    button.classList.toggle('inactive',button.dataset.kind !== game.stage);
    button.disabled = busy;
  });
  for (const target of ['r1','r2']) {
    const pad=$(target), accepted=target==='r1'?acceptedSolid:acceptedNet, kind=target==='r1'?'solid':'net';
    const blocked = busy || active !== target;
    pad.disabled = blocked;
    pad.setAttribute('aria-disabled',String(blocked));
    pad.classList.toggle('scanner-locked',target==='r2' && game.stage==='solid' && game.status !== 'feedback');
    pad.classList.toggle('filled',!!accepted);
    pad.classList.toggle('has-selection',!!selected && active===target && !busy);
    const body = accepted ? `${shapeArt(accepted,kind,true)}<span class="scanned-label">${icon('check')}${target==='r1'?t("Bongkah diterima"):t("Bentangan diterima")}</span>` : emptyScanner(target);
    if ($('scanner-body-'+target).innerHTML !== body) $('scanner-body-'+target).innerHTML = body;
    const led=game.led(target,now());
    const status = game.status==='feedback' ? game.lastOutcome==='correct'?t("+1 markah"):t("Dilangkau") : led==='red'?t("Cuba lagi"):accepted ? t("Imbasan betul") : target==='r2' && game.stage==='solid' ? t("Jawab R1 dahulu") : game.hintOpen ? t("Petunjuk dibuka") : t("Sedia diimbas");
    $('status-'+target).textContent = status;
    pad.setAttribute('aria-label', t('scanner.label',{target:target.toUpperCase(),kind:target==='r1'?t('bongkah'):t('bentangan'),status})+(selected&&active===target?t('scanner.action'):''));
  }
  renderLeds(now());
}

function renderLeds(time) {
  for (const target of ['r1','r2']) {
    let color = game.led(target,time);
    if (reducedMotion.matches && game.status==='feedback') color = game.lastOutcome==='correct'?'green':'red';
    if (lastLed[target] === color) continue;
    lastLed[target] = color;
    $('led-'+target).className = 'led-dot '+color;
    $(target).classList.toggle('scanner-correct',color==='green');
    $(target).classList.toggle('scanner-wrong',color==='red');
    $(target).classList.toggle('scanner-hint',color==='purple');
    $('status-'+target).textContent = game.status==='feedback' ? game.lastOutcome==='correct'?t("+1 markah"):t("Dilangkau") : color==='red'?t("Cuba lagi"):target==='r1'&&game.stage==='net'?t("Imbasan betul"):target==='r2'&&game.stage==='solid'?t("Jawab R1 dahulu"):game.hintOpen?t("Petunjuk dibuka"):t("Sedia diimbas");
    $(target).setAttribute('aria-label',t('scanner.label',{target:target.toUpperCase(),kind:target==='r1'?t('bongkah'):t('bentangan'),status:$('status-'+target).textContent}));
  }
}

function choose(button) {
  if (!game?.interactive) return;
  const {kind,shape,letter} = button.dataset;
  if (kind !== game.stage) {
    setStatus(game.stage === 'solid' ? "Mulakan dengan bongkah di R1. Kad bentangan digunakan selepas itu." : "Bongkah R1 sudah betul. Pilih satu kad bentangan untuk R2.");
    return;
  }
  selected = {kind,shape,letter};
  const target = kind==='solid'?'R1':'R2';
  setStatus('choice.selected','','cursor',{kind:kind==='solid'?'Bongkah':'Kad',letter,target});
  renderState();
}

function scan(choice,target) {
  if (!game?.interactive) return;
  if (!choice) { setStatus('choice.first','','cursor',{kind:game.stage==='solid'?'bongkah':'kad bentangan',target:target.toUpperCase()}); return; }
  const result = game.scan(choice.kind,choice.shape,target,now());
  if (result.type==='blocked') return;
  if (result.type==='stage') { setStatus(result.target==='r1'?"R1 dahulu. Imbas bongkah sebelum kad bentangan.":"Bongkah R1 sudah betul. Padankan kad bentangan di R2."); return; }
  if (result.type==='kind') { setStatus(game.stage==='solid'?"R1 hanya menerima bongkah 3D.":"R2 hanya menerima kad bentangan."); return; }
  selected=null;
  if (result.type==='wrong') {
    setStatus(target==='r1'?"Belum tepat. Lihat sifat dalam soalan dan cuba bongkah lain.":"Bentangan belum sepadan. Bongkah R1 kekal betul; cuba kad bentangan lain.",'error','refresh');
    tone('wrong');
  } else if (result.type==='solid') {
    acceptedSolid=choice.shape;
    setStatus("Bongkah betul! Sekarang seret kad bentangannya ke R2.",'success','check');
    tone('solid');
  } else if (result.type==='correct') {
    acceptedNet=choice.shape;
    setStatus("Pasangan tepat! +1 markah. Bersedia untuk soalan seterusnya.",'success','check');
    tone('correct');
  }
  renderState();
}

document.addEventListener('click', event => {
  const button=event.target.closest('.choice');
  if (button) {
    if (event.detail && now()<suppressClickUntil) { event.preventDefault(); return; }
    choose(button);
    return;
  }
  const pad=event.target.closest('.scanner');
  if (pad) { scan(selected,pad.dataset.target); return; }
  const action=event.target.closest('[data-action]')?.dataset.action;
  if (action==='help') openHelp();
  if (action==='scores') { scoresExpanded=false; openScores(); }
  if (action==='home') requestHome();
});
$('brand-home').addEventListener('click',event=>{event.preventDefault();requestHome();});
$('hint-button').addEventListener('click',()=>{
  if(game?.toggleHint()){
    setStatus(game.hintOpen?"Petunjuk dibuka. Baca petunjuk dan teruskan memilih.":"Petunjuk ditutup. Teruskan menjawab.",game.hintOpen?'hint':'','bulb');
    renderState();
  }
});
$('skip-button').addEventListener('click',()=>{
  if(game?.skip(now())){ cancelDrag(); selected=null;setStatus("Soalan dilangkau. Tiada markah untuk soalan ini.",'','skip');renderState();tone('skip'); }
});
$('pause-button').addEventListener('click',()=>openPause());
$('replay-button').addEventListener('click',()=>startGame());

// One Pointer Events path for mouse, pen and touch, with a click/keyboard alternative.
document.addEventListener('pointerdown',event=>{
  const button=event.target.closest('.choice');
  if(!button || !game?.interactive || !event.isPrimary || event.button!==0 || dialog.open) return;
  drag={pointerId:event.pointerId,source:button,choice:{kind:button.dataset.kind,shape:button.dataset.shape,letter:button.dataset.letter},startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,started:false,ghost:null};
  button.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove',event=>{
  if(!drag || drag.pointerId!==event.pointerId) return;
  drag.x=event.clientX;drag.y=event.clientY;
  if(!drag.started && Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>7){
    drag.started=true;
    selected=null;
    drag.ghost=document.createElement('div');
    drag.ghost.className='drag-ghost';drag.ghost.setAttribute('aria-hidden','true');
    drag.ghost.innerHTML=shapeArt(drag.choice.shape,drag.choice.kind,true);
    document.body.append(drag.ghost);drag.source.classList.add('drag-source');
  }
  if(drag.started){event.preventDefault();moveDrag();}
},{passive:false});
document.addEventListener('pointerup',event=>{
  if(!drag || event.pointerId!==drag.pointerId) return;
  const saved=drag;
  const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.scanner');
  if(saved.started){
    suppressClickUntil=now()+400;
    cancelDrag();
    if(target) scan(saved.choice,target.dataset.target);
    else { selected=saved.choice;renderState();setStatus("Pilihan belum diimbas. Seret ke pengimbas yang aktif, atau klik pengimbas."); }
  }else cancelDrag();
});
document.addEventListener('pointercancel',()=>cancelDrag());
window.addEventListener('blur',()=>cancelDrag());
function moveDrag(){
  if(!drag?.started)return;
  drag.ghost.style.left=drag.x+'px';drag.ghost.style.top=drag.y+'px';
  document.querySelectorAll('.scanner').forEach(pad=>pad.classList.remove('drop-hover','drop-invalid'));
  const target=document.elementFromPoint(drag.x,drag.y)?.closest('.scanner');
  if(target){ const valid=target.dataset.target===(game.stage==='solid'?'r1':'r2') && drag.choice.kind===game.stage;target.classList.add(valid?'drop-hover':'drop-invalid'); }
}
function cancelDrag(){
  if(drag){
    drag.ghost?.remove();drag.source.classList.remove('drag-source');
    if(drag.source.hasPointerCapture?.(drag.pointerId))drag.source.releasePointerCapture(drag.pointerId);
    drag=null;
  }
  document.querySelectorAll('.scanner').forEach(pad=>pad.classList.remove('drop-hover','drop-invalid'));
}

function openDialog(mode,title,content){
  if(refreshingLanguage){dialogMode=mode;$('dialog-title').textContent=title;$('dialog-content').innerHTML=content;return;}
  cancelDrag();
  if(!dialog.open)dialogTrigger=document.activeElement;
  if(game && screen==='game')game.pause(now());
  dialogMode=mode;
  $('dialog-title').textContent=title;
  $('dialog-content').innerHTML=content;
  $('dialog-close').before(languageControl);
  if(!dialog.open)dialog.showModal();
  const first=$('dialog-content').querySelector('[data-autofocus]');
  (first || $('dialog-close')).focus({preventScroll:true});
}
function closeDialog(){ if(dialog.open)dialog.close(); }
$('dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('close',()=>{
  languageHome.append(languageControl);
  dialogMode='';
  if(game && screen==='game') { game.resume(now());renderState(); }
  if(dialogTrigger?.isConnected)dialogTrigger.focus({preventScroll:true});
  dialogTrigger=null;
});
dialog.addEventListener('cancel',()=>{ /* Native dialog closes with Escape and restores play through close. */ });
dialog.addEventListener('click',event=>{
  const action=event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
  if(action==='close')closeDialog();
  if(action==='home'){ game=null;selected=null;acceptedSolid=null;acceptedNet=null;dialogTrigger=null;closeDialog();showScreen('welcome');$('player-name').focus({preventScroll:true}); }
  if(action==='request-home')requestHome();
  if(action==='export')downloadScores();
  if(action==='show-all'){scoresExpanded=true;openScores();}
  if(action==='erase')openErase();
  if(action==='confirm-erase'){
    const cleared=store.clear();storageStatus();
    openScores(cleared?"Semua skor dalam pelayar ini telah dipadam.":"Skor tersimpan tidak dapat dipadam. Semak kebenaran storan pelayar dan cuba lagi.");
    if(screen==='result')renderMiniScores();
  }
  if(action==='back-scores')openScores();
});

function openHelp(){
  openDialog('help',t("Cara main GeoDecoder"),`<p class="help-intro">${t("Satu soalan, dua padanan. Sasarkan")} <b>${t("10 daripada 10 markah")}</b>.</p><div class="help-steps"><div class="help-step"><span class="help-number">1</span><div><h3>${t("Baca soalan dan pilih bongkah")}</h3><p>${t("Seret satu bongkah 3D ke pengimbas R1 yang berwarna biru.")}</p></div></div><div class="help-step"><span class="help-number">2</span><div><h3>${t("Padankan kad bentangannya")}</h3><p>${t("Selepas R1 hijau, seret kad bentangan yang sepadan ke R2.")}</p></div></div><div class="help-step"><span class="help-number">3</span><div><h3>${t("Kumpulkan satu markah")}</h3><p>${t("Pasangan betul memberi +1. Kedua-dua pengimbas berkelip hijau sebelum soalan seterusnya.")}</p></div></div></div><div class="help-mini-art">${shapeArt('cube','solid',true)}<span>R1 ${icon('arrow')} R2</span>${shapeArt('cube','net',true)}</div><p class="keyboard-help">${t("Tanpa menyeret:")} <b>${t("klik / sentuh kad")}</b>, ${t("kemudian")} <b>${t("klik pengimbas")}</b>. ${t("Papan kekunci:")} <kbd>Tab</kbd> ${t("untuk bergerak,")} <kbd>Enter</kbd> ${t("atau")} <kbd>Space</kbd> ${t("untuk memilih dan mengimbas.")}</p><p class="help-note"><b>${t("Salah? Cuba lagi.")}</b> ${t("Tiada potongan markah. Petunjuk juga percuma. Langkau memberi +0 untuk soalan itu. Jam dijeda semasa tetingkap ini dibuka.")}</p><div class="dialog-actions"><button class="button button-primary" data-dialog-action="close" data-autofocus>${screen==='game'?t("Sambung permainan"):t("Saya faham")} ${icon('arrow')}</button></div>`);
}

function openPause(automatic=false){
  if(!refreshingLanguage)automaticPause=automatic;
  if(!game || screen!=='game')return;
  if(!refreshingLanguage)game.pause(now());
  openDialog('pause',t("Permainan dijeda"),`<div class="pause-symbol">${icon('pause')} ${formatTime(game.time(now()))}</div><p class="dialog-copy">${automatic?t("Permainan dijeda semasa anda meninggalkan tab ini."):t("Berehat seketika. Masa dan soalan anda dikekalkan.")} ${t("Tekan sambung apabila sudah bersedia.")}</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="request-home">${t("Tamatkan pusingan")}</button><button class="button button-primary" data-dialog-action="close" data-autofocus>${t("Sambung permainan")} ${icon('arrow')}</button></div>`);
}

function requestHome(){
  if(screen==='game' && game && game.status!=='finished'){
    openDialog('leave',t("Tamatkan pusingan ini?"),`<p class="dialog-copy">${t("leave.progress")} <b>${t("leave.count",{number:game.index+1})}</b>. ${t("Jika kembali ke mula, kemajuan pusingan ini dilepaskan dan skor pusingan ini tidak disimpan.")}</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="close" data-autofocus>${t("Terus bermain")}</button><button class="button button-danger" data-dialog-action="home">${t("Tamatkan pusingan")}</button></div>`);
  }else{ game=null;selected=null;showScreen('welcome');$('player-name').focus({preventScroll:true}); }
}

function miniScoresMarkup(scores){
  if(!scores.length)return `<div class="empty-scores">${icon('trophy')}<h3>${t("Skor pertama menanti")}</h3><p>${t("Lengkapkan satu pusingan untuk menyimpan skor.")}</p></div>`;
  return scores.slice(0,5).map((r,i)=>`<div class="mini-score ${r.id===lastResult?.id?'mine':''}"><span class="mini-rank">${i+1}</span><span class="mini-player"><b>${escapeHtml(r.player.name)}${r.id===lastResult?.id?t('score.mine'):''}</b><small>${escapeHtml(r.player.className)} · ${t('score.wrong',{count:r.mistakes})}</small></span><span class="mini-points">${r.score}<small>${formatTime(r.elapsed)}</small></span></div>`).join('');
}
function renderMiniScores(){ $('result-leaderboard').innerHTML=miniScoresMarkup(store.read());storageStatus(); }

function openScores(message=''){
  if(!refreshingLanguage)scoreNotice=message;
  const scores=store.read();storageStatus();
  const visible=scoresExpanded?scores:scores.slice(0,10);
  const table=scores.length?`<div class="score-table-wrap"><table class="score-table"><caption class="sr-only">${t("Skor terbaik dalam pelayar ini")}</caption><thead><tr><th scope="col">#</th><th scope="col">${t("Pemain")}</th><th scope="col">${t("Kelas")}</th><th scope="col">${t("Markah")}</th><th scope="col">${t("Salah / Masa")}</th></tr></thead><tbody>${visible.map((r,i)=>`<tr class="${r.id===lastResult?.id?'mine':''}"><td>${i+1}</td><td><b>${escapeHtml(r.player.name)}</b><small>${escapeHtml(t(r.player.category))}</small></td><td>${escapeHtml(r.player.className)}</td><td><b>${r.score} / 10</b></td><td>${t('score.shortWrong',{count:r.mistakes})}<small>${formatTime(r.elapsed)}</small></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-scores">${icon('trophy')}<h3>${t("Belum ada skor")}</h3><p>${t("Lengkapkan 10 soalan untuk merekodkan skor pertama.")}</p></div>`;
  openDialog('scores',t("Papan skor"),`<p class="score-info">${store.failed?t("Skor sesi ini sahaja; simpanan pelayar tidak tersedia."):t("Rekod dalam pelayar ini sahaja. Maksimum 50 skor terbaik.")} ${t("Skor tertinggi dahulu, kemudian cubaan salah paling sedikit dan masa terpantas.")}</p>${message?`<p class="help-note" role="status">${escapeHtml(t(message))}</p>`:''}${table}<div class="score-toolbar"><span>${t('score.records',{shown:visible.length,total:scores.length})}</span>${scores.length>10&&!scoresExpanded?`<button class="button button-outline" data-dialog-action="show-all">${t("Lihat semua skor")}</button>`:''}<button class="button button-outline" data-dialog-action="export" ${!scores.length?'disabled':''}>${icon('download')} ${t("Eksport CSV")}</button><button class="button button-quiet score-delete" data-dialog-action="erase" ${!scores.length?'disabled':''}>${icon('trash')} ${t("Padam skor")}</button></div><div class="dialog-actions"><button class="button button-primary" data-dialog-action="close">${screen==='game'?t("Sambung permainan"):t("Tutup papan skor")}</button></div>`);
}

function openErase(){
  openDialog('erase',t("Padam semua skor?"),`<p class="dialog-copy">${t("Semua rekod nama, kelas dan keputusan dalam papan skor pelayar ini akan dipadam. Muat turun CSV dahulu jika mahu menyimpannya.")}</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="back-scores" data-autofocus>${t("Kekalkan skor")}</button><button class="button button-danger" data-dialog-action="confirm-erase">${t("Padam semua skor")}</button></div>`);
}
function downloadScores(){
  const scores=store.read();if(!scores.length)return;
  const blob=new Blob([csvScores(scores,locale.language)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='GeoDecoder_Digital_Skor.csv';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  announce(t("Fail CSV papan skor telah disediakan."));
}

function finishGame(){
  cancelDrag();selected=null;
  lastResult=game.result(roundId);
  store.save(lastResult);storageStatus();
  renderResult();
  showScreen('result');
  $('result-title').focus({preventScroll:true});
  announce(t('result.complete',{score:lastResult.score,time:formatTime(lastResult.elapsed)}));
}
function renderResult(){
  const r=lastResult;
  $('result-title').textContent=r.score===10?t("Hebat! Semua pasangan tepat."):r.score>=7?t("Bagus, anda semakin mahir!"):t("Teruskan mencuba, teruskan belajar.");
  $('result-player').textContent=`${r.player.name} · ${t(r.player.category)} · ${r.player.className}`;
  $('result-score').textContent=r.score;
  $('result-level').textContent=r.score===10?t("Pakar padanan"):r.score>=7?t("Penjelajah geometri"):t("Peneroka bentuk");
  const rank=store.read().findIndex(s=>s.id===r.id)+1;
  $('result-message').textContent=t('result.summary',{score:r.score,skipped:r.skipped})+(rank>0?t('result.rank',{rank}):'')+t('result.try');
  $('result-time').textContent=formatTime(r.elapsed);
  $('result-first').textContent=`${r.firstTry} / 10`;
  $('result-mistakes').textContent=r.mistakes;
  $('result-hints').textContent=r.hints;
  $('review-list').innerHTML=game.answers.map((answer,i)=>`<article class="review-card ${answer.outcome==='skipped'?'skipped':''}"><small>${t('question.counter',{number:i+1})}</small><div class="review-pair">${shapeArt(answer.shape,'solid',true)}${shapeArt(answer.shape,'net',true)}</div><h3>${shapeName(answer.shape,locale.language)}</h3><p>${answer.outcome==='correct'?t("✓ Pasangan betul"):t("↷ Dilangkau")}</p></article>`).join('');
  renderMiniScores();

}

function tone(kind){
  if(!sound)return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const notes=kind==='correct'?[523,659,784]:kind==='solid'?[523,659]:kind==='wrong'?[196,165]:[330];
    notes.forEach((frequency,i)=>{
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
      const t=audioContext.currentTime+i*.09;
      oscillator.type='sine';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.065,t+.01);gain.gain.exponentialRampToValueAtTime(.001,t+.16);
      oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(t);oscillator.stop(t+.17);
    });
  }catch{sound=false;updateSound();announce(t("Bunyi tidak tersedia dalam pelayar ini. Permainan boleh diteruskan."));}
}
function updateSound(){
  $('sound-button').innerHTML=icon(sound?'sound':'mute');
  $('sound-button').setAttribute('aria-pressed',String(sound));
  $('sound-button').setAttribute('aria-label',sound?t("Matikan bunyi"):t("Hidupkan bunyi"));
  $('sound-button').title=sound?t("Matikan bunyi"):t("Hidupkan bunyi");
}
$('sound-button').addEventListener('click',()=>{sound=!sound;updateSound();if(sound)tone('solid');});

document.addEventListener('visibilitychange',()=>{
  if(!game || screen!=='game')return;
  if(document.hidden && !game.paused){game.pause(now());hiddenPause=true;cancelDrag();}
  else if(!document.hidden && hiddenPause){hiddenPause=false;if(!dialog.open)openPause(true);}
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  if(drag?.started){event.preventDefault();cancelDrag();return;}
  if(!dialog.open && screen==='game' && game?.interactive){event.preventDefault();openPause();}
});
window.addEventListener('storage',event=>{
  if(event.key===SCORE_KEY || event.key===null){store.memory=[];if(dialogMode==='scores')openScores();if(screen==='result')renderMiniScores();}
});

function frame(time){
  if(game && screen==='game'){
    if(game.update(time)){
      if(game.status==='finished')finishGame();
      else{lastLed={};renderQuestion();announce(t('round.next',{number:game.index+1}));}
    }
    const clock=formatTime(game.time(time));
    if(clock!==lastClock){$('time-value').textContent=clock;lastClock=clock;}
    renderLeds(time);
  }
  if(drag?.started){
    const step=drag.y<90?-10:drag.y>window.innerHeight-65?10:0;
    if(step){window.scrollBy(0,step);moveDrag();}
  }
  requestAnimationFrame(frame);
}
store.read();storageStatus();
requestAnimationFrame(frame);

function applyStaticLanguage(){
  document.documentElement.lang=locale.language;
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  for(const name of ['aria-label','title','placeholder','content']){
    document.querySelectorAll('[data-i18n-'+name+']').forEach(el=>el.setAttribute(name,t(el.getAttribute('data-i18n-'+name))));
  }
  $('language-select').value=locale.language;
  updateTitle();updateSound();
}
function applyLanguage(){
  const focused=document.activeElement;
  const focusedAction=focused?.dataset.dialogAction;
  refreshingLanguage=true;
  try{
    applyStaticLanguage();
    for(const key of ['name','className','category']){
      const error=validationErrors?.[key];
      $(key+'-error').textContent=error?t(error):'';
    }
    if(game&&screen==='game'){
      $('player-meta').textContent=`${t(player.category)} · ${player.className}`;
      renderQuestionContent();
      document.querySelectorAll('.choice').forEach(button=>{
        const {kind,shape,letter}=button.dataset;
        button.setAttribute('aria-label',t('choice.label',{kind:kind==='solid'?t('bongkah'):t('bentangan'),letter,description:describeShape(shape,kind,locale.language)}));
        button.querySelector('.choice-id').innerHTML=`<span class="grip" aria-hidden="true">⠿</span>${kind==='solid'?t('Bongkah'):t('Kad')} ${letter}`;
      });
      lastLed={};renderState();
      if(lastStatus){
        setStatus(lastStatus.key,lastStatus.tone,lastStatus.symbol,lastStatus.params);
      }
    }
    if(screen==='result'&&lastResult)renderResult();
    if(dialog.open){
      if(dialogMode==='help')openHelp();
      else if(dialogMode==='pause')openPause(automaticPause);
      else if(dialogMode==='leave')requestHome();
      else if(dialogMode==='scores')openScores(scoreNotice);
      else if(dialogMode==='erase')openErase();
    }
    storageStatus();
  }finally{refreshingLanguage=false;}
  if(focused?.isConnected)focused.focus({preventScroll:true});
  else if(focusedAction)dialog.querySelector('[data-dialog-action="'+focusedAction+'"]')?.focus({preventScroll:true});
}
$('language-select').addEventListener('change',event=>{
  cancelDrag();
  if(locale.setLanguage(event.target.value)){applyLanguage();announce(t('language.changed'));}
});
applyLanguage();
