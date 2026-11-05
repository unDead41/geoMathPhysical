import 'app_flow_test.dart' as app_flow;
import 'module_spike_test.dart' as module_spike;

// One Android test application runs both real-plugin scenarios. Individual
// targets remain available for focused debugging without rebuilding the suite.
void main() {
  module_spike.main();
  app_flow.main();
}
