import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/features/ai_battle/domain/ai_policy.dart';

void main() {
  test(
    'correct-count pressure is monotone, bounded and difficulty-specific',
    () {
      for (final difficulty in AiDifficulty.values) {
        final p = AiDifficultyProfile.of(difficulty);
        var accuracy = p.accuracyMin;
        var minimum = p.startMinAnswerMs, maximum = p.startMaxAnswerMs;
        expect(p.accuracyForCorrect(-100), p.accuracyMin);
        for (var correct = 0; correct <= 100; correct++) {
          final current = p.accuracyForCorrect(correct);
          final range = p.boundsForCorrect(correct);
          expect(current, inInclusiveRange(p.accuracyMin, p.accuracyMax));
          expect(current, greaterThanOrEqualTo(accuracy));
          expect(range.minimum, lessThanOrEqualTo(minimum));
          expect(range.maximum, lessThanOrEqualTo(maximum));
          expect(range.minimum, greaterThanOrEqualTo(p.endMinAnswerMs));
          expect(range.maximum, greaterThanOrEqualTo(p.endMaxAnswerMs));
          expect(range.minimum, lessThanOrEqualTo(range.maximum));
          accuracy = current;
          minimum = range.minimum;
          maximum = range.maximum;
        }
        expect(p.boundsForCorrect(8), (
          minimum: p.endMinAnswerMs,
          maximum: p.endMaxAnswerMs,
        ));
        expect(p.accuracyForCorrect(100), closeTo(p.accuracyMax, 1e-12));
      }
      final easy = AiDifficultyProfile.of(AiDifficulty.easy);
      final hard = AiDifficultyProfile.of(AiDifficulty.hard);
      expect(easy.accuracyMax, lessThan(hard.accuracyMin));
      expect(easy.endMinAnswerMs, greaterThan(hard.endMinAnswerMs));
    },
  );

  test(
    'fixed draw adapts only within selected profile and is a pair probability',
    () {
      AiOpponentPlan plan(int correct) => AiOpponentPlan.fromDraws(
        difficulty: AiDifficulty.easy,
        playerCorrect: correct,
        answer: GeometryShape.cube,
        draws: [.5, .5, .8, .4, .5],
      );
      expect(plan(0).correct, isFalse);
      expect(plan(8).correct, isTrue);
      expect(plan(8).answerDelayMs, lessThan(plan(0).answerDelayMs));
      expect(plan(100).toJson(), plan(8).toJson());
      final correct = plan(8);
      expect(correct.solid, GeometryShape.cube);
      expect(correct.net, GeometryShape.cube);
      expect(correct.solidDelayMs, lessThan(correct.answerDelayMs));
    },
  );

  test(
    'every correct/wrong completion stays inside all adaptive timing bounds',
    () {
      for (final difficulty in AiDifficulty.values) {
        final profile = AiDifficultyProfile.of(difficulty);
        for (var correct = 0; correct <= 10; correct++) {
          final bounds = profile.boundsForCorrect(correct);
          for (final timing in [0.0, .25, .5, .999999999999]) {
            for (final stage in [0.0, .99]) {
              for (final draw in [0.0, .999999]) {
                final plan = AiOpponentPlan.fromDraws(
                  difficulty: difficulty,
                  playerCorrect: correct,
                  answer: GeometryShape.cone,
                  draws: [draw, timing, stage, .9999, .9],
                );
                expect(
                  plan.answerDelayMs,
                  inInclusiveRange(bounds.minimum, bounds.maximum),
                );
                expect(
                  plan.solidDelayMs,
                  inInclusiveRange(1, plan.answerDelayMs),
                );
                if (plan.correct) {
                  expect(plan.solid, GeometryShape.cone);
                  expect(plan.net, GeometryShape.cone);
                } else if (stage == 0) {
                  expect(plan.solid, isNot(GeometryShape.cone));
                  expect(plan.net, isNull);
                  expect(plan.solidDelayMs, plan.answerDelayMs);
                } else {
                  expect(plan.solid, GeometryShape.cone);
                  expect(plan.net, isNot(GeometryShape.cone));
                }
              }
            }
          }
        }
      }
    },
  );

  test('invalid or unbounded random draws cannot produce an AI plan', () {
    for (final bad in [double.nan, double.infinity, -.1, 1.0, 2.0]) {
      expect(
        () => AiOpponentPlan.fromDraws(
          difficulty: AiDifficulty.hard,
          playerCorrect: 10,
          answer: GeometryShape.cube,
          draws: [.2, bad, .2, .2, .2],
        ),
        throwsFormatException,
      );
    }
    expect(
      () => AiOpponentPlan.fromDraws(
        difficulty: AiDifficulty.easy,
        playerCorrect: 0,
        answer: GeometryShape.cube,
        draws: [.2],
      ),
      throwsFormatException,
    );
  });
}
