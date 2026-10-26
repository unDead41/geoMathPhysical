import {translate} from './i18n.mjs';
import {RULESET} from './core.mjs';
export const LEGACY_SCORE_KEY = 'geodecoder.digital.v1.scores';
export const SCORE_KEY = 'geodecoder.digital.single-attempt.v1.scores';
export const MAX_SCORES = 50;

export function validRecord(r, legacy=false) {
  return !!r && typeof r.id === 'string' && r.id.length < 120 &&
    (legacy ? ['1.0.0','1.1.0'].includes(r.version) && r.ruleset!==RULESET : typeof r.version==='string' && /^\d+\.\d+\.\d+$/.test(r.version) && r.ruleset===RULESET) &&
    !!r.player && typeof r.player.name === 'string' && r.player.name.length >= 2 && r.player.name.length <= 60 &&
    (legacy ? ['Murid','Pelajar'] : ['Murid','Pelajar','Tetamu']).includes(r.player.category) && typeof r.player.className === 'string' && (r.player.category==='Tetamu' || r.player.className.length > 0) && r.player.className.length <= 40 &&
    (r.mode === undefined || r.mode === 'quiz') && r.total === 10 && Number.isInteger(r.score) && r.score >= 0 && r.score <= 10 &&
    ['mistakes', 'hints', 'skipped', 'firstTry'].every(k => Number.isInteger(r[k]) && r[k] >= 0) &&
    r.hints <= 10 && r.skipped <= 10 &&
    (legacy ? r.score+r.skipped===10 && r.firstTry<=r.score : r.mistakes<=10 && r.score+r.mistakes+r.skipped===10 && r.firstTry===r.score) &&
    Number.isFinite(r.elapsed) && r.elapsed >= 0 && Number.isFinite(r.completedAt) && r.completedAt > 0;
}

export function rankScores(scores) {
  return [...new Map(scores.filter(r=>validRecord(r)).map(r => [r.id, r])).values()]
    .sort((a,b) => b.score - a.score || a.mistakes - b.mistakes || a.elapsed - b.elapsed || a.completedAt - b.completedAt)
    .slice(0, MAX_SCORES);
}

export class ScoreStore {
  constructor(storage) { this.storage = storage; this.memory = []; this.failed = false; }
  readLegacy() {
    try {
      const rows=JSON.parse(this.storage.getItem(LEGACY_SCORE_KEY)||'[]');
      return Array.isArray(rows)?rows.filter(r=>validRecord(r,true)).slice(0,MAX_SCORES):[];
    } catch { return []; }
  }
  read() {
    try {
      const text = this.storage.getItem(SCORE_KEY);
      const data = text ? JSON.parse(text) : [];
      if (!Array.isArray(data)) throw new Error('Invalid records');
      return rankScores([...data, ...this.memory]);
    } catch {
      this.failed = true;
      return rankScores(this.memory);
    }
  }
  save(record) {
    if (!validRecord(record)) throw new Error('Invalid score');
    const scores = rankScores([...this.read(), record]);
    this.memory = scores;
    try { this.storage.setItem(SCORE_KEY, JSON.stringify(scores)); this.failed = false; }
    catch { this.failed = true; }
    return scores;
  }
  clear() {
    this.memory = [];
    try { this.storage.removeItem(SCORE_KEY); this.storage.removeItem(LEGACY_SCORE_KEY); this.failed = false; return true; }
    catch { this.failed = true; return false; }
  }
}

export function csvScores(scores,language='ms') {
  const field = value => {
    let v = String(value);
    if (/^\s*[=+@\-\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replaceAll('"', '""') + '"';
  };
  const header = translate(language,'csv.headers').split('|');
  const rows = rankScores(scores).map((r, i) => [i+1,r.player.name,translate(language,r.player.category),r.player.className,r.score,r.total,r.mistakes,r.hints,r.skipped,r.firstTry,(r.elapsed / 1000).toFixed(3),new Date(r.completedAt).toLocaleString(language==='en'?'en-MY':'ms-MY',{timeZone:'Asia/Kuala_Lumpur'})]);
  return '\uFEFF' + [header,...rows].map(row => row.map(field).join(',')).join('\r\n');
}
