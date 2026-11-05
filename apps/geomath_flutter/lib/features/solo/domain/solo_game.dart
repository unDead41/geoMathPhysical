import 'dart:math' as math;

import '../../../core/geometry/geometry_card_provider.dart';
import '../../../core/records/formative_record.dart';
import '../../../core/runtime/random_source.dart';
import 'solo_bank.dart';

export '../../../core/records/formative_record.dart' show SoloMode;
export '../../../core/geometry/geometry_card_provider.dart'
    show GeometryShape, GeometryCardKind;

enum SoloStatus { running, feedback, review, finished }

final class SoloAnswer {
  const SoloAnswer({
    required this.id,
    required this.shape,
    required this.topic,
    required this.outcome,
    required this.hint,
    required this.failedAt,
    required this.solid,
    required this.net,
    required this.elapsed,
  });
  final String id, topic, outcome;
  final GeometryShape shape;
  final bool hint;
  final GeometryCardKind? failedAt;
  final GeometryShape? solid, net;
  final int elapsed;
  Map<String, Object?> toJson() => {
    'id': id,
    'shape': shape.name,
    'topic': topic,
    'outcome': outcome,
    'hint': hint,
    'failedAt': failedAt?.name,
    'attempts': {'solid': solid?.name, 'net': net?.name},
    'elapsed': elapsed,
    'firstTry': outcome == 'correct',
  };
}

/// Native adaptation of the frozen tools/contracts/reference/core.mjs Game.
/// Only accepted scans consume attempts. Clock input and each RNG draw are explicit.
final class SoloGame {
  SoloGame({
    required this.bank,
    required Map<String, String> player,
    required this.random,
    this.mode = SoloMode.quiz,
    num now = 0,
    List<String>? questionIds,
  }) : player = Map.unmodifiable(player) {
    round = _buildRound(questionIds);
    _segmentStart = now.toDouble();
    _solidOrder = _shuffle(GeometryShape.values);
    _netOrder = _shuffle(GeometryShape.values);
  }
  SoloGame._replay({
    required this.bank,
    required this.player,
    required this.random,
    required this.mode,
    required this.round,
  });
  static const version = '2.9.1', ruleset = 'single-attempt-v1';
  static const blinkMs = 900, wrongMs = 1200, reviewMs = 1800;
  final SoloBank bank;
  final Map<String, String> player;
  final RandomSource random;
  final SoloMode mode;
  late final List<SoloQuestion> round;
  int _index = 0,
      _score = 0,
      _mistakes = 0,
      _hints = 0,
      _skipped = 0,
      _firstTry = 0;
  int drawsConsumed = 0;
  GeometryCardKind _stage = GeometryCardKind.solid;
  SoloStatus _status = SoloStatus.running;
  bool _hintOpen = false,
      _hintUsed = false,
      _wrongOnQuestion = false,
      _paused = false;
  GeometryShape? _solid, _net;
  String? _wrongReader, _lastOutcome;
  double _elapsed = 0,
      _segmentStart = 0,
      _pauseStart = 0,
      _transitionAt = 0,
      _reviewReadyAt = 0,
      _questionStartElapsed = 0;
  List<GeometryShape> _solidOrder = List.of(GeometryShape.values),
      _netOrder = List.of(GeometryShape.values);
  final List<SoloAnswer> _answers = [];
  SoloQuestion get question => round[_index];
  int get index => _index;
  int get total => round.length;
  int get score => _score;
  int get mistakes => _mistakes;
  int get hints => _hints;
  int get skipped => _skipped;
  int get firstTry => _firstTry;
  GeometryCardKind get stage => _stage;
  SoloStatus get status => _status;
  bool get paused => _paused;
  bool get hintOpen => _hintOpen;
  bool get hintUsed => _hintUsed;
  bool get interactive => _status == SoloStatus.running && !_paused;
  bool get reviewing => _status == SoloStatus.review;
  String? get lastOutcome => _lastOutcome;
  GeometryShape? get attemptedSolid => _solid;
  GeometryShape? get attemptedNet => _net;
  List<SoloAnswer> get answers => List.unmodifiable(_answers);
  List<GeometryShape> get solidOrder => List.unmodifiable(_solidOrder);
  List<GeometryShape> get netOrder => List.unmodifiable(_netOrder);
  double time(num now) =>
      _elapsed + (interactive ? math.max(0, now - _segmentStart) : 0);
  double get transitionAt => _transitionAt;
  double get reviewReadyAt => _reviewReadyAt;
  double _draw() {
    final value = random.nextDouble();
    if (!value.isFinite || value < 0 || value >= 1) {
      throw StateError('Invalid RNG draw.');
    }
    drawsConsumed++;
    return value;
  }

