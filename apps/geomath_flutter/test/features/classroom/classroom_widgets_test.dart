import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/navigation/app_navigation.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/core/runtime/random_source.dart';
import 'package:geomath_flutter/core/session/auth_session.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/auth/auth_services.dart';
import 'package:geomath_flutter/features/classroom/classroom_feature.dart';

import 'classroom_fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<_Harness> mount(
    WidgetTester tester, {
    bool configured = true,
    bool guest = false,
    String role = 'teacher',
    String status = 'open',
    Map<String, Object?>? attempt,
    bool room = false,
    AppLanguage language = AppLanguage.en,
    bool narrow = false,
  }) async {
    if (narrow) {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }
    final sessions = SessionController.guest(
      guestId: 'classroom-widget',
      sessionId: 'guest',
    );
    final user = role == 'teacher' ? teacherA : studentA;
    if (!guest) sessions.bindUser(userId: user, sessionId: 'widget-session');
    final gateway = ClassroomFixtureGateway(sessions, configured: configured);
    final controller = ClassroomController(
      repository: ClassroomRepository(gateway: gateway, sessions: sessions),
      sessions: sessions,
      clock: ClassroomTestClock(),
      random: ClassroomTestRandom(),
    );
    gateway.respond = (request) => Success(
      CloudReply(
        data: snapshotFixture(
          user: user,
          role: role,
          status: status,
          detailRoom: request.payload['room_id'] as String?,
          attempt: attempt,
        ),
      ),
    );
    addTearDown(() async {
      controller.dispose();
      await sessions.dispose();
    });
    if (configured && !guest) {
      await tester.runAsync(() async {
        await controller.refresh();
        if (room) await controller.openRoom(roomA);
        if (attempt != null) {
          gateway.data({'state': attempt});
          await controller.startAttempt();
        }
      });
    }
    final strings = FeatureLocalizationRegistry(
      classroomFeature().localizations,
    ).translations;
    final bank = ClassroomBank();
    final loadedBank = await tester.runAsync(bank.load);
    expect(loadedBank?.failureOrNull, isNull, reason: 'Frozen bank must load');
    await tester.pumpWidget(
      AppStringsScope(
        strings: AppStrings(language, contributions: strings),
        child: MaterialApp(
          theme: GeoMathTheme.dark(strongContrast: true),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: TextScaler.linear(narrow ? 1.5 : 1)),
            child: child!,
          ),
          home: ClassroomScreen(
            controller: controller,
            geometry: BundleGeometryCardProvider(),
            bank: bank,
            onLogin: () {},
          ),
        ),
      ),
    );
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 20)),
    );
    await tester.pumpAndSettle();
    return _Harness(controller, gateway, sessions);
  }

  Future<void> unmount(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  }

  testWidgets(
    'create failure retains input and account switch clears its draft',
    (tester) async {
      final h = await mount(tester, narrow: true);
      await tester.tap(find.byKey(const ValueKey('classroom-create-class')));
      await tester.pumpAndSettle();
      final dialog = find.byKey(const ValueKey('classroom-input'));
      expect(dialog, findsOneWidget);
      final field = find.descendant(
        of: dialog,
        matching: find.byType(TextFormField),
      );
      await tester.enterText(field, 'Draft new class');
      h.gateway.error('invalid_name');
      await tester.ensureVisible(
        find.descendant(of: dialog, matching: find.text('Confirm')),
      );
      await tester.tap(
        find.descendant(of: dialog, matching: find.text('Confirm')),
      );
      await tester.pumpAndSettle();
      expect(dialog, findsOneWidget);
      expect(find.text('Draft new class'), findsOneWidget);
      expect(h.gateway.calls.last.action, 'create_class');
      expect(h.controller.failure?.code, FailureCode.invalid);
      h.sessions.logout();
      await tester.pumpAndSettle();
      expect(dialog, findsNothing);
      expect(find.text('Draft new class'), findsNothing);
      expect(find.byKey(const ValueKey('classroom-guest')), findsOneWidget);
      expect(tester.takeException(), isNull);
      await unmount(tester);
    },
  );

  testWidgets(
    'unconfigured and guest classroom are honest and make no cloud request',
    (tester) async {
      var h = await mount(tester, configured: false, guest: true, narrow: true);
      expect(
        find.byKey(const ValueKey('classroom-unavailable')),
        findsOneWidget,
      );
      expect(find.textContaining('not configured'), findsOneWidget);
      expect(h.gateway.calls, isEmpty);
      expect(tester.takeException(), isNull);
      await unmount(tester);
      h = await mount(
        tester,
        guest: true,
        language: AppLanguage.ms,
        narrow: true,
      );
      expect(find.byKey(const ValueKey('classroom-guest')), findsOneWidget);
      expect(h.gateway.calls, isEmpty);
      expect(
        find.byKey(const ValueKey('classroom-create-class')),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
      await unmount(tester);
    },
  );

  testWidgets(
    'opening a form then switching actor closes it before any submit',
    (tester) async {
      final h = await mount(tester);
      await tester.tap(find.byKey(const ValueKey('classroom-create-class')));
      await tester.pumpAndSettle();
      final dialog = find.byKey(const ValueKey('classroom-input'));
      await tester.enterText(
        find.descendant(of: dialog, matching: find.byType(TextFormField)),
        'Private draft',
      );
      h.sessions.logout();
      await tester.pumpAndSettle();
      expect(dialog, findsNothing);
      expect(find.text('Private draft'), findsNothing);
      expect(h.gateway.calls.where((r) => r.action == 'create_class'), isEmpty);
      await unmount(tester);
    },
  );

  testWidgets(
    'teacher class UI keeps actions reachable at 320dp dark 150 percent in BM and English',
    (tester) async {
      for (final language in AppLanguage.values) {
        final h = await mount(tester, narrow: true, language: language);
        expect(
          find.byKey(const ValueKey('classroom-create-class')),
          findsOneWidget,
        );
        expect(find.text('001234'), findsOneWidget);
        final createRoom = find.byKey(const ValueKey('classroom-create-room'));
        await tester.ensureVisible(createRoom);
        await tester.pump();
        expect(createRoom.hitTestable(), findsOneWidget);
        expect(tester.takeException(), isNull);
        expect(h.controller.teacher, isTrue);
        await unmount(tester);
      }
    },
  );

  testWidgets(
    'waiting board excludes final zero score and server denial clears room UI',
    (tester) async {
      final h = await mount(tester, room: true, status: 'closed', narrow: true);
      expect(find.text('Waiting'), findsOneWidget);
      expect(find.text('Score: 0/10'), findsNothing);
      expect(find.text('Score: 7/10'), findsOneWidget);
      expect(find.text('Answering time: 01:18'), findsOneWidget);
      h.gateway.error('forbidden');
      await tester.runAsync(() => h.controller.refresh());
      await tester.pump();
      expect(find.byKey(const ValueKey('classroom-denied')), findsOneWidget);
      expect(find.text('Score: 7/10'), findsNothing);
      expect(h.controller.snapshot, isNull);
      expect(tester.takeException(), isNull);
      await unmount(tester);
    },
  );

  testWidgets(
    'card selection is local UI; explicit R1 sends while premature R2 stays disabled',
    (tester) async {
      final h = await mount(
        tester,
        role: 'student',
        status: 'playing',
        room: true,
        attempt: attemptFixture(),
        narrow: true,
      );
      expect(
        find.byKey(const ValueKey('classroom-game')),
        findsOneWidget,
        reason:
            'attempt=${h.controller.attempt?.status}; room=${h.controller.selectedRoomId}; error=${h.controller.failure}; text=${tester.widgetList<Text>(find.byType(Text)).map((t) => t.data).join(" | ")}',
      );
      final count = h.gateway.calls.length;
      final solid = find.byKey(
        const ValueKey('classroom-choice-solid-pyramid'),
      );
      await tester.ensureVisible(solid);
      await tester.tap(solid);
      await tester.pump();
      expect(h.gateway.calls.length, count);
      expect(h.controller.attempt!.score, 0);
      final r2 = tester.widget<ActionButton>(
        find.byKey(const ValueKey('classroom-scan-r2')),
      );
      expect(r2.onPressed, isNull);
      h.gateway.data({
        'state': attemptFixture(stage: 'net'),
        'result': {'type': 'solid'},
      });
      final r1 = find.byKey(const ValueKey('classroom-scan-r1'));
      await tester.ensureVisible(r1);
      await tester.tap(r1);
      await tester.pumpAndSettle();
      expect(h.gateway.calls.last.action, 'answer');
      expect(h.gateway.calls.last.payload['shape'], 'pyramid');
      expect(h.gateway.calls.last.payload['target'], 'r1');
      expect(h.controller.attempt!.stage, 'net');
      expect(h.controller.attempt!.score, 0);
      expect(tester.takeException(), isNull);
      await unmount(tester);
    },
  );

  testWidgets(
    'rename conflict retains modal and typed text; fresh server revision is explicit',
    (tester) async {
      final h = await mount(tester, narrow: true);
      final rename = find.text('Rename class');
      await tester.ensureVisible(rename);
      await tester.tap(rename);
      await tester.pumpAndSettle();
      final dialog = find.byKey(const ValueKey('classroom-management'));
      expect(dialog, findsOneWidget);
      final field = find.descendant(
        of: dialog,
        matching: find.byType(TextFormField),
      );
      await tester.enterText(field, 'My pending name');
      h.gateway.error('conflict');
      await tester.ensureVisible(find.text('Save changes'));
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();
      expect(dialog, findsOneWidget);
      expect(find.text('My pending name'), findsOneWidget);
      expect(h.controller.management!.revision, 3);
      expect(h.controller.failure?.code, FailureCode.conflict);
      h.gateway.data(snapshotFixture(revision: 8, name: 'Other teacher tab'));
      await tester.ensureVisible(
        find.descendant(of: dialog, matching: find.text('Refresh')),
      );
      await tester.tap(
        find.descendant(of: dialog, matching: find.text('Refresh')),
      );
      await tester.pumpAndSettle();
      expect(h.controller.management!.revision, 8);
      expect(h.controller.management!.name, 'My pending name');
      expect(
        find.descendant(
          of: dialog,
          matching: find.textContaining('Other teacher tab'),
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
      await tester.tap(
        find.descendant(of: dialog, matching: find.text('Cancel')),
      );
      await tester.pumpAndSettle();
      await unmount(tester);
    },
  );

  testWidgets(
    'old leave sheet cannot clear a new room attempt or its pending action',
    (tester) async {
      final h = await mount(
        tester,
        role: 'student',
        status: 'playing',
        room: true,
        attempt: attemptFixture(),
      );
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      final replacement = attemptFixture(
        room: roomB,
        id: '50000000-0000-4000-8000-000000000002',
      );
      await tester.runAsync(() async {
        h.gateway.data(
          snapshotFixture(
            user: studentA,
            role: 'student',
            detailRoom: roomB,
            attempt: replacement,
          ),
        );
        expect(await h.controller.openRoom(roomB), isTrue);
        h.gateway.data({'state': replacement});
        expect(await h.controller.startAttempt(), isTrue);
        h.gateway.lost();
        await h.controller.gameCommand('hint');
      });
      final pending = h.controller.pendingGame, before = h.gateway.calls.length;
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();
      expect(h.controller.attempt!.id, replacement['attemptId']);
      expect(h.controller.selectedRoomId, roomB);
      expect(h.controller.pendingGame, same(pending));
      expect(h.gateway.calls.length, before);
      expect(tester.takeException(), isNull);
      await unmount(tester);
    },
  );

  testWidgets(
    'unknown rename outcome keeps draft and disables repeat mutation until review',
    (tester) async {
      final h = await mount(tester);
      final rename = find.text('Rename class');
      await tester.ensureVisible(rename);
      await tester.tap(rename);
      await tester.pumpAndSettle();
      final dialog = find.byKey(const ValueKey('classroom-management'));
      await tester.enterText(
        find.descendant(of: dialog, matching: find.byType(TextFormField)),
        'Maybe saved',
      );
      h.gateway.lost();
      await tester.tap(find.text('Save changes'));
      await tester.pumpAndSettle();
      expect(h.controller.requiresReconciliation, isTrue);
      expect(find.text('Maybe saved'), findsOneWidget);
      final save = tester.widget<FilledButton>(
        find.ancestor(
          of: find.text('Save changes'),
          matching: find.byType(FilledButton),
        ),
      );
      expect(save.onPressed, isNull);
      expect(
        h.gateway.calls.where((r) => r.action == 'rename_class').length,
        1,
      );
      expect(tester.takeException(), isNull);
      await tester.tap(
        find.descendant(of: dialog, matching: find.text('Cancel')),
      );
      await tester.pumpAndSettle();
      await unmount(tester);
    },
  );

  testWidgets(
    'contributed back policy confirms live attempt then returns through room to classes',
    (tester) async {
      final feature = classroomFeature();
      final sessions = SessionController.guest(
        guestId: 'back-test',
        sessionId: 'guest',
      )..bindUser(userId: studentA, sessionId: 'student-a');
      final gateway = ClassroomFixtureGateway(sessions);
      final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
      final services = ServiceRegistry([
        ServiceFactory<AuthSession>(
          key: FoundationServices.sessions,
          createService: (_) => sessions,
        ),
        ServiceFactory<CloudGateway>(
          key: AuthServices.gateway,
          createService: (_) => gateway,
        ),
        ServiceFactory<Clock>(
          key: FoundationServices.clock,
          createService: (_) => ClassroomTestClock(),
        ),
        ServiceFactory<RandomSource>(
          key: FoundationServices.random,
          createService: (_) => ClassroomTestRandom(),
        ),
        ServiceFactory<AppLifecycleController>(
          key: FoundationServices.lifecycle,
          createService: (_) => lifecycle,
        ),
        ServiceFactory<GeometryCardProvider>(
          key: FoundationServices.geometry,
          createService: (_) => BundleGeometryCardProvider(),
        ),
        ...feature.services,
      ]);
      addTearDown(() async {
        services.dispose();
        lifecycle.dispose();
        await sessions.dispose();
      });
      expect(gateway.calls, isEmpty);
      final c = services.get(ClassroomServices.controller);
      gateway.respond = (request) => Success(
        CloudReply(
          data: snapshotFixture(
            user: studentA,
            role: 'student',
            status: 'playing',
            detailRoom: request.payload['room_id'] as String?,
            attempt: attemptFixture(),
          ),
        ),
      );
      await tester.runAsync(() async {
        await c.refresh();
        await c.openRoom(roomA);
        gateway.data({'state': attemptFixture()});
        await c.startAttempt();
        await services.get(ClassroomServices.bank).load();
      });
      var routeInstance = 1;
      late StateSetter rebuildRoute;
      await tester.pumpWidget(
        AppStringsScope(
          strings: AppStrings(
            AppLanguage.en,
            contributions: FeatureLocalizationRegistry(feature.localizations)
                .translations,
          ),
          child: MaterialApp(
            theme: GeoMathTheme.dark(),
            home: StatefulBuilder(
              builder: (context, setState) {
                rebuildRoute = setState;
                return AppRouteScope(
                  entry: AppRouteEntry(
                    route: feature.routes.single,
                    instance: routeInstance,
                  ),
                  isCurrent: true,
                  child: Builder(
                    builder: (context) =>
                        feature.routes.single.builder(context, services),
                  ),
                );
              },
            ),
          ),
        ),
      );
      await tester.runAsync(
        () => Future<void>.delayed(const Duration(milliseconds: 20)),
      );
      await tester.pumpAndSettle();
      var request = BackRequest(
        origin: BackOrigin.system,
        route: AppRouteEntry(route: feature.routes.single, instance: 1),
      );
      var flight = feature.routes.single.backPolicy!(request);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(await flight, BackDecision.stay);
      expect(c.attempt!.id, attemptA);
      flight = feature.routes.single.backPolicy!(request);
      await tester.pumpAndSettle();
      rebuildRoute(() => routeInstance = 2);
      await tester.pump();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();
      expect(await flight, BackDecision.stay);
      expect(c.attempt!.id, attemptA);
      request = BackRequest(
        origin: BackOrigin.system,
        route: AppRouteEntry(
          route: feature.routes.single,
          instance: routeInstance,
        ),
      );
      flight = feature.routes.single.backPolicy!(request);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Confirm'));
      await tester.pumpAndSettle();
      expect(await flight, BackDecision.stay);
      expect(c.attempt, isNull);
      expect(c.selectedRoomId, roomA);
      expect(
        await feature.routes.single.backPolicy!(request),
        BackDecision.stay,
      );
      await tester.pumpAndSettle();
      expect(c.selectedRoomId, isNull);
      expect(
        await feature.routes.single.backPolicy!(request),
        BackDecision.allow,
      );
      expect(tester.takeException(), isNull);
      await unmount(tester);
    },
  );
}

final class _Harness {
  const _Harness(this.controller, this.gateway, this.sessions);
  final ClassroomController controller;
  final ClassroomFixtureGateway gateway;
  final SessionController sessions;
}
