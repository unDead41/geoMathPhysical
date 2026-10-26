import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';

const player={name:'QA Guest',category:'Murid',className:'1 QA'};
test('integrated V2 platform retains all fifteen practice IDs in its single Game engine',()=>{
  const game=new Game(QUESTIONS,player,0,Math.random,{mode:'practice'});
  assert.equal(game.round.length,15);
  assert.deepEqual(game.round.map(q=>q.id).sort(),QUESTIONS.map(q=>q.id).sort());
});
test('integrated engine exposes validated Duel recovery without changing the room-facing constructor',()=>{
  assert.equal(typeof Game.fromDuelSnapshot,'function');
  const roomGame=new Game(QUESTIONS,player,0);
  assert.equal(roomGame.round.length,10);
  assert.equal(roomGame.scan('solid',roomGame.question.shape,'r1',20).type,'solid');
  assert.equal(roomGame.stage,'net');
});
