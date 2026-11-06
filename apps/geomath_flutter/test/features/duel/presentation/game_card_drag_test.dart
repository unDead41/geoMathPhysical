import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/geometry/geometry_card_provider.dart';
import 'package:geomath_flutter/features/duel/presentation/game_card_drag.dart';

const _scope = ('actor-a', 'attempt-1', 'question-1', GeometryCardKind.solid);
const _card = ValueKey('choice');
const _reader = ValueKey('reader');
const _scan = ValueKey('scan');

Widget _app({
  Object cardScope = _scope,
  Object readerScope = _scope,
  GeometryCardKind readerKind = GeometryCardKind.solid,
  bool active = true,
  bool Function()? canSelect,
  required ValueChanged<GeometryShape> select,
  required VoidCallback scan,
}) => MaterialApp(
  home: Scaffold(
    body: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GameCardDraggable(
            data: GameCardDragData(
              scopeKey: cardScope,
              shape: GeometryShape.cube,
              kind: GeometryCardKind.solid,
            ),
            enabled: true,
            label: 'Solid A',
            child: InkWell(
              key: _card,
              onTap: () => select(GeometryShape.cube),
              child: const SizedBox(height: 100, child: Text('Solid A')),
            ),
          ),
          const SizedBox(height: 20),
          GameReaderTarget(
            key: _reader,
            scopeKey: readerScope,
            kind: readerKind,
            active: active,
            canSelect: canSelect ?? () => true,
            onSelected: select,
            title: 'R1 · Active reader',
            message: 'Drop to select; scan to confirm.',
            child: FilledButton(
              key: _scan,
              onPressed: scan,
              child: const Text('Scan'),
            ),
          ),
        ],
      ),
    ),
  ),
);

Future<TestGesture> _startDrag(WidgetTester tester) async {
  final gesture = await tester.startGesture(
    tester.getCenter(find.byKey(_card)),
  );
  await tester.pump(kLongPressTimeout + const Duration(milliseconds: 50));
  await gesture.moveTo(tester.getCenter(find.byKey(_reader)));
  await tester.pump();
  return gesture;
}

void main() {
  testWidgets('drag and tap both select; only an explicit scan submits', (
    tester,
  ) async {
    final selections = <GeometryShape>[];
    var scans = 0;
    await tester.pumpWidget(_app(select: selections.add, scan: () => scans++));
    final gesture = await _startDrag(tester);
    expect(selections, isEmpty);
    expect(scans, 0);
    await gesture.up();
    await tester.pump();
    expect(selections, [GeometryShape.cube]);
    expect(scans, 0);
    await tester.tap(find.byKey(_card));
    expect(selections, [GeometryShape.cube, GeometryShape.cube]);
    expect(scans, 0);
    await tester.tap(find.byKey(_scan));
    expect(scans, 1);
    expect(tester.takeException(), isNull);
  });

  for (final mismatch in ['actor', 'question', 'stage', 'inactive', 'paused']) {
    testWidgets('an in-flight $mismatch change rejects the old card', (
      tester,
    ) async {
      final selections = <GeometryShape>[];
      var valid = true;
      Widget app({bool changed = false}) => _app(
        readerScope: changed && mismatch == 'actor'
            ? ('actor-b', 'attempt-1', 'question-1', GeometryCardKind.solid)
            : changed && mismatch == 'question'
            ? ('actor-a', 'attempt-1', 'question-2', GeometryCardKind.solid)
            : _scope,
        readerKind: changed && mismatch == 'stage'
            ? GeometryCardKind.net
            : GeometryCardKind.solid,
        active: !(changed && mismatch == 'inactive'),
        canSelect: () => valid,
        select: selections.add,
        scan: () => fail('Dragging must not scan.'),
      );
      await tester.pumpWidget(app());
      final gesture = await _startDrag(tester);
      if (mismatch == 'paused') valid = false;
      await tester.pumpWidget(app(changed: true));
      await gesture.up();
      await tester.pump();
      expect(selections, isEmpty);
      expect(tester.takeException(), isNull);
    });
  }
}