  List<T> _shuffle<T>(Iterable<T> items) {
    final result = items.toList();
    for (var i = result.length - 1; i > 0; i--) {
      final j = (_draw() * (i + 1)).floor();
      final temporary = result[i];
      result[i] = result[j];
      result[j] = temporary;
    }
    return result;
  }

  List<GeometryShape> _reshuffle(List<GeometryShape> previous) {
    for (var attempt = 0; attempt < 12; attempt++) {
      final candidate = _shuffle(GeometryShape.values);
      if (List.generate(
        5,
        (i) => candidate[i] != previous[i],
      ).every((v) => v)) {
        return candidate;
      }
    }
    final shift = 1 + (_draw() * (previous.length - 1)).floor();
    return [...previous.skip(shift), ...previous.take(shift)];
  }

  List<SoloQuestion> _buildRound(List<String>? ids) {
    if (mode == SoloMode.review) {
      if (ids == null ||
          ids.isEmpty ||
          ids.length > 15 ||
          ids.toSet().length != ids.length) {
        throw const FormatException('Invalid review round.');
      }
      return _shuffle(ids.map(bank.question));
    }
    if (mode == SoloMode.practice) return _shuffle(bank.questions);
    final selected = GeometryShape.values
        .expand(
          (shape) =>
              _shuffle(bank.questions.where((q) => q.shape == shape)).take(2),
        )
        .toList();
    return _shuffle(selected);
  }

  Map<String, Object?> scan(String kind, String shape, String target, num now) {
    if (!interactive) return {'type': 'blocked'};
    final active = _stage == GeometryCardKind.solid ? 'r1' : 'r2';
    if (target != active) return {'type': 'stage', 'target': active};
    if (kind != _stage.name ||
        !GeometryShape.values.any((s) => s.name == shape)) {
      return {'type': 'kind', 'kind': _stage.name};
    }
    final value = GeometryShape.values.byName(shape);
    if (_stage == GeometryCardKind.solid) {
      _solid = value;
    } else {
      _net = value;
    }
    if (value != question.shape) {
      _mistakes++;
      _wrongOnQuestion = true;
      _wrongReader = active;
      _beginFeedback('wrong', now);
      return {'type': 'wrong', 'target': active};
    }
    _wrongReader = null;
    if (_stage == GeometryCardKind.solid) {
      _stage = GeometryCardKind.net;
      _hintOpen = false;
      return {'type': 'solid'};
    }
    _score++;
    if (!_wrongOnQuestion) _firstTry++;
    _beginFeedback('correct', now);
    return {'type': 'correct'};
  }

  void _beginFeedback(String outcome, num now) {
    _elapsed = time(now);
    _status = outcome == 'correct' ? SoloStatus.feedback : SoloStatus.review;
    _lastOutcome = outcome;
    _transitionAt = now.toDouble() + blinkMs;
    _reviewReadyAt = now.toDouble() + reviewMs;
    _hintOpen = false;
    _answers.add(
      SoloAnswer(
        id: question.id,
        shape: question.shape,
        topic: question.topic,
        outcome: outcome,
        hint: _hintUsed,
        failedAt: outcome == 'wrong' ? _stage : null,
        solid: _solid,
        net: _net,
        elapsed: (_elapsed - _questionStartElapsed).round(),
      ),
    );
  }

  bool skip(num now) {
    if (!interactive) return false;
    _skipped++;
    _beginFeedback('skipped', now);
    return true;
  }

  bool toggleHint() {
    if (!interactive) return false;
    _hintOpen = !_hintOpen;
    if (!_hintUsed) {
      _hints++;
      _hintUsed = true;
    }
    return true;
  }

