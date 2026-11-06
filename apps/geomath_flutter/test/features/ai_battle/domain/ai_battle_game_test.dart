import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/features/ai_battle/domain/ai_battle_game.dart';
import 'package:geomath_flutter/features/solo/domain/solo_bank.dart';
import 'package:geomath_flutter/features/solo/domain/solo_game.dart';

final class ConstantRandom implements RandomSource {
  ConstantRandom(this.value);
  final double value;
  int draws = 0;
  @override
  double nextDouble() {
    draws++;
    return value;
  }

  @override
  int nextInt(int maximum) => (nextDouble() * maximum).floor();
}

final class PatternRandom implements RandomSource {
  PatternRandom(this.pattern);
  final List<double> pattern;
  int draws = 0;
  @override
  double nextDouble() => pattern[draws++ % pattern.length];
  @override
  int nextInt(int maximum) => (nextDouble() * maximum).floor();
}

SoloBank bank() => SoloBank.fromExport(
  jsonDecode(File('assets/contracts/bank15.json').readAsStringSync())
      as Map<String, dynamic>,
);

AiBattleGame create({
  AiDifficulty difficulty = AiDifficulty.easy,
  RandomSource? playerRandom,
  RandomSource? aiRandom,
}) => AiBattleGame(
  bank: bank(),
  playerName: 'Adaptive fixture',
  difficulty: difficulty,
  playerRandom: playerRandom ?? ConstantRandom(.321),
  aiRandom: aiRandom ?? ConstantRandom(.2),
);

void correct(AiBattleGame game, int at) {
  game.choose(game.player.question.shape);
  expect(game.scan('r1', at)['type'], 'solid');
  game.choose(game.player.question.shape);
  expect(game.scan('r2', at)['type'], 'correct');
}

Map<String, dynamic> copy(Map<String, dynamic> value) =>
    jsonDecode(jsonEncode(value)) as Map<String, dynamic>;

AiBattleGame restore(Map<String, dynamic> snapshot, {int now = 100000}) =>
    AiBattleGame.restore(
      checkpoint: snapshot,
      bank: bank(),
      playerRandom: ConstantRandom(.999),
      now: now,
    );

