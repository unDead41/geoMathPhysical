import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geomath_flutter/features/duel/presentation/game_question_content.dart';
import 'package:geomath_flutter/features/solo/presentation/solo_strings.dart'
    show englishQuestions;

void main() {
  Future<void> pumpQuestion(
    WidgetTester tester, {
    required String text,
    String languageCode = 'ms',
    String? formulaKey,
    bool showVariables = true,
    double scale = 1,
    TextStyle? style,
  }) => tester.pumpWidget(
    MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: GameQuestionContent(
            text: text,
            languageCode: languageCode,
            formulaKey: formulaKey,
            showVariables: showVariables,
            style: style,
          ),
        ),
      ),
    ),
  );

  String legend(WidgetTester tester) => tester
      .widget<Text>(find.byKey(const ValueKey('game-question-variables')))
      .textSpan!
      .toPlainText();

  String equation(WidgetTester tester, [int index = 0]) => tester
      .widget<Text>(find.byKey(ValueKey('game-question-math-$index')))
      .textSpan!
      .toPlainText();

  testWidgets('the screenshot product uses times and explains every symbol', (
    tester,
  ) async {
    const context = 'p,l,t ialah 3 ukuran berbeza. Bongkah apakah ini?';
    await pumpQuestion(tester, text: 'V=p*l*t; $context');
    expect(equation(tester), 'V = p × l × t');
    expect(find.text(context), findsOneWidget);
    expect(
      legend(tester),
      'V = isi padu · p = panjang · l = lebar · t = tinggi',
    );
    expect(find.textContaining('cuboid'), findsNothing);
    expect(find.textContaining('balok'), findsNothing);

    await pumpQuestion(
      tester,
      text:
          'V=p*l*t; p, l and t are three different dimensions. '
          'Which solid is this?',
      languageCode: 'en',
    );
    expect(equation(tester), 'V = p × l × t');
    expect(legend(tester), 'V = volume · p = length · l = width · t = height');
  });

  testWidgets('pyramid and cone divide their entire numerator by three', (
    tester,
  ) async {
    for (final text in [
      'V=a^2*t/3; t=tinggi a=sisi tapak persegi Bongkah apakah ini?',
      'V=pi*j^2*t/3 j=jejari; t=tinggi. Bongkah apakah ini?',
    ]) {
      await pumpQuestion(tester, text: text);
      final numerator = find.byKey(
        const ValueKey('game-question-fraction-numerator'),
      );
      final bar = find.byKey(const ValueKey('game-question-fraction-bar'));
      final denominator = find.byKey(
        const ValueKey('game-question-fraction-denominator'),
      );
      expect(numerator, findsOneWidget);
      expect(bar, findsOneWidget);
      expect(denominator, findsOneWidget);
      expect(tester.widget<Text>(denominator).textSpan!.toPlainText(), '3');
      final numeratorCopy = tester
          .widget<Text>(numerator)
          .textSpan!
          .toPlainText();
      expect(numeratorCopy, contains('× t'));
      expect(
        numeratorCopy,
        text.contains('pi') ? startsWith('π × j') : startsWith('a'),
      );
      expect(
        tester.getBottomLeft(numerator).dy,
        lessThan(tester.getCenter(bar).dy),
      );
      expect(
        tester.getTopLeft(denominator).dy,
        greaterThan(tester.getCenter(bar).dy),
      );
      final powers = tester.widget<Text>(numerator).textSpan! as TextSpan;
      expect(
        powers.children!.whereType<WidgetSpan>().single.alignment,
        PlaceholderAlignment.aboveBaseline,
      );
      expect(find.text('2'), findsOneWidget);
      expect(tester.takeException(), isNull);
    }
    expect(legend(tester), 'V = isi padu · j = jejari · t = tinggi');
  });

  testWidgets(
    'all equations remain visible with original intervening context',
    (tester) async {
      await pumpQuestion(
        tester,
        text: 'Use these: V=pi*j^2*t; L=2*pi*j*(j+t). Which solid is this?',
        languageCode: 'en',
      );
      expect(find.text('Use these:'), findsOneWidget);
      expect(find.text('Which solid is this?'), findsOneWidget);
      expect(equation(tester), startsWith('V = π × j'));
      expect(equation(tester, 1), 'L = 2 × π × j × (j + t)');
      expect(
        legend(tester),
        'V = volume · j = radius · t = height · L = surface area',
      );
    },
  );

  testWidgets('public formulaKey values and order take precedence', (
    tester,
  ) async {
    const publicKey = 'V = volume · L = surface area · j = radius · t = height';
    await pumpQuestion(
      tester,
      text: 'V=pi*j^2*t L=2*pi*j*(j+t) Which solid is this?',
      languageCode: 'en',
      formulaKey: publicKey,
    );
    expect(legend(tester), publicKey);
    await pumpQuestion(
      tester,
      text: 'V=p*l*t; Which solid is this?',
      languageCode: 'en',
      formulaKey: 'p = supplied length · t = supplied vertical height',
    );
    expect(
      legend(tester),
      'p = supplied length · t = supplied vertical height · V = volume · l = width',
    );
    await pumpQuestion(
      tester,
      text: 'V=p*l*t; Which solid is this?',
      languageCode: 'en',
      formulaKey: publicKey,
      showVariables: false,
    );
    expect(find.byKey(const ValueKey('game-question-variables')), findsNothing);
    expect(equation(tester), 'V = p × l × t');
  });

  testWidgets(
    'a is specialized only by the explicit public source definition',
    (tester) async {
      await pumpQuestion(
        tester,
        text: 'V=a^2*t/3. Which solid is this?',
        languageCode: 'en',
      );
      expect(legend(tester), 'V = volume · a = side length · t = height');
      await pumpQuestion(
        tester,
        text:
            'V=a^2*t/3; a is the square base side and t is the height. '
            'Which solid is this?',
        languageCode: 'en',
      );
      expect(
        legend(tester),
        'V = volume · a = side length of the square base · t = height',
      );
      await pumpQuestion(
        tester,
        text: 'V=a^3; L=6*a^2 a=panjang rusuk Bongkah apakah ini?',
      );
      expect(
        legend(tester),
        'V = isi padu · a = panjang rusuk · L = luas permukaan',
      );
    },
  );

  testWidgets('spoken equations convey operations and fraction grouping once', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    await pumpQuestion(
      tester,
      text: 'V=p*l*t; Which solid is this?',
      languageCode: 'en',
    );
    expect(find.bySemanticsLabel('V equals p times l times t'), findsOneWidget);
    expect(find.bySemanticsLabel('V = p × l × t'), findsNothing);
    await pumpQuestion(tester, text: 'V=pi*j^2*t/3; Bongkah apakah ini?');
    expect(
      find.bySemanticsLabel(
        'V sama dengan pecahan pi darab j kuasa dua darab t per 3 tamat pecahan',
      ),
      findsOneWidget,
    );
    await pumpQuestion(
      tester,
      text: 'L=pi*j*(j+s); Which solid is this?',
      languageCode: 'en',
    );
    expect(
      find.bySemanticsLabel(
        'L equals pi times j times open parenthesis j plus s close parenthesis',
      ),
      findsOneWidget,
    );
    expect(legend(tester), 'L = surface area · j = radius · s = slant height');
    semantics.dispose();
  });

  testWidgets('unsupported syntax and ordinary copy fall back unchanged', (
    tester,
  ) async {
    for (final text in [
      'Bongkah apakah ini? Tapak persegi dengan 4 muka segi tiga.',
      'Kotak: 6cm x 4cm dengan tinggi 3cm. Pilih bentangannya.',
      'a^2 ialah luas tapak. Fikir bentuk muka sisi bongkah.',
      'V=sin(j); Which solid is this?',
      'V=p*l*t**2; Which solid is this?',
      'V=a^12; Which solid is this?',
      'V=a^2*t/; Which solid is this?',
      'V=a^(2)*t; Which solid is this?',
      'V=p*l*t^0; Which solid is this?',
      'V=(p*l*t; Which solid is this?',
      'V=p*l*t=3; Which solid is this?',
      'V=6abc; Which solid is this?',
      'V=a²; Which solid is this?',
      'V=a ÷ 3; Which solid is this?',
      'V=p*l*t; L=unknown(j)',
      'V=${'(' * 12}p${')' * 12}',
      'V=${'p*' * 60}t',
      'V=p*l*t ${'context ' * 600}',
    ]) {
      await pumpQuestion(tester, text: text);
      expect(find.text(text), findsOneWidget, reason: text);
      expect(find.byKey(const ValueKey('game-question-math-0')), findsNothing);
      expect(
        find.byKey(const ValueKey('game-question-variables')),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('actual bank, English copy and public Duel prompts fit at 150%', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 700);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final bank = jsonDecode(
      File('assets/contracts/bank15.json').readAsStringSync(),
    ) as Map<String, dynamic>;
    final fixture = jsonDecode(
      File('test/features/duel/fixtures/source_projection.json')
          .readAsStringSync(),
    ) as Map<String, dynamic>;
    final samples = <(String, String, String?)>[
      for (final question in bank['questions'] as List)
        (question['prompt'] as String, 'ms', null),
      for (final copy in englishQuestions.values) (copy.$1, 'en', null),
    ];
    // Only the wire-visible copy and formulaKey are handed to the presentation.
    // No settled shape, question ID or answer data enters the widget.
    for (final entry
        in (fixture['snapshots'] as Map<String, dynamic>).entries) {
      if (!entry.key.startsWith('active_')) continue;
      final question = entry.value['currentQuestion'] as Map<String, dynamic>;
      for (final language in ['ms', 'en']) {
        samples.add((
          question['copy'][language]['prompt'] as String,
          language,
          (question['formulaKey'] as Map<String, dynamic>?)?[language]
              as String?,
        ));
      }
    }
    expect(samples, hasLength(60));
    var formattedCount = 0;
    for (final sample in samples) {
      await pumpQuestion(
        tester,
        text: sample.$1,
        languageCode: sample.$2,
        formulaKey: sample.$3,
        scale: 1.5,
        style: const TextStyle(fontSize: 22),
      );
      if (RegExp(r'\b[VL]=').hasMatch(sample.$1)) {
        formattedCount++;
        expect(
          find.byKey(const ValueKey('game-question-equation-0')),
          findsOneWidget,
          reason: sample.$1,
        );
        expect(legend(tester), isNotEmpty);
      } else {
        expect(find.text(sample.$1), findsOneWidget);
      }
      expect(tester.takeException(), isNull, reason: sample.$1);
      final math = find.byWidgetPredicate(
        (widget) =>
            widget is Text &&
            widget.key is ValueKey<String> &&
            (widget.key! as ValueKey<String>).value.startsWith(
              'game-question-math-',
            ),
      );
      for (final element in math.evaluate()) {
        final rect = tester.getRect(find.byWidget(element.widget));
        expect(rect.left, greaterThanOrEqualTo(16));
        expect(rect.right, lessThanOrEqualTo(304));
      }
    }
    expect(formattedCount, 24);
  });

  test('runtime presentation depends only on Flutter and public strings', () {
    final source = File(
      'lib/features/duel/presentation/game_question_content.dart',
    ).readAsStringSync();
    expect(
      RegExp(
        r'''^import\s+['"]([^'"]+)''',
        multiLine: true,
      ).allMatches(source).map((match) => match[1]),
      ['package:flutter/material.dart'],
    );
    for (final forbidden in [
      'SoloBank',
      'GeometryShape',
      'settledShape',
      'question.id',
      'WebView',
      'dart:io',
      'dart:convert',
    ]) {
      expect(source, isNot(contains(forbidden)));
    }
  });
}
