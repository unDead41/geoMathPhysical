import 'package:flutter/material.dart';

/// Typesets equations in the public question copy, without identifying a question.
///
/// The small grammar deliberately accepts only arithmetic and the symbols used
/// by the question copy. Unrecognised or incomplete equations remain plain text.
class GameQuestionContent extends StatelessWidget {
  const GameQuestionContent({
    super.key,
    required this.text,
    required this.languageCode,
    this.formulaKey,
    this.style,
    this.showVariables = true,
  });

  final String text;
  final String languageCode;
  final String? formulaKey;
  final TextStyle? style;
  final bool showVariables;

  @override
  Widget build(BuildContext context) {
    final content = _QuestionCopy.parse(text);
    if (content == null) return Text(text, style: style);

    final english = languageCode.toLowerCase().startsWith('en');
    final bodyStyle = DefaultTextStyle.of(context).style.merge(style);
    final mathStyle = bodyStyle.copyWith(
      fontSize: (bodyStyle.fontSize ?? 16) + 2,
      height: 1.4,
    );
    final definitions = _variableDefinitions(
      content.symbols,
      text,
      formulaKey,
      english,
    );
    final children = <Widget>[];
    var equationIndex = 0;
    var contextIndex = 0;
    for (final part in content.parts) {
      switch (part) {
        case _Prose(:final value):
          // Delimiters between equations become block spacing. All remaining
          // wording, including source definitions and question context, stays.
          final prose = value.replaceFirst(RegExp(r'^[\s;,\.]+'), '').trim();
          if (prose.isNotEmpty) {
            children.add(
              Text(
                prose,
                key: ValueKey('game-question-context-${contextIndex++}'),
                style: style,
              ),
            );
          }
        case _Equation(:final symbol, :final expression):
          final index = equationIndex++;
          children.add(
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Semantics(
                key: ValueKey('game-question-equation-$index'),
                container: true,
                label:
                    '$symbol ${english ? 'equals' : 'sama dengan'} '
                    '${expression.spoken(english)}',
                child: ExcludeSemantics(
                  child: Text.rich(
                    key: ValueKey('game-question-math-$index'),
                    TextSpan(
                      children: [
                        TextSpan(
                          text: symbol,
                          style: const TextStyle(fontStyle: FontStyle.italic),
                        ),
                        const TextSpan(text: ' = '),
                        ..._mathSpans(expression, mathStyle, context),
                      ],
                    ),
                    style: mathStyle,
                  ),
                ),
              ),
            ),
          );
      }
    }
    if (showVariables && definitions.isNotEmpty) {
      final legendStyle = bodyStyle.copyWith(
        fontSize: (bodyStyle.fontSize ?? 16) * .9,
        height: 1.45,
      );
      children.add(
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text.rich(
            key: const ValueKey('game-question-variables'),
            TextSpan(
              children: [
                for (var index = 0; index < definitions.length; index++) ...[
                  if (index > 0) const TextSpan(text: ' · '),
                  TextSpan(
                    text: definitions[index].$1,
                    style: const TextStyle(fontStyle: FontStyle.italic),
                  ),
                  TextSpan(text: ' = ${definitions[index].$2}'),
                ],
              ],
            ),
            style: legendStyle,
          ),
        ),
      );
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    );
  }
}

List<(String, String)> _variableDefinitions(
  Set<String> symbols,
  String source,
  String? formulaKey,
  bool english,
) {
  final meanings = <String, String>{
    'V': english ? 'volume' : 'isi padu',
    'L': english ? 'surface area' : 'luas permukaan',
    'a': english ? 'side length' : 'panjang sisi',
    'p': english ? 'length' : 'panjang',
    'l': english ? 'width' : 'lebar',
    't': english ? 'height' : 'tinggi',
    'j': english ? 'radius' : 'jejari',
    's': english ? 'slant height' : 'tinggi sendeng',
  };

  // Disambiguate a only when its meaning is explicitly in the visible copy.
  // The equation itself never selects a meaning, question, solid or answer.
  final sourceDefinition = RegExp(
    r'\ba\s*(?:=|is\b)\s*([^;.\n]+)',
    caseSensitive: false,
  ).firstMatch(source)?.group(1)?.toLowerCase();
  if (sourceDefinition != null) {
    if (sourceDefinition.contains('tapak') ||
        sourceDefinition.contains('square base')) {
      meanings['a'] = english
          ? 'side length of the square base'
          : 'panjang sisi tapak segi empat sama';
    } else if (RegExp(r'rusuk|tepi|edge').hasMatch(sourceDefinition)) {
      meanings['a'] = english ? 'edge length' : 'panjang rusuk';
    }
  }

  // Public, localised server definitions take precedence. The original symbol
  // names are kept even in English (j remains j, p remains p, and L remains L).
  final publicDefinitions = <String, String>{};
  for (final entry in (formulaKey ?? '').split(RegExp(r'[·;\n]'))) {
    final match = RegExp(r'^\s*([VLapltjs])\s*=\s*(.+?)\s*$').firstMatch(entry);
    if (match != null) publicDefinitions[match[1]!] = match[2]!;
  }
  meanings.addAll(publicDefinitions);
  return [
    for (final symbol in {...publicDefinitions.keys, ...symbols})
      if (meanings.containsKey(symbol)) (symbol, meanings[symbol]!),
  ];
}

