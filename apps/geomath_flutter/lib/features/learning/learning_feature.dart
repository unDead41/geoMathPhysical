import 'package:flutter/widgets.dart';

import '../../app/app_dependencies.dart';
import '../../core/features/feature_contribution.dart';
import '../../core/navigation/app_navigation.dart';
import 'application/learning_services.dart';
import 'labs/lab_strings.dart';
import 'labs/labs_hub.dart';
import 'labs/net_volume_pages.dart';
import 'labs/surface_pages.dart';
import 'labs/surface_strings.dart';
import 'learning_strings.dart';
import 'persistence/learning_checkpoint_repository.dart';
import 'persistence/learning_reflection_controller.dart';
import 'presentation/explore_pages.dart';
import 'presentation/learning_hub.dart';
import 'studio/learning_records_page.dart';
import 'studio/studio_pages.dart';
import 'studio/studio_strings.dart';

export 'application/learning_services.dart';

/// Used unchanged by production composition and lib/dev/learning_main.dart.
FeatureContribution learningFeature() {
  final back = LearningBackCoordinator();
  String shape(BuildContext context) =>
      AppRouteScope.of(context).entry.arguments['shapeId'] as String? ?? 'cube';
  String? mode(BuildContext context) =>
      AppRouteScope.of(context).entry.arguments['mode'] as String?;
  FeatureRoute route(
    String name,
    String path,
    Widget Function(BuildContext) builder, {
    bool activity = false,
  }) => FeatureRoute(
    name: name,
    path: path,
    builder: (context, _) => builder(context),
    backPolicy: activity ? back.request : null,
  );
  return FeatureContribution(
    id: 'learning',
    routes: [
      route('learning', '/learn', (_) => const LearningHub()),
      route(
        'learning-explore',
        '/learn/explore',
        (c) => LearningExplorePage(shapeId: shape(c)),
        activity: true,
      ),
      route(
        'learning-views',
        '/learn/views',
        (c) => LearningViewsPage(shapeId: shape(c)),
        activity: true,
      ),
      route(
        'learning-notes',
        '/learn/notes/:shapeId',
        (c) => LearningNotesPage(shapeId: shape(c)),
        activity: true,
      ),
      route(
        'learning-calculator',
        '/learn/calculator/:shapeId',
        (c) => LearningCalculatorPage(shapeId: shape(c)),
        activity: true,
      ),
      route('learning-labs', '/learn/labs', (_) => const LearningLabsHub()),
      route(
        'learning-net',
        '/learn/labs/net',
        (c) => LearningNetPage(mode: mode(c)),
        activity: true,
      ),
      route(
        'learning-volume',
        '/learn/labs/volume',
        (c) => LearningVolumePage(mode: mode(c)),
        activity: true,
      ),
      route(
        'learning-area',
        '/learn/labs/area',
        (c) => LearningAreaPage(mode: mode(c)),
        activity: true,
      ),
      route(
        'learning-composite',
        '/learn/labs/composite',
        (c) => LearningCompositePage(mode: mode(c)),
        activity: true,
      ),
      route(
        'learning-projection',
        '/learn/projection',
        (c) => LearningProjectionPage(initialShape: shape(c)),
        activity: true,
      ),
      route(
        'learning-calculation',
        '/learn/calculation',
        (c) => LearningCalculationPage(initialShape: shape(c)),
        activity: true,
      ),
      route(
        'learning-records',
        '/learn/records',
        (_) => const LearningRecordsPage(),
      ),
    ],
    localizations: [
      learningStrings,
      learningLabStrings,
      learningSurfaceStrings,
      learningStudioStrings,
    ],
    migrations: [LearningCheckpointRepository.migration],
    services: [
      ServiceFactory(
        key: learningBackCoordinatorKey,
        createService: (_) => back,
        dispose: (value) => value.dispose(),
      ),
      ServiceFactory(
        key: learningCheckpointRepositoryKey,
        createService: (s) => LearningCheckpointRepository(
          database: s.get(FoundationServices.database),
          sessions: s.get(FoundationServices.sessions),
          clock: s.get(FoundationServices.clock),
        ),
      ),
      ServiceFactory(
        key: learningReflectionControllerKey,
        createService: (s) => LearningReflectionController(
          reader: s.get(FoundationServices.recordsReader),
          writer: s.get(FoundationServices.recordsWriter),
          sessions: s.get(FoundationServices.sessions),
        ),
        dispose: (value) => value.dispose(),
      ),
    ],
  );
}
