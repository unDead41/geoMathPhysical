import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/learning/learning_feature.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

// Android regression for the contributed leave guard. A real WebView, canonical
// calculation document and SQLite are used. SQL triggers inject a real failed
// commit; they do not replace the platform, controller or repository with fakes.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'bottom destination flushes the live canonical draft before reset',
    (tester) async {
      final app = await _open(tester);
      addTearDown(app.dispose);
      final router = _router(tester);
      router.open('learning-calculation', arguments: {'shapeId': 'cube'});
      final view = await _ready(tester);
      final repository = app.composition.services.get(
        learningCheckpointRepositoryKey,
      );
      final actor = app.sessions.current;
      await _until(tester, () async {
        return (await repository.read(actor, _slot)).valueOrNull != null;
      });
      final previous = (await repository.read(actor, _slot)).valueOrNull!;
      final nextValue = _dimension(previous) == '7.25' ? '8.25' : '7.25';
      await _edit(tester, view, nextValue);
      // No two-second autosave wait: destination navigation owns this flush.
      router.select(AppDestination.home);
      await _until(
        tester,
        () async => router.navigation.current.route.name == 'home',
      );
      expect(
        _dimension((await repository.read(actor, _slot)).valueOrNull!),
        nextValue,
        reason:
            'Home must not become current before the latest draft is durable.',
      );
      router.open('learning-calculation', arguments: {'shapeId': 'cube'});
      final reopened = await _ready(tester);
      await _until(tester, () async {
        final checkpoint = (await _snapshot(reopened))['checkpoint'];
        return checkpoint is Map && _dimension(checkpoint) == nextValue;
      });
      expect(
        _dimension((await _snapshot(reopened))['checkpoint'] as Map),
        nextValue,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
    timeout: const Timeout(Duration(minutes: 3)),
  );

  testWidgets(
    'failed destination checkpoint supports Stay and explicit Leave',
    (tester) async {
      final app = await _open(tester);
      addTearDown(app.dispose);
      final router = _router(tester);
      router.open('learning-calculation', arguments: {'shapeId': 'cube'});
      final view = await _ready(tester);
      final repository = app.composition.services.get(
        learningCheckpointRepositoryKey,
      );
      final actor = app.sessions.current;
      await _until(tester, () async {
        return (await repository.read(actor, _slot)).valueOrNull != null;
      });
      final stored = (await repository.read(actor, _slot)).valueOrNull!;
      final before = _dimension(stored);
      final edited = before == '9.125' ? '8.125' : '9.125';
      // Keep reads and all other app tables live. Only checkpoint persistence fails.
      await app.database.transaction((transaction) async {
        await transaction.execute('''
        CREATE TRIGGER qa_checkpoint_disk_failure
        BEFORE INSERT ON learning_checkpoints
        BEGIN SELECT RAISE(ABORT, 'qa checkpoint storage unavailable'); END
      ''');
      });
      await _edit(tester, view, edited);
      final routeInstance = router.navigation.current.instance;
      router.select(AppDestination.home);
      await _until(
        tester,
        () async => find.text('Draf belum disimpan').evaluate().isNotEmpty,
      );
      expect(router.navigation.current.instance, routeInstance);
      await tester.tap(find.widgetWithText(TextButton, 'Kekal'));
      await tester.pump(const Duration(milliseconds: 250));
      expect(router.navigation.current.instance, routeInstance);
      expect(_dimension((await _snapshot(view))['checkpoint'] as Map), edited);
      expect(
        _dimension((await repository.read(actor, _slot)).valueOrNull!),
        before,
      );

      router.select(AppDestination.home);
      await _until(
        tester,
        () async => find.text('Draf belum disimpan').evaluate().isNotEmpty,
      );
      await tester.tap(find.widgetWithText(TextButton, 'Keluar'));
      await _until(
        tester,
        () async => router.navigation.current.route.name == 'home',
      );
      expect(
        _dimension((await repository.read(actor, _slot)).valueOrNull!),
        before,
        reason: 'Explicit Leave cannot manufacture a successful durable save.',
      );
      await app.database.transaction(
        (transaction) =>
            transaction.execute('DROP TRIGGER qa_checkpoint_disk_failure'),
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
    timeout: const Timeout(Duration(minutes: 3)),
  );
}

const _slot = 'calculation:cube:default';

Future<AppDependencies> _open(WidgetTester tester) async {
  expect(defaultTargetPlatform, TargetPlatform.android);
  final directory = await getTemporaryDirectory();
  final opened = await AppDependencies.bootstrap(
    features: [learningFeature()],
    databasePath:
        '${directory.path}/learning-tab-qa-${DateTime.now().microsecondsSinceEpoch}.db',
  );
  expect(opened, isA<Success<AppDependencies>>());
  final app = opened.valueOrNull!;
  expect(
    await app.preferences.save(
      const AppPreferences(
        language: AppLanguage.ms,
        theme: AppTheme.light,
        reducedMotion: true,
        musicEnabled: false,
        soundEnabled: false,
      ),
    ),
    isA<Success<void>>(),
  );
  await tester.pumpWidget(
    GeoMathApp(
      key: ObjectKey(app),
      dependencies: app,
      initialRoute: 'learning',
    ),
  );
  await tester.pump(const Duration(milliseconds: 250));
  return app;
}

GeoMathRouter _router(WidgetTester tester) =>
    AppScope.of(tester.element(find.byType(GeoMathScaffold).last)).router;

WebViewController _view(WidgetTester tester) => WebViewController.fromPlatform(
  tester
      .widget<WebViewWidget>(find.byType(WebViewWidget).last)
      .platform
      .params
      .controller,
);

Future<WebViewController> _ready(WidgetTester tester) async {
  WebViewController? view;
  await _until(tester, () async {
    if (find.byType(WebViewWidget).evaluate().isEmpty) return false;
    view = _view(tester);
    final inputGate = find.ancestor(
      of: find.byType(WebViewWidget).last,
      matching: find.byType(AbsorbPointer),
    );
    if (inputGate.evaluate().isEmpty ||
        tester.widget<AbsorbPointer>(inputGate.first).absorbing) {
      // The real native controller has not finished launch/SQLite restore yet.
      return false;
    }
    final state = await _json(
      view!,
      'window.GeoMathModule?.learningSnapshot?.() ?? {}',
    );
    final native = await _json(
      view!,
      'window.GeoMathModule?.diagnostics?.() ?? {}',
    );
    return native['readyAcknowledged'] == true &&
        native['active'] == true &&
        state['ready'] == true &&
        state['pending'] != true &&
        (state['checkpoint'] as Map?)?['section'] == 'calculation';
  }, timeout: const Duration(seconds: 60));
  await tester.pump(const Duration(milliseconds: 400));
  return view!;
}

String _dimension(Map checkpoint) =>
    (((checkpoint['calculation'] as Map)['draft'] as Map)['dimensions']
            as Map)['a']
        as String;

Future<void> _edit(
  WidgetTester tester,
  WebViewController view,
  String value,
) async {
  final captured = (await _snapshot(view))['checkpoint'] as Map;
  final checkpoint = Map<String, Object?>.from(
    jsonDecode(jsonEncode(captured)) as Map,
  );
  (((checkpoint['calculation'] as Map)['draft'] as Map)['dimensions']
          as Map)['a'] =
      value;
  Map<String, Object?>? accepted;
  await _until(tester, () async {
    accepted = await _json(
      view,
      'window.GeoMathModule.learningAction(${jsonEncode({'action': 'restore', 'checkpoint': checkpoint})})',
    );
    return accepted!['accepted'] == true;
  });
  final sequence = accepted!['sequence'] as int;
  await _until(tester, () async {
    final state = await _snapshot(view);
    return state['pending'] != true &&
        (state['sequence'] as num) >= sequence &&
        _dimension(state['checkpoint'] as Map) == value;
  });
}

Future<Map<String, Object?>> _snapshot(WebViewController view) =>
    _json(view, 'window.GeoMathModule.learningSnapshot()');

Future<Map<String, Object?>> _json(
  WebViewController view,
  String expression,
) async {
  Object? value = await view
      .runJavaScriptReturningResult('JSON.stringify($expression)')
      .timeout(const Duration(seconds: 3));
  while (value is String) {
    value = jsonDecode(value);
  }
  if (value is! Map) {
    fail('The real WebView returned no object for $expression: $value');
  }
  return Map<String, Object?>.from(value);
}

Future<void> _until(
  WidgetTester tester,
  Future<bool> Function() accept, {
  Duration timeout = const Duration(seconds: 15),
}) async {
  // Rebuild Navigator before inspecting a newly pushed same-section route.
  await tester.pump();
  final deadline = DateTime.now().add(timeout);
  Object? lastError;
  while (DateTime.now().isBefore(deadline)) {
    try {
      if (await accept().timeout(deadline.difference(DateTime.now()))) return;
    } on PlatformException catch (error) {
      lastError = error;
    } on TimeoutException catch (error) {
      lastError = error;
    }
    await tester.pump(const Duration(milliseconds: 60));
  }
  fail(
    'Timed out waiting for the real learning navigation condition. '
    'Last platform error: $lastError',
  );
}
