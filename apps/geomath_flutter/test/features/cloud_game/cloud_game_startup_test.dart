import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/session_store.dart';
import 'package:geomath_flutter/core/storage/formative_schema.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/dev/cloud_game_features.dart';
import 'package:geomath_flutter/features/auth/auth_services.dart';
import 'package:geomath_flutter/features/auth/data/auth_repository.dart';
import 'package:geomath_flutter/features/auth/data/auth_transport.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_repository.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:geomath_flutter/features/sync/sync_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'cloud_game_widgets_test.dart' show settleCloudGameIo;
import 'support/cloud_game_test_support.dart';

void main() {
  sqfliteFfiInit();
  setUp(rootBundle.clear);

  testWidgets(
    'all feature routes await one real auth restore across presentation changes',
    (tester) async {
      final fixture = _StartupFixture();
      final app = (await tester.runAsync(
        () => bootstrapCloudGameForTest(features: fixture.features()),
      ))!;
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
        );
        await _untilRead(tester, fixture.store);
        expect(
          find.byKey(const ValueKey('cloud-game-startup-loading')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('solo-name')), findsNothing);
        await tester.runAsync(
          () => app.preferences.save(
            app.preferences.value.copyWith(
              language: AppLanguage.en,
              theme: AppTheme.dark,
              textScale: 1.5,
            ),
          ),
        );
        await tester.pump();
        final router =
            tester.widget<MaterialApp>(find.byType(MaterialApp)).routerDelegate!
                as GeoMathRouter;
        router.open('cloud-game-login');
        await tester.pump();
        expect(find.byKey(const ValueKey('auth-login-submit')), findsNothing);
        router.navigation.reset('cloud-game-play');
        await tester.pump();
        expect(fixture.store.reads, 1);
        expect(fixture.syncCreations, 0);
        fixture.store.firstRead.complete(const Success(null));
        await settleCloudGameIo(tester);
        expect(find.byKey(const ValueKey('solo-name')), findsOneWidget);
        expect(fixture.store.reads, 1);
        expect(fixture.syncCreations, 1);
        expect(fixture.transport.requests, 0);
        expect(fixture.store.writes, 0);
        expect(fixture.store.clears, 0);
        final startup = app.composition.services.get(
          CloudGamePreviewServices.startup,
        );
        expect((await startup.ready).isSuccess, isTrue);
        expect((await startup.ready).isSuccess, isTrue);
        expect(fixture.syncCreations, 1);
        expect(app.sessions.current.isGuest, isTrue);
        expect(tester.takeException(), isNull);
      } finally {
        if (!fixture.store.firstRead.isCompleted) {
          fixture.store.firstRead.complete(const Success(null));
        }
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
      }
    },
  );

  testWidgets(
    'real protected-store failure shows retry and cannot expose a false initialized route',
    (tester) async {
      final fixture = _StartupFixture();
      final app = (await tester.runAsync(
        () => bootstrapCloudGameForTest(features: fixture.features()),
      ))!;
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-profile'),
        );
        await _untilRead(tester, fixture.store);
        fixture.store.firstRead.complete(
          const Failed(
            AppFailure(
              code: FailureCode.storage,
              message: 'QA protected read denied',
            ),
          ),
        );
        await settleCloudGameIo(tester);
        expect(
          find.byKey(const ValueKey('cloud-game-startup-failed')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('profile-save')), findsNothing);
        expect(fixture.syncCreations, 0);
        final retry = find.descendant(
          of: find.byKey(const ValueKey('cloud-game-startup-failed')),
          matching: find.byType(ActionButton),
        );
        await tester.tap(retry);
        await settleCloudGameIo(tester);
        expect(
          find.byKey(const ValueKey('cloud-game-startup-failed')),
          findsNothing,
        );
        expect(fixture.store.reads, 2);
        expect(fixture.syncCreations, 1);
        expect(fixture.transport.requests, 0);
        expect(fixture.store.clears, 0);
        expect(app.sessions.current.isGuest, isTrue);
        expect(tester.takeException(), isNull);
      } finally {
        if (!fixture.store.firstRead.isCompleted) {
          fixture.store.firstRead.complete(const Success(null));
        }
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
      }
    },
  );

  for (final response in const [
    AuthResponse(502, {}),
    AuthResponse(429, {}, retryAfter: '45'),
    AuthResponse(503, {}),
  ]) {
    for (final language in AppLanguage.values) {
      testWidgets(
        'saved account HTTP ${response.statusCode} leaves ${language.name} guest Solo reachable without moving owner records',
        (tester) async {
          tester.view.physicalSize = const Size(320, 1000);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final fixture = _StartupFixture();
          final protected = jsonEncode({
            'version': 1,
            'session': _wireSession(cloudGameOwnerA),
          });
          fixture.store.value = protected;
          fixture.store.firstRead.complete(Success(protected));
          fixture.transport.reply = (_) => response;
          final app = (await tester.runAsync(
            () => bootstrapCloudGameForTest(features: fixture.features()),
          ))!;
          try {
            final writer = app.composition.services.get(
              FoundationServices.recordsWriter,
            );
            // Explicit test identity seeds an older owner's real pending queue;
            // this does not establish Auth or grant server permission.
            app.sessions.bindUser(
              userId: cloudGameOwnerA,
              sessionId: 'qa-old-a',
            );
            expect(
              (await tester.runAsync(
                () => writer.saveCompletedSolo(
                  actor: app.sessions.current,
                  record: completedSoloFixture('qa:before-offline'),
                ),
              ))!.isSuccess,
              isTrue,
            );
            app.sessions.logout();
            final guest = app.sessions.current;
            await tester.runAsync(
              () => app.preferences.save(
                app.preferences.value.copyWith(
                  language: language,
                  theme: AppTheme.dark,
                  textScale: 1.5,
                  reducedMotion: true,
                ),
              ),
            );
            await tester.pumpWidget(
              GeoMathApp(dependencies: app, initialRoute: 'cloud-game-play'),
            );
            await settleCloudGameIo(tester);
            expect(find.byKey(const ValueKey('solo-name')), findsOneWidget);
            expect(
              find.byKey(const ValueKey('cloud-game-startup-failed')),
              findsNothing,
            );
            expect(
              find.byKey(const ValueKey('cloud-game-startup-notice')),
              findsOneWidget,
            );
            expect(app.sessions.current, guest);
            expect(
              app.composition.services.get(AuthServices.repository).identity,
              isNull,
            );
            if (response.statusCode == 429) {
              expect(find.byType(SnackBarAction), findsNothing);
            } else {
              expect(find.byType(SnackBarAction), findsOneWidget);
            }
            if (response.statusCode == 502 && language == AppLanguage.en) {
              await tester.tap(find.byType(SnackBarAction));
              await settleCloudGameIo(tester);
              expect(fixture.store.reads, 2);
              expect(fixture.syncCreations, 1);
              expect(find.byKey(const ValueKey('solo-name')), findsOneWidget);
            }
            final router =
                tester
                        .widget<MaterialApp>(find.byType(MaterialApp))
                        .routerDelegate!
                    as GeoMathRouter;
            router.open('cloud-game-login');
            await settleCloudGameIo(tester);
            expect(
              tester
                  .widget<ActionButton>(
                    find.byKey(const ValueKey('auth-login-submit')),
                  )
                  .onPressed,
              isNotNull,
            );
            router.back();
            await settleCloudGameIo(tester);
            await tester.enterText(
              find.descendant(
                of: find.byKey(const ValueKey('solo-name')),
                matching: find.byType(TextFormField),
              ),
              'Offline guest',
            );
            await tester.ensureVisible(
              find.byKey(const ValueKey('solo-start')),
            );
            await tester.tap(find.byKey(const ValueKey('solo-start')));
            await settleCloudGameIo(tester);
            final solo = app.composition.services.get(SoloServices.controller);
            expect(solo.game, isNotNull);
            expect(solo.actor, guest);
            expect(solo.repository.writer, same(writer));
            expect(
              (await tester.runAsync(
                () => writer.saveCompletedSolo(
                  actor: guest,
                  record: completedSoloFixture('qa:offline-guest'),
                ),
              ))!.valueOrNull?.state,
              FormativeSaveState.local,
            );
            expect(
              await tester.runAsync(
                () => app.database.query(
                  'SELECT partition, owner_id FROM ${FormativeSchema.outbox}',
                ),
              ),
              [
                {
                  'partition': 'owner:$cloudGameOwnerA',
                  'owner_id': cloudGameOwnerA,
                },
              ],
            );
            expect(fixture.syncCreations, 1);
            expect(fixture.transport.requests, fixture.store.reads);
            expect(fixture.store.value, protected);
            expect(fixture.store.writes, 0);
            expect(fixture.store.clears, 0);
            expect(tester.takeException(), isNull);
          } finally {
            await tester.pumpWidget(const SizedBox.shrink());
            await tester.runAsync(app.dispose);
          }
        },
      );
    }
  }

  test('guest restore retry cannot adopt an old response after a newer verified login', () async {
    final fixture = _StartupFixture();
    fixture.store.value = jsonEncode({
      'version': 1,
      'session': _wireSession(cloudGameOwnerA),
    });
    fixture.store.firstRead.complete(Success(fixture.store.value));
    fixture.transport.reply = (_) => const AuthResponse(502, {});
    final app = await bootstrapCloudGameForTest(features: fixture.features());
    addTearDown(app.dispose);
    final startup = app.composition.services.get(
      CloudGamePreviewServices.startup,
    );
    expect((await startup.ready).isSuccess, isTrue);
    expect(app.sessions.current.isGuest, isTrue);
    final retryStarted = Completer<void>();
    final oldReply = Completer<AuthResponse>();
    fixture.transport.reply = (request) {
      if (request.uri.queryParameters['grant_type'] == 'refresh_token') {
        retryStarted.complete();
        return oldReply.future;
      }
      if (request.uri.path.endsWith('/user')) {
        return const AuthResponse(200, {
          'id': cloudGameOwnerB,
          'email': 'qa-b@example.com',
          'app_metadata': {
            'providers': ['email'],
          },
        });
      }
      return AuthResponse(200, {'session': _wireSession(cloudGameOwnerB)});
    };
    final retry = startup.retry();
    await retryStarted.future;
    final auth = app.composition.services.get(AuthServices.repository);
    final login = auth.login(identifier: 'qa_b', password: 'test-password-b');
    oldReply.complete(AuthResponse(200, _wireSession(cloudGameOwnerA)));
    expect((await retry).failureOrNull?.code, FailureCode.stale);
    expect((await login).isSuccess, isTrue);
    expect(app.sessions.current.userId, cloudGameOwnerB);
    expect(auth.identity?.id, cloudGameOwnerB);
    expect(fixture.store.value, isNot(contains('refresh-$cloudGameOwnerA')));
    expect(fixture.store.value, contains('refresh-$cloudGameOwnerB'));
    expect(fixture.syncCreations, 1);
  });
}

