import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/features/duel/duel_projection.dart';

void main() {
  final fixture = jsonDecode(
    File('test/features/duel/fixtures/source_projection.json')
        .readAsStringSync(),
  ) as Map<String, dynamic>;
  final snapshots = fixture['snapshots'] as Map<String, dynamic>;

  test('wire fixtures identify the exact real projector and content blobs', () {
    expect(fixture['sourceCommit'], '752ce908d16d13acc9cc7510797e8363d182c3f5');
    expect(fixture['sourceBlobs'], {
      'handler.mjs': 'c8b0e4636b6613d9e3d29af491e7bccb1b3ee23f',
      'questions.mjs': '801fa44fbe7b260466de762d52c7ce4bfa61b498',
    });
    expect(
      snapshots.keys.where((name) => name.startsWith('active_')),
      hasLength(15),
    );
  });

  for (final entry in snapshots.entries) {
    test('native DTO accepts real Edge projection: ${entry.key}', () {
      final raw = entry.value as Map<String, dynamic>;
      final state = DuelSnapshot.parse(raw);
      expect(state.room.id, raw['room']['id']);
      expect(state.seq, raw['me']['seq']);
      expect(state.me.score, raw['me']['score']);
      expect(state.reviewPending, raw['me']['reviewPending']);
      if (state.currentQuestion case final question?) {
        expect(question.id, 'duel-${state.me.answered}');
        expect(question.settledShape, isNull);
        for (final language in ['ms', 'en']) {
          expect(
            question.copy[language]!.prompt,
            raw['currentQuestion']['copy'][language]['prompt'],
          );
          expect(question.copy[language]!.hint != null, state.hintUsed);
        }
      }
      for (var index = 0; index < state.answers.length; index++) {
        final answer = state.answers[index];
        expect(
          answer.question.settledShape!.name,
          raw['me']['answers'][index]['shape'],
        );
        expect(answer.question.copy['en']!.hint, isNotNull);
      }
    });
  }

  test('real wrong-R2 review preserves correct R1 and attempted wrong R2', () {
    final state = DuelSnapshot.parse(snapshots['review_wrong_r2']);
    expect(state.review!.failedAt, GeometryCardKind.net);
    expect(state.review!.attempts.solid, GeometryShape.cube);
    expect(state.review!.attempts.net, GeometryShape.cone);
    expect(state.me.score, 0);
  });

  test(
    'real final review remains available after complete and advance clears it',
    () {
      final review = DuelSnapshot.parse(snapshots['complete_final_review']);
      final advanced = DuelSnapshot.parse(snapshots['complete_advanced']);
      expect(review.room.status, DuelRoomStatus.complete);
      expect(review.questionIndex, 9);
      expect(review.review!.question.id, 'B2');
      expect(advanced.reviewPending, isFalse);
      expect(advanced.me.score, review.me.score);
      expect(advanced.me.finishedAt, review.me.finishedAt);
    },
  );
}
