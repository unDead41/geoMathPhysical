import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/public_backend_configuration.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/session/session_store.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/auth/auth_feature.dart';
import 'package:geomath_flutter/features/auth/auth_services.dart';
import 'package:geomath_flutter/features/auth/data/auth_repository.dart';
import 'package:geomath_flutter/features/auth/data/auth_transport.dart';
import 'package:geomath_flutter/features/auth/data/native_auth_repository.dart';
import 'package:geomath_flutter/features/auth/presentation/auth_screen.dart';
import 'package:geomath_flutter/features/auth/presentation/sessions_screen.dart';
import 'package:geomath_flutter/features/profile/data/profile_repository.dart';
import 'package:geomath_flutter/features/profile/profile_feature.dart';
import 'package:geomath_flutter/features/profile/profile_services.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

// Explicit local HTTP fixtures, never a hosted account or provider test.
class _ProfileTransportFixture implements AuthTransport {
  bool hasProfile = true;
  String displayName = 'Fixture Teacher';
  String username = 'fixture_teacher';
  String avatar = 'cube';
  int failedSnapshots = 0;
  Future<AuthResponse>? pendingSnapshot;
  FutureOr<AuthResponse> Function(AuthRequest request)? writeReply;
  final requests = <AuthRequest>[];

  List<AuthRequest> get writes => requests
      .where(
        (request) =>
            request.uri.path.endsWith('/geo_complete_profile') ||
            request.body?['action'] == 'update_profile',
      )
      .toList();

  Map<String, Object?> get profile => {
    'id': 'fixture-user',
    'username': username,
    'display_name': displayName,
    'avatar': avatar,
    'role': 'teacher',
  };

  AuthResponse applyWrite(AuthRequest request) {
    final body = request.body!;
    if (request.uri.path.endsWith('/geo_complete_profile')) {
      hasProfile = true;
      username = body['username'] as String;
      displayName = body['display_name'] as String;
      avatar = 'initial';
    } else {
      final payload = body['payload'] as Map;
      displayName = payload['display_name'] as String;
      avatar = payload['avatar'] as String;
    }
    return AuthResponse(200, {'profile': profile});
  }

  @override
  Future<AuthResponse> send(AuthRequest request) async {
    requests.add(request);
    expect(request.uri.host, 'profile-fixture.invalid');
    if (request.uri.path.endsWith('/geodecoder-auth')) {
      final claims = base64Url
          .encode(
            utf8.encode(
              jsonEncode({
                'sub': 'fixture-user',
                'session_id': 'fixture-session',
                'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 7200,
              }),
            ),
          )
          .replaceAll('=', '');
      return AuthResponse(200, {
        'session': {
          'access_token': 'fixture.$claims.fixture',
          'refresh_token': 'local-fixture-refresh',
          'user': {'id': 'fixture-user'},
        },
      });
    }
    if (request.uri.path.endsWith('/user')) {
      return const AuthResponse(200, {
        'id': 'fixture-user',
        'email': 'teacher@profile-fixture.invalid',
        'app_metadata': {
          'providers': ['email'],
        },
      });
    }
    if (request.uri.path.endsWith('/logout')) {
      return const AuthResponse(204, {});
    }
    if (request.uri.path.endsWith('/geo_security_sessions')) {
      return const AuthResponse(200, {
        'server_now': '2026-11-06T00:00:00Z',
        'capabilities': {'revoke_individual': false},
        'truncated': false,
        'sessions': [
          {
            'is_current': true,
            'status': 'recorded',
            'started_at': '2026-11-05T23:00:00Z',
            'user_agent': 'Android Mobile Chrome/130.0',
          },
        ],
      });
    }
    if (request.body?['action'] == 'snapshot') {
      if (pendingSnapshot case final pending?) return pending;
      if (failedSnapshots > 0) {
        --failedSnapshots;
        return const AuthResponse(503, {});
      }
      return AuthResponse(200, {'profile': hasProfile ? profile : null});
    }
    if (request.uri.path.endsWith('/geo_complete_profile') ||
        request.body?['action'] == 'update_profile') {
      return writeReply?.call(request) ?? applyWrite(request);
    }
    throw StateError('Unexpected local fixture request: ${request.uri.path}');
  }

  @override
  void close() {}
}

class _ProtectedFixtureStore implements SessionStore {
  String? value;
  @override
  Future<Result<String?>> read() async => Success(value);
  @override
  Future<Result<void>> write(String serializedSession) async {
    value = serializedSession;
    return const Success(null);
  }

  @override
  Future<Result<void>> clear() async {
    value = null;
    return const Success(null);
  }
}

