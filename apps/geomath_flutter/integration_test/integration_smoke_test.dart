import 'foundation_smoke_test.dart' as foundation;
import 'cloud_game_smoke_test.dart' as cloud_game;
import 'learning_acceptance_test.dart' as learning;
import 'learning_navigation_test.dart' as navigation;
import 'production_app_test.dart' as production;

/// Real Android plugins and canonical offline WebView in a single test APK.
/// Server fixtures in cloud tests do not establish hosted service availability.
void main() {
  foundation.main();
  learning.main();
  navigation.main();
  cloud_game.main();
  production.main();
}
