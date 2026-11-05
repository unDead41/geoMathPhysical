import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/features/duel/duel_feature.dart';

import 'duel_test_support.dart';

void main() {
  test('active question is bilingual, anonymous, shape-free and hint-free', () {
    final state = DuelSnapshot.parse(snapshot(status: 'playing'));
    expect(state.currentQuestion!.id, 'duel-0');
    expect(state.currentQuestion!.settledShape, isNull);
    expect(state.currentQuestion!.copy['en']!.hint, isNull);
    expect(state.currentQuestion!.copy.keys.toSet(), {'ms', 'en'});
  });
  test('opponent secrets and question answer leakage are rejected', () {
    for (final key in [
      'token',
      'tokenHash',
      'answers',
      'attempts',
      'seq',
      'hintUsed',
    ]) {
      final raw = snapshot();
      (raw['opponent'] as Map<String, Object?>)[key] = 'secret';
      expect(
        () => DuelSnapshot.parse(raw),
        throwsA(isA<DuelProjectionException>()),
        reason: key,
      );
    }
    final shaped = snapshot(status: 'playing');
    (shaped['currentQuestion'] as Map<String, Object?>)['shape'] = 'cube';
    expect(
      () => DuelSnapshot.parse(shaped),
      throwsA(isA<DuelProjectionException>()),
    );
    final hinted = snapshot(status: 'playing');
    hinted['currentQuestion'] = question(0, hint: true);
    expect(
      () => DuelSnapshot.parse(hinted),
      throwsA(isA<DuelProjectionException>()),
    );
  });
  test('invalid counters, shortened matches, missing copies and malformed reviews fail closed', () {
    final cases = [
      snapshot(),
      snapshot(),
      snapshot(status: 'playing'),
      snapshot(status: 'playing', review: true, answers: [settledAnswer(0)]),
    ];
    (cases[0]['me'] as Map)['score'] = 1;
    (cases[1]['room'] as Map)['total'] = 9;
    ((cases[2]['currentQuestion'] as Map)['copy'] as Map).remove('ms');
    (cases[3]['me'] as Map)['nextReadyAt'] = null;
    for (final raw in cases) {
      expect(
        () => DuelSnapshot.parse(raw),
        throwsA(isA<DuelProjectionException>()),
      );
    }
  });
  test('settled private answer verifies attempt/outcome consistency without a local evaluator', () {
    final raw = snapshot(
      status: 'playing',
      answers: [settledAnswer(0, outcome: 'wrong')],
      review: true,
    );
    final state = DuelSnapshot.parse(raw);
    expect(state.me.mistakes, 1);
    expect(state.review!.question.settledShape, isNotNull);
    ((raw['me'] as Map)['answers'] as List).first['attempts']['solid'] = 'cube';
    expect(
      () => DuelSnapshot.parse(raw),
      throwsA(isA<DuelProjectionException>()),
    );
  });
}
