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
    expect(deadline.documentConfigured(), isTrue);
    clock.elapsed = 30000;
    await tester.pump(const Duration(seconds: 1));
    expect(
      failures,
      isEmpty,
      reason:
          'Native attachment/document parsing is not secure handshake time.',
    );
    expect(deadline.stage, ModuleStartupStage.handshake);
    clock.elapsed = 58999;
    await tester.pump(const Duration(milliseconds: 28999));
    expect(failures, isEmpty);
    clock.elapsed = 59000;
    await tester.pump(const Duration(milliseconds: 1));
    expect(failures, [ModuleStartupStage.handshake]);
  });

  testWidgets(
    'missing trusted configuration fails the document stage after 30 active seconds',
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
      expect(deadline.documentConfigured(), isFalse);
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
    'configured child that never sends secure ready fails its own 30 second stage',
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
      expect(deadline.documentConfigured(), isTrue);
      clock.elapsed = 39999;
      await tester.pump(const Duration(milliseconds: 29999));
      expect(failures, isEmpty);
      clock.elapsed = 40000;
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
        if (configured) expect(deadline.documentConfigured(), isTrue);
        deadline.close();
        expect(deadline.documentConfigured(), isFalse);
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
      expect(deadline.documentConfigured(), isFalse);
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
      expect(deadline.documentConfigured(), isTrue);
      clock.elapsed = 25000;
      await tester.pump(const Duration(seconds: 25));
      deadline.setActive(false);
      clock.elapsed = 85000;
      await tester.pump(const Duration(minutes: 1));
      expect(failures, isEmpty);
      expect(deadline.remaining, const Duration(seconds: 5));
      deadline.setActive(true);
      clock.elapsed = 90000;
      await tester.pump(const Duration(seconds: 5));
      expect(failures, [ModuleStartupStage.handshake]);
    },
  );
}
