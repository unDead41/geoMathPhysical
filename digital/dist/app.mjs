import { QUESTIONS } from './questions.mjs';
import { Game, VERSION, formatTime, validatePlayer } from './core.mjs';
import { ScoreStore, csvScores, SCORE_KEY } from './storage.mjs';
import { shapeArt, icon, brandArt, SHAPE_NAMES, describeShape } from './art.mjs';

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty = value => escapeHtml(value).replaceAll('pi', 'π').replaceAll('^2','²').replaceAll('^3','³').replaceAll('*',' × ').replaceAll('=', ' = ').replaceAll('6cm', '6 cm').replaceAll('4cm','4 cm').replaceAll('3cm','3 cm').replaceAll(' x ', ' × ');
const now = () => performance.now();
let storage;
try { storage = window.localStorage; } catch { storage = {getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');},removeItem(){throw new Error('Storage unavailable');}}; }
const store = new ScoreStore(storage);
let screen = 'welcome', game = null, selected = null, acceptedSolid = null, acceptedNet = null;
let player = null, roundId = '', lastResult = null, dialogMode = '', dialogTrigger = null;
let drag = null, suppressClickUntil = 0, hiddenPause = false, sound = false, audioContext = null;
let scoresExpanded = false, lastClock = '', lastLed = {};
const dialog = $('app-dialog');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function hydrate(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  root.querySelectorAll('[data-brand]').forEach(el => { el.innerHTML = brandArt(); });
  root.querySelectorAll('[data-art]').forEach(el => { el.innerHTML = shapeArt(el.dataset.art, el.dataset.kind || 'solid', true); });
}
hydrate();

function announce(message) { $('announcer').textContent = ''; requestAnimationFrame(() => { $('announcer').textContent = message; }); }
function setStatus(message, tone = '', symbol = 'cursor') {
  $('feedback-text').textContent = message;
  $('game-status').className = `game-feedback ${tone}`;
  const existing = $('game-status').querySelector('.icon');
  if (existing) existing.outerHTML = icon(symbol);
}
function storageStatus() { $('storage-warning').hidden = !store.failed; }
function showScreen(next) {
  screen = next;
  $('welcome').hidden = next !== 'welcome';
  $('game-screen').hidden = next !== 'game';
  $('result-screen').hidden = next !== 'result';
  document.title = next === 'welcome' ? 'GeoDecoder Digital — Jom main geometri' : next === 'game' ? 'GeoDecoder Digital — Sedang bermain' : 'GeoDecoder Digital — Keputusan pusingan';
  window.scrollTo({top:0,behavior:'instant'});
}
function uid() { return globalThis.crypto?.randomUUID?.() || `round-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

$('player-form').addEventListener('submit', event => {
  event.preventDefault();
  if (screen !== 'welcome') return;
  const form = new FormData(event.currentTarget);
  const result = validatePlayer({name:form.get('name'),category:form.get('category'),className:form.get('className')});
  for (const key of ['name','className']) {
    const field = $(key === 'name' ? 'player-name' : 'player-class');
    $(key + '-error').textContent = result.errors[key] || '';
    field.setAttribute('aria-invalid', String(!!result.errors[key]));
  }
  $('category-error').textContent = result.errors.category || '';
  if (!result.valid) {
    if (result.errors.name) $('player-name').focus();
    else if (result.errors.category) document.querySelector('input[name="category"]').focus();
    else $('player-class').focus();
    announce('Maklumat belum lengkap. ' + Object.values(result.errors).join(' '));
    return;
  }
  player = result.player;
  startGame();
});
for (const [id,key] of [['player-name','name'],['player-class','className']]) {
  $(id).addEventListener('input', () => { $(id).removeAttribute('aria-invalid'); $(key+'-error').textContent = ''; });
}

function startGame() {
  if (!player) return;
  cancelDrag();
  game = new Game(QUESTIONS, player, now());
  roundId = uid(); lastResult = null; lastClock = ''; lastLed = {};
  $('player-initial').textContent = player.name[0].toLocaleUpperCase('ms-MY');
  $('player-display').textContent = player.name;
  $('player-meta').textContent = `${player.category} · ${player.className}`;
  showScreen('game');
  renderQuestion();
  $('question-title').focus({preventScroll:true});
  announce('Permainan bermula. Sepuluh soalan. Pilih bongkah untuk R1 dahulu.');
}

function renderQuestion() {
  acceptedSolid = null; acceptedNet = null; selected = null;
  const q = game.question;
  const number = String(game.index+1).padStart(2,'0');
  $('question-counter').textContent = `SOALAN ${number} / 10`;
  $('question-topic').textContent = q.id.endsWith('2') || q.id === 'C1' ? 'Cabaran rumus' : q.id.endsWith('3') ? 'Cabaran bentangan' : 'Kenali bongkah';
  let heading = 'Bongkah apakah ini?', detail = q.prompt;
  if (/Pilih bentangan/.test(q.prompt) || q.id === 'B3') {
    heading = 'Bongkah manakah yang sepadan?';
  } else if (q.prompt.startsWith('V=') || q.prompt.startsWith('L=')) {
    heading = 'Rumus ini mewakili bongkah apa?';
  }
  detail = detail.replace(/Bongkah apakah ini\?/g,'').replace(/Bentuk apa\?/g,'').trim();
  $('question-title').textContent = heading;
  if (q.id.endsWith('2') || q.id === 'C1') {
    const formulaLines = q.lines.filter(line => /^V=|^L=/.test(line));
    const rest = q.lines.filter(line => !/^V=|^L=/.test(line)).join(' ').replace(/Bongkah apakah ini\?|Bentuk apa\?/g,'').trim();
    $('question-detail').innerHTML = `<span class="formula-line">${formulaLines.map(pretty).join('<br>')}</span>${pretty(rest)}`;
  } else $('question-detail').innerHTML = pretty(detail);
  $('formula-key').hidden = true;
  if (q.id === 'S2') { $('formula-key').textContent = 'V = isi padu · L = luas permukaan · j = jejari · t = tinggi'; $('formula-key').hidden = false; }
  $('hint-text').innerHTML = pretty(q.hint);
  const dots = Array.from({length:10}, (_,i) => {
    const answer = game.answers[i];
    const cls = answer ? answer.outcome : i===game.index ? 'current' : '';
    return `<span class="progress-dot ${cls}" title="Soalan ${i+1}${answer ? answer.outcome === 'correct' ? ': betul' : ': dilangkau' : i===game.index ? ': semasa' : ''}"></span>`;
  }).join('');
  $('progress-dots').innerHTML = dots;
  $('progress-dots').setAttribute('aria-label', `Soalan ${game.index+1} daripada 10. ${game.score} pasangan betul, ${game.skipped} dilangkau.`);
  renderChoices('solid', game.solidOrder);
  renderChoices('net', game.netOrder);
  setStatus('Baca soalan, kemudian pilih satu bongkah untuk R1.');
  renderState();
}

function renderChoices(kind, order) {
  $(kind+'-choices').innerHTML = order.map((shape,i) => {
    const letter = String.fromCharCode(65+i), label = kind === 'solid' ? 'bongkah' : 'bentangan';
    return `<button type="button" class="choice ${kind === 'net' ? 'net-choice' : ''}" data-kind="${kind}" data-shape="${shape}" data-letter="${letter}" aria-pressed="false" aria-label="Pilih ${label} ${letter}. ${describeShape(shape,kind)}">${shapeArt(shape,kind,true)}<span class="choice-id"><span class="grip" aria-hidden="true">⠿</span>${kind === 'solid' ? 'Bongkah' : 'Kad'} ${letter}</span></button>`;
  }).join('');
}

const emptyScanner = target => `<span class="scan-target"><span class="target-corner tl"></span><span class="target-corner tr"></span><span class="target-corner bl"></span><span class="target-corner br"></span>${icon(target === 'r2' && game.stage === 'solid' ? 'lock':'cursor')}</span><span class="scanner-placeholder">${target==='r1'?'Letak bongkah di sini':game.stage==='solid'?'Kemudian letak bentangan':'Letak kad bentangan di sini'}</span>`;

function renderState() {
  if (!game) return;
  const busy = !game.interactive;
  const active = game.stage === 'solid' ? 'r1' : 'r2';
  $('score-value').textContent = game.score;
  $('hint-button').disabled = busy;
  $('skip-button').disabled = busy;
  $('pause-button').disabled = game.status === 'feedback';
  $('hint-button').setAttribute('aria-expanded',String(game.hintOpen));
  $('hint-label').textContent = game.hintOpen ? 'Tutup petunjuk' : 'Beri petunjuk';
  $('hint-panel').hidden = !game.hintOpen;
  $('stage-instruction').textContent = game.status==='feedback' ? game.lastOutcome==='correct'?'Pasangan tepat! +1 markah':'Soalan dilangkau. +0 markah' : game.stage==='solid'?'Pilih bongkah yang betul':'Bagus! Kini padankan bentangannya';
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
    const body = accepted ? `${shapeArt(accepted,kind,true)}<span class="scanned-label">${icon('check')}${target==='r1'?'Bongkah diterima':'Bentangan diterima'}</span>` : emptyScanner(target);
    if ($('scanner-body-'+target).innerHTML !== body) $('scanner-body-'+target).innerHTML = body;
    const led=game.led(target,now());
    const status = game.status==='feedback' ? game.lastOutcome==='correct'?'+1 markah':'Dilangkau' : led==='red'?'Cuba lagi':accepted ? 'Imbasan betul' : target==='r2' && game.stage==='solid' ? 'Jawab R1 dahulu' : game.hintOpen ? 'Petunjuk dibuka' : 'Sedia diimbas';
    $('status-'+target).textContent = status;
    pad.setAttribute('aria-label', `Pengimbas ${target.toUpperCase()}, ${target==='r1'?'bongkah':'bentangan'}. ${status}.${selected && active===target ? ' Klik atau tekan Enter untuk imbas pilihan.' : ''}`);
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
    $('status-'+target).textContent = game.status==='feedback' ? game.lastOutcome==='correct'?'+1 markah':'Dilangkau' : color==='red'?'Cuba lagi':target==='r1'&&game.stage==='net'?'Imbasan betul':target==='r2'&&game.stage==='solid'?'Jawab R1 dahulu':game.hintOpen?'Petunjuk dibuka':'Sedia diimbas';
    $(target).setAttribute('aria-label',`Pengimbas ${target.toUpperCase()}, ${target==='r1'?'bongkah':'bentangan'}. ${$('status-'+target).textContent}.`);
  }
}

function choose(button) {
  if (!game?.interactive) return;
  const {kind,shape,letter} = button.dataset;
  if (kind !== game.stage) {
    setStatus(game.stage === 'solid' ? 'Mulakan dengan bongkah di R1. Kad bentangan digunakan selepas itu.' : 'Bongkah R1 sudah betul. Pilih satu kad bentangan untuk R2.');
    return;
  }
  selected = {kind,shape,letter};
  const target = kind==='solid'?'R1':'R2';
  setStatus(`${kind==='solid'?'Bongkah':'Kad'} ${letter} dipilih. Klik pengimbas ${target} untuk mengimbas.`, '', 'cursor');
  renderState();
}

function scan(choice,target) {
  if (!game?.interactive) return;
  if (!choice) { setStatus(`Pilih ${game.stage==='solid'?'bongkah':'kad bentangan'} dahulu, kemudian klik pengimbas ${target.toUpperCase()}.`); return; }
  const result = game.scan(choice.kind,choice.shape,target,now());
  if (result.type==='blocked') return;
  if (result.type==='stage') { setStatus(result.target==='r1'?'R1 dahulu. Imbas bongkah sebelum kad bentangan.':'Bongkah R1 sudah betul. Padankan kad bentangan di R2.'); return; }
  if (result.type==='kind') { setStatus(game.stage==='solid'?'R1 hanya menerima bongkah 3D.':'R2 hanya menerima kad bentangan.'); return; }
  selected=null;
  if (result.type==='wrong') {
    setStatus(target==='r1'?'Belum tepat. Lihat sifat dalam soalan dan cuba bongkah lain.':'Bentangan belum sepadan. Bongkah R1 kekal betul; cuba kad bentangan lain.','error','refresh');
    tone('wrong');
  } else if (result.type==='solid') {
    acceptedSolid=choice.shape;
    setStatus('Bongkah betul! Sekarang seret kad bentangannya ke R2.','success','check');
    tone('solid');
  } else if (result.type==='correct') {
    acceptedNet=choice.shape;
    setStatus('Pasangan tepat! +1 markah. Bersedia untuk soalan seterusnya.','success','check');
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
    setStatus(game.hintOpen?'Petunjuk dibuka. Baca petunjuk dan teruskan memilih.':'Petunjuk ditutup. Teruskan menjawab.',game.hintOpen?'hint':'','bulb');
    renderState();
  }
});
$('skip-button').addEventListener('click',()=>{
  if(game?.skip(now())){ cancelDrag(); selected=null;setStatus('Soalan dilangkau. Tiada markah untuk soalan ini.','','skip');renderState();tone('skip'); }
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
    else { selected=saved.choice;renderState();setStatus('Pilihan belum diimbas. Seret ke pengimbas yang aktif, atau klik pengimbas.'); }
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
  cancelDrag();
  if(!dialog.open)dialogTrigger=document.activeElement;
  if(game && screen==='game')game.pause(now());
  dialogMode=mode;
  $('dialog-title').textContent=title;
  $('dialog-content').innerHTML=content;
  if(!dialog.open)dialog.showModal();
  const first=$('dialog-content').querySelector('[data-autofocus]');
  (first || $('dialog-close')).focus({preventScroll:true});
}
function closeDialog(){ if(dialog.open)dialog.close(); }
$('dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('close',()=>{
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
    openScores(cleared?'Semua skor dalam pelayar ini telah dipadam.':'Skor tersimpan tidak dapat dipadam. Semak kebenaran storan pelayar dan cuba lagi.');
    if(screen==='result')renderMiniScores();
  }
  if(action==='back-scores')openScores();
});

function openHelp(){
  openDialog('help','Cara main GeoDecoder',`<p class="help-intro">Satu soalan, dua padanan. Sasarkan <b>10 daripada 10 markah</b>.</p><div class="help-steps"><div class="help-step"><span class="help-number">1</span><div><h3>Baca soalan dan pilih bongkah</h3><p>Seret satu bongkah 3D ke pengimbas R1 yang berwarna biru.</p></div></div><div class="help-step"><span class="help-number">2</span><div><h3>Padankan kad bentangannya</h3><p>Selepas R1 hijau, seret kad bentangan yang sepadan ke R2.</p></div></div><div class="help-step"><span class="help-number">3</span><div><h3>Kumpulkan satu markah</h3><p>Pasangan betul memberi +1. Kedua-dua pengimbas berkelip hijau sebelum soalan seterusnya.</p></div></div></div><div class="help-mini-art">${shapeArt('cube','solid',true)}<span>R1 ${icon('arrow')} R2</span>${shapeArt('cube','net',true)}</div><p class="keyboard-help">Tanpa menyeret: <b>klik / sentuh kad</b>, kemudian <b>klik pengimbas</b>. Papan kekunci: <kbd>Tab</kbd> untuk bergerak, <kbd>Enter</kbd> atau <kbd>Space</kbd> untuk memilih dan mengimbas.</p><p class="help-note"><b>Salah? Cuba lagi.</b> Tiada potongan markah. Petunjuk juga percuma. Langkau memberi +0 untuk soalan itu. Jam dijeda semasa tetingkap ini dibuka.</p><div class="dialog-actions"><button class="button button-primary" data-dialog-action="close" data-autofocus>${screen==='game'?'Sambung permainan':'Saya faham'} ${icon('arrow')}</button></div>`);
}

function openPause(automatic=false){
  if(!game || screen!=='game')return;
  game.pause(now());
  openDialog('pause','Permainan dijeda',`<div class="pause-symbol">${icon('pause')} ${formatTime(game.time(now()))}</div><p class="dialog-copy">${automatic?'Permainan dijeda semasa anda meninggalkan tab ini.':'Berehat seketika. Masa dan soalan anda dikekalkan.'} Tekan sambung apabila sudah bersedia.</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="request-home">Tamatkan pusingan</button><button class="button button-primary" data-dialog-action="close" data-autofocus>Sambung permainan ${icon('arrow')}</button></div>`);
}

function requestHome(){
  if(screen==='game' && game && game.status!=='finished'){
    openDialog('leave','Tamatkan pusingan ini?',`<p class="dialog-copy">Anda sedang bermain soalan <b>${game.index+1} daripada 10</b>. Jika kembali ke mula, kemajuan pusingan ini dilepaskan dan skor pusingan ini tidak disimpan.</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="close" data-autofocus>Terus bermain</button><button class="button button-danger" data-dialog-action="home">Tamatkan pusingan</button></div>`);
  }else{ game=null;selected=null;showScreen('welcome');$('player-name').focus({preventScroll:true}); }
}

function miniScoresMarkup(scores){
  if(!scores.length)return `<div class="empty-scores">${icon('trophy')}<h3>Skor pertama menanti</h3><p>Lengkapkan satu pusingan untuk menyimpan skor.</p></div>`;
  return scores.slice(0,5).map((r,i)=>`<div class="mini-score ${r.id===lastResult?.id?'mine':''}"><span class="mini-rank">${i+1}</span><span class="mini-player"><b>${escapeHtml(r.player.name)}${r.id===lastResult?.id?' · Anda':''}</b><small>${escapeHtml(r.player.className)} · ${r.mistakes} cubaan salah</small></span><span class="mini-points">${r.score}<small>${formatTime(r.elapsed)}</small></span></div>`).join('');
}
function renderMiniScores(){ $('result-leaderboard').innerHTML=miniScoresMarkup(store.read());storageStatus(); }

function openScores(message=''){
  const scores=store.read();storageStatus();
  const visible=scoresExpanded?scores:scores.slice(0,10);
  const table=scores.length?`<div class="score-table-wrap"><table class="score-table"><caption class="sr-only">Skor terbaik dalam pelayar ini</caption><thead><tr><th scope="col">#</th><th scope="col">Pemain</th><th scope="col">Kelas</th><th scope="col">Markah</th><th scope="col">Salah / Masa</th></tr></thead><tbody>${visible.map((r,i)=>`<tr class="${r.id===lastResult?.id?'mine':''}"><td>${i+1}</td><td><b>${escapeHtml(r.player.name)}</b><small>${escapeHtml(r.player.category)}</small></td><td>${escapeHtml(r.player.className)}</td><td><b>${r.score} / 10</b></td><td>${r.mistakes} salah<small>${formatTime(r.elapsed)}</small></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-scores">${icon('trophy')}<h3>Belum ada skor</h3><p>Lengkapkan 10 soalan untuk merekodkan skor pertama.</p></div>`;
  openDialog('scores','Papan skor',`<p class="score-info">${store.failed?'Skor sesi ini sahaja; simpanan pelayar tidak tersedia.':'Rekod dalam pelayar ini sahaja. Maksimum 50 skor terbaik.'} Skor tertinggi dahulu, kemudian cubaan salah paling sedikit dan masa terpantas.</p>${message?`<p class="help-note" role="status">${escapeHtml(message)}</p>`:''}${table}<div class="score-toolbar"><span>${visible.length} daripada ${scores.length} rekod</span>${scores.length>10&&!scoresExpanded?'<button class="button button-outline" data-dialog-action="show-all">Lihat semua skor</button>':''}<button class="button button-outline" data-dialog-action="export" ${!scores.length?'disabled':''}>${icon('download')} Eksport CSV</button><button class="button button-quiet score-delete" data-dialog-action="erase" ${!scores.length?'disabled':''}>${icon('trash')} Padam skor</button></div><div class="dialog-actions"><button class="button button-primary" data-dialog-action="close">${screen==='game'?'Sambung permainan':'Tutup papan skor'}</button></div>`);
}

function openErase(){
  openDialog('erase','Padam semua skor?',`<p class="dialog-copy">Semua rekod nama, kelas dan keputusan dalam papan skor pelayar ini akan dipadam. Muat turun CSV dahulu jika mahu menyimpannya.</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="back-scores" data-autofocus>Kekalkan skor</button><button class="button button-danger" data-dialog-action="confirm-erase">Padam semua skor</button></div>`);
}
function downloadScores(){
  const scores=store.read();if(!scores.length)return;
  const blob=new Blob([csvScores(scores)],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='GeoDecoder_Digital_Skor.csv';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  announce('Fail CSV papan skor telah disediakan.');
}

function finishGame(){
  cancelDrag();selected=null;
  lastResult=game.result(roundId);
  store.save(lastResult);storageStatus();
  const r=lastResult;
  $('result-title').textContent=r.score===10?'Hebat! Semua pasangan tepat.':r.score>=7?'Bagus, anda semakin mahir!':'Teruskan mencuba, teruskan belajar.';
  $('result-player').textContent=`${r.player.name} · ${r.player.category} · ${r.player.className}`;
  $('result-score').textContent=r.score;
  $('result-level').textContent=r.score===10?'Pakar padanan':r.score>=7?'Penjelajah geometri':'Peneroka bentuk';
  const rank=store.read().findIndex(s=>s.id===r.id)+1;
  $('result-message').textContent=`${r.score} pasangan betul, ${r.skipped} soalan dilangkau.${rank>0?` Kedudukan #${rank} dalam papan skor pelayar ini.`:''} Cuba lagi untuk mengurangkan cubaan salah atau memperbaiki masa.`;
  $('result-time').textContent=formatTime(r.elapsed);
  $('result-first').textContent=`${r.firstTry} / 10`;
  $('result-mistakes').textContent=r.mistakes;
  $('result-hints').textContent=r.hints;
  $('review-list').innerHTML=game.answers.map((answer,i)=>`<article class="review-card ${answer.outcome==='skipped'?'skipped':''}"><small>SOALAN ${i+1}</small><div class="review-pair">${shapeArt(answer.shape,'solid',true)}${shapeArt(answer.shape,'net',true)}</div><h3>${SHAPE_NAMES[answer.shape]}</h3><p>${answer.outcome==='correct'?'✓ Pasangan betul':'↷ Dilangkau'}</p></article>`).join('');
  renderMiniScores();
  showScreen('result');
  $('result-title').focus({preventScroll:true});
  announce(`Pusingan selesai. ${r.score} daripada 10 markah. Masa ${formatTime(r.elapsed)}.`);
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
  }catch{sound=false;updateSound();announce('Bunyi tidak tersedia dalam pelayar ini. Permainan boleh diteruskan.');}
}
function updateSound(){
  $('sound-button').innerHTML=icon(sound?'sound':'mute');
  $('sound-button').setAttribute('aria-pressed',String(sound));
  $('sound-button').setAttribute('aria-label',sound?'Matikan bunyi':'Hidupkan bunyi');
  $('sound-button').title=sound?'Matikan bunyi':'Hidupkan bunyi';
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
      else{lastLed={};renderQuestion();announce(`Soalan ${game.index+1} daripada 10. Pilih bongkah untuk R1.`);}
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
