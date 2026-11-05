import '../core/features/feature_contribution.dart';
import '../core/result.dart';
import '../features/learning/learning_feature.dart';
import 'app_dependencies.dart';
import 'cloud_game_features.dart';

/// Exactly one set of feature owners for the installed application.
List<FeatureContribution> productionFeatures() => [
  learningFeature(),
  ...cloudGameFeatures(),
];

Future<Result<void>> initializeProduction(AppDependencies dependencies) =>
    dependencies.composition.services
        .get(CloudGamePreviewServices.startup)
        .ready;
