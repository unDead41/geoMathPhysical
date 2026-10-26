import {SoloStore,restoreSnapshot} from './solo-save.mjs';
import {reviewQuestionIds} from './usability.mjs';
import {createPreferences,PREFERENCES_KEY,textSize} from './preferences.mjs';
import {ModuleProgress} from './module-progress.mjs';
import {createUsabilityUI} from './usability-ui.mjs';
import {createHelpSupport} from './help-support.mjs';
import {ClassroomCloud} from './cloud.mjs';
import {createPortal} from './portal.mjs';
import {initTheme,setTheme} from './theme.mjs';
import {createMusic} from './music.mjs';
import moduleHtml from '../vendor/module-v1.6.0.html';
import {createModuleBridge} from './module-settings.mjs';

import {createI18n, translate, localizeQuestion, shapeName} from './i18n.mjs';
import {escapeHtml, formatRichText} from './format.mjs';
import {DuelClient,duelVerdict,formatDuelTime} from './duel.mjs';
import { QUESTIONS } from './questions.mjs';
import { Game, VERSION, ROUND_SIZE, PRACTICE_SIZE, SHAPES, formatTime, validateGuest, questionTopic, analyseAnswers } from './core.mjs';
import { nextVisualPlan } from './visuals.mjs';
import { ScoreStore, csvScores, SCORE_KEY, LEGACY_SCORE_KEY } from './storage.mjs';
import { shapeArt, icon, brandArt, describeShape } from './art.mjs';

