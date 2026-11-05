import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/geomath_theme.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/local_formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/storage/sqlite_app_database.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/sync/presentation/sync_screen.dart';
import 'package:geomath_flutter/features/sync/sync_feature.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

/// Android SQLite/plugin smoke. The labelled RPC fixture never contacts hosted Auth.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'native sync uses durable shared SQLite and acknowledged pending UI',
    (tester) async {
      final fixture = (await tester.runAsync(_Fixture.open))!;
      try {
        final actor = fixture.sessions.current;
        final saved = await tester.runAsync(
          () => fixture.writer.saveReflection(
            actor: actor,
            reflection: _reflection(),
          ),
        );
        expect(saved!.valueOrNull?.durable, isTrue);
        expect(
          (await tester.runAsync(() => fixture.outbox.read(actor)))!
              .valueOrNull
              ?.pending,
          1,
        );
        final path = fixture.path;
        fixture.writer.dispose();
        await tester.runAsync(fixture.db.close);
        fixture.db = (await tester.runAsync(
          () async => (await SqliteAppDatabase.open(
            path: path,
            migrations: [SyncReceiptSchema.migration],
          )).valueOrNull!,
        ))!;
        fixture.attach();
        expect(
          (await tester.runAsync(
            () => fixture.shared.watchReflections(actor).first,
          ))!.valueOrNull,
          [_reflection()],
        );
        final sync = fixture.controller();
        await tester.runAsync(sync.wake);
        await tester.pumpWidget(_page(sync));
        await tester.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('sync.status.synced')),
          findsOneWidget,
        );
        expect(
          (await tester.runAsync(() => fixture.outbox.read(actor)))!
              .valueOrNull
              ?.pending,
          0,
        );
        expect(fixture.gateway.deliveries, 1);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        sync.dispose();
      } finally {
        await tester.runAsync(fixture.close);
      }
    },
  );

  testWidgets(
    'native SQLite failure has no durable receipt and EX11 recovers explicitly',
    (tester) async {
      final fixture = (await tester.runAsync(_Fixture.open))!;
      try {
        await tester.runAsync(
          () => fixture.db.transaction(
            (tx) => tx.execute(
              'CREATE TRIGGER sync_deny BEFORE INSERT ON formative_outbox '
              "BEGIN SELECT RAISE(ABORT, 'test failure'); END",
            ),
          ),
        );
        final saved = await tester.runAsync(
          () => fixture.writer.saveReflection(
            actor: fixture.sessions.current,
            reflection: _reflection(),
          ),
        );
        expect(saved!.failureOrNull?.code, FailureCode.storage);
        final sync = fixture.controller();
        await tester.runAsync(sync.wake);
        await tester.pumpWidget(_page(sync));
        await tester.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('sync.status.storageFailed')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('sync.unsaved')), findsOneWidget);
        expect(fixture.gateway.deliveries, 0);
        await tester.runAsync(
          () => fixture.db.transaction(
            (tx) => tx.execute('DROP TRIGGER sync_deny'),
          ),
        );
        await tester.runAsync(() => sync.wake(userInitiated: true));
        await tester.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('sync.status.synced')),
          findsOneWidget,
        );
        expect(fixture.writer.unsaved(fixture.sessions.current), 0);
        expect(fixture.gateway.deliveries, 1);
        await tester.pumpWidget(const SizedBox());
        sync.dispose();
      } finally {
        await tester.runAsync(fixture.close);
      }
    },
  );
}

Widget _page(FormativeSyncController controller) => MaterialApp(
  theme: GeoMathTheme.light(),
  home: AppStringsScope(
    strings: AppStrings(
      AppLanguage.en,
      contributions: {
        for (final locale in syncTranslations.entries)
          locale.key: {
            for (final entry in locale.value.entries)
              'sync.${entry.key}': entry.value,
          },
      },
    ),
    child: SyncScreen(controller: controller),
  ),
);
ModuleReflection _reflection() => ModuleReflection.create(
  activity: ModuleActivity.net,
  stage: ReflectionStage.prediction,
  prediction: 'Six faces',
).valueOrNull!;

final class _Fixture {
  _Fixture(this.directory, this.db, this.sessions) {
    gateway = _AckGateway(sessions);
    attach();
  }
  final Directory directory;
  String get path => '${directory.path}/sync.sqlite';
  SqliteAppDatabase db;
  final SessionController sessions;
  late _AckGateway gateway;
  late LocalFormativeRecords shared;
  late SqliteFormativeOutbox outbox;
  late SyncFormativeRecordWriter writer;
  final controllers = <FormativeSyncController>[];
  static Future<_Fixture> open() async {
    final root = await getTemporaryDirectory();
    final directory = await root.createTemp('geomath-sync-smoke-');
    final db = (await SqliteAppDatabase.open(
      path: '${directory.path}/sync.sqlite',
      migrations: [SyncReceiptSchema.migration],
    )).valueOrNull!;
    final sessions = SessionController.guest(
      guestId: 'android-sync-fixture',
      sessionId: 'launch',
    );
    sessions.bindUser(
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sessionId: 'fixture-session',
    );
    return _Fixture(directory, db, sessions);
  }

  void attach() {
    outbox = SqliteFormativeOutbox(database: db, sessions: sessions);
    shared = LocalFormativeRecords(
      database: db,
      sessions: sessions,
      outbox: outbox,
    );
    writer = SyncFormativeRecordWriter(
      delegate: shared,
      sessions: sessions,
      outbox: outbox,
    );
  }

  FormativeSyncController controller() {
    final value = FormativeSyncController(
      outbox: outbox,
      writer: writer,
      gateway: gateway,
      sessions: sessions,
      autoStart: false,
    );
    controllers.add(value);
    return value;
  }

  Future<void> close() async {
    for (final controller in controllers) {
      controller.dispose();
    }
    writer.dispose();
    await db.close();
    await sessions.dispose();
    await directory.delete(recursive: true);
  }
}

/// Explicit test transport: validates the real request envelope, then acknowledges IDs.
final class _AckGateway implements CloudGateway {
  _AckGateway(this.sessions);
  @override
  final AuthSession sessions;
  @override
  bool get configured => true;
  int deliveries = 0;
  @override
  Future<Result<CloudReply>> rpc({
    required String name,
    required Map<String, Object?> parameters,
    required ActorBinding actor,
  }) async {
    expect(name, 'geo_offline_sync');
    expect(parameters['action'], 'push');
    expect(sessions.isCurrent(actor), isTrue);
    deliveries++;
    final events = (parameters['payload']! as Map)['events']! as List;
    expect(events.length, lessThanOrEqualTo(20));
    for (final event in events) {
      expect((event as Map).containsKey('owner'), isFalse);
    }
    return Success(
      CloudReply(
        data: {
          'accepted': events.map((e) => (e as Map)['id']).toList(),
          'records': <Object?>[],
        },
      ),
    );
  }
}
