import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/app/production_features.dart';
import 'package:geomath_flutter/core/result.dart';
import 'package:geomath_flutter/features/learning/application/learning_module_controller.dart';
import 'package:geomath_flutter/features/learning/learning_feature.dart';
import 'package:geomath_flutter/features/learning/persistence/learning_reflection_controller.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../cloud_game/support/cloud_game_test_support.dart';
import '../studio/checkpoint_fixture.dart';

/// Only the native JS transport is injected. Controller queue, captured actor,
/// checkpoint schema/repository and the SQLite transaction remain real code.
final class _JavaScript implements LearningJavaScriptPort {
  int sequence = 0;
  final actions = <Map<String, dynamic>>[];
  Future<Object> Function(String script)? intercept;
  Map<String, Object?> checkpoint = learningCheckpointFixture();

  @override
  bool get isReady => true;

  @override
  Future<Object> evaluate(String script) async {
    if (intercept case final handler?) return handler(script);
    const prefix = 'JSON.stringify(window.GeoMathModule.learningAction(';
    if (script.startsWith(prefix)) {
      actions.add(
        jsonDecode(script.substring(prefix.length, script.length - 2))
            as Map<String, dynamic>,
      );
      return jsonEncode({'accepted': true, 'sequence': ++sequence});
    }
    return jsonEncode({
      'ready': true,
      'sequence': sequence,
      'pending': false,
      'result': {'ok': true},
      'checkpoint': checkpoint,
    });
  }

