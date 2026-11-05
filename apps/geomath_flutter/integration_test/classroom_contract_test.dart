import 'package:integration_test/integration_test.dart';

import '../test/features/classroom/classroom_widgets_test.dart' as classroom;

// Device fixture smoke: production classroom repository/controller/widgets and
// bundled neutral geometry, with scripted RPC projections. No hosted writes.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  classroom.main();
}
