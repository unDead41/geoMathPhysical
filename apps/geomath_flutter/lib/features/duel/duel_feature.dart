import '../../app/app_dependencies.dart';
import '../../core/features/feature_contribution.dart';
import '../../core/navigation/app_navigation.dart';
import 'duel_controller.dart';
import 'duel_protected_store.dart';
import 'duel_screen.dart';
import 'duel_strings.dart';
import 'duel_transport.dart';

export 'duel_controller.dart';
export 'duel_projection.dart';
export 'duel_protected_store.dart';
export 'duel_screen.dart';
export 'duel_transport.dart';

abstract final class DuelServices {
  static const controller = ServiceKey<DuelController>('duel.controller');
}

/// Native guest Duel. Route names are entry points, never room capabilities.
/// [createController] is the fake HTTP/clock/store seam used by native tests.
FeatureContribution duelFeature({
  DuelController Function(ServiceRegistry services)? createController,
}) {
  DuelController? owner;
  return FeatureContribution(
    id: 'duel',
    localizations: [duelStrings],
    services: [
      ServiceFactory(
        key: DuelServices.controller,
        createService: (services) {
          if (createController != null) {
            return owner = createController(services);
          }
          final connection = services
              .get(FoundationServices.publicBackend)
              .connection()
              .valueOrNull;
          return owner = DuelController(
            sessions: services.get(FoundationServices.sessions),
            lifecycle: services.get(FoundationServices.lifecycle),
            store: SecureDuelProtectedStore(),
            transport: connection == null ? null : IoDuelTransport(connection),
            clock: services.get(FoundationServices.clock),
            random: services.get(FoundationServices.random),
          );
        },
        dispose: (controller) => controller.dispose(),
      ),
    ],
    routes: [
      for (final route in const {
        'cloud-game-duel': '/duel',
        'cloud-game-duel-lobby': '/duel/lobby',
        'cloud-game-duel-match': '/duel/match',
        'cloud-game-duel-result': '/duel/result',
      }.entries)
        FeatureRoute(
          name: route.key,
          path: route.value,
          showNavigation: false,
          backPolicy: (request) async => owner == null
              ? BackDecision.allow
              : owner!.requestBack(request.route.instance),
          builder: (_, services) => DuelScreen(
            controller: services.get(DuelServices.controller),
            geometry: services.get(FoundationServices.geometry),
            audio: services.get(FoundationServices.audio),
          ),
        ),
    ],
  );
}
