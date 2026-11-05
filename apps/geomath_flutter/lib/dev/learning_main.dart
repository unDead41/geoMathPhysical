import '../app/feature_previews.dart';
import '../features/learning/learning_feature.dart';

Future<void> main() => runLearningPreview(
  contributions: [learningFeature()],
  initialRoute: 'learning',
);
