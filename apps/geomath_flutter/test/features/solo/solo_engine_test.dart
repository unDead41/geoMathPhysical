import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/features/solo/domain/solo_bank.dart';
import 'package:geomath_flutter/features/solo/domain/solo_game.dart';

class Draws implements RandomSource {
  Draws(this.values);
  final List<double> values;
  int cursor = 0;
  @override
  double nextDouble() {
    if (cursor >= values.length) throw StateError('RNG exhausted at $cursor');
    return values[cursor++];
  }

  @override
  int nextInt(int maximum) => (nextDouble() * maximum).floor();
}

class ConstantRandom implements RandomSource {
  @override
  double nextDouble() => .9999;
  @override
  int nextInt(int maximum) => (nextDouble() * maximum).floor();
}

SoloBank bank() => SoloBank.fromExport(
  jsonDecode(File('assets/contracts/bank15.json').readAsStringSync())
      as Map<String, dynamic>,
);
const player = {
  'name': 'Canonical fixture',
  'category': 'Tetamu',
  'className': '',
};
SoloGame create({SoloMode mode = SoloMode.quiz}) => SoloGame(
  bank: bank(),
  player: player,
  random: ConstantRandom(),
  mode: mode,
);

void main() {
  final golden = jsonDecode(
    File('assets/contracts/engine_golden.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  for (final raw in golden['scenarios'] as List) {
    final s = raw as Map<String, dynamic>;
    test(
      'approved JS -> Dart ${s['id']}: every action, state and numeric RNG cursor',
      () {
        final rng = Draws(
          (s['rng_draws'] as List)
              .cast<num>()
              .map((v) => v.toDouble())
              .toList(),
        );
        final options = s['options'] as Map;
        final game = SoloGame(
          bank: bank(),
          player: Map<String, String>.from(s['player'] as Map),
          random: rng,
          mode: SoloMode.values.byName(options['mode'] as String),
          now: s['start_clock_ms'] as num,
        );
        final expected = s['expected'] as Map;
        final snapshots = expected['snapshots'] as List;
        expect(
          game.goldenState(s['start_clock_ms'] as num),
          (snapshots.first as Map)['state'],
        );
        final actions = s['actions'] as List;
        for (var i = 0; i < actions.length; i++) {
          final action = actions[i] as Map;
          final at = action['clock_ms'] as num;
          final args = (action['args'] as List?) ?? [];
          final Object? outcome;
          switch (action['action']) {
            case 'scan':
              outcome = game.scan(
                args[0] as String,
                args[1] as String,
                args[2] as String,
                at,
              );
            case 'toggleHint':
              outcome = game.toggleHint();
            case 'skip':
              outcome = game.skip(at);
            case 'update':
              outcome = game.update(at);
            case 'continueReview':
              outcome = game.continueReview(at);
            case 'pause':
              game.pause(at);
              outcome = null;
            case 'resume':
              game.resume(at);
              outcome = null;
            default:
              throw StateError('Unknown fixture action');
          }
          final wanted = snapshots[i + 1] as Map;
          expect(
            outcome,
            wanted['outcome'],
            reason: '${s['id']} action$i $action',
          );
          expect(
            game.goldenState(at),
            wanted['state'],
            reason: '${s['id']} state$i',
          );
          expect(rng.cursor, ((wanted['state'] as Map)['rng_draws_consumed']));
        }
        expect(
          game.result(s['id'] as String, s['completed_at_ms'] as int),
          expected['result'],
        );
        expect(rng.cursor, expected['rng_draws_consumed']);
        expect(
          rng.cursor,
          rng.values.length,
          reason: 'All explicit draws consumed exactly',
        );
      },
    );
  }
  test('bank identity, balanced quiz10, practice15 and cone are preserved', () {
    final quiz = create(), practice = create(mode: SoloMode.practice);
    expect(bank().identity, SoloBank.approvedIdentity);
    expect(quiz.round.length, 10);
    expect(practice.round.length, 15);
    for (final shape in GeometryShape.values) {
      expect(quiz.round.where((q) => q.shape == shape).length, 2);
      expect(practice.round.where((q) => q.shape == shape).length, 3);
    }
    final corrupt = jsonDecode(
      File('assets/contracts/bank15.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    (corrupt['questions'] as List).first['hint'] = 'changed';
    expect(() => SoloBank.fromExport(corrupt), throwsFormatException);
  });
  test('selection does not scan; R2 premature/wrong-kind and duplicates cannot score', () {
    final game = create(), shape = create().question.shape.name;
    expect(game.scan('net', shape, 'r2', 10)['type'], 'stage');
    expect(game.scan('net', shape, 'r1', 20)['type'], 'kind');
    expect(game.answers, isEmpty);
    expect(game.scan('solid', shape, 'r1', 30)['type'], 'solid');
    expect(game.score, 0);
    expect(game.scan('net', shape, 'r2', 40)['type'], 'correct');
    expect(game.scan('net', shape, 'r2', 41)['type'], 'blocked');
    expect(game.score, 1);
    expect(game.skip(42), false);
    expect(game.toggleHint(), false);
  });
  for (final stage in ['solid', 'net']) {
    test(
      'wrong $stage ends attempt; untouched R2 is notAttempted; review requires Continue',
      () {
        final g = create();
        final wrong = GeometryShape.values
            .firstWhere((s) => s != g.question.shape)
            .name;
        if (stage == 'net') g.scan('solid', g.question.shape.name, 'r1', 10);
        g.scan(stage, wrong, stage == 'solid' ? 'r1' : 'r2', 20);
        expect(g.status, SoloStatus.review);
        expect(g.score, 0);
        expect(g.mistakes, 1);
        expect(g.update(1220), false);
        expect(g.update(99999), false);
        expect(g.continueReview(1819), false);
        final a = analyseSolo(g.answers)['byStage'] as List;
        expect((a[1] as Map)['notAttempted'], stage == 'solid' ? 1 : 0);
        expect(g.continueReview(1820), true);
      },
    );
  }
  test(
    'hint counts once across both stages; skip after R1 preserves R2 null',
    () {
      final g = create();
      g.toggleHint();
      g.toggleHint();
      g.toggleHint();
      g.scan('solid', g.question.shape.name, 'r1', 10);
      g.toggleHint();
      expect(g.hints, 1);
      expect(g.score, 0);
      g.skip(20);
      expect(g.answers.single.net, isNull);
      expect(g.answers.single.hint, true);
    },
  );
  for (final phase in [
    'solid',
    'net',
    'feedback',
    'wrong-solid',
    'wrong-net',
    'skip',
  ]) {
    test(
      'process death/reopen $phase retains consumed attempt, fractional clock and gate remainder',
      () {
        final g = create();
        if (['net', 'feedback', 'wrong-net'].contains(phase)) {
          g.scan('solid', g.question.shape.name, 'r1', 100.25);
        }
        if (phase == 'feedback') {
          g.scan('net', g.question.shape.name, 'r2', 200.75);
        }
        if (phase.startsWith('wrong')) {
          final wrong = GeometryShape.values
              .firstWhere((s) => s != g.question.shape)
              .name;
          g.scan(
            g.stage.name,
            wrong,
            g.stage == GeometryCardKind.solid ? 'r1' : 'r2',
            200.75,
          );
        }
        if (phase == 'skip') g.skip(200.75);
        g.pause(300.5);
        final s = jsonDecode(
          jsonEncode(g.checkpoint(999999)),
        ) as Map<String, dynamic>;
        final r = SoloGame.restore(s, bank(), ConstantRandom(), 1000000);
        expect(r.time(1000000), g.time(999999));
        expect(r.stage, g.stage);
        expect(r.score, g.score);
        expect(r.drawsConsumed, g.drawsConsumed);
        expect(
          r.answers.map((a) => a.toJson()).toList(),
          g.answers.map((a) => a.toJson()).toList(),
        );
        if (r.status == SoloStatus.feedback) {
          final due = 1000000 + (s['feedback_remaining'] as num);
          expect(r.update(due - 1), false);
          expect(r.update(due), true);
        } else if (r.reviewing) {
          final due = 1000000 + (s['review_remaining'] as num);
          expect(r.continueReview(due - 1), false);
          expect(r.continueReview(due), true);
        }
      },
    );
  }
  test(
    'checkpoint rejects forged score/schema/bank and invalid remaining timers',
    () {
      final original = create().checkpoint(100);
      for (final mutate in <void Function(Map<String, dynamic>)>[
        (s) => s['schema'] = 0,
        (s) => s['bank'] = 'old',
        (s) => (s['state'] as Map)['score'] = 10,
        (s) => s['review_remaining'] = -1,
        (s) => s['feedback_remaining'] = 901,
      ]) {
        final s = jsonDecode(jsonEncode(original)) as Map<String, dynamic>;
        mutate(s);
        expect(
          () => SoloGame.restore(s, bank(), ConstantRandom(), 1000),
          throwsFormatException,
        );
      }
    },
  );
  test('bounded reshuffle fallback consumes49 draws per shelf', () {
    final g = create();
    final before = g.drawsConsumed;
    g.skip(100);
    g.continueReview(1900);
    expect(g.drawsConsumed - before, 98);
  });
  test(
    'review accepts unique valid subset and cannot mutate original result',
    () {
      final ids = ['K1', 'C3'];
      final g = SoloGame(
        bank: bank(),
        player: player,
        random: ConstantRandom(),
        mode: SoloMode.review,
        questionIds: ids,
      );
      expect(g.round.map((q) => q.id).toSet(), ids.toSet());
      expect(
        () => SoloGame(
          bank: bank(),
          player: player,
          random: ConstantRandom(),
          mode: SoloMode.review,
          questionIds: ['K1', 'K1'],
        ),
        throwsFormatException,
      );
      expect(() => g.completedRecord('unfinished'), throwsStateError);
    },
  );
}