const $ = id => document.getElementById(id);
const pretty = value => formatRichText(value,locale.language);
const now = () => performance.now();
let storage;
try { storage = window.localStorage; } catch { storage = {getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');},removeItem(){throw new Error('Storage unavailable');}}; }
const store = new ScoreStore(storage);
const preferenceStore=createPreferences(storage);let preferences=preferenceStore.value;
let usabilityUI=null,moduleBridge=null,helpSupport=null;
const locale = createI18n(storage);
const t = (key,params) => translate(locale.language,key,params);
const music=createMusic({storage,persistEnabled:false,onChange:renderMusicButton});
function renderMusicButton(state){
  const button=$('music-button');
  const label=t(state.error?'ease.musicError':state.enabled?'ease.musicOn':'ease.musicOff');
  if(button.dataset.musicEnabled!==String(state.enabled)){button.innerHTML=icon(state.enabled?'sound':'mute');button.dataset.musicEnabled=String(state.enabled);}
  button.setAttribute('aria-pressed',String(state.enabled));button.setAttribute('aria-label',label);button.title=label;
  button.dataset.track=state.track;button.dataset.playback=state.status;
}
// Playback begins only after a browser-approved user gesture.
function unlockMusic(event){if(event.target?.closest?.('#music-button'))return;if(event.isTrusted&&(!music.state.unlocked||music.state.blocked))void music.unlock();}
document.addEventListener('pointerdown',unlockMusic,{capture:true});
document.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key))unlockMusic(event);},{capture:true});
$('music-button').addEventListener('click',()=>{preferenceStore.set({music:!preferences.music});void music.unlock();});
let screen = 'welcome', game = null, selected = null, acceptedSolid = null, acceptedNet = null;
let reviewIds=[];
let player = null, playMode = 'quiz', roundId = '', lastResult = null, dialogMode = '', dialogTrigger = null;
let drag = null, suppressClickUntil = 0, hiddenPause = false, sound = preferences.effects, audioContext = null;
let scoresExpanded = false, lastClock = '', lastLed = {}, visualPlan = null, motionPaused = false;
let roomState=null,roomReceivedAt=0,roomPending=null,roomSending=false,roomPolling=null,roomEpoch=0,roomInFlight=null;
const cloud=new ClassroomCloud();
const soloStore=new SoloStore(storage,QUESTIONS);
let soloActor=cloud.session?.user?.id||'guest',soloNotice='',soloNewAction=null;
let moduleLaunchEpoch=0,moduleReturnToPortal=false;
const moduleProgress=new ModuleProgress({storage,cloud,onChange:renderModuleSaveStatus});
const portal=createPortal({cloud,onPlay:openRoomGame,onModule:()=>void openLearningModule(true),onPreferences:()=>usabilityUI.openSettings(),onExit:returnHome,onError:()=>{}});
const dialog = $('app-dialog');
let refreshingLanguage=false, lastStatus=null, validationErrors=null, scoreNotice='', automaticPause=false;
let duelBusy=false,duelNeedsRestore=false,duelAppliedSeq=-1,duelNoticeKey='',duelInputsBlocked=null;
let duelSessionStorage;try{duelSessionStorage=window.sessionStorage;}catch{duelSessionStorage=null;}
const duelClient=new DuelClient({storage:duelSessionStorage,onChange:()=>onDuelSnapshot()});
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
  motionPaused=preferences.motion==='reduce'||preferences.motion==='system'&&reducedMotion.matches;
  document.body.classList.toggle('motion-paused',motionPaused);
  $('motion-select').value=preferences.motion;
  moduleBridge?.sync();
}
reducedMotion.addEventListener('change',updateMotion);updateMotion();

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
  if(next!=='portal')portal.close();
  screen = next;
  $('welcome').hidden = next !== 'welcome';
  $('game-screen').hidden = next !== 'game';
  $('result-screen').hidden = next !== 'result';
  $('duel-screen').hidden = next !== 'duel';
  $('guest-screen').hidden=next!=='guest';
  $('portal-screen').hidden=next!=='portal';
  $('module-screen').hidden=next!=='module';
  if(next!=='module'){moduleLaunchEpoch++;moduleProgress.close();moduleBridge?.clear();}
  void music.setScene(next==='duel'?'game':next);
  updateTitle(next);
  updateSoloEntry();
  window.scrollTo({top:0,behavior:'instant'});
}
function updateTitle(next=screen) {
  if(['guest','portal','module'].includes(next)){document.title=t('platform.title.'+next);return;}
  if(next==='duel'){document.title=t('duel.pageTitle');return;}
  document.title = next === 'welcome' ? t("GeoDecoder Digital — Jom main geometri") : next === 'game' ? t("GeoDecoder Digital — Sedang bermain") : t("GeoDecoder Digital — Keputusan pusingan");
}
function uid() { return globalThis.crypto?.randomUUID?.() || `round-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

const modeTitle=mode=>t(mode==='review'?'ease.reviewMode':mode==='duel'?'duel.title':mode==='practice'?'mode.practiceTitle':'mode.quizTitle');
const selectedTotal=()=>$('play-mode').value==='practice'?PRACTICE_SIZE:ROUND_SIZE;
function updateModeChoice(){
  const practice=$('play-mode').value==='practice';
  const duel=$('play-mode').value==='duel';
  $('entry-question-count').textContent=selectedTotal();
  $('mode-description').textContent=t(duel?'duel.modeNote':practice?'mode.practiceNote':'mode.quizNote');
  $('start-label').textContent=t(duel?'duel.open':practice?'mode.startPractice':'Mulakan permainan');
  $('privacy-note-text').textContent=t(duel?'duel.privacy':'Nama dan skor disimpan dalam pelayar ini sahaja. Anda boleh gunakan nama panggilan.');
}
$('play-mode').addEventListener('change',updateModeChoice);

function duelErrorKey(){const key='duel.error.'+duelClient.error;return t(key)?key:'duel.error';}
function duelMarkup(id,html){if($(id).innerHTML!==html)$(id).innerHTML=html;}
function duelPlayersMarkup(snapshot,final=false){
  return [snapshot.me,snapshot.opponent].map((p,index)=>{
    if(!p)return `<div class="duel-player waiting"><strong>${t('duel.friend')}</strong><p>${t('duel.waitFriend')}</p></div>`;
    const progress=Math.max(0,Math.min(10,p.answered||0));
    const away=index===1&&!p.finishedAt&&duelClient.clock()-p.lastSeenAt>15000;
    const status=p.forfeited?t('duel.forfeited'):p.finishedAt?t('duel.finished'):away?t('duel.awayEstimated'):snapshot.room.status==='waiting'?(p.ready?t('duel.isReady'):t('duel.notReady')):t('duel.progress',{answered:progress});
    return `<div class="duel-player ${index===0?'self':''}"><small>${t(index===0?'duel.you':'duel.friend')}</small><strong>${escapeHtml(p.name)}</strong><div><b>${p.score} / 10</b><span>${status}</span></div>${final&&p.finishedAt?`<p>${formatDuelTime(p.elapsed)}</p>`:''}<div class="duel-track" aria-hidden="true"><span style="width:${progress*10}%"></span></div></div>`;
  }).join('');
}
function renderDuelViews(){
  const s=duelClient.snapshot,closed=s&&['complete','cancelled','expired'].includes(s.room.status);
  $('duel-resume-banner').hidden=!duelClient.hasSession;
  if(lastResult)renderReviewAction();
  $('duel-entry').hidden=!!s;
  $('duel-room').hidden=!s;
  $('duel-create').disabled=duelBusy||duelClient.pending;
  $('duel-join').disabled=duelBusy||duelClient.pending;
  $('duel-pin').disabled=duelBusy;
  $('duel-ready').disabled=duelBusy||!duelClient.connected||duelClient.pending||!s||s.room.status!=='waiting'||s.me.ready;
  $('duel-ready').textContent=t(s?.me.ready?'duel.isReady':'duel.ready');
  const reconnect=duelClient.hasSession&&(!duelClient.connected||duelClient.pending);
  for(const id of ['duel-retry','duel-live-retry','duel-result-retry']){$(id).hidden=!reconnect;$(id).disabled=duelBusy;}
  $('duel-new-room').hidden=!(closed||['invalid_token','room_expired','room_unavailable'].includes(duelClient.error));
  const connection=duelBusy?t('duel.connecting'):duelClient.connected?t('duel.connected'):['invalid_token','room_expired'].includes(duelClient.error)?t('duel.closed'):duelClient.session?.roomId?t('duel.offline'):'';
  $('duel-connection').textContent=connection;$('duel-live-connection').textContent=connection;
  $('duel-message').textContent=duelClient.error?t(duelErrorKey()):duelNoticeKey?t(duelNoticeKey):'';
  $('duel-live-message').textContent=duelClient.error?t(duelErrorKey()):'';
  const leaveError=$('dialog-content').querySelector('.duel-leave-error');if(leaveError)leaveError.textContent=duelClient.error?t(duelErrorKey()):'';
  $('duel-live').hidden=game?.mode!=='duel';
  $('duel-result').hidden=screen!=='result'||lastResult?.mode!=='duel'||!s;
  if(s){
    $('duel-room-code').value=s.room.code;
    $('duel-live-code').textContent='PIN '+s.room.code;
    duelMarkup('duel-lobby-players',duelPlayersMarkup(s));duelMarkup('duel-live-players',duelPlayersMarkup(s));
    $('duel-live-note').textContent=s.opponent&&!s.opponent.finishedAt&&duelClient.clock()-s.opponent.lastSeenAt>15000?t('duel.presenceAway'):t('duel.clockNote');
    const reason={score:'duel.byScore',time:'duel.byTime',forfeit:'duel.byForfeit',deadline:'duel.byDeadline'}[s.room.reason];
    duelMarkup('duel-result-content',`<span class="eyebrow">GEODECODER DUEL</span><h2>${t(duelVerdict(s))}</h2>${reason?`<p>${t(reason)}</p>`:''}<div class="duel-players">${duelPlayersMarkup(s,true)}</div><p>${t('duel.resultScope')}</p>`);
    if(closed&&s.room.status!=='complete')$('duel-countdown').textContent=t('duel.closed');
    else if(s.room.status==='waiting')$('duel-countdown').textContent=t(s.opponent?'duel.waitReady':'duel.waitFriend');
  }
  renderDuelClock();
}
function renderDuelClock(){
  const s=duelClient.snapshot;
  const lobby=s?.room.status==='waiting'?t('duel.lobbyRemaining',{time:formatTime(Math.max(0,s.room.lobbyExpiresAt-duelClient.clock()))}):'';
  const match=s&&['playing','countdown'].includes(s.room.status)?t('duel.matchRemaining',{time:formatTime(Math.max(0,s.room.deadlineAt-duelClient.clock()))}):'';
  if($('duel-lobby-expiry').textContent!==lobby)$('duel-lobby-expiry').textContent=lobby;
  if($('duel-time-remaining').textContent!==match)$('duel-time-remaining').textContent=match;
}
async function duelTask(task){
  if(duelBusy)return null;
  duelBusy=true;duelNoticeKey='';renderDuelViews();if(game&&screen==='game')renderState();
  try{return await task();}
  catch{duelNeedsRestore=true;if(game&&screen==='game')setStatus(duelErrorKey(),'error','close');return null;}
  finally{duelBusy=false;renderDuelViews();if(game&&screen==='game')renderState();}
}
function restoreDuelGame(){
  const s=duelClient.snapshot;if(!s||!game||game.mode!=='duel')return;
  try{
    const paused=game.paused||dialog.open||document.hidden;
    game=Game.fromDuelSnapshot(QUESTIONS,player,s,now());duelAppliedSeq=s.me.seq;duelNeedsRestore=false;
    if(game.status==='finished'){finishGame();return;}
    if(paused)game.pause(now());
    lastLed={};renderQuestion();renderRestoredDuelPhase();
  }catch{duelClient.connected=false;duelClient.error='invalid_response';renderDuelViews();renderState();}
}
function onDuelSnapshot(){
  renderDuelViews();
  if(screen==='result'&&lastResult?.mode==='duel')renderReviewAction();
  const s=duelClient.snapshot;
  if(s&&['complete','cancelled','expired'].includes(s.room.status))duelClient.stopPolling();
  if(s&&game?.mode==='duel'&&screen==='game'&&!duelBusy&&duelClient.connected&&!duelClient.busy&&(duelNeedsRestore||s.me.seq>duelAppliedSeq))restoreDuelGame();
}
function tickDuel(){
  if(playMode!=='duel'||!duelClient.snapshot)return;
  const s=duelClient.snapshot;
  renderDuelClock();
  if(screen==='duel'&&s.room.startsAt&&['countdown','playing','complete'].includes(s.room.status)){
    const remaining=s.room.status==='complete'?0:Math.max(0,Math.ceil((s.room.startsAt-duelClient.clock())/1000));
    const message=remaining?t('duel.countdown',{seconds:remaining}):t('duel.live');
    if($('duel-countdown').textContent!==message)$('duel-countdown').textContent=message;
    if(!remaining&&!duelBusy&&duelClient.connected){
      if(s.room.status==='countdown'){void duelTask(()=>duelClient.refresh());return;}
      startGame();return;
    }
  }
  if(screen==='game'&&game?.mode==='duel'&&!duelBusy){
    if(s.room.status==='complete'&&!s.me.reviewPending){restoreDuelGame();return;}
    if(game.status==='feedback'&&!game.paused&&duelClient.connected&&!duelClient.pending&&duelClient.clock()>=(s.me.nextReadyAt||0))void advanceDuel();
    const blocked=duelBusy||!duelClient.connected||duelClient.pending||duelClient.clock()<(s.me.nextReadyAt||s.room.startsAt||0);
    if(blocked!==duelInputsBlocked){duelInputsBlocked=blocked;renderState();}
  }
}
function renderRestoredDuelPhase(){
  const settled=game.reviewing||game.status==='feedback';
  acceptedSolid=game.attempts.solid&&(settled?game.attempts.solid===game.question.shape:game.stage==='net')?game.attempts.solid:null;
  acceptedNet=game.status==='feedback'?game.attempts.net:null;
  if(game.reviewing){renderCorrection();setStatus('duel.reviewRestored','','bulb');}
  else if(game.status==='feedback'){$('game-screen').classList.add('is-correct');setStatus('Pasangan tepat! +1 markah. Bersedia untuk soalan seterusnya.','success','check');}
  else if(game.stage==='net')setStatus('Bongkah betul! Sekarang seret kad bentangannya ke R2.','success','check');
  renderState();
}
async function advanceDuel(){
  if(!game||game.mode!=='duel'||duelBusy||!duelClient.connected||duelClient.pending)return;
  const ack=await duelTask(()=>duelClient.act('advance',{questionIndex:game.index}));
  if(ack){duelAppliedSeq=ack.me.seq;restoreDuelGame();if(screen==='game')$('question-title').focus({preventScroll:true});}
}
async function openDuelLobby(){
  game=null;lastResult=null;duelNoticeKey='';showScreen('duel');renderDuelViews();$('duel-title').focus({preventScroll:true});
  if(duelClient.hasSession){await duelTask(()=>duelClient.resume());duelClient.startPolling();}
}
async function reconnectDuel(){
  const result=await duelTask(()=>duelClient.resume());
  if(result){duelClient.startPolling();if(screen==='game')restoreDuelGame();}
}
async function leaveDuel(newRoom=false){
  if(duelBusy)return;
  if(duelClient.snapshot&&!['invalid_token','room_expired'].includes(duelClient.error)&&!['complete','cancelled','expired'].includes(duelClient.snapshot.room.status)){
    if(duelClient.pending&&!(await duelTask(()=>duelClient.resume())))return;
    if(!(await duelTask(()=>duelClient.act('leave'))))return;
  }
  game=null;lastResult=null;selected=null;duelNeedsRestore=false;duelAppliedSeq=-1;duelClient.forget();closeDialog();
  if(newRoom){showScreen('duel');renderDuelViews();}else returnHome();
}
$('duel-create').addEventListener('click',async()=>{if(await duelTask(()=>duelClient.create(player.name)))duelClient.startPolling();});
$('duel-join-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!/^[0-9]{6}$/.test($('duel-pin').value)){duelClient.error='invalid_request';$('duel-pin').setAttribute('aria-invalid','true');renderDuelViews();$('duel-pin').focus();return;}
  if(await duelTask(()=>duelClient.join(player.name,$('duel-pin').value)))duelClient.startPolling();
});
$('duel-pin').addEventListener('input',()=>{$('duel-pin').value=$('duel-pin').value.replace(/[^0-9]/g,'').slice(0,6);$('duel-pin').removeAttribute('aria-invalid');if(duelClient.error==='invalid_request'){duelClient.error='';renderDuelViews();}});
$('duel-ready').addEventListener('click',()=>duelTask(()=>duelClient.act('ready')));
$('duel-copy').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('duel-room-code').value);duelNoticeKey='duel.copied';}
  catch{$('duel-room-code').focus();$('duel-room-code').select();duelNoticeKey='duel.copySelected';}
  renderDuelViews();
});
for(const id of ['duel-retry','duel-live-retry','duel-result-retry'])$(id).addEventListener('click',reconnectDuel);
$('duel-new-room').addEventListener('click',()=>leaveDuel(true));
$('duel-home').addEventListener('click',requestHome);
$('duel-resume-button').addEventListener('click',async()=>{
  playMode='duel';player={name:t('duel.you'),category:'Tetamu',className:''};
  await openDuelLobby();
});

$('player-form').addEventListener('submit', event => {
  event.preventDefault();
  if (screen !== 'guest') return;
  const form = new FormData(event.currentTarget);
  const result = validateGuest({name:form.get('name')});
  validationErrors=result.errors;
  for (const key of ['name']) {
    const field = $(key === 'name' ? 'player-name' : 'player-class');
    $(key + '-error').textContent = (result.errors[key] ? t(result.errors[key]) : '');
    field.setAttribute('aria-invalid', String(!!result.errors[key]));
  }
  if (!result.valid) {
    if (result.errors.name) $('player-name').focus();
    announce(t("Maklumat belum lengkap. ") + Object.values(result.errors).map(key=>t(key)).join(' '));
    return;
  }
  player = result.player;
  playMode=$('play-mode').value;
  if(!preferences.tutorialSeen)usabilityUI.openTutorial({start:true});else beginSelectedMode();
});
for (const [id,key] of [['player-name','name']]) {
  $(id).addEventListener('input', () => { $(id).removeAttribute('aria-invalid'); $(key+'-error').textContent = '';if(validationErrors)delete validationErrors[key]; });
}

function beginSelectedMode(){if(playMode==='duel')openDuelLobby();else startGame();}
function playerMeta(){return roomState?player.className:t(player.category)+(player.className?' · '+player.className:'');}
function startGame(confirmed=false) {
  if (!player) return;
  if(playMode!=='duel'&&!confirmed&&((soloStore.read(soloActor)?.state.status!=='finished'&&soloStore.status==='saved')||soloStore.status==='invalid')){soloNewAction=()=>startGame(true);openSolo();return;}
  cancelDrag();roomState=null;resetRoomRequests();cloud.setRoom(null);
  game = playMode==='duel'?Game.fromDuelSnapshot(QUESTIONS,{...player,name:duelClient.snapshot.me.name},duelClient.snapshot,now()):new Game(QUESTIONS, player, now(),Math.random,{mode:playMode,questionIds:playMode==='review'?reviewIds:undefined});
  // A fresh server snapshot already includes recovery from earlier lobby errors.
  if(playMode==='duel'){player={...player,name:duelClient.snapshot.me.name};duelAppliedSeq=duelClient.snapshot.me.seq;duelNeedsRestore=false;}
  roundId = playMode==='duel'?'duel:'+duelClient.snapshot.room.id+':'+duelClient.snapshot.me.id:uid(); lastResult = null; lastClock = ''; lastLed = {}; visualPlan=null;
  $('player-initial').textContent = player.name[0].toLocaleUpperCase('ms-MY');
  $('player-display').textContent = player.name;
  $('player-meta').textContent = playerMeta();
  showScreen('game');
  if(game.status==='finished'){finishGame();return;}
  renderQuestion();
  if(game.mode==='duel')renderRestoredDuelPhase();
  renderDuelViews();
  $('question-title').focus({preventScroll:true});
  announce(t("mode.startAnnouncement",{mode:modeTitle(game.mode),total:game.total}));
}

function renderQuestion(restored=false) {
  if(!restored){acceptedSolid = null; acceptedNet = null; selected = null;visualPlan=nextVisualPlan(visualPlan);}
  $('correction-panel').hidden=true;
  $('game-screen').classList.remove('is-review','is-correct');
  if(roomState){acceptedSolid=game.stage==='net'||game.attempts.solid===game.question.shape?game.question.shape:null;acceptedNet=game.attempts.net===game.question.shape?game.question.shape:null;}
  renderQuestionContent();
  renderChoices('solid', game.solidOrder);
  renderChoices('net', game.netOrder);
  setStatus("Satu percubaan. Baca soalan, kemudian pilih bongkah untuk R1.");
  renderState();
}

function renderQuestionContent() {
  const q = localizeQuestion(game.question, locale.language);
  const number = String(game.index+1).padStart(2,'0');
  $('question-counter').textContent = t("question.counter",{number,total:game.total});
  $('question-topic').textContent = t(TOPIC_NAMES[questionTopic(q)]);
  let heading = t("Bongkah apakah ini?"), detail = q.prompt;
  if (questionTopic(q)==='net') {
    heading = t("Bongkah manakah yang sepadan?");
  } else if (q.prompt.startsWith('V=') || q.prompt.startsWith('L=')) {
    heading = t("Rumus ini mewakili bongkah apa?");
  }
  detail = detail.replace(/Bongkah apakah ini\?|Bentuk apa\?|Which solid is this\?|Which shape is it\?/g,'').trim();
  $('question-title').textContent = heading;
  if (questionTopic(q)==='formula') {
    const parts=q.lines.flatMap(line=>line.split(';')).map(part=>part.trim());
    const formulaLines = parts.filter(line => /^(?:V|L)=/.test(line));
    const rest = parts.filter(line => !/^(?:V|L)=/.test(line)).join(' ').replace(/Bongkah apakah ini\?|Bentuk apa\?|Which solid is this\?|Which shape is it\?/g,'').trim().replace(/ (?=[a-z]=)/g,' · ');
    $('question-detail').innerHTML = `<span class="formula-line">${formulaLines.map(line=>`<span class="formula-scroll" tabindex="0">${pretty(line)}</span>`).join('')}</span>${pretty(rest)}`;
  } else $('question-detail').innerHTML = pretty(detail);
  $('formula-key').hidden = true;
  if (q.formulaKey||q.id === 'S2') { $('formula-key').innerHTML = pretty(q.formulaKey?.[locale.language]||t("V = isi padu · L = luas permukaan · j = jejari · t = tinggi")); $('formula-key').hidden = false; }
  $('hint-text').innerHTML = pretty(q.hint);
  const dots = Array.from({length:game.total}, (_,i) => {
    const answer = game.answers[i];
    const cls = answer ? answer.outcome : i===game.index ? 'current' : '';
    return `<span class="progress-dot ${cls}" title="${t("question.dot",{number:i+1,state:answer?t(answer.outcome==='correct'?"question.correct":answer.outcome==='wrong'?"question.wrong":"question.skipped"):i===game.index?t("question.current"):''})}"></span>`;
  }).join('');
  $('progress-dots').innerHTML = dots;
  $('progress-dots').setAttribute('aria-label', t("question.progress",{number:game.index+1,total:game.total,score:game.score,skipped:game.skipped,mistakes:game.mistakes}));

}

function renderChoices(kind, order) {
  $(kind+'-choices').innerHTML = order.map((shape,i) => {
    const letter = String.fromCharCode(65+i), label = kind === 'solid' ? t("bongkah") : t("bentangan");
    return `<button type="button" class="choice ${kind === 'net' ? 'net-choice' : ''}" style="--i:${i}" data-kind="${kind}" data-shape="${shape}" data-letter="${letter}" aria-pressed="false" aria-label="${escapeHtml(t("choice.label",{kind:label,letter,description:describeShape(shape,kind,locale.language)}))}">${shapeArt(shape,kind,true,visualPlan[kind][shape])}<span class="choice-id"><span class="grip" aria-hidden="true">⠿</span>${kind === 'solid' ? t("Bongkah") : t("Kad")} ${letter}</span></button>`;
  }).join('');
}

const emptyScanner = target => `<span class="scan-target"><span class="target-corner tl"></span><span class="target-corner tr"></span><span class="target-corner bl"></span><span class="target-corner br"></span>${icon(target === 'r2' && game.stage === 'solid' ? 'lock':'cursor')}</span><span class="scanner-placeholder">${target==='r1'?t("Letak bongkah di sini"):game.stage==='solid'?t("Kemudian letak bentangan"):t("Letak kad bentangan di sini")}</span>`;

function renderState() {
  if (!game) return;
  $('session-mode').textContent=modeTitle(game.mode);
  $('score-total').textContent=' / '+game.total;
  const busy = !game.interactive || roomSending || !!roomPending || (game.mode==='duel'&&(duelBusy||!duelClient.connected||duelClient.pending||duelClient.clock()<(duelClient.snapshot?.me.nextReadyAt||duelClient.snapshot?.room.startsAt||0)));
  $('online-game-bar').hidden=!roomState;
  $('online-game-status').textContent=t(roomSending?'platform.sending':roomPending?'platform.pending':'platform.room');
  $('online-retry').hidden=!roomPending;$('online-retry').disabled=roomSending;
  $('continue-button').disabled=roomSending||!!roomPending||!game.reviewReady(now())||(game.mode==='duel'&&(duelBusy||duelClient.pending||!duelClient.connected));
  const active = game.stage === 'solid' ? 'r1' : 'r2';
  $('score-value').textContent = game.score;
  $('hint-button').disabled = busy;
  $('skip-button').disabled = busy;
  $('pause-button').disabled = game.status === 'feedback';
  $('pause-button').setAttribute('aria-label',roomState||game.mode==='duel'?t('duel.menu'):t('Jeda permainan'));
  $('pause-button').title=roomState||game.mode==='duel'?t('duel.menu'):t('Jeda permainan');
  $('hint-button').setAttribute('aria-expanded',String(game.hintOpen));
  $('hint-label').textContent = game.hintOpen ? t("Tutup petunjuk") : t("Beri petunjuk");
  $('hint-panel').hidden = !game.hintOpen;
  $('progress-dots').setAttribute('aria-label',t("question.progress",{number:game.index+1,total:game.total,score:game.score,mistakes:game.mistakes,skipped:game.skipped}));
  $('progress-dots').querySelectorAll('.progress-dot').forEach((dot,index)=>{
    const answer=game.answers[index];
    if(answer){dot.className='progress-dot '+answer.outcome;dot.title=t("question.dot",{number:index+1,state:t(answer.outcome==='correct'?"question.correct":answer.outcome==='wrong'?"question.wrong":"question.skipped")});}
  });
  $('step-progress').hidden=game.reviewing||game.status==='feedback';
  $('step-progress').textContent=t('ease.stepProgress',{step:game.stage==='solid'?1:2});
  $('input-instruction').textContent=t(window.matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0?'ease.tapInstruction':'ease.pointerInstruction');
  $('stage-instruction').textContent = game.reviewing ? t("Lihat pasangan yang betul di bawah") : game.status==='feedback' ? t("Pasangan tepat! +1 markah") : game.stage==='solid'?t('ease.stepSolid'):t('ease.stepNet');
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
    pad.classList.toggle('is-active-step',active===target&&!busy);
    $('scanner-bottom-'+target).textContent=selected&&active===target?t('ease.scanSelected',{target:target.toUpperCase()}):t(target==='r1'?'LANGKAH 1 · PILIH BONGKAH':'LANGKAH 2 · PADANKAN BENTANGAN');
    pad.setAttribute('aria-disabled',String(blocked));
    pad.classList.toggle('scanner-locked',target==='r2' && game.stage==='solid' && game.status !== 'feedback');
    pad.classList.toggle('filled',!!accepted);
    pad.classList.toggle('has-selection',!!selected && active===target && !busy);
    const body = accepted ? `${shapeArt(accepted,kind,true,visualPlan[kind][accepted])}<span class="scanned-label">${icon('check')}${target==='r1'?t("Bongkah diterima"):t("Bentangan diterima")}</span>` : emptyScanner(target);
    if ($('scanner-body-'+target).innerHTML !== body) $('scanner-body-'+target).innerHTML = body;
    const led=game.led(target,now());
    const status = scannerStatus(target,led);
    $('status-'+target).textContent = status;
    pad.setAttribute('aria-label', t("scanner.label",{target:target.toUpperCase(),kind:target==='r1'?t("bongkah"):t("bentangan"),status})+(selected&&active===target?t("scanner.action"):''));
  }
  renderLeds(now());
  saveSolo();
}

function scannerStatus(target,color){
  if(game.reviewing)return game.lastOutcome==='skipped'?t("Dilangkau · +0"):target===game.wrongReader?t("Salah · +0"):target==='r1'&&game.stage==='net'?t("Bongkah betul"):t("Soalan tamat");
  if(game.status==='feedback')return t("+1 markah");
  return color==='red'?t("Salah"):target==='r1'&&game.stage==='net'?t("Imbasan betul"):target==='r2'&&game.stage==='solid'?t("Jawab R1 dahulu"):game.hintOpen?t("Petunjuk dibuka"):t("Sedia diimbas");
}

function renderLeds(time) {
  for (const target of ['r1','r2']) {
    let color = game.led(target,time);
    if ((motionPaused) && (game.status==='feedback'||game.reviewing)) color = game.lastOutcome==='correct'?'green':target===game.wrongReader||game.lastOutcome==='skipped'?'red':target==='r1'&&game.stage==='net'?'green':'off';
    if (lastLed[target] === color) continue;
    lastLed[target] = color;
    $('led-'+target).className = 'led-dot '+color;
    $(target).classList.toggle('scanner-correct',color==='green');
    $(target).classList.toggle('scanner-wrong',color==='red');
    $(target).classList.toggle('scanner-hint',color==='purple');
    $('status-'+target).textContent = scannerStatus(target,color);
    $(target).setAttribute('aria-label',t("scanner.label",{target:target.toUpperCase(),kind:target==='r1'?t("bongkah"):t("bentangan"),status:$('status-'+target).textContent}));
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
  setStatus(window.matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0?"ease.selectedScan":"choice.selected",'','cursor',{kind:kind==='solid'?"Bongkah":"Kad",letter,target});
  renderState();
}

async function scan(choice,target) {
  if (!game?.interactive) return;
  if (!choice) { setStatus("choice.first",'','cursor',{kind:game.stage==='solid'?"bongkah":"kad bentangan",target:target.toUpperCase()}); return; }
  if(roomState){await roomCommand('answer',{kind:choice.kind,shape:choice.shape,target},result=>showScanResult(result,choice,target));return;}
  if(game.mode==='duel'){
    if(duelBusy||!duelClient.connected||duelClient.pending)return;
    const active=game.stage==='solid'?'r1':'r2';
    if(target!==active){showScanResult({type:'stage',target:active},choice,target);return;}
    if(choice.kind!==game.stage){showScanResult({type:'kind'},choice,target);return;}
    const ack=await duelTask(()=>duelClient.act('scan',{questionIndex:game.index,kind:choice.kind,shape:choice.shape,target}));
    if(!ack)return;duelAppliedSeq=ack.me.seq;
    if(ack.room.status==='complete'&&ack.actionResult?.type!=='correct'&&ack.actionResult?.type!=='wrong'){restoreDuelGame();return;}
    const result=game.applyDuelAcknowledgement('scan',{},now(),ack);
    if(game.status==='finished'){finishGame();return;}
    if(result.type==='restored'){restoreDuelGame();return;}
    showScanResult(result,choice,target);return;
  }
  const result = game.scan(choice.kind,choice.shape,target,now());
  showScanResult(result,choice,target);
}
function showScanResult(result,choice,target){
  if (result.type==='blocked') return;
  if (result.type==='stage') { setStatus(result.target==='r1'?"R1 dahulu. Imbas bongkah sebelum kad bentangan.":"Bongkah R1 sudah betul. Padankan kad bentangan di R2."); return; }
  if (result.type==='kind') { setStatus(game.stage==='solid'?"R1 hanya menerima bongkah 3D.":"R2 hanya menerima kad bentangan."); return; }
  selected=null;
  if (result.type==='wrong') {
    setStatus(target==='r1'?"Bongkah belum tepat. Percubaan tamat, +0 markah. Mari lihat jawapannya.":"Bongkah R1 betul, tetapi bentangan belum sepadan. Percubaan tamat, +0 markah.",'error','close');
    showCorrection();
    tone('wrong');
  } else if (result.type==='solid') {
    acceptedSolid=choice.shape;
    setStatus("Bongkah betul! Sekarang seret kad bentangannya ke R2.",'success','check');
    tone('solid');
  } else if (result.type==='correct') {
    acceptedNet=choice.shape;
    setStatus("Pasangan tepat! +1 markah. Bersedia untuk soalan seterusnya.",'success','check');
    tone('correct');
    $('game-screen').classList.add('is-correct');
  }
  renderState();
}

function showCorrection(){
  renderCorrection();
  $('correction-title').focus({preventScroll:true});
  $('correction-panel').scrollIntoView({block:'nearest',behavior:motionPaused?'instant':'smooth'});
  const q=game.question;
  announce(t('correction.announce',{shape:shapeName(q.shape,locale.language),note:t(SHAPE_NOTES[q.shape])}));
}
function renderCorrection(){
  const answer=game.answers.at(-1),q=game.question;
  $('correction-time-note').textContent=t(game.mode==='duel'?'duel.reviewClock':'Fahami padanannya dahulu. Masa dijeda.');
  $('game-screen').classList.add('is-review');$('correction-panel').hidden=false;
  $('correction-outcome').textContent=t(answer.outcome==='wrong'?'PERCUBAAN TAMAT · +0 MARKAH':'DILANGKAU · +0 MARKAH');
  $('correction-title').textContent=t('Jawapan betul:')+' '+shapeName(q.shape,locale.language);
  $('correction-attempt').textContent=answer.failedAt?t('correction.attempt',{target:answer.failedAt==='solid'?'R1':'R2',shape:shapeName(answer.attempts[answer.failedAt],locale.language),note:answer.failedAt==='net'?t('Bongkah R1 anda sudah betul.'):''}):t('Soalan ini dilangkau. Lihat pasangan yang sepadan.');
  $('correction-explanation').innerHTML=pretty(t(SHAPE_NOTES[q.shape]));
  if(refreshingLanguage){
    const model=$('correction-pair').querySelector('.correct-model'),net=$('correction-pair').querySelector('.correct-net');
    model.querySelector('span').textContent='R1 · '+shapeName(q.shape,locale.language);
    net.querySelector('span').textContent=t('R2 · Bentangannya');
    model.querySelector('svg').setAttribute('aria-label',describeShape(q.shape,'solid',locale.language));
    net.querySelector('svg').setAttribute('aria-label',describeShape(q.shape,'net',locale.language));
  }else{
    $('correction-pair').innerHTML=`<div class="correct-model">${shapeArt(q.shape,'solid',false,visualPlan.solid[q.shape],locale.language)}<span>R1 · ${shapeName(q.shape,locale.language)}</span></div><span class="correct-link" aria-hidden="true">${icon('arrow')}</span><div class="correct-net">${shapeArt(q.shape,'net',false,visualPlan.net[q.shape],locale.language)}<span>${t('R2 · Bentangannya')}</span></div>`;
  }
  if(!refreshingLanguage)$('continue-button').disabled=!game.reviewReady(now());
  $('continue-button').innerHTML=$('continue-button').disabled?t('Perhatikan jawapan…'):t(game.index===game.total-1?'Lihat analisis':'Soalan seterusnya')+' '+icon('arrow');
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
$('hint-button').addEventListener('click',async()=>{
  if(roomState&&!game.hintUsed){roomCommand('hint',{},()=>{game.hintOpen=true;setStatus('Petunjuk dibuka. Baca petunjuk dan teruskan memilih.','hint','bulb');renderState();});return;}
  if(game?.mode==='duel'){
    if(!game.hintUsed){const ack=await duelTask(()=>duelClient.act('hint',{questionIndex:game.index}));if(!ack)return;duelAppliedSeq=ack.me.seq;game.applyDuelAcknowledgement('hint',{},now(),ack);if(game.status==='finished'){finishGame();return;}renderQuestionContent();}
    else game.hintOpen=!game.hintOpen;
    setStatus(game.hintOpen?'Petunjuk dibuka. Baca petunjuk dan teruskan memilih.':'Petunjuk ditutup. Teruskan menjawab.',game.hintOpen?'hint':'','bulb');renderState();return;
  }
  if(game&&game.toggleHint()){
    setStatus(game.hintOpen?"Petunjuk dibuka. Baca petunjuk dan teruskan memilih.":"Petunjuk ditutup. Teruskan menjawab.",game.hintOpen?'hint':'','bulb');
    renderState();
  }
});
$('skip-button').addEventListener('click',async()=>{
  if(roomState){roomCommand('skip',{},()=>{selected=null;setStatus('Soalan dilangkau, +0 markah. Lihat jawapan sebelum meneruskan.','','skip');showCorrection();renderState();});return;}
  if(game?.mode==='duel'){
    const ack=await duelTask(()=>duelClient.act('skip',{questionIndex:game.index}));if(!ack)return;duelAppliedSeq=ack.me.seq;
    game.applyDuelAcknowledgement('skip',{},now(),ack);cancelDrag();selected=null;
    if(game.status==='finished'){finishGame();return;}
    setStatus('Soalan dilangkau, +0 markah. Lihat jawapan sebelum meneruskan.','','skip');showCorrection();renderState();tone('skip');return;
  }
  if(game&&game.skip(now())){ cancelDrag(); selected=null;setStatus("Soalan dilangkau, +0 markah. Lihat jawapan sebelum meneruskan.",'','skip');showCorrection();renderState();tone('skip'); }
});
$('continue-button').addEventListener('click',()=>{
  if(roomState){roomCommand('advance',{},afterRoomAdvance);return;}
  if(game?.mode==='duel'){if(game.reviewReady(now()))void advanceDuel();return;}
  if(!game?.continueReview(now()))return;
  if(game.status==='finished')finishGame();else{lastLed={};renderQuestion();$('question-title').focus({preventScroll:true});announce(t("round.single",{number:game.index+1,total:game.total}));}
});
$('pause-button').addEventListener('click',()=>openPause());
$('replay-button').addEventListener('click',()=>{if(roomState)openAccounts(roomState.roomId);else if(playMode==='duel')leaveDuel(true);else startGame();});

$('welcome-account-button').addEventListener('click',()=>requestAccounts());
$('profile-button').addEventListener('click',()=>requestAccounts({profile:true}));
$('guest-button').addEventListener('click',openGuest);
$('guest-back-button').addEventListener('click',returnHome);
function renderModuleSaveStatus(state){
  const place=t(state.storageFailed?'module.thisSession':'module.thisBrowser');
  const message=t(state.status==='syncing'?'module.syncing':state.status==='synced'?'module.synced':state.status==='pending'?'module.pending':state.actor==='guest'?'module.guestSaved':'module.saved',{place});
  $('module-sync-status').textContent=t('module.saveStatus',{count:state.completed,message});
  $('module-sync-retry').hidden=state.status!=='pending';
}
async function openLearningModule(fromPortal=false){
  if(portal.requestLeave(()=>void openLearningModule(fromPortal)))return;
  moduleReturnToPortal=fromPortal;const request=++moduleLaunchEpoch;
  showScreen('module');moduleProgress.close();moduleBridge.clear();
  $('module-back-button').innerHTML=icon('home')+t(fromPortal?'platform.backClass':'ease.backHome');
  $('module-sync-status').textContent=t('module.opening');$('module-sync-retry').hidden=true;
  $('module-title').focus({preventScroll:true});
  try{
    await cloud.init();
    if(request!==moduleLaunchEpoch||screen!=='module')return;
    if(cloud.recoveryRequired){void openAccounts();return;}
    if(cloud.session?.user?.id&&!cloud.profile)await cloud.rpc('snapshot').catch(()=>{});
  }catch{/* Local learning remains available if the account service is unavailable. */}
  if(request!==moduleLaunchEpoch||screen!=='module')return;
  moduleProgress.setAccount(cloud.session?.user?.id?{id:cloud.session.user.id,role:cloud.profile?.role}:null);
  moduleBridge.open(moduleHtml);moduleProgress.open($('module-frame').contentWindow);
  moduleProgress.setTheme(document.documentElement.dataset.theme);renderModuleSaveStatus(moduleProgress.state);
  void moduleProgress.sync();
}
$('module-button').addEventListener('click',()=>void openLearningModule());
$('module-back-button').addEventListener('click',()=>moduleReturnToPortal&&cloud.session?void openAccounts():returnHome());
$('module-sync-retry').addEventListener('click',()=>void moduleProgress.sync());
window.addEventListener('message',event=>moduleProgress.handleMessage(event));
document.addEventListener('geodecoder:theme',event=>moduleProgress.setTheme(event.detail?.theme));
cloud.onSessionChange(()=>{
  const actor=cloud.session?.user?.id||'guest';
  if(actor!==soloActor){saveSolo();soloActor=actor;soloNewAction=null;if(game&&!roomState&&game.mode!=='duel'){game=null;lastResult=null;returnHome();}if(['solo','solo-new'].includes(dialogMode))closeDialog();updateSoloEntry();}
  if(actor!==moduleProgress.state.actor){moduleProgress.setAccount(cloud.session?.user?.id?{id:actor,role:cloud.profile?.role}:null);if(screen==='module'&&$('module-frame').hasAttribute('srcdoc'))void openLearningModule(moduleReturnToPortal);}
});
$('online-retry').addEventListener('click',()=>{if(roomPending)sendRoomPending();});
$('online-room-back').addEventListener('click',()=>openAccounts(roomState?.roomId));

function stopRoomPolling(){if(roomPolling)clearInterval(roomPolling);roomPolling=null;}
function resetRoomRequests(){roomEpoch++;roomPending=null;roomSending=false;roomInFlight=null;stopRoomPolling();}
function returnHome(){
  if(portal.requestLeave(returnHome))return;
  saveSolo();
  cancelDrag();resetRoomRequests();game=null;roomState=null;selected=null;acceptedSolid=null;acceptedNet=null;cloud.setRoom(null);
  dialogTrigger=null;if(dialog.open)closeDialog();
  showScreen('welcome');$('guest-button').focus({preventScroll:true});
}
function openGuest(){
  if(portal.requestLeave(openGuest))return;
  cancelDrag();resetRoomRequests();game=null;roomState=null;selected=null;cloud.setRoom(null);
  showScreen('guest');$('player-name').focus({preventScroll:true});
}
function displayedGameTime(time=now()){return roomState?roomState.elapsed+(roomState.status==='running'?Math.max(0,time-roomReceivedAt):0):game.time(time);}
async function openAccounts(roomId=null,target={}){
  saveSolo();if(game&&!roomState&&game.mode!=='duel')game=null;
  cancelDrag();resetRoomRequests();
  if(dialog.open)closeDialog();
  showScreen('portal');await portal.open({...(!target.profile&&!target.security&&roomId?{roomId}:{}),...target});
}
let requestedPortalTarget={};
function requestAccounts(target={}){
  requestedPortalTarget=target;
  if(playMode==='duel'&&screen==='duel'){requestHome();return;}
  if(screen==='game'&&game&&!roomState){
    if(game.mode==='duel'){requestHome();return;}
    openDialog('portal-leave',t('ease.accountTitle'),`<p class="dialog-copy">${sr('leave')}</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="close" data-autofocus>${t('Terus bermain')}</button><button class="button button-primary" data-dialog-action="open-portal">${t('ease.accountOpen')}</button></div>`);return;
  }
  void openAccounts(roomState?.roomId,target);
}
function applyRoomState(state){
  if(!state||!Array.isArray(state.questions)||state.questions.length!==10||state.questions.some(id=>!QUESTIONS.some(q=>q.id===id)))throw Error(t('platform.invalidRoom'));
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
  playMode='quiz';const profile=cloud.profile||{};
  player={name:profile.display_name||profile.username||'Pelajar',category:'Pelajar',className:cloud.room?.class_name||'Room kelas'};
  game=new Game(QUESTIONS,player,now());roundId=state.attemptId;lastResult=null;lastClock='';lastLed={};
  if(!applyRoomState(state))return;
  showScreen('game');cloud.setRoom(state.roomId);
  $('player-initial').innerHTML=SHAPES.includes(profile.avatar)?shapeArt(profile.avatar,'solid',true):escapeHtml(Array.from(player.name)[0]||'?');$('player-display').textContent=player.name;$('player-meta').textContent=playerMeta();
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
    if(result.type==='blocked'||command.action!=='advance'&&data.state.index!==command.payload.index||staleAnswer||staleHint||staleSkip){restoreRoomGameView();setStatus('platform.resynced');renderState();return;}
    command.onSuccess(result);renderState();
  }catch(e){if(epoch===roomEpoch&&roomInFlight===command&&roomState?.attemptId===attemptId&&screen==='game')setStatus('platform.retry','error','refresh');}
  finally{if(epoch===roomEpoch&&roomInFlight===command){roomSending=false;roomInFlight=null;if(screen==='game')renderState();}}
}
function restoreRoomGameView(){
  if(game.status==='finished'){finishGame();return;}
  lastLed={};renderQuestion();
  if(game.reviewing){showCorrection();setStatus('platform.review');}
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
  usabilityUI?.stash();
  if(refreshingLanguage){dialogMode=mode;$('dialog-title').textContent=title;$('dialog-content').innerHTML=content;return;}
  cancelDrag();
  if(!dialog.open)dialogTrigger=document.activeElement;
  if(game && screen==='game')game.pause(now());
  saveSolo();
  dialogMode=mode;
  $('dialog-title').textContent=title;
  $('dialog-content').innerHTML=content;
  if(!dialog.open)dialog.showModal();
  const first=$('dialog-content').querySelector('[data-autofocus]');
  (first || $('dialog-close')).focus({preventScroll:true});
}
function settleDialogClose(){
  // Native close is queued: a previous event must not clear a newly opened dialog.
  if(dialog.open||!dialogMode)return;
  usabilityUI?.stash();
  dialogMode='';
  if(game && screen==='game') { game.resume(now());renderState(); }
  const trigger=dialogTrigger;
  dialogTrigger=null;
  if(trigger?.isConnected)trigger.focus({preventScroll:true});
}
function closeDialog(){if(dialog.open)dialog.close();settleDialogClose();}
$('dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('close',settleDialogClose);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
dialog.addEventListener('click',event=>{
  const action=event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
  if(usabilityUI?.handleAction(action))return;
  if(action==='help-open')openHelp();
  if(action==='solo-resume')resumeSolo();
  if(action==='solo-new'){openDialog('solo-new',sr('new'),`<p class="dialog-copy">${sr('confirm')}</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="solo-back" data-autofocus>${sr('cancel')}</button><button class="button button-danger" data-dialog-action="solo-discard">${sr('new')}</button></div>`);}
  if(action==='solo-back')openSolo();
  if(action==='solo-discard'){const action=soloNewAction;soloNewAction=null;if(soloStore.clear(soloActor)){closeDialog();if(action)action();else openGuest();}else{soloNotice='failed';openSolo();}}
  if(action==='close')closeDialog();
  if(action==='home')returnHome();
  if(action==='open-portal')openAccounts(null,requestedPortalTarget);
  if(action==='request-home')requestHome();
  if(action==='duel-leave')leaveDuel();
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

function supportContext(){
  const inGame=screen==='game',mode=roomState&&['game','result'].includes(screen)?'classroom':screen==='guest'?$('play-mode').value:screen==='duel'?'duel':['game','result'].includes(screen)?game?.mode:'none';
  const service=roomState&&inGame?(roomPending&&!roomSending?'retry-needed':'last-response-ok'):mode==='duel'&&duelClient.snapshot?(duelClient.connected?'last-response-ok':'retry-needed'):screen==='module'&&moduleProgress.state.status==='synced'?'last-response-ok':'not-checked';
  return {screen,mode,language:locale.language,questionId:inGame?game?.question?.id:null,
    stage:inGame?(game?.stage==='solid'?'R1':'R2'):null,
    phase:inGame?(game?.reviewing?'review':game?.status==='feedback'?'feedback':'running'):null,
    width:window.innerWidth,height:window.innerHeight,browserOnline:navigator.onLine,service};
}
function openHelp(){helpSupport.open();}

function openPause(automatic=false){
  if(!refreshingLanguage)automaticPause=automatic;
  if(!game || screen!=='game')return;
  if(!refreshingLanguage)game.pause(now());
  openDialog('pause',t(roomState||game.mode==='duel'?'duel.menu':"Permainan dijeda"),`<div class="pause-symbol">${icon('pause')} ${formatTime(game.mode==='duel'?duelClient.elapsed():displayedGameTime())}</div><p class="dialog-copy">${roomState?t('platform.clockNote'):game.mode==='duel'?t('duel.clockNote'):automatic?t("Permainan dijeda semasa anda meninggalkan tab ini."):t("Berehat seketika. Masa dan soalan anda dikekalkan.")} ${t("Tekan sambung apabila sudah bersedia.")}</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="request-home">${t("Tamatkan pusingan")}</button><button class="button button-primary" data-dialog-action="close" data-autofocus>${t("Sambung permainan")} ${icon('arrow')}</button></div>`);
}

function requestHome(){
  if(roomState){openAccounts(roomState.roomId);return;}
  if(playMode==='duel'&&['duel','game','result'].includes(screen)){
    if(duelClient.snapshot&&!duelClient.snapshot.me.finishedAt&&['waiting','countdown','playing'].includes(duelClient.snapshot.room.status)){
      openDialog('duel-leave',t('duel.leaveTitle'),`<p class="dialog-copy">${t('duel.leaveCopy')}</p><p class="duel-leave-error" role="status"></p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="close" data-autofocus>${t('Terus bermain')}</button><button class="button button-danger" data-dialog-action="duel-leave">${t('duel.confirmLeave')}</button></div>`);
    }else leaveDuel();
    return;
  }
  if(screen==='game' && game && game.status!=='finished'){
    openDialog('leave',t("Tamatkan pusingan ini?"),`<p class="dialog-copy">${t("leave.progress")} <b>${t("leave.count",{number:game.index+1,total:game.total})}</b>. ${sr('leave')}</p><div class="dialog-actions"><button class="button button-outline" data-dialog-action="close" data-autofocus>${t("Terus bermain")}</button><button class="button button-danger" data-dialog-action="home">${t("Tamatkan pusingan")}</button></div>`);
  }else returnHome();
}

function miniScoresMarkup(scores){
  if(!scores.length)return `<div class="empty-scores">${icon('trophy')}<h3>${t("Skor pertama menanti")}</h3><p>${t("Lengkapkan 10 soalan untuk merekodkan skor pertama.")}</p></div>`;
  return scores.slice(0,5).map((r,i)=>`<div class="mini-score ${r.id===lastResult?.id?'mine':''}"><span class="mini-rank">${i+1}</span><span class="mini-player"><b>${escapeHtml(r.player.name)}${r.id===lastResult?.id?t("score.mine"):''}</b><small>${escapeHtml(r.player.className)} · ${t("score.wrong",{count:r.mistakes})}</small></span><span class="mini-points">${r.score}<small>${formatTime(r.elapsed)}</small></span></div>`).join('');
}
function renderMiniScores(){ $('result-leaderboard').innerHTML=miniScoresMarkup(store.read());storageStatus(); }

function openScores(message=''){
  if(!refreshingLanguage)scoreNotice=message;
  const scores=store.read(),legacy=store.readLegacy();storageStatus();
  const visible=scoresExpanded?scores:scores.slice(0,10);
  const table=scores.length?`<div class="score-table-wrap"><table class="score-table"><caption class="sr-only">${t("Skor terbaik dalam pelayar ini")}</caption><thead><tr><th scope="col">#</th><th scope="col">${t("Pemain")}</th><th scope="col">${t("Kelas")}</th><th scope="col">${t("Markah")}</th><th scope="col">${t("Salah / Masa")}</th></tr></thead><tbody>${visible.map((r,i)=>`<tr class="${r.id===lastResult?.id?'mine':''}"><td>${i+1}</td><td><b>${escapeHtml(r.player.name)}</b><small>${escapeHtml(t(r.player.category))}</small></td><td>${escapeHtml(r.player.className)}</td><td><b>${r.score} / 10</b></td><td>${t("score.shortWrong",{count:r.mistakes})}<small>${formatTime(r.elapsed)}</small></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-scores">${icon('trophy')}<h3>${t("Belum ada skor")}</h3><p>${t("Lengkapkan 10 soalan untuk merekodkan skor pertama.")}</p></div>`;
  const legacyMarkup=legacy.length?`<details class="legacy-scores"><summary>${t("legacy.count",{count:legacy.length})}</summary><p>${t("Peraturan lama membenarkan cuba semula. Rekod ini disimpan berasingan daripada kedudukan satu percubaan.")}</p><ol>${legacy.map(r=>`<li><b>${escapeHtml(r.player.name)}</b> · ${escapeHtml(r.player.className)} · ${r.score}/10 · ${formatTime(r.elapsed)}</li>`).join('')}</ol></details>`:'';
  openDialog('scores',t("Papan skor"),`<p class="score-info"><b>${t("Mod satu percubaan.")}</b> ${store.failed?t("Skor sesi ini sahaja; simpanan pelayar tidak tersedia."):t("Rekod dalam pelayar ini sahaja. Maksimum 50 skor terbaik.")} ${t("Skor tertinggi dahulu, kemudian soalan salah paling sedikit dan masa terpantas.")}</p>${message?`<p class="help-note" role="status">${escapeHtml(t(message))}</p>`:''}${table}${legacyMarkup}<div class="score-toolbar"><span>${t("score.records",{shown:visible.length,total:scores.length})}</span>${scores.length>10&&!scoresExpanded?`<button class="button button-outline" data-dialog-action="show-all">${t("Lihat semua skor")}</button>`:''}<button class="button button-outline" data-dialog-action="export" ${!scores.length?'disabled':''}>${icon('download')} ${t('Eksport CSV')}</button><button class="button button-quiet score-delete" data-dialog-action="erase" ${!scores.length&&!legacy.length?'disabled':''}>${icon('trash')} ${t('Padam skor')}</button></div><div class="dialog-actions"><button class="button button-primary" data-dialog-action="close">${screen==='game'?t("Sambung permainan"):t("Tutup papan skor")}</button></div>`);
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
  if(game.mode==='duel'){
    game=Game.fromDuelSnapshot(QUESTIONS,player,duelClient.snapshot,now());
    if(dialog.open)closeDialog();
  }
  lastResult=lastResult?.id===roundId?lastResult:game.result(roundId);
  saveSolo();
  $('result-details').open=false;
  if(!roomState&&lastResult.mode==='quiz'&&!store.read().some(row=>row.id===roundId))store.save(lastResult);
  stopRoomPolling();
  storageStatus();
  renderResult();
  showScreen('result');
  renderDuelViews();
  $('result-title').focus({preventScroll:true});
  announce(t("result.complete",{score:lastResult.score,total:lastResult.total,time:formatTime(lastResult.elapsed)}));
}
function renderResult(){
  const r=lastResult;
  $('result-title').textContent=r.score===r.total?t("Hebat! Semua pasangan tepat."):r.score/r.total>=.7?t("Bagus, anda semakin mahir!"):t("Teruskan mencuba, teruskan belajar.");
  $('result-player').textContent=r.player.name+' · '+t(r.player.category)+(r.player.className?' · '+r.player.className:'');
  $('result-score').textContent=r.score;
  $('result-total').textContent=t('mode.points',{total:r.total});
  $('practice-result-note').hidden=r.mode==='quiz';
  $('practice-result-note').textContent=t(r.mode==='review'?'ease.reviewScope':r.mode==='duel'?'duel.resultScope':'mode.practiceResult',{total:r.total});
  $('replay-label').textContent=t(r.mode==='review'?'ease.reviewRepeat':r.mode==='duel'?'duel.new':r.mode==='practice'?'mode.repeatPractice':'Main lagi');
  $('analysis-description').textContent=t(r.mode==='review'?'ease.reviewAnalysis':'mode.analysisScope',{total:r.total,perShape:r.total/SHAPES.length});
  $('result-level').textContent=r.score===r.total?t("Pakar padanan"):r.score/r.total>=.7?t("Penjelajah geometri"):t("Peneroka bentuk");
  const rank=!roomState&&r.mode==='quiz'?store.read().findIndex(s=>s.id===r.id)+1:0;
  $('result-message').textContent=t("result.summary",{score:r.score,mistakes:r.mistakes,skipped:r.skipped})+(rank>0?t("result.rank",{rank}):'');
  $('result-time').textContent=formatTime(r.elapsed);
  $('result-first').textContent=`${analyseAnswers(r.answers).byStage[0].correct} / ${r.total}`;
  $('result-mistakes').textContent=r.mistakes;
  $('result-hints').textContent=r.hints;
  renderAnalysis(r);
  $('review-list').innerHTML=r.answers.map((answer,i)=>{
    const q=localizeQuestion(answer.question||QUESTIONS.find(q=>q.id===answer.id),locale.language);
    const attempts=['solid','net'].map((kind,index)=>`R${index+1}: ${answer.attempts[kind]?shapeName(answer.attempts[kind],locale.language):t("belum diimbas")}`).join(' · ');
    return `<article class="review-card ${answer.outcome}"><small>${t("question.counter",{number:i+1,total:r.total})} · ${t(TOPIC_NAMES[answer.topic])}</small><p class="review-prompt">${pretty(q.prompt)}</p><div class="review-pair">${shapeArt(answer.shape,'solid',true,'orange')}${shapeArt(answer.shape,'net',true,'violet')}</div><h3>${t("Jawapan:")} ${shapeName(answer.shape,locale.language)}</h3><p class="review-outcome">${answer.outcome==='correct'?t("✓ Pasangan betul · +1"):answer.outcome==='wrong'?t("review.wrong",{target:answer.failedAt==='solid'?'R1':'R2'}):t("↷ Dilangkau · +0")}</p><p class="review-attempt">${attempts}${answer.hint?'<br>'+t("Petunjuk digunakan"):''}</p></article>`;
  }).join('');
  renderMiniScores();
  if(roomState){$('result-message').textContent+=' '+t('platform.resultSaved');$('replay-label').textContent=t('platform.backRoom');$('result-leaderboard').textContent=t('platform.resultScope');}
  renderDuelViews();
  renderReviewAction();

}