  bool update(num now) {
    if (_paused || _status != SoloStatus.feedback || now < _transitionAt) {
      return false;
    }
    return _advance(now);
  }

  bool reviewReady(num now) => reviewing && !_paused && now >= _reviewReadyAt;
  bool continueReview(num now) => reviewReady(now) ? _advance(now) : false;
  bool _advance(num now, {bool shuffle = true}) {
    if (_index == round.length - 1) {
      _status = SoloStatus.finished;
      return true;
    }
    _index++;
    _stage = GeometryCardKind.solid;
    _status = SoloStatus.running;
    _segmentStart = now.toDouble();
    _questionStartElapsed = _elapsed;
    _hintOpen = false;
    _hintUsed = false;
    _wrongOnQuestion = false;
    _solid = null;
    _net = null;
    _wrongReader = null;
    if (shuffle) {
      _solidOrder = _reshuffle(_solidOrder);
      _netOrder = _reshuffle(_netOrder);
    }
    return true;
  }

  void pause(num now) {
    if (_paused || _status == SoloStatus.finished) return;
    _elapsed = time(now);
    _paused = true;
    _pauseStart = now.toDouble();
  }

  void resume(num now) {
    if (!_paused) return;
    final gap = math.max(0, now - _pauseStart);
    if (_status == SoloStatus.feedback || reviewing) _transitionAt += gap;
    if (reviewing) _reviewReadyAt += gap;
    _segmentStart = now.toDouble();
    _paused = false;
  }

  String led(String reader, num now) {
    if (_status == SoloStatus.feedback || reviewing) {
      final clock = _paused ? _pauseStart : now;
      if (reviewing && clock >= _transitionAt) {
        return reader == _wrongReader
            ? 'red'
            : reader == 'r1' && _stage == GeometryCardKind.net
            ? 'green'
            : 'off';
      }
      final on =
          (math.max(0, clock - (_transitionAt - blinkMs)) / 150).floor() % 2 ==
          0;
      return on
          ? _lastOutcome == 'correct'
                ? 'green'
                : 'red'
          : 'off';
    }
    if (reader == 'r1' && _stage == GeometryCardKind.net) return 'green';
    if (reader != (_stage == GeometryCardKind.solid ? 'r1' : 'r2')) {
      return 'off';
    }
    return _hintOpen ? 'purple' : 'blue';
  }

  Map<String, Object?> goldenState(num now) => {
    'question_ids': round.map((q) => q.id).toList(),
    'index': _index,
    'question': question.id,
    'score': _score,
    'mistakes': _mistakes,
    'hints': _hints,
    'skipped': _skipped,
    'first_try': _firstTry,
    'stage': _stage.name,
    'status': _status.name,
    'paused': _paused,
    'elapsed_ms': time(now),
    'solid_order': _solidOrder.map((s) => s.name).toList(),
    'net_order': _netOrder.map((s) => s.name).toList(),
    'answers': _answers.map((a) => a.toJson()).toList(),
    'rng_draws_consumed': drawsConsumed,
    'led_r1': led('r1', now),
    'led_r2': led('r2', now),
  };
  Map<String, Object?>? result(String id, int completedAt) =>
      _status != SoloStatus.finished
      ? null
      : {
          'id': id,
          'version': version,
          'ruleset': ruleset,
          'mode': mode.name,
          'player': Map<String, String>.of(player),
          'score': _score,
          'total': total,
          'mistakes': _mistakes,
          'hints': _hints,
          'skipped': _skipped,
          'firstTry': _firstTry,
          'elapsed': _elapsed.round(),
          'completedAt': completedAt,
          'answers': _answers.map((a) => a.toJson()).toList(),
        };
  CompletedSoloRecord completedRecord(String id) {
    if (_status != SoloStatus.finished) throw StateError('Incomplete attempt.');
    final result = CompletedSoloRecord.fromJson({
      'attempt_id': id,
      'mode': mode.name,
      'ruleset': ruleset,
      'score': score,
      'total': total,
      'mistakes': mistakes,
      'hints': hints,
      'skipped': skipped,
      'elapsed_ms': _elapsed.round(),
    });
    if (result.valueOrNull == null) {
      throw StateError('Invalid completed attempt.');
    }
    return result.valueOrNull!;
  }

