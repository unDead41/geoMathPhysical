import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/app_router.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/preferences/preferences.dart';
import 'package:geomath_flutter/core/records/formative_record.dart';
import 'package:geomath_flutter/core/records/formative_records.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/learning/learning_feature.dart';
import 'package:geomath_flutter/features/learning/module_spike_host.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_reflection_controller.dart';
import 'package:integration_test/integration_test.dart';
import 'package:path_provider/path_provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

// Android only. Uses the production contribution, SQLite, asset verifier,
// native host, and real WebView. No platform view or JS bridge is replaced.
// Run the evidence/run_learning_android.sh helper for the learning APK and PNGs.
void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  const screenshots = bool.fromEnvironment('LEARNING_SCREENSHOTS');
  const visualMatrix = bool.fromEnvironment('LEARNING_VISUAL_MATRIX');
  var surfaceConverted = false;

  Future<void> capture(WidgetTester tester, String name) async {
    if (!screenshots) return;
    if (!surfaceConverted) {
      await binding.convertFlutterSurfaceToImage();
      surfaceConverted = true;
    }
    await tester.pump(const Duration(milliseconds: 250));
    await binding.takeScreenshot(name);
  }

  testWidgets(
    '13 learning screens render the pinned offline module and all models/modes',
    (tester) async {
      expect(defaultTargetPlatform, TargetPlatform.android);
      final app = await _openApp(tester);
      addTearDown(app.dispose);
      final router = _router(tester);
      await capture(tester, '25-learning-hub-ms-light-100');
      const routes = <String, String?>{
        '/learn/explore': 'explore',
        '/learn/views': 'views',
        '/learn/notes/cube': 'notes',
        '/learn/calculator/cube': 'calculator',
        '/learn/labs/net': 'net',
        '/learn/labs/volume': 'volume',
        '/learn/labs/area': 'area',
        '/learn/labs/composite': 'composite',
        '/learn/labs': null,
        '/learn/projection': 'projection',
        '/learn/calculation': 'calculation',
        '/learn/records': null,
      };
      var number = 26;
      for (final entry in routes.entries) {
        _openPath(app, router, entry.key);
        await tester.pump();
        if (entry.value case final section?) {
          final view = await _readyView(tester, section);
          expect(
            await view.currentUrl(),
            ModuleSpikeController.trustedAssetUrl,
          );
          final state = await _snapshot(view);
          expect((state['checkpoint'] as Map)['sourceCommit'], _sourceCommit);
          expect((state['checkpoint'] as Map)['moduleVersion'], '1.6.2');
          expect(
            (state['diagnostics'] as Map)['meshSource'],
            'learning-mesh.mjs/studySolidMesh',
          );
          if (['explore', 'notes', 'calculator'].contains(section)) {
            for (final shape in _models) {
              final result = await _act(tester, view, {
                'action': 'launch',
                'section': section,
                'shape': shape,
              });
              expect((result['diagnostics'] as Map)['shape'], shape);
              expect((result['diagnostics'] as Map)['modelCount'], 11);
            }
            if (section == 'explore') {
              final rejected = await _act(tester, view, {
                'action': 'fold',
                'value': 0.5,
              }, succeeds: false);
              expect((rejected['result'] as Map)['error'], 'net-unavailable');
              expect((rejected['diagnostics'] as Map)['shape'], 'hemisphere');
            }
            await _act(tester, view, {
              'action': 'launch',
              'section': section,
              'shape': 'cube',
            });
          }
          if (section == 'views') {
            for (final direction in [
              'front',
              'back',
              'left',
              'right',
              'top',
              'bottom',
            ]) {
              final result = await _act(tester, view, {
                'action': 'view',
                'view': direction,
              });
              expect(
                ((result['checkpoint'] as Map)['explore'] as Map)['view'],
                direction,
              );
            }
          }
          final modes = _labModes[section];
          if (modes != null) {
            for (final mode in modes) {
              final result = await _act(tester, view, {
                'action': 'launch',
                'section': section,
                'mode': mode,
              });
              expect((result['diagnostics'] as Map)['labKind'], section);
              expect((result['diagnostics'] as Map)['labMode'], mode);
            }
          }
          if (section == 'projection') {
            for (final shape in _projectionModels) {
              final result = await _act(tester, view, {
                'action': 'launch',
                'section': section,
                'shape': shape,
              });
              expect((result['diagnostics'] as Map)['projectionShape'], shape);
            }
            await _projectionRestoreUndo(tester, view);
          }
        } else {
          await tester.pump(const Duration(milliseconds: 250));
          expect(find.byType(GeoMathScaffold), findsWidgets);
        }
        final screen = entry.key == '/learn/records' ? 41 : number++;
        final name =
            '$screen-${entry.key.substring(1).replaceAll('/', '-')}-ms-light-100';
        await capture(tester, name);
        if (visualMatrix) {
          for (final language in AppLanguage.values) {
            for (final theme in [AppTheme.light, AppTheme.dark]) {
              for (final contrast in [false, true]) {
                await _savePreferences(
                  tester,
                  app,
                  language: language,
                  theme: theme,
                  contrast: contrast,
                );
                await capture(
                  tester,
                  '$screen-${entry.key.substring(1).replaceAll('/', '-')}-${language.name}-${theme.name}-${contrast ? 'contrast-150' : '100'}',
                );
              }
            }
          }
          await _savePreferences(tester, app);
        }
        expect(tester.takeException(), isNull, reason: entry.key);
        expect(await router.popRoute(), isTrue);
        await tester.pump(const Duration(milliseconds: 250));
        expect(router.navigation.current.route.name, 'learning');
      }
      await tester.pumpWidget(const SizedBox.shrink());
    },
    timeout: const Timeout(Duration(minutes: 12)),
  );

  testWidgets(
    'real WebView preserves geometry, palette, checkpoint and native ownership',
    (tester) async {
      final app = await _openApp(tester);
      addTearDown(app.dispose);
      final router = _router(tester);
      _openPath(app, router, '/learn/explore');
      final first = await _readyView(tester, 'explore');
      final initial = await _nativeDiagnostics(first);
      final instance = initial['instanceId'];
      await _act(tester, first, {'action': 'pause'});
      await _act(tester, first, {
        'action': 'rotate',
        'yaw': 0.18,
        'pitch': -0.12,
      });
      await _act(tester, first, {'action': 'fold', 'value': 0.61});
      var state = await _act(tester, first, {'action': 'checkpoint'});
      final pose = Map<String, Object?>.from(
        (state['checkpoint'] as Map)['explore'] as Map,
      );
      final palette = List<Object?>.from(
        (state['diagnostics'] as Map)['faceColors'] as List,
      );
      expect(
        palette.map((color) => '$color'.toUpperCase()),
        orderedEquals(_palette),
      );
      final cubeCheckpoint = state['checkpoint'];
      await _act(tester, first, {
        'action': 'launch',
        'section': 'explore',
        'shape': 'cuboid',
      });
      await _act(tester, first, {'action': 'fold', 'value': 0.4});
      final cuboid = await _act(tester, first, {
        'action': 'rotate',
        'yaw': -0.2,
        'pitch': 0.1,
      });
      expect((cuboid['diagnostics'] as Map)['faceColors'], palette);
      await _act(tester, first, {
        'action': 'restore',
        'checkpoint': cubeCheckpoint,
      });
      for (final language in AppLanguage.values) {
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await _savePreferences(
            tester,
            app,
            language: language,
            theme: theme,
            contrast: true,
          );
          final changed = await _waitNative(tester, first, (value) {
            final settings = value['settings'] as Map?;
            return settings?['language'] == language.name &&
                settings?['contrast'] == 'strong' &&
                settings?['textSize'] == 150;
          });
          expect(changed['instanceId'], instance);
          expect(
            Theme.of(tester.element(find.byType(GeoMathScaffold).last))
                .brightness,
            theme == AppTheme.dark ? Brightness.dark : Brightness.light,
          );
          expect(identical(_view(tester).platform, first.platform), isTrue);
          state = await _act(tester, first, {'action': 'checkpoint'});
          _expectPose((state['checkpoint'] as Map)['explore'] as Map, pose);
          expect((state['diagnostics'] as Map)['faceColors'], palette);
          await capture(
            tester,
            '26-explore-${language.name}-${theme.name}-contrast-150',
          );
        }
      }
      // This checks the shared lifecycle adapter; physical OS backgrounding is
      // a separate manual evidence item and is not inferred from this signal.
      app.lifecycle.setPhase(AppLifecyclePhase.background);
      await _waitNative(tester, first, (value) => value['active'] == false);
      app.lifecycle.setPhase(AppLifecyclePhase.foreground);
      final resumed = await _waitNative(
        tester,
        first,
        (value) => value['active'] == true,
      );
      expect(resumed['instanceId'], instance);
      state = await _act(tester, first, {'action': 'checkpoint'});
      _expectPose((state['checkpoint'] as Map)['explore'] as Map, pose);

      final actor = app.sessions.current;
      // System Back goes through the production checkpoint guard.
      expect(await router.popRoute(), isTrue);
      await tester.pump(const Duration(milliseconds: 300));
      final repository = app.composition.services.get(
        learningCheckpointRepositoryKey,
      );
      final stored = await repository.read(actor, 'explore:cube:default');
      expect(stored, isA<Success<Map<String, Object?>?>>());
      final checkpoint = (stored as Success<Map<String, Object?>?>).value!;
      _expectPose(checkpoint['explore'] as Map, pose);
      _openPath(app, router, '/learn/explore');
      final reopened = await _readyView(tester, 'explore');
      await _until(tester, () async {
        final checkpoint = (await _snapshot(reopened))['checkpoint'] as Map?;
        return checkpoint != null &&
            _samePose(checkpoint['explore'] as Map, pose);
      });
      expect(
        (await _nativeDiagnostics(reopened))['instanceId'],
        isNot(instance),
      );

      final reflectionController = app.composition.services.get(
        learningReflectionControllerKey,
      );
      final before = reflectionController.records
          .map((record) => record.toJson())
          .toList();
      final reopenedInstance = (await _nativeDiagnostics(
        reopened,
      ))['instanceId'];
      for (final message in [
        '{',
        jsonEncode({
          'nativeBridgeVersion': 1,
          'instanceId': reopenedInstance,
          'bridgeSession': 'forged-session',
          'command': 'ready',
          'payload': <String, Object?>{},
        }),
        jsonEncode({
          'nativeBridgeVersion': 1,
          'instanceId': reopenedInstance,
          'bridgeSession': 'forged-session',
          'command': 'progress',
          'payload': {'protocol': 1, 'ownerId': 'qa-injected-owner'},
        }),
        'x' * 65537,
      ]) {
        await reopened.runJavaScript(
          'window.GeoMathNative.postMessage(${jsonEncode(message)})',
        );
      }
      await tester.pump(const Duration(milliseconds: 400));
      expect(
        reflectionController.records.map((record) => record.toJson()).toList(),
        before,
      );
      expect(reflectionController.lastReceipt, isNull);
      expect(
        (await _nativeDiagnostics(reopened))['instanceId'],
        reopenedInstance,
      );

      app.sessions.logout();
      await tester.pump(const Duration(milliseconds: 400));
      expect(app.sessions.current.epoch, greaterThan(actor.epoch));
      expect(app.sessions.current.partition, actor.partition);
      final stale = await _nativeDiagnostics(reopened);
      expect(stale['active'], isFalse);
      expect(reflectionController.lastReceipt, isNull);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
    timeout: const Timeout(Duration(minutes: 4)),
  );

  testWidgets(
    'workflow seeds stay with their native actor and Reopen keeps the latest draft',
    (tester) async {
      final app = await _openApp(tester);
      addTearDown(app.dispose);
      final router = _router(tester);
      final repository = app.composition.services.get(
        learningCheckpointRepositoryKey,
      );
      final actorA = app.sessions.current;
      const slot = 'calculation:cube:default';
      String dimension(Map checkpoint) =>
          (((checkpoint['calculation'] as Map)['draft'] as Map)['dimensions']
                  as Map)['a']
              as String;
      Map<String, Object?> copy(Map checkpoint) =>
          Map<String, Object?>.from(jsonDecode(jsonEncode(checkpoint)) as Map);
      void setDimension(Map checkpoint, String value) {
        (((checkpoint['calculation'] as Map)['draft'] as Map)['dimensions']
                as Map)['a'] =
            value;
      }

      Future<WebViewController> reopen(WebViewController previous) async {
        // A real platform document replacement trips the production main-frame
        // trust guard. No WebView, host callback or asset verifier is mocked.
        await previous.loadHtmlString(
          '<!doctype html><title>QA untrusted replacement document</title>',
        );
        final retries = find.widgetWithText(ActionButton, 'Buka semula');
        await _until(tester, () async => retries.evaluate().isNotEmpty);
        final retry = retries.last;
        await tester.ensureVisible(retry);
        await tester.tap(retry);
        await tester.pump();
        final next = await _readyView(tester, 'calculation');
        expect(identical(next.platform, previous.platform), isFalse);
        return next;
      }

      _openPath(app, router, '/learn/notes/cube');
      final notes = await _readyView(tester, 'notes');
      final notesState = copy(
        (await _act(tester, notes, {'action': 'checkpoint'}))['checkpoint']
            as Map,
      );
      ((notesState['notes'] as Map)['dimensions'] as Map)['a'] = '7.5';
      await _act(tester, notes, {
        'action': 'restore',
        'checkpoint': notesState,
      });
      final tools = find.widgetWithText(ExpansionTile, 'Alat pembelajaran');
      await tester.ensureVisible(tools);
      await tester.tap(tools);
      await tester.pump(const Duration(milliseconds: 250));
      final workflow = find.byKey(
        const ValueKey('model-action-calculation-workflow'),
      );
      await _until(
        tester,
        () async => tester.widget<ActionButton>(workflow).onPressed != null,
      );
      await tester.ensureVisible(workflow);
      await tester.tap(workflow);
      await _until(
        tester,
        () async =>
            router.navigation.current.route.name == 'learning-calculation',
      );
      final calculation = await _readyView(tester, 'calculation');
      final capturedA = copy(
        (await _act(tester, calculation, {
              'action': 'checkpoint',
            }))['checkpoint']
            as Map,
      );
      expect(dimension(capturedA), '7.5');
      expect(router.navigation.current.arguments['checkpointActor'], actorA);

      final latestA = copy(capturedA);
      setDimension(latestA, '9.25');
      await _act(tester, calculation, {
        'action': 'restore',
        'checkpoint': latestA,
      });
      // Observe production capture before making SQL deliberately older than
      // controller memory. Reopen must not replay the route's original seed.
      await _until(tester, () async {
        final value = (await repository.read(actorA, slot)).valueOrNull;
        return value != null && dimension(value) == '9.25';
      });
      expect(
        (await repository.save(actorA, slot, capturedA)).isSuccess,
        isTrue,
      );
      final sameActor = await reopen(calculation);
      await _until(tester, () async {
        final checkpoint = (await _snapshot(sameActor))['checkpoint'] as Map?;
        return checkpoint != null && dimension(checkpoint) == '9.25';
      });
      await _until(tester, () async {
        final checkpoint = (await repository.read(actorA, slot)).valueOrNull;
        return checkpoint != null && dimension(checkpoint) == '9.25';
      });
      expect(app.sessions.current, actorA);

      app.sessions.bindUser(
        userId: 'qa-workflow-owner-b',
        sessionId: 'qa-workflow-session-b',
      );
      final actorB = app.sessions.current;
      final ownB = copy(capturedA);
      setDimension(ownB, '3.25');
      expect((await repository.save(actorB, slot, ownB)).isSuccess, isTrue);
      router.open(
        'learning-calculation',
        arguments: {
          'shapeId': 'cube',
          'checkpoint': capturedA,
          'checkpointActor': actorA,
        },
      );
      final underB = await _readyView(tester, 'calculation');
      await _until(tester, () async {
        final checkpoint = (await _snapshot(underB))['checkpoint'] as Map?;
        return checkpoint != null && dimension(checkpoint) == '3.25';
      });
      final reopenedB = await reopen(underB);
      await _until(tester, () async {
        final checkpoint = (await _snapshot(reopenedB))['checkpoint'] as Map?;
        return checkpoint != null && dimension(checkpoint) == '3.25';
      });
      final exposed = (await _snapshot(reopenedB))['checkpoint'] as Map;
      expect(exposed.containsKey('checkpointActor'), isFalse);
      expect(exposed.containsKey('ownerId'), isFalse);
      expect(app.sessions.current, actorB);
      expect(
        dimension((await repository.read(actorA, slot)).valueOrNull!),
        '9.25',
      );
      expect(
        dimension((await repository.read(actorB, slot)).valueOrNull!),
        '3.25',
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
    timeout: const Timeout(Duration(minutes: 4)),
  );

  testWidgets(
    'Android SQLite records reopen and never cross native actor partitions',
    (tester) async {
      final directory = await getTemporaryDirectory();
      final path =
          '${directory.path}/learning-reopen-${DateTime.now().microsecondsSinceEpoch}.db';
      var app = await _openApp(tester, databasePath: path);
      final owner = app.sessions.current.partition;
      final controller = app.composition.services.get(
        learningReflectionControllerKey,
      );
      for (final activity in ModuleActivity.values) {
        final reflection = ModuleReflection.create(
          activity: activity,
          stage: ReflectionStage.explanation,
          prediction: 'QA ${activity.name} prediction',
          result: 'Actual shared SQLite acknowledgement.',
          explanation: 'Reopened in the same native guest partition.',
          completed: true,
        ).valueOrNull!;
        final saved = await controller.save(reflection);
        expect(saved, isA<Success<DurableRecordReceipt>>());
        expect(saved.valueOrNull!.durable, isTrue);
        expect(saved.valueOrNull!.actor.partition, owner);
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await app.dispose();
      app = await _openApp(tester, databasePath: path);
      addTearDown(app.dispose);
      expect(app.sessions.current.partition, owner);
      final reader = app.composition.services.get(
        learningReflectionControllerKey,
      );
      _openPath(app, _router(tester), '/learn/records');
      await _until(
        tester,
        () async => !reader.loading && reader.records.length == 4,
      );
      for (final activity in ModuleActivity.values) {
        final tile = find.byKey(ValueKey('learning-record-${activity.name}'));
        await tester.ensureVisible(tile);
        await tester.tap(tile);
        await tester.pump(const Duration(milliseconds: 250));
        expect(find.text('QA ${activity.name} prediction'), findsOneWidget);
      }
      app.sessions.bindUser(
        userId: 'qa-learning-second-owner',
        sessionId: 'qa-learning-second-session',
      );
      await _until(
        tester,
        () async => !reader.loading && reader.records.isEmpty,
      );
      expect(reader.actor.partition, 'owner:qa-learning-second-owner');
      expect(find.text('QA net prediction'), findsNothing);
      app.sessions.logout();
      await _until(
        tester,
        () async => !reader.loading && reader.records.length == 4,
      );
      expect(reader.actor.partition, owner);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      // File intentionally remains in the app sandbox until uninstall/cleanup;
      // no production database or canonical source is modified by this test.
      expect(await File(path).exists(), isTrue);
    },
    timeout: const Timeout(Duration(minutes: 2)),
  );
}

const _sourceCommit = '37bc2cd262cc0a54e8ee31339ea37471c1ecfda5';
const _models = [
  'cube',
  'cuboid',
  'pyramid',
  'cylinder',
  'cone',
  'triangular-prism',
  'tetrahedron',
  'pentagonal-prism',
  'hexagonal-prism',
  'sphere',
  'hemisphere',
];
const _projectionModels = [
  'cube',
  'cuboid',
  'pyramid',
  'cylinder',
  'cone',
  'assembly-step',
  'assembly-recess',
];
const _palette = [
  '#4C8DFF',
  '#F69B45',
  '#E9799B',
  '#42B883',
  '#F4C95D',
  '#9B7EDC',
];
const _labModes = <String, List<String>>{
  'net': ['gallery', 'editor', 'studio'],
  'volume': ['compare', 'unit', 'cone', 'pyramid'],
  'area': ['closed', 'container', 'cavity'],
  'composite': ['roof', 'rocket'],
};

Future<AppDependencies> _openApp(
  WidgetTester tester, {
  String? databasePath,
}) async {
  final directory = await getTemporaryDirectory();
  final opened = await AppDependencies.bootstrap(
    features: [learningFeature()],
    databasePath:
        databasePath ??
        '${directory.path}/learning-qa-${DateTime.now().microsecondsSinceEpoch}.db',
  );
  expect(opened, isA<Success<AppDependencies>>());
  final app = opened.valueOrNull!;
  await _savePreferences(tester, app);
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

void _openPath(AppDependencies app, GeoMathRouter router, String path) {
  final match = app.composition.routes.matchPath(path)!;
  router.open(match.route.name, arguments: match.parameters);
}

WebViewController _view(WidgetTester tester) => WebViewController.fromPlatform(
  tester
      .widget<WebViewWidget>(find.byType(WebViewWidget).last)
      .platform
      .params
      .controller,
);

Future<WebViewController> _readyView(
  WidgetTester tester,
  String section,
) async {
  WebViewController? view;
  await _until(tester, () async {
    if (find.byType(WebViewWidget).evaluate().isEmpty) return false;
    view = _view(tester);
    final native = await _nativeDiagnostics(view!);
    final snapshot = await _snapshot(view!);
    return native['readyAcknowledged'] == true &&
        snapshot['ready'] == true &&
        snapshot['pending'] != true &&
        (snapshot['checkpoint'] as Map?)?['section'] == section;
  }, timeout: const Duration(seconds: 50));
  // Allow the production page's launch/read/restore operation to finish before
  // the first test action competes with its initialization queue.
  await tester.pump(const Duration(milliseconds: 400));
  return view!;
}

Future<Map<String, Object?>> _json(
  WebViewController view,
  String expression,
) async {
  Object? value = await view.runJavaScriptReturningResult(
    'JSON.stringify($expression)',
  );
  while (value is String) {
    value = jsonDecode(value);
  }
  return Map<String, Object?>.from(value! as Map);
}

Future<Map<String, Object?>> _snapshot(WebViewController view) =>
    _json(view, 'window.GeoMathModule.learningSnapshot()');
Future<Map<String, Object?>> _nativeDiagnostics(WebViewController view) =>
    _json(view, 'window.GeoMathModule.diagnostics()');

Future<Map<String, Object?>> _act(
  WidgetTester tester,
  WebViewController view,
  Map<String, Object?> action, {
  bool succeeds = true,
}) async {
  Map<String, Object?>? accepted;
  await _until(tester, () async {
    accepted = await _json(
      view,
      'window.GeoMathModule.learningAction(${jsonEncode(action)})',
    );
    if (accepted!['accepted'] == true) return true;
    expect(
      accepted!['reason'] ?? accepted!['error'],
      anyOf('learning-busy', 'learning-not-ready'),
    );
    return false;
  });
  final sequence = accepted!['sequence'] as int;
  Map<String, Object?>? result;
  await _until(tester, () async {
    final state = await _snapshot(view);
    if ((state['sequence'] as num) < sequence || state['pending'] == true) {
      return false;
    }
    result = state;
    return true;
  });
  expect(
    (result!['result'] as Map)['ok'],
    succeeds,
    reason: jsonEncode(action),
  );
  return result!;
}

Future<Map<String, Object?>> _waitNative(
  WidgetTester tester,
  WebViewController view,
  bool Function(Map<String, Object?>) accept,
) async {
  Map<String, Object?>? result;
  await _until(tester, () async {
    final value = await _nativeDiagnostics(view);
    if (!accept(value)) return false;
    result = value;
    return true;
  });
  return result!;
}

Future<void> _savePreferences(
  WidgetTester tester,
  AppDependencies app, {
  AppLanguage language = AppLanguage.ms,
  AppTheme theme = AppTheme.light,
  bool contrast = false,
}) async {
  expect(
    await app.preferences.save(
      AppPreferences(
        language: language,
        theme: theme,
        textScale: contrast ? 1.5 : 1,
        strongContrast: contrast,
        reducedMotion: true,
        musicEnabled: false,
        soundEnabled: false,
      ),
    ),
    isA<Success<void>>(),
  );
  await tester.pump(const Duration(milliseconds: 250));
}

Future<void> _projectionRestoreUndo(
  WidgetTester tester,
  WebViewController view,
) async {
  final state = await _act(tester, view, {'action': 'checkpoint'});
  final checkpoint = Map<String, Object?>.from(
    jsonDecode(jsonEncode(state['checkpoint'])) as Map,
  );
  final projection = checkpoint['projection'] as Map;
  final drawing = projection['state'] as Map;
  drawing['scale'] = 2;
  drawing['drawings'] = {
    'front': [
      {
        'kind': 'line',
        'a': [10, 10],
        'b': [60, 10],
        'type': 'visible',
      },
    ],
    'side': [],
    'plan': [],
  };
  drawing['history'] = {
    'front': [[]],
    'side': [],
    'plan': [],
  };
  drawing['activeView'] = 'front';
  final restored = await _act(tester, view, {
    'action': 'restore',
    'checkpoint': checkpoint,
  });
  expect((restored['diagnostics'] as Map)['projectionScale'], 2);
  final restoredDrawing =
      (((restored['checkpoint'] as Map)['projection'] as Map)['state']
              as Map)['drawings']
          as Map;
  expect(restoredDrawing['front'], hasLength(1));
  final undone = await _act(tester, view, {'action': 'undo'});
  final undoneDrawing =
      (((undone['checkpoint'] as Map)['projection'] as Map)['state']
              as Map)['drawings']
          as Map;
  expect(undoneDrawing['front'], isEmpty);
  expect(undoneDrawing['side'], isEmpty);
  expect(undoneDrawing['plan'], isEmpty);
}

bool _samePose(Map actual, Map expected) => [
  'shape',
  'yaw',
  'pitch',
  'zoom',
  'progress',
  'mode',
  'view',
  'selected',
].every((key) => actual[key] == expected[key]);
void _expectPose(Map actual, Map expected) {
  for (final key in [
    'shape',
    'yaw',
    'pitch',
    'zoom',
    'progress',
    'mode',
    'view',
    'selected',
  ]) {
    expect(actual[key], expected[key], reason: 'Activity state changed: $key');
  }
}

Future<void> _until(
  WidgetTester tester,
  Future<bool> Function() condition, {
  Duration timeout = const Duration(seconds: 15),
}) async {
  final deadline = DateTime.now().add(timeout);
  Object? lastError;
  while (DateTime.now().isBefore(deadline)) {
    try {
      if (await condition()) return;
    } on PlatformException catch (error) {
      lastError = error;
    }
    await tester.pump(const Duration(milliseconds: 75));
  }
  fail(
    'Learning Android condition timed out after $timeout. Last platform error: $lastError',
  );
}
