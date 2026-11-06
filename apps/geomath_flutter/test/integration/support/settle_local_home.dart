import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';

/// SQLite FFI completes on a real isolate. Await its actual owners outside the
/// test clock before asserting the Home read models or disposing their app.
Future<void> settleLocalHome(WidgetTester tester, AppDependencies app) async {
  await tester.pump();
  await tester.runAsync(() async {
    await app.records.watchReflections(app.sessions.current).first;
    await app.database.query('SELECT 1');
  });
  await tester.pumpAndSettle();
}
