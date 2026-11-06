import 'dart:math' as math;

import '../../../core/runtime/random_source.dart';
import '../../solo/domain/solo_bank.dart';
import '../../solo/domain/solo_game.dart';
import 'ai_policy.dart';

export 'ai_policy.dart';

enum AiBattleStatus { playing, review, finished }

enum AiOpponentStage { solid, net, done }

enum AiBattleWinner { player, ai, draw }

final class AiBattleAnswer {
  const AiBattleAnswer({
    required this.id,
    required this.outcome,
    required this.solid,
    required this.net,
    required this.elapsed,
  });
  final String id, outcome;
  final GeometryShape solid;
  final GeometryShape? net;
  final int elapsed;

  Map<String, Object?> toJson() => {
    'id': id,
    'outcome': outcome,
    'solid': solid.name,
    'net': net?.name,
    'elapsed': elapsed,
  };
}

/// A local match around the canonical player assessment. It never touches
/// online Duel, classroom scoring, the quiz leaderboard or formative records.
///
/// A plan is committed at each question's start. Human correctness affects
/// only the next plan, and saved tapes prevent reopening to reroll an opponent.
final class AiBattleGame {
  AiBattleGame({
    required SoloBank bank,
    required String playerName,
    required this.difficulty,
    required RandomSource playerRandom,
    required RandomSource aiRandom,
    int now = 0,
  }) {
    _validClock(now);
    final name = playerName.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (name.length < 2 || name.length > 60) {
      throw const FormatException('Invalid player name.');
    }
    final seed = playerRandom.nextInt(1 << 30);
    if (seed < 0 || seed >= 1 << 30) {
      throw const FormatException('Invalid player random seed.');
    }
    _seed = seed;
    _playerRandom = _SavedRandom(seed);
    player = SoloGame(
      bank: bank,
      player: {'name': name, 'category': 'Tetamu', 'className': ''},
      random: _playerRandom,
      now: now,
    );
    _tape = List.generate(player.total, (_) {
      final draws = List.generate(5, (_) => aiRandom.nextDouble());
      if (draws.any((d) => !d.isFinite || d < 0 || d >= 1)) {
        throw const FormatException('Invalid AI random draw.');
      }
      return List<double>.unmodifiable(draws);
    }, growable: false);
    _questionStartedAt = _lastNow = now;
    _plan = _planFor(0);
  }

  AiBattleGame._({required this.difficulty});

  static const schemaVersion = 1;
  static const ruleset = 'ai-local-v1';
  static const _maxDuration = 7 * 24 * 60 * 60 * 1000;
  final AiDifficulty difficulty;
  late final SoloGame player;
  late final int _seed;
  late final _SavedRandom _playerRandom;
  late final List<List<double>> _tape;
  late AiOpponentPlan _plan;
  int _questionStartedAt = 0, _lastNow = 0, _pausedAt = 0;
  int? _reviewAt;
  bool _paused = false;
  GeometryShape? _selected;
  AiOpponentStage _aiStage = AiOpponentStage.solid;
  final List<AiBattleAnswer> _aiAnswers = [];

  int get index => player.index;
  int get total => player.total;
  bool get paused => _paused;
  GeometryShape? get selected => _selected;
  bool get canChoose => !_paused && player.interactive;
  bool get questionSettled =>
      player.answers.length > index && _aiAnswers.length > index;
  AiBattleStatus get status => player.status == SoloStatus.finished
      ? AiBattleStatus.finished
      : questionSettled
      ? AiBattleStatus.review
      : AiBattleStatus.playing;
  List<AiBattleAnswer> get aiAnswers => List.unmodifiable(_aiAnswers);
  AiOpponentPlan get currentPlan => _plan;
  AiOpponentStage get aiStage => _aiStage;
  int get aiScore => _aiAnswers.where((a) => a.outcome == 'correct').length;
  int get aiElapsed => _aiAnswers.fold(0, (sum, a) => sum + a.elapsed);
  AiBattleWinner? get winner {
    if (status != AiBattleStatus.finished) return null;
    if (player.score != aiScore) {
      return player.score > aiScore ? AiBattleWinner.player : AiBattleWinner.ai;
    }
    final elapsed = player.answers.fold<int>(0, (sum, a) => sum + a.elapsed);
    return elapsed == aiElapsed
        ? AiBattleWinner.draw
        : elapsed < aiElapsed
        ? AiBattleWinner.player
        : AiBattleWinner.ai;
  }

  AiOpponentPlan _planFor(int questionIndex) => AiOpponentPlan.fromDraws(
    difficulty: difficulty,
    playerCorrect: player.answers
        .take(questionIndex)
        .where((a) => a.outcome == 'correct')
        .length,
    answer: player.round[questionIndex].shape,
    draws: _tape[questionIndex],
  );

  void choose(GeometryShape shape) {
    if (canChoose) _selected = shape;
  }

