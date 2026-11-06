import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
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
import 'package:geomath_flutter/features/duel/presentation/game_card_carousel.dart';
import 'package:geomath_flutter/features/duel/presentation/game_card_drag.dart';
import 'package:geomath_flutter/features/duel/presentation/game_question_content.dart';

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

// These are projections from the pinned real protocol-2 Edge projector over
// labelled synthetic SQL-shaped input, not a hosted-service acceptance claim.
// Only sequence metadata is adjusted where a test chains projected states.
Map<String, Object?> _edgeProjection(String name, {int? seq}) {
  final source = jsonDecode(
    File('test/features/duel/fixtures/source_projection.json')
        .readAsStringSync(),
  ) as Map<String, dynamic>;
  expect(source['sourceCommit'], '752ce908d16d13acc9cc7510797e8363d182c3f5');
  expect(
    (source['sourceBlobs'] as Map)['handler.mjs'],
    'c8b0e4636b6613d9e3d29af491e7bccb1b3ee23f',
  );
  final state = (source['snapshots'] as Map)[name] as Map<String, dynamic>;
  if (seq != null) (state['me'] as Map)['seq'] = seq;
  return state;
}

void main() {
  testWidgets(
    'PIN paste keeps the name and requires explicit join; clipboard failures are visible',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness());
      var pasted = 'Join my GeoMath Duel with PIN 123456.';
      var denied = false;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.getData') {
            if (denied) throw PlatformException(code: 'clipboard_denied');
            return {'text': pasted};
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final name = find.descendant(
          of: find.byKey(const ValueKey('duel-name')),
          matching: find.byType(TextFormField),
        );
        final pin = find.descendant(
          of: find.byKey(const ValueKey('duel-pin')),
          matching: find.byType(TextFormField),
        );
        await tester.enterText(name, 'Clipboard QA');
        FocusManager.instance.primaryFocus?.unfocus();
        Future<void> paste() async {
          await tester.ensureVisible(
            find.byKey(const ValueKey('duel-paste-pin')),
          );
          await tester.pumpAndSettle();
          await tester.tap(find.byKey(const ValueKey('duel-paste-pin')));
          await tester.pumpAndSettle();
        }

        await paste();
        expect(tester.widget<TextFormField>(pin).controller!.text, '123456');
        expect(
          tester.widget<TextFormField>(name).controller!.text,
          'Clipboard QA',
        );
        expect(ui.h.transport.commands, isEmpty);
        expect(
          find.text('PIN pasted. Check it, then join when you are ready.'),
          findsOneWidget,
        );
        pasted = '1234567';
        await paste();
        expect(tester.widget<TextFormField>(pin).controller!.text, '123456');
        expect(
          find.text(
            'Copy one 6-digit PIN or a Duel invitation, then try again.',
          ),
          findsOneWidget,
        );
        denied = true;
        await paste();
        expect(
          find.text(
            'Clipboard access failed. You can enter or select the PIN manually.',
          ),
          findsOneWidget,
        );
        expect(tester.widget<TextFormField>(pin).controller!.text, '123456');
        expect(ui.h.transport.commands, isEmpty);
        expect(tester.takeException(), isNull);
      } finally {
        await ui.close(tester);
      }
    },
  );

  testWidgets(
    'a delayed PIN paste preserves newer edits and unchanged leading-zero PINs',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness());
      var pending = Completer<Map<String, Object?>>();
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async =>
            call.method == 'Clipboard.getData' ? pending.future : null,
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final pin = find.descendant(
          of: find.byKey(const ValueKey('duel-pin')),
          matching: find.byType(TextFormField),
        );
        final paste = find.byKey(const ValueKey('duel-paste-pin'));
        Future<void> startPaste() async {
          await tester.ensureVisible(paste);
          await tester.pumpAndSettle();
          await tester.tap(paste);
          await tester.pump();
        }

        await startPaste();
        await tester.enterText(pin, '654321');
        pending.complete({'text': '123456'});
        await tester.pumpAndSettle();
        expect(tester.widget<TextFormField>(pin).controller!.text, '654321');
        expect(
          find.byKey(const ValueKey('duel-clipboard-status')),
          findsNothing,
        );

        // An edit followed by restoring the original value is still a newer
        // user decision and must also supersede the in-flight paste.
        pending = Completer<Map<String, Object?>>();
        await startPaste();
        await tester.enterText(pin, '987654');
        await tester.enterText(pin, '654321');
        pending.complete({'text': '123456'});
        await tester.pumpAndSettle();
        expect(tester.widget<TextFormField>(pin).controller!.text, '654321');

        FocusManager.instance.primaryFocus?.unfocus();
        pending = Completer<Map<String, Object?>>();
        await startPaste();
        pending.complete({'text': '012345'});
        await tester.pumpAndSettle();
        expect(tester.widget<TextFormField>(pin).controller!.text, '012345');
        expect(
          find.text('PIN pasted. Check it, then join when you are ready.'),
          findsOneWidget,
        );
        expect(ui.h.transport.commands, isEmpty);
        expect(tester.takeException(), isNull);
      } finally {
        await ui.close(tester);
      }
    },
  );

  testWidgets(
    'lobby copies only the public PIN/invitation, handles clipboard errors and projects readiness',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 900);
      addTearDown(tester.view.reset);
      final ui = _ScreenFixture(DuelHarness());
      final state = snapshot(ready: true);
      await ui.h.enter(state);
      ui.h.transport.steps.add((_) => wire(state));
      final copied = <String>[];
      var denied = false;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            if (denied) throw PlatformException(code: 'clipboard_denied');
            copied.add((call.arguments as Map)['text'] as String);
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final sent = ui.h.transport.commands.length;
        expect(find.text('1 of 2 players ready'), findsOneWidget);
        expect(
          find.text(
            'You are ready. Waiting for your friend to choose I’m ready.',
          ),
          findsOneWidget,
        );
        expect(
          tester
              .widget<ActionButton>(find.byKey(const ValueKey('duel-ready')))
              .onPressed,
          isNull,
        );
        Future<void> copy(String key) async {
          await tester.ensureVisible(find.byKey(ValueKey(key)));
          await tester.pumpAndSettle();
          await tester.tap(find.byKey(ValueKey(key)));
          await tester.pumpAndSettle();
        }

        await copy('duel-copy-pin');
        expect(copied.single, '123456');
        expect(find.text('PIN copied.'), findsOneWidget);
        await copy('duel-copy-invitation');
        expect(copied.last, contains('Open Play → Duel → Join a room'));
        expect(copied.last, contains('PIN 123456'));
        expect(copied.last, isNot(contains(roomId)));
        expect(
          find.text('Invitation copied. Paste it in a message to your friend.'),
          findsOneWidget,
        );
        denied = true;
        await copy('duel-copy-pin');
        expect(copied, hasLength(2));
        expect(
          find.text(
            'Clipboard access failed. You can enter or select the PIN manually.',
          ),
          findsOneWidget,
        );
        expect(ui.h.transport.commands, hasLength(sent));
        ui.h.transport.steps.add((_) => wireError('unavailable', 503));
        await ui.h.controller.refresh();
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('duel-connection')), findsOneWidget);
        expect(find.text('Checking connection…'), findsOneWidget);
        expect(
          tester
              .widget<ActionButton>(find.byKey(const ValueKey('duel-ready')))
              .onPressed,
          isNull,
        );
        expect(tester.takeException(), isNull);
      } finally {
        await ui.close(tester);
      }
    },
  );

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
    'native join, public PIN and ready controls send real protocol-2 controller actions',
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
        await tester.ensureVisible(find.byKey(const ValueKey('duel-pin')));
        await tester.enterText(
          find.descendant(
            of: find.byKey(const ValueKey('duel-pin')),
            matching: find.byType(TextFormField),
          ),
          '123456',
        );
        ui.h.transport.steps.add((_) => wire(_edgeProjection('waiting')));
        await tester.ensureVisible(find.byKey(const ValueKey('duel-join')));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const ValueKey('duel-join')));
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands.single, containsPair('protocol', 2));
        expect(ui.h.transport.commands.single, containsPair('action', 'join'));
        expect(ui.h.transport.commands.single, containsPair('code', '123456'));
        expect(ui.h.transport.commands.single, containsPair('name', 'Afiq'));
        expect(find.byKey(const ValueKey('duel-lobby')), findsOneWidget);
        expect(
          tester
              .widget<SelectableText>(
                find.byKey(const ValueKey('duel-room-pin')),
              )
              .data,
          '123456',
        );
        ui.h.transport.steps.add(
          (_) => wire(_edgeProjection('countdown', seq: 3)),
        );
        await tester.ensureVisible(find.byKey(const ValueKey('duel-ready')));
        await tester.tap(find.byKey(const ValueKey('duel-ready')));
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands.last, containsPair('action', 'ready'));
        expect(ui.h.transport.commands.last, containsPair('seq', 3));
        expect(ui.h.transport.commands.last, containsPair('roomId', roomId));
        expect(find.byKey(const ValueKey('duel-countdown')), findsOneWidget);
        expect(find.byKey(const ValueKey('duel-cards-scroll')), findsNothing);
        ui.h.transport.steps.add(
          (_) => wire(_edgeProjection('active_K1', seq: 4)),
        );
        await ui.h.controller.refresh();
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('duel-question')), findsOneWidget);
        expect(find.byType(GameCardCarousel), findsOneWidget);
        expect(tester.takeException(), isNull);
      } finally {
        await ui.close(tester);
      }
    },
  );
  testWidgets(
    'real protocol fixture: R1/R2 swipe and arrow browsing never scan; explicit taps then checks do',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 640);
      addTearDown(tester.view.reset);
      final ui = _ScreenFixture(DuelHarness());
      final initial = _edgeProjection('active_K1');
      await ui.h.enter(initial);
      ui.h.transport.steps.add((_) => wire(initial));
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final before = ui.h.transport.commands.length;
        final carousel = find.byType(GameCardCarousel);
        final scan = find.byKey(const ValueKey('duel-scan'));
        final cube = find.byKey(const ValueKey('duel-card-cube'));
        final cone = find.byKey(const ValueKey('duel-card-cone'));
        expect(carousel, findsOneWidget);
        expect(
          tester
              .widgetList<GeometryCardView>(find.byType(GeometryCardView))
              .map((card) => card.shape),
          orderedEquals(GeometryShape.values),
        );
        await tester.ensureVisible(cube);
        await tester.drag(cube, const Offset(-210, 0));
        await tester.pumpAndSettle();
        await tester.ensureVisible(
          find.byKey(const ValueKey('duel-cards-next')),
        );
        await tester.tap(find.byKey(const ValueKey('duel-cards-next')));
        await tester.pumpAndSettle();
        for (final shape in GeometryShape.values) {
          final card = find.byKey(ValueKey('duel-card-${shape.name}'));
          await tester.ensureVisible(card);
          expect(tester.widget<GeoMathCard>(card).onTap, isNotNull);
        }
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands, hasLength(before));
        expect(tester.widget<ActionButton>(scan).onPressed, isNull);
        expect(find.textContaining('Selected:'), findsNothing);
        expect(ui.h.controller.snapshot!.me.score, 0);
        expect(find.text('Card 5 of 5'), findsOneWidget);
        await tester.pumpWidget(ui.app(language: AppLanguage.ms, dark: true));
        await tester.pumpAndSettle();
        expect(find.text('Kad 5 daripada 5'), findsOneWidget);
        expect(ui.h.transport.commands, hasLength(before));
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        expect(find.text('Card 5 of 5'), findsOneWidget);

        await tester.ensureVisible(cube);
        await tester.tap(cube);
        await tester.pump();
        final oldR1Check = tester.widget<ActionButton>(scan).onPressed!;
        expect(ui.h.transport.commands, hasLength(before));
        expect(ui.h.controller.snapshot!.me.score, 0);
        ui.h.transport.steps.add(
          (_) => wire(_edgeProjection('net_stage', seq: 3)),
        );
        await tester.ensureVisible(scan);
        await tester.tap(scan);
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands, hasLength(before + 1));
        expect(ui.h.transport.commands.last, containsPair('action', 'scan'));
        expect(ui.h.transport.commands.last, containsPair('kind', 'solid'));
        expect(ui.h.transport.commands.last, containsPair('target', 'r1'));
        expect(ui.h.transport.commands.last, containsPair('shape', 'cube'));
        expect(ui.h.transport.commands.last, containsPair('questionIndex', 0));
        expect(ui.h.transport.commands.last, containsPair('seq', 3));
        expect(ui.h.controller.snapshot!.me.stage, GeometryCardKind.net);
        expect(ui.h.controller.snapshot!.me.score, 0);
        expect(tester.widget<ActionButton>(scan).onPressed, isNull);
        expect(find.text('Card 1 of 5'), findsOneWidget);
        for (final card in tester.widgetList<GeometryCardView>(
          find.byType(GeometryCardView),
        )) {
          expect(card.kind, GeometryCardKind.net);
        }
        await tester.ensureVisible(cube);
        await tester.drag(cube, const Offset(-210, 0));
        await tester.pumpAndSettle();
        await tester.ensureVisible(cone);
        await tester.tap(cone);
        await tester.pump();
        // Even after a fresh R2 selection, the captured R1 callback must be
        // inert without producing a stale-stage failure on the controller.
        oldR1Check();
        await tester.pump();
        expect(ui.h.controller.errorCode, isNull);
        expect(ui.h.transport.commands, hasLength(before + 1));
        expect(ui.h.controller.snapshot!.me.score, 0);
        ui.h.transport.steps.add(
          (_) => wire(_edgeProjection('review_wrong_r2', seq: 4)),
        );
        await tester.ensureVisible(scan);
        await tester.tap(scan);
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands, hasLength(before + 2));
        expect(ui.h.transport.commands.last, containsPair('kind', 'net'));
        expect(ui.h.transport.commands.last, containsPair('target', 'r2'));
        expect(ui.h.transport.commands.last, containsPair('shape', 'cone'));
        expect(ui.h.transport.commands.last, containsPair('questionIndex', 0));
        expect(ui.h.transport.commands.last, containsPair('seq', 4));
        expect(find.byKey(const ValueKey('duel-review')), findsOneWidget);
        expect(
          ui.h.controller.snapshot!.review!.attempts.solid,
          GeometryShape.cube,
        );
        expect(
          ui.h.controller.snapshot!.review!.attempts.net,
          GeometryShape.cone,
        );
        expect(ui.h.controller.snapshot!.me.score, 0);
        expect(tester.takeException(), isNull);
      } finally {
        await ui.close(tester);
      }
    },
  );
  testWidgets(
    'real Duel drag selects for the active reader and stale solid payload cannot enter R2',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 1100);
      addTearDown(tester.view.reset);
      final ui = _ScreenFixture(DuelHarness());
      final state = _edgeProjection('active_K1');
      await ui.h.enter(state);
      ui.h.transport.steps.add((_) => wire(state));
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final sent = ui.h.transport.commands.length;
        final card = find.byKey(const ValueKey('duel-card-cube'));
        final reader = find.byKey(const ValueKey('duel-reader-r1'));
        await tester.ensureVisible(card);
        await tester.pumpAndSettle();
        final oldData = tester
            .widget<GameCardDraggable>(
              find.ancestor(of: card, matching: find.byType(GameCardDraggable)),
            )
            .data;
        final gesture = await tester.startGesture(tester.getCenter(card));
        await tester.pump(kLongPressTimeout + const Duration(milliseconds: 50));
        await gesture.moveTo(tester.getCenter(reader));
        await tester.pump();
        expect(ui.h.transport.commands, hasLength(sent));
        await gesture.up();
        await tester.pumpAndSettle();
        final scan = find.byKey(const ValueKey('duel-scan'));
        expect(tester.widget<ActionButton>(scan).onPressed, isNotNull);
        expect(find.text('Selected: Cube'), findsOneWidget);
        expect(ui.h.transport.commands, hasLength(sent));
        expect(ui.h.controller.snapshot!.me.stage, GeometryCardKind.solid);
        expect(ui.h.controller.snapshot!.me.score, 0);
        ui.h.transport.steps.add(
          (_) => wire(_edgeProjection('net_stage', seq: 3)),
        );
        await tester.ensureVisible(scan);
        await tester.pumpAndSettle();
        await tester.tap(scan);
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands.last, containsPair('target', 'r1'));
        expect(ui.h.controller.snapshot!.me.stage, GeometryCardKind.net);
        var target = tester.widget<DragTarget<GameCardDragData>>(
          find.descendant(
            of: find.byKey(const ValueKey('duel-reader-r2')),
            matching: find.byType(DragTarget<GameCardDragData>),
          ),
        );
        final details = DragTargetDetails(data: oldData, offset: Offset.zero);
        expect(target.onWillAcceptWithDetails!(details), false);
        target.onAcceptWithDetails!(details);
        await tester.pump();
        expect(tester.widget<ActionButton>(scan).onPressed, isNull);
        expect(ui.h.transport.commands, hasLength(sent + 1));
        // A server-confirmed hint changes the sequence, not the question or
        // reader. Keep the player's explicit selection for that same question.
        await tester.ensureVisible(card);
        await tester.pumpAndSettle();
        await tester.tap(card);
        await tester.pumpAndSettle();
        ui.h.transport.steps.add(
          (_) => wire(_edgeProjection('confirmed_hint', seq: 4)),
        );
        await tester.ensureVisible(find.byKey(const ValueKey('duel-hint')));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const ValueKey('duel-hint')));
        await tester.pumpAndSettle();
        expect(find.text('Selected: Cube'), findsOneWidget);
        expect(tester.widget<ActionButton>(scan).onPressed, isNotNull);
        expect(ui.h.transport.commands, hasLength(sent + 2));
        target = tester.widget<DragTarget<GameCardDragData>>(
          find.descendant(
            of: find.byKey(const ValueKey('duel-reader-r2')),
            matching: find.byType(DragTarget<GameCardDragData>),
          ),
        );
        final netData = tester
            .widget<GameCardDraggable>(
              find.ancestor(of: card, matching: find.byType(GameCardDraggable)),
            )
            .data;
        ui.h.sessions.bindUser(
          userId: 'another-player',
          sessionId: 'another-session',
        );
        final staleActor = DragTargetDetails(
          data: netData,
          offset: Offset.zero,
        );
        expect(target.onWillAcceptWithDetails!(staleActor), false);
        target.onAcceptWithDetails!(staleActor);
        await tester.pumpAndSettle();
        expect(ui.h.transport.commands, hasLength(sent + 2));
        expect(tester.takeException(), isNull);
      } finally {
        await ui.close(tester);
      }
    },
  );

  testWidgets(
    'Duel card and scan callbacks recheck deadline and current actor before dispatch',
    (tester) async {
      for (final interruption in ['deadline', 'actor']) {
        final ui = _ScreenFixture(DuelHarness());
        final state = _edgeProjection('active_K1');
        await ui.h.enter(state);
        ui.h.transport.steps.add((_) => wire(state));
        try {
          await tester.pumpWidget(ui.app());
          await tester.pumpAndSettle();
          final cube = find.byKey(const ValueKey('duel-card-cube'));
          final scan = find.byKey(const ValueKey('duel-scan'));
          await tester.ensureVisible(cube);
          await tester.tap(cube);
          await tester.pump();
          final oldCardTap = tester.widget<GeoMathCard>(cube).onTap!;
          final oldCheck = tester.widget<ActionButton>(scan).onPressed!;
          final sent = ui.h.transport.commands.length;
          // Invoke captured callbacks before a frame can disable the controls.
          if (interruption == 'deadline') {
            ui.h.clock.elapse(870000);
          } else {
            ui.h.sessions.bindUser(
              userId: 'another-player',
              sessionId: 'another-session',
            );
          }
          oldCardTap();
          oldCheck();
          await tester.pump(const Duration(milliseconds: 250));
          expect(ui.h.transport.commands, hasLength(sent));
          if (interruption == 'deadline') {
            expect(tester.widget<ActionButton>(scan).onPressed, isNull);
          } else {
            expect(ui.h.controller.snapshot, isNull);
            expect(scan, findsNothing);
          }
          expect(tester.takeException(), isNull);
        } finally {
          await ui.close(tester);
        }
      }
    },
  );
  testWidgets(
    'pending scan disables every card and check until the server confirms its same command',
    (tester) async {
      final ui = _ScreenFixture(DuelHarness());
      final state = _edgeProjection('active_K1');
      await ui.h.enter(state);
      ui.h.transport.steps.add((_) => wire(state));
      final response = Completer<DuelWireResponse>();
      try {
        await tester.pumpWidget(ui.app());
        await tester.pumpAndSettle();
        final scan = find.byKey(const ValueKey('duel-scan'));
        final cube = find.byKey(const ValueKey('duel-card-cube'));
        await tester.ensureVisible(cube);
        await tester.tap(cube);
        await tester.pump();
        ui.h.transport.steps.add((_) => response.future);
        await tester.ensureVisible(scan);
        await tester.tap(scan);
        await tester.pump();
        final sent = ui.h.transport.commands.length;
        expect(ui.h.controller.pending, isTrue);
        expect(tester.widget<ActionButton>(scan).onPressed, isNull);
        for (final shape in GeometryShape.values) {
          expect(
            tester
                .widget<GeoMathCard>(
                  find.byKey(ValueKey('duel-card-${shape.name}')),
                )
                .onTap,
            isNull,
          );
        }
        await tester.ensureVisible(
          find.byKey(const ValueKey('duel-cards-next')),
        );
        await tester.tap(find.byKey(const ValueKey('duel-cards-next')));
        await tester.pump(const Duration(milliseconds: 300));
        expect(ui.h.transport.commands, hasLength(sent));
        response.complete(wire(_edgeProjection('net_stage', seq: 3)));
        await tester.pumpAndSettle();
        expect(ui.h.controller.pending, isFalse);
        expect(ui.h.controller.snapshot!.me.stage, GeometryCardKind.net);
        expect(tester.widget<ActionButton>(scan).onPressed, isNull);
        expect(tester.takeException(), isNull);
      } finally {
        if (!response.isCompleted) {
          response.complete(wire(_edgeProjection('net_stage', seq: 3)));
        }
        await ui.close(tester);
      }
    },
  );
  for (final language in AppLanguage.values) {
    testWidgets(
      'real public formula copy is typeset in ${language.name} active match, review and history',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(320, 640);
        addTearDown(tester.view.reset);
        for (final name in [
          'active_B2',
          'active_P2',
          'active_S2',
          'active_K2',
          'active_C2',
          'complete_final_review',
          'complete_advanced',
        ]) {
          final ui = _ScreenFixture(DuelHarness());
          final state = _edgeProjection(name);
          await ui.h.enter(state);
          ui.h.transport.steps.add((_) => wire(state));
          try {
            await tester.pumpWidget(ui.app(language: language));
            await tester.pumpAndSettle();
            final projection = ui.h.controller.snapshot!;
            final publicQuestions = [
              ?projection.currentQuestion,
              ?projection.review?.question,
              if (!projection.reviewPending &&
                  projection.currentQuestion == null)
                ...projection.answers.map((answer) => answer.question),
            ];
            final contents = tester
                .widgetList<GameQuestionContent>(
                  find.byType(GameQuestionContent),
                )
                .toList();
            expect(contents, hasLength(publicQuestions.length));
            for (var index = 0; index < contents.length; index++) {
              final question = publicQuestions[index];
              final copy = question.localized(language.name);
              final content = contents[index];
              expect(content.text, contains(copy.prompt));
              for (final line in copy.lines) {
                expect(content.text, contains(line));
              }
              expect(content.formulaKey, question.formulaKey[language.name]);
              expect(content.languageCode, language.name);
              if (question.topic == 'formula') {
                final equation = find.descendant(
                  of: find.byWidget(content),
                  matching: find.byKey(
                    const ValueKey('game-question-equation-0'),
                  ),
                );
                expect(equation, findsOneWidget);
                expect(
                  tester.widget<Semantics>(equation).properties.label,
                  contains(
                    language == AppLanguage.en ? 'equals' : 'sama dengan',
                  ),
                );
                final legend = find.descendant(
                  of: find.byWidget(content),
                  matching: find.byKey(
                    const ValueKey('game-question-variables'),
                  ),
                );
                expect(legend, findsOneWidget);
                if (copy.prompt.contains('V=p*l*t')) {
                  final definitions = tester
                      .widget<Text>(legend)
                      .textSpan!
                      .toPlainText();
                  for (final definition
                      in language == AppLanguage.en
                          ? [
                              'V = volume',
                              'p = length',
                              'l = width',
                              't = height',
                            ]
                          : [
                              'V = isi padu',
                              'p = panjang',
                              'l = lebar',
                              't = tinggi',
                            ]) {
                    expect(definitions, contains(definition));
                  }
                }
              }
            }
            if (projection.currentQuestion != null) {
              expect(projection.currentQuestion!.id, 'duel-0');
              expect(projection.currentQuestion!.settledShape, isNull);
              expect(find.textContaining('Correct shape:'), findsNothing);
            }
            final formulaContents = find
                .byType(GameQuestionContent)
                .evaluate()
                .where(
                  (element) => (element.widget as GameQuestionContent).text
                      .contains('='),
                );
            expect(formulaContents, isNotEmpty);
            // Exercise each real equation at the narrow 150% viewport, including
            // settled history entries that begin below the screen.
            for (final element in formulaContents.toList()) {
              await tester.ensureVisible(find.byWidget(element.widget));
              await tester.pumpAndSettle();
              expect(tester.takeException(), isNull);
            }
            expect(ui.h.transport.commands, hasLength(2));
          } finally {
            await ui.close(tester);
          }
        }
      },
    );
  }
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