function renderReviewAction(){
  const ids=reviewQuestionIds(lastResult,QUESTIONS),waiting=lastResult?.mode==='duel'&&duelClient.snapshot?.room.status!=='complete';
  $('retry-wrong-button').hidden=!ids.length;
  $('retry-wrong-button').disabled=waiting;
  $('retry-wrong-note').textContent=t(waiting?'duel.waitFinish':ids.length?'ease.retryWrongNote':'ease.noWrong');
  $('replay-button').classList.toggle('button-primary',!ids.length);
  $('replay-button').classList.toggle('button-outline',!!ids.length);
}
function startReview(){
  const source=lastResult,ids=reviewQuestionIds(source,QUESTIONS);
  if(!source||!ids.length||source.mode==='duel'&&duelClient.snapshot?.room.status!=='complete')return;
  if(source.mode==='duel'){duelClient.forget();duelNeedsRestore=false;duelAppliedSeq=-1;}
  resetRoomRequests();cloud.setRoom(null);roomState=null;
  player={...source.player};reviewIds=ids;playMode='review';startGame();
  announce(t('ease.reviewReady'));
}
$('retry-wrong-button').addEventListener('click',startReview);

function analysisBar(label,correct,total,note='',art=''){
  const percent=total?Math.round(correct/total*100):0;
  return `<div class="analysis-row">${art}<div class="analysis-row-body"><div class="analysis-row-title"><b>${label}</b><span>${total?`${correct} / ${total} <small>(${percent}%)</small>`:t("Belum dicuba")}</span></div><div class="analysis-track" aria-hidden="true"><span style="width:${percent}%"></span></div>${note?`<p>${note}</p>`:''}</div></div>`;
}

