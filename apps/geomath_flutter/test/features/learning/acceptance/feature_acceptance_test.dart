import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/features/feature_composition.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/learning/learning_feature.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_reflection_controller.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

// These exercise the installed learning contribution and shared SQLite ports.
// They do not replace or simulate a successful WebView. Real Android coverage is
// in integration_test/learning_acceptance_test.dart.
void main() {
  sqfliteFfiInit();

  test(
    'learning registers all 13 screen paths and complete bilingual maps',
    () {
      final feature = learningFeature();
      final composition = FeatureComposition([feature]);
      addTearDown(composition.dispose);
      expect(feature.id, 'learning');
      expect(feature.routes, hasLength(13));
      const paths = [
        '/learn',
        '/learn/explore',
        '/learn/views',
        '/learn/notes/cube',
        '/learn/calculator/cube',
        '/learn/labs/net',
        '/learn/labs/volume',
        '/learn/labs/area',
        '/learn/labs/composite',
        '/learn/labs',
        '/learn/projection',
        '/learn/calculation',
        '/learn/records',
      ];
      final names = <String>{};
      for (final path in paths) {
        final match = composition.routes.matchPath(path);
        expect(match, isNotNull, reason: 'Missing learning screen: $path');
        names.add(match!.route.name);
      }
      expect(names, hasLength(13));
      for (final contribution in feature.localizations) {
        final ms = contribution.translations['ms'];
        final en = contribution.translations['en'];
        expect(ms, isNotNull, reason: contribution.namespace);
        expect(en, isNotNull, reason: contribution.namespace);
        expect(ms!.keys, unorderedEquals(en!.keys));
        expect(ms.values.every((text) => text.trim().isNotEmpty), isTrue);
        expect(en.values.every((text) => text.trim().isNotEmpty), isTrue);
      }
      expect(
        feature.migrations.any(
          (migration) => migration.namespace == 'foundation_records',
        ),
        isFalse,
        reason: 'The learning feature must consume the shared record schema.',
      );
      expect(
        feature.services.any(
          (factory) => factory.name.startsWith('foundation.'),
        ),
        isFalse,
        reason: 'Learning cannot replace a frozen foundation owner.',
      );
    },
  );

  testWidgets(
    'records read the shared durable DTO and follow the native actor',
    (tester) async {
      _phoneViewport(tester);
      final app = await _bootstrap(tester);
      addTearDown(() => tester.runAsync(app.dispose));
      final actor = app.sessions.current;
      final reflection = _reflection();
      final writer = app.composition.services.get(
        FoundationServices.recordsWriter,
      );
      final saved = await tester.runAsync(
        () => writer.saveReflection(actor: actor, reflection: reflection),
      );
      expect(saved, isA<Success<DurableRecordReceipt>>());
      expect((saved! as Success<DurableRecordReceipt>).value.durable, isTrue);

      await _mountRecords(tester, app);
      await _waitForRecords(tester, app, count: 1);
      await tester.tap(find.byKey(const ValueKey('learning-record-net')));
      await tester.pumpAndSettle();
      expect(find.text(reflection.prediction), findsOneWidget);
      expect(find.text(reflection.explanation), findsOneWidget);

      final controller = app.composition.services.get(
        learningReflectionControllerKey,
      );
      final preferences = await tester.runAsync(
        () => app.preferences.save(
          app.preferences.value.copyWith(
            language: AppLanguage.en,
            theme: AppTheme.dark,
            textScale: 1.5,
            strongContrast: true,
            reducedMotion: true,
          ),
        ),
      );
      expect(preferences, isA<Success<void>>());
      await tester.pumpAndSettle();
      expect(
        identical(
          app.composition.services.get(learningReflectionControllerKey),
          controller,
        ),
        isTrue,
      );
      expect(find.text(reflection.explanation), findsOneWidget);

      app.sessions.bindUser(
        userId: 'qa-owner-b',
        sessionId: 'qa-owner-b-session',
      );
      await _waitForRecords(tester, app, count: 0);
      expect(find.text(reflection.prediction), findsNothing);
      expect(find.text(reflection.explanation), findsNothing);
      expect(controller.actor.partition, 'owner:qa-owner-b');

      app.sessions.logout();
      await _waitForRecords(tester, app, count: 1);
      expect(controller.actor.partition, actor.partition);
      expect(controller.actor.epoch, greaterThan(actor.epoch));
      expect(controller.records.single.toJson(), reflection.toJson());
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );

  testWidgets(
    'EX11 waits for durable acknowledgement and retries the same draft',
    (tester) async {
      _phoneViewport(tester);
      final writer = _DelayedFailingWriter();
      final app = await _bootstrap(tester, writer: writer);
      writer.delegate = app.records;
      addTearDown(() => tester.runAsync(app.dispose));
      await _mountRecords(tester, app);
      await _waitForRecords(tester, app, count: 0);
      final controller = app.composition.services.get(
        learningReflectionControllerKey,
      );
      final reflection = _reflection();
      final saving = controller.save(reflection);
      await tester.runAsync(() => writer.started.future);
      await tester.pump();
      expect(controller.saving, isTrue);
      expect(controller.lastReceipt, isNull);
      expect(
        find.byKey(const ValueKey('learning-records-receipt')),
        findsNothing,
      );

      writer.rejectFirst();
      expect(
        await tester.runAsync(() => saving),
        isA<Failed<DurableRecordReceipt>>(),
      );
      await tester.pumpAndSettle();
      final failure = find.byKey(
        const ValueKey('learning-records-save-failure'),
      );
      expect(failure, findsOneWidget);
      expect(controller.failedReflections.single.toJson(), reflection.toJson());
      expect(controller.records, isEmpty);
      expect(controller.lastReceipt, isNull);

      final retry = find.descendant(
        of: failure,
        matching: find.byType(ActionButton),
      );
      expect(retry, findsOneWidget);
      await tester.ensureVisible(retry);
      await tester.tap(retry);
      await _waitForRecords(tester, app, count: 1);
      expect(writer.attempts, 2);
      expect(controller.failedReflections, isEmpty);
      expect(controller.lastReceipt?.durable, isTrue);
      expect(controller.lastReceipt?.actor, app.sessions.current);
      expect(
        find.byKey(const ValueKey('learning-records-save-failure')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('learning-records-receipt')),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}

void _phoneViewport(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}

Future<AppDependencies> _bootstrap(
  WidgetTester tester, {
  FormativeRecordWriter? writer,
}) async {
  final opened = await tester.runAsync(
    () => AppDependencies.bootstrap(
      features: [
        learningFeature(),
        if (writer != null)
          FeatureContribution(
            id: 'learning_acceptance_writer',
            services: [
              ServiceFactory<FormativeRecordWriter>(
                key: FoundationExtensions.recordsWriter,
                createService: (_) => writer,
              ),
            ],
          ),
      ],
      databasePath: inMemoryDatabasePath,
      databaseFactory: databaseFactoryFfi,
      preferencesStore: _AcknowledgedPreferencesStore(),
      guestStore: _StableGuestStore(),
    ),
  );
  expect(opened, isA<Success<AppDependencies>>());
  return (opened! as Success<AppDependencies>).value;
}

Future<void> _mountRecords(WidgetTester tester, AppDependencies app) async {
  final route = app.composition.routes.matchPath('/learn/records')!.route;
  await tester.pumpWidget(
    GeoMathApp(dependencies: app, initialRoute: route.name),
  );
  await tester.pump();
  expect(find.byKey(const ValueKey('learning-records-scope')), findsOneWidget);
}

Future<void> _waitForRecords(
  WidgetTester tester,
  AppDependencies app, {
  required int count,
}) async {
  final controller = app.composition.services.get(
    learningReflectionControllerKey,
  );
  final deadline = DateTime.now().add(const Duration(seconds: 5));
  while (controller.loading || controller.records.length != count) {
    if (DateTime.now().isAfter(deadline)) {
      fail(
        'Shared record reader did not produce $count records: ${controller.readFailure?.code}',
      );
    }
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 20)),
    );
    await tester.pump();
  }
  await tester.pumpAndSettle();
  expect(controller.readFailure, isNull);
}

ModuleReflection _reflection() => (ModuleReflection.create(
  activity: ModuleActivity.net,
  stage: ReflectionStage.explanation,
  prediction: 'QA prediction <angle> remains literal.',
  result: 'Six physical faces meet without overlap.',
  explanation: 'Every original face closes one side of the cube.',
  completed: true,
) as Success<ModuleReflection>).value;

final class _AcknowledgedPreferencesStore implements PreferencesStore {
  String? _value;
  @override
  Future<String?> read() async => _value;
  @override
  Future<void> write(String value) async => _value = value;
}

final class _StableGuestStore implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async =>
      const Success('learning-acceptance-guest');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}

/// Only the first persistence acknowledgement is faulted. Retrying delegates to
/// the actual shared SQLite writer and is observed by its actual shared reader.
final class _DelayedFailingWriter implements FormativeRecordWriter {
  late FormativeRecordWriter delegate;
  final started = Completer<void>();
  final _first = Completer<Result<DurableRecordReceipt>>();
  int attempts = 0;

  void rejectFirst() => _first.complete(
    const Failed(
      AppFailure(
        code: FailureCode.storage,
        message: 'Injected EX11 storage failure.',
      ),
    ),
  );

  @override
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  }) {
    attempts++;
    if (attempts == 1) {
      started.complete();
      return _first.future;
    }
    return delegate.saveReflection(actor: actor, reflection: reflection);
  }

  @override
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) => delegate.saveCompletedSolo(actor: actor, record: record);
}
