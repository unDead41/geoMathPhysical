import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/session/actor_binding.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/session/guest_identity_store.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/auth/auth_feature.dart';
import 'package:geomath_flutter/features/auth/data/auth_repository.dart';
import 'package:geomath_flutter/features/profile/data/profile_repository.dart';
import 'package:geomath_flutter/features/profile/profile_feature.dart';
import 'package:geomath_flutter/features/profile/presentation/profile_screen.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

class PreferencesMemory implements PreferencesStore {
  @override
  Future<String?> read() async => null;
  @override
  Future<void> write(String value) async {}
}

class GuestMemory implements GuestIdentityStore {
  @override
  Future<Result<String?>> read() async => const Success('ui-installation');
  @override
  Future<Result<void>> write(String guestId) async => const Success(null);
}

class Profiles implements ProfileRepository {
  @override
  late SessionController sessions;
  @override
  bool configured = true;
  bool failNetwork = false;
  Future<Result<AccountProfile>>? pendingUpdate;
  int saves = 0;
  String lastName = '';
  AccountProfile value = const AccountProfile(
    id: 'alice',
    username: 'alice',
    displayName: 'Alice Teacher',
    role: AccountRole.teacher,
    avatar: 'cube',
  );
  @override
  Future<Result<AccountProfile?>> load(ActorBinding actor) async =>
      Success(value);
  @override
  Future<Result<AccountProfile>> update(
    ActorBinding actor, {
    required String displayName,
    required String avatar,
  }) async {
    ++saves;
    lastName = displayName;
    if (pendingUpdate case final pending?) return pending;
    if (failNetwork) {
      return const Failed(
        AppFailure(code: FailureCode.network, message: 'auth.network'),
      );
    }
    value = AccountProfile(
      id: actor.userId!,
      username: value.username,
      displayName: displayName,
      role: value.role,
      avatar: avatar,
    );
    return Success(value);
  }

  @override
  Future<Result<AccountProfile>> complete(
    ActorBinding actor, {
    required String username,
    required String displayName,
    required AccountRole role,
  }) async => update(actor, displayName: displayName, avatar: 'initial');
}

