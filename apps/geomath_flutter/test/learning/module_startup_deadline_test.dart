import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/runtime/clock.dart';
import 'package:geomath_flutter/features/learning/module_spike_host.dart';

final class _Clock implements Clock {
  int elapsed = 0;
  @override
  DateTime now() => DateTime.fromMillisecondsSinceEpoch(elapsed, isUtc: true);
  @override
  int monotonicMilliseconds() => elapsed;
}

void main() {
  testWidgets(
    'healthy child completing after 35 foreground seconds is accepted',
    (tester) async {
      final clock = _Clock();
      final failures = <ModuleStartupStage>[];
      final deadline = ModuleStartupDeadline(
        clock: clock,
        onExpired: failures.add,
      );
      addTearDown(deadline.close);
      deadline.beginDocument();
      expect(deadline.beginHandshake(), isTrue);
      // Real Android recorded complete child execution at ~35 seconds without a
      // CSP error/crash. Its validated ready envelope must still be admissible.
      clock.elapsed = 35000;
      await tester.pump(const Duration(seconds: 35));
      expect(failures, isEmpty);
      expect(deadline.markReady(), isTrue);
      expect(deadline.stage, ModuleStartupStage.ready);
      clock.elapsed = 120000;
      await tester.pump(const Duration(seconds: 85));
      expect(failures, isEmpty);
    },
  );

  testWidgets('29 second document load leaves a full secure handshake budget', (
    tester,
  ) async {
    final clock = _Clock();
    final failures = <ModuleStartupStage>[];
    final deadline = ModuleStartupDeadline(
      clock: clock,
      onExpired: failures.add,
    );
    addTearDown(deadline.close);
    deadline.beginDocument();
    clock.elapsed = 29000;
    await tester.pump(const Duration(seconds: 29));
    expect(deadline.beginHandshake(), isTrue);
    clock.elapsed = 30000;
    await tester.pump(const Duration(seconds: 1));
    expect(
      failures,
      isEmpty,
      reason:
          'Native attachment/document parsing is not secure handshake time.',
    );
    expect(deadline.stage, ModuleStartupStage.handshake);
    clock.elapsed = 88999;
    await tester.pump(const Duration(milliseconds: 58999));
    expect(failures, isEmpty);
    clock.elapsed = 89000;
    await tester.pump(const Duration(milliseconds: 1));
    expect(failures, [ModuleStartupStage.handshake]);
  });

  testWidgets(
    'missing trusted document completion fails the document stage after 30 active seconds',
    (tester) async {
      final clock = _Clock();
      final failures = <ModuleStartupStage>[];
      final deadline = ModuleStartupDeadline(
        clock: clock,
        onExpired: failures.add,
      );
      deadline.beginDocument();
      clock.elapsed = 30000;
      await tester.pump(const Duration(seconds: 30));
      expect(failures, [ModuleStartupStage.document]);
      expect(deadline.stage, ModuleStartupStage.expired);
      expect(deadline.beginHandshake(), isFalse);
      expect(deadline.markReady(), isFalse);
      deadline.beginDocument();
      clock.elapsed = 90000;
      await tester.pump(const Duration(seconds: 60));
      expect(
        failures,
        hasLength(1),
        reason: 'Late callbacks cannot revive an expired document.',
      );
    },
  );

  testWidgets(
    'configured child that never sends secure ready fails its own 60 second stage',
    (tester) async {
      final clock = _Clock();
      final failures = <ModuleStartupStage>[];
      final deadline = ModuleStartupDeadline(
        clock: clock,
        onExpired: failures.add,
      );
      deadline.beginDocument();
      clock.elapsed = 10000;
      await tester.pump(const Duration(seconds: 10));
      expect(deadline.beginHandshake(), isTrue);
      clock.elapsed = 69999;
      await tester.pump(const Duration(milliseconds: 59999));
      expect(failures, isEmpty);
      clock.elapsed = 70000;
      await tester.pump(const Duration(milliseconds: 1));
      expect(failures, [ModuleStartupStage.handshake]);
      expect(deadline.markReady(), isFalse);
    },
  );

  testWidgets(
    'closing either stage cancels its budget and ignores late configuration/ready',
    (tester) async {
      for (final configured in [false, true]) {
        final clock = _Clock();
        final failures = <ModuleStartupStage>[];
        final deadline = ModuleStartupDeadline(
          clock: clock,
          onExpired: failures.add,
        );
        deadline.beginDocument();
        if (configured) expect(deadline.beginHandshake(), isTrue);
        deadline.close();
        expect(deadline.beginHandshake(), isFalse);
        expect(deadline.markReady(), isFalse);
        deadline.beginDocument();
        deadline.setActive(false);
        deadline.setActive(true);
        clock.elapsed = 120000;
        await tester.pump(const Duration(minutes: 2));
        expect(deadline.stage, ModuleStartupStage.closed);
        expect(failures, isEmpty);
      }
    },
  );

  testWidgets(
    'a validated ready envelope wins its configuration Future without restarting a timer',
    (tester) async {
      final clock = _Clock();
      final failures = <ModuleStartupStage>[];
      final deadline = ModuleStartupDeadline(
        clock: clock,
        onExpired: failures.add,
      );
      deadline.beginDocument();
      expect(deadline.markReady(), isTrue);
      expect(deadline.beginHandshake(), isFalse);
      deadline.beginDocument();
      deadline.setActive(false);
      deadline.setActive(true);
      clock.elapsed = 120000;
      await tester.pump(const Duration(minutes: 2));
      expect(deadline.stage, ModuleStartupStage.ready);
      expect(failures, isEmpty);
      deadline.close();
    },
  );

  testWidgets(
    'background and covered routes pause remaining document budget without resetting it',
    (tester) async {
      final clock = _Clock();
      final failures = <ModuleStartupStage>[];
      final deadline = ModuleStartupDeadline(
        clock: clock,
        onExpired: failures.add,
      );
      deadline.beginDocument();
      clock.elapsed = 29000;
      await tester.pump(const Duration(seconds: 29));
      deadline.setActive(false);
      expect(deadline.remaining, const Duration(seconds: 1));
      clock.elapsed = 89000;
      await tester.pump(const Duration(seconds: 60));
      expect(failures, isEmpty);
      deadline.setActive(false);
      deadline.setActive(true);
      deadline.setActive(true);
      clock.elapsed = 89999;
      await tester.pump(const Duration(milliseconds: 999));
      expect(failures, isEmpty);
      clock.elapsed = 90000;
      await tester.pump(const Duration(milliseconds: 1));
      expect(failures, [ModuleStartupStage.document]);
    },
  );

  testWidgets(
    'covered configured child resumes only the remaining secure handshake budget',
    (tester) async {
      final clock = _Clock();
      final failures = <ModuleStartupStage>[];
      final deadline = ModuleStartupDeadline(
        clock: clock,
        onExpired: failures.add,
      );
      deadline.beginDocument();
      expect(deadline.beginHandshake(), isTrue);
      clock.elapsed = 25000;
      await tester.pump(const Duration(seconds: 25));
      deadline.setActive(false);
      clock.elapsed = 85000;
      await tester.pump(const Duration(minutes: 1));
      expect(failures, isEmpty);
      expect(deadline.remaining, const Duration(seconds: 35));
      deadline.setActive(true);
      clock.elapsed = 120000;
      await tester.pump(const Duration(seconds: 35));
      expect(failures, [ModuleStartupStage.handshake]);
    },
  );

  testWidgets(
    'duplicate trusted document callbacks do not restart the child budget',
    (tester) async {
      final clock = _Clock();
      final failures = <ModuleStartupStage>[];
      final deadline = ModuleStartupDeadline(
        clock: clock,
        onExpired: failures.add,
      );
      deadline.beginDocument();
      clock.elapsed = 10000;
      await tester.pump(const Duration(seconds: 10));
      expect(deadline.beginHandshake(), isTrue);
      clock.elapsed = 40000;
      await tester.pump(const Duration(seconds: 30));
      expect(deadline.beginHandshake(), isFalse);
      expect(deadline.remaining, const Duration(seconds: 30));
      clock.elapsed = 69999;
      await tester.pump(const Duration(milliseconds: 29999));
      expect(failures, isEmpty);
      clock.elapsed = 70000;
      await tester.pump(const Duration(milliseconds: 1));
      expect(failures, [ModuleStartupStage.handshake]);
      expect(deadline.beginHandshake(), isFalse);
      expect(deadline.markReady(), isFalse);
    },
  );
}