  List<String> get missedIds => _answers
      .where((a) => a.outcome != 'correct')
      .map((a) => a.id)
      .toSet()
      .toList();

  Map<String, Object?> checkpoint(num now) {
    final clock = _paused ? _pauseStart : now;
    return {
      'schema': 1,
      'ruleset': ruleset,
      'bank': bank.identity,
      'mode': mode.name,
      'player': player,
      'state': goldenState(now),
      'elapsed': time(now),
      'question_start_elapsed': _questionStartElapsed,
      'hint_open': _hintOpen,
      'hint_used': _hintUsed,
      'feedback_remaining': math.max(0, _transitionAt - clock),
      'review_remaining': math.max(0, _reviewReadyAt - clock),
    };
  }

  static SoloGame restore(
    Map<String, dynamic> snapshot,
    SoloBank bank,
    RandomSource random,
    num now,
  ) {
    void require(bool valid) {
      if (!valid) throw const FormatException('Invalid solo checkpoint.');
    }

    require(
      snapshot['schema'] == 1 &&
          snapshot['ruleset'] == ruleset &&
          snapshot['bank'] == bank.identity,
    );
    final mode = SoloMode.values.byName(snapshot['mode'] as String);
    final player = Map<String, String>.from(snapshot['player'] as Map);
    final name = player['name'] ?? '';
    require(
      name.trim().length >= 2 &&
          name.length <= 60 &&
          ['Tetamu', 'Murid', 'Pelajar'].contains(player['category']) &&
          (player['className']?.length ?? 100) <= 40,
    );
    final s = snapshot['state'] as Map<String, dynamic>;
    final ids = (s['question_ids'] as List).cast<String>();
    require(
      ids.isNotEmpty && ids.length <= 15 && ids.toSet().length == ids.length,
    );
    final round = ids.map(bank.question).toList();
    require(
      mode == SoloMode.review ||
          mode == SoloMode.practice && ids.length == 15 ||
          mode == SoloMode.quiz &&
              ids.length == 10 &&
              GeometryShape.values.every(
                (shape) => round.where((q) => q.shape == shape).length == 2,
              ),
    );
    final elapsed = (snapshot['elapsed'] as num).toDouble();
    final startElapsed = (snapshot['question_start_elapsed'] as num).toDouble();
    require(
      elapsed.isFinite &&
          elapsed >= 0 &&
          startElapsed.isFinite &&
          startElapsed >= 0 &&
          startElapsed <= elapsed,
    );
    for (final field in ['feedback_remaining', 'review_remaining']) {
      final value = snapshot[field] as num;
      require(
        value.isFinite &&
            value >= 0 &&
            value <= (field == 'feedback_remaining' ? blinkMs : reviewMs),
      );
    }
    final restored = SoloGame._replay(
      bank: bank,
      player: Map.unmodifiable(player),
      random: random,
      mode: mode,
      round: List.unmodifiable(round),
    );
    final rows = (s['answers'] as List).cast<Map<String, dynamic>>();
    require(rows.length <= ids.length);
    var answerTime = 0.0;
    for (var i = 0; i < rows.length; i++) {
      final row = rows[i];
      final duration = row['elapsed'];
      require(duration is int && duration >= 0 && row['hint'] is bool);
      if (row['hint'] == true) restored.toggleHint();
      final at = answerTime + (duration as int);
      final attempts = row['attempts'] as Map;
      if (attempts['solid'] != null) {
        restored.scan('solid', attempts['solid'] as String, 'r1', at);
      }
      if (attempts['net'] != null) {
        restored.scan('net', attempts['net'] as String, 'r2', at);
      }
      if (row['outcome'] == 'skipped') restored.skip(at);
      require(
        restored._answers.isNotEmpty &&
            _same(restored._answers.last.toJson(), row),
      );
      answerTime = at;
      if (i < rows.length - 1 ||
          s['status'] == 'running' ||
          s['status'] == 'finished') {
        restored._advance(at, shuffle: false);
      }
    }
    if (s['status'] == 'running') {
      if (snapshot['hint_used'] == true) restored.toggleHint();
      if (s['stage'] == 'net') {
        restored.scan('solid', restored.question.shape.name, 'r1', answerTime);
      }
    }
    require(
      restored._status.name == s['status'] &&
          restored._index == s['index'] &&
          s['question'] == restored.question.id &&
          elapsed >= answerTime - rows.length,
    );
    final actual = restored.goldenState(answerTime);
    for (final key in [
      'score',
      'mistakes',
      'hints',
      'skipped',
      'first_try',
      'stage',
    ]) {
      require(actual[key] == s[key]);
    }
    require(
      snapshot['hint_used'] == restored.hintUsed &&
          snapshot['hint_open'] is bool &&
          (snapshot['hint_open'] != true ||
              restored.interactive && restored.hintUsed),
    );
    require(
      (restored._questionStartElapsed - startElapsed).abs() <= rows.length,
    );
    for (final key in ['solid_order', 'net_order']) {
      final order = (s[key] as List).cast<String>();
      require(
        order.length == 5 &&
            order.toSet().length == 5 &&
            order.every(
              (v) => GeometryShape.values.any((shape) => shape.name == v),
            ),
      );
    }
    restored._solidOrder = (s['solid_order'] as List)
        .cast<String>()
        .map(GeometryShape.values.byName)
        .toList();
    restored._netOrder = (s['net_order'] as List)
        .cast<String>()
        .map(GeometryShape.values.byName)
        .toList();
    restored._hintOpen = snapshot['hint_open'] as bool;
    restored._elapsed = elapsed;
    restored._questionStartElapsed = startElapsed;
    restored._segmentStart = now.toDouble();
    restored._transitionAt =
        now.toDouble() + (snapshot['feedback_remaining'] as num);
    restored._reviewReadyAt =
        now.toDouble() + (snapshot['review_remaining'] as num);
    final cursor = s['rng_draws_consumed'];
    require(cursor is int && cursor >= 0 && cursor <= 10000);
    restored.drawsConsumed = cursor as int;
    return restored;
  }

