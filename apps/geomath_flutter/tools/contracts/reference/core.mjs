import {duelCheckpoint,applyDuelState} from './duel-state.mjs';
export const VERSION = '2.9.1';
export const RULESET = 'single-attempt-v1';
export const SHAPES = ['cube', 'cuboid', 'pyramid', 'cylinder', 'cone'];
export const ROUND_SIZE = 10;
export const PRACTICE_SIZE = 15;
export const BLINK_MS = 900;
export const WRONG_MS = 1200;
export const REVIEW_MS = 1800;

export function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function reshuffle(items, previous, rng = Math.random) {
  if (!previous || previous.length !== items.length) return shuffle(items,rng);
  for (let attempt=0;attempt<12;attempt++) {
    const candidate = shuffle(items,rng);
    if (candidate.every((value,index)=>value!==previous[index])) return candidate;
  }
  const shift=1+Math.floor(rng()*(previous.length-1));
  return [...previous.slice(shift),...previous.slice(0,shift)];
}

export function questionTopic(question) {
  if(['properties','formula','net'].includes(question.topic))return question.topic;
  return /^[VL]=/.test(question.prompt) ? 'formula' : question.id.endsWith('3') ? 'net' : 'properties';
}

export function analyseAnswers(answers) {
  function group(ids,key) {
    return ids.map(id=>{
      const rows=answers.filter(answer=>answer[key]===id), total=rows.length;
      const correct=rows.filter(answer=>answer.outcome==='correct').length;
      return {id,total,correct,wrong:rows.filter(a=>a.outcome==='wrong').length,skipped:rows.filter(a=>a.outcome==='skipped').length,hints:rows.filter(a=>a.hint).length,elapsed:rows.reduce((sum,a)=>sum+a.elapsed,0),percent:total?Math.round(correct/total*100):null};
    });
  }
  const byShape=group(SHAPES,'shape'),byTopic=group(['properties','formula','net'],'topic');
  const byStage=['solid','net'].map(id=>{
    const attempted=answers.filter(a=>a.attempts[id]!==null);
    const correct=attempted.filter(a=>a.attempts[id]===a.shape).length;
    return {id,attempted:attempted.length,correct,wrong:attempted.length-correct,notAttempted:answers.length-attempted.length,percent:attempted.length?Math.round(correct/attempted.length*100):null};
  });
  const weakShapes=byShape.filter(row=>row.total&&row.correct<row.total).sort((a,b)=>a.percent-b.percent||b.wrong-a.wrong);
  const weakTopics=byTopic.filter(row=>row.total&&row.correct<row.total).sort((a,b)=>a.percent-b.percent||b.wrong-a.wrong);
  const weakStage=byStage.filter(row=>row.attempted&&row.wrong).sort((a,b)=>a.percent-b.percent)[0]||null;
  return {byShape,byTopic,byStage,weakShapes,weakTopics,weakStage};
}

export function buildRound(bank, rng = Math.random, mode = 'quiz', questionIds) {
  if(mode==='review'){
    if(!Array.isArray(questionIds)||!questionIds.length||questionIds.length>PRACTICE_SIZE||new Set(questionIds).size!==questionIds.length)throw new Error('Invalid review round');
    const round=questionIds.map(id=>bank.find(question=>question.id===id));
    if(round.some(question=>!question))throw new Error('Invalid review questions');
    return shuffle(round,rng);
  }
  if(mode==='duel'){
    throw new Error('Duel requires the active server projection');
  }
  if(mode!=='quiz'&&mode!=='practice')throw new Error('Unknown play mode');
  if(mode==='practice'){
    if(bank.length!==PRACTICE_SIZE||new Set(bank.map(q=>q.id)).size!==PRACTICE_SIZE||SHAPES.some(shape=>bank.filter(q=>q.shape===shape).length!==3)){
      throw new Error('Practice requires all 15 unique bank questions, three per shape');
    }
    return shuffle(bank,rng);
  }
  const selected = SHAPES.flatMap(shape => shuffle(bank.filter(q => q.shape === shape), rng).slice(0, 2));
  if (selected.length !== ROUND_SIZE || new Set(selected.map(q => q.id)).size !== ROUND_SIZE) {
    throw new Error('Bank mesti mempunyai sekurang-kurangnya dua soalan unik bagi setiap bongkah.');
  }
  return shuffle(selected, rng);
}

