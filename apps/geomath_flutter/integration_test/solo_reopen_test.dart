import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
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
      Future<void> waitFor(String operation, bool Function() completed) async {
        final deadline = DateTime.now().add(const Duration(seconds: 20));
        while (true) {
          // A settled Flutter frame does not drain Android SQLite platform
          // replies. Yield real time as well as pumping the resulting frame.
          await tester.pump(const Duration(milliseconds: 50));
          await Future<void>.delayed(const Duration(milliseconds: 25));
          if (completed()) return;
          if (!DateTime.now().isBefore(deadline)) {
            fail(
              '$operation did not complete within 20 seconds: '
              'loading=${controller?.loading}, busy=${controller?.busy}, '
              'game=${controller?.game?.status}, saved=${controller?.saved}, '
              'failure=${controller?.failure?.code}',
            );
          }
        }
      }

      bool idle() =>
          controller != null &&
          !controller!.loading &&
          !controller!.busy &&
          controller!.bank != null;

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
        await waitFor('Solo initialization after opening $route', idle);
        expect(controller!.failure, isNull);
      }

      Future<void> tap(String key, {required bool Function() completed}) async {
        final finder = find.byKey(ValueKey(key));
        bool enabled() {
          final elements = finder.evaluate().toList();
          if (elements.length != 1) return false;
          final widget = elements.single.widget;
          return switch (widget) {
            ActionButton(:final onPressed, :final busy) =>
              onPressed != null && !busy,
            GeoMathCard(:final onTap) => onTap != null,
            _ => false,
          };
        }

        await waitFor(
          'Idle controller and enabled $key',
          () => idle() && enabled(),
        );
        await tester.ensureVisible(finder);
        await waitFor(
          'Visible enabled $key',
          () =>
              idle() && enabled() && finder.hitTestable().evaluate().isNotEmpty,
        );
        await tester.tap(finder);
        await waitFor(
          '$key operation and native persistence',
          () => idle() && completed(),
        );
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
        await tap('solo-start', completed: () => controller!.game != null);
        expect(controller!.game, isNotNull);
        final attempt = controller!.attemptId;
        final shape = controller!.game!.question.shape;
        await tap(
          'solo-choice-solid-${shape.name}',
          completed: () => controller!.selected == shape && controller!.saved,
        );
        await tap('solo-save', completed: () => controller!.saved);
        expect(controller!.game!.stage, GeometryCardKind.solid);
        await close();
        await open('solo-resume');
        expect(controller!.savedSlot?.selected, shape);
        await tap(
          'solo-resume-continue',
          completed: () =>
              controller!.game != null && controller!.attemptId == attempt,
        );
        expect(controller!.attemptId, attempt);
        expect(controller!.game!.stage, GeometryCardKind.solid);
        await tap(
          'solo-r1',
          completed: () =>
              controller!.game?.stage == GeometryCardKind.net &&
              controller!.saved,
        );
        expect(controller!.game!.stage, GeometryCardKind.net);
        expect(controller!.game!.score, 0);
        await tap(
          'solo-choice-net-${shape.name}',
          completed: () => controller!.selected == shape && controller!.saved,
        );
        await tap('solo-save', completed: () => controller!.saved);
        await close();
        await open('solo-resume');
        await tap(
          'solo-resume-continue',
          completed: () =>
              controller!.game != null && controller!.attemptId == attempt,
        );
        expect(controller!.attemptId, attempt);
        expect(controller!.game!.stage, GeometryCardKind.net);
        expect(controller!.selected, shape);
        await tap(
          'solo-r2',
          completed: () => controller!.game?.score == 1 && controller!.saved,
        );
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
