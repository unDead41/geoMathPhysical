import { QUESTIONS } from './questions.mjs';
import { Game, VERSION, formatTime, validatePlayer, questionTopic, analyseAnswers } from './core.mjs';
import { nextVisualPlan } from './visuals.mjs';
import { ScoreStore, csvScores, SCORE_KEY, LEGACY_SCORE_KEY } from './storage.mjs';
import { shapeArt, icon, brandArt, SHAPE_NAMES, describeShape } from './art.mjs';
import {ClassroomCloud} from './cloud.mjs';
import {createPortal} from './portal.mjs';
import {initTheme} from './theme.mjs';
import {createMusic} from './music.mjs';
import moduleHtml from '../vendor/module-v1.2.0.html';
import {prepareModuleFrame} from './module-frame.mjs';

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty = value => escapeHtml(value).replaceAll('pi', 'π').replaceAll('^2','²').replaceAll('^3','³').replaceAll('*',' × ').replaceAll('=', ' = ').replaceAll('6cm', '6 cm').replaceAll('4cm','4 cm').replaceAll('3cm','3 cm').replaceAll(' x ', ' × ');
const now = () => performance.now();
let storage;
try { storage = window.localStorage; } catch { storage = {getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');},removeItem(){throw new Error('Storage unavailable');}}; }
const store = new ScoreStore(storage);
const music=createMusic({storage,onChange:renderMusicButton});
function renderMusicButton(state){
  const button=$('music-button');
  const label=state.error?'Cuba hidupkan muzik semula':state.enabled?'Matikan muzik latar':'Hidupkan muzik latar';
  if(button.dataset.musicEnabled!==String(state.enabled)){button.innerHTML=icon(state.enabled?'sound':'mute');button.dataset.musicEnabled=String(state.enabled);}
  button.setAttribute('aria-pressed',String(state.enabled));button.setAttribute('aria-label',label);button.title=label;
  button.dataset.track=state.track;button.dataset.playback=state.status;
}
// Playback begins only after a browser-approved user gesture.
function unlockMusic(event){if(event.target?.closest?.('#music-button'))return;if(event.isTrusted&&(!music.state.unlocked||music.state.blocked))void music.unlock();}
document.addEventListener('pointerdown',unlockMusic,{capture:true});
document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key))unlockMusic(event);},{capture:true});
$('music-button').addEventListener('click',()=>void music.toggle());
let screen = 'welcome', game = null, selected = null, acceptedSolid = null, acceptedNet = null;
let player = null, roundId = '', lastResult = null, dialogMode = '', dialogTrigger = null;
let drag = null, suppressClickUntil = 0, hiddenPause = false, sound = false, audioContext = null;
let scoresExpanded = false, lastClock = '', lastLed = {}, visualPlan = null, motionPaused = false;
let roomState=null,roomReceivedAt=0,roomPending=null,roomSending=false,roomPolling=null,roomEpoch=0,roomInFlight=null;
const cloud=new ClassroomCloud();
const portal=createPortal({cloud,onPlay:openRoomGame,onExit:returnHome,onError:()=>{}});
const dialog = $('app-dialog');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const TOPIC_NAMES = {properties:'Sifat bongkah',formula:'Rumus',net:'Bentangan'};
const SHAPE_NOTES = {
  cube:'Kubus mempunyai enam muka segi empat sama yang sama saiz. Bentangannya terdiri daripada enam petak yang boleh dilipat menjadi kubus.',
  cuboid:'Kuboid mempunyai tiga pasang muka segi empat tepat yang sama saiz. Padankan panjang dan lebar setiap pasangan muka dalam bentangannya.',
  pyramid:'Piramid ini bertapak segi empat sama. Empat muka segi tiga dilipat ke atas sehingga bertemu pada satu puncak.',
  cylinder:'Silinder mempunyai dua tapak bulatan sama saiz. Permukaan melengkungnya apabila dibuka menjadi segi empat tepat.',
  cone:'Kon mempunyai satu tapak bulatan. Permukaan melengkungnya apabila dibuka menjadi sektor bulatan, bukan segi tiga.'
};

function hydrate(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  root.querySelectorAll('[data-brand]').forEach(el => { el.innerHTML = brandArt(); });
  root.querySelectorAll('[data-art]').forEach(el => { el.innerHTML = shapeArt(el.dataset.art, el.dataset.kind || 'solid', true,el.dataset.tone||'mint'); });
}
hydrate();
initTheme();
$('app-version').textContent='V'+VERSION;
function updateMotion(){
  document.body.classList.toggle('motion-paused',motionPaused||reducedMotion.matches);
  const label=reducedMotion.matches?'Animasi dikurangkan mengikut tetapan peranti':motionPaused?'Sambung animasi':'Jeda animasi';
  $('motion-button').disabled=reducedMotion.matches;
  $('motion-button').setAttribute('aria-label',label);$('motion-button').title=label;
  $('motion-button').setAttribute('aria-pressed',String(motionPaused||reducedMotion.matches));
  $('motion-button').innerHTML=icon(motionPaused||reducedMotion.matches?'spark':'pause');
}
$('motion-button').addEventListener('click',()=>{motionPaused=!motionPaused;updateMotion();});
reducedMotion.addEventListener('change',updateMotion);updateMotion();

