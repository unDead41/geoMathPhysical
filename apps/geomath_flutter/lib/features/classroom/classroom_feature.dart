import 'package:flutter/widgets.dart';

import '../../app/app_dependencies.dart';
import '../../core/features/feature_contribution.dart';
import '../../core/l10n/app_strings.dart';
import '../../core/navigation/app_navigation.dart';
import '../../core/widgets/widgets.dart';
import '../auth/auth_services.dart';
import 'application/classroom_controller.dart';
import 'data/classroom_bank.dart';
import 'data/classroom_repository.dart';
import 'presentation/classroom_screen.dart';
import 'presentation/classroom_strings.dart';

export 'application/classroom_controller.dart';
export 'data/classroom_bank.dart';
export 'data/classroom_repository.dart';
export 'domain/classroom_models.dart';
export 'presentation/classroom_screen.dart';

abstract final class ClassroomServices {
  static const repository = ServiceKey<ClassroomRepository>(
    'classroom.repository',
  );
  static const controller = ServiceKey<ClassroomController>(
    'classroom.controller',
  );
  static const bank = ServiceKey<ClassroomBank>('classroom.bank');
}

FeatureContribution classroomFeature() {
  ClassroomController? activeController;
  BuildContext? activeContext;
  return FeatureContribution(
    id: 'classroom',
    localizations: [classroomLocalizations],
    services: [
      ServiceFactory<ClassroomRepository>(
        key: ClassroomServices.repository,
        createService: (services) {
          final gateway = services.get(AuthServices.gateway);
          return ClassroomRepository(
            gateway: gateway,
            sessions: gateway.sessions,
          );
        },
      ),
      ServiceFactory<ClassroomBank>(
        key: ClassroomServices.bank,
        createService: (_) => ClassroomBank(),
      ),
      ServiceFactory<ClassroomController>(
        key: ClassroomServices.controller,
        createService: (services) => activeController = ClassroomController(
          repository: services.get(ClassroomServices.repository),
          sessions: services.get(FoundationServices.sessions),
          clock: services.get(FoundationServices.clock),
          random: services.get(FoundationServices.random),
          lifecycle: services.get(FoundationServices.lifecycle),
        ),
        dispose: (controller) => controller.dispose(),
      ),
    ],
    routes: [
      FeatureRoute(
        name: 'cloud-game-classes',
        path: '/classes',
        backPolicy: (request) async {
          final controller = activeController, context = activeContext;
          if (controller == null || context == null || !context.mounted) {
            return BackDecision.allow;
          }
          if (controller.mutating || controller.management != null) {
            return BackDecision.stay;
          }
          // A destination reset also visits covered pages. An idle dashboard
          // has no draft/attempt to protect, including below the sign-in page.
          if (controller.attempt == null && controller.selectedRoomId == null) {
            return BackDecision.allow;
          }
          final route = AppRouteScope.maybeOf(context);
          if (route != null &&
              (route.entry.instance != request.route.instance ||
                  !route.isCurrent)) {
            return BackDecision.stay;
          }
          if (controller.attempt != null) {
            final strings = AppStrings.of(context),
                scope = controller.captureScope();
            final routeInstance =
                route?.entry.instance ?? request.route.instance;
            final yes = await showGeoMathConfirmation(
              context,
              title: strings.text('classroom.leaveGame'),
              message: strings.text('classroom.leaveConfirm'),
              confirmLabel: strings.text('classroom.confirm'),
              cancelLabel: strings.text('classroom.cancel'),
            );
            if (yes &&
                context.mounted &&
                identical(activeContext, context) &&
                controller.isScopeCurrent(scope)) {
              final currentRoute = AppRouteScope.maybeOf(context);
              if ((currentRoute?.entry.instance ?? request.route.instance) ==
                      routeInstance &&
                  (currentRoute?.isCurrent ?? true)) {
                controller.leaveGame(expectedScope: scope);
              }
            }
            return BackDecision.stay;
          }
          if (controller.selectedRoomId != null) {
            controller.dashboard();
            return BackDecision.stay;
          }
          return BackDecision.allow;
        },
        builder: (context, services) {
          activeContext = context;
          return ClassroomScreen(
            controller: services.get(ClassroomServices.controller),
            geometry: services.get(FoundationServices.geometry),
            bank: services.get(ClassroomServices.bank),
            onLogin: () => AppScope.of(context).router.open('cloud-game-login'),
          );
        },
      ),
    ],
  );
}
