import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/features/auth/auth_feature.dart';
import 'package:geomath_flutter/features/auth/data/auth_repository.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../profile/profile_screen_test.dart'
    show PreferencesMemory, GuestMemory;

class AuthFake extends AuthRepository {
  @override
  late SessionController sessions;
  int logouts = 0;
  Future<Result<void>>? loginResult;
  @override
  bool get configured => true;
  @override
  bool get nativeCallbackReady => false;
  @override
  AccountIdentity? get identity => sessions.current.isGuest
      ? null
      : AccountIdentity(
          id: sessions.current.userId!,
          email: 'fixture@example.com',
          googleOnly: false,
        );
  @override
  bool get recoveryRequired => false;
  @override
  Future<Result<void>> login({
    required String identifier,
    required String password,
  }) async => loginResult ?? const Success(null);
  @override
  Future<Result<void>> logout(LogoutScope scope) async {
    ++logouts;
    return const Success(null);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnsupportedError('Unexpected auth action in UI fixture.');
}

void main() {
  sqfliteFfiInit();
  testWidgets(
    'logout confirmation cannot revoke a newer actor after account switch',
    (tester) async {
      final auth = AuthFake();
      final result = await tester.runAsync(
        () => AppDependencies.bootstrap(
          databasePath: inMemoryDatabasePath,
          databaseFactory: databaseFactoryFfi,
          preferencesStore: PreferencesMemory(),
          guestStore: GuestMemory(),
          features: [authFeature(repository: auth)],
        ),
      );
      final app = result!.valueOrNull!;
      auth.sessions = app.sessions;
      app.sessions.bindUser(userId: 'alice', sessionId: 'session-alice');
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-security'),
        );
        await tester.pumpAndSettle();
        final button = find.text('Log keluar semua sesi');
        await tester.ensureVisible(button);
        await tester.tap(button);
        await tester.pumpAndSettle();
        expect(find.text('Sahkan log keluar'), findsOneWidget);
        app.sessions.bindUser(userId: 'bob', sessionId: 'session-bob');
        await tester.pump();
        await tester.tap(find.text('Teruskan'));
        await tester.pumpAndSettle();
        expect(auth.logouts, 0);
        expect(app.sessions.current.userId, 'bob');
        expect(tester.takeException(), isNull);
      } finally {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.runAsync(app.dispose);
        auth.dispose();
      }
    },
  );
  for (final leave in [true, false]) {
    testWidgets(
      leave
          ? 'late auth response never touches disposed controllers'
          : 'late auth response preserves new actor password input',
      (tester) async {
        final pending = Completer<Result<void>>();
        final auth = AuthFake()..loginResult = pending.future;
        final result = await tester.runAsync(
          () => AppDependencies.bootstrap(
            databasePath: inMemoryDatabasePath,
            databaseFactory: databaseFactoryFfi,
            preferencesStore: PreferencesMemory(),
            guestStore: GuestMemory(),
            features: [authFeature(repository: auth)],
          ),
        );
        final app = result!.valueOrNull!;
        auth.sessions = app.sessions;
        try {
          await tester.pumpWidget(
            GeoMathApp(dependencies: app, initialRoute: 'cloud-game-login'),
          );
          await tester.pumpAndSettle();
          await tester.tap(find.byKey(const Key('auth-login-submit')));
          await tester.pump();
          if (leave) {
            await tester.pumpWidget(const SizedBox.shrink());
          } else {
            app.sessions.bindUser(userId: 'bob', sessionId: 'session-bob');
            await tester.pump();
            await tester.enterText(
              find.byType(TextField).at(1),
              'new actor secret',
            );
          }
          pending.complete(const Success(null));
          await tester.pumpAndSettle();
          if (!leave) {
            expect(
              tester
                  .widget<TextField>(find.byType(TextField).at(1))
                  .controller!
                  .text,
              'new actor secret',
            );
          }
          expect(tester.takeException(), isNull);
        } finally {
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.runAsync(app.dispose);
          auth.dispose();
        }
      },
    );
  }
}
