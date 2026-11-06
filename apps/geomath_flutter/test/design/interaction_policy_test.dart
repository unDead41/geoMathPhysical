import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/design.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';

void main() {
  test('app scaling preserves the system nonlinear curve without a clamp', () {
    const scaler = GeoMathTextScaler(system: _NonlinearScaler(), appScale: 1.5);
    expect(scaler.scale(16), 48);
    expect(scaler.scale(32), 72);
    expect(
      const GeoMathTextScaler(
        system: TextScaler.linear(2),
        appScale: 1.5,
      ).scale(16),
      48,
    );
  });

  for (final scenario in [
    (name: 'enabled', haptics: true, motion: false, system: false, calls: 1),
    (
      name: 'haptics off',
      haptics: false,
      motion: false,
      system: false,
      calls: 0,
    ),
    (
      name: 'reduced motion',
      haptics: true,
      motion: true,
      system: false,
      calls: 0,
    ),
    (
      name: 'system reduced motion',
      haptics: true,
      motion: false,
      system: true,
      calls: 0,
    ),
  ]) {
    testWidgets('selection feedback honors ${scenario.name}', (tester) async {
      final calls = <MethodCall>[];
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          calls.add(call);
          return null;
        },
      );
      addTearDown(() {
        tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        );
      });
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(disableAnimations: scenario.system),
            child: GeoFeedbackPolicy(
              hapticsEnabled: scenario.haptics,
              reducedMotion: scenario.motion,
              child: Builder(
                builder: (context) => TextButton(
                  onPressed: () => GeoFeedback.selection(context),
                  child: const Text('Select'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Select'));
      await tester.pump();
      final haptics = calls.where(
        (call) => call.method == 'HapticFeedback.vibrate',
      );
      expect(haptics.length, scenario.calls);
      if (scenario.calls > 0) {
        expect(haptics.single.arguments, 'HapticFeedbackType.selectionClick');
      }
    });
  }

  testWidgets('unavailable optional haptics do not fail a selection', (
    tester,
  ) async {
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'HapticFeedback.vibrate') {
          throw PlatformException(code: 'unavailable');
        }
        return null;
      },
    );
    addTearDown(() {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      );
    });
    var selected = false;
    await tester.pumpWidget(
      MaterialApp(
        home: GeoFeedbackPolicy(
          hapticsEnabled: true,
          reducedMotion: false,
          child: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                await GeoFeedback.selection(context);
                selected = true;
              },
              child: const Text('Select'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Select'));
    await tester.pump();
    expect(selected, isTrue);
    expect(tester.takeException(), isNull);
  });
}

final class _NonlinearScaler extends TextScaler {
  const _NonlinearScaler();

  @override
  double scale(double fontSize) => fontSize * (fontSize <= 20 ? 2 : 1.5);

  @override
  double get textScaleFactor => 2;
}
