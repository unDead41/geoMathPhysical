import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/app/app_dependencies.dart';
import 'package:geomath_flutter/core/audio/audio_coordinator.dart';
import 'package:geomath_flutter/core/design/geomath_theme.dart';
import 'package:geomath_flutter/core/features/feature_contribution.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_view.dart';
import 'package:geomath_flutter/core/l10n/app_strings.dart';
import 'package:geomath_flutter/core/navigation/app_navigation.dart';
import 'package:geomath_flutter/core/preferences/app_preferences.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/duel/duel_feature.dart';

import 'duel_test_support.dart';

final class _ScreenFixture {
  _ScreenFixture(this.h) {
    audio = AudioCoordinator(lifecycle: h.lifecycle);
    feature = duelFeature(createController: (_) => h.controller);
    services = ServiceRegistry([
      ...feature.services,
      ServiceFactory(
        key: FoundationServices.audio,
        createService: (_) => audio,
      ),
      ServiceFactory(
        key: FoundationServices.geometry,
        createService: (_) => BundleGeometryCardProvider(),
      ),
    ]);
  }
  final DuelHarness h;
  late final AudioCoordinator audio;
  late final FeatureContribution feature;
  late final ServiceRegistry services;
  FeatureRoute get route => feature.routes.first;
  Widget app({AppLanguage language = AppLanguage.en, bool dark = false}) =>
      MaterialApp(
        theme: dark ? GeoMathTheme.dark() : GeoMathTheme.light(),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child!,
        ),
        home: AppStringsScope(
          strings: AppStrings(
            language,
            contributions: FeatureLocalizationRegistry(feature.localizations)
                .translations,
          ),
          child: AppRouteScope(
            entry: AppRouteEntry(route: route, instance: 17),
            isCurrent: true,
            child: Builder(
              builder: (context) => route.builder(context, services),
            ),
          ),
        ),
      );
  Future<void> close(WidgetTester tester) async {
    await tester.pumpWidget(const SizedBox.shrink());
    services.dispose();
    await audio.close();
    await h.close();
  }
}

