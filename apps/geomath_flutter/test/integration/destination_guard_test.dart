import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/navigation/app_navigation.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/cloud_game/support/cloud_game_test_support.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  Future<GeoMathRouter> routerWith(BackPolicy policy) async {
    final dependencies = await bootstrapCloudGameForTest(
      features: [
        FeatureContribution(
          id: 'guard-test',
          routes: [
            FeatureRoute(
              name: 'draft',
              path: '/learn',
              builder: (_, _) => const SizedBox(),
              backPolicy: policy,
            ),
          ],
        ),
      ],
    );
    final router = GeoMathRouter(dependencies);
    addTearDown(() async {
      router.dispose();
      await dependencies.dispose();
    });
    router.open('draft');
    return router;
  }

  test(
    'destination waits for durable save before removing live draft',
    () async {
      final saved = Completer<BackDecision>();
      final entered = Completer<void>();
      final router = await routerWith((_) {
        entered.complete();
        return saved.future;
      });
      final switching = Future.sync(() => router.select(AppDestination.home));
      await Future<void>.delayed(Duration.zero);
      expect(router.navigation.current.route.name, 'draft');
      await entered.future;
      saved.complete(BackDecision.allow);
      await switching;
      expect(router.navigation.current.route.name, 'home');
    },
  );

  test('storage failure Stay preserves draft and later Leave works', () async {
    var decision = BackDecision.stay;
    final router = await routerWith((_) async => decision);
    final instance = router.navigation.current.instance;
    await Future.sync(() => router.select(AppDestination.home));
    expect(router.navigation.current.instance, instance);
    decision = BackDecision.allow;
    await Future.sync(() => router.select(AppDestination.home));
    expect(router.navigation.current.route.name, 'home');
  });

  test('reset checks covered drafts before clearing a utility page', () async {
    var saved = false;
    final router = await routerWith((_) async {
      saved = true;
      return BackDecision.allow;
    });
    router.open('preferences');
    await Future.sync(() => router.select(AppDestination.play));
    expect(saved, isTrue);
    expect(router.navigation.current.route.name, 'foundation-play');
  });

  test('stale confirmation cannot reset a newly opened route', () async {
    final saved = Completer<BackDecision>();
    final entered = Completer<void>();
    final router = await routerWith((_) {
      entered.complete();
      return saved.future;
    });
    final switching = Future.sync(() => router.select(AppDestination.home));
    await Future<void>.delayed(Duration.zero);
    expect(router.navigation.current.route.name, 'draft');
    await entered.future;
    router.open('preferences');
    saved.complete(BackDecision.allow);
    await switching;
    expect(router.navigation.current.route.name, 'preferences');
  });
}
