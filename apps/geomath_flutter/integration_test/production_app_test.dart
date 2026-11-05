import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'production composition starts offline and reaches every destination',
    (tester) async {
      final directory = await getApplicationSupportDirectory();
      final opened = await AppDependencies.bootstrap(
        features: productionFeatures(),
        databasePath: '${directory.path}/integrated-production-smoke.db',
      );
      expect(opened.isSuccess, isTrue);
      final app = (opened as Success<AppDependencies>).value;
      addTearDown(app.dispose);
      expect((await initializeProduction(app)).isSuccess, isTrue);
      await tester.pumpWidget(GeoMathApp(dependencies: app));
      await tester.pump(const Duration(seconds: 1));
      final router = AppScope.of(
        tester.element(find.byKey(const ValueKey('home-explore'))),
      ).router;
      expect(find.textContaining('GeoMath Foundation'), findsNothing);
      for (final destination in [
        AppDestination.learn,
        AppDestination.play,
        AppDestination.classes,
        AppDestination.profile,
        AppDestination.home,
      ]) {
        await router.select(destination);
        await tester.pump(const Duration(milliseconds: 500));
        expect(
          router.navigation.current.route.name.startsWith('foundation-'),
          isFalse,
        );
        expect(tester.takeException(), isNull);
      }
      expect(app.sessions.current.isGuest, isTrue);
      await tester.pumpWidget(const SizedBox.shrink());
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );
}
