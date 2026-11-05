/// Protocol 2 presentation DTOs. No local question bank or scoring engine is used.
/// Canonical source: 752ce908d16d13acc9cc7510797e8363d182c3f5,
/// digital/backend/duel/functions/geodecoder-duel/handler.mjs (blob c8b0e463).
library;

import '../../core/geometry/geometry_card_provider.dart';

enum DuelRoomStatus {
  waiting,
  countdown,
  playing,
  complete,
  cancelled,
  expired,
}

enum DuelOutcome { correct, wrong, skipped }

final class DuelProjectionException implements Exception {
  const DuelProjectionException(this.code);
  final String code;
  @override
  String toString() => 'Duel projection rejected ($code)';
}

Never _invalid() => throw const DuelProjectionException('invalid_response');

final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
);
bool validDuelRoomId(String value) => _uuid.hasMatch(value);

Map<String, Object?> _map(
  Object? value,
  Set<String> fields, {
  Set<String> optional = const {},
}) {
  if (value is! Map<String, Object?> ||
      value.keys.any((key) => !fields.contains(key)) ||
      fields.difference(optional).any((key) => !value.containsKey(key))) {
    _invalid();
  }
  return value;
}

int _int(Object? value, {int min = 0, int max = 9007199254740991}) {
  if (value is! int || value < min || value > max) _invalid();
  return value;
}

int? _nullableInt(Object? value) => value == null ? null : _int(value);
bool _bool(Object? value) => value is bool ? value : _invalid();
String _text(Object? value, {int max = 4096}) {
  if (value is! String ||
      value.isEmpty ||
      value.length > max ||
      RegExp(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]').hasMatch(value)) {
    _invalid();
  }
  return value;
}

String _id(Object? value) {
  final text = _text(value, max: 36);
  if (!_uuid.hasMatch(text)) _invalid();
  return text;
}

GeometryShape _shape(Object? value) {
  for (final shape in GeometryShape.values) {
    if (shape.name == value) return shape;
  }
  return _invalid();
}

GeometryCardKind _stage(Object? value) => switch (value) {
  'solid' => GeometryCardKind.solid,
  'net' => GeometryCardKind.net,
  _ => _invalid(),
};

final class DuelQuestionCopy {
  const DuelQuestionCopy(this.prompt, this.lines, this.hint);
  final String prompt;
  final List<String> lines;
  final String? hint;
  factory DuelQuestionCopy.parse(Object? value) {
    final map = _map(value, {'prompt', 'lines', 'hint'}, optional: {'hint'});
    final lines = map['lines'];
    if (lines is! List || lines.length > 20) _invalid();
    return DuelQuestionCopy(
      _text(map['prompt']),
      List.unmodifiable(lines.map((line) => _text(line))),
      map.containsKey('hint') ? _text(map['hint']) : null,
    );
  }
}

final class DuelQuestion {
  const DuelQuestion({
    required this.id,
    required this.index,
    required this.topic,
    required this.copy,
    required this.formulaKey,
    this.settledShape,
  });
  final String id;
  final int index;
  final String topic;
  final Map<String, DuelQuestionCopy> copy;
  final Map<String, String> formulaKey;
  final GeometryShape? settledShape;
  DuelQuestionCopy localized(String language) => copy[language] ?? copy['en']!;

  factory DuelQuestion.parse(Object? value, int index, {bool settled = false}) {
    final map = _map(
      value,
      {'id', 'index', 'topic', 'copy', 'formulaKey', if (settled) 'shape'},
      optional: {'formulaKey'},
    );
    if (_int(map['index'], max: 9) != index ||
        !{'properties', 'formula', 'net'}.contains(map['topic'])) {
      _invalid();
    }
    final id = _text(map['id'], max: 32);
    if (settled
        ? !RegExp(r'^[PSKCB][123]$').hasMatch(id)
        : id != 'duel-$index') {
      _invalid();
    }
    final copy = _map(map['copy'], {'ms', 'en'});
    final key = map.containsKey('formulaKey')
        ? _map(map['formulaKey'], {'ms', 'en'})
        : <String, Object?>{};
    return DuelQuestion(
      id: id,
      index: index,
      topic: map['topic']! as String,
      copy: Map.unmodifiable({
        for (final language in ['ms', 'en'])
          language: DuelQuestionCopy.parse(copy[language]),
      }),
      formulaKey: Map.unmodifiable({
        for (final entry in key.entries) entry.key: _text(entry.value),
      }),
      settledShape: settled ? _shape(map['shape']) : null,
    );
  }
}