export function validatePlayer(input) {
  const player = {name: String(input.name ?? '').trim().replace(/\s+/g, ' '), category: input.category, className: String(input.className ?? '').trim().replace(/\s+/g, ' ')};
  const errors = {};
  if (player.name.length < 2 || player.name.length > 60) errors.name = 'Masukkan nama antara 2 hingga 60 aksara.';
  if (!['Murid', 'Pelajar', 'Tetamu'].includes(player.category)) errors.category = 'Pilih Murid atau Pelajar.';
  if ((!player.className && player.category !== 'Tetamu') || player.className.length > 40) errors.className = 'Masukkan kelas, maksimum 40 aksara.';
  return {player, errors, valid: Object.keys(errors).length === 0};
}

export function validateGuest(input) {
  return validatePlayer({name:input?.name,category:'Tetamu',className:''});
}

export function formatTime(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export class Game {
  constructor(bank, player, now = 0, rng = Math.random, options = {}) {
    this.mode = options.mode ?? 'quiz';
    if(this.mode==='duel'&&(!Array.isArray(options.serverRound)||options.serverRound.length!==ROUND_SIZE))throw new Error('Duel requires the active server projection');
    this.round = this.mode==='duel'?options.serverRound:buildRound(bank, rng, this.mode, options.questionIds);
    this.player = {...player};
    this.index = 0;
    this.score = 0;
    this.mistakes = 0;
    this.hints = 0;
    this.skipped = 0;
    this.stage = 'solid';
    this.status = 'running';
    this.hintOpen = false;
    this.hintUsed = false;
    this.wrongOnQuestion = false;
    this.attempts = {solid:null,net:null};
    this.questionStartElapsed = 0;
    this.reviewReadyAt = 0;
    this.firstTry = 0;
    this.elapsed = 0;
    this.segmentStart = now;
    this.paused = false;
    this.pauseStart = 0;
    this.transitionAt = 0;
    this.wrongUntil = 0;
    this.wrongReader = null;
    this.lastOutcome = null;
    this.answers = [];
    this.solidOrder = shuffle(SHAPES, rng);
    this.netOrder = shuffle(SHAPES, rng);
    this.rng = rng;
  }

  get question() { return this.round[this.index]; }
  get total() { return this.round.length; }
  static fromDuelSnapshot(bank,player,snapshot,now=0,rng=Math.random){
    const state=duelCheckpoint(snapshot,now);
    return Object.assign(new Game(null,player,now,rng,{mode:'duel',serverRound:state.round}),state);
  }
  time(now) { return this.elapsed + (this.status === 'running' && !this.paused ? Math.max(0, now - this.segmentStart) : 0); }
  get interactive() { return this.status === 'running' && !this.paused; }
  applyDuelAcknowledgement(action,payload,now,snapshot){
    if(this.mode!=='duel')return false;
    return applyDuelState(this,action,snapshot,now);
  }

  scan(kind, shape, target, now) {
    if(this.mode==='duel')return {type:'blocked'};
    if (!this.interactive) return {type: 'blocked'};
    const activeTarget = this.stage === 'solid' ? 'r1' : 'r2';
    if (target !== activeTarget) return {type: 'stage', target: activeTarget};
    if (kind !== this.stage || !SHAPES.includes(shape)) return {type: 'kind', kind: this.stage};
    this.attempts[this.stage] = shape;
    if (shape !== this.question.shape) {
      this.mistakes++;
      this.wrongOnQuestion = true;
      this.wrongReader = activeTarget;
      this.beginFeedback('wrong',now);
      return {type: 'wrong', target: activeTarget};
    }
    this.wrongUntil = 0;
    this.wrongReader = null;
    if (this.stage === 'solid') {
      this.stage = 'net';
      this.hintOpen = false;
      return {type: 'solid'};
    }
    this.score++;
    if (!this.wrongOnQuestion) this.firstTry++;
    this.beginFeedback('correct', now);
    return {type: 'correct'};
  }

  beginFeedback(outcome, now) {
    this.elapsed = this.time(now);
    this.status = outcome==='correct'?'feedback':'review';
    this.lastOutcome = outcome;
    this.transitionAt = now + BLINK_MS;
    this.reviewReadyAt = now + REVIEW_MS;
    this.hintOpen = false;
    this.wrongUntil = 0;
    this.answers.push({id:this.question.id,shape:this.question.shape,topic:questionTopic(this.question),outcome,hint:this.hintUsed,failedAt:outcome==='wrong'?this.stage:null,attempts:{...this.attempts},elapsed:Math.round(this.elapsed-this.questionStartElapsed),firstTry:outcome==='correct'});
  }

  skip(now) {
    if(this.mode==='duel')return false;
    if (!this.interactive) return false;
    this.skipped++;
    this.beginFeedback('skipped', now);
    return true;
  }

  toggleHint() {
    if (!this.interactive) return false;
    this.hintOpen = !this.hintOpen;
    if (!this.hintUsed) { this.hints++; this.hintUsed = true; }
    return true;
  }

  update(now) {
    if (this.paused || this.status !== 'feedback' || now < this.transitionAt) return false;
    return this.advance(now);
  }

  get reviewing() { return this.status==='review'; }
  reviewReady(now) { return this.reviewing && !this.paused && now>=this.reviewReadyAt; }
  continueReview(now) {
    if (!this.reviewReady(now)) return false;
    return this.advance(now);
  }

  advance(now) {
    if(this.mode==='duel')return false;
    if (this.index === this.round.length - 1) {
      this.status = 'finished';
      return true;
    }
    this.index++;
    this.stage = 'solid';
    this.status = 'running';
    this.segmentStart = now;
    this.questionStartElapsed = this.elapsed;
    this.hintUsed = false;
    this.hintOpen = false;
    this.wrongOnQuestion = false;
    this.attempts = {solid:null,net:null};
    this.wrongReader = null;
    this.solidOrder = reshuffle(SHAPES, this.solidOrder, this.rng);
    this.netOrder = reshuffle(SHAPES, this.netOrder, this.rng);
    return true;
  }

  pause(now) {
    if (this.paused || this.status === 'finished') return;
    this.elapsed = this.time(now);
    this.paused = true;
    this.pauseStart = now;
  }
  resume(now) {
    if (!this.paused) return;
    const gap = Math.max(0, now - this.pauseStart);
    if (this.status === 'feedback' || this.reviewing) this.transitionAt += gap;
    if (this.reviewing) this.reviewReadyAt += gap;
    if (this.wrongUntil) this.wrongUntil += gap;
    this.segmentStart = now;
    this.paused = false;
  }

  led(reader, now) {
    if (this.status === 'feedback' || this.reviewing) {
      const clock = this.paused ? this.pauseStart : now;
      if (this.reviewing && clock>=this.transitionAt) {
        return reader===this.wrongReader?'red':reader==='r1'&&this.stage==='net'?'green':'off';
      }
      const on = Math.floor(Math.max(0, clock - (this.transitionAt - BLINK_MS)) / 150) % 2 === 0;
      return on ? (this.lastOutcome === 'correct' ? 'green' : 'red') : 'off';
    }
    if (reader === 'r1' && this.stage === 'net') return 'green';
    if (reader !== (this.stage === 'solid' ? 'r1' : 'r2')) return 'off';
    if (this.wrongReader === reader && now < this.wrongUntil) return 'red';
    return this.hintOpen ? 'purple' : 'blue';
  }

  result(id, completedAt = Date.now()) {
    if (this.status !== 'finished') return null;
    return {id,version:VERSION,ruleset:RULESET,mode:this.mode,player:{...this.player},score:this.score,total:this.total,mistakes:this.mistakes,hints:this.hints,skipped:this.skipped,firstTry:this.firstTry,elapsed:Math.round(this.elapsed),completedAt,answers:this.answers.map(answer=>({...answer,attempts:{...answer.attempts}}))};
  }
}
