import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/features/sync/sync_feature.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/cloud_game/support/cloud_game_test_support.dart';
import 'support/settle_local_home.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  testWidgets(
    'installed Home opens learning and contains no development copy',
    (tester) async {
      final app = (await tester.runAsync(
        () => bootstrapCloudGameForTest(features: productionFeatures()),
      ))!;
      addTearDown(app.dispose);
      expect(
        (await tester.runAsync(() => initializeProduction(app)))!.isSuccess,
        isTrue,
      );
      final services = app.composition.services;
      expect(
        services.get(SyncServices.controller),
        same(services.get(SyncServices.controller)),
      );
      for (final path in ['/learn', '/play', '/classes', '/profile']) {
        expect(app.composition.routes.byPath(path), isNotNull);
      }
      await tester.pumpWidget(GeoMathApp(dependencies: app));
      await settleLocalHome(tester, app);
      expect(find.textContaining('masih dalam pembangunan'), findsNothing);
      expect(find.textContaining('GeoMath Foundation'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('home-explore')));
      final scope = AppScope.of(
        tester.element(find.byKey(const ValueKey('home-explore'))),
      );
      expect(scope.router.navigation.current.route.name, 'learning-explore');
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );
  testWidgets('idle classroom covered by login permits a destination exit', (
    tester,
  ) async {
    final app = (await tester.runAsync(
      () => bootstrapCloudGameForTest(features: productionFeatures()),
    ))!;
    addTearDown(app.dispose);
    await tester.runAsync(() => initializeProduction(app));
    await tester.pumpWidget(
      GeoMathApp(dependencies: app, initialRoute: 'cloud-game-classes'),
    );
    await tester.pumpAndSettle();
    final scope = AppScope.of(tester.element(find.byType(Scaffold).first));
    scope.router.open('cloud-game-login');
    await tester.pumpAndSettle();
    await tester.runAsync(() => scope.router.select(AppDestination.home));
    await settleLocalHome(tester, app);
    expect(scope.router.navigation.current.route.name, 'home');
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.runAsync(app.dispose);
  });
}
