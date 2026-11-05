import 'dart:convert';
import 'dart:io';

import '../../../../lib/features/learning/persistence/learning_checkpoint_schema.dart';
import 'checkpoint_fixture.dart';

/// Executed by the Node parity test with the real Dart SDK; needs no Flutter UI.
void main() {
  final cases = <Map<String, Object?>>[];
  void add(String name, Map<String, Object?> value, bool expected) {
    final valid = LearningCheckpointSchema.isValid(value);
    if (valid != expected) {
      throw StateError('Dart checkpoint case failed: $name');
    }
    cases.add({
      'name': name,
      'value': jsonDecode(jsonEncode(value)),
      'expected': expected,
      'dartValid': valid,
    });
  }

  add(
    'studio drafts and unapplied dimensions',
    learningCheckpointFixture(),
    true,
  );
  final fullUndo = learningCheckpointFixture();
  final state = (fullUndo['projection'] as Map)['state'] as Map;
  for (final view in ['front', 'side', 'plan']) {
    (state['history'] as Map)[view] = List.generate(
      30,
      (_) => List.generate(
        200,
        (_) => {
          'kind': 'line',
          'a': [1, 1],
          'b': [3, 1],
          'type': 'visible',
        },
      ),
    );
  }
  add(
    'complete three-view Undo exceeds envelope and remains bounded',
    fullUndo,
    true,
  );
  for (final entry in {
    'schemaVersion': 2,
    'sourceCommit': 'stale',
    'moduleVersion': 'stale',
  }.entries) {
    add(
      'incompatible ${entry.key}',
      learningCheckpointFixture()..[entry.key] = entry.value,
      false,
    );
  }
  add('foreign owner', learningCheckpointFixture()..['owner'] = 'A', false);
  final longFormula = learningCheckpointFixture();
  (((longFormula['calculation'] as Map)['draft'] as Map)['answers']
          as Map)['formula'] =
      '1' * 481;
  add('calculation answer boundary', longFormula, false);
  final oldGate = learningCheckpointFixture();
  ((oldGate['calculation'] as Map)['draft'] as Map)['checks'] = {
    'formula': true,
  };
  add('live calculation gates cannot be serialized', oldGate, false);
  final noLine = learningCheckpointFixture();
  final line =
      ((((noLine['projection'] as Map)['state'] as Map)['drawings']
                      as Map)['front']
                  as List)
              .first
          as Map;
  line['b'] = [1, 1];
  add('zero-length line', noLine, false);
  final history = learningCheckpointFixture();
  (((history['projection'] as Map)['state'] as Map)['history']
      as Map)['front'] = List.generate(
    31,
    (_) => [],
  );
  add('Undo history boundary', history, false);
  final circle = learningCheckpointFixture();
  (((circle['projection'] as Map)['state'] as Map)['drawings']
      as Map)['front'] = [
    {
      'kind': 'circle',
      'center': [2, 2],
      'r': 1,
      'type': 'hidden',
    },
  ];
  add('analytic circle primitive', circle, true);
  final outside = learningCheckpointFixture();
  ((outside['projection'] as Map)['state'] as Map)['cursor'] = [101, 0];
  add('coordinate bound', outside, false);
  final incompleteCoordinate = learningCheckpointFixture();
  ((incompleteCoordinate['projection'] as Map)['coordinateDraft']
          as Map)['x2'] =
      '1' * 80;
  add('partially typed coordinate field boundary', incompleteCoordinate, true);
  ((incompleteCoordinate['projection'] as Map)['coordinateDraft']
          as Map)['x2'] =
      '1' * 81;
  add('coordinate field too long', incompleteCoordinate, false);
  for (final (shape, dimensions) in [
    ('cube', {'a': 20}),
    ('cuboid', {'p': 1, 'l': 20, 't': 5}),
    ('pyramid', {'a': 1, 't': 20}),
    ('cylinder', {'j': 1, 't': 20}),
    ('cone', {'j': 20, 't': 1}),
    ('assembly-step', {'a': 1}),
    ('assembly-recess', {'a': 1}),
  ]) {
    final project = learningCheckpointFixture();
    final state = (project['projection'] as Map)['state'] as Map;
    state['shape'] = shape;
    state['dimensions'] = dimensions;
    add('valid projection dimensions $shape', project, true);
  }
  final fractionalDimensions = learningCheckpointFixture();
  ((fractionalDimensions['projection'] as Map)['state'] as Map)['dimensions'] =
      {'a': 1.5};
  add('projection dimensions require whole cm', fractionalDimensions, false);
  final extraDimensions = learningCheckpointFixture();
  ((extraDimensions['projection'] as Map)['state'] as Map)['dimensions'] = {
    'a': 4,
    't': 3,
  };
  add('projection dimensions require exact fields', extraDimensions, false);
  final oversized = learningCheckpointFixture();
  final largeState = (oversized['projection'] as Map)['state'] as Map;
  for (final view in ['front', 'side', 'plan']) {
    (largeState['history'] as Map)[view] = List.generate(
      30,
      (_) => List.generate(
        200,
        (_) => {
          'kind': 'line',
          'a': [11.123456789012345, 12.123456789012345],
          'b': [31.123456789012345, 14.123456789012345],
          'type': 'visible',
        },
      ),
    );
  }
  add('UTF-8 byte limit without trimming history', oversized, false);
  final nonfinite = learningCheckpointFixture();
  ((nonfinite['projection'] as Map)['state'] as Map)['cursor'] = [
    double.nan,
    1,
  ];
  if (LearningCheckpointSchema.isValid(nonfinite)) {
    throw StateError('Non-finite value accepted');
  }
  if (LearningCheckpointSchema.permitsEncoded('[' * 27 + ']' * 27)) {
    throw StateError('Nesting bound lost');
  }
  final atLimit = '"${'a' * (LearningCheckpointSchema.maximumBytes - 2)}"';
  if (!LearningCheckpointSchema.permitsEncoded(atLimit) ||
      LearningCheckpointSchema.permitsEncoded(' $atLimit')) {
    throw StateError('Inclusive UTF-8 size bound lost');
  }
  stdout.writeln(
    jsonEncode({
      'cases': cases,
      'fullUndoBytes': utf8.encode(jsonEncode(fullUndo)).length,
    }),
  );
}
