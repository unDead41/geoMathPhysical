// Regenerate with the exact two pinned source files in an isolated directory:
// node test/features/duel/fixtures/generate_source_projection.mjs SOURCE_DIRECTORY
// No backend, credentials, local Solo bank or replacement projector is used.
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';

const sourceCommit = '752ce908d16d13acc9cc7510797e8363d182c3f5';
const sourceBlobs = {
  'handler.mjs': 'c8b0e4636b6613d9e3d29af491e7bccb1b3ee23f',
  'questions.mjs': '801fa44fbe7b260466de762d52c7ce4bfa61b498',
};
const directory = process.argv[2];
if (!directory) throw Error('Supply the directory containing the pinned source files.');
for (const [name, expected] of Object.entries(sourceBlobs)) {
  const bytes = await readFile(resolve(directory, name));
  const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  assert.equal(blob, expected, `Pinned Git blob mismatch: ${name}`);
}
const {projectDuelSnapshot} = await import(pathToFileURL(resolve(directory, 'handler.mjs')).href);
const {DUEL_QUESTIONS} = await import(pathToFileURL(resolve(directory, 'questions.mjs')).href);
const now = 1700000030000;
const roomId = '11111111-1111-4111-8111-111111111111';
const meId = '22222222-2222-4222-8222-222222222222';
const friendId = '33333333-3333-4333-8333-333333333333';
const ids = ['K1', 'K2', 'P1', 'P2', 'S1', 'S2', 'C1', 'C2', 'B1', 'B2'];
const clone = value => structuredClone(value);
const summary = (me = false) => ({
  id: me ? meId : friendId, slot: me ? 1 : 2, name: me ? 'Player one' : 'Player two',
  ready: true, answered: 0, stage: 'solid', score: 0, mistakes: 0, skipped: 0,
  hints: 0, finishedAt: null, elapsed: 30000, forfeited: false, lastSeenAt: now,
});
function raw() {
  return {
    ok: true, serverNow: now,
    room: {id: roomId, code: '123456', status: 'playing', startsAt: now - 30000,
      deadlineAt: now + 870000, lobbyExpiresAt: now + 570000, total: 10,
      questionIds: [...ids], winnerId: null, reason: null},
    me: {...summary(true), seq: 2, hintUsed: false, attempts: {solid: null, net: null},
      answers: [], reviewPending: false, nextReadyAt: null},
    // The real projector must drop SQL-only details even if raw upstream data
    // accidentally includes them. These are synthetic sentinel values.
    opponent: {...summary(), tokenHash: 'fixture-only', seq: 99, answers: [],
      attempts: {solid: 'cone', net: null}, hintUsed: true},
    actionResult: null,
  };
}
function answer(id, outcome = 'correct', failedAt = null) {
  const q = DUEL_QUESTIONS[id];
  const wrong = q.shape === 'cone' ? 'cube' : 'cone';
  return {id, shape: q.shape, topic: q.topic, outcome, hint: false, failedAt,
    elapsed: 500, firstTry: outcome === 'correct',
    attempts: {solid: outcome === 'correct' || failedAt === 'net' ? q.shape :
      failedAt === 'solid' ? wrong : null,
      net: outcome === 'correct' ? q.shape : failedAt === 'net' ? wrong : null}};
}
function settle(value, answers, {review = false} = {}) {
  value.me.answers = answers;
  value.me.answered = answers.length;
  value.me.score = answers.filter(a => a.outcome === 'correct').length;
  value.me.mistakes = answers.filter(a => a.outcome === 'wrong').length;
  value.me.skipped = answers.filter(a => a.outcome === 'skipped').length;
  value.me.hints = answers.filter(a => a.hint).length;
  value.me.finishedAt = answers.length === 10 ? now : null;
  value.me.reviewPending = review;
  value.me.nextReadyAt = review ? now + (answers.at(-1).outcome === 'correct' ? 900 : 1800) : null;
  return value;
}
const snapshots = {};
const add = (name, value) => {
  const projected = projectDuelSnapshot(value);
  assert(projected, name);
  assert(!('questionIds' in projected.room), name);
  assert(!('tokenHash' in projected.opponent || 'answers' in projected.opponent), name);
  if (projected.currentQuestion) {
    assert.equal(projected.currentQuestion.id, `duel-${projected.me.answered}`);
    assert(!('shape' in projected.currentQuestion), name);
    assert(!('sources' in projected.currentQuestion), name);
  }
  snapshots[name] = projected;
};
for (const id of Object.keys(DUEL_QUESTIONS)) {
  const value = raw();
  value.room.questionIds[0] = id;
  add(`active_${id}`, value);
}
const net = raw();
net.me.stage = 'net';
net.me.attempts.solid = 'cube';
net.actionResult = {type: 'solid'};
add('net_stage', net);
const hinted = clone(net);
hinted.me.hintUsed = true;
hinted.me.hints = 1;
hinted.actionResult = {type: 'hint'};
add('confirmed_hint', hinted);
for (const [name, outcome, failedAt] of [
  ['correct', 'correct', null], ['wrong_r1', 'wrong', 'solid'],
  ['wrong_r2', 'wrong', 'net'], ['skipped', 'skipped', null],
]) {
  const value = settle(raw(), [answer(ids[0], outcome, failedAt)], {review: true});
  value.actionResult = {type: outcome, target: failedAt === 'solid' ? 'r1' : failedAt === 'net' ? 'r2' : null};
  add(`review_${name}`, value);
}
const complete = settle(raw(), ids.map(id => answer(id)), {review: true});
Object.assign(complete.opponent, {answered: 10, score: 8, skipped: 2, finishedAt: now, elapsed: 30000});
Object.assign(complete.room, {status: 'complete', winnerId: meId, reason: 'score'});
add('complete_final_review', complete);
const advanced = clone(complete);
advanced.me.reviewPending = false;
advanced.me.nextReadyAt = null;
advanced.me.seq++;
advanced.actionResult = {type: 'advanced'};
add('complete_advanced', advanced);
const deadline = settle(raw(), ids.map(id => answer(id, 'skipped')));
deadline.serverNow = deadline.room.deadlineAt;
Object.assign(deadline.me, {finishedAt: deadline.room.deadlineAt, elapsed: 900000});
Object.assign(deadline.opponent, {answered: 10, skipped: 10, finishedAt: deadline.room.deadlineAt, elapsed: 900000});
Object.assign(deadline.room, {status: 'complete', winnerId: null, reason: 'tie'});
add('complete_deadline', deadline);
for (const status of ['waiting', 'countdown', 'cancelled', 'expired']) {
  const value = raw();
  value.room.status = status;
  value.me.elapsed = value.opponent.elapsed = 0;
  if (status === 'countdown') {
    value.room.startsAt = now + 3000;
    value.room.deadlineAt = now + 903000;
    value.me.nextReadyAt = value.room.startsAt;
  } else {
    value.room.startsAt = value.room.deadlineAt = null;
    value.me.ready = value.opponent.ready = false;
    value.room.questionIds = [];
    if (status === 'cancelled') {value.me.forfeited = true; value.room.reason = 'left';}
    if (status === 'expired') value.room.reason = 'lobby_expired';
  }
  add(status, value);
}
const output = {sourceCommit, sourceDirectory: 'digital/backend/duel/functions/geodecoder-duel',
  sourceBlobs, fixtureMethod: 'Real projectDuelSnapshot over synthetic SQL-shaped inputs; no hosted service claim.', snapshots};
await writeFile(resolve(dirname(fileURLToPath(import.meta.url)), 'source_projection.json'), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`Generated ${Object.keys(snapshots).length} pinned Edge projections.\n`);