final class DuelAttempts {
  const DuelAttempts(this.solid, this.net);
  final GeometryShape? solid;
  final GeometryShape? net;
  factory DuelAttempts.parse(Object? value) {
    final map = _map(value, {'solid', 'net'});
    if (!map.containsKey('solid') || !map.containsKey('net')) _invalid();
    return DuelAttempts(
      map['solid'] == null ? null : _shape(map['solid']),
      map['net'] == null ? null : _shape(map['net']),
    );
  }
}

final class DuelAnswer {
  const DuelAnswer({
    required this.question,
    required this.outcome,
    required this.hint,
    required this.attempts,
    required this.failedAt,
    required this.elapsed,
  });
  final DuelQuestion question;
  final DuelOutcome outcome;
  final bool hint;
  final DuelAttempts attempts;
  final GeometryCardKind? failedAt;
  final int elapsed;
  factory DuelAnswer.parse(Object? value, int index) {
    final map = _map(value, {
      'id',
      'shape',
      'topic',
      'outcome',
      'hint',
      'failedAt',
      'elapsed',
      'firstTry',
      'question',
      'attempts',
    });
    final question = DuelQuestion.parse(map['question'], index, settled: true);
    if (question.id != map['id'] ||
        question.topic != map['topic'] ||
        question.settledShape != _shape(map['shape'])) {
      _invalid();
    }
    final outcome = switch (map['outcome']) {
      'correct' => DuelOutcome.correct,
      'wrong' => DuelOutcome.wrong,
      'skipped' => DuelOutcome.skipped,
      _ => _invalid(),
    };
    final attempts = DuelAttempts.parse(map['attempts']);
    final failedAt = map['failedAt'] == null ? null : _stage(map['failedAt']);
    if (_bool(map['firstTry']) != (outcome == DuelOutcome.correct)) _invalid();
    if (outcome == DuelOutcome.correct &&
        (attempts.solid != question.settledShape ||
            attempts.net != question.settledShape ||
            failedAt != null)) {
      _invalid();
    }
    if (outcome == DuelOutcome.wrong &&
        (failedAt == null ||
            (failedAt == GeometryCardKind.solid &&
                (attempts.solid == null ||
                    attempts.solid == question.settledShape ||
                    attempts.net != null)) ||
            (failedAt == GeometryCardKind.net &&
                (attempts.solid != question.settledShape ||
                    attempts.net == null ||
                    attempts.net == question.settledShape)))) {
      _invalid();
    }
    if (outcome == DuelOutcome.skipped && failedAt != null) _invalid();
    return DuelAnswer(
      question: question,
      outcome: outcome,
      hint: _bool(map['hint']),
      attempts: attempts,
      failedAt: failedAt,
      elapsed: _int(map['elapsed'], max: 900000),
    );
  }
}

const _summaryFields = {
  'id',
  'slot',
  'name',
  'ready',
  'answered',
  'stage',
  'score',
  'mistakes',
  'skipped',
  'hints',
  'finishedAt',
  'elapsed',
  'forfeited',
  'lastSeenAt',
};

