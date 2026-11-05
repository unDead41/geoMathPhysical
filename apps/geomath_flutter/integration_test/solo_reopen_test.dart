import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/features/solo/solo_feature.dart';
import 'package:integration_test/integration_test.dart';
import 'package:sqflite/sqflite.dart';

/// Real Android SQLite/preferences smoke. Database close/reopen is exercised in
/// one test process; operating-system force-stop must be verified separately.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets(
    'solo preserves R1 selection and R2 stage through app/database reopen',
    (tester) async {
      final path =
          '${await getDatabasesPath()}/geomath_solo_integration.sqlite';
      await deleteDatabase(path);
      AppDependencies? app;
      SoloController? controller;
      Future<void> open(String route) async {
        final result = await AppDependencies.bootstrap(
          features: [soloFeature()],
          databasePath: path,
        );
        expect(result.isSuccess, true);
        app = result.valueOrNull!;
        controller = app!.composition.services.get(SoloServices.controller);
        await controller!.initialize();
        await tester.pumpWidget(
          GeoMathApp(dependencies: app!, initialRoute: route),
        );
        await tester.pumpAndSettle();
      }

      Future<void> tap(String key) async {
        final finder = find.byKey(ValueKey(key));
        await tester.ensureVisible(finder);
        await tester.pumpAndSettle();
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      Future<void> close() async {
        if (controller?.game != null) {
          expect(await controller!.checkpoint(), true);
        }
        await tester.pumpWidget(const SizedBox.shrink());
        await app?.dispose();
        app = null;
        controller = null;
      }

      try {
        await open('cloud-game-play');
        await tester.enterText(find.byType(TextFormField), 'Reopen QA');
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tap('solo-start');
        expect(controller!.game, isNotNull);
        final attempt = controller!.attemptId;
        final shape = controller!.game!.question.shape;
        await tap('solo-choice-solid-${shape.name}');
        await tap('solo-save');
        expect(controller!.game!.stage, GeometryCardKind.solid);
        await close();
        await open('solo-resume');
        expect(controller!.savedSlot?.selected, shape);
        await tap('solo-resume-continue');
        expect(controller!.attemptId, attempt);
        expect(controller!.game!.stage, GeometryCardKind.solid);
        await tap('solo-r1');
        expect(controller!.game!.stage, GeometryCardKind.net);
        expect(controller!.game!.score, 0);
        await tap('solo-choice-net-${shape.name}');
        await tap('solo-save');
        await close();
        await open('solo-resume');
        await tap('solo-resume-continue');
        expect(controller!.attemptId, attempt);
        expect(controller!.game!.stage, GeometryCardKind.net);
        expect(controller!.selected, shape);
        await tap('solo-r2');
        expect(controller!.game!.score, 1);
        expect(controller!.game!.answers.single.id, isNotEmpty);
        expect(tester.takeException(), isNull);
      } finally {
        await close();
        await deleteDatabase(path);
      }
    },
  );
}
