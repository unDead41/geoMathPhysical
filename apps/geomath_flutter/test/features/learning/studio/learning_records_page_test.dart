import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/geomath_theme.dart';
import 'package:geomath_flutter/core/features/feature_localizations.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_reflection_controller.dart';
import 'package:geomath_flutter/features/learning/studio/learning_records_page.dart';
import 'package:geomath_flutter/features/learning/studio/studio_strings.dart';

void main() {
  late SessionController sessions;
  late _Ports ports;
  late LearningReflectionController controller;
  setUp(() {
    sessions = SessionController.guest(guestId: 'guest', sessionId: 'one');
    ports = _Ports();
    controller = LearningReflectionController(
      reader: ports,
      writer: ports,
      sessions: sessions,
    );
  });
  tearDown(() async {
    controller.dispose();
    await sessions.dispose();
    await ports.close();
  });

  testWidgets(
    'EX11 keeps unsaved reflection, exposes Retry and waits for the durable receipt',
    (tester) async {
      final first = Completer<Result<DurableRecordReceipt>>();
      final retry = Completer<Result<DurableRecordReceipt>>();
      ports.save = (_, _) => ports.attempts == 1 ? first.future : retry.future;
      await tester.pumpWidget(_app(controller));
      await tester.pumpAndSettle();
      final record = _reflection();
      final pending = controller.save(record);
      await tester.pump();
      expect(find.text('Saving reflection…'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('learning-records-receipt')),
        findsNothing,
      );
      first.complete(
        const Failed(
          AppFailure(code: FailureCode.storage, message: 'Denied fixture'),
        ),
      );
      await pending;
      await tester.pumpAndSettle();
      final failure = find.byKey(
        const ValueKey('learning-records-save-failure'),
      );
      expect(failure, findsOneWidget);
      expect(find.text('Reflection has not been saved'), findsOneWidget);
      expect(controller.failedReflections, [record]);
      await tester.tap(
        find.descendant(of: failure, matching: find.text('Retry')),
      );
      await tester.pump();
      expect(ports.attempts, 2);
      expect(
        find.byKey(const ValueKey('learning-records-receipt')),
        findsNothing,
      );
      retry.complete(
        Success(
          DurableRecordReceipt(
            actor: sessions.current,
            recordId: record.activity.name,
            persistedAt: DateTime.utc(2026, 11, 5),
            state: FormativeSaveState.local,
          ),
        ),
      );
      ports.emit(sessions.current, Success([record]));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('learning-records-save-failure')),
        findsNothing,
      );
      expect(find.text('Last save: saved on this device.'), findsOneWidget);
      expect(find.text('1/4 activities complete'), findsOneWidget);
    },
  );

  testWidgets(
    'four real records stay literal through locale/text changes and disappear on actor switch',
    (tester) async {
      tester.view.physicalSize = const Size(320, 1100);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(_app(controller));
      await tester.pumpAndSettle();
      final record = _reflection(
        explanation: '<img src=x onerror=alert(1)> & learner text',
      );
      ports.emit(sessions.current, Success([record]));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('learning-record-net')));
      await tester.pumpAndSettle();
      expect(find.text(record.explanation), findsOneWidget);
      expect(
        find.byKey(const ValueKey('learning-record-volume')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('learning-record-area')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('learning-record-composite')),
        findsOneWidget,
      );
      await tester.pumpWidget(
        _app(controller, language: AppLanguage.ms, textScale: 1.5),
      );
      await tester.pumpAndSettle();
      expect(find.text('1/4 aktiviti selesai'), findsOneWidget);
      expect(find.text(record.explanation), findsOneWidget);
      expect(tester.takeException(), isNull);
      sessions.bindUser(userId: 'B', sessionId: 'b');
      await tester.pumpAndSettle();
      expect(find.text(record.explanation), findsNothing);
      expect(find.text('0/4 aktiviti selesai'), findsOneWidget);
    },
  );

  testWidgets(
    'a shared reader failure offers retry without changing earned records',
    (tester) async {
      await tester.pumpWidget(_app(controller));
      await tester.pumpAndSettle();
      ports.emit(sessions.current, Success([_reflection()]));
      ports.emit(
        sessions.current,
        const Failed(
          AppFailure(code: FailureCode.storage, message: 'Read fixture'),
        ),
      );
      await tester.pumpAndSettle();
      final failure = find.byKey(
        const ValueKey('learning-records-read-failure'),
      );
      expect(failure, findsOneWidget);
      expect(find.text('1/4 activities complete'), findsOneWidget);
      final reads = ports.reads;
      await tester.tap(
        find.descendant(of: failure, matching: find.text('Retry')),
      );
      await tester.pumpAndSettle();
      expect(ports.reads, reads + 1);
      expect(
        find.byKey(const ValueKey('learning-records-read-failure')),
        findsNothing,
      );
    },
  );
}

Widget _app(
  LearningReflectionController controller, {
  AppLanguage language = AppLanguage.en,
  double textScale = 1,
}) => AppStringsScope(
  strings: AppStrings(
    language,
    contributions: FeatureLocalizationRegistry([learningStudioStrings])
        .translations,
  ),
  child: MaterialApp(
    theme: GeoMathTheme.light(),
    builder: (context, child) => MediaQuery(
      data: MediaQuery.of(context)
          .copyWith(textScaler: TextScaler.linear(textScale)),
      child: child!,
    ),
    home: LearningRecordsPage(controller: controller, onOpenActivity: (_) {}),
  ),
);

ModuleReflection _reflection({
  String explanation = 'Six distinct faces close without overlap.',
}) => ModuleReflection.create(
  activity: ModuleActivity.net,
  stage: ReflectionStage.explanation,
  prediction: 'It will close.',
  result: 'It closed.',
  explanation: explanation,
  completed: true,
).valueOrNull!;

class _Ports implements FormativeRecordReader, FormativeRecordWriter {
  int attempts = 0;
  int reads = 0;
  Future<Result<DurableRecordReceipt>> Function(ActorBinding, ModuleReflection)?
  save;
  final Map<ActorBinding, List<ModuleReflection>> values = {};
  final Map<ActorBinding, StreamController<Result<List<ModuleReflection>>>>
  streams = {};
  StreamController<Result<List<ModuleReflection>>> _stream(
    ActorBinding actor,
  ) => streams.putIfAbsent(actor, () => StreamController.broadcast(sync: true));
  void emit(ActorBinding actor, Result<List<ModuleReflection>> result) {
    if (result case Success<List<ModuleReflection>>(:final value)) {
      values[actor] = value;
    }
    _stream(actor).add(result);
  }

  Future<void> close() async {
    for (final stream in streams.values) {
      await stream.close();
    }
  }

  @override
  Stream<Result<List<ModuleReflection>>> watchReflections(
    ActorBinding actor,
  ) async* {
    reads++;
    yield Success(values[actor] ?? []);
    yield* _stream(actor).stream;
  }

  @override
  Future<Result<List<CompletedSoloRecord>>> readCompletedSolo(
    ActorBinding actor,
  ) async => const Success([]);
  @override
  Future<Result<DurableRecordReceipt>> saveReflection({
    required ActorBinding actor,
    required ModuleReflection reflection,
  }) async {
    attempts++;
    return await save?.call(actor, reflection) ??
        const Failed(
          AppFailure(
            code: FailureCode.unavailable,
            message: 'Writer not configured in this fixture.',
          ),
        );
  }

  @override
  Future<Result<DurableRecordReceipt>> saveCompletedSolo({
    required ActorBinding actor,
    required CompletedSoloRecord record,
  }) async =>
      throw UnsupportedError('Learning records never writes solo results.');
}
