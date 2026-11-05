import '../../app/app_dependencies.dart';
import '../../core/features/feature_contribution.dart';
import 'auth_services.dart';
import 'auth_strings.dart';
import 'data/auth_repository.dart';
import 'data/cloud_gateway.dart';
import 'data/native_auth_repository.dart';
import 'presentation/auth_screen.dart';
import 'presentation/sessions_screen.dart';

FeatureContribution authFeature({
  AuthRepository? repository,
  CloudGateway? gateway,
  bool nativeCallbackReady = false,
}) => FeatureContribution(
  id: 'auth',
  localizations: [authStrings],
  services: [
    ServiceFactory<AuthRepository>(
      key: AuthServices.repository,
      createService: (services) =>
          repository ??
          NativeAuthRepository(
            sessions: services.get(FoundationServices.sessionController),
            store: services.get(FoundationServices.protectedSessions),
            configuration: services.get(FoundationServices.publicBackend),
            nativeCallbackReady: nativeCallbackReady,
          ),
      dispose: repository == null ? (value) => value.dispose() : null,
    ),
    ServiceFactory<CloudGateway>(
      key: AuthServices.gateway,
      createService: (services) {
        if (gateway != null) return gateway;
        final auth = services.get(AuthServices.repository);
        if (auth is CloudGateway) return auth as CloudGateway;
        throw StateError(
          'An injected auth repository needs an injected CloudGateway.',
        );
      },
    ),
  ],
  routes: [
    for (final entry in <(String, String, AuthScreenMode)>[
      ('cloud-game-login', '/auth/login', AuthScreenMode.login),
      ('cloud-game-signup', '/auth/signup', AuthScreenMode.signup),
      ('cloud-game-recover', '/auth/recover', AuthScreenMode.recover),
      (
        'cloud-game-legacy-recovery',
        '/auth/legacy-recovery',
        AuthScreenMode.legacyRecovery,
      ),
      ('cloud-game-confirmation', '/auth/verify', AuthScreenMode.confirmation),
      ('cloud-game-reset', '/auth/reset', AuthScreenMode.reset),
      ('cloud-game-security', '/account/security', AuthScreenMode.security),
    ])
      FeatureRoute(
        name: entry.$1,
        path: entry.$2,
        builder: (_, services) => AuthScreen(
          repository: services.get(AuthServices.repository),
          mode: entry.$3,
        ),
      ),
    FeatureRoute(
      name: 'cloud-game-sessions',
      path: '/account/sessions',
      builder: (_, services) =>
          SessionsScreen(repository: services.get(AuthServices.repository)),
    ),
  ],
);