  static bool _same(Object? a, Object? b) {
    if (a is Map && b is Map) {
      return a.length == b.length &&
          a.keys.every((k) => b.containsKey(k) && _same(a[k], b[k]));
    }
    if (a is List && b is List) {
      return a.length == b.length &&
          List.generate(a.length, (i) => _same(a[i], b[i])).every((v) => v);
    }
    return a == b;
  }
}

/// Shape/topic summaries use only supplied answers; untouched stages are separate.
Map<String, Object?> analyseSolo(List<SoloAnswer> answers) {
  List<Map<String, Object?>> groups(
    List<String> ids,
    String Function(SoloAnswer) key,
  ) => ids.map((id) {
    final rows = answers.where((a) => key(a) == id).toList();
    final correct = rows.where((a) => a.outcome == 'correct').length;
    return <String, Object?>{
      'id': id,
      'total': rows.length,
      'correct': correct,
      'wrong': rows.where((a) => a.outcome == 'wrong').length,
      'skipped': rows.where((a) => a.outcome == 'skipped').length,
      'hints': rows.where((a) => a.hint).length,
      'elapsed': rows.fold<int>(0, (n, a) => n + a.elapsed),
      'percent': rows.isEmpty ? null : (correct / rows.length * 100).round(),
    };
  }).toList();
  final byShape = groups(
    GeometryShape.values.map((s) => s.name).toList(),
    (a) => a.shape.name,
  );
  final byTopic = groups(['properties', 'formula', 'net'], (a) => a.topic);
  final byStage = GeometryCardKind.values.map((kind) {
    final attempted = answers
        .where(
          (a) => (kind == GeometryCardKind.solid ? a.solid : a.net) != null,
        )
        .toList();
    final correct = attempted
        .where(
          (a) => (kind == GeometryCardKind.solid ? a.solid : a.net) == a.shape,
        )
        .length;
    return <String, Object?>{
      'id': kind.name,
      'attempted': attempted.length,
      'correct': correct,
      'wrong': attempted.length - correct,
      'notAttempted': answers.length - attempted.length,
      'percent': attempted.isEmpty
          ? null
          : (correct / attempted.length * 100).round(),
    };
  }).toList();
  return {'byShape': byShape, 'byTopic': byTopic, 'byStage': byStage};
}