function announce(message) { $('announcer').textContent = ''; requestAnimationFrame(() => { $('announcer').textContent = message; }); }
function setStatus(message, tone = '', symbol = 'cursor') {
  $('feedback-text').textContent = message;
  $('game-status').className = `game-feedback ${tone}`;
  const existing = $('game-status').querySelector('.icon');
  if (existing) existing.outerHTML = icon(symbol);
}
function storageStatus() { $('storage-warning').hidden = !store.failed; }
function showScreen(next) {
  if(next!=='portal')portal.close();
  screen = next;
  $('welcome').hidden = next !== 'welcome';
  $('guest-screen').hidden = next !== 'guest';
  $('game-screen').hidden = next !== 'game';
  $('result-screen').hidden = next !== 'result';
  $('portal-screen').hidden=next!=='portal';
  $('module-screen').hidden=next!=='module';
  if(next!=='module'&&$('module-frame').getAttribute('srcdoc'))$('module-frame').removeAttribute('srcdoc');
  void music.setScene(next);
  document.title = next==='portal'?'GeoDecoder Digital — Akaun dan kelas':next==='guest'?'GeoDecoder Digital — Main sebagai tetamu':next === 'welcome' ? 'GeoDecoder Digital — Jom main geometri' : next === 'game' ? 'GeoDecoder Digital — Sedang bermain' : 'GeoDecoder Digital — Keputusan pusingan';
  if(next==='module')document.title='GeoDecoder Digital — Modul pembelajaran';
  window.scrollTo({top:0,behavior:'instant'});
}
function uid() { return globalThis.crypto?.randomUUID?.() || `round-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

$('player-form').addEventListener('submit', event => {
  event.preventDefault();
  if (screen !== 'guest') return;
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
  roomState=null;resetRoomRequests();cloud.setRoom(null);
  game = new Game(QUESTIONS, player, now());
  roundId = uid(); lastResult = null; lastClock = ''; lastLed = {}; visualPlan=null;
  $('player-initial').textContent = player.name[0].toLocaleUpperCase('ms-MY');
  $('player-display').textContent = player.name;
  $('player-meta').textContent = `${player.category} · ${player.className}`;
  showScreen('game');
  renderQuestion();
  $('question-title').focus({preventScroll:true});
  announce('Permainan bermula. Sepuluh soalan, satu percubaan setiap soalan. Pilih bongkah untuk R1 dahulu.');
}

function renderQuestion() {
  acceptedSolid = null; acceptedNet = null; selected = null;
  visualPlan=nextVisualPlan(visualPlan);
  $('correction-panel').hidden=true;
  $('game-screen').classList.remove('is-review','is-correct');
  const q = game.question;
  if(roomState){acceptedSolid=game.stage==='net'||game.attempts.solid===q.shape?q.shape:null;acceptedNet=game.attempts.net===q.shape?q.shape:null;}
  const number = String(game.index+1).padStart(2,'0');
  $('question-counter').textContent = `SOALAN ${number} / 10`;
  $('question-topic').textContent = TOPIC_NAMES[questionTopic(q)];
  let heading = 'Bongkah apakah ini?', detail = q.prompt;
  if (/Pilih bentangan/.test(q.prompt) || q.id === 'B3') {
    heading = 'Bongkah manakah yang sepadan?';
  } else if (q.prompt.startsWith('V=') || q.prompt.startsWith('L=')) {
    heading = 'Rumus ini mewakili bongkah apa?';
  }
  detail = detail.replace(/Bongkah apakah ini\?/g,'').replace(/Bentuk apa\?/g,'').trim();
  $('question-title').textContent = heading;
  if (questionTopic(q)==='formula') {
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
    return `<span class="progress-dot ${cls}" title="Soalan ${i+1}${answer ? answer.outcome === 'correct' ? ': betul' : answer.outcome==='wrong'?': salah':': dilangkau' : i===game.index ? ': semasa' : ''}"></span>`;
  }).join('');
  $('progress-dots').innerHTML = dots;
  $('progress-dots').setAttribute('aria-label', `Soalan ${game.index+1} daripada 10. ${game.score} pasangan betul, ${game.mistakes} salah, ${game.skipped} dilangkau.`);
  renderChoices('solid', game.solidOrder);
  renderChoices('net', game.netOrder);
  setStatus('Satu percubaan. Baca soalan, kemudian pilih bongkah untuk R1.');
  renderState();
}

function renderChoices(kind, order) {
  $(kind+'-choices').innerHTML = order.map((shape,i) => {
    const letter = String.fromCharCode(65+i), label = kind === 'solid' ? 'bongkah' : 'bentangan';
    return `<button type="button" class="choice ${kind === 'net' ? 'net-choice' : ''}" style="--i:${i}" data-kind="${kind}" data-shape="${shape}" data-letter="${letter}" aria-pressed="false" aria-label="Pilih ${label} ${letter}. ${describeShape(shape,kind)}">${shapeArt(shape,kind,true,visualPlan[kind][shape])}<span class="choice-id"><span class="grip" aria-hidden="true">⠿</span>${kind === 'solid' ? 'Bongkah' : 'Kad'} ${letter}</span></button>`;
  }).join('');
}

const emptyScanner = target => `<span class="scan-target"><span class="target-corner tl"></span><span class="target-corner tr"></span><span class="target-corner bl"></span><span class="target-corner br"></span>${icon(target === 'r2' && game.stage === 'solid' ? 'lock':'cursor')}</span><span class="scanner-placeholder">${target==='r1'?'Letak bongkah di sini':game.stage==='solid'?'Kemudian letak bentangan':'Letak kad bentangan di sini'}</span>`;

function renderState() {
  if (!game) return;
  const busy = !game.interactive||roomSending||!!roomPending;
  $('online-game-bar').hidden=!roomState;
  $('online-game-status').textContent=roomSending?'Menghantar ke server…':roomPending?'Jawapan belum dapat disahkan. Hantar semula tindakan yang sama.':'Room kelas · Markah dan masa disahkan server';
  $('online-retry').hidden=!roomPending;$('online-retry').disabled=roomSending;
  $('continue-button').disabled=roomSending||!!roomPending||!game.reviewReady(now());
  if(game.reviewing&&game.reviewReady(now()))$('continue-button').innerHTML=(game.index===9?'Lihat analisis':'Soalan seterusnya')+' '+icon('arrow');
  const active = game.stage === 'solid' ? 'r1' : 'r2';
  $('score-value').textContent = game.score;
  $('hint-button').disabled = busy;
  $('skip-button').disabled = busy;
  $('pause-button').disabled = game.status === 'feedback';
  $('hint-button').setAttribute('aria-expanded',String(game.hintOpen));
  $('hint-label').textContent = game.hintOpen ? 'Tutup petunjuk' : 'Beri petunjuk';
  $('hint-panel').hidden = !game.hintOpen;
  $('progress-dots').setAttribute('aria-label',`Soalan ${game.index+1} daripada 10. ${game.score} pasangan betul, ${game.mistakes} salah, ${game.skipped} dilangkau.`);
  $('progress-dots').querySelectorAll('.progress-dot').forEach((dot,index)=>{
    const answer=game.answers[index];
    if(answer){dot.className='progress-dot '+answer.outcome;dot.title=`Soalan ${index+1}: ${answer.outcome==='correct'?'betul':answer.outcome==='wrong'?'salah':'dilangkau'}`;}
  });
  $('stage-instruction').textContent = game.reviewing ? 'Lihat pasangan yang betul di bawah' : game.status==='feedback' ? 'Pasangan tepat! +1 markah' : game.stage==='solid'?'Pilih bongkah yang betul':'Bagus! Kini padankan bentangannya';
  document.querySelectorAll('.choice').forEach(button => {
    const isSelected = selected && button.dataset.kind === selected.kind && button.dataset.shape === selected.shape;
    button.setAttribute('aria-pressed', String(!!isSelected));
    button.classList.toggle('inactive',button.dataset.kind !== game.stage);
    button.classList.toggle('revealed-answer',game.reviewing&&button.dataset.shape===game.question.shape);
    button.classList.toggle('revealed-wrong',game.reviewing&&button.dataset.shape!==game.question.shape&&game.attempts[button.dataset.kind]===button.dataset.shape);
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
    const body = accepted ? `${shapeArt(accepted,kind,true,visualPlan[kind][accepted])}<span class="scanned-label">${icon('check')}${target==='r1'?'Bongkah diterima':'Bentangan diterima'}</span>` : emptyScanner(target);
    if ($('scanner-body-'+target).innerHTML !== body) $('scanner-body-'+target).innerHTML = body;
    const led=game.led(target,now());
    const status = scannerStatus(target,led);
    $('status-'+target).textContent = status;
    pad.setAttribute('aria-label', `Pengimbas ${target.toUpperCase()}, ${target==='r1'?'bongkah':'bentangan'}. ${status}.${selected && active===target ? ' Klik atau tekan Enter untuk imbas pilihan.' : ''}`);
  }
  renderLeds(now());
}

function scannerStatus(target,color){
  if(game.reviewing)return game.lastOutcome==='skipped'?'Dilangkau · +0':target===game.wrongReader?'Salah · +0':target==='r1'&&game.stage==='net'?'Bongkah betul':'Soalan tamat';
  if(game.status==='feedback')return '+1 markah';
  return color==='red'?'Salah':target==='r1'&&game.stage==='net'?'Imbasan betul':target==='r2'&&game.stage==='solid'?'Jawab R1 dahulu':game.hintOpen?'Petunjuk dibuka':'Sedia diimbas';
}

function renderLeds(time) {
  for (const target of ['r1','r2']) {
    let color = game.led(target,time);
    if ((reducedMotion.matches||motionPaused) && (game.status==='feedback'||game.reviewing)) color = game.lastOutcome==='correct'?'green':target===game.wrongReader||game.lastOutcome==='skipped'?'red':target==='r1'&&game.stage==='net'?'green':'off';
    if (lastLed[target] === color) continue;
    lastLed[target] = color;
    $('led-'+target).className = 'led-dot '+color;
    $(target).classList.toggle('scanner-correct',color==='green');
    $(target).classList.toggle('scanner-wrong',color==='red');
    $(target).classList.toggle('scanner-hint',color==='purple');
    $('status-'+target).textContent = scannerStatus(target,color);
    $(target).setAttribute('aria-label',`Pengimbas ${target.toUpperCase()}, ${target==='r1'?'bongkah':'bentangan'}. ${$('status-'+target).textContent}.`);
  }
}

function choose(button) {
  if (!game?.interactive||roomSending||roomPending) return;
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

async function scan(choice,target) {
  if (!game?.interactive) return;
  if (!choice) { setStatus(`Pilih ${game.stage==='solid'?'bongkah':'kad bentangan'} dahulu, kemudian klik pengimbas ${target.toUpperCase()}.`); return; }
  if(roomState){await roomCommand('answer',{kind:choice.kind,shape:choice.shape,target},result=>showScanResult(result,choice,target));return;}
  const result = game.scan(choice.kind,choice.shape,target,now());
  showScanResult(result,choice,target);
}
function showScanResult(result,choice,target){
  if (result.type==='blocked') return;
  if (result.type==='stage') { setStatus(result.target==='r1'?'R1 dahulu. Imbas bongkah sebelum kad bentangan.':'Bongkah R1 sudah betul. Padankan kad bentangan di R2.'); return; }
  if (result.type==='kind') { setStatus(game.stage==='solid'?'R1 hanya menerima bongkah 3D.':'R2 hanya menerima kad bentangan.'); return; }
  selected=null;
  if (result.type==='wrong') {
    setStatus(target==='r1'?'Bongkah belum tepat. Percubaan tamat, +0 markah. Mari lihat jawapannya.':'Bongkah R1 betul, tetapi bentangan belum sepadan. Percubaan tamat, +0 markah.','error','close');
    showCorrection();
    tone('wrong');
  } else if (result.type==='solid') {
    acceptedSolid=choice.shape;
    setStatus('Bongkah betul! Sekarang seret kad bentangannya ke R2.','success','check');
    tone('solid');
  } else if (result.type==='correct') {
    acceptedNet=choice.shape;
    setStatus('Pasangan tepat! +1 markah. Bersedia untuk soalan seterusnya.','success','check');
    tone('correct');
    $('game-screen').classList.add('is-correct');
  }
  renderState();
}

function showCorrection(){
  const answer=game.answers.at(-1),q=game.question;
  $('game-screen').classList.add('is-review');
  $('correction-panel').hidden=false;
  $('correction-outcome').textContent=answer.outcome==='wrong'?'PERCUBAAN TAMAT · +0 MARKAH':'DILANGKAU · +0 MARKAH';
  $('correction-title').textContent='Jawapan betul: '+SHAPE_NAMES[q.shape];
  $('correction-attempt').textContent=answer.failedAt?`Pilihan anda di ${answer.failedAt==='solid'?'R1':'R2'}: ${SHAPE_NAMES[answer.attempts[answer.failedAt]]}. ${answer.failedAt==='net'?'Bongkah R1 anda sudah betul.':''}`:'Soalan ini dilangkau. Lihat pasangan yang sepadan.';
  $('correction-explanation').textContent=SHAPE_NOTES[q.shape];
  $('correction-pair').innerHTML=`<div class="correct-model">${shapeArt(q.shape,'solid',false,visualPlan.solid[q.shape])}<span>R1 · ${SHAPE_NAMES[q.shape]}</span></div><span class="correct-link" aria-hidden="true">${icon('arrow')}</span><div class="correct-net">${shapeArt(q.shape,'net',false,visualPlan.net[q.shape])}<span>R2 · Bentangannya</span></div>`;
  $('continue-button').disabled=true;$('continue-button').textContent='Perhatikan jawapan…';
  $('correction-title').focus({preventScroll:true});
  $('correction-panel').scrollIntoView({block:'nearest',behavior:reducedMotion.matches||motionPaused?'instant':'smooth'});
  announce(`Jawapan betul ialah ${SHAPE_NAMES[q.shape]}. ${SHAPE_NOTES[q.shape]} Tiada markah. Tekan terus selepas melihat jawapan.`);
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
  if(roomState&&!game.hintUsed){roomCommand('hint',{},()=>{game.hintOpen=true;setStatus('Petunjuk dibuka. Tiada potongan markah.','hint','bulb');renderState();});return;}
  if(game?.toggleHint()){
    setStatus(game.hintOpen?'Petunjuk dibuka. Baca petunjuk dan teruskan memilih.':'Petunjuk ditutup. Teruskan menjawab.',game.hintOpen?'hint':'','bulb');
    renderState();
  }
});
$('skip-button').addEventListener('click',()=>{
  if(roomState){roomCommand('skip',{},()=>{selected=null;setStatus('Soalan dilangkau, +0 markah. Lihat jawapan dahulu.','','skip');showCorrection();renderState();});return;}
  if(game?.skip(now())){ cancelDrag(); selected=null;setStatus('Soalan dilangkau, +0 markah. Lihat jawapan sebelum meneruskan.','','skip');showCorrection();renderState();tone('skip'); }
});
$('continue-button').addEventListener('click',()=>{
  if(roomState){roomCommand('advance',{},()=>afterRoomAdvance());return;}
  if(!game?.continueReview(now()))return;
  if(game.status==='finished')finishGame();else{lastLed={};renderQuestion();$('question-title').focus({preventScroll:true});announce(`Soalan ${game.index+1} daripada 10. Satu percubaan.`);}
});
$('pause-button').addEventListener('click',()=>openPause());
$('replay-button').addEventListener('click',()=>roomState?openAccounts(roomState.roomId):startGame());
$('profile-button').addEventListener('click',()=>requestProfile());
$('account-button').addEventListener('click',()=>requestAccounts());
$('welcome-account-button').addEventListener('click',()=>requestAccounts());
$('guest-button').addEventListener('click',openGuest);
$('guest-back-button').addEventListener('click',returnHome);
$('module-button').addEventListener('click',()=>{
  showScreen('module');$('module-frame').srcdoc=prepareModuleFrame(moduleHtml);$('module-title').focus({preventScroll:true});
});
$('module-back-button').addEventListener('click',returnHome);
$('online-retry').addEventListener('click',()=>{if(roomPending)sendRoomPending();});
$('online-room-back').addEventListener('click',()=>openAccounts(roomState?.roomId));

function stopRoomPolling(){if(roomPolling)clearInterval(roomPolling);roomPolling=null;}
function resetRoomRequests(){roomEpoch++;roomPending=null;roomSending=false;roomInFlight=null;stopRoomPolling();}
function returnHome(){
  cancelDrag();resetRoomRequests();game=null;roomState=null;selected=null;acceptedSolid=null;acceptedNet=null;cloud.setRoom(null);
  dialogTrigger=null;if(dialog.open)closeDialog();
  showScreen('welcome');$('guest-button').focus({preventScroll:true});
}
function openGuest(){
  cancelDrag();resetRoomRequests();game=null;roomState=null;selected=null;cloud.setRoom(null);
  showScreen('guest');$('player-name').focus({preventScroll:true});
}
function displayedGameTime(time=now()){return roomState?roomState.elapsed+(roomState.status==='running'?Math.max(0,time-roomReceivedAt):0):game.time(time);}
async function openAccounts(roomId=null,profile=false){
  cancelDrag();resetRoomRequests();
  if(dialog.open)closeDialog();
  showScreen('portal');await portal.open({...(roomId?{roomId}:{}),profile});
}
let requestedProfile=false;
function requestProfile(){requestedProfile=true;requestAccounts(true);}
function requestAccounts(profile=false){
  requestedProfile=profile;
  if(screen==='game'&&game&&!roomState){openDialog('leave','Buka akaun dan kelas?',`<p class="dialog-copy">Kemajuan latihan sendiri ini belum disimpan. Buka akaun dan kelas untuk menyertai room guru.</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="close" data-autofocus>Teruskan latihan</button><button class="button button-primary" data-dialog-action="open-portal">Buka akaun dan kelas</button></div>`);return;}
  openAccounts(roomState?.roomId,profile);
}
function applyRoomState(state){
  if(!state||!Array.isArray(state.questions)||state.questions.length!==10||state.questions.some(id=>!QUESTIONS.some(q=>q.id===id)))throw Error('Bank soalan room tidak sepadan. Kemas kini permainan.');
  const keepHint=roomState?.attemptId===state.attemptId&&game?.index===state.index&&game?.hintOpen&&state.hintUsed&&state.status==='running';
  roomState=state;roomReceivedAt=now();
  if(state.status==='closed'){openAccounts(state.roomId);return false;}
  const paused=game?.paused||dialog.open;
  game.round=state.questions.map(id=>QUESTIONS.find(q=>q.id===id));
  for(const key of ['index','stage','status','score','mistakes','hints','skipped','elapsed','hintUsed','lastOutcome','wrongReader'])game[key]=state[key];
  game.hintOpen=Boolean(keepHint);
  game.firstTry=state.score;game.attempts={...state.attempts};game.answers=state.answers.map(a=>({...a,attempts:{...a.attempts}}));
  game.segmentStart=now();game.questionStartElapsed=game.elapsed;game.paused=false;
  game.transitionAt=now()+(state.status==='feedback'?state.readyInMs:Math.max(0,state.readyInMs-900));
  game.reviewReadyAt=now()+state.readyInMs;
  if(paused)game.pause(now());
  acceptedSolid=game.stage==='net'||game.attempts.solid===game.question.shape?game.question.shape:null;
  acceptedNet=game.attempts.net===game.question.shape?game.question.shape:null;
  return true;
}
function openRoomGame(state){
  portal.close();resetRoomRequests();visualPlan=null;
  const profile=cloud.profile||{};
  player={name:profile.display_name||profile.username||'Pelajar',category:'Pelajar',className:cloud.room?.class_name||'Room kelas'};
  game=new Game(QUESTIONS,player,now());roundId=state.attemptId;lastResult=null;lastClock='';lastLed={};
  if(!applyRoomState(state))return;
  showScreen('game');cloud.setRoom(state.roomId);
  $('player-initial').innerHTML=['cube','cuboid','pyramid','cylinder','cone'].includes(profile.avatar)?shapeArt(profile.avatar,'solid',true):escapeHtml(Array.from(player.name)[0]||'?');$('player-display').textContent=player.name;$('player-meta').textContent=player.className+' · Room kelas';
  restoreRoomGameView();if(game.status==='finished')return;
  const epoch=roomEpoch;let polling=false;
  roomPolling=setInterval(async()=>{if(polling||roomSending||screen!=='game'||epoch!==roomEpoch)return;polling=true;try{const data=await cloud.rpc('snapshot',{room_id:state.roomId});if(epoch===roomEpoch&&screen==='game'&&roomState?.attemptId===state.attemptId&&data.room?.status==='closed'&&game.status!=='finished')openAccounts(state.roomId);}catch{}finally{polling=false;}},20000);
  if(!game.reviewing)$('question-title').focus({preventScroll:true});
}
async function roomCommand(action,payload,onSuccess){
  if(!roomState||roomSending||roomPending)return;
  roomPending={action,payload:{...payload,attempt_id:roomState.attemptId,index:game.index,event_id:uid()},onSuccess};
  await sendRoomPending();
}
async function sendRoomPending(){
  if(!roomPending||roomSending)return;
  const command=roomPending,attemptId=roomState?.attemptId,epoch=roomEpoch;roomSending=true;roomInFlight=command;renderState();
  try{
    const data=await cloud.rpc(command.action,command.payload);
    if(epoch!==roomEpoch||roomInFlight!==command||roomPending!==command||roomState?.attemptId!==attemptId||screen!=='game')return;
    roomPending=null;roomSending=false;
    if(!applyRoomState(data.state))return;
    if(game.status==='finished'){finishGame();return;}
    const result=data.result||{type:'correct'};
    const staleAnswer=command.action==='answer'&&(['solid','wrong','correct'].includes(result.type))&&!(result.type==='solid'&&game.status==='running'&&game.stage==='net'||result.type==='wrong'&&game.reviewing&&game.lastOutcome==='wrong'||result.type==='correct'&&game.status==='feedback');
    const staleHint=command.action==='hint'&&game.status!=='running';
    const staleSkip=command.action==='skip'&&(!game.reviewing||game.lastOutcome!=='skipped');
    if(result.type==='blocked'||command.action!=='advance'&&data.state.index!==command.payload.index||staleAnswer||staleHint||staleSkip){restoreRoomGameView();setStatus('Keadaan permainan telah diselaraskan dengan server.');renderState();return;}
    command.onSuccess(result);renderState();
  }catch(e){if(epoch===roomEpoch&&roomInFlight===command&&roomState?.attemptId===attemptId&&screen==='game')setStatus(e.message+' Tekan Hantar semula.','error','refresh');}
  finally{if(epoch===roomEpoch&&roomInFlight===command){roomSending=false;roomInFlight=null;if(screen==='game')renderState();}}
}
function restoreRoomGameView(){
  if(game.status==='finished'){finishGame();return;}
  lastLed={};renderQuestion();
  if(game.reviewing){showCorrection();setStatus('Semak pasangan yang betul sebelum meneruskan.');}
  else if(game.status==='feedback'){$('game-screen').classList.add('is-correct');setStatus('Pasangan tepat! +1 markah. Bersedia untuk soalan seterusnya.','success','check');}
  else if(game.stage==='net')setStatus('Bongkah R1 sudah betul. Padankan kad bentangan di R2.','success','check');
  renderState();
}
function afterRoomAdvance(){
  restoreRoomGameView();
  if(game.status!=='finished'&&!game.reviewing)$('question-title').focus({preventScroll:true});
}

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
    drag.ghost.innerHTML=shapeArt(drag.choice.shape,drag.choice.kind,true,visualPlan[drag.choice.kind][drag.choice.shape]);
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
  if(action==='open-portal')openAccounts(null,requestedProfile);
  if(action==='home')returnHome();
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
  openDialog('help','Cara main GeoDecoder',`<p class="help-intro">Satu soalan, dua padanan, <b>satu percubaan</b>. Sasarkan <b>10 daripada 10 markah</b>.</p><div class="help-steps"><div class="help-step"><span class="help-number">1</span><div><h3>Baca soalan dan pilih bongkah</h3><p>Seret satu bongkah 3D ke pengimbas R1 yang berwarna biru.</p></div></div><div class="help-step"><span class="help-number">2</span><div><h3>Padankan kad bentangannya</h3><p>Selepas R1 hijau, seret kad bentangan yang sepadan ke R2. Bentuk menentukan jawapan; warna dan kedudukan berubah setiap soalan.</p></div></div><div class="help-step"><span class="help-number">3</span><div><h3>Semak dan belajar</h3><p>Pasangan betul memberi +1. Salah pada R1 atau R2 menamatkan soalan dengan +0. Lihat jawapan betul, kemudian tekan soalan seterusnya.</p></div></div></div><div class="help-mini-art">${shapeArt('cube','solid',true,'orange')}<span>R1 ${icon('arrow')} R2</span>${shapeArt('cube','net',true,'violet')}</div><p class="keyboard-help">Tanpa menyeret: <b>klik / sentuh kad</b>, kemudian <b>klik pengimbas</b>. Papan kekunci: <kbd>Tab</kbd> untuk bergerak, <kbd>Enter</kbd> atau <kbd>Space</kbd> untuk memilih dan mengimbas.</p><p class="help-note"><b>Fikir dahulu sebelum mengimbas.</b> Memilih kad sahaja belum menggunakan percubaan. Petunjuk percuma. Langkau memberi +0 dan turut menunjukkan jawapan. Analisis akhir membantu anda memilih perkara yang perlu dilatih lagi. ${roomState?'Dalam room, masa menjawab terus dikira oleh server semasa dialog dibuka atau tab ditinggalkan. Masa semakan jawapan dikecualikan.':'Jam latihan sendiri dijeda semasa semakan dan tetingkap ini dibuka.'}</p><div class="dialog-actions"><button class="button button-primary" data-dialog-action="close" data-autofocus>${screen==='game'?'Sambung permainan':'Saya faham'} ${icon('arrow')}</button></div>`);
}

function openPause(automatic=false){
  if(!game || screen!=='game')return;
  game.pause(now());
  openDialog('pause',roomState?'Kawalan dijeda':'Permainan dijeda',`<div class="pause-symbol">${icon('pause')} ${formatTime(displayedGameTime())}</div><p class="dialog-copy">${roomState?'Masa menjawab room terus dikira oleh server, termasuk semasa jeda atau meninggalkan tab. Kemajuan disimpan dan boleh disambung selagi room dibuka.':automatic?'Permainan dijeda semasa anda meninggalkan tab ini.':'Berehat seketika. Masa dan soalan anda dikekalkan.'} Tekan sambung apabila sudah bersedia.</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="request-home">${roomState?'Kembali ke room':'Tamatkan pusingan'}</button><button class="button button-primary" data-dialog-action="close" data-autofocus>Sambung permainan ${icon('arrow')}</button></div>`);
}

function requestHome(){
  if(roomState&&screen==='game'){openAccounts(roomState.roomId);return;}
  if(screen==='game' && game && game.status!=='finished'){
    openDialog('leave','Tamatkan pusingan ini?',`<p class="dialog-copy">Anda sedang bermain soalan <b>${game.index+1} daripada 10</b>. Jika kembali ke mula, kemajuan pusingan ini dilepaskan dan skor pusingan ini tidak disimpan.</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="close" data-autofocus>Terus bermain</button><button class="button button-danger" data-dialog-action="home">Tamatkan pusingan</button></div>`);
  }else returnHome();
}

function miniScoresMarkup(scores){
  if(!scores.length)return `<div class="empty-scores">${icon('trophy')}<h3>Skor pertama menanti</h3><p>Lengkapkan satu pusingan untuk menyimpan skor.</p></div>`;
  return scores.slice(0,5).map((r,i)=>`<div class="mini-score ${r.id===lastResult?.id?'mine':''}"><span class="mini-rank">${i+1}</span><span class="mini-player"><b>${escapeHtml(r.player.name)}${r.id===lastResult?.id?' · Anda':''}</b><small>${escapeHtml(r.player.className)} · ${r.mistakes} soalan salah</small></span><span class="mini-points">${r.score}<small>${formatTime(r.elapsed)}</small></span></div>`).join('');
}
function renderMiniScores(){ $('result-leaderboard').innerHTML=miniScoresMarkup(store.read());storageStatus(); }

function openScores(message=''){
  const scores=store.read(),legacy=store.readLegacy();storageStatus();
  const visible=scoresExpanded?scores:scores.slice(0,10);
  const table=scores.length?`<div class="score-table-wrap"><table class="score-table"><caption class="sr-only">Skor terbaik dalam pelayar ini</caption><thead><tr><th scope="col">#</th><th scope="col">Pemain</th><th scope="col">Kelas</th><th scope="col">Markah</th><th scope="col">Salah / Masa</th></tr></thead><tbody>${visible.map((r,i)=>`<tr class="${r.id===lastResult?.id?'mine':''}"><td>${i+1}</td><td><b>${escapeHtml(r.player.name)}</b><small>${escapeHtml(r.player.category)}</small></td><td>${escapeHtml(r.player.className)}</td><td><b>${r.score} / 10</b></td><td>${r.mistakes} salah<small>${formatTime(r.elapsed)}</small></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-scores">${icon('trophy')}<h3>Belum ada skor</h3><p>Lengkapkan 10 soalan untuk merekodkan skor pertama.</p></div>`;
  const legacyMarkup=legacy.length?`<details class="legacy-scores"><summary>Skor V1 terdahulu (${legacy.length})</summary><p>Peraturan lama membenarkan cuba semula. Rekod ini disimpan berasingan daripada kedudukan satu percubaan.</p><ol>${legacy.map(r=>`<li><b>${escapeHtml(r.player.name)}</b> · ${escapeHtml(r.player.className)} · ${r.score}/10 · ${formatTime(r.elapsed)}</li>`).join('')}</ol></details>`:'';
  openDialog('scores','Papan skor',`<p class="score-info"><b>Mod satu percubaan.</b> ${store.failed?'Skor sesi ini sahaja; simpanan pelayar tidak tersedia.':'Rekod dalam pelayar ini sahaja. Maksimum 50 skor terbaik.'} Skor tertinggi dahulu, kemudian soalan salah paling sedikit dan masa terpantas.</p>${message?`<p class="help-note" role="status">${escapeHtml(message)}</p>`:''}${table}${legacyMarkup}<div class="score-toolbar"><span>${visible.length} daripada ${scores.length} rekod semasa</span>${scores.length>10&&!scoresExpanded?'<button class="button button-outline" data-dialog-action="show-all">Lihat semua skor</button>':''}<button class="button button-outline" data-dialog-action="export" ${!scores.length?'disabled':''}>${icon('download')} Eksport CSV</button><button class="button button-quiet score-delete" data-dialog-action="erase" ${!scores.length&&!legacy.length?'disabled':''}>${icon('trash')} Padam skor</button></div><div class="dialog-actions"><button class="button button-primary" data-dialog-action="close">${screen==='game'?'Sambung permainan':'Tutup papan skor'}</button></div>`);
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
  if(!roomState)store.save(lastResult);storageStatus();stopRoomPolling();
  const r=lastResult;
  $('result-title').textContent=r.score===10?'Hebat! Semua pasangan tepat.':r.score>=7?'Bagus, anda semakin mahir!':'Teruskan mencuba, teruskan belajar.';
  $('result-player').textContent=`${r.player.name} · ${r.player.category} · ${r.player.className}`;
  $('result-score').textContent=r.score;
  $('result-level').textContent=r.score===10?'Pakar padanan':r.score>=7?'Penjelajah geometri':'Peneroka bentuk';
  const rank=roomState?0:store.read().findIndex(s=>s.id===r.id)+1;
  $('result-message').textContent=`${r.score} pasangan betul, ${r.mistakes} soalan salah, ${r.skipped} dilangkau.${rank>0?` Kedudukan #${rank} dalam papan skor satu percubaan pelayar ini.`:''}`;
  if(roomState)$('result-message').textContent+=' Keputusan akhir ini telah disimpan ke room guru.';
  $('replay-button').innerHTML=icon('refresh')+(roomState?' Kembali ke room':' Main lagi');
  $('result-time').textContent=formatTime(r.elapsed);
  $('result-first').textContent=`${analyseAnswers(r.answers).byStage[0].correct} / 10`;
  $('result-mistakes').textContent=r.mistakes;
  $('result-hints').textContent=r.hints;
  renderAnalysis(r);
  $('review-list').innerHTML=r.answers.map((answer,i)=>{
    const q=QUESTIONS.find(q=>q.id===answer.id);
    const attempts=['solid','net'].map((kind,index)=>`R${index+1}: ${answer.attempts[kind]?SHAPE_NAMES[answer.attempts[kind]]:'belum diimbas'}`).join(' · ');
    return `<article class="review-card ${answer.outcome}"><small>SOALAN ${i+1} · ${TOPIC_NAMES[answer.topic]}</small><p class="review-prompt">${pretty(q.prompt)}</p><div class="review-pair">${shapeArt(answer.shape,'solid',true,'orange')}${shapeArt(answer.shape,'net',true,'violet')}</div><h3>Jawapan: ${SHAPE_NAMES[answer.shape]}</h3><p class="review-outcome">${answer.outcome==='correct'?'✓ Pasangan betul · +1':answer.outcome==='wrong'?`✕ Salah di ${answer.failedAt==='solid'?'R1':'R2'} · +0`:'↷ Dilangkau · +0'}</p><p class="review-attempt">${attempts}${answer.hint?'<br>Petunjuk digunakan':''}</p></article>`;
  }).join('');
  renderMiniScores();
  if(roomState)$('result-leaderboard').innerHTML=`<p class="score-info">Keputusan room anda disahkan server. Tekan <b>Kembali ke room</b> untuk melihat kedudukan semasa bersama rakan sekelas.</p>`;
  showScreen('result');
  $('result-title').focus({preventScroll:true});
  announce(`Pusingan selesai. ${r.score} daripada 10 markah. Masa ${formatTime(r.elapsed)}.`);
}

