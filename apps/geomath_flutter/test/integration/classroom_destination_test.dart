import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/features/auth/auth_services.dart';
import 'package:geomath_flutter/features/auth/data/cloud_gateway.dart';
import 'package:geomath_flutter/features/classroom/classroom_feature.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/cloud_game/support/cloud_game_test_support.dart';
import '../features/classroom/classroom_fixtures.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();
  testWidgets('covered configured guest classroom allows another destination', (
    tester,
  ) async {
    final app = (await tester.runAsync(
      () => bootstrapCloudGameForTest(
        features: [
          FeatureContribution(
            id: 'fixture-auth',
            services: [
              ServiceFactory<CloudGateway>(
                key: AuthServices.gateway,
                createService: (s) =>
                    ClassroomFixtureGateway(s.get(FoundationServices.sessions)),
              ),
            ],
            routes: [
              FeatureRoute(
                name: 'cloud-game-login',
                path: '/auth/login',
                builder: (_, _) => const Text('LOGIN_FIXTURE'),
              ),
            ],
          ),
          classroomFeature(),
        ],
      ),
    ))!;
    addTearDown(app.dispose);
    await tester.pumpWidget(
      GeoMathApp(dependencies: app, initialRoute: 'cloud-game-classes'),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('classroom-guest')), findsOneWidget);
    final scope = AppScope.of(
      tester.element(find.byKey(const ValueKey('classroom-guest'))),
    );
    await tester.tap(find.widgetWithText(ActionButton, 'Log masuk'));
    await tester.pumpAndSettle();
    expect(find.text('LOGIN_FIXTURE'), findsOneWidget);
    expect(scope.router.navigation.entries.length, 2);
    await tester.runAsync(() => scope.router.select(AppDestination.home));
    await tester.pumpAndSettle();
    expect(scope.router.navigation.current.route.name, 'home');
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
