import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/navigation/app_navigation.dart';

FeatureRoute _route(String name, {BackPolicy? backPolicy}) => FeatureRoute(
  name: name,
  path: name == 'home' ? '/' : '/$name',
  builder: (_, _) => const SizedBox.shrink(),
  backPolicy: backPolicy,
);

void main() {
  test(
    'synchronous reentrant back shares one confirmation and one pop',
    () async {
      late AppNavigationController navigation;
      Future<BackOutcome>? reentrant;
      var confirmations = 0;
      navigation = AppNavigationController(
        routes: FeatureRouteRegistry([
          _route('home'),
          _route(
            'draft',
            backPolicy: (_) {
              confirmations += 1;
              if (confirmations == 1) {
                reentrant = navigation.requestBack(BackOrigin.gesture);
              }
              return Future.value(BackDecision.allow);
            },
          ),
        ]),
        initialRoute: 'home',
      );
      addTearDown(navigation.dispose);
      navigation.push('draft');

      final first = navigation.requestBack(BackOrigin.system);

      expect(await first, BackOutcome.popped);
      expect(identical(first, reentrant), isTrue);
      expect(confirmations, 1);
      expect(navigation.entries, hasLength(1));
      expect(navigation.current.route.name, 'home');
    },
  );

  test('confirmation for an old route cannot pop its replacement', () async {
    final decision = Completer<BackDecision>();
    final policyStarted = Completer<void>();
    var confirmations = 0;
    final navigation = AppNavigationController(
      routes: FeatureRouteRegistry([
        _route('home'),
        _route(
          'draft',
          backPolicy: (_) {
            confirmations += 1;
            policyStarted.complete();
            return decision.future;
          },
        ),
        _route('replacement'),
      ]),
      initialRoute: 'home',
    );
    addTearDown(navigation.dispose);
    navigation.push('draft', arguments: const {'draft': 'keep this text'});

    final system = navigation.requestBack(BackOrigin.system);
    final appBar = navigation.requestBack(BackOrigin.appBar);
    final gesture = navigation.requestBack(BackOrigin.gesture);
    expect(identical(system, appBar), isTrue);
    expect(identical(system, gesture), isTrue);
    await policyStarted.future;
    expect(confirmations, 1);
    navigation.replace('replacement');
    decision.complete(BackDecision.allow);

    expect(await system, BackOutcome.superseded);
    expect(navigation.current.route.name, 'replacement');
    expect(navigation.canPop, isTrue);
    expect(navigation.hasPendingBack, isFalse);
  });

  test('stay preserves a draft and allows a later deliberate back', () async {
    var allowLeave = false;
    final navigation = AppNavigationController(
      routes: FeatureRouteRegistry([
        _route('home'),
        _route(
          'draft',
          backPolicy: (_) async =>
              allowLeave ? BackDecision.allow : BackDecision.stay,
        ),
      ]),
      initialRoute: 'home',
    );
    addTearDown(navigation.dispose);
    navigation.push('draft', arguments: const {'draft': 'unsaved reflection'});
    final instance = navigation.current.instance;

    expect(
      await navigation.requestBack(BackOrigin.system),
      BackOutcome.blocked,
    );
    expect(navigation.current.instance, instance);
    expect(navigation.current.arguments['draft'], 'unsaved reflection');
    expect(navigation.hasPendingBack, isFalse);

    allowLeave = true;
    expect(await navigation.requestBack(BackOrigin.appBar), BackOutcome.popped);
    expect(navigation.current.route.name, 'home');
  });
}