  Map<String, Object?> scan(String target, int now) {
    tick(now);
    if (!canChoose) return {'type': 'blocked'};
    final shape = _selected;
    if (shape == null) return {'type': 'selection'};
    final result = player.scan(player.stage.name, shape.name, target, now);
    if (const {'solid', 'wrong', 'correct'}.contains(result['type'])) {
      _selected = null;
    }
    _beginReview(now);
    return result;
  }

  bool skip(int now) {
    tick(now);
    if (!canChoose || !player.skip(now)) return false;
    _selected = null;
    _beginReview(now);
    return true;
  }

  bool hint() => canChoose && player.toggleHint();

  bool tick(int now) {
    _observeClock(now);
    if (_paused || status == AiBattleStatus.finished) return false;
    var changed = false;
    final age = now - _questionStartedAt;
    if (_aiStage != AiOpponentStage.done && age >= _plan.answerDelayMs) {
      _aiStage = AiOpponentStage.done;
      _aiAnswers.add(
        AiBattleAnswer(
          id: player.question.id,
          outcome: _plan.correct ? 'correct' : 'wrong',
          solid: _plan.solid,
          net: _plan.net,
          elapsed: _plan.answerDelayMs,
        ),
      );
      changed = true;
    } else if (_aiStage == AiOpponentStage.solid &&
        _plan.net != null &&
        age >= _plan.solidDelayMs) {
      _aiStage = AiOpponentStage.net;
      changed = true;
    }
    return _beginReview(now) || changed;
  }

  bool _beginReview(int now) {
    if (!questionSettled || _reviewAt != null) return false;
    _reviewAt =
        now +
        (player.lastOutcome == 'correct'
            ? SoloGame.blinkMs
            : SoloGame.reviewMs);
    return true;
  }

  bool canContinue(int now) =>
      !_paused &&
      status == AiBattleStatus.review &&
      _reviewAt != null &&
      now >= _reviewAt!;

  bool continueQuestion(int now) {
    tick(now);
    if (!canContinue(now)) return false;
    final advanced = player.status == SoloStatus.feedback
        ? player.update(now)
        : player.continueReview(now);
    if (!advanced) return false;
    _selected = null;
    if (player.status != SoloStatus.finished) {
      _questionStartedAt = now;
      _reviewAt = null;
      _aiStage = AiOpponentStage.solid;
      _plan = _planFor(index);
    }
    return true;
  }

  void pause(int now) {
    tick(now);
    if (_paused || status == AiBattleStatus.finished) return;
    _paused = true;
    _pausedAt = now;
    player.pause(now);
  }

  void resume(int now) {
    _observeClock(now);
    if (!_paused || status == AiBattleStatus.finished) return;
    final gap = now - _pausedAt;
    _questionStartedAt += gap;
    if (_reviewAt != null) _reviewAt = _reviewAt! + gap;
    _paused = false;
    player.resume(now);
  }

  Map<String, dynamic> checkpoint(int now) {
    tick(now);
    final clock = _paused ? _pausedAt : now;
    return {
      'schema': schemaVersion,
      'policy_version': AiDifficultyProfile.policyVersion,
      'ruleset': ruleset,
      'bank': player.bank.identity,
      'difficulty': difficulty.name,
      'player': player.checkpoint(now),
      'player_seed': _seed,
      'player_rng_state': _playerRandom.state,
      'ai_draws': _tape,
      'ai_plan': _plan.toJson(),
      'ai_answers': _aiAnswers.map((a) => a.toJson()).toList(),
      'ai_stage': _aiStage.name,
      'question_age_ms': clock - _questionStartedAt,
      'review_remaining_ms': _reviewAt == null
          ? null
          : math.max(0, _reviewAt! - clock),
      'paused': _paused,
      'selected': _selected?.name,
    };
  }

