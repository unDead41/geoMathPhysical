import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/core/design/geomath_theme.dart';
import 'package:geomath_flutter/core/widgets/widgets.dart';
import 'package:geomath_flutter/features/duel/presentation/game_card_carousel.dart';

const _prefix = 'game-choices';
const _previous = ValueKey('$_prefix-previous');
const _next = ValueKey('$_prefix-next');
const _position = ValueKey('$_prefix-position');
const _scroll = ValueKey('$_prefix-scroll');

Widget _app({
  Object scope = 'question-1-solid',
  bool dark = false,
  bool english = true,
  double textScale = 1,
  bool reducedMotion = false,
  bool disableAnimations = false,
  int count = 5,
  bool longLabels = false,
  ValueChanged<int>? onSelected,
}) => MaterialApp(
  theme: dark ? GeoMathTheme.dark() : GeoMathTheme.light(),
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(
      textScaler: TextScaler.linear(textScale),
      disableAnimations: disableAnimations,
    ),
    child: child!,
  ),
  home: Scaffold(
    body: SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: GameCardCarousel(
          key: const ValueKey('carousel'),
          scopeKey: scope,
          keyPrefix: _prefix,
          itemCount: count,
          reducedMotion: reducedMotion,
          previousLabel: english ? 'Previous card' : 'Kad sebelumnya',
          nextLabel: english ? 'Next card' : 'Kad seterusnya',
          positionLabel: (index, count) =>
              english ? 'Card $index of $count' : 'Kad $index daripada $count',
          cardBuilder: (context, index, cardWidth) => GeoMathCard(
            key: ValueKey('choice-$index'),
            padding: const EdgeInsets.all(10),
            onTap: () => onSelected?.call(index),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox.square(
                  dimension: 88,
                  child: Icon(Icons.category_outlined, size: 64),
                ),
                const SizedBox(height: 8),
                Text(
                  longLabels
                      ? 'Pilihan bentangan pepejal ${String.fromCharCode(65 + index)}'
                      : 'Solid ${String.fromCharCode(65 + index)}',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  ),
);

ScrollPosition _scrollPosition(WidgetTester tester) => tester
    .state<ScrollableState>(
      find.descendant(
        of: find.byKey(_scroll),
        matching: find.byType(Scrollable),
      ),
    )
    .position;

String _positionText(WidgetTester tester) =>
    tester.widget<Text>(find.byKey(_position)).data!;

void _setSize(WidgetTester tester, double width) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = Size(width, 700);
  addTearDown(tester.view.reset);
}

void main() {
  testWidgets('eager cards preserve their keys and show a next-card peek', (
    tester,
  ) async {
    _setSize(tester, 390);
    await tester.pumpWidget(_app());

    for (var index = 0; index < 5; index++) {
      expect(find.byKey(ValueKey('choice-$index')), findsOneWidget);
    }
    final viewport = tester.getRect(find.byKey(_scroll));
    final first = tester.getRect(find.byKey(const ValueKey('choice-0')));
    final second = tester.getRect(find.byKey(const ValueKey('choice-1')));
    expect(first.right, lessThan(viewport.right));
    expect(second.left, lessThan(viewport.right));
    expect(second.right, greaterThan(viewport.right));
    expect(_positionText(tester), 'Card 1 of 5');
    expect(tester.widget<IconButton>(find.byKey(_previous)).onPressed, isNull);
    expect(tester.widget<IconButton>(find.byKey(_next)).onPressed, isNotNull);
    expect(tester.takeException(), isNull);
  });

  testWidgets('arrows, swipe, and ensureVisible browse without selecting', (
    tester,
  ) async {
    _setSize(tester, 390);
    final selections = <int>[];
    await tester.pumpWidget(_app(onSelected: selections.add));

    await tester.tap(find.byKey(_next));
    await tester.pumpAndSettle();
    expect(_positionText(tester), 'Card 2 of 5');
    await tester.tap(find.byKey(_previous));
    await tester.pumpAndSettle();
    expect(_positionText(tester), 'Card 1 of 5');
    await tester.drag(find.byKey(_scroll), const Offset(-260, 0));
    await tester.pumpAndSettle();
    expect(_scrollPosition(tester).pixels, greaterThan(0));
    expect(_positionText(tester), isNot('Card 1 of 5'));
    expect(selections, isEmpty);

    for (var index = 0; index < 5; index++) {
      await tester.ensureVisible(find.byKey(ValueKey('choice-$index')));
      await tester.pumpAndSettle();
      expect(_positionText(tester), 'Card ${index + 1} of 5');
    }
    expect(selections, isEmpty);
    expect(tester.widget<IconButton>(find.byKey(_next)).onPressed, isNull);
    await tester.tap(find.byKey(const ValueKey('choice-4')));
    expect(selections, [4]);
    await tester.tap(find.byKey(_previous));
    await tester.pumpAndSettle();
    expect(_positionText(tester), 'Card 4 of 5');
    expect(selections, [4]);
    expect(tester.takeException(), isNull);
  });

  testWidgets('preferences retain browse offset; a new scope resets it', (
    tester,
  ) async {
    _setSize(tester, 390);
    await tester.pumpWidget(_app());
    await tester.tap(find.byKey(_next));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(_next));
    await tester.pumpAndSettle();
    final offset = _scrollPosition(tester).pixels;
    expect(_positionText(tester), 'Card 3 of 5');

    await tester.pumpWidget(
      _app(dark: true, english: false, textScale: 1.5, reducedMotion: true),
    );
    await tester.pumpAndSettle();
    expect(_scrollPosition(tester).pixels, offset);
    expect(_positionText(tester), 'Kad 3 daripada 5');

    await tester.pumpWidget(
      _app(scope: 'question-1-net', dark: true, english: false, textScale: 1.5),
    );
    await tester.pumpAndSettle();
    expect(_scrollPosition(tester).pixels, 0);
    expect(_positionText(tester), 'Kad 1 daripada 5');
    expect(tester.takeException(), isNull);
  });

  for (final platformPreference in [false, true]) {
    testWidgets(
      '${platformPreference ? 'platform' : 'explicit'} reduced motion jumps immediately',
      (tester) async {
        _setSize(tester, 390);
        await tester.pumpWidget(
          _app(
            reducedMotion: !platformPreference,
            disableAnimations: platformPreference,
          ),
        );
        await tester.tap(find.byKey(_next));
        await tester.pump();
        expect(_positionText(tester), 'Card 2 of 5');
        expect(_scrollPosition(tester).isScrollingNotifier.value, isFalse);
        expect(tester.takeException(), isNull);
      },
    );
  }

  for (final width in [320.0, 390.0, 768.0]) {
    for (final textScale in [1.0, 1.5]) {
      testWidgets(
        'cards and 48 dp controls fit $width dp at $textScale scale',
        (tester) async {
          _setSize(tester, width);
          final semantics = tester.ensureSemantics();
          try {
            await tester.pumpWidget(
              _app(
                dark: width == 768,
                english: false,
                textScale: textScale,
                longLabels: true,
              ),
            );
            for (final key in [_previous, _next]) {
              final size = tester.getSize(find.byKey(key));
              expect(size.width, greaterThanOrEqualTo(48));
              expect(size.height, greaterThanOrEqualTo(48));
            }
            expect(
              tester
                  .getSemantics(find.byKey(_previous))
                  .getSemanticsData()
                  .tooltip,
              'Kad sebelumnya',
            );
            expect(
              tester.getSemantics(find.byKey(_next)).getSemanticsData().tooltip,
              'Kad seterusnya',
            );
            expect(
              tester.getSize(find.byType(GameCardCarousel)).height,
              lessThan(320),
            );
            for (var index = 0; index < 5; index++) {
              await tester.ensureVisible(find.byKey(ValueKey('choice-$index')));
              await tester.pumpAndSettle();
              expect(tester.takeException(), isNull);
            }
          } finally {
            semantics.dispose();
          }
        },
      );
    }
  }

  testWidgets('empty and single-card states have disabled boundary controls', (
    tester,
  ) async {
    _setSize(tester, 320);
    for (final count in [0, 1]) {
      await tester.pumpWidget(_app(count: count, scope: count));
      await tester.pumpAndSettle();
      expect(_positionText(tester), 'Card $count of $count');
      expect(
        tester.widget<IconButton>(find.byKey(_previous)).onPressed,
        isNull,
      );
      expect(tester.widget<IconButton>(find.byKey(_next)).onPressed, isNull);
      expect(tester.takeException(), isNull);
    }
  });
}