function renderAnalysis(result){
  // A completed classroom attempt can open directly, without rendering a question first.
  if(!visualPlan)visualPlan=nextVisualPlan(null);
  const a=analyseAnswers(result.answers),weak=a.weakShapes.filter(row=>row.wrong),advice=[];
  let title,copy;
  if(result.score===result.total){title=t('Semua pasangan tepat!');copy=result.hints?t('analysis.hints',{count:result.hints}):t('Anda berjaya mengenal bongkah dan memadankan semua bentangan dalam pusingan ini.');}
  else if(!result.mistakes){title=t(result.skipped===result.total?'Cuba menjawab untuk melihat kekuatan anda.':'Padanan yang anda cuba sudah tepat.');copy=t('analysis.skipped',{count:result.skipped});}
  else{title=t('analysis.focus',{shapes:weak.map(row=>shapeName(row.id,locale.language)).join(', ')});copy=t('analysis.errors',{wrong:result.mistakes,skipped:result.skipped});}
  $('analysis-summary').innerHTML=`${icon(result.score===result.total?'trophy':'bulb')}<div><h3>${title}</h3><p>${copy}</p></div>`;
  $('analysis-shapes').innerHTML=a.byShape.map(row=>analysisBar(shapeName(row.id,locale.language),row.correct,row.total,t('analysis.shape',{wrong:row.wrong,skipped:row.skipped,hints:row.hints}),shapeArt(row.id,'solid',true,visualPlan.solid[row.id]))).join('');
  $('analysis-stages').innerHTML=a.byStage.map(row=>analysisBar(t(row.id==='solid'?'R1 · Kenal bongkah':'R2 · Padankan bentangan'),row.correct,row.attempted,t('analysis.stage',{wrong:row.wrong,untried:row.notAttempted}))).join('');
  $('analysis-topics').innerHTML=a.byTopic.map(row=>analysisBar(t(TOPIC_NAMES[row.id]),row.correct,row.total,t('analysis.topic',{wrong:row.wrong,skipped:row.skipped}))).join('');
  if(a.weakStage)advice.push(t(a.weakStage.id==='net'?'Latih bentangan R2: kira bentuk dan bilangan mukanya. Bayangkan setiap muka dilipat sebelum mengimbas.':'Latih bongkah R1: kenal pasti tapak, muka rata, permukaan melengkung dan puncak daripada soalan.'));
  for(const row of weak.slice(0,2))advice.push(t(SHAPE_NOTES[row.id]));
  if(a.byTopic.find(row=>row.id==='formula').wrong)advice.push(t('Latih rumus: bezakan isi padu V dan luas permukaan L. Fahami simbol jejari, tinggi dan tinggi sendeng dalam soalan.'));
  if(result.skipped)advice.push(t('analysis.retrySkipped',{count:result.skipped}));
  if(!advice.length)advice.push(t(result.hints?'Cuba pusingan baharu tanpa petunjuk. Kekalkan ketepatan sebelum mengejar masa.':'Teruskan dengan pusingan baharu. Susunan, warna dan pilihan soalan akan berubah.'));
  $('analysis-advice').innerHTML=`<h3>${t('Cadangan latihan anda')}</h3><ul>${advice.slice(0,4).map(text=>`<li>${text}</li>`).join('')}</ul><p>${t('R2 yang belum dicuba selepas salah R1 tidak dikira sebagai kesilapan R2. Petunjuk tidak memotong markah.')}</p>`;
}

