import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/dev/cloud_game_features.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

// Android-only real-plugin target. Uses the production preview contribution set
// and root, isolated SQLite path, real installation/preferences stores and a
// labeled deterministic test clock. No live Auth/provider/RPC request is sent.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'real cloud/game preview reopens solo and rolls back an outbox failure',
    (tester) async {
      expect(defaultTargetPlatform, TargetPlatform.android);
      final cache = await getTemporaryDirectory();
      final directory = await Directory(
        '${cache.path}/cloud-game-qa-${DateTime.now().microsecondsSinceEpoch}',
      ).create();
      final path = '${directory.path}/preview.sqlite';
      final clock = _IntegrationClock();
      var app = await _open(path, clock);
      final originalPreferences = app.preferences.value;
      try {
        expect(
          app.publicBackend.connection().isSuccess,
          isFalse,
          reason: 'This offline integration target must be built without cloud defines.',
        );
        expect(app.sessions.current.isGuest, isTrue);
        final guestPartition = app.sessions.current.partition;
        await app.preferences.save(
          originalPreferences.copyWith(
            language: AppLanguage.en,
            theme: AppTheme.dark,
            textScale: 1.5,
            reducedMotion: true,
            musicEnabled: false,
            soundEnabled: false,
          ),
        );
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
        );
        await _until(
          tester,
          () => find.byKey(const ValueKey('solo-name')).evaluate().isNotEmpty,
        );
        await tester.enterText(
          find.descendant(
            of: find.byKey(const ValueKey('solo-name')),
            matching: find.byType(TextFormField),
          ),
          'QA Android guest',
        );
        var controller = app.composition.services.get(SoloServices.controller);
        await _until(
          tester,
          () => controller.bank != null && !controller.loading,
        );
        await _tap(tester, 'solo-start');
        await _until(tester, () => controller.game != null);
        final attempt = controller.attemptId;
        final correct = controller.game!.question.shape;
        await _tap(tester, 'solo-choice-solid-${correct.name}');
        await _tap(tester, 'solo-r1');
        expect(controller.game!.stage, GeometryCardKind.net);
        expect(await controller.checkpoint(), isTrue);
        app.lifecycle.setPhase(AppLifecyclePhase.background);
        final elapsed = controller.game!.time(controller.now);
        clock.advance(const Duration(minutes: 10));
        expect(controller.game!.time(controller.now), elapsed);
        expect(await controller.checkpoint(), isTrue);
        await tester.pumpWidget(const SizedBox.shrink());
        await app.dispose();

        clock.milliseconds = 0;
        app = await _open(path, clock);
        expect(app.sessions.current.partition, guestPartition);
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
        );
        await _until(
          tester,
          () => find.byKey(const ValueKey('solo-resume')).evaluate().isNotEmpty,
        );
        await _tap(tester, 'solo-resume');
        await _until(
          tester,
          () => find
              .byKey(const ValueKey('solo-resume-continue'))
              .evaluate()
              .isNotEmpty,
        );
        await _tap(tester, 'solo-resume-continue');
        controller = app.composition.services.get(SoloServices.controller);
        expect(controller.attemptId, attempt);
        expect(controller.game!.stage, GeometryCardKind.net);
        expect(controller.game!.time(controller.now), elapsed);
        expect(
          await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
          isEmpty,
        );

        // Deliberate test identity only; this does not claim hosted Auth or role.
        const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        app.sessions.bindUser(userId: ownerA, sessionId: 'qa-android-a');
        final actorA = app.sessions.current;
        final writer = app.composition.services.get(
          FoundationServices.recordsWriter,
        );
        final record = CompletedSoloRecord.fromJson({
          'attempt_id': 'qa:android:atomic',
          'mode': 'quiz',
          'ruleset': 'single-attempt-v1',
          'score': 7,
          'total': 10,
          'mistakes': 2,
          'hints': 1,
          'skipped': 1,
          'elapsed_ms': 1250,
        }).valueOrNull!;
        await app.database.transaction(
          (transaction) => transaction.execute(
            'CREATE TRIGGER qa_android_reject_append BEFORE INSERT ON ${FormativeSchema.outbox} '
            "BEGIN SELECT RAISE(ABORT, 'QA injected outbox failure'); END",
          ),
        );
        final failure = await writer.saveCompletedSolo(
          actor: actorA,
          record: record,
        );
        expect(failure.failureOrNull?.code, FailureCode.storage);
        expect(failure.valueOrNull, isNull);
        expect(
          await app.database.query(
            'SELECT * FROM ${FormativeSchema.completedSolo}',
          ),
          isEmpty,
        );
        expect(
          await app.database.query('SELECT * FROM ${FormativeSchema.outbox}'),
          isEmpty,
        );
        await app.database.transaction(
          (transaction) =>
              transaction.execute('DROP TRIGGER qa_android_reject_append'),
        );
        final saved = await writer.saveCompletedSolo(
          actor: actorA,
          record: record,
        );
        expect(saved.valueOrNull?.durable, isTrue);
        expect(saved.valueOrNull?.state, FormativeSaveState.pending);
        app.sessions.bindUser(userId: ownerB, sessionId: 'qa-android-b');
        final reader = app.composition.services.get(
          FoundationServices.recordsReader,
        );
        expect(
          (await reader.readCompletedSolo(app.sessions.current)).valueOrNull,
          isEmpty,
        );
        expect(
          (await reader.readCompletedSolo(actorA)).failureOrNull?.code,
          FailureCode.stale,
        );
        final queued = await app.database.query(
          'SELECT partition, owner_id FROM ${FormativeSchema.outbox}',
        );
        expect(queued, [
          {'partition': actorA.partition, 'owner_id': ownerA},
        ]);
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        await app.preferences.save(originalPreferences);
        await app.dispose();
        await directory.delete(recursive: true);
      }
    },
  );
}

Future<AppDependencies> _open(String path, Clock clock) async {
  final result = await AppDependencies.bootstrap(
    features: cloudGameFeatures(),
    databasePath: path,
    clock: clock,
  );
  expect(result.isSuccess, isTrue, reason: result.failureOrNull?.message);
  return result.valueOrNull!;
}

Future<void> _tap(WidgetTester tester, String key) async {
  final finder = find.byKey(ValueKey(key));
  await _until(tester, () => finder.evaluate().isNotEmpty);
  await tester.ensureVisible(finder);
  await tester.pump(const Duration(milliseconds: 250));
  await tester.tap(finder);
  await tester.pump();
}

Future<void> _until(WidgetTester tester, bool Function() condition) async {
  final deadline = DateTime.now().add(const Duration(seconds: 30));
  while (!condition()) {
    if (DateTime.now().isAfter(deadline)) {
      fail('Real cloud/game preview did not reach the expected state.');
    }
    await tester.pump(const Duration(milliseconds: 100));
    await Future<void>.delayed(const Duration(milliseconds: 20));
  }
  await tester.pump();
}

final class _IntegrationClock implements Clock {
  int milliseconds = 0;
  void advance(Duration duration) => milliseconds += duration.inMilliseconds;
  @override
  int monotonicMilliseconds() => milliseconds;
  @override
  DateTime now() =>
      DateTime.utc(2026, 11, 5).add(Duration(milliseconds: milliseconds));
}