/// Summary has no credential, sequence, answers, attempts or hint detail fields.
final class DuelPlayerSummary {
  const DuelPlayerSummary({
    required this.id,
    required this.slot,
    required this.name,
    required this.ready,
    required this.answered,
    required this.stage,
    required this.score,
    required this.mistakes,
    required this.skipped,
    required this.hints,
    required this.finishedAt,
    required this.elapsed,
    required this.forfeited,
    required this.lastSeenAt,
  });
  final String id, name;
  final int slot,
      answered,
      score,
      mistakes,
      skipped,
      hints,
      elapsed,
      lastSeenAt;
  final bool ready, forfeited;
  final GeometryCardKind stage;
  final int? finishedAt;
  factory DuelPlayerSummary.parse(Object? value, {bool me = false}) {
    final map = _map(value, {
      ..._summaryFields,
      if (me) ...{
        'hintUsed',
        'seq',
        'nextReadyAt',
        'reviewPending',
        'attempts',
        'answers',
      },
    });
    final result = DuelPlayerSummary(
      id: _id(map['id']),
      slot: _int(map['slot'], min: 1, max: 2),
      name: _text(map['name'], max: 60),
      ready: _bool(map['ready']),
      answered: _int(map['answered'], max: 10),
      stage: _stage(map['stage']),
      score: _int(map['score'], max: 10),
      mistakes: _int(map['mistakes'], max: 10),
      skipped: _int(map['skipped'], max: 10),
      hints: _int(map['hints'], max: 10),
      finishedAt: _nullableInt(map['finishedAt']),
      elapsed: _int(map['elapsed'], max: 900000),
      forfeited: _bool(map['forfeited']),
      lastSeenAt: _int(map['lastSeenAt']),
    );
    if (result.score + result.mistakes + result.skipped != result.answered ||
        result.hints > result.answered + 1) {
      _invalid();
    }
    return result;
  }
}

final class DuelRoom {
  const DuelRoom({
    required this.id,
    required this.code,
    required this.status,
    required this.startsAt,
    required this.deadlineAt,
    required this.lobbyExpiresAt,
    required this.winnerId,
    required this.reason,
  });
  final String id, code;
  final DuelRoomStatus status;
  final int? startsAt, deadlineAt;
  final int lobbyExpiresAt;
  final String? winnerId, reason;
  bool get terminal => {
    DuelRoomStatus.complete,
    DuelRoomStatus.cancelled,
    DuelRoomStatus.expired,
  }.contains(status);
  factory DuelRoom.parse(Object? value) {
    final map = _map(value, {
      'id',
      'code',
      'status',
      'startsAt',
      'deadlineAt',
      'lobbyExpiresAt',
      'total',
      'winnerId',
      'reason',
    });
    if (_int(map['total']) != 10 ||
        !RegExp(r'^\d{6}$').hasMatch(_text(map['code'], max: 6))) {
      _invalid();
    }
    final status = DuelRoomStatus.values.where((s) => s.name == map['status']);
    if (status.length != 1) _invalid();
    final start = _nullableInt(map['startsAt']);
    final deadline = _nullableInt(map['deadlineAt']);
    if ((start == null) != (deadline == null) ||
        (start != null && deadline != start + 900000)) {
      _invalid();
    }
    if ({
          DuelRoomStatus.playing,
          DuelRoomStatus.countdown,
          DuelRoomStatus.complete,
        }.contains(status.single) &&
        start == null) {
      _invalid();
    }
    final reason = map['reason'];
    if (reason != null &&
        !{
          'score',
          'time',
          'forfeit',
          'deadline',
          'tie',
          'left',
          'lobby_expired',
        }.contains(reason)) {
      _invalid();
    }
    return DuelRoom(
      id: _id(map['id']),
      code: map['code']! as String,
      status: status.single,
      startsAt: start,
      deadlineAt: deadline,
      lobbyExpiresAt: _int(map['lobbyExpiresAt']),
      winnerId: map['winnerId'] == null ? null : _id(map['winnerId']),
      reason: reason as String?,
    );
  }
}

final class DuelSnapshot {
  const DuelSnapshot({
    required this.serverNow,
    required this.room,
    required this.me,
    required this.opponent,
    required this.seq,
    required this.hintUsed,
    required this.reviewPending,
    required this.nextReadyAt,
    required this.attempts,
    required this.answers,
    required this.currentQuestion,
    required this.actionType,
  });
  final int serverNow, seq;
  final DuelRoom room;
  final DuelPlayerSummary me;
  final DuelPlayerSummary? opponent;
  final bool hintUsed, reviewPending;
  final int? nextReadyAt;
  final DuelAttempts attempts;
  final List<DuelAnswer> answers;
  final DuelQuestion? currentQuestion;
  final String? actionType;
  DuelAnswer? get review => reviewPending ? answers.last : null;
  int get questionIndex => reviewPending ? me.answered - 1 : me.answered;

