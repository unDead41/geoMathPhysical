import '../../../core/features/service_registry.dart';
import '../../../core/navigation/app_navigation.dart';
import '../persistence/learning_checkpoint_repository.dart';

const learningCheckpointRepositoryKey =
    ServiceKey<LearningCheckpointRepository>('learning.checkpoints');
const learningBackCoordinatorKey = ServiceKey<LearningBackCoordinator>(
  'learning.back',
);

/// Route-specific checkpoint guards join the existing foundation Back owner.
/// This class never creates a Navigator or listens to platform lifecycle.
final class LearningBackCoordinator {
  final Map<int, Future<BackDecision> Function()> _guards = {};
  void register(int instance, Future<BackDecision> Function() guard) =>
      _guards[instance] = guard;
  void unregister(int instance) => _guards.remove(instance);
  Future<BackDecision> request(BackRequest request) async =>
      await _guards[request.route.instance]?.call() ?? BackDecision.allow;
  void dispose() => _guards.clear();
}
