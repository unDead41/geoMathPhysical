import '../app/feature_previews.dart';
import 'cloud_game_features.dart';

/// Runs the real foundation root with the cloud/game feature contributions.
Future<void> main() => runCloudGamePreview(
  contributions: cloudGameFeatures(),
  initialRoute: 'cloud-game-play',
);