  @override
  Future<void> run(String script) async {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  sqfliteFfiInit();

  Future<(AppDependencies, LearningModuleController, _JavaScript)>
  create() async {
    final app = await bootstrapCloudGameForTest(features: productionFeatures());
    addTearDown(app.dispose);
    final port = _JavaScript();
    final services = app.composition.services;
    final controller = LearningModuleController(
      sessions: app.sessions,
      lifecycle: app.lifecycle,
      preferences: app.preferences,
      audio: app.audio,
      checkpoints: services.get(learningCheckpointRepositoryKey),
      reflections: services.get(learningReflectionControllerKey),
      section: 'calculation',
      initialShape: 'cube',
      javascript: port,
    );
    addTearDown(controller.dispose);
    return (app, controller, port);
  }

  test('module preferences forward effective OS text and reduced motion without changing stored preferences', () async {
    final (app, controller, _) = await create();
    await app.preferences.save(app.preferences.value.copyWith(textScale: 1.5));
    controller.host.updateAccessibility(textScale: 2.25, reducedMotion: true);
    expect(controller.host.presentationSettings['textSize'], 225);
    expect(controller.host.presentationSettings['motionPaused'], isTrue);
    expect(app.preferences.value.textScale, 1.5);
    expect(app.preferences.value.reducedMotion, isFalse);
    controller.host.updateAccessibility(textScale: 1.5, reducedMotion: false);
    expect(controller.host.presentationSettings['textSize'], 150);
    expect(controller.host.presentationSettings['motionPaused'], isFalse);
    expect(
      () => controller.host.updateAccessibility(
        textScale: double.nan,
        reducedMotion: false,
      ),
      throwsArgumentError,
    );
    expect(
      () => controller.host.updateAccessibility(
        textScale: -1,
        reducedMotion: false,
      ),
      throwsArgumentError,
    );
  });

  test('missing native action reply releases checkpoint queue without saving or changing mode', () async {
    final (app, controller, port) = await create();
    final withheld = Completer<Object>();
    port.intercept = (_) => withheld.future;
    final result = await controller
        .launchMode('new-mode')
        .timeout(const Duration(seconds: 25));
    expect(result.failureOrNull?.code, FailureCode.unavailable);
    expect(controller.failure?.code, FailureCode.unavailable);
    expect(
      controller.mode,
      isNull,
      reason: 'An unsaved draft must not be replaced.',
    );
    expect(controller.snapshot, isNull);
    expect(
      await app.database.query('SELECT * FROM learning_checkpoints'),
      isEmpty,
    );

    // The timed-out platform callback can still arrive. It must not save a
    // checkpoint or become an acknowledgement for the subsequent action.
    withheld.complete(jsonEncode({'accepted': true, 'sequence': 99}));
    await Future<void>.delayed(Duration.zero);
    expect(controller.snapshot, isNull);
    port.intercept = null;
    expect((await controller.captureCheckpoint()).isSuccess, isTrue);
    final stored = await app.composition.services
        .get(learningCheckpointRepositoryKey)
        .read(controller.actor, controller.slot);
    expect(stored.valueOrNull, learningCheckpointFixture());
    expect(
      await app.database.query('SELECT * FROM learning_checkpoints'),
      hasLength(1),
    );
    expect(port.actions.single['action'], 'checkpoint');
  });

  test('missing snapshot reply returns failure and late data cannot become a saved checkpoint', () async {
    final (app, controller, port) = await create();
    final withheld = Completer<Object>();
    port.intercept = (script) async {
      if (script.contains('learningAction(')) {
        return jsonEncode({'accepted': true, 'sequence': ++port.sequence});
      }
      return withheld.future;
    };
    final result = await controller.captureCheckpoint().timeout(
      const Duration(seconds: 25),
    );
    expect(result.failureOrNull?.code, FailureCode.unavailable);
    expect(controller.snapshot, isNull);
    expect(
      await app.database.query('SELECT * FROM learning_checkpoints'),
      isEmpty,
    );
    withheld.complete(
      jsonEncode({
        'sequence': port.sequence,
        'pending': false,
        'result': {'ok': true},
        'checkpoint': learningCheckpointFixture(),
      }),
    );
    await Future<void>.delayed(Duration.zero);
    expect(controller.snapshot, isNull);
    expect(
      await app.database.query('SELECT * FROM learning_checkpoints'),
      isEmpty,
    );
    port.intercept = null;
    expect((await controller.captureCheckpoint()).isSuccess, isTrue);
    expect(
      await app.database.query('SELECT * FROM learning_checkpoints'),
      hasLength(1),
    );
  });

  test('actor switch during a native wait stays stale and never persists the old callback', () async {
    final (app, controller, port) = await create();
    final withheld = Completer<Object>();
    final entered = Completer<void>();
    port.intercept = (_) {
      entered.complete();
      return withheld.future;
    };
    final capture = controller.captureCheckpoint();
    await entered.future;
    app.sessions.bindUser(userId: cloudGameOwnerB, sessionId: 'interop-b');
    withheld.complete(jsonEncode({'accepted': true, 'sequence': 1}));
    expect((await capture).failureOrNull?.code, FailureCode.stale);
    expect(controller.snapshot, isNull);
    expect(
      await app.database.query('SELECT * FROM learning_checkpoints'),
      isEmpty,
    );
  });
  test('actor switch from action notification cannot acknowledge an unsaved checkpoint', () async {
    final (app, controller, _) = await create();
    var switched = false;
    controller.addListener(() {
      if (!switched && controller.snapshot != null) {
        switched = true;
        app.sessions.bindUser(
          userId: cloudGameOwnerB,
          sessionId: 'interop-notification-b',
        );
      }
    });
    final result = await controller.captureCheckpoint();
    expect(switched, isTrue);
    expect(result.failureOrNull?.code, FailureCode.stale);
    expect(
      await app.database.query('SELECT * FROM learning_checkpoints'),
      isEmpty,
    );
  });

  test(
    'a delayed old-shape fold cannot unfold the next selected model',
    () async {
      final (_, controller, port) = await create();
      port.checkpoint = learningCheckpointFixture()..['section'] = 'explore';
      final entered = Completer<void>();
      final firstSnapshot = Completer<Object>();
      var held = false;
      port.intercept = (script) async {
        const prefix = 'JSON.stringify(window.GeoMathModule.learningAction(';
        if (script.startsWith(prefix)) {
          final payload = jsonDecode(
            script.substring(prefix.length, script.length - 2),
          ) as Map<String, dynamic>;
          port.actions.add(payload);
          if (payload['action'] == 'launch') {
            (port.checkpoint['explore'] as Map)['shape'] = payload['shape'];
          }
          return jsonEncode({'accepted': true, 'sequence': ++port.sequence});
        }
        if (!held) {
          held = true;
          entered.complete();
          return firstSnapshot.future;
        }
        return jsonEncode({
          'ready': true,
          'sequence': port.sequence,
          'pending': false,
          'result': {'ok': true},
          'checkpoint': port.checkpoint,
        });
      };
      final moving = controller.action({
        'action': 'fold',
        'value': .3,
      }, expectedShape: 'cube');
      await entered.future;
      final selecting = controller.action({
        'action': 'launch',
        'section': 'explore',
        'shape': 'cone',
      });
      final oldCoalesced = controller.action({
        'action': 'fold',
        'value': .8,
      }, expectedShape: 'cube');
      firstSnapshot.complete(
        jsonEncode({
          'ready': true,
          'sequence': port.sequence,
          'pending': false,
          'result': {'ok': true},
          'checkpoint': port.checkpoint,
        }),
      );
      expect((await moving).isSuccess, isTrue);
      expect((await selecting).isSuccess, isTrue);
      expect((await oldCoalesced).failureOrNull?.code, FailureCode.stale);
      expect(controller.shape, 'cone');
      expect(controller.failure, isNull);
      expect(port.actions, [
        {'action': 'fold', 'value': .3},
        {'action': 'launch', 'section': 'explore', 'shape': 'cone'},
      ]);
    },
  );
}