void main() {
  for (final language in AppLanguage.values) {
    for (final dark in [false, true]) {
      testWidgets(
        '320 dp 150% ${language.name} ${dark ? 'dark' : 'light'} entry/match/review/result',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(320, 640);
          addTearDown(tester.view.reset);
          final cases = <Map<String, Object?>?>[
            null,
            snapshot(status: 'playing'),
            snapshot(
              status: 'playing',
              seq: 3,
              answers: [settledAnswer(0, outcome: 'wrong')],
              review: true,
            ),
            snapshot(
              status: 'complete',
              seq: 30,
              answers: List.generate(10, (i) => settledAnswer(i)),
            ),
          ];
          for (final state in cases) {
            final ui = _ScreenFixture(DuelHarness());
            try {
              if (state != null) {
                await ui.h.enter(state);
                ui.h.transport.steps.add((_) => wire(state));
              }
              await tester.pumpWidget(ui.app(language: language, dark: dark));
              await tester.pumpAndSettle();
              expect(tester.takeException(), isNull);
              if (state == null) {
                expect(
                  find.byKey(const ValueKey('duel-create')),
                  findsOneWidget,
                );
                await tester.ensureVisible(
                  find.byKey(const ValueKey('duel-join')),
                );
                expect(
                  tester
                      .getSize(find.byKey(const ValueKey('duel-join')))
                      .height,
                  greaterThanOrEqualTo(48),
                );
              } else if (state['currentQuestion'] != null) {
                expect(find.byType(GeometryCardView), findsNWidgets(5));
                for (final card in tester.widgetList<GeometryCardView>(
                  find.byType(GeometryCardView),
                )) {
                  expect(card.kind, GeometryCardKind.solid);
                }
                await tester.ensureVisible(
                  find.byKey(const ValueKey('duel-scan')),
                );
                expect(
                  tester
                      .getSize(find.byKey(const ValueKey('duel-scan')))
                      .height,
                  greaterThanOrEqualTo(48),
                );
              } else if ((state['me'] as Map)['reviewPending'] == true) {
                await tester.ensureVisible(
                  find.byKey(const ValueKey('duel-continue')),
                );
                expect(
                  find.byKey(const ValueKey('duel-review')),
                  findsOneWidget,
                );
              } else {
                expect(
                  find.byKey(const ValueKey('duel-result')),
                  findsOneWidget,
                );
                await tester.ensureVisible(
                  find.byKey(const ValueKey('duel-forfeit')),
                );
              }
              expect(tester.takeException(), isNull);
            } finally {
              await ui.close(tester);
            }
          }
        },
      );
    }
  }
  testWidgets(
    'unconfigured Duel has an honest status and no fake create/join actions',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness(configured: false));
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('duel-unavailable')), findsOneWidget);
        expect(find.text('Duel is unavailable'), findsOneWidget);
        expect(find.byKey(const ValueKey('duel-create')), findsNothing);
        expect(ui.h.transport.commands, isEmpty);
      } finally {
        await ui.close(tester);
      }
    },
  );
  testWidgets(
    'native create, wrong scan, gated Continue use actual controller payloads',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness());
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        await tester.enterText(
          find.descendant(
            of: find.byKey(const ValueKey('duel-name')),
            matching: find.byType(TextFormField),
          ),
          'Afiq',
        );
        ui.h.transport.steps.add((_) => wire(snapshot()));
        await tester.ensureVisible(find.byKey(const ValueKey('duel-create')));
        await tester.tap(find.byKey(const ValueKey('duel-create')));
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('duel-lobby')), findsOneWidget);
        expect(ui.h.transport.commands.single['action'], 'create');
        ui.h.transport.steps.add(
          (_) => wire(snapshot(status: 'playing', seq: 1)),
        );
        await ui.h.controller.refresh();
        await tester.pumpAndSettle();
        await tester.ensureVisible(
          find.byKey(const ValueKey('duel-card-cone')),
        );
        await tester.tap(find.byKey(const ValueKey('duel-card-cone')));
        await tester.pump();
        ui.h.transport.steps.add(
          (_) => wire(
            snapshot(
              status: 'playing',
              seq: 2,
              answers: [settledAnswer(0, outcome: 'wrong')],
              review: true,
            ),
          ),
        );
        await tester.ensureVisible(find.byKey(const ValueKey('duel-scan')));
        await tester.tap(find.byKey(const ValueKey('duel-scan')));
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands.last['shape'], 'cone');
        expect(find.byKey(const ValueKey('duel-review')), findsOneWidget);
        var button = tester.widget<ActionButton>(
          find.byKey(const ValueKey('duel-continue')),
        );
        expect(button.onPressed, isNull);
        ui.h.clock.elapse(1800);
        await tester.pump(const Duration(milliseconds: 1800));
        button = tester.widget<ActionButton>(
          find.byKey(const ValueKey('duel-continue')),
        );
        expect(button.onPressed, isNotNull);
        ui.h.transport.steps.add(
          (_) => wire(
            snapshot(
              status: 'playing',
              seq: 3,
              now: testNow + 1800,
              answers: [settledAnswer(0, outcome: 'wrong')],
              action: 'advanced',
            ),
          ),
        );
        await tester.ensureVisible(find.byKey(const ValueKey('duel-continue')));
        await tester.tap(find.byKey(const ValueKey('duel-continue')));
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands.last['action'], 'advance');
        expect(ui.h.transport.commands.last['questionIndex'], 0);
        expect(find.byKey(const ValueKey('duel-question')), findsOneWidget);
        expect(tester.takeException(), isNull);
      } finally {
        await ui.close(tester);
      }
    },
  );
  testWidgets(
    'all back origins use forfeit confirmation, pause audio and preserve live clock',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness());
      final state = snapshot(status: 'playing', seq: 12);
      await ui.h.enter(state);
      ui.h.transport.steps.add((_) => wire(state));
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        for (final origin in BackOrigin.values) {
          final before = ui.h.controller.serverMilliseconds;
          final back = ui.route.backPolicy!(
            BackRequest(
              origin: origin,
              route: AppRouteEntry(route: ui.route, instance: 17),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.byType(ConfirmationSheet), findsOneWidget);
          expect(ui.audio.isPaused, isTrue);
          ui.h.clock.elapse(2000);
          await tester.pump(const Duration(seconds: 2));
          expect(
            ui.h.controller.serverMilliseconds,
            greaterThanOrEqualTo(before + 2000),
          );
          await tester.ensureVisible(find.text('Stay in Duel'));
          await tester.tap(find.text('Stay in Duel'));
          await tester.pumpAndSettle();
          expect(await back, BackDecision.stay);
          expect(ui.audio.isPaused, isFalse);
          expect(ui.h.controller.hasSession, isTrue);
        }
        expect(ui.h.transport.commands, hasLength(2));
        final back = ui.route.backPolicy!(
          BackRequest(
            origin: BackOrigin.system,
            route: AppRouteEntry(route: ui.route, instance: 17),
          ),
        );
        await tester.pumpAndSettle();
        ui.h.transport.steps.add(
          (_) => wire(
            snapshot(
              status: 'complete',
              seq: 13,
              answers: List.generate(
                10,
                (i) => settledAnswer(i, outcome: 'skipped'),
              ),
              action: 'left',
            ),
          ),
        );
        await tester.ensureVisible(find.text('Leave Duel'));
        await tester.tap(find.text('Leave Duel'));
        await tester.pumpAndSettle();
        expect(await back, BackDecision.allow);
        expect(ui.h.transport.commands.last['action'], 'leave');
        expect(ui.h.store.values, isEmpty);
      } finally {
        await ui.close(tester);
      }
    },
  );
  testWidgets(
    'old confirmation cannot forfeit a new capability under the same actor',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness());
      final state = snapshot(status: 'playing');
      await ui.h.enter(state);
      ui.h.transport.steps.add((_) => wire(state));
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final generation = ui.h.controller.sessionGeneration,
            actor = ui.h.controller.actor;
        final back = ui.route.backPolicy!(
          BackRequest(
            origin: BackOrigin.system,
            route: AppRouteEntry(route: ui.route, instance: 17),
          ),
        );
        await tester.pumpAndSettle();
        ui.h.transport.steps.add(
          (_) => wire(
            snapshot(
              status: 'complete',
              seq: 1,
              answers: List.generate(
                10,
                (i) => settledAnswer(i, outcome: 'skipped'),
              ),
              action: 'left',
            ),
          ),
        );
        await ui.h.controller.leave(confirmed: true);
        const nextRoom = '44444444-4444-4444-8444-444444444444';
        ui.h.transport.steps.add((_) => wire(snapshot(id: nextRoom)));
        await ui.h.controller.create('New room');
        expect(ui.h.controller.actor, actor);
        expect(ui.h.controller.sessionGeneration, greaterThan(generation));
        final sent = ui.h.transport.commands.length;
        await tester.ensureVisible(find.text('Leave Duel'));
        await tester.tap(find.text('Leave Duel'));
        await tester.pumpAndSettle();
        expect(await back, BackDecision.stay);
        expect(ui.h.transport.commands, hasLength(sent));
        expect(ui.h.controller.snapshot!.room.id, nextRoom);
        expect(ui.h.controller.hasSession, isTrue);
      } finally {
        await ui.close(tester);
      }
    },
  );
  testWidgets(
    'confirmation opened by old actor cannot forfeit the next actor room',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness());
      final state = snapshot(status: 'playing');
      await ui.h.enter(state);
      ui.h.transport.steps.add((_) => wire(state));
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final back = ui.route.backPolicy!(
          BackRequest(
            origin: BackOrigin.gesture,
            route: AppRouteEntry(route: ui.route, instance: 17),
          ),
        );
        await tester.pumpAndSettle();
        ui.h.sessions.bindUser(userId: 'different', sessionId: 'new-session');
        await tester.pump();
        await tester.ensureVisible(find.text('Leave Duel'));
        await tester.tap(find.text('Leave Duel'));
        await tester.pumpAndSettle();
        expect(await back, BackDecision.stay);
        expect(ui.h.transport.commands, hasLength(2));
        expect(ui.h.controller.snapshot, isNull);
        expect(ui.h.store.values.keys, isNot(contains('owner:different')));
      } finally {
        await ui.close(tester);
      }
    },
  );
}
