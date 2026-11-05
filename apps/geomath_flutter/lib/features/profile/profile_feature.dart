import 'package:flutter/widgets.dart';

import '../../core/features/feature_contribution.dart';
import '../../core/navigation/app_navigation.dart';
import '../auth/auth_services.dart';
import 'data/profile_repository.dart';
import 'data/profile_drafts.dart';
import 'presentation/profile_screen.dart';
import 'profile_services.dart';
import 'profile_strings.dart';

FeatureContribution profileFeature({ProfileRepository? repository}) {
  final pages = <int, GlobalKey<ProfileScreenState>>{};
  return FeatureContribution(
    id: 'profile',
    localizations: [profileStrings],
    services: [
      ServiceFactory<ProfileDrafts>(
        key: ProfileServices.drafts,
        createService: (services) =>
            ProfileDrafts(services.get(ProfileServices.repository).sessions),
        dispose: (value) => value.dispose(),
      ),
      ServiceFactory<ProfileRepository>(
        key: ProfileServices.repository,
        createService: (services) =>
            repository ??
            GatewayProfileRepository(services.get(AuthServices.gateway)),
      ),
    ],
    routes: [
      FeatureRoute(
        name: 'cloud-game-profile',
        path: '/profile',
        builder: (context, services) {
          final instance = AppRouteScope.of(context).entry.instance;
          final key = pages.putIfAbsent(
            instance,
            () => GlobalKey<ProfileScreenState>(),
          );
          return ProfileScreen(
            key: key,
            repository: services.get(ProfileServices.repository),
            drafts: services.get(ProfileServices.drafts),
            onDispose: () => pages.remove(instance),
          );
        },
        backPolicy: (request) async =>
            pages[request.route.instance]?.currentState?.requestLeave() ??
            BackDecision.allow,
      ),
    ],
  );
}
