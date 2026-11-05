import '../../app/app_dependencies.dart';
import '../../core/features/feature_contribution.dart';
import '../../core/navigation/app_navigation.dart';
import 'data/solo_repository.dart';
import 'presentation/solo_pages.dart';
import 'presentation/solo_strings.dart';
import 'solo_controller.dart';

export 'data/solo_repository.dart'
    show SoloRepository, SoloSlot, SoloScore, soloMigrations;
export 'domain/solo_bank.dart';
export 'domain/solo_game.dart';
export 'solo_controller.dart';

abstract final class SoloServices {
  static const repository = ServiceKey<SoloRepository>('solo.repository');
  static const controller = ServiceKey<SoloController>('solo.controller');
}

FeatureContribution soloFeature() {
  SoloController? active;
  return FeatureContribution(
    id: 'solo',
    migrations: soloMigrations(),
    localizations: [soloStrings()],
    services: [
      ServiceFactory<SoloRepository>(
        key: SoloServices.repository,
        createService: (s) => SoloRepository(
          database: s.get(FoundationServices.database),
          sessions: s.get(FoundationServices.sessions),
          writer: s.get(FoundationServices.recordsWriter),
          clock: s.get(FoundationServices.clock),
        ),
        dispose: (repository) => repository.drain(),
      ),
      ServiceFactory<SoloController>(
        key: SoloServices.controller,
        createService: (s) => active = SoloController(
          repository: s.get(SoloServices.repository),
          sessions: s.get(FoundationServices.sessions),
          clock: s.get(FoundationServices.clock),
          random: s.get(FoundationServices.random),
          lifecycle: s.get(FoundationServices.lifecycle),
        ),
        dispose: (controller) => controller.dispose(),
      ),
    ],
    routes: [
      FeatureRoute(
        name: 'cloud-game-play',
        path: '/play',
        builder: (_, s) =>
            SoloPlayPage(controller: s.get(SoloServices.controller)),
      ),
      FeatureRoute(
        name: 'solo-resume',
        path: '/play/resume',
        builder: (_, s) =>
            SoloResumePage(controller: s.get(SoloServices.controller)),
      ),
      FeatureRoute(
        name: 'solo-game',
        path: '/play/solo',
        showNavigation: false,
        backPolicy: (_) async {
          final controller = active;
          if (controller == null || controller.game == null) {
            return BackDecision.allow;
          }
          return await controller.leave()
              ? BackDecision.allow
              : BackDecision.stay;
        },
        builder: (_, s) => SoloGamePage(
          controller: s.get(SoloServices.controller),
          geometry: s.get(FoundationServices.geometry),
        ),
      ),
      FeatureRoute(
        name: 'solo-scores',
        path: '/play/scores',
        builder: (_, s) =>
            SoloScoresPage(controller: s.get(SoloServices.controller)),
      ),
    ],
  );
}