/// Synthetic credential fixture only; no real password or token is used.
Map<String, Object?> _wireSession(String user) => {
  'access_token':
      'header.${base64Url.encode(utf8.encode(jsonEncode({'sub': user, 'session_id': 'qa-session-$user', 'exp': 2200000000}))).replaceAll('=', '')}.signature',
  'refresh_token': 'refresh-$user',
  'user': {'id': user},
};

Future<void> _untilRead(WidgetTester tester, _HeldSessionStore store) async {
  for (var attempt = 0; attempt < 100 && store.reads == 0; attempt++) {
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 2)),
    );
    await tester.pump();
  }
  expect(store.reads, 1);
}

/// Explicit test-only protected-store/network seams. Auth restoration, feature
/// routes, sync controller and SQLite remain the production implementations.
final class _StartupFixture {
  final store = _HeldSessionStore();
  final transport = _NoNetworkTransport();
  int syncCreations = 0;

  List<FeatureContribution> features() => [
    for (final feature in cloudGameFeatures())
      FeatureContribution(
        id: feature.id,
        routes: feature.routes,
        localizations: feature.localizations,
        migrations: feature.migrations,
        services: [
          for (final factory in feature.services)
            if (factory.name == AuthServices.repository.name)
              ServiceFactory<AuthRepository>(
                key: AuthServices.repository,
                createService: (services) => NativeAuthRepository(
                  sessions: services.get(FoundationServices.sessionController),
                  store: store,
                  configuration: const PublicBackendConfiguration(
                    url: 'https://cloud-game-startup.test',
                    publishableKey:
                        'sb_publishable_cloud_game_test_configuration',
                  ),
                  transport: transport,
                ),
                dispose: (repository) => repository.dispose(),
              )
            else if (factory.name == SyncServices.controller.name)
              ServiceFactory<FormativeSyncController>(
                key: SyncServices.controller,
                createService: (services) {
                  syncCreations++;
                  return factory.create(services) as FormativeSyncController;
                },
                dispose: factory.disposeInstance,
              )
            else
              factory,
        ],
      ),
  ];
}

final class _HeldSessionStore implements SessionStore {
  final firstRead = Completer<Result<String?>>();
  String? value;
  int reads = 0, writes = 0, clears = 0;
  @override
  Future<Result<String?>> read() =>
      ++reads == 1 ? firstRead.future : Future.value(Success(value));
  @override
  Future<Result<void>> write(String serializedSession) async {
    writes++;
    value = serializedSession;
    return const Success(null);
  }

  @override
  Future<Result<void>> clear() async {
    clears++;
    value = null;
    return const Success(null);
  }
}

final class _NoNetworkTransport implements AuthTransport {
  int requests = 0;
  FutureOr<AuthResponse> Function(AuthRequest)? reply;
  @override
  Future<AuthResponse> send(AuthRequest request) async {
    requests++;
    if (reply case final response?) return response(request);
    throw StateError('The protected-store startup fixture must not send HTTP.');
  }

  @override
  void close() {}
}