function analysisBar(label,correct,total,note='',art=''){
  const percent=total?Math.round(correct/total*100):0;
  return `<div class="analysis-row">${art}<div class="analysis-row-body"><div class="analysis-row-title"><b>${label}</b><span>${total?`${correct} / ${total} <small>(${percent}%)</small>`:'Belum dicuba'}</span></div><div class="analysis-track" aria-hidden="true"><span style="width:${percent}%"></span></div>${note?`<p>${note}</p>`:''}</div></div>`;
}

function renderAnalysis(result){
  const a=analyseAnswers(result.answers),weak=a.weakShapes.filter(row=>row.wrong),advice=[];
  let title,copy;
  if(result.score===10){title='Semua pasangan tepat!';copy=result.hints?`${result.hints} soalan menggunakan petunjuk. Cuba pusingan baharu tanpa petunjuk untuk menguji ingatan.`:'Anda berjaya mengenal bongkah dan memadankan semua bentangan dalam pusingan ini.';}
  else if(!result.mistakes){title=result.skipped===10?'Cuba menjawab untuk melihat kekuatan anda.':'Padanan yang anda cuba sudah tepat.';copy=`${result.skipped} soalan dilangkau. Lengkapkan soalan itu dalam pusingan baharu untuk melihat kefahaman anda.`;}
  else{title='Fokus semula: '+weak.map(row=>SHAPE_NAMES[row.id]).join(', ')+'.';copy=`${result.mistakes} soalan salah${result.skipped?`, ${result.skipped} dilangkau`:''}. Lihat tahap dan jenis soalan di bawah sebelum mencuba lagi.`;}
  $('analysis-summary').innerHTML=`${icon(result.score===10?'trophy':'bulb')}<div><h3>${title}</h3><p>${copy}</p></div>`;
  $('analysis-shapes').innerHTML=a.byShape.map(row=>analysisBar(SHAPE_NAMES[row.id],row.correct,row.total,`${row.wrong} salah · ${row.skipped} dilangkau · ${row.hints} guna petunjuk`,shapeArt(row.id,'solid',true,visualPlan.solid[row.id]))).join('');
  $('analysis-stages').innerHTML=a.byStage.map(row=>analysisBar(row.id==='solid'?'R1 · Kenal bongkah':'R2 · Padankan bentangan',row.correct,row.attempted,`${row.wrong} imbasan salah · ${row.notAttempted} belum dicuba`)).join('');
  $('analysis-topics').innerHTML=a.byTopic.map(row=>analysisBar(TOPIC_NAMES[row.id],row.correct,row.total,`${row.wrong} salah · ${row.skipped} dilangkau`)).join('');
  if(a.weakStage)advice.push(a.weakStage.id==='net'?'Latih bentangan R2: kira bentuk dan bilangan mukanya. Bayangkan setiap muka dilipat sebelum mengimbas.':'Latih bongkah R1: kenal pasti tapak, muka rata, permukaan melengkung dan puncak daripada soalan.');
  for(const row of weak.slice(0,2))advice.push(SHAPE_NOTES[row.id]);
  if(a.byTopic.find(row=>row.id==='formula').wrong)advice.push('Latih rumus: bezakan isi padu V dan luas permukaan L. Fahami simbol jejari, tinggi dan tinggi sendeng dalam soalan.');
  if(result.skipped)advice.push(`Cuba semula ${result.skipped} soalan yang dilangkau. Gunakan petunjuk sebelum mengimbas jika belum pasti.`);
  if(!advice.length)advice.push(result.hints?'Cuba pusingan baharu tanpa petunjuk. Kekalkan ketepatan sebelum mengejar masa.':'Teruskan dengan pusingan baharu. Susunan, warna dan pilihan soalan akan berubah.');
  $('analysis-advice').innerHTML=`<h3>Cadangan latihan anda</h3><ul>${advice.slice(0,4).map(text=>`<li>${text}</li>`).join('')}</ul><p>R2 yang belum dicuba selepas salah R1 tidak dikira sebagai kesilapan R2. Petunjuk tidak memotong markah.</p>`;
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
  if(event.key===SCORE_KEY || event.key===LEGACY_SCORE_KEY || event.key===null){store.memory=[];if(dialogMode==='scores')openScores();if(screen==='result')renderMiniScores();}
});