sealed class _CopyPart {}

final class _Prose extends _CopyPart {
  _Prose(this.value);
  final String value;
}

final class _Equation extends _CopyPart {
  _Equation(this.symbol, this.expression);
  final String symbol;
  final _MathNode expression;
}

final class _QuestionCopy {
  _QuestionCopy(this.parts, this.symbols);
  final List<_CopyPart> parts;
  final Set<String> symbols;

  static _QuestionCopy? parse(String source) {
    if (source.length > 4096) return null;
    final candidates = RegExp(r'\b([VL])\s*=').allMatches(source).toList();
    if (candidates.isEmpty || candidates.length > 8) return null;
    final parts = <_CopyPart>[];
    final symbols = <String>{};
    var previousEnd = 0;
    try {
      for (final candidate in candidates) {
        if (candidate.start < previousEnd) return null;
        final parser = _MathParser(source, candidate.end);
        final expression = parser.expression();
        parser.requireEndOfEquation();
        if (parser.position - candidate.end > 160) return null;
        if (candidate.start > previousEnd) {
          parts.add(_Prose(source.substring(previousEnd, candidate.start)));
        }
        final symbol = candidate[1]!;
        parts.add(_Equation(symbol, expression));
        symbols.add(symbol);
        symbols.addAll(expression.symbols);
        previousEnd = parser.position;
      }
      if (previousEnd < source.length) {
        parts.add(_Prose(source.substring(previousEnd)));
      }
      return _QuestionCopy(parts, symbols);
    } on FormatException {
      return null;
    }
  }
}

/// A bounded reader, never an evaluator. Operators have conventional precedence.
final class _MathParser {
  _MathParser(this.source, this.position);
  final String source;
  int position;
  int _atoms = 0;
  int _depth = 0;

  int get _next {
    var index = position;
    while (index < source.length && RegExp(r'\s').hasMatch(source[index])) {
      index++;
    }
    return index;
  }

  bool _take(String token) {
    final index = _next;
    if (!source.startsWith(token, index)) return false;
    position = index + token.length;
    return true;
  }

  _MathNode expression() {
    var node = _product();
    while (true) {
      if (_take('+')) {
        node = _Binary('+', node, _product());
      } else if (_take('-') || _take('−')) {
        node = _Binary('−', node, _product());
      } else {
        return node;
      }
    }
  }

  _MathNode _product() {
    var node = _power();
    while (true) {
      if (_take('*') || _take('×') || _take('·')) {
        node = _Binary('×', node, _power());
      } else if (_take('/')) {
        node = _Fraction(node, _power());
      } else {
        return node;
      }
    }
  }

  _MathNode _power() {
    final base = _atom();
    if (!_take('^')) return base;
    final index = _next;
    if (index >= source.length || !RegExp(r'[1-9]').hasMatch(source[index])) {
      throw const FormatException('Unsupported power');
    }
    position = index + 1;
    return _Power(base, source[index]);
  }

  _MathNode _atom() {
    if (++_atoms > 48 || _depth > 8) {
      throw const FormatException('Equation is too large');
    }
    if (_take('(')) {
      _depth++;
      final node = expression();
      _depth--;
      if (!_take(')')) throw const FormatException('Unclosed parentheses');
      return _Group(node);
    }
    final index = _next;
    if (index >= source.length) {
      throw const FormatException('Missing operand');
    }
    final rest = source.substring(index);
    final number = RegExp(r'^\d{1,3}(?:\.\d{1,3})?').firstMatch(rest);
    if (number != null) {
      position = index + number[0]!.length;
      return _Atom(number[0]!, isNumber: true);
    }
    final symbol = RegExp(r'^(pi|π|[VLapltjs])(?![A-Za-z])').firstMatch(rest);
    if (symbol != null) {
      position = index + symbol[0]!.length;
      return _Atom(symbol[0] == 'pi' ? 'π' : symbol[0]!);
    }
    throw const FormatException('Unsupported operand');
  }

  void requireEndOfEquation() {
    if (position < source.length &&
        !RegExp(r'[\s;,.?!:]').hasMatch(source[position])) {
      throw const FormatException('Unconsumed mathematical token');
    }
    final index = _next;
    if (index == source.length) return;
    final tail = source.substring(index);
    if (RegExp(r'^[\d=^*/×÷+−%()\[\]{}²³√]').hasMatch(tail) ||
        RegExp(r'^(?:pi|π|[VLapltjs])\b(?!\s*(?:=|is\b))').hasMatch(tail)) {
      throw const FormatException('Unconsumed mathematical notation');
    }
  }
}

