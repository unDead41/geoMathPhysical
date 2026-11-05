import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';

void main() {
  test(
    'reflection validation preserves canonical stages, limits and trimming',
    () {
      for (final activity in ModuleActivity.values) {
        final record = ModuleReflection.create(
          activity: activity,
          stage: ReflectionStage.explanation,
          prediction: ' prediction ',
          result: ' result\n',
          explanation: ' explanation ',
          completed: true,
        );
        expect(record.valueOrNull?.toJson(), {
          'activity': activity.name,
          'stage': 'explanation',
          'prediction': 'prediction',
          'result': 'result',
          'explanation': 'explanation',
          'completed': true,
        });
      }
      final boundary = ModuleReflection.create(
        activity: ModuleActivity.net,
        stage: ReflectionStage.explanation,
        prediction: 'p' * 240,
        result: 'r' * 600,
        explanation: 'e' * 600,
        completed: true,
      );
      expect(boundary.isSuccess, isTrue);
      for (final overrides in <Map<String, Object?>>[
        {'activity': 'prism'},
        {'stage': 'ready'},
        {'prediction': 'p' * 241},
        {'result': 'r' * 601},
        {'explanation': 'e' * 601},
        {'prediction': ' ' * 240 + 'p'},
        {'prediction': '😀' * 121},
        {'prediction': 'no\u0000controls'},
        {'prediction': ' '},
        {'result': ''},
        {'explanation': ''},
        {'stage': 'check', 'completed': true},
        {'completed': 1},
      ]) {
        expect(
          ModuleReflection.fromJson({
            ...boundary.valueOrNull!.toJson(),
            ...overrides,
          }).failureOrNull?.code,
          FailureCode.invalid,
          reason: overrides.keys.join(','),
        );
      }
      expect(
        ModuleReflection.create(
          activity: ModuleActivity.volume,
          stage: ReflectionStage.prediction,
          prediction: '😀' * 120,
        ).isSuccess,
        isTrue,
      );
      expect(
        ModuleReflection.create(
          activity: ModuleActivity.volume,
          stage: ReflectionStage.experiment,
          prediction: 'prediction',
        ).isSuccess,
        isFalse,
      );
    },
  );

  test('merging cannot regress stage or completed explanation', () {
    final prediction = _reflection(ReflectionStage.prediction);
    final checked = _reflection(ReflectionStage.check);
    final completed = _reflection(ReflectionStage.explanation, completed: true);
    expect(checked.merge(prediction), checked);
    expect(prediction.merge(checked), checked);
    expect(completed.merge(checked), completed);
    expect(checked.merge(completed), completed);
    expect(
      completed.merge(_reflection(ReflectionStage.explanation)),
      completed,
    );
  });

  test(
    'completed solo validates canonical mode, integer accounting and duration',
    () {
      for (final (mode, total) in [
        ('quiz', 10),
        ('practice', 15),
        ('review', 1),
        ('review', 15),
      ]) {
        final valid = _solo(mode: mode, total: total);
        expect(CompletedSoloRecord.fromJson(valid).isSuccess, isTrue);
        expect(
          CompletedSoloRecord.fromJson({...valid, 'elapsed_ms': 604800000})
              .isSuccess,
          isTrue,
        );
      }
      final valid = _solo();
      for (final overrides in <Map<String, Object?>>[
        {'attempt_id': 'bad id'},
        {'attempt_id': 'a' * 161},
        {'mode': 'duel'},
        {'mode': 'classroom'},
        {'ruleset': 'multi-attempt-v2'},
        {'total': 9},
        {'total': 1.5},
        {'score': -1},
        {'mistakes': 1},
        {'hints': 11},
        {'elapsed_ms': 604800001},
        {'elapsed_ms': -1},
        {'elapsed_ms': 0.5},
        {'elapsed_ms': '0'},
      ]) {
        expect(
          CompletedSoloRecord.fromJson({...valid, ...overrides})
              .failureOrNull
              ?.code,
          FailureCode.invalid,
          reason: overrides.keys.join(','),
        );
      }
      // JavaScript Number.isSafeInteger accepts 10.0 as the number ten.
      expect(
        CompletedSoloRecord.fromJson({...valid, 'total': 10.0})
            .valueOrNull
            ?.total,
        10,
      );
    },
  );

  test('outbox event only permits canonical formative fields', () {
    final canonical = _reflection(ReflectionStage.prediction).toJson();
    final event = FormativeEvent(
      id: 'module:1',
      kind: FormativeEventKind.module,
      payload: canonical,
    );
    expect(event.toWireJson().keys, [
      'id',
      'kind',
      'content_version',
      'payload',
    ]);
    expect(
      () => event.payload['prediction'] = 'changed',
      throwsUnsupportedError,
    );
    expect(
      () => FormativeEvent(
        id: 'module:2',
        kind: FormativeEventKind.module,
        payload: {...canonical, 'access_token': 'forbidden-test-field'},
      ),
      throwsArgumentError,
    );
  });
}

ModuleReflection _reflection(ReflectionStage stage, {bool completed = false}) =>
    ModuleReflection.create(
      activity: ModuleActivity.net,
      stage: stage,
      prediction: 'prediction',
      result: stage.index >= 1 ? 'result' : '',
      explanation: stage == ReflectionStage.explanation ? 'explanation' : '',
      completed: completed,
    ).valueOrNull!;

Map<String, Object?> _solo({String mode = 'quiz', int total = 10}) => {
  'attempt_id': 'attempt:1',
  'mode': mode,
  'ruleset': 'single-attempt-v1',
  'score': total,
  'total': total,
  'mistakes': 0,
  'hints': 0,
  'skipped': 0,
  'elapsed_ms': 0,
};
