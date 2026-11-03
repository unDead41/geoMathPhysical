import {Game, RULESET, SHAPES, validatePlayer} from './core.mjs';
import {PALETTE_NAMES} from './visuals.mjs';
export const SOLO_KEY='geodecoder.digital.solo.v1.';
const fields=['index','score','mistakes','hints','skipped','stage','status','hintOpen','hintUsed','wrongOnQuestion','attempts','questionStartElapsed','firstTry','wrongReader','lastOutcome','answers','solidOrder','netOrder'];
const clone=x=>JSON.parse(JSON.stringify(x));
const requireValid=x=>{if(!x)throw new Error('Invalid solo snapshot');};
export function makeSnapshot(game,bank,{actor,id,visualPlan,selected},now){
  requireValid(['quiz','practice','review'].includes(game.mode));
  const state=Object.fromEntries(fields.map(k=>[k,clone(game[k])]));
  const clock=game.paused?game.pauseStart:now;
  return {version:1,ruleset:RULESET,bank:JSON.stringify(bank),actor,id,mode:game.mode,player:{...game.player},questionIds:game.round.map(q=>q.id),state,elapsed:game.time(now),feedbackRemaining:Math.max(0,game.transitionAt-clock),reviewRemaining:Math.max(0,game.reviewReadyAt-clock),visualPlan:clone(visualPlan),selected:selected?clone(selected):null};
}
// Replay accepted actions with the real engine. Never trust stored totals or grant
// a new attempt when restoring feedback/review. Wall-clock time is not persisted.
export function restoreSnapshot(s,bank,actor,now=0){
  requireValid(s?.version===1&&s.ruleset===RULESET&&s.bank===JSON.stringify(bank)&&s.actor===actor&&typeof s.id==='string'&&s.id.length>0&&s.id.length<120);
  requireValid(['quiz','practice','review'].includes(s.mode)&&validatePlayer(s.player||{}).valid);
  requireValid(Array.isArray(s.questionIds)&&s.questionIds.length>0&&s.questionIds.length<=15&&new Set(s.questionIds).size===s.questionIds.length&&s.questionIds.every(id=>bank.some(q=>q.id===id)));
  requireValid(s.mode==='review'||s.mode==='practice'&&s.questionIds.length===15||s.mode==='quiz'&&s.questionIds.length===10&&SHAPES.every(shape=>s.questionIds.filter(id=>bank.find(q=>q.id===id).shape===shape).length===2));
  const a=s.state;
  requireValid(a&&Array.isArray(a.answers)&&a.answers.length<=s.questionIds.length&&Number.isFinite(s.elapsed)&&s.elapsed>=0&&Number.isFinite(a.questionStartElapsed)&&a.questionStartElapsed>=0&&a.questionStartElapsed<=s.elapsed);
  requireValid(['running','feedback','review','finished'].includes(a.status)&&Number.isInteger(a.index)&&a.index>=0&&a.index<s.questionIds.length);
  for(const k of ['hintOpen','hintUsed','wrongOnQuestion'])requireValid(typeof a[k]==='boolean');
  for(const [k,max] of [['feedbackRemaining',900],['reviewRemaining',1800]])requireValid(Number.isFinite(s[k])&&s[k]>=0&&s[k]<=max);
  for(const order of [a.solidOrder,a.netOrder])requireValid(Array.isArray(order)&&order.length===5&&new Set(order).size===5&&order.every(x=>SHAPES.includes(x)));
  for(const kind of ['solid','net'])requireValid(s.visualPlan?.[kind]&&SHAPES.every(shape=>PALETTE_NAMES.includes(s.visualPlan[kind][shape])));
  if(s.selected)requireValid(a.status==='running'&&s.selected.kind===a.stage&&SHAPES.includes(s.selected.shape)&&s.selected.letter===String.fromCharCode(65+a[s.selected.kind+'Order'].indexOf(s.selected.shape)));
  const g=new Game(bank,s.player,0,Math.random,{mode:'review',questionIds:s.questionIds});
  g.round=s.questionIds.map(id=>bank.find(q=>q.id===id));g.mode=s.mode;
  let answerTime=0;
  for(let i=0;i<a.answers.length;i++){
    const row=a.answers[i],q=g.question;
    requireValid(row&&row.id===q.id&&Number.isFinite(row.elapsed)&&Number.isInteger(row.elapsed)&&row.elapsed>=0&&typeof row.hint==='boolean'&&row.attempts);
    if(row.hint)g.toggleHint();
    const at=answerTime+row.elapsed;
    if(row.attempts.solid!==null)g.scan('solid',row.attempts.solid,'r1',at);
    if(row.attempts.net!==null)g.scan('net',row.attempts.net,'r2',at);
    if(row.outcome==='skipped')g.skip(at);
    const actual=g.answers.at(-1);
    requireValid(actual&&['id','shape','topic','outcome','hint','failedAt','elapsed','firstTry'].every(k=>actual[k]===row[k])&&actual.attempts.solid===row.attempts.solid&&actual.attempts.net===row.attempts.net);
    answerTime=at;
    if(i<a.answers.length-1||a.status==='running'||a.status==='finished')g.advance(at);
  }
  if(a.status==='running'){
    if(a.hintUsed)g.toggleHint();
    if(a.stage==='net')g.scan('solid',g.question.shape,'r1',answerTime);
  }
  requireValid(g.status===a.status&&g.index===a.index&&s.elapsed>=answerTime-a.answers.length);
  for(const k of ['score','mistakes','skipped','firstTry','hints','stage','hintUsed','wrongOnQuestion','wrongReader','lastOutcome'])requireValid(g[k]===a[k]);
  requireValid(a.attempts&&g.attempts.solid===a.attempts.solid&&g.attempts.net===a.attempts.net&&(!a.hintOpen||a.status==='running'&&a.hintUsed));
  requireValid(Math.abs(g.questionStartElapsed-a.questionStartElapsed)<=a.answers.length); // rounding each accepted answer can accumulate <1ms
  for(const key of fields)g[key]=clone(a[key]);
  g.elapsed=s.elapsed;g.segmentStart=now;g.paused=false;g.pauseStart=0;
  g.transitionAt=now+s.feedbackRemaining;g.reviewReadyAt=now+s.reviewRemaining;
  return {game:g,id:s.id,visualPlan:clone(s.visualPlan),selected:clone(s.selected)};
}
export class SoloStore{
  constructor(storage,bank){this.storage=storage;this.bank=bank;this.status='empty';}
  read(actor){try{const raw=this.storage.getItem(SOLO_KEY+actor);if(!raw){this.status='empty';return null;}const s=JSON.parse(raw);restoreSnapshot(s,this.bank,actor);this.status='saved';return s;}catch(error){this.status=error instanceof SyntaxError||error.message==='Invalid solo snapshot'?'invalid':'failed';return null;}}
  save(game,context,now){try{const s=makeSnapshot(game,this.bank,context,now);s.savedAt=Date.now();this.storage.setItem(SOLO_KEY+context.actor,JSON.stringify(s));this.status='saved';return true;}catch{this.status='failed';return false;}}
  clear(actor){try{this.storage.removeItem(SOLO_KEY+actor);this.status='empty';return true;}catch{this.status='failed';return false;}}
}

