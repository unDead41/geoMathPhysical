import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/lifecycle/app_lifecycle.dart';
import 'package:geomath_flutter/features/duel/duel_feature.dart';

import 'duel_test_support.dart';

void main() {
  testWidgets(
    'correct final review auto-advances once after 900 ms even in complete room',
    (tester) async {
      final h = DuelHarness(timersEnabled: true);
      final answers = List.generate(10, (i) => settledAnswer(i));
      await h.enter(
        snapshot(status: 'complete', seq: 40, answers: answers, review: true),
      );
      h.controller.startPolling();
      expect(h.controller.polling, isFalse);
      h.transport.steps.add(
        (_) => wire(
          snapshot(
            status: 'complete',
            seq: 41,
            now: testNow + 900,
            answers: answers,
            action: 'advanced',
          ),
        ),
      );
      h.clock.elapse(899);
      await tester.pump(const Duration(milliseconds: 899));
      expect(h.transport.commands, hasLength(1));
      h.clock.elapse(1);
      await tester.pump(const Duration(milliseconds: 1));
      await tester.pump();
      expect(h.transport.commands, hasLength(2));
      expect(h.transport.commands.last, containsPair('questionIndex', 9));
      expect(h.controller.snapshot!.reviewPending, isFalse);
      await h.close();
      await tester.pump(const Duration(seconds: 10));
    },
  );
  testWidgets(
    'wrong review never auto-advances and background keeps the gate running',
    (tester) async {
      final h = DuelHarness(timersEnabled: true);
      await h.enter(
        snapshot(
          status: 'playing',
          seq: 5,
          answers: [settledAnswer(0, outcome: 'wrong')],
          review: true,
        ),
      );
      h.controller.stopPolling();
      h.lifecycle.setPhase(AppLifecyclePhase.background);
      h.clock.elapse(10000);
      await tester.pump(const Duration(seconds: 10));
      expect(h.controller.reviewRemaining, 0);
      expect(h.transport.commands, hasLength(1));
      h.transport.steps.add(
        (_) => wire(
          snapshot(
            status: 'playing',
            seq: 5,
            now: testNow + 10000,
            answers: [settledAnswer(0, outcome: 'wrong')],
            review: true,
            readyAt: testNow + 1800,
          ),
        ),
      );
      h.lifecycle.setPhase(AppLifecyclePhase.foreground);
      await h.controller.resume();
      h.controller.stopPolling();
      await tester.pump(const Duration(seconds: 5));
      expect(h.controller.canContinue, isTrue);
      expect(h.transport.commands, hasLength(2));
      await h.close();
    },
  );
  testWidgets(
    'one poll timer and one refresh flight survive repeated starts and lifecycle',
    (tester) async {
      final h = DuelHarness(timersEnabled: true);
      await h.enter();
      final response = Completer<DuelWireResponse>();
      h.transport.steps.add((_) => response.future);
      h.controller.startPolling();
      h.controller.startPolling();
      await tester.pump(const Duration(seconds: 2));
      expect(h.transport.commands, hasLength(2));
      final flight = h.controller.refresh();
      expect(h.transport.commands, hasLength(2));
      h.lifecycle.setPhase(AppLifecyclePhase.background);
      expect(h.controller.polling, isFalse);
      response.complete(wire(snapshot()));
      await flight;
      await tester.pump(const Duration(seconds: 40));
      expect(h.transport.commands, hasLength(2));
      h.transport.steps.add((_) => wire(snapshot(now: testNow + 40000)));
      h.clock.elapse(40000);
      h.lifecycle.setPhase(AppLifecyclePhase.foreground);
      await h.controller.resume();
      expect(h.controller.polling, isTrue);
      await h.close();
      await tester.pump(const Duration(seconds: 60));
      expect(h.transport.commands, hasLength(3));
    },
  );
}