  factory AiBattleGame.restore({
    required Map<String, dynamic> checkpoint,
    required SoloBank bank,
    required RandomSource playerRandom,
    required int now,
  }) {
    // The saved stream, not a new external seed, owns all remaining shuffles.
    // The parameter remains explicit alongside the other game constructors.
    _validClock(now);
    Never invalid() => throw const FormatException('Invalid AI checkpoint.');
    void require(bool condition) {
      if (!condition) invalid();
    }

    try {
      require(
        checkpoint.length == 16 &&
            checkpoint['schema'] == schemaVersion &&
            checkpoint['policy_version'] == AiDifficultyProfile.policyVersion &&
            checkpoint['ruleset'] == ruleset &&
            checkpoint['bank'] == bank.identity &&
            checkpoint['paused'] is bool,
      );
      final difficulty = AiDifficulty.values.byName(
        checkpoint['difficulty'] as String,
      );
      final seed = checkpoint['player_seed'];
      final rngState = checkpoint['player_rng_state'];
      require(seed is int && seed >= 0 && seed < 1 << 30);
      require(rngState is int && rngState >= 0 && rngState <= 0xffffffff);
      final savedRandom = _SavedRandom(rngState as int);
      final player = SoloGame.restore(
        Map<String, dynamic>.from(checkpoint['player'] as Map),
        bank,
        savedRandom,
        now,
      );
      require(
        player.mode == SoloMode.quiz &&
            player.total == 10 &&
            player.time(now) <= _maxDuration,
      );
      // Validate the seeded round, both current option permutations and future
      // RNG position independently of the canonical answer replay.
      final randomReplay = _SavedRandom(seed as int);
      final replay = SoloGame(
        bank: bank,
        player: player.player,
        random: randomReplay,
      );
      for (var i = 0; i < player.index; i++) {
        replay.skip(i * 2000);
        require(replay.continueReview(i * 2000 + SoloGame.reviewMs));
      }
      require(
        _same(
              replay.round.map((q) => q.id).toList(),
              player.round.map((q) => q.id).toList(),
            ) &&
            _same(replay.solidOrder, player.solidOrder) &&
            _same(replay.netOrder, player.netOrder) &&
            replay.drawsConsumed == player.drawsConsumed &&
            randomReplay.state == rngState,
      );
      final tape = (checkpoint['ai_draws'] as List)
          .map((raw) {
            final row = (raw as List)
                .map((d) => (d as num).toDouble())
                .toList();
            require(
              row.length == 5 &&
                  row.every((v) => v.isFinite && v >= 0 && v < 1),
            );
            return List<double>.unmodifiable(row);
          })
          .toList(growable: false);
      require(tape.length == player.total);
      final restored = AiBattleGame._(difficulty: difficulty)
        ..player = player
        .._seed = seed
        .._playerRandom = savedRandom
        .._tape = tape
        .._lastNow = now;
      restored._plan = restored._planFor(player.index);
      require(_same(checkpoint['ai_plan'], restored._plan.toJson()));
      final rows = checkpoint['ai_answers'] as List;
      require(rows.length >= player.index && rows.length <= player.index + 1);
      for (var i = 0; i < rows.length; i++) {
        final plan = restored._planFor(i);
        final answer = AiBattleAnswer(
          id: player.round[i].id,
          outcome: plan.correct ? 'correct' : 'wrong',
          solid: plan.solid,
          net: plan.net,
          elapsed: plan.answerDelayMs,
        );
        require(_same(rows[i], answer.toJson()));
        restored._aiAnswers.add(answer);
      }
      final age = checkpoint['question_age_ms'];
      require(age is int && age >= 0 && age <= _maxDuration);
      final plan = restored._plan;
      final expectedStage = age >= plan.answerDelayMs
          ? AiOpponentStage.done
          : plan.net != null && age >= plan.solidDelayMs
          ? AiOpponentStage.net
          : AiOpponentStage.solid;
      require(checkpoint['ai_stage'] == expectedStage.name);
      require(
        (rows.length == player.index + 1) ==
            (expectedStage == AiOpponentStage.done),
      );
      restored._aiStage = expectedStage;
      restored._questionStartedAt = now - (age as int);
      final remaining = checkpoint['review_remaining_ms'];
      if (restored.questionSettled) {
        final bound = player.lastOutcome == 'correct'
            ? SoloGame.blinkMs
            : SoloGame.reviewMs;
        require(remaining is int && remaining >= 0 && remaining <= bound);
        restored._reviewAt = now + (remaining as int);
      } else {
        require(remaining == null && player.status != SoloStatus.finished);
      }
      if (player.status == SoloStatus.finished) {
        require(
          restored.questionSettled && remaining == 0 && rows.length == 10,
        );
      }
      final selected = checkpoint['selected'];
      if (selected != null) {
        require(player.status == SoloStatus.running && selected is String);
        restored._selected = GeometryShape.values.byName(selected as String);
      }
      player.pause(now);
      restored._paused = true;
      restored._pausedAt = now;
      return restored;
    } on FormatException {
      rethrow;
    } catch (_) {
      invalid();
    }
  }

  void _observeClock(int now) {
    _validClock(now);
    if (now < _lastNow) {
      throw const FormatException('AI match clock moved backwards.');
    }
    _lastNow = now;
  }

  static void _validClock(int now) {
    if (now < 0 || now > 0x1fffffffffffff) {
      throw const FormatException('Invalid AI match clock.');
    }
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

/// Small deterministic stream with an explicit persisted state. Native random
/// seeds it once; it never consumes the opponent's independent draw stream.
final class _SavedRandom implements RandomSource {
  _SavedRandom(this.state);
  int state;
  @override
  double nextDouble() {
    state = (1664525 * state + 1013904223) & 0xffffffff;
    return state / 4294967296;
  }

  @override
  int nextInt(int maximum) => (nextDouble() * maximum).floor();
}