void main() {
  test('canonical balanced round and player stream are independent of AI difficulty', () {
    final playerRandom = ConstantRandom(.321);
    final aiRandom = ConstantRandom(.4);
    final game = create(playerRandom: playerRandom, aiRandom: aiRandom);
    final hard = create(
      difficulty: AiDifficulty.hard,
      aiRandom: ConstantRandom(.9),
    );
    expect(game.total, 10);
    for (final shape in GeometryShape.values) {
      expect(game.player.round.where((q) => q.shape == shape), hasLength(2));
    }
    expect(
      game.player.round.map((q) => q.id),
      hard.player.round.map((q) => q.id),
    );
    expect(game.player.solidOrder, hard.player.solidOrder);
    expect(game.player.netOrder, hard.player.netOrder);
    expect(playerRandom.draws, 1);
    expect(aiRandom.draws, 50);
    game.choose(game.player.question.shape);
    game.hint();
    game.hint();
    game.tick(100);
    game.checkpoint(100);
    expect(aiRandom.draws, 50);
    expect(game.player.hints, 1);
    expect(game.aiScore, 0);
    expect(game.player.score, 0);
  });

  test('selection/premature scan cannot consume attempt or retroactively change the plan', () {
    final game = create(aiRandom: ConstantRandom(.5));
    final plan = game.currentPlan.toJson();
    final shape = game.player.question.shape;
    game.choose(shape);
    expect(game.player.attemptedSolid, isNull);
    expect(game.scan('r2', 10)['type'], 'stage');
    expect(game.selected, shape);
    expect(game.player.attemptedSolid, isNull);
    expect(game.scan('r1', 20)['type'], 'solid');
    expect(game.player.score, 0);
    expect(game.player.stage, GeometryCardKind.net);
    expect(game.selected, isNull);
    game.choose(shape);
    expect(game.scan('r2', 30)['type'], 'correct');
    expect(game.player.score, 1);
    expect(game.scan('r2', 30)['type'], 'blocked');
    expect(game.player.score, 1);
    expect(game.currentPlan.toJson(), plan);
    expect(game.continueQuestion(40), isFalse);
    final done = game.currentPlan.answerDelayMs;
    game.tick(done);
    expect(game.questionSettled, isTrue);
    expect(game.canContinue(done + 899), isFalse);
    expect(game.continueQuestion(done + 900), isTrue);
    expect(game.index, 1);
    expect(game.currentPlan.accuracy, greaterThan(.40));
    expect(
      game.currentPlan.answerDelayMs,
      lessThan(plan['answer_delay_ms'] as int),
    );
    expect(game.selected, isNull);
  });

  test(
    'AI finishes exactly once and cannot advance past an unanswered player',
    () {
      final game = create();
      game.tick(100000);
      expect(game.aiAnswers, hasLength(1));
      expect(game.aiStage, AiOpponentStage.done);
      expect(game.index, 0);
      expect(game.status, AiBattleStatus.playing);
      expect(game.continueQuestion(100000), isFalse);
      game.tick(200000);
      expect(game.aiAnswers, hasLength(1));
      correct(game, 200000);
      expect(game.status, AiBattleStatus.review);
      expect(game.canContinue(200899), isFalse);
      expect(game.continueQuestion(200900), isTrue);
      expect(game.aiAnswers, hasLength(1));
      expect(game.index, 1);
    },
  );

  test(
    'wrong R1 and R2 are actual wrong pairs with full bounded answer time',
    () {
      for (final wrongStage in [.0, .99]) {
        final game = create(
          aiRandom: PatternRandom([.99, .2, wrongStage, .4, .5]),
        );
        final plan = game.currentPlan;
        game.tick(plan.answerDelayMs - 1);
        expect(game.aiAnswers, isEmpty);
        game.tick(plan.answerDelayMs);
        final answer = game.aiAnswers.single;
        expect(game.aiScore, 0);
        expect(answer.outcome, 'wrong');
        expect(answer.elapsed, plan.answerDelayMs);
        if (wrongStage == 0) {
          expect(answer.solid, isNot(game.player.question.shape));
          expect(answer.net, isNull);
        } else {
          expect(answer.solid, game.player.question.shape);
          expect(answer.net, isNot(game.player.question.shape));
        }
        expect(restore(game.checkpoint(plan.answerDelayMs)).aiScore, 0);
      }
    },
  );

  test('wrong and skip consume one player question, preserve scores and use long review gate', () {
    for (final skip in [false, true]) {
      final game = create();
      if (skip) {
        expect(game.skip(100), isTrue);
        expect(game.skip(101), isFalse);
      } else {
        game.choose(
          GeometryShape.values.firstWhere(
            (s) => s != game.player.question.shape,
          ),
        );
        expect(game.scan('r1', 100)['type'], 'wrong');
      }
      final done = game.currentPlan.answerDelayMs;
      game.tick(done);
      expect(game.player.score, 0);
      expect(game.player.answers, hasLength(1));
      expect(game.continueQuestion(done + 1799), isFalse);
      expect(game.continueQuestion(done + 1800), isTrue);
      expect(game.currentPlan.accuracy, .40);
    }
  });

  test(
    'pause freezes both R2 and AI clocks including repeated paused checkpoints',
    () {
      final game = create();
      game.choose(game.player.question.shape);
      game.scan('r1', 500);
      game.pause(1000);
      final before = game.checkpoint(1000);
      final after = game.checkpoint(100000);
      expect(after['question_age_ms'], before['question_age_ms']);
      expect(after['player'], before['player']);
      expect(game.aiAnswers, isEmpty);
      expect(game.scan('r2', 100000)['type'], 'blocked');
      game.resume(100001);
      expect(game.player.time(100001), 1000);
      expect(game.player.stage, GeometryCardKind.net);
      final due = game.currentPlan.answerDelayMs + 99001;
      game.tick(due - 1);
      expect(game.aiAnswers, isEmpty);
      game.tick(due);
      expect(game.aiAnswers, hasLength(1));
    },
  );

  test('reopen requires Resume and preserves selections, remaining time and future randomness', () {
    final original = create(aiRandom: PatternRandom([.5, .7, .8, .4, .3]));
    original.choose(original.player.question.shape);
    original.scan('r1', 1000);
    original.choose(original.player.question.shape);
    original.pause(2000);
    final restored = restore(original.checkpoint(2000));
    expect(restored.paused, isTrue);
    expect(restored.player.stage, GeometryCardKind.net);
    expect(restored.selected, original.selected);
    expect(restored.currentPlan.toJson(), original.currentPlan.toJson());
    expect(restored.player.solidOrder, original.player.solidOrder);
    expect(restored.player.netOrder, original.player.netOrder);
    restored.tick(200000);
    expect(restored.aiAnswers, isEmpty);
    expect(restored.player.time(200000), original.player.time(2000));
    restored.resume(200000);
    original.resume(200000);
    final remaining = original.currentPlan.answerDelayMs - 2000;
    final finish = 200000 + remaining;
    for (final game in [original, restored]) {
      expect(game.scan('r2', 200001)['type'], 'correct');
      game.tick(finish);
      expect(game.continueQuestion(finish + 900), isTrue);
    }
    expect(restored.currentPlan.toJson(), original.currentPlan.toJson());
    expect(
      restored.player.round.map((q) => q.id),
      original.player.round.map((q) => q.id),
    );
    expect(restored.player.solidOrder, original.player.solidOrder);
    expect(restored.player.netOrder, original.player.netOrder);
    expect(
      restored.aiAnswers.map((a) => a.toJson()),
      original.aiAnswers.map((a) => a.toJson()),
    );
  });

  test(
    'review remainder survives pause and reopen without premature advance',
    () {
      final game = create();
      game.skip(50);
      final done = game.currentPlan.answerDelayMs;
      game.tick(done);
      game.pause(done + 500);
      final restored = restore(game.checkpoint(done + 500));
      restored.resume(100000);
      expect(restored.continueQuestion(101299), isFalse);
      expect(restored.continueQuestion(101300), isTrue);
      expect(restored.player.score, 0);
      expect(restored.index, 1);
    },
  );

  test(
    'selected cards at either stage survive pause, but settled selections fail',
    () {
      for (final net in [false, true]) {
        final game = create();
        if (net) {
          game.choose(game.player.question.shape);
          game.scan('r1', 100);
        }
        game.choose(GeometryShape.cone);
        game.pause(200);
        final saved = game.checkpoint(5000);
        final reopened = restore(saved);
        expect(reopened.paused, isTrue);
        expect(reopened.selected, GeometryShape.cone);
        expect(
          reopened.player.stage,
          net ? GeometryCardKind.net : GeometryCardKind.solid,
        );
      }
      final game = create();
      correct(game, 100);
      final malformed = copy(game.checkpoint(100));
      malformed['selected'] = 'cone';
      expect(() => restore(malformed), throwsFormatException);
    },
  );

  test('difficulty and policy cap stay fixed through ten questions and completion replay', () {
    final game = create(aiRandom: ConstantRandom(.0));
    var start = 0;
    for (var i = 0; i < 10; i++) {
      expect(game.index, i);
      expect(game.difficulty, AiDifficulty.easy);
      expect(game.currentPlan.accuracy, lessThanOrEqualTo(.65));
      expect(game.currentPlan.answerDelayMs, greaterThanOrEqualTo(7000));
      correct(game, start + 1000);
      final done = start + game.currentPlan.answerDelayMs;
      game.tick(done);
      expect(game.continueQuestion(done + 900), isTrue);
      start = done + 900;
    }
    expect(game.status, AiBattleStatus.finished);
    expect(game.player.score, 10);
    expect(game.aiScore, 10);
    expect(game.winner, AiBattleWinner.player);
    expect(game.aiAnswers, hasLength(10));
    expect(game.continueQuestion(start + 100), isFalse);
    final restored = restore(game.checkpoint(start + 100));
    expect(restored.status, AiBattleStatus.finished);
    expect(restored.winner, game.winner);
    expect(restored.aiElapsed, game.aiElapsed);
  });

  test('winner compares score first, answering time second and supports exact draw', () {
    for (final outcome in ['ai', 'draw']) {
      final game = create(aiRandom: ConstantRandom(.0));
      var start = 0;
      for (var i = 0; i < 10; i++) {
        final delay = game.currentPlan.answerDelayMs;
        if (outcome == 'ai') {
          game.skip(start + 100);
        } else {
          correct(game, start + delay);
        }
        final done = math.max(start + delay, start + 100);
        game.tick(done);
        final gate = done + (outcome == 'ai' ? 1800 : 900);
        expect(game.continueQuestion(gate), isTrue);
        start = gate;
      }
      expect(
        game.winner,
        outcome == 'ai' ? AiBattleWinner.ai : AiBattleWinner.draw,
      );
    }
  });

  test('malformed bank/ruleset/policy/timers/AI answer/plan/RNG state snapshots fail closed', () {
    final game = create();
    correct(game, 100);
    game.tick(game.currentPlan.answerDelayMs);
    final valid = copy(game.checkpoint(game.currentPlan.answerDelayMs));
    final changes = <void Function(Map<String, dynamic>)>[
      (s) => s['schema'] = 2,
      (s) => s['policy_version'] = 2,
      (s) => s['bank'] = 'unknown-bank',
      (s) => s['ruleset'] = 'online-duel',
      (s) => s['difficulty'] = 'expert',
      (s) => s['question_age_ms'] = -1,
      (s) => s['question_age_ms'] = 1e30,
      (s) => s['review_remaining_ms'] = 901,
      (s) => (s['ai_plan'] as Map)['accuracy'] = 1,
      (s) => (s['ai_plan'] as Map)['answer_delay_ms'] = 0,
      (s) => (s['ai_answers'] as List).clear(),
      (s) => ((s['ai_answers'] as List).first as Map)['elapsed'] = 0,
      (s) => ((s['ai_answers'] as List).first as Map)['id'] = 'wrong-id',
      (s) => s['ai_stage'] = 'solid',
      (s) => s['player_rng_state'] = 0,
      (s) => s['player_seed'] = -1,
      (s) => (s['ai_draws'] as List).removeLast(),
      (s) => ((s['ai_draws'] as List).first as List)[0] = 1,
      (s) => ((s['ai_draws'] as List).first as List)[0] = double.nan,
      (s) => s['extra'] = true,
    ];
    for (var i = 0; i < changes.length; i++) {
      final snapshot = copy(valid);
      changes[i](snapshot);
      expect(
        () => restore(snapshot),
        throwsFormatException,
        reason: 'mutation$i',
      );
    }
    final options = copy(valid);
    final state = (options['player'] as Map)['state'] as Map;
    final order = state['solid_order'] as List;
    final first = order.first;
    order[0] = order[1];
    order[1] = first;
    expect(() => restore(options), throwsFormatException);
  });

  test(
    'backwards clocks cannot create a second AI result or rewind a plan',
    () {
      final game = create();
      game.tick(100);
      expect(() => game.tick(99), throwsFormatException);
      expect(game.aiAnswers, isEmpty);
      game.tick(game.currentPlan.answerDelayMs);
      expect(game.aiAnswers, hasLength(1));
    },
  );
}
