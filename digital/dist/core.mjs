export const VERSION = '1.0.0';
export const SHAPES = ['cube', 'cuboid', 'pyramid', 'cylinder', 'cone'];
export const ROUND_SIZE = 10;
export const BLINK_MS = 900;
export const WRONG_MS = 1200;

export function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function buildRound(bank, rng = Math.random) {
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
  if (!['Murid', 'Pelajar'].includes(player.category)) errors.category = 'Pilih Murid atau Pelajar.';
  if (!player.className || player.className.length > 40) errors.className = 'Masukkan kelas, maksimum 40 aksara.';
  return {player, errors, valid: Object.keys(errors).length === 0};
}

export function formatTime(ms) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export class Game {
  constructor(bank, player, now = 0, rng = Math.random) {
    this.round = buildRound(bank, rng);
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
  time(now) { return this.elapsed + (this.status === 'running' && !this.paused ? Math.max(0, now - this.segmentStart) : 0); }
  get interactive() { return this.status === 'running' && !this.paused; }

  scan(kind, shape, target, now) {
    if (!this.interactive) return {type: 'blocked'};
    const activeTarget = this.stage === 'solid' ? 'r1' : 'r2';
    if (target !== activeTarget) return {type: 'stage', target: activeTarget};
    if (kind !== this.stage || !SHAPES.includes(shape)) return {type: 'kind', kind: this.stage};
    if (shape !== this.question.shape) {
      this.mistakes++;
      this.wrongOnQuestion = true;
      this.wrongUntil = now + WRONG_MS;
      this.wrongReader = activeTarget;
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
    this.status = 'feedback';
    this.lastOutcome = outcome;
    this.transitionAt = now + BLINK_MS;
    this.hintOpen = false;
    this.wrongUntil = 0;
    this.answers.push({id: this.question.id, shape: this.question.shape, outcome, hint: this.hintUsed, firstTry: outcome === 'correct' && !this.wrongOnQuestion});
  }

  skip(now) {
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
    if (this.index === this.round.length - 1) {
      this.status = 'finished';
      return true;
    }
    this.index++;
    this.stage = 'solid';
    this.status = 'running';
    this.segmentStart = now;
    this.hintUsed = false;
    this.hintOpen = false;
    this.wrongOnQuestion = false;
    this.wrongReader = null;
    this.solidOrder = shuffle(SHAPES, this.rng);
    this.netOrder = shuffle(SHAPES, this.rng);
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
    if (this.status === 'feedback') this.transitionAt += gap;
    if (this.wrongUntil) this.wrongUntil += gap;
    this.segmentStart = now;
    this.paused = false;
  }

  led(reader, now) {
    if (this.status === 'feedback') {
      const clock = this.paused ? this.pauseStart : now;
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
    return {id, version: VERSION, player: {...this.player}, score: this.score, total: ROUND_SIZE, mistakes: this.mistakes, hints: this.hints, skipped: this.skipped, firstTry: this.firstTry, elapsed: Math.round(this.elapsed), completedAt};
  }
}
