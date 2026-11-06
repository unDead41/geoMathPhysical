import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/features/learning/application/learning_services.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../features/cloud_game/support/cloud_game_test_support.dart';
import '../features/learning/studio/checkpoint_fixture.dart';
import 'support/settle_local_home.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  testWidgets(
    'Home resumes the actual saved draft and counts only completed reflections',
    (tester) async {
      final app = (await tester.runAsync(
        () => bootstrapCloudGameForTest(features: productionFeatures()),
      ))!;
      final actor = app.sessions.current;
      final checkpoint = learningCheckpointFixture();
      await tester.runAsync(() async {
        await app.composition.services
            .get(learningCheckpointRepositoryKey)
            .save(actor, 'calculation:cube:default', checkpoint);
        await app.records.saveReflection(
          actor: actor,
          reflection: ModuleReflection.create(
            activity: ModuleActivity.net,
            stage: ReflectionStage.explanation,
            prediction: 'Six faces',
            result: 'All faces fold into a cube',
            explanation:
                'Each physical face remains attached to its neighbours',
            completed: true,
          ).valueOrNull!,
        );
        await app.records.saveReflection(
          actor: actor,
          reflection: ModuleReflection.create(
            activity: ModuleActivity.volume,
            stage: ReflectionStage.prediction,
            prediction: 'I predict the volumes are equal',
          ).valueOrNull!,
        );
      });
      await tester.pumpWidget(GeoMathApp(dependencies: app));
      await settleLocalHome(tester, app);
      final scope = AppScope.of(
        tester.element(find.byKey(const ValueKey('home-explore'))),
      );
      expect(find.text('1 daripada 4 refleksi lengkap'), findsOneWidget);
      final resume = find.byKey(const ValueKey('home-resume-learning'));
      await tester.ensureVisible(resume);
      await tester.tap(resume);
      expect(
        scope.router.navigation.current.route.name,
        'learning-calculation',
      );
      expect(
        scope.router.navigation.current.arguments['checkpoint'],
        checkpoint,
      );
      expect(
        scope.router.navigation.current.arguments['checkpointActor'],
        actor,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(app.dispose);
    },
  );

  testWidgets('Home clears guest progress and resume when actor changes', (
    tester,
  ) async {
    final app = (await tester.runAsync(
      () => bootstrapCloudGameForTest(features: productionFeatures()),
    ))!;
    await tester.runAsync(
      () => app.composition.services
          .get(learningCheckpointRepositoryKey)
          .save(
            app.sessions.current,
            'calculation:cube:default',
            learningCheckpointFixture(),
          ),
    );
    await tester.pumpWidget(GeoMathApp(dependencies: app));
    await settleLocalHome(tester, app);
    expect(find.byKey(const ValueKey('home-resume-learning')), findsOneWidget);
    app.sessions.bindUser(userId: cloudGameOwnerA, sessionId: 'new-owner');
    await tester.pump();
    await settleLocalHome(tester, app);
    expect(find.byKey(const ValueKey('home-resume-learning')), findsNothing);
    expect(find.text('0 daripada 4 refleksi lengkap'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.runAsync(app.dispose);
  });
}