class _PreferenceFixtureStore implements PreferencesStore {
  @override
  Future<String?> read() async => null;
  @override
  Future<void> write(String value) async {}
}

class _GuestFixtureStore implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('profile-fixture');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}

// The production routes, NativeAuthRepository, gateway, ProfileRepository and
// shared SessionController all run unchanged. Only the transport/store are local.
FeatureContribution _fixtureAuth(_ProfileTransportFixture transport) {
  final production = authFeature();
  return FeatureContribution(
    id: production.id,
    routes: production.routes,
    localizations: production.localizations,
    services: [
      for (final service in production.services)
        if (service.name != AuthServices.repository.name) service,
      ServiceFactory<AuthRepository>(
        key: AuthServices.repository,
        createService: (services) => NativeAuthRepository(
          sessions: services.get(FoundationServices.sessionController),
          store: _ProtectedFixtureStore(),
          configuration: const PublicBackendConfiguration(
            url: 'https://profile-fixture.invalid',
            publishableKey: 'sb_publishable_local_fixture_only_0123456789',
          ),
          transport: transport,
        ),
        dispose: (repository) => repository.dispose(),
      ),
    ],
  );
}

Finder _field(String key) =>
    find.descendant(of: find.byKey(Key(key)), matching: find.byType(TextField));

Future<void> _tap(WidgetTester tester, Finder target) async {
  await tester.pump();
  await tester.ensureVisible(target);
  await tester.tap(target);
  await tester.pumpAndSettle();
}

Future<AppDependencies> _open(
  WidgetTester tester,
  _ProfileTransportFixture transport, {
  AppLanguage language = AppLanguage.ms,
  bool signedIn = true,
}) async {
  tester.view.physicalSize = const Size(320, 1100);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final result = await tester.runAsync(
    () => AppDependencies.bootstrap(
      databasePath: inMemoryDatabasePath,
      databaseFactory: databaseFactoryFfi,
      preferencesStore: _PreferenceFixtureStore(),
      guestStore: _GuestFixtureStore(),
      features: [_fixtureAuth(transport), profileFeature()],
    ),
  );
  final app = result!.valueOrNull!;
  await tester.runAsync(
    () => app.preferences.save(
      app.preferences.value.copyWith(language: language, textScale: 1.5),
    ),
  );
  expect(
    app.composition.services.get(ProfileServices.repository),
    isA<GatewayProfileRepository>(),
  );
  final auth = app.composition.services.get(AuthServices.repository);
  expect(auth, isA<NativeAuthRepository>());
  expect(identical(auth.sessions, app.sessions), isTrue);
  if (signedIn) {
    final login = await auth.login(
      identifier: 'fixture_teacher',
      password: 'fixture-password-only',
    );
    expect(login.isSuccess, isTrue);
  }
  await tester.pumpWidget(
    GeoMathApp(dependencies: app, initialRoute: 'cloud-game-profile'),
  );
  await tester.pumpAndSettle();
  return app;
}

Future<void> _close(WidgetTester tester, AppDependencies app) async {
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.runAsync(app.dispose);
}

