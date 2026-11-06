import 'dart:async';

import '../../app/app_dependencies.dart';
import '../../core/features/feature_contribution.dart';
import '../../core/navigation/app_navigation.dart';
import '../../core/runtime/random_source.dart';
import 'ai_battle_strings.dart';
import 'application/ai_battle_controller.dart';
import 'data/ai_battle_repository.dart';
import 'presentation/ai_battle_screen.dart';

export 'application/ai_battle_controller.dart';
export 'data/ai_battle_repository.dart';
export 'domain/ai_battle_game.dart';
export 'domain/ai_policy.dart';

abstract final class AiBattleServices {
  static const repository = ServiceKey<AiBattleRepository>(
    'ai_battle.repository',
  );
  static const controller = ServiceKey<AiBattleController>(
    'ai_battle.controller',
  );
}

/// An offline contribution. Solo's feature composes these registrations so the
/// existing production factory needs no shared/root change.
FeatureContribution aiBattleFeature() {
  AiBattleController? active;
  return FeatureContribution(
    id: 'ai_battle',
    migrations: aiBattleMigrations(),
    localizations: [aiBattleStrings()],
    services: [
      ServiceFactory<AiBattleRepository>(
        key: AiBattleServices.repository,
        createService: (services) => AiBattleRepository(
          database: services.get(FoundationServices.database),
          sessions: services.get(FoundationServices.sessions),
        ),
        dispose: (repository) => repository.drain(),
      ),
      ServiceFactory<AiBattleController>(
        key: AiBattleServices.controller,
        createService: (services) => active = AiBattleController(
          repository: services.get(AiBattleServices.repository),
          sessions: services.get(FoundationServices.sessions),
          clock: services.get(FoundationServices.clock),
          playerRandom: services.get(FoundationServices.random),
          // AI decisions never consume the player's round/card draw stream.
          aiRandom: SecureRandomSource(),
          lifecycle: services.get(FoundationServices.lifecycle),
        ),
        dispose: (controller) => controller.dispose(),
      ),
    ],
    routes: [
      FeatureRoute(
        name: 'ai-battle',
        path: '/play/ai',
        showNavigation: false,
        backPolicy: (_) async {
          final controller = active;
          return controller == null || await controller.leave()
              ? BackDecision.allow
              : BackDecision.stay;
        },
        builder: (_, services) {
          final controller = services.get(AiBattleServices.controller);
          unawaited(controller.initialize());
          return AiBattleScreen(
            controller: controller,
            geometry: services.get(FoundationServices.geometry),
          );
        },
      ),
    ],
  );
}