sealed class _MathNode {
  Set<String> get symbols;
  String spoken(bool english);
}

final class _Atom extends _MathNode {
  _Atom(this.value, {this.isNumber = false});
  final String value;
  final bool isNumber;
  @override
  Set<String> get symbols => isNumber || value == 'π' ? {} : {value};
  @override
  String spoken(bool english) => value == 'π' ? 'pi' : value;
}

final class _Binary extends _MathNode {
  _Binary(this.operator, this.left, this.right);
  final String operator;
  final _MathNode left;
  final _MathNode right;
  @override
  Set<String> get symbols => {...left.symbols, ...right.symbols};
  @override
  String spoken(bool english) {
    final word = switch (operator) {
      '×' => english ? 'times' : 'darab',
      '+' => english ? 'plus' : 'tambah',
      _ => english ? 'minus' : 'tolak',
    };
    return '${left.spoken(english)} $word ${right.spoken(english)}';
  }
}

final class _Group extends _MathNode {
  _Group(this.child);
  final _MathNode child;
  @override
  Set<String> get symbols => child.symbols;
  @override
  String spoken(bool english) => english
      ? 'open parenthesis ${child.spoken(english)} close parenthesis'
      : 'buka kurungan ${child.spoken(english)} tutup kurungan';
}

final class _Power extends _MathNode {
  _Power(this.base, this.exponent);
  final _MathNode base;
  final String exponent;
  @override
  Set<String> get symbols => base.symbols;
  @override
  String spoken(bool english) {
    final power = switch (exponent) {
      '2' => english ? 'squared' : 'kuasa dua',
      '3' => english ? 'cubed' : 'kuasa tiga',
      _ => english ? 'to the power of $exponent' : 'kuasa $exponent',
    };
    return '${base.spoken(english)} $power';
  }
}

final class _Fraction extends _MathNode {
  _Fraction(this.numerator, this.denominator);
  final _MathNode numerator;
  final _MathNode denominator;
  @override
  Set<String> get symbols => {...numerator.symbols, ...denominator.symbols};
  @override
  String spoken(bool english) => english
      ? 'fraction ${numerator.spoken(english)} over '
            '${denominator.spoken(english)} end fraction'
      : 'pecahan ${numerator.spoken(english)} per '
            '${denominator.spoken(english)} tamat pecahan';
}

List<InlineSpan> _mathSpans(
  _MathNode node,
  TextStyle style,
  BuildContext context,
) => switch (node) {
  _Atom(:final value, :final isNumber) => [
    TextSpan(
      text: value,
      style: TextStyle(
        fontStyle: isNumber ? FontStyle.normal : FontStyle.italic,
      ),
    ),
  ],
  _Binary(:final operator, :final left, :final right) => [
    ..._mathSpans(left, style, context),
    TextSpan(text: ' $operator '),
    ..._mathSpans(right, style, context),
  ],
  _Group(:final child) => [
    const TextSpan(text: '('),
    ..._mathSpans(child, style, context),
    const TextSpan(text: ')'),
  ],
  _Power(:final base, :final exponent) => [
    ..._mathSpans(base, style, context),
    WidgetSpan(
      alignment: PlaceholderAlignment.aboveBaseline,
      baseline: TextBaseline.alphabetic,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.textScalerOf(context).scale(style.fontSize!) * .14,
        ),
        child: Text(
          exponent,
          style: style.copyWith(fontSize: style.fontSize! * .65, height: 1),
        ),
      ),
    ),
  ],
  _Fraction(:final numerator, :final denominator) => [
    WidgetSpan(
      alignment: PlaceholderAlignment.middle,
      child: _StackedFraction(
        numerator: numerator,
        denominator: denominator,
        style: style,
      ),
    ),
  ],
};

final class _StackedFraction extends StatelessWidget {
  const _StackedFraction({
    required this.numerator,
    required this.denominator,
    required this.style,
  });
  final _MathNode numerator;
  final _MathNode denominator;
  final TextStyle style;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 3),
    child: IntrinsicWidth(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text.rich(
              key: const ValueKey('game-question-fraction-numerator'),
              TextSpan(children: _mathSpans(numerator, style, context)),
              textAlign: TextAlign.center,
              style: style,
            ),
          ),
          Divider(
            key: const ValueKey('game-question-fraction-bar'),
            color: style.color ?? DefaultTextStyle.of(context).style.color,
            height: 5,
            thickness: 1,
          ),
          Text.rich(
            key: const ValueKey('game-question-fraction-denominator'),
            TextSpan(children: _mathSpans(denominator, style, context)),
            textAlign: TextAlign.center,
            style: style,
          ),
        ],
      ),
    ),
  );
}