function frame(time){
  if(game && screen==='game'){
    if(roomState&&game.status==='feedback'&&!game.paused&&time>=game.transitionAt&&!roomPending&&!roomSending)roomCommand('advance',{},afterRoomAdvance);
    if(!roomState&&game.update(time)){
      if(game.status==='finished')finishGame();
      else{lastLed={};renderQuestion();$('question-title').focus({preventScroll:true});announce(`Soalan ${game.index+1} daripada 10. Pilih bongkah untuk R1.`);}
    }
    const clock=formatTime(displayedGameTime(time));
    if(clock!==lastClock){$('time-value').textContent=clock;lastClock=clock;}
    renderLeds(time);
    if(game.reviewing&&game.reviewReady(time)&&$('continue-button').disabled&&!roomSending&&!roomPending){
      $('continue-button').disabled=false;
      $('continue-button').innerHTML=(game.index===9?'Lihat analisis':'Soalan seterusnya')+' '+icon('arrow');
    }
  }
  if(drag?.started){
    const step=drag.y<90?-10:drag.y>window.innerHeight-65?10:0;
    if(step){window.scrollBy(0,step);moveDrag();}
  }
  requestAnimationFrame(frame);
}
store.read();storageStatus();
requestAnimationFrame(frame);
if(cloud.hasAuthCallback||cloud.hasRecoveryIntent)void openAccounts();