function tone(kind){
  if(!sound||preferences.muted||preferences.effectsVolume===0||document.hidden)return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    const notes=kind==='correct'?[523,659,784]:kind==='solid'?[523,659]:kind==='wrong'?[196,165]:[330];
    notes.forEach((frequency,i)=>{
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
      const t=audioContext.currentTime+i*.09;
      oscillator.type='sine';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.065*preferences.effectsVolume/100,t+.01);gain.gain.exponentialRampToValueAtTime(.001,t+.16);
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
$('sound-button').addEventListener('click',()=>{preferenceStore.set({effects:!preferences.effects});if(sound)tone('solid');});

document.addEventListener('visibilitychange',()=>{
  if(!game || screen!=='game')return;
  if(document.hidden && !game.paused){game.pause(now());hiddenPause=true;cancelDrag();}
  else if(!document.hidden && hiddenPause){hiddenPause=false;if(!dialog.open)openPause(true);}
  saveSolo();
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
  tickDuel();
  if(game && screen==='game'){
    if(roomState&&game.status==='feedback'&&!game.paused&&time>=game.transitionAt&&!roomPending&&!roomSending)roomCommand('advance',{},afterRoomAdvance);
    if(!roomState&&game.update(time)){
      if(game.status==='finished')finishGame();
      else{lastLed={};renderQuestion();$('question-title').focus({preventScroll:true});announce(t("round.next",{number:game.index+1,total:game.total}));}
    }
    const clock=formatTime(game.mode==='duel'?duelClient.elapsed():displayedGameTime(time));
    if(clock!==lastClock){$('time-value').textContent=clock;lastClock=clock;}
    renderLeds(time);
    if(game.reviewing&&game.reviewReady(time)&&$('continue-button').disabled&&!roomSending&&!roomPending&&!(game.mode==='duel'&&(duelBusy||duelClient.pending||!duelClient.connected))){
      $('continue-button').disabled=false;
      $('continue-button').innerHTML=(game.index===game.total-1?t("Lihat analisis"):t("Soalan seterusnya"))+' '+icon('arrow');
    }
  }
  if(drag?.started){
    const step=drag.y<90?-10:drag.y>window.innerHeight-65?10:0;
    if(step){window.scrollBy(0,step);moveDrag();}
  }
  requestAnimationFrame(frame);
}

const soloCopy={
 ms:{leave:'Anda boleh menyambung permainan melalui Home jika kemajuan berjaya disimpan.',resume:'Sambung permainan',new:'Mula baharu',confirm:'Buang permainan tersimpan yang belum selesai? Tindakan ini tidak boleh dibatalkan.',cancel:'Batal',saved:'Kemajuan disimpan pada pelayar ini.',failed:'Kemajuan belum dapat disimpan. Semak kebenaran atau ruang storan pelayar. Jangan tutup permainan jika mahu mengekalkan kemajuan semasa.',invalid:'Permainan tersimpan rosak atau tidak serasi dengan soalan dan peraturan semasa. Mula baharu untuk menggantikannya. Rekod lain dikekalkan.',empty:'Tiada permainan solo tersimpan.',summary:'soalan dijawab',score:'Markah',time:'Masa bermain',scope:'Pelayar dan akaun ini sahaja. Masa berhenti ketika ditutup.'},
 en:{leave:'You can resume this game from Home if progress was saved successfully.',resume:'Resume game',new:'Start new',confirm:'Discard the saved unfinished game? This cannot be undone.',cancel:'Cancel',saved:'Progress saved in this browser.',failed:'Progress could not be saved. Check browser storage permission or available space. Keep this game open to retain current progress.',invalid:'The saved game is damaged or incompatible with the current questions and rules. Start new to replace it. Other records are preserved.',empty:'No saved solo game.',summary:'questions answered',score:'Score',time:'Play time',scope:'This browser and account only. Time stops while closed.'}
};
function sr(key){return soloCopy[locale.language==='en'?'en':'ms'][key];}
function saveSolo(){
 if(refreshingLanguage||!game||roomState||game.mode==='duel'||!visualPlan)return;
 soloStore.save(game,{actor:soloActor,id:roundId,visualPlan,selected},now());
 soloNotice=soloStore.status==='failed'?'failed':'saved';
 const note=$('solo-save-status');note.hidden=false;note.textContent=sr(soloNotice);
}
function updateSoloEntry(){
 const button=$('solo-resume-button');if(!button)return;
 button.textContent=sr('resume');
 // An explicit entry also explains blocked or incompatible storage.
 const snapshot=soloStore.read(soloActor);
 button.hidden=!snapshot&&!['failed','invalid'].includes(soloStore.status);
 if(game&&!roomState&&game.mode!=='duel'){$('solo-save-status').textContent=sr(soloNotice||'saved');}
 else $('solo-save-status').hidden=true;
}
function openSolo(){
 const snapshot=soloStore.read(soloActor),status=soloStore.status;
 const summary=snapshot?`<p><b>${escapeHtml(snapshot.player.name)}</b> · ${escapeHtml(modeTitle(snapshot.mode))}</p><p>${snapshot.state.answers.length} / ${snapshot.questionIds.length} ${sr('summary')} · ${snapshot.state.stage==='solid'?'R1':'R2'}</p><p>${sr('score')}: ${snapshot.state.score} · ${sr('time')}: ${formatTime(snapshot.elapsed)}</p>`:`<p>${sr(status==='empty'?'empty':status==='invalid'?'invalid':'failed')}</p>`;
 openDialog('solo',sr('resume'),`<div class="dialog-copy">${summary}${soloNotice==='failed'?`<p role="status">${sr('failed')}</p>`:''}<p>${sr('scope')}</p></div><div class="dialog-actions"><button class="button button-outline" data-dialog-action="solo-new">${sr('new')}</button>${snapshot?`<button class="button button-primary" data-dialog-action="solo-resume" data-autofocus>${sr('resume')}</button>`:''}</div>`);
}
function resumeSolo(){
 const snapshot=soloStore.read(soloActor);if(!snapshot){openSolo();return;}
 let restored;try{restored=restoreSnapshot(snapshot,QUESTIONS,soloActor,now());}catch{soloStore.status='invalid';openSolo();return;}
 closeDialog();cancelDrag();resetRoomRequests();roomState=null;cloud.setRoom(null);
 game=restored.game;roundId=restored.id;visualPlan=restored.visualPlan;selected=restored.selected;
 soloNewAction=null;lastResult=null;playMode=game.mode;player={...game.player};lastClock='';lastLed={};
 acceptedSolid=game.attempts.solid===game.question.shape?game.question.shape:null;
 acceptedNet=game.attempts.net===game.question.shape?game.question.shape:null;
 $('player-initial').textContent=player.name[0];$('player-display').textContent=player.name;$('player-meta').textContent=playerMeta();
 showScreen('game');if(game.status==='finished'){finishGame();return;}
 renderQuestion(true);
 if(game.reviewing)renderCorrection();
 else if(game.status==='feedback'){$('game-screen').classList.add('is-correct');setStatus('Pasangan tepat! +1 markah. Bersedia untuk soalan seterusnya.','success','check');}
 else if(game.stage==='net')setStatus('Bongkah betul! Sekarang seret kad bentangannya ke R2.','success','check');
 $('question-title').focus({preventScroll:true});
}
$('solo-resume-button').addEventListener('click',()=>{soloNewAction=null;openSolo();});
window.addEventListener('pagehide',()=>{if(game&&!roomState&&game.mode!=='duel')game.pause(now());saveSolo();});
// A low-frequency checkpoint bounds unannounced termination loss, without frame writes.
setInterval(()=>{if(screen==='game'&&!document.hidden)saveSolo();},5000);

store.read();storageStatus();
requestAnimationFrame(frame);

function applyStaticLanguage(){
  document.documentElement.lang=locale.language;
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  for(const name of ['aria-label','title','placeholder','content']){
    document.querySelectorAll('[data-i18n-'+name+']').forEach(el=>el.setAttribute(name,t(el.getAttribute('data-i18n-'+name))));
  }
  $('language-select').value=locale.language;
  updateTitle();updateSound();updateMotion();updateModeChoice();renderDuelViews();renderMusicButton(music.state);portal.localize();
  renderModuleSaveStatus(moduleProgress.state);
  updateSoloEntry();
  if(screen==='module')$('module-back-button').innerHTML=icon('home')+t(moduleReturnToPortal?'platform.backClass':'ease.backHome');
}
function applyLanguage(){
  const focused=document.activeElement;
  const focusedAction=focused?.dataset.dialogAction;
  refreshingLanguage=true;
  try{
    applyStaticLanguage();
    for(const key of ['name']){
      const error=validationErrors?.[key];
      $(key+'-error').textContent=error?t(error):'';
    }
    if(game&&screen==='game'){
      $('player-meta').textContent=playerMeta();
      renderQuestionContent();
      document.querySelectorAll('.choice').forEach(button=>{
        const {kind,shape,letter}=button.dataset;
        button.setAttribute('aria-label',t("choice.label",{kind:kind==='solid'?t("bongkah"):t("bentangan"),letter,description:describeShape(shape,kind,locale.language)}));
        button.querySelector('.choice-id').innerHTML=`<span class="grip" aria-hidden="true">⠿</span>${kind==='solid'?t("Bongkah"):t("Kad")} ${letter}`;
      });
      lastLed={};renderState();
      if(game.reviewing)renderCorrection();
      if(lastStatus){
        setStatus(lastStatus.key,lastStatus.tone,lastStatus.symbol,lastStatus.params);
      }
    }
    if(screen==='result'&&lastResult)renderResult();
    if(dialog.open){
      if(dialogMode==='solo')openSolo();
      else if(dialogMode==='solo-new'){$('dialog-title').textContent=sr('new');$('dialog-content').querySelector('p').textContent=sr('confirm');const buttons=$('dialog-content').querySelectorAll('button');buttons[0].textContent=sr('cancel');buttons[1].textContent=sr('new');}
      else if(dialogMode==='settings'){$('dialog-title').textContent=t('ease.settings');usabilityUI.refreshSettings();}
      else if(dialogMode==='tutorial')usabilityUI.refreshTutorial();
      else if(dialogMode==='help')helpSupport.refresh();
      else if(dialogMode==='pause')openPause(automaticPause);
      else if(dialogMode==='leave')requestHome();
      else if(dialogMode==='scores')openScores(scoreNotice);
      else if(dialogMode==='erase')openErase();
      else if(dialogMode==='duel-leave')requestHome();
      else if(dialogMode==='portal-leave')requestAccounts(requestedPortalTarget);
    }
    storageStatus();
  }finally{refreshingLanguage=false;}
  if(focused?.isConnected)focused.focus({preventScroll:true});
  else if(focusedAction)dialog.querySelector('[data-dialog-action="'+focusedAction+'"]')?.focus({preventScroll:true});
}
$('language-select').addEventListener('change',event=>{
  cancelDrag();
  if(locale.setLanguage(event.target.value)){applyLanguage();announce(t("language.changed"));}
});
moduleBridge=createModuleBridge({frame:$('module-frame'),getSettings:()=>({language:locale.language,textSize:textSize(preferences.text),motionPaused,contrast:preferences.contrast,autoRotate:preferences.autoRotate,showLabels:preferences.labels,resume:preferences.resume,lastSection:preferences.lastSection,audioEnabled:!preferences.muted}),openSettings:()=>usabilityUI.openSettings(),openHelp,onChoice:patch=>preferenceStore.set(patch)});
usabilityUI=createUsabilityUI({storage,preferenceStore,t,openDialog,closeDialog,onStart:beginSelectedMode,onTheme:setTheme,onTestSound:()=>tone('solid'),onHelp:openHelp});
helpSupport=createHelpSupport({t,getLanguage:()=>locale.language,getContext:supportContext,openDialog,openTutorial:()=>usabilityUI.openTutorial({fromHelp:true}),openSettings:()=>usabilityUI.openSettings(),openModuleGuide:()=>{closeDialog();moduleBridge.showGuide();}});
function applyPreferences(value){
  preferences=value;document.documentElement.dataset.textSize=String(textSize(value.text));document.documentElement.style.setProperty('--text-scale',String(textSize(value.text)/100));document.documentElement.dataset.contrast=value.contrast;
  sound=value.effects;updateSound();updateMotion();music.setVolume(value.musicVolume/100);void music.setEnabled(value.music&&!value.muted);
  if(value.muted||!value.effects)void audioContext?.suspend().catch(()=>{});
  usabilityUI?.refreshSettings();moduleBridge?.sync();
}
preferenceStore.subscribe(applyPreferences);applyPreferences(preferenceStore.value);
window.addEventListener('storage',event=>{if(event.key===PREFERENCES_KEY||event.key===null)preferenceStore.reload();});
applyLanguage();

if(cloud.hasAuthCallback||cloud.hasRecoveryIntent)void openAccounts();

// Reuse the existing Auth lifecycle only when an account was already persisted.
try{if(!cloud.hasAuthCallback&&!cloud.hasRecoveryIntent&&storage.getItem('geodecoder.cloud.auth'))void cloud.init().catch(()=>{});}catch{}