void main() {
  sqfliteFfiInit();
  for (final language in AppLanguage.values) {
    testWidgets(
      '[native transport fixture] ${language.name} completion validates, retries conflict and preserves server role at 320dp/150%',
      (tester) async {
        final fixture = _ProfileTransportFixture()..hasProfile = false;
        final app = await _open(tester, fixture, language: language);
        try {
          final save = find.byKey(const Key('profile-save'));
          await _tap(tester, save);
          expect(fixture.writes, isEmpty);
          expect(
            tester
                .widget<LabeledField>(find.byKey(const Key('profile-name')))
                .errorText,
            isNotNull,
          );
          expect(
            tester
                .widget<LabeledField>(find.byKey(const Key('profile-username')))
                .errorText,
            isNotNull,
          );
          await tester.ensureVisible(_field('profile-name'));
          await tester.enterText(_field('profile-name'), 'Fixture Teacher');
          await tester.ensureVisible(_field('profile-username'));
          await tester.enterText(_field('profile-username'), 'taken_name');
          fixture.writeReply = (_) => const AuthResponse(200, {
            'error': {'code': 'username_taken'},
          });
          await _tap(tester, save);
          expect(fixture.writes, hasLength(1));
          expect(find.byKey(const Key('profile-error')), findsOneWidget);
          expect(
            tester
                .widget<TextField>(_field('profile-username'))
                .controller!
                .text,
            'taken_name',
          );
          expect(tester.widget<ActionButton>(save).onPressed, isNotNull);
          expect(
            find.text(
              language == AppLanguage.ms
                  ? 'Profil disimpan.'
                  : 'Profile saved.',
            ),
            findsNothing,
          );
          fixture.writeReply = null;
          await tester.ensureVisible(_field('profile-username'));
          await tester.enterText(_field('profile-username'), 'Fixture_Teacher');
          await _tap(tester, save);
          expect(fixture.writes.last.body, {
            'username': 'fixture_teacher',
            'display_name': 'Fixture Teacher',
            'role': 'student',
          });
          expect(find.byType(ChoiceChips<AccountRole>), findsNothing);
          expect(
            find.text(
              language == AppLanguage.ms ? 'Peranan: Guru' : 'Role: Teacher',
            ),
            findsOneWidget,
          );
          final cone = find.widgetWithText(
            ChoiceChip,
            language == AppLanguage.ms ? 'Kon' : 'Cone',
          );
          await _tap(tester, cone);
          await _tap(tester, save);
          expect(fixture.writes.last.body, {
            'action': 'update_profile',
            'payload': {'display_name': 'Fixture Teacher', 'avatar': 'cone'},
          });
          await tester.ensureVisible(_field('profile-name'));
          await tester.enterText(_field('profile-name'), 'Discarded Name');
          await _tap(tester, find.byKey(const Key('profile-discard')));
          expect(
            tester.widget<TextField>(_field('profile-name')).controller!.text,
            'Fixture Teacher',
          );
          expect(fixture.writes, hasLength(3));
          expect(tester.takeException(), isNull);
        } finally {
          await _close(tester, app);
        }
      },
    );
  }

  for (final malformedReply in [false, true]) {
    testWidgets(
      '[native transport fixture] ${malformedReply ? 'unverifiable 2xx' : 'lost acknowledgement'} blocks repeat save until verified refresh',
      (tester) async {
        final fixture = _ProfileTransportFixture();
        final app = await _open(tester, fixture);
        try {
          fixture.writeReply = (request) {
            fixture.applyWrite(request);
            if (malformedReply) return const AuthResponse(200, {});
            throw TimeoutException('Local fixture lost the acknowledgement.');
          };
          await tester.enterText(
            _field('profile-name'),
            'Committed Fixture Name',
          );
          await _tap(tester, find.byKey(const Key('profile-save')));
          expect(fixture.writes, hasLength(1));
          final save = find.byKey(const Key('profile-save'));
          expect(tester.widget<ActionButton>(save).onPressed, isNull);
          expect(find.text('Profil disimpan.'), findsNothing);
          fixture.failedSnapshots = 1;
          await _tap(tester, find.byKey(const Key('profile-refresh')));
          expect(tester.widget<ActionButton>(save).onPressed, isNull);
          expect(
            tester.widget<TextField>(_field('profile-name')).controller!.text,
            'Committed Fixture Name',
          );
          expect(fixture.writes, hasLength(1));
          fixture.pendingSnapshot = Future.value(const AuthResponse(200, {}));
          await _tap(tester, find.byKey(const Key('profile-refresh')));
          expect(tester.widget<ActionButton>(save).onPressed, isNull);
          expect(
            tester.widget<TextField>(_field('profile-name')).controller!.text,
            'Committed Fixture Name',
          );
          expect(find.byKey(const Key('profile-username')), findsNothing);
          expect(find.byKey(const Key('profile-error')), findsOneWidget);
          expect(find.text('Profil disimpan.'), findsNothing);
          await _tap(tester, save);
          expect(fixture.writes, hasLength(1));
          fixture.pendingSnapshot = null;
          await _tap(tester, find.byKey(const Key('profile-refresh')));
          await tester.ensureVisible(_field('profile-name'));
          await tester.enterText(
            _field('profile-name'),
            'Explicit Second Write',
          );
          await tester.pump();
          expect(tester.widget<ActionButton>(save).onPressed, isNotNull);
          fixture.writeReply = null;
          await _tap(tester, save);
          expect(fixture.writes, hasLength(2));
          expect(find.text('Profil disimpan.'), findsOneWidget);
          expect(tester.takeException(), isNull);
        } finally {
          await _close(tester, app);
        }
      },
    );
  }

  testWidgets(
    '[native transport fixture] failed first read retries and settings round trip retains draft',
    (tester) async {
      final pending = Completer<AuthResponse>();
      final fixture = _ProfileTransportFixture()
        ..pendingSnapshot = pending.future;
      final app = await _open(tester, fixture);
      try {
        expect(find.byKey(const Key('profile-loading')), findsOneWidget);
        expect(find.byKey(const Key('profile-name')), findsNothing);
        expect(find.byKey(const Key('profile-save')), findsNothing);
        fixture.pendingSnapshot = null;
        pending.complete(const AuthResponse(503, {}));
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('profile-load-error')), findsOneWidget);
        expect(find.byKey(const Key('profile-name')), findsNothing);
        expect(fixture.writes, isEmpty);
        await _tap(
          tester,
          find.descendant(
            of: find.byKey(const Key('profile-load-error')),
            matching: find.byType(ActionButton),
          ),
        );
        expect(find.byKey(const Key('profile-name')), findsOneWidget);
        await tester.enterText(_field('profile-name'), 'Settings Return Draft');
        await _tap(tester, find.byKey(const Key('profile-settings')));
        final router = AppScope.of(tester.element(find.byType(Scaffold).first))
            .router;
        expect(router.navigation.current.route.name, 'preferences');
        await tester.runAsync(
          () => app.preferences.save(
            app.preferences.value.copyWith(
              language: AppLanguage.en,
              theme: AppTheme.dark,
            ),
          ),
        );
        await tester.pumpAndSettle();
        router.back();
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(_field('profile-name')).controller!.text,
          'Settings Return Draft',
        );
        expect(fixture.writes, isEmpty);
        expect(tester.takeException(), isNull);
      } finally {
        await _close(tester, app);
      }
    },
  );

  testWidgets(
    '[native transport fixture] same-user epoch change rejects late write without publishing saved state',
    (tester) async {
      final fixture = _ProfileTransportFixture();
      final app = await _open(tester, fixture);
      final pending = Completer<AuthResponse>();
      try {
        fixture.writeReply = (_) => pending.future;
        await tester.enterText(_field('profile-name'), 'Old Scope Draft');
        await tester.pump();
        await tester.ensureVisible(find.byKey(const Key('profile-save')));
        await tester.tap(find.byKey(const Key('profile-save')));
        await tester.pump();
        expect(fixture.writes, hasLength(1));
        fixture.displayName = 'New Scope Snapshot';
        app.sessions.changeScope('new-profile-scope');
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(_field('profile-name')).controller!.text,
          'New Scope Snapshot',
        );
        pending.complete(
          const AuthResponse(200, {
            'profile': {
              'id': 'fixture-user',
              'username': 'fixture_teacher',
              'display_name': 'Old Scope Draft',
              'avatar': 'cube',
              'role': 'teacher',
            },
          }),
        );
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(_field('profile-name')).controller!.text,
          'New Scope Snapshot',
        );
        expect(find.text('Profil disimpan.'), findsNothing);
        expect(fixture.writes, hasLength(1));
        expect(tester.takeException(), isNull);
      } finally {
        if (!pending.isCompleted) pending.complete(const AuthResponse(503, {}));
        await _close(tester, app);
      }
    },
  );

  testWidgets(
    '[native transport fixture] guest can log in, inspect security sessions and log out through actual routes',
    (tester) async {
      final fixture = _ProfileTransportFixture();
      final app = await _open(tester, fixture, signedIn: false);
      try {
        expect(fixture.requests, isEmpty);
        await _tap(tester, find.byKey(const Key('profile-login')));
        expect(find.byType(AuthScreen), findsOneWidget);
        await tester.enterText(find.byType(TextField).at(0), 'fixture_teacher');
        await tester.enterText(
          find.byType(TextField).at(1),
          'fixture-password-only',
        );
        await _tap(tester, find.byKey(const Key('auth-login-submit')));
        expect(app.sessions.current.userId, 'fixture-user');
        await _tap(tester, find.widgetWithText(ActionButton, 'Buka profil'));
        await _tap(tester, find.byKey(const Key('profile-security')));
        await _tap(tester, find.widgetWithText(ActionButton, 'Rekod sesi'));
        expect(find.byType(SessionsScreen), findsOneWidget);
        expect(find.text('Sesi semasa'), findsOneWidget);
        expect(
          fixture.requests.where(
            (r) => r.uri.path.endsWith('/geo_security_sessions'),
          ),
          hasLength(1),
        );
        final router = AppScope.of(tester.element(find.byType(SessionsScreen)))
            .router;
        router.back();
        await tester.pumpAndSettle();
        await _tap(
          tester,
          find.widgetWithText(ActionButton, 'Log keluar peranti ini'),
        );
        await _tap(tester, find.widgetWithText(ActionButton, 'Teruskan'));
        expect(app.sessions.current.isGuest, isTrue);
        expect(fixture.requests.last.uri.path, '/auth/v1/logout');
        expect(fixture.requests.last.uri.queryParameters, {'scope': 'local'});
        router.back();
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('profile-login')), findsOneWidget);
        expect(find.byKey(const Key('profile-name')), findsNothing);
        expect(fixture.writes, isEmpty);
        expect(tester.takeException(), isNull);
      } finally {
        await _close(tester, app);
      }
    },
  );
}
