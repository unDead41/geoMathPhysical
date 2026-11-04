import '../core/features/feature_contribution.dart';
import 'app.dart';

/// Called by Prompt 2's lib/dev/learning_main.dart with its own contribution.
Future<void> runLearningPreview({
  required List<FeatureContribution> contributions,
  required String initialRoute,
}) => runGeoMath(features: contributions, initialRoute: initialRoute);

/// Called by Prompt 3's lib/dev/cloud_game_main.dart with its own contribution.
Future<void> runCloudGamePreview({
  required List<FeatureContribution> contributions,
  required String initialRoute,
}) => runGeoMath(features: contributions, initialRoute: initialRoute);