  factory DuelSnapshot.parse(Object? value) {
    if (value is Map && value['protocol'] != 2) {
      throw const DuelProjectionException('client_update_required');
    }
    final map = _map(value, {
      'ok',
      'protocol',
      'serverNow',
      'room',
      'me',
      'opponent',
      'currentQuestion',
      'actionResult',
    });
    if (map['ok'] != true) _invalid();
    final now = _int(map['serverNow']);
    final room = DuelRoom.parse(map['room']);
    final me = DuelPlayerSummary.parse(map['me'], me: true);
    final rawMe = map['me']! as Map<String, Object?>;
    final opponent = map['opponent'] == null
        ? null
        : DuelPlayerSummary.parse(map['opponent']);
    if (opponent != null &&
        (opponent.id == me.id || opponent.slot == me.slot)) {
      _invalid();
    }
    if (room.winnerId != null &&
        room.winnerId != me.id &&
        room.winnerId != opponent?.id) {
      _invalid();
    }
    final rawAnswers = rawMe['answers'];
    if (rawAnswers is! List || rawAnswers.length != me.answered) _invalid();
    final answers = List<DuelAnswer>.unmodifiable([
      for (var i = 0; i < rawAnswers.length; i++)
        DuelAnswer.parse(rawAnswers[i], i),
    ]);
    if (answers.map((a) => a.question.id).toSet().length != answers.length) {
      _invalid();
    }
    final hintUsed = _bool(rawMe['hintUsed']);
    final reviewPending = _bool(rawMe['reviewPending']);
    final nextReady = _nullableInt(rawMe['nextReadyAt']);
    final attempts = DuelAttempts.parse(rawMe['attempts']);
    if (answers.where((a) => a.outcome == DuelOutcome.correct).length !=
            me.score ||
        answers.where((a) => a.outcome == DuelOutcome.wrong).length !=
            me.mistakes ||
        answers.where((a) => a.outcome == DuelOutcome.skipped).length !=
            me.skipped ||
        answers.where((a) => a.hint).length + (hintUsed ? 1 : 0) != me.hints) {
      _invalid();
    }
    DuelQuestion? current;
    if (reviewPending) {
      if (answers.isEmpty ||
          me.stage != GeometryCardKind.solid ||
          !{
            DuelRoomStatus.playing,
            DuelRoomStatus.complete,
          }.contains(room.status) ||
          nextReady == null ||
          map['currentQuestion'] != null ||
          attempts.solid != null ||
          attempts.net != null ||
          hintUsed) {
        _invalid();
      }
    } else if (room.status == DuelRoomStatus.playing && me.answered < 10) {
      current = DuelQuestion.parse(map['currentQuestion'], me.answered);
      if (attempts.net != null ||
          (me.stage == GeometryCardKind.solid
              ? attempts.solid != null
              : attempts.solid == null) ||
          (!hintUsed && current.copy.values.any((c) => c.hint != null))) {
        _invalid();
      }
    } else if (map['currentQuestion'] != null) {
      _invalid();
    }
    if ((me.answered == 10) != (me.finishedAt != null) ||
        opponent != null &&
            (opponent.answered == 10) != (opponent.finishedAt != null) ||
        room.status == DuelRoomStatus.complete &&
            (me.answered != 10 || opponent?.answered != 10)) {
      _invalid();
    }
    final action = map['actionResult'] == null
        ? null
        : _map(map['actionResult'], {'type', 'target'}, optional: {'target'});
    final actionType = action?['type'];
    if (actionType != null &&
        !{
          'solid',
          'correct',
          'wrong',
          'skipped',
          'hint',
          'advanced',
          'left',
          'ready',
        }.contains(actionType)) {
      _invalid();
    }
    if (action?['target'] != null &&
        !{'r1', 'r2'}.contains(action!['target'])) {
      _invalid();
    }
    return DuelSnapshot(
      serverNow: now,
      room: room,
      me: me,
      opponent: opponent,
      seq: _int(rawMe['seq'], max: 2147483647),
      hintUsed: hintUsed,
      reviewPending: reviewPending,
      nextReadyAt: nextReady,
      attempts: attempts,
      answers: answers,
      currentQuestion: current,
      actionType: actionType as String?,
    );
  }
}
