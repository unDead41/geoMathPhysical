import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/design/geomath_theme.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/preferences/preferences_repository.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/sync/presentation/sync_screen.dart';
import 'package:geomath_flutter/features/sync/sync_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  test(
    'outbox bootstrap never resolves missing Auth or premature shared records',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'sync-bootstrap-',
      );
      final result = await AppDependencies.bootstrap(
        features: [syncFeature()],
        databasePath: '${directory.path}/app.sqlite',
        databaseFactory: databaseFactoryFfi,
        preferencesStore: _Preferences(),
        guestStore: _Guest(),
      );
      expect(result.isSuccess, isTrue, reason: result.failureOrNull?.message);
      final app = result.valueOrNull!;
      try {
        final services = app.composition.services;
        final outbox = services.get(SyncServices.outbox);
        expect(identical(outbox.database, app.database), isTrue);
        expect(identical(outbox.sessions, app.sessions), isTrue);
        expect(
          identical(services.get(FoundationExtensions.formativeOutbox), outbox),
          isTrue,
        );
        final writer = services.get(FoundationServices.recordsWriter);
        expect(writer, isA<SyncFormativeRecordWriter>());
        expect(
          identical(
            (writer as SyncFormativeRecordWriter).delegate,
            app.records,
          ),
          isTrue,
        );
        final reflection = _reflection();
        final guest = await writer.saveReflection(
          actor: app.sessions.current,
          reflection: reflection,
        );
        expect(guest.valueOrNull?.state, FormativeSaveState.local);
        app.sessions.bindUser(
          userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          sessionId: 'fixture-session',
        );
        final saved = await writer.saveReflection(
          actor: app.sessions.current,
          reflection: reflection,
        );
        expect(saved.valueOrNull?.state, FormativeSaveState.pending);
        expect(
          (await app.records.watchReflections(app.sessions.current).first)
              .valueOrNull,
          [reflection],
        );
        expect(
          (await outbox.read(app.sessions.current)).valueOrNull?.pending,
          1,
        );
        expect(app.composition.migrations.contributions.map((m) => m.id), [
          'sync:1',
        ]);
        expect(
          await app.database.query(
            'SELECT * FROM ${SyncReceiptSchema.soloReceipts}',
          ),
          isEmpty,
        );
      } finally {
        await app.dispose();
        await directory.delete(recursive: true);
      }
    },
  );

  for (final language in AppLanguage.values) {
    for (final dark in [false, true]) {
      testWidgets(
        '${language.name} ${dark ? 'dark' : 'light'} sync UI at 320dp/text150 exposes actual unavailable state',
        (tester) async {
          tester.view.physicalSize = const Size(320, 850);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final directory = (await tester.runAsync(
            () => Directory.systemTemp.createTemp('sync-widget-'),
          ))!;
          final app = (await tester.runAsync(
            () => AppDependencies.bootstrap(
              features: [syncFeature()],
              databasePath: '${directory.path}/app.sqlite',
              databaseFactory: databaseFactoryFfi,
              preferencesStore: _Preferences(),
              guestStore: _Guest(),
            ),
          ))!.valueOrNull!;
          final services = app.composition.services;
          app.sessions.bindUser(
            userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            sessionId: 'fixture-session',
          );
          await tester.runAsync(
            () => services
                .get(FoundationServices.recordsWriter)
                .saveReflection(
                  actor: app.sessions.current,
                  reflection: _reflection(),
                ),
          );
          final controller = FormativeSyncController(
            outbox: services.get(SyncServices.outbox),
            gateway: _Unavailable(app.sessions),
            sessions: app.sessions,
            writer: services.get(SyncServices.writer),
            autoStart: false,
          );
          await tester.runAsync(controller.wake);
          final contributions = {
            for (final locale in syncTranslations.entries)
              locale.key: {
                for (final entry in locale.value.entries)
                  'sync.${entry.key}': entry.value,
              },
          };
          await tester.pumpWidget(
            MaterialApp(
              theme: dark ? GeoMathTheme.dark() : GeoMathTheme.light(),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context)
                    .copyWith(textScaler: const TextScaler.linear(1.5)),
                child: child!,
              ),
              home: AppStringsScope(
                strings: AppStrings(language, contributions: contributions),
                child: SyncScreen(controller: controller),
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(
            find.byKey(const ValueKey('sync.status.unavailable')),
            findsOneWidget,
          );
          expect(
            find.text(
              language == AppLanguage.en
                  ? '1 records awaiting delivery'
                  : '1 rekod menunggu penghantaran',
            ),
            findsOneWidget,
          );
          expect(tester.takeException(), isNull);
          await tester.pumpWidget(const SizedBox());
          controller.dispose();
          await tester.runAsync(app.dispose);
          await tester.runAsync(() => directory.delete(recursive: true));
        },
      );
    }
  }
}

ModuleReflection _reflection() => ModuleReflection.create(
  activity: ModuleActivity.net,
  stage: ReflectionStage.prediction,
  prediction: 'Six faces',
).valueOrNull!;

final class _Preferences implements PreferencesStore {
  String? value;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String value) async {
    this.value = value;
  }
}

final class _Guest implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('test-installation');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}

/// Explicit unavailable fixture; it performs no HTTP or simulated sign-in.
final class _Unavailable implements CloudGateway {
  _Unavailable(this.sessions);
  @override
  final AuthSession sessions;
  @override
  bool get configured => false;
  @override
  Future<Result<CloudReply>> rpc({
    required String name,
    required Map<String, Object?> parameters,
    required ActorBinding actor,
  }) async => const Failed(
    AppFailure(
      code: FailureCode.unavailable,
      message: 'Test fixture has no backend.',
    ),
  );
}
