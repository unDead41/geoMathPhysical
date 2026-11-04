import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/audio/audio_coordinator.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/core/navigation/app_navigation.dart';

FeatureRoute _route(String name, {BackPolicy? back}) => FeatureRoute(
  name: name,
  path: '/$name',
  builder: (_, _) => const SizedBox(),
  backPolicy: back,
);

void main() {
  test(
    'system and app-bar back share a single confirmation and preserve entry',
    () async {
      final answer = Completer<BackDecision>();
      var confirmations = 0;
      final controller = AppNavigationController(
        initialRoute: 'home',
        routes: FeatureRouteRegistry([
          _route('home'),
          _route(
            'solo',
            back: (_) {
              confirmations++;
              return answer.future;
            },
          ),
        ]),
      );
      controller.push('solo');
      final entry = controller.current;
      final system = controller.requestBack(BackOrigin.system);
      final appBar = controller.requestBack(BackOrigin.appBar);
      expect(system, same(appBar));
      await Future<void>.delayed(Duration.zero);
      expect(confirmations, 1);
      answer.complete(BackDecision.stay);
      expect(await system, BackOutcome.blocked);
      expect(controller.current, same(entry));
      controller.dispose();
    },
  );

  test('a late confirmation cannot pop a new activity', () async {
    final answer = Completer<BackDecision>();
    final controller = AppNavigationController(
      initialRoute: 'home',
      routes: FeatureRouteRegistry([
        _route('home'),
        _route('duel', back: (_) => answer.future),
        _route('settings'),
      ]),
    );
    controller.push('duel');
    final pending = controller.requestBack(BackOrigin.gesture);
    controller.push('settings');
    answer.complete(BackDecision.allow);
    expect(await pending, BackOutcome.superseded);
    expect(controller.current.route.name, 'settings');
    expect(await controller.requestBack(BackOrigin.appBar), BackOutcome.popped);
    expect(controller.current.route.name, 'duel');
    controller.reset('home');
    expect(await controller.requestBack(BackOrigin.system), BackOutcome.atRoot);
    controller.dispose();
  });

  test(
    'synchronous policy reentry uses the published pending request',
    () async {
      late AppNavigationController controller;
      Future<BackOutcome>? nested;
      controller = AppNavigationController(
        initialRoute: 'home',
        routes: FeatureRouteRegistry([
          _route('home'),
          _route(
            'edit',
            back: (_) {
              nested = controller.requestBack(BackOrigin.programmatic);
              return Future.value(BackDecision.stay);
            },
          ),
        ]),
      );
      controller.push('edit');
      final outer = controller.requestBack(BackOrigin.system);
      expect(await outer, BackOutcome.blocked);
      expect(nested, same(outer));
      controller.dispose();
    },
  );

  test(
    'lifecycle maps native phases once and ignores duplicate transitions',
    () {
      final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
      var changes = 0;
      lifecycle.addListener(() => changes++);
      lifecycle.didChangeAppLifecycleState(AppLifecycleState.inactive);
      expect(lifecycle.phase, AppLifecyclePhase.inactive);
      lifecycle.didChangeAppLifecycleState(AppLifecycleState.hidden);
      lifecycle.didChangeAppLifecycleState(AppLifecycleState.paused);
      expect(changes, 2);
      lifecycle.didChangeAppLifecycleState(AppLifecycleState.resumed);
      expect(lifecycle.isForeground, isTrue);
      lifecycle.dispose();
      expect(lifecycle.phase, AppLifecyclePhase.detached);
      expect(changes, 4);
    },
  );

  test('audio revokes the old owner before granting the new one', () async {
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final audio = AudioCoordinator(lifecycle: lifecycle);
    final events = <String>[];
    final native = audio.register(
      owner: 'native',
      endpoint: _Audio('native', events),
    );
    final module = audio.register(
      owner: 'module',
      endpoint: _Audio('module', events),
    );
    await native.activate();
    await module.activate();
    expect(events, ['native:true', 'native:false', 'module:true']);
    expect(audio.owner, 'module');
    final firstPause = audio.pause();
    final secondPause = audio.pause();
    await audio.setEnabled(true);
    expect(audio.owner, isNull);
    await firstPause.release();
    expect(audio.owner, isNull);
    await secondPause.release();
    expect(audio.owner, 'module');
    lifecycle.setPhase(AppLifecyclePhase.background);
    await audio.setEnabled(true);
    expect(audio.owner, isNull);
    lifecycle.setPhase(AppLifecyclePhase.foreground);
    await audio.setEnabled(true);
    expect(audio.owner, 'module');
    await module.release();
    expect(audio.owner, isNull);
    await module.release();
    await audio.close();
    expect(events.where((e) => e == 'module:dispose').length, 1);
    expect(events.where((e) => e == 'native:dispose').length, 1);
    lifecycle.dispose();
  });

  test('failed audio pause prevents a second owner from starting', () async {
    final lifecycle = AppLifecycleController(observeWidgetsBinding: false);
    final audio = AudioCoordinator(lifecycle: lifecycle);
    final events = <String>[];
    final endpoint = _Audio('native', events);
    final native = audio.register(owner: 'native', endpoint: endpoint);
    final module = audio.register(
      owner: 'module',
      endpoint: _Audio('module', events),
    );
    await native.activate();
    endpoint.failPause = true;
    await expectLater(module.activate(), throwsStateError);
    expect(events, isNot(contains('module:true')));
    expect(audio.hasFailure, isTrue);
    endpoint.failPause = false;
    await audio.close();
    lifecycle.dispose();
  });
}

final class _Audio implements AudioEndpoint {
  _Audio(this.name, this.events);
  final String name;
  final List<String> events;
  bool failPause = false;

  @override
  Future<void> setPlaybackAllowed(bool allowed) async {
    if (!allowed && failPause) throw StateError('Cannot pause');
    events.add('$name:$allowed');
  }

  @override
  Future<void> dispose() async => events.add('$name:dispose');
}