void main() {
  sqfliteFfiInit();
  Future<AppDependencies> open(
    WidgetTester tester,
    Profiles profiles, {
    bool signedIn = true,
  }) async {
    final result = await tester.runAsync(
      () => AppDependencies.bootstrap(
        databasePath: inMemoryDatabasePath,
        databaseFactory: databaseFactoryFfi,
        preferencesStore: PreferencesMemory(),
        guestStore: GuestMemory(),
        features: [
          authFeature(),
          profileFeature(repository: profiles),
        ],
      ),
    );
    final app = result!.valueOrNull!;
    profiles.sessions = app.sessions;
    if (signedIn) {
      app.sessions.bindUser(userId: 'alice', sessionId: 'session-alice');
    }
    return app;
  }

  Future<void> close(WidgetTester tester, AppDependencies app) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.runAsync(app.dispose);
  }

  Finder nameField() => find.descendant(
    of: find.byKey(const Key('profile-name')),
    matching: find.byType(TextField),
  );
  for (final language in AppLanguage.values) {
    testWidgets(
      'profile draft survives ${language.name} theme and 150 percent text at 320dp',
      (tester) async {
        tester.view.physicalSize = const Size(320, 1100);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final profiles = Profiles();
        final app = await open(tester, profiles);
        try {
          await tester.pumpWidget(
            GeoMathApp(dependencies: app, initialRoute: 'cloud-game-profile'),
          );
          await tester.pumpAndSettle();
          await tester.enterText(nameField(), 'Draft Teacher');
          await tester.runAsync(
            () => app.preferences.save(
              app.preferences.value.copyWith(
                language: language,
                theme: AppTheme.dark,
                textScale: 1.5,
              ),
            ),
          );
          await tester.pumpAndSettle();
          expect(
            tester.widget<TextField>(nameField()).controller!.text,
            'Draft Teacher',
          );
          expect(tester.takeException(), isNull);
          await tester.ensureVisible(find.byKey(const Key('profile-save')));
          await tester.tap(find.byKey(const Key('profile-save')));
          await tester.pumpAndSettle();
          expect(profiles.lastName, 'Draft Teacher');
          expect(profiles.saves, 1);
          expect(tester.takeException(), isNull);
        } finally {
          await close(tester, app);
        }
      },
    );
  }
  testWidgets(
    'discard restores server snapshot, unknown outcome requires explicit refresh',
    (tester) async {
      final profiles = Profiles();
      final app = await open(tester, profiles);
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-profile'),
        );
        await tester.pumpAndSettle();
        await tester.enterText(nameField(), 'Unsaved Teacher');
        await tester.pump();
        await tester.ensureVisible(find.byKey(const Key('profile-discard')));
        await tester.tap(find.byKey(const Key('profile-discard')));
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Alice Teacher',
        );
        await tester.ensureVisible(nameField());
        await tester.enterText(nameField(), 'Retained Draft');
        await tester.pump();
        profiles.failNetwork = true;
        await tester.ensureVisible(find.byKey(const Key('profile-save')));
        await tester.tap(find.byKey(const Key('profile-save')));
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<ActionButton>(find.byKey(const Key('profile-save')))
              .onPressed,
          isNull,
        );
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Retained Draft',
        );
        expect(profiles.saves, 1);
        final refresh = find.widgetWithText(ActionButton, 'Muat semula');
        await tester.ensureVisible(refresh);
        await tester.tap(refresh);
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Retained Draft',
        );
        expect(
          tester
              .widget<ActionButton>(find.byKey(const Key('profile-save')))
              .onPressed,
          isNotNull,
        );
      } finally {
        await close(tester, app);
      }
    },
  );
  testWidgets(
    'system back offers stay/discard and account switch clears draft',
    (tester) async {
      final profiles = Profiles();
      final app = await open(tester, profiles);
      try {
        await tester.pumpWidget(GeoMathApp(dependencies: app));
        await tester.pumpAndSettle();
        final router = AppScope.of(tester.element(find.byType(Scaffold).first))
            .router;
        router.open('cloud-game-profile');
        await tester.pumpAndSettle();
        await tester.enterText(nameField(), 'Unsaved Teacher');
        await tester.pump();
        router.back();
        await tester.pumpAndSettle();
        expect(find.text('Perubahan profil belum disimpan'), findsOneWidget);
        await tester.tap(find.text('Terus menyunting'));
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Unsaved Teacher',
        );
        app.sessions.logout();
        await tester.pumpAndSettle();
        expect(find.byType(ProfileScreen), findsOneWidget);
        expect(find.byKey(const Key('profile-name')), findsNothing);
        expect(find.text('Unsaved Teacher'), findsNothing);
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, app);
      }
    },
  );
  testWidgets(
    'unconfigured guest profile and auth remain usable without network',
    (tester) async {
      final profiles = Profiles()..configured = false;
      final app = await open(tester, profiles, signedIn: false);
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-profile'),
        );
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('profile-unavailable')), findsOneWidget);
        final router = AppScope.of(tester.element(find.byType(ProfileScreen)))
            .router;
        router.open('cloud-game-login');
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('auth-unavailable')), findsOneWidget);
        expect(
          tester
              .widget<ActionButton>(find.byKey(const Key('auth-login-submit')))
              .onPressed,
          isNull,
        );
        expect(
          tester
              .widget<ActionButton>(find.byKey(const Key('auth-google-submit')))
              .onPressed,
          isNull,
        );
        expect(app.sessions.current.isGuest, isTrue);
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, app);
      }
    },
  );
  testWidgets(
    'bottom tab offers stay, discard and save; logout clears the next draft',
    (tester) async {
      final profiles = Profiles();
      final app = await open(tester, profiles);
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-profile'),
        );
        await tester.pumpAndSettle();
        final router = AppScope.of(tester.element(find.byType(ProfileScreen)))
            .router;
        await tester.enterText(nameField(), 'Tab-retained Draft');
        await tester.pump();
        router.select(AppDestination.home);
        await tester.pumpAndSettle();
        expect(find.byType(AlertDialog), findsOneWidget);
        await tester.tap(find.text('Terus menyunting'));
        await tester.pumpAndSettle();
        expect(router.navigation.current.route.name, 'cloud-game-profile');
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Tab-retained Draft',
        );
        router.select(AppDestination.home);
        await tester.pumpAndSettle();
        await tester.tap(
          find.descendant(
            of: find.byType(AlertDialog),
            matching: find.text('Buang perubahan'),
          ),
        );
        await tester.pumpAndSettle();
        expect(router.navigation.current.route.name, 'home');
        expect(profiles.saves, 0);
        router.select(AppDestination.profile);
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Alice Teacher',
        );
        await tester.enterText(nameField(), 'Saved with tab');
        await tester.pump();
        router.select(AppDestination.home);
        await tester.pumpAndSettle();
        await tester.tap(
          find.descendant(
            of: find.byType(AlertDialog),
            matching: find.text('Simpan'),
          ),
        );
        await tester.pumpAndSettle();
        expect(router.navigation.current.route.name, 'home');
        expect(profiles.saves, 1);
        router.select(AppDestination.profile);
        await tester.pumpAndSettle();
        await tester.enterText(nameField(), 'Draft for previous session');
        await tester.pump();
        app.sessions.logout();
        app.sessions.bindUser(userId: 'alice', sessionId: 'new-session-alice');
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Saved with tab',
        );
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, app);
      }
    },
  );
  testWidgets('profile confirmation cannot save into a switched actor', (
    tester,
  ) async {
    final profiles = Profiles();
    final app = await open(tester, profiles);
    try {
      await tester.pumpWidget(GeoMathApp(dependencies: app));
      await tester.pumpAndSettle();
      final router = AppScope.of(tester.element(find.byType(Scaffold).first))
          .router;
      router.open('cloud-game-profile');
      await tester.pumpAndSettle();
      await tester.enterText(nameField(), 'Old Actor Draft');
      await tester.pump();
      router.back();
      await tester.pumpAndSettle();
      app.sessions.bindUser(userId: 'bob', sessionId: 'session-bob');
      await tester.pump();
      await tester.tap(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text('Simpan'),
        ),
      );
      await tester.pumpAndSettle();
      expect(profiles.saves, 0);
      expect(app.sessions.current.userId, 'bob');
    } finally {
      await close(tester, app);
    }
  });
  testWidgets(
    'tab exit during save stays and retains draft with unknown outcome',
    (tester) async {
      final pending = Completer<Result<AccountProfile>>();
      final profiles = Profiles()..pendingUpdate = pending.future;
      final app = await open(tester, profiles);
      try {
        await tester.pumpWidget(
          GeoMathApp(dependencies: app, initialRoute: 'cloud-game-profile'),
        );
        await tester.pumpAndSettle();
        await tester.enterText(nameField(), 'Unacknowledged Draft');
        await tester.pump();
        final save = find.byKey(const Key('profile-save'));
        await tester.ensureVisible(save);
        await tester.tap(save);
        await tester.pump();
        expect(profiles.saves, 1);
        final router = AppScope.of(tester.element(find.byType(ProfileScreen)))
            .router;
        final instance = router.navigation.current.instance;
        await tester.runAsync(() => router.select(AppDestination.home));
        await tester.pump(const Duration(milliseconds: 300));
        expect(router.navigation.current.instance, instance);
        expect(router.navigation.current.route.name, 'cloud-game-profile');
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Unacknowledged Draft',
        );
        expect(tester.widget<ActionButton>(save).onPressed, isNull);
        expect(profiles.saves, 1);
        pending.complete(
          const Failed(
            AppFailure(code: FailureCode.network, message: 'auth.network'),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.widget<ActionButton>(save).onPressed, isNull);
        expect(tester.takeException(), isNull);
      } finally {
        await close(tester, app);
      }
    },
  );
  testWidgets(
    'back Save waits for acknowledgement and back Discard removes retained draft',
    (tester) async {
      final profiles = Profiles();
      final app = await open(tester, profiles);
      try {
        await tester.pumpWidget(GeoMathApp(dependencies: app));
        await tester.pumpAndSettle();
        final router = AppScope.of(tester.element(find.byType(Scaffold).first))
            .router;
        router.open('cloud-game-profile');
        await tester.pumpAndSettle();
        await tester.enterText(nameField(), 'Saved on Back');
        await tester.pump();
        router.back();
        await tester.pumpAndSettle();
        await tester.tap(
          find.descendant(
            of: find.byType(AlertDialog),
            matching: find.text('Simpan'),
          ),
        );
        await tester.pumpAndSettle();
        expect(profiles.saves, 1);
        expect(find.byType(ProfileScreen), findsNothing);
        router.open('cloud-game-profile');
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Saved on Back',
        );
        await tester.enterText(nameField(), 'Discarded on Back');
        await tester.pump();
        router.back();
        await tester.pumpAndSettle();
        await tester.tap(
          find.descendant(
            of: find.byType(AlertDialog),
            matching: find.text('Buang perubahan'),
          ),
        );
        await tester.pumpAndSettle();
        expect(profiles.saves, 1);
        expect(find.byType(ProfileScreen), findsNothing);
        router.open('cloud-game-profile');
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(nameField()).controller!.text,
          'Saved on Back',
        );
      } finally {
        await close(tester, app);
      }
    },
  );
}
